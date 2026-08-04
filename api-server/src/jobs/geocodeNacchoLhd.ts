import { getPool } from "@workspace/db";
import { logger } from "../lib/logger";

type SourceRow = {
  lhd_id: string;
  name: string;
  address: string | null;
  state_code: string;
  postal_code: string | null;
  raw_data: Record<string, unknown> | null;
};

type ExactHit = {
  lat: number;
  lng: number;
  streetAddress: string;
  city: string | null;
  stateCode: string;
  postalCode: string;
  formattedAddress: string;
  placeId: string | null;
  evidence: Record<string, unknown>;
};

const JOB_KEY = "county-health-departments-google-rooftop-v1";
const IMPORT_KEY = "county-health-departments-xlsx-v1";
const CONCURRENCY = 5;
const BATCH_SIZE = 25;
const MAX_API_ATTEMPTS = 3;
let started = false;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const zip5 = (value: string | null | undefined) => value?.match(/\d{5}/)?.[0] ?? "";
const normalize = (value: string | null | undefined) =>
  (value ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
const streetNumber = (value: string | null | undefined) =>
  value?.trim().match(/^(\d+[A-Za-z-]*)\b/)?.[1] ?? "";

function googleKey(): string | null {
  const value = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_GEOCODING_API_KEY;
  return value?.trim() || null;
}

async function ensureJobTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS public.naccho_geocode_job (
      job_key text PRIMARY KEY,
      status text NOT NULL,
      total_rows integer NOT NULL DEFAULT 0,
      verified_rows integer NOT NULL DEFAULT 0,
      rejected_rows integer NOT NULL DEFAULT 0,
      invalid_rows integer NOT NULL DEFAULT 0,
      error_rows integer NOT NULL DEFAULT 0,
      pending_rows integer NOT NULL DEFAULT 0,
      details jsonb NOT NULL DEFAULT '{}'::jsonb,
      started_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function waitForImport(): Promise<void> {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const result = await getPool().query(
      `SELECT status,database_rows FROM public.naccho_import_log WHERE import_key=$1`,
      [IMPORT_KEY],
    ).catch(() => ({ rows: [] }));
    const row = result.rows[0];
    if (row?.status === "complete" && Number(row.database_rows) === 3410) return;
    if (row?.status === "failed") throw new Error("The county-health-department source import failed");
    await wait(2_000);
  }
  throw new Error("Timed out waiting for the complete 3,410-row source import");
}

function component(
  parts: Array<{ long_name?: string; short_name?: string; types?: string[] }>,
  type: string,
  field: "long_name" | "short_name" = "short_name",
): string {
  return String(parts.find((part) => part.types?.includes(type))?.[field] ?? "");
}

async function googleExact(row: SourceRow, key: string): Promise<ExactHit | null> {
  const originalAddress = String(row.raw_data?.original_address ?? row.address ?? "").trim();
  const expectedState = row.state_code.toUpperCase();
  const expectedZip = zip5(row.postal_code);
  const expectedStreetNumber = normalize(streetNumber(originalAddress));

  if (
    !originalAddress ||
    !expectedState ||
    !expectedZip ||
    !expectedStreetNumber ||
    /\bP\.?\s*O\.?\s*BOX\b/i.test(originalAddress)
  ) {
    return null;
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", `${row.name}, ${originalAddress}`);
  url.searchParams.set(
    "components",
    `country:US|administrative_area:${expectedState}|postal_code:${expectedZip}`,
  );
  url.searchParams.set("key", key);

  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Google HTTP ${response.status}`);
  const data = await response.json() as {
    status?: string;
    error_message?: string;
    results?: Array<{
      partial_match?: boolean;
      formatted_address?: string;
      place_id?: string;
      types?: string[];
      address_components?: Array<{
        long_name?: string;
        short_name?: string;
        types?: string[];
      }>;
      geometry?: {
        location_type?: string;
        location?: { lat?: number; lng?: number };
      };
    }>;
  };

  if (data.status && !["OK", "ZERO_RESULTS"].includes(data.status)) {
    throw new Error(`Google ${data.status}: ${data.error_message ?? "unknown error"}`);
  }

  for (const result of data.results ?? []) {
    const parts = result.address_components ?? [];
    const gotCountry = component(parts, "country").toUpperCase();
    const gotState = component(parts, "administrative_area_level_1").toUpperCase();
    const gotZip5 = zip5(component(parts, "postal_code"));
    const zipSuffix = component(parts, "postal_code_suffix");
    const gotStreetNumber = normalize(component(parts, "street_number", "long_name"));
    const route = component(parts, "route", "long_name");
    const subpremise = component(parts, "subpremise", "long_name");
    const precision = String(result.geometry?.location_type ?? "").toUpperCase();
    const acceptedType = (result.types ?? []).some((type) =>
      ["street_address", "premise", "subpremise", "establishment", "point_of_interest"].includes(type),
    );

    if (
      result.partial_match === true ||
      gotCountry !== "US" ||
      gotState !== expectedState ||
      gotZip5 !== expectedZip ||
      gotStreetNumber !== expectedStreetNumber ||
      precision !== "ROOFTOP" ||
      !acceptedType ||
      !route
    ) {
      continue;
    }

    const lat = Number(result.geometry?.location?.lat);
    const lng = Number(result.geometry?.location?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const city =
      component(parts, "locality", "long_name") ||
      component(parts, "postal_town", "long_name") ||
      component(parts, "sublocality", "long_name") ||
      component(parts, "administrative_area_level_3", "long_name") ||
      null;
    const postalCode = zipSuffix ? `${gotZip5}-${zipSuffix}` : gotZip5;
    const streetAddress = [component(parts, "street_number", "long_name"), route, subpremise]
      .filter(Boolean)
      .join(" ");

    return {
      lat,
      lng,
      streetAddress,
      city,
      stateCode: gotState,
      postalCode,
      formattedAddress: result.formatted_address ?? `${streetAddress}, ${city ?? ""}, ${gotState} ${postalCode}`,
      placeId: result.place_id ?? null,
      evidence: {
        expected_state: expectedState,
        returned_state: gotState,
        expected_zip5: expectedZip,
        returned_zip5: gotZip5,
        expected_street_number: expectedStreetNumber,
        returned_street_number: gotStreetNumber,
        location_type: precision,
        partial_match: Boolean(result.partial_match),
        result_types: result.types ?? [],
      },
    };
  }

  return null;
}

async function markInvalid(row: SourceRow, reason: string): Promise<void> {
  await getPool().query(
    `UPDATE public.naccho_lhd
     SET raw_data=COALESCE(raw_data,'{}'::jsonb)||jsonb_build_object(
       'geocode_status','invalid_source_address',
       'geocode_rejection_reason',$2::text,
       'geocode_attempted_at',now()
     ),updated_at=now()
     WHERE lhd_id=$1 AND lat IS NULL`,
    [row.lhd_id, reason],
  );
}

async function processRow(row: SourceRow, key: string): Promise<void> {
  const originalAddress = String(row.raw_data?.original_address ?? row.address ?? "").trim();
  if (/\bP\.?\s*O\.?\s*BOX\b/i.test(originalAddress)) {
    await markInvalid(row, "po_box_not_a_physical_location");
    return;
  }
  if (!streetNumber(originalAddress)) {
    await markInvalid(row, "no_leading_street_number_for_exact_validation");
    return;
  }

  try {
    const hit = await googleExact(row, key);
    if (!hit) {
      await getPool().query(
        `UPDATE public.naccho_lhd
         SET raw_data=COALESCE(raw_data,'{}'::jsonb)||jsonb_build_object(
           'geocode_status','rejected_no_exact_match',
           'geocode_method','google_rooftop_exact',
           'geocode_attempted_at',now()
         ),updated_at=now()
         WHERE lhd_id=$1 AND lat IS NULL`,
        [row.lhd_id],
      );
      return;
    }

    await getPool().query(
      `UPDATE public.naccho_lhd
       SET lat=$2,lng=$3,address=$4,city=$5,state_code=$6,postal_code=$7,
           raw_data=COALESCE(raw_data,'{}'::jsonb)||$8::jsonb,
           updated_at=now()
       WHERE lhd_id=$1 AND lat IS NULL`,
      [
        row.lhd_id,
        hit.lat,
        hit.lng,
        hit.streetAddress,
        hit.city,
        hit.stateCode,
        hit.postalCode,
        JSON.stringify({
          geocode_status: "verified",
          geocode_method: "google_rooftop_exact",
          geocode_provider: "google",
          geocode_precision: "ROOFTOP",
          geocode_formatted_address: hit.formattedAddress,
          geocode_place_id: hit.placeId,
          geocode_evidence: hit.evidence,
          geocode_verified_at: new Date().toISOString(),
        }),
      ],
    );
  } catch (error) {
    await getPool().query(
      `UPDATE public.naccho_lhd
       SET raw_data=COALESCE(raw_data,'{}'::jsonb)||jsonb_build_object(
         'geocode_status',CASE
           WHEN COALESCE((raw_data->>'geocode_attempt_count')::int,0)+1 >= $3 THEN 'geocode_error'
           ELSE 'retry_pending' END,
         'geocode_attempt_count',COALESCE((raw_data->>'geocode_attempt_count')::int,0)+1,
         'geocode_error_message',$2::text,
         'geocode_attempted_at',now()
       ),updated_at=now()
       WHERE lhd_id=$1 AND lat IS NULL`,
      [row.lhd_id, error instanceof Error ? error.message : String(error), MAX_API_ATTEMPTS],
    );
  }
}

async function counts() {
  const result = await getPool().query(`
    SELECT count(*)::int AS total_rows,
      count(*) FILTER (WHERE lat IS NOT NULL AND lng IS NOT NULL)::int AS verified_rows,
      count(*) FILTER (WHERE raw_data->>'geocode_status'='rejected_no_exact_match')::int AS rejected_rows,
      count(*) FILTER (WHERE raw_data->>'geocode_status'='invalid_source_address')::int AS invalid_rows,
      count(*) FILTER (WHERE raw_data->>'geocode_status'='geocode_error')::int AS error_rows,
      count(*) FILTER (WHERE lat IS NULL AND lng IS NULL AND COALESCE(raw_data->>'geocode_status','') IN ('pending_strict_geocoder','retry_pending','geocoding'))::int AS pending_rows
    FROM public.naccho_lhd
    WHERE raw_data->>'source_file'='County Health Departments.xlsx'
  `);
  return result.rows[0];
}

async function updateJob(status: string, complete = false): Promise<void> {
  const current = await counts();
  await getPool().query(
    `INSERT INTO public.naccho_geocode_job
       (job_key,status,total_rows,verified_rows,rejected_rows,invalid_rows,error_rows,pending_rows,details,started_at,completed_at,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'{}'::jsonb,now(),CASE WHEN $9::boolean THEN now() ELSE NULL END,now())
     ON CONFLICT(job_key) DO UPDATE SET
       status=$2,total_rows=$3,verified_rows=$4,rejected_rows=$5,invalid_rows=$6,error_rows=$7,pending_rows=$8,
       completed_at=CASE WHEN $9::boolean THEN now() ELSE public.naccho_geocode_job.completed_at END,updated_at=now()`,
    [
      JOB_KEY,
      status,
      Number(current.total_rows),
      Number(current.verified_rows),
      Number(current.rejected_rows),
      Number(current.invalid_rows),
      Number(current.error_rows),
      Number(current.pending_rows),
      complete,
    ],
  );
}

async function run(): Promise<void> {
  await waitForImport();
  await ensureJobTable();
  const key = googleKey();
  if (!key) {
    await updateJob("blocked_no_google_key");
    throw new Error("GOOGLE_MAPS_API_KEY or GOOGLE_GEOCODING_API_KEY is not configured");
  }

  const pool = getPool();
  const lockClient = await pool.connect();
  try {
    const lock = await lockClient.query(
      "SELECT pg_try_advisory_lock(hashtext($1)) AS acquired",
      [JOB_KEY],
    );
    if (!lock.rows[0]?.acquired) return;

    await pool.query(`
      UPDATE public.naccho_lhd
      SET raw_data=COALESCE(raw_data,'{}'::jsonb)||jsonb_build_object('geocode_status','retry_pending'),updated_at=now()
      WHERE raw_data->>'source_file'='County Health Departments.xlsx'
        AND lat IS NULL
        AND raw_data->>'geocode_status'='geocoding'
        AND updated_at < now()-interval '30 minutes'
    `);
    await updateJob("running");

    for (;;) {
      const batch = await pool.query<SourceRow>(
        `SELECT lhd_id,name,address,state_code,postal_code,raw_data
         FROM public.naccho_lhd
         WHERE raw_data->>'source_file'='County Health Departments.xlsx'
           AND lat IS NULL AND lng IS NULL
           AND COALESCE(raw_data->>'geocode_status','pending_strict_geocoder') IN ('pending_strict_geocoder','retry_pending')
           AND COALESCE((raw_data->>'geocode_attempt_count')::int,0) < $1
         ORDER BY (raw_data->>'source_row')::int,lhd_id
         LIMIT $2`,
        [MAX_API_ATTEMPTS, BATCH_SIZE],
      );
      if (!batch.rows.length) break;

      const ids = batch.rows.map((row) => row.lhd_id);
      await pool.query(
        `UPDATE public.naccho_lhd
         SET raw_data=COALESCE(raw_data,'{}'::jsonb)||jsonb_build_object('geocode_status','geocoding'),updated_at=now()
         WHERE lhd_id=ANY($1::text[]) AND lat IS NULL`,
        [ids],
      );

      for (let offset = 0; offset < batch.rows.length; offset += CONCURRENCY) {
        await Promise.all(batch.rows.slice(offset, offset + CONCURRENCY).map((row) => processRow(row, key)));
        await wait(120);
      }
      await updateJob("running");
    }

    const finalCounts = await counts();
    const remaining = Number(finalCounts.pending_rows);
    await updateJob(remaining === 0 ? "complete" : "paused_with_retries", remaining === 0);
    logger.info({ ...finalCounts }, "County health department strict geocoding pass finished");
  } catch (error) {
    await updateJob("failed").catch(() => undefined);
    throw error;
  } finally {
    await lockClient.query("SELECT pg_advisory_unlock(hashtext($1))", [JOB_KEY]).catch(() => undefined);
    lockClient.release();
  }
}

export function startNacchoLhdGeocoder(): void {
  if (started || process.env.NACCHO_STRICT_GEOCODER === "false") return;
  started = true;
  setTimeout(() => {
    void run().catch((error) => logger.error({ err: error }, "County health department strict geocoding failed"));
  }, 4_000).unref();
}

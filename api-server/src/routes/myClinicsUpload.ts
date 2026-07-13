import { Router, type Request, type Response } from "express";
import { createHash } from "node:crypto";
import { getPool, type PoolClient } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { hasValidCoordinates, parseOptionalNumber } from "../lib/providerCoordinates";
import { isUsableProviderName, normalizedProviderName, providerQualityReasons } from "../lib/providerDataQuality";

const router = Router();
const SOURCE_KEY = "my_clinics_upload";
const MAX_ROWS_PER_REQUEST = 5000;

const PROVIDER_TYPES = new Set([
  "urgent_care",
  "dot_provider",
  "faa_provider",
  "lab",
  "general_practitioner",
  "occupational_health_clinic",
  "dental",
  "imaging",
  "pharmacy_vaccination",
  "hospital",
  "specialist",
  "unknown",
]);

type IncomingClinicRow = Record<string, unknown>;

type NormalizedClinicRow = {
  sourceRecordId: string;
  fileRowNumber: number;
  name: string;
  normalizedName: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  lat: number | null;
  lng: number | null;
  phone: string;
  website: string;
  notes: string;
  npi: string;
  taxonomyCode: string;
  taxonomyDescription: string;
  primaryProviderType: string;
  capabilityTags: string[];
  qualityScore: number;
  qualityReasons: string[];
  raw: IncomingClinicRow;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function asBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "1";
}

function first(row: IncomingClinicRow, ...keys: string[]): string {
  const normalized = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) {
    normalized.set(key.toLowerCase().replace(/[\s_-]+/g, ""), value);
  }
  for (const key of keys) {
    const value = normalized.get(key.toLowerCase().replace(/[\s_-]+/g, ""));
    const cleaned = text(value);
    if (cleaned) return cleaned;
  }
  return "";
}

function contentHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function classify(
  row: IncomingClinicRow,
  name: string,
  notes: string,
  taxonomy: string,
): { primaryProviderType: string; capabilityTags: string[] } {
  const blob = [
    name,
    notes,
    taxonomy,
    first(row, "providerType", "provider_type", "clinicType", "clinic_type", "category", "type", "services", "service", "capabilities", "tags"),
  ].join(" ").toLowerCase();
  const tags = new Set<string>();
  let primary = "unknown";

  const add = (type: string) => {
    if (!PROVIDER_TYPES.has(type)) return;
    tags.add(type);
    if (primary === "unknown") primary = type;
  };

  if (/urgent|walk[- ]?in|immediate care/.test(blob)) add("urgent_care");
  if (/occupational|occ\s*med|employee health|workers? comp|fit[- ]?for[- ]?duty|ffd/.test(blob)) add("occupational_health_clinic");
  if (/\bdot\b|department of transportation|cdl|medical examiner/.test(blob)) add("dot_provider");
  if (/\bfaa\b|aviation medical|\bame\b/.test(blob)) add("faa_provider");
  if (/lab|toxicology|drug|urine|screen|specimen|collection|mro/.test(blob)) add("lab");
  if (/dental|dentist|orthodont|periodont|endodont|dd\s*2813/.test(blob)) add("dental");
  if (/x[- ]?ray|imaging|radiology|mammogram|ultrasound|mri|ct\b|b[- ]?read/.test(blob)) add("imaging");
  if (/pharmacy|vaccin|immuni[sz]ation|travel medicine|typhoid|hepatitis|tdap|mmr/.test(blob)) add("pharmacy_vaccination");
  if (/hospital|medical center|emergency room|\ber\b/.test(blob)) add("hospital");
  if (/family medicine|internal medicine|primary care|general practice|physician|doctor|\bmd\b|\bdo\b/.test(blob)) add("general_practitioner");
  if (/cardiology|pulmonary|orthopedic|neurology|specialist|specialty/.test(blob)) add("specialist");

  if (!tags.size) tags.add("unknown");
  return { primaryProviderType: primary, capabilityTags: Array.from(tags) };
}

function normalizeRow(row: IncomingClinicRow, index: number): NormalizedClinicRow {
  const name = first(row, "name", "providerName", "provider_name", "clinicName", "clinic_name", "practiceName", "facility", "facilityName");
  const address = first(row, "address", "formattedAddress", "formatted_address", "streetAddress", "street", "address1", "address_1", "addr");
  const city = first(row, "city", "town", "locality");
  const state = first(row, "state", "st", "adminArea", "admin_area", "region", "province").toUpperCase().slice(0, 24);
  const postalCode = first(row, "zip", "zipcode", "zipCode", "postal", "postalCode", "postal_code");
  const countryCode = (first(row, "country", "countryCode", "country_code") || "US").toUpperCase().slice(0, 3);
  const phone = first(row, "phone", "telephone", "tel");
  const website = first(row, "website", "url", "sourceUrl", "source_url");
  const notes = first(row, "notes", "note", "description", "desc");
  const npi = first(row, "npi", "npiNumber", "npi_number").replace(/\D/g, "");
  const taxonomyCode = first(row, "taxonomyCode", "taxonomy_code");
  const taxonomyDescription = first(row, "taxonomyDescription", "taxonomy_description", "taxonomy");
  const lat = parseOptionalNumber(first(row, "lat", "latitude"));
  const lng = parseOptionalNumber(first(row, "lng", "lon", "long", "longitude"));
  const { primaryProviderType, capabilityTags } = classify(row, name, notes, taxonomyDescription);
  const normalizedName = normalizedProviderName(name);
  const sourceRecordId = first(row, "id", "sourceId", "source_id") || contentHash({
    name: normalizedName,
    address: address.toLowerCase(),
    city: city.toLowerCase(),
    state: state.toLowerCase(),
    postalCode,
    npi,
  }).slice(0, 24);
  const qualityReasons = providerQualityReasons({ name, address, lat, lng });
  const qualityScore = hasValidCoordinates(lat, lng) && isUsableProviderName(name) ? 0.95 : 0.35;

  return {
    sourceRecordId,
    fileRowNumber: index + 1,
    name,
    normalizedName,
    address,
    city,
    state,
    postalCode,
    countryCode,
    lat,
    lng,
    phone,
    website,
    notes,
    npi: /^\d{10}$/.test(npi) ? npi : "",
    taxonomyCode,
    taxonomyDescription,
    primaryProviderType,
    capabilityTags,
    qualityScore,
    qualityReasons,
    raw: row,
  };
}

function masterKeyFor(row: NormalizedClinicRow): string {
  if (/^\d{10}$/.test(row.npi)) return `npi:${row.npi}`;
  return `loc:${contentHash({
    name: row.normalizedName,
    address: row.address.toLowerCase(),
    city: row.city.toLowerCase(),
    state: row.state.toLowerCase(),
    postal: row.postalCode,
    lat: row.lat,
    lng: row.lng,
  })}`;
}

async function upsertMasterSource(
  client: PoolClient,
  input: {
    masterProviderId: string;
    stageRecordId: string;
    rawRecordId: string;
    sourceRecordId: string;
    sourceUrl: string | null;
    qualityScore: number;
    raw: IncomingClinicRow;
  },
): Promise<void> {
  const existing = await client.query(
    `SELECT id
     FROM public.provider_master_sources
     WHERE source_key=$1 AND source_record_id=$2
     ORDER BY created_at ASC
     LIMIT 1`,
    [SOURCE_KEY, input.sourceRecordId],
  );

  if (existing.rows[0]?.id) {
    await client.query(
      `UPDATE public.provider_master_sources
       SET master_provider_id=$2,
           stage_record_id=$3,
           raw_record_id=$4,
           source_url=COALESCE($5, source_url),
           source_confidence_score=GREATEST(COALESCE(source_confidence_score,0), $6),
           raw_payload=$7::jsonb,
           updated_at=now()
       WHERE id=$1`,
      [existing.rows[0].id, input.masterProviderId, input.stageRecordId, input.rawRecordId, input.sourceUrl, input.qualityScore, JSON.stringify(input.raw)],
    );
    return;
  }

  await client.query(
    `INSERT INTO public.provider_master_sources (
       master_provider_id, stage_record_id, raw_record_id, source_key, source_record_id,
       source_url, source_confidence_score, raw_payload
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    [input.masterProviderId, input.stageRecordId, input.rawRecordId, SOURCE_KEY, input.sourceRecordId, input.sourceUrl, input.qualityScore, JSON.stringify(input.raw)],
  );
}

router.post("/my-clinics/upload", async (req: Request, res: Response) => {
  if (!isPersistenceConfigured()) {
    res.status(503).json({ error: "DATABASE_URL is required for backend My Clinics upload." });
    return;
  }

  const rows = Array.isArray(req.body?.rows)
    ? req.body.rows as IncomingClinicRow[]
    : Array.isArray(req.body?.clinics)
      ? req.body.clinics as IncomingClinicRow[]
      : [];
  if (!rows.length) {
    res.status(400).json({ error: "rows or clinics array is required." });
    return;
  }
  if (rows.length > MAX_ROWS_PER_REQUEST) {
    res.status(413).json({
      error: `Too many rows in one request. Send ${MAX_ROWS_PER_REQUEST} or fewer rows per chunk.`,
      maxRows: MAX_ROWS_PER_REQUEST,
    });
    return;
  }

  const dryRun = asBoolean(req.body?.dryRun) || asBoolean(req.query.dryRun);
  const mirrorLegacy = req.body?.mirrorLegacy === undefined ? true : asBoolean(req.body?.mirrorLegacy);
  const groupName = text(req.body?.groupName || req.body?.uploadLabel) || "My Clinics Upload";
  const originalFilename = text(req.body?.filename || req.body?.originalFilename) || "front-end-upload";
  const uploadedBy = text(req.body?.uploadedBy) || null;
  const pool = getPool();
  const client = await pool.connect();

  let rawRows = 0;
  let stagedRows = 0;
  let masteredRows = 0;
  let mirroredRows = 0;
  let errorRows = 0;
  let needsGeocodeRows = 0;
  let duplicateMasterRows = 0;
  const rowErrors: Array<{ row: number; reasons: string[] }> = [];

  try {
    await client.query("BEGIN");
    const batch = await client.query(
      `INSERT INTO public.provider_ingest_batches (
         source_key, upload_label, upload_method, original_filename, uploaded_by,
         status, total_rows, metadata
       ) VALUES ($1, $2, $3, $4, $5, 'raw_loaded', $6, $7::jsonb)
       RETURNING id`,
      [SOURCE_KEY, groupName, dryRun ? "dry_run" : "front_end_upload", originalFilename, uploadedBy, rows.length, JSON.stringify({ frontend: true, dryRun, mirrorLegacy })],
    );
    const batchId = batch.rows[0].id as string;

    for (let index = 0; index < rows.length; index += 1) {
      const normalized = normalizeRow(rows[index] || {}, index);
      const rowHash = contentHash(normalized.raw);
      const fatalReasons = normalized.qualityReasons.filter((reason) => reason === "blank_name" || reason === "placeholder_name");
      const rowError = fatalReasons.length ? fatalReasons.join(",") : null;

      const raw = await client.query(
        `INSERT INTO public.provider_raw_records (
           batch_id, source_key, source_record_id, file_row_number, content_hash,
           raw_payload, raw_text, status, error_message
         ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)
         RETURNING id`,
        [batchId, SOURCE_KEY, normalized.sourceRecordId, normalized.fileRowNumber, rowHash, JSON.stringify(normalized.raw), JSON.stringify(normalized.raw), rowError ? "error" : "raw_loaded", rowError],
      );
      rawRows += 1;

      if (rowError) {
        errorRows += 1;
        rowErrors.push({ row: normalized.fileRowNumber, reasons: fatalReasons });
        continue;
      }

      const coordinatesReady = hasValidCoordinates(normalized.lat, normalized.lng);
      const stage = await client.query(
        `INSERT INTO public.provider_stage_records (
           raw_record_id, batch_id, source_key, source_record_id, name, normalized_name,
           address_line1, formatted_address, city, state_region, postal_code, country_code,
           lat, lng, phone, website, npi, taxonomy_code, taxonomy_description,
           primary_provider_type, capability_tags, confidence_score, normalization_status,
           normalized_payload
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24::jsonb
         ) RETURNING id`,
        [raw.rows[0].id, batchId, SOURCE_KEY, normalized.sourceRecordId, normalized.name, normalized.normalizedName, normalized.address, normalized.address, normalized.city, normalized.state, normalized.postalCode, normalized.countryCode, normalized.lat, normalized.lng, normalized.phone || null, normalized.website || null, normalized.npi || null, normalized.taxonomyCode || null, normalized.taxonomyDescription || null, normalized.primaryProviderType, normalized.capabilityTags, normalized.qualityScore, coordinatesReady ? "staged" : "needs_geocode", JSON.stringify(normalized)],
      );
      stagedRows += 1;

      if (!coordinatesReady) {
        needsGeocodeRows += 1;
        rowErrors.push({ row: normalized.fileRowNumber, reasons: ["needs_geocode"] });
        continue;
      }

      const masterKey = masterKeyFor(normalized);
      const existingMaster = await client.query(
        "SELECT id FROM public.provider_master WHERE master_key=$1 LIMIT 1",
        [masterKey],
      );
      if (existingMaster.rows.length) duplicateMasterRows += 1;

      const master = await client.query(
        `INSERT INTO public.provider_master (
           master_key, name, normalized_name, address_line1, formatted_address, city,
           state_region, postal_code, country_code, lat, lng, phone, website, npi,
           primary_provider_type, capability_tags, primary_source_key, quality_score,
           last_seen_at, updated_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,now(),now()
         ) ON CONFLICT (master_key) DO UPDATE SET
           name=EXCLUDED.name,
           normalized_name=EXCLUDED.normalized_name,
           address_line1=COALESCE(NULLIF(EXCLUDED.address_line1,''), provider_master.address_line1),
           formatted_address=COALESCE(NULLIF(EXCLUDED.formatted_address,''), provider_master.formatted_address),
           city=COALESCE(NULLIF(EXCLUDED.city,''), provider_master.city),
           state_region=COALESCE(NULLIF(EXCLUDED.state_region,''), provider_master.state_region),
           postal_code=COALESCE(NULLIF(EXCLUDED.postal_code,''), provider_master.postal_code),
           country_code=COALESCE(NULLIF(EXCLUDED.country_code,''), provider_master.country_code),
           lat=EXCLUDED.lat,
           lng=EXCLUDED.lng,
           phone=COALESCE(NULLIF(EXCLUDED.phone,''), provider_master.phone),
           website=COALESCE(NULLIF(EXCLUDED.website,''), provider_master.website),
           npi=COALESCE(NULLIF(EXCLUDED.npi,''), provider_master.npi),
           primary_provider_type=EXCLUDED.primary_provider_type,
           capability_tags=ARRAY(
             SELECT DISTINCT value
             FROM unnest(provider_master.capability_tags || EXCLUDED.capability_tags) value
             WHERE value IS NOT NULL AND value <> ''
           ),
           primary_source_key=EXCLUDED.primary_source_key,
           quality_score=GREATEST(COALESCE(provider_master.quality_score,0), COALESCE(EXCLUDED.quality_score,0)),
           active=true,
           last_seen_at=now(),
           updated_at=now()
         RETURNING id`,
        [masterKey, normalized.name, normalized.normalizedName, normalized.address, normalized.address, normalized.city, normalized.state, normalized.postalCode, normalized.countryCode, normalized.lat, normalized.lng, normalized.phone || null, normalized.website || null, normalized.npi || null, normalized.primaryProviderType, normalized.capabilityTags, SOURCE_KEY, normalized.qualityScore],
      );
      masteredRows += 1;
      const masterProviderId = master.rows[0].id as string;

      await upsertMasterSource(client, {
        masterProviderId,
        stageRecordId: stage.rows[0].id as string,
        rawRecordId: raw.rows[0].id as string,
        sourceRecordId: normalized.sourceRecordId,
        sourceUrl: normalized.website || null,
        qualityScore: normalized.qualityScore,
        raw: normalized.raw,
      });

      for (const providerType of new Set([normalized.primaryProviderType, ...normalized.capabilityTags])) {
        if (!PROVIDER_TYPES.has(providerType)) continue;
        await client.query(
          `INSERT INTO public.provider_master_types (
             master_provider_id, type_key, source_key, confidence_score
           ) VALUES ($1,$2,$3,$4)
           ON CONFLICT (master_provider_id, type_key) DO UPDATE SET
             source_key=EXCLUDED.source_key,
             confidence_score=GREATEST(COALESCE(provider_master_types.confidence_score,0), COALESCE(EXCLUDED.confidence_score,0))`,
          [masterProviderId, providerType, SOURCE_KEY, normalized.qualityScore],
        );
      }

      if (mirrorLegacy) {
        const legacySourceId = `${SOURCE_KEY}:${masterKey}`;
        await client.query(
          `INSERT INTO public.medical_providers (
             place_id, name, formatted_address, lat, lng, types, category, phone, website,
             country_code, locality, administrative_area_level_1, postal_code, data_source,
             source_id, source_type, confidence_score, raw_data, scraped_at, updated_at
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'My Clinics',$14,'user_upload',$15,$16::jsonb,now(),now()
           ) ON CONFLICT (source_id) DO UPDATE SET
             name=EXCLUDED.name,
             formatted_address=EXCLUDED.formatted_address,
             lat=EXCLUDED.lat,
             lng=EXCLUDED.lng,
             types=EXCLUDED.types,
             category=EXCLUDED.category,
             phone=EXCLUDED.phone,
             website=EXCLUDED.website,
             country_code=EXCLUDED.country_code,
             locality=EXCLUDED.locality,
             administrative_area_level_1=EXCLUDED.administrative_area_level_1,
             postal_code=EXCLUDED.postal_code,
             confidence_score=EXCLUDED.confidence_score,
             raw_data=EXCLUDED.raw_data,
             updated_at=now()`,
          [legacySourceId, normalized.name, normalized.address, normalized.lat, normalized.lng, normalized.capabilityTags, normalized.primaryProviderType, normalized.phone || null, normalized.website || null, normalized.countryCode, normalized.city, normalized.state, normalized.postalCode, legacySourceId, normalized.qualityScore, JSON.stringify({ ...normalized.raw, provider_master_id: masterProviderId, source_key: SOURCE_KEY, group_name: groupName })],
        );
        mirroredRows += 1;
      }
    }

    await client.query(
      `UPDATE public.provider_ingest_batches
       SET status=$2,
           raw_rows=$3,
           staged_rows=$4,
           mastered_rows=$5,
           error_rows=$6,
           completed_at=now(),
           updated_at=now(),
           metadata=metadata || $7::jsonb
       WHERE id=$1`,
      [batchId, errorRows ? "completed_with_errors" : "completed", rawRows, stagedRows, masteredRows, errorRows, JSON.stringify({ dryRun, mirrorLegacy, needsGeocodeRows, duplicateMasterRows })],
    );

    if (dryRun) await client.query("ROLLBACK");
    else await client.query("COMMIT");

    res.status(dryRun ? 200 : 201).json({
      batchId: dryRun ? null : batchId,
      sourceKey: SOURCE_KEY,
      dryRun,
      committed: !dryRun,
      totalRows: rows.length,
      rawRows,
      stagedRows,
      masteredRows,
      mirroredRows,
      needsGeocodeRows,
      duplicateMasterRows,
      errorRows,
      rowErrors: rowErrors.slice(0, 100),
      message: dryRun
        ? `Dry run validated ${rows.length} rows; no database changes were committed.`
        : `Uploaded ${masteredRows} mapped My Clinics rows to provider_master.`,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    res.status(500).json({ error: error instanceof Error ? error.message : "My Clinics upload failed" });
  } finally {
    client.release();
  }
});

export default router;

import { createHash, randomUUID } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { getPool } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { hasValidCoordinates, parseOptionalNumber } from "../lib/providerCoordinates";
import { isUsableProviderName, normalizedProviderName, providerQualityReasons } from "../lib/providerDataQuality";

const router = Router();
const MAX_ROWS_PER_REQUEST = 5000;
const MAX_PAGE_SIZE = 5000;
const MAX_ALL_ROWS = 25000;
const DEFAULT_SOURCE_KEY = "my_clinics_upload";

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

const COUNTRY_NAME_TO_CODE = new Map<string, string>([
  ["united states", "US"],
  ["united states of america", "US"],
  ["usa", "US"],
  ["canada", "CA"],
  ["mexico", "MX"],
  ["united kingdom", "GB"],
  ["great britain", "GB"],
  ["australia", "AU"],
  ["new zealand", "NZ"],
  ["south korea", "KR"],
  ["republic of korea", "KR"],
  ["north korea", "KP"],
  ["china", "CN"],
  ["people's republic of china", "CN"],
  ["japan", "JP"],
  ["germany", "DE"],
  ["france", "FR"],
  ["italy", "IT"],
  ["spain", "ES"],
  ["poland", "PL"],
  ["greece", "GR"],
  ["saudi arabia", "SA"],
  ["united arab emirates", "AE"],
  ["kuwait", "KW"],
  ["qatar", "QA"],
  ["bahrain", "BH"],
  ["oman", "OM"],
  ["india", "IN"],
  ["pakistan", "PK"],
  ["lebanon", "LB"],
  ["jordan", "JO"],
  ["israel", "IL"],
  ["egypt", "EG"],
  ["south africa", "ZA"],
  ["brazil", "BR"],
  ["argentina", "AR"],
  ["chile", "CL"],
  ["colombia", "CO"],
  ["peru", "PE"],
]);

type IncomingRow = Record<string, unknown>;

type NormalizedRow = {
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
  email: string;
  website: string;
  notes: string;
  npi: string;
  taxonomyCode: string;
  taxonomyDescription: string;
  primaryProviderType: string;
  capabilityTags: string[];
  qualityScore: number;
  qualityReasons: string[];
  providedMasterKey: string;
  raw: IncomingRow;
};

type PreparedRow = NormalizedRow & {
  rawId: string;
  stageId: string;
  masterKey: string;
  coordinatesReady: boolean;
  errorMessage: string | null;
};

type LayerProvider = Record<string, unknown> & {
  name?: unknown;
  clinic_name?: unknown;
  address_1?: unknown;
  city?: unknown;
  state?: unknown;
  zip?: unknown;
  source_id?: unknown;
};

type Bounds = { north: number; south: number; east: number; west: number };

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  return typeof value === "string" && ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
}

function normalizedLookup(row: IncomingRow): Map<string, unknown> {
  const values = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) {
    values.set(key.toLowerCase().replace(/[\s_-]+/g, ""), value);
  }
  return values;
}

function first(row: IncomingRow, ...keys: string[]): string {
  const values = normalizedLookup(row);
  for (const key of keys) {
    const cleaned = text(values.get(key.toLowerCase().replace(/[\s_-]+/g, "")));
    if (cleaned) return cleaned;
  }
  return "";
}

function firstValue(row: IncomingRow, ...keys: string[]): unknown {
  const values = normalizedLookup(row);
  for (const key of keys) {
    const value = values.get(key.toLowerCase().replace(/[\s_-]+/g, ""));
    if (value !== undefined && value !== null && text(value)) return value;
  }
  return null;
}

function contentHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizeSourceLabel(value: unknown, filename: string): string {
  const fallback = filename.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  return (text(value) || fallback || "Uploaded Provider Dataset")
    .replace(/\s+/g, " ")
    .replace(/\s+\(\d+\s*\/\s*\d+\)$/, "")
    .trim()
    .slice(0, 120);
}

function sourceKeyForLabel(label: string): string {
  const normalized = label.toLowerCase();
  if (normalized === "my clinics" || normalized === "my clinics upload") return DEFAULT_SOURCE_KEY;
  const slug = normalized
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "dataset";
  return `user_upload_${slug}_${contentHash(normalized).slice(0, 8)}`;
}

function countryCodeFor(value: string): string {
  const raw = value.trim();
  if (!raw) return "US";
  const mapped = COUNTRY_NAME_TO_CODE.get(raw.toLowerCase());
  if (mapped) return mapped;
  return /^[A-Za-z]{2,3}$/.test(raw) ? raw.toUpperCase() : "";
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) return [...new Set(value.map(text).filter(Boolean))];
  const raw = text(value);
  if (!raw) return [];
  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return [...new Set(parsed.map(text).filter(Boolean))];
    } catch {
      // Fall through to delimiter parsing.
    }
  }
  return [...new Set(raw.split(/[|;,]+/).map((part) => part.trim()).filter(Boolean))];
}

function classify(row: IncomingRow, name: string, notes: string, taxonomy: string) {
  const explicit = first(row, "primaryProviderType", "primary_provider_type", "providerType", "provider_type")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const blob = [
    name,
    notes,
    taxonomy,
    first(row, "clinicType", "clinic_type", "category", "type", "specialtiesServices", "specialties_services", "services", "service"),
  ].join(" ").toLowerCase();
  const tags = new Set<string>();
  let primary = PROVIDER_TYPES.has(explicit) ? explicit : "unknown";
  if (primary !== "unknown") tags.add(primary);
  const add = (type: string) => {
    if (!PROVIDER_TYPES.has(type)) return;
    tags.add(type);
    if (primary === "unknown") primary = type;
  };

  if (/urgent|walk[- ]?in|immediate care/.test(blob)) add("urgent_care");
  if (/occupational|occ\s*med|employee health|workers? comp|fit[- ]?for[- ]?duty|ffd/.test(blob)) add("occupational_health_clinic");
  if (/\bdot\b|department of transportation|cdl|medical examiner/.test(blob)) add("dot_provider");
  if (/\bfaa\b|aviation medical|\bame\b/.test(blob)) add("faa_provider");
  if (/\blabs?\b|\blaboratory\b|toxicology|drug|urine|screen|specimen|collection|\bmro\b/.test(blob)) add("lab");
  if (/dental|dentist|orthodont|periodont|endodont|dd\s*2813/.test(blob)) add("dental");
  if (/x[- ]?ray|imaging|radiology|mammogram|ultrasound|\bmri\b|\bct\b|b[- ]?read/.test(blob)) add("imaging");
  if (/pharmacy|vaccin|immuni[sz]ation|travel medicine|typhoid|hepatitis|tdap|mmr/.test(blob)) add("pharmacy_vaccination");
  if (/hospital|medical center|emergency room|\ber\b/.test(blob)) add("hospital");
  if (/family medicine|internal medicine|primary care|general practice|physician|doctor|\bmd\b|\bdo\b/.test(blob)) add("general_practitioner");
  if (/cardiology|pulmonary|orthopedic|neurology|specialist|specialty/.test(blob)) add("specialist");

  for (const tag of parseStringList(firstValue(row, "capabilityTags", "capability_tags", "capabilities", "tags"))) {
    const normalized = tag.toLowerCase().replace(/[\s-]+/g, "_");
    if (PROVIDER_TYPES.has(normalized)) add(normalized);
  }
  if (!tags.size) tags.add("unknown");
  return { primaryProviderType: primary, capabilityTags: [...tags] };
}

function normalizeRow(row: IncomingRow, index: number): NormalizedRow {
  const name = first(row, "name", "providerName", "provider_name", "clinicName", "clinic_name", "practiceName", "facility", "facilityName", "facility_name");
  const address = first(row, "formattedAddress", "formatted_address", "address", "originalAddress", "original_address", "streetAddress", "street", "address1", "address_1", "addr");
  const city = first(row, "geocodedCity", "geocoded_city", "originalCity", "original_city", "city", "town", "locality");
  const state = first(row, "stateRegion", "state_region", "state", "st", "adminArea", "admin_area", "region", "province").toUpperCase().slice(0, 80);
  const postalCode = first(row, "postalCode", "postal_code", "zip", "zipcode", "zipCode", "postal");
  const countryCode = countryCodeFor(first(row, "countryCode", "country_code", "country"));
  const phone = first(row, "internationalPhone", "international_phone", "localPhone", "local_phone", "phone", "telephone", "tel");
  const email = first(row, "email", "emailAddress", "email_address");
  const website = first(row, "website", "url", "sourceUrl", "source_url");
  const notes = first(row, "notes", "note", "description", "desc", "specialtiesServices", "specialties_services");
  const npi = first(row, "npi", "npiNumber", "npi_number").replace(/\D/g, "");
  const taxonomyCode = first(row, "taxonomyCode", "taxonomy_code");
  const taxonomyDescription = first(row, "taxonomyDescription", "taxonomy_description", "taxonomy", "specialtiesServices", "specialties_services");
  const lat = parseOptionalNumber(first(row, "lat", "latitude"));
  const lng = parseOptionalNumber(first(row, "lng", "lon", "long", "longitude"));
  const { primaryProviderType, capabilityTags } = classify(row, name, notes, taxonomyDescription);
  const normalizedName = first(row, "normalizedName", "normalized_name") || normalizedProviderName(name);
  const sourceRecordId = first(row, "sourceRecordId", "source_record_id", "id", "sourceId", "source_id") || contentHash({
    name: normalizedName,
    address: address.toLowerCase(),
    city: city.toLowerCase(),
    state: state.toLowerCase(),
    postalCode,
    npi,
  }).slice(0, 32);
  const suppliedRowNumber = parseOptionalNumber(first(row, "fileRowNumber", "file_row_number", "sourceRow", "source_row", "sequence"));
  const fileRowNumber = suppliedRowNumber !== null && suppliedRowNumber > 0 ? Math.trunc(suppliedRowNumber) : index + 1;
  const qualityReasons = providerQualityReasons({ name, address, lat, lng });
  const providedQuality = parseOptionalNumber(first(row, "qualityScore", "quality_score"));
  const qualityScore = providedQuality === null
    ? (hasValidCoordinates(lat, lng) && isUsableProviderName(name) ? 0.95 : 0.35)
    : Math.min(Math.max(providedQuality, 0), 1);

  return {
    sourceRecordId,
    fileRowNumber,
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
    email,
    website,
    notes,
    npi: /^\d{10}$/.test(npi) ? npi : "",
    taxonomyCode,
    taxonomyDescription,
    primaryProviderType,
    capabilityTags,
    qualityScore,
    qualityReasons,
    providedMasterKey: first(row, "masterKey", "master_key"),
    raw: row,
  };
}

function masterKeyFor(row: NormalizedRow): string {
  if (row.providedMasterKey) return row.providedMasterKey.slice(0, 240);
  if (/^\d{10}$/.test(row.npi)) return `npi:${row.npi}`;
  return `loc:${contentHash({
    name: row.normalizedName,
    address: row.address.toLowerCase(),
    city: row.city.toLowerCase(),
    state: row.state.toLowerCase(),
    postal: row.postalCode,
  })}`;
}

function prepareRows(rows: IncomingRow[], rowOffset = 0): PreparedRow[] {
  return rows.map((row, index) => {
    const normalized = normalizeRow(row || {}, rowOffset + index);
    const fatalReasons = normalized.qualityReasons.filter((reason) => reason === "blank_name" || reason === "placeholder_name");
    return {
      ...normalized,
      rawId: randomUUID(),
      stageId: randomUUID(),
      masterKey: masterKeyFor(normalized),
      coordinatesReady: hasValidCoordinates(normalized.lat, normalized.lng),
      errorMessage: fatalReasons.length ? fatalReasons.join(",") : null,
    };
  });
}

function uniqueBy<T>(values: T[], keyFor: (value: T) => string): T[] {
  const unique = new Map<string, T>();
  for (const value of values) unique.set(keyFor(value), value);
  return [...unique.values()];
}

function isBulkDatasetUpload(req: Request): boolean {
  const filename = text(req.body?.filename || req.body?.originalFilename);
  return Boolean(req.body?.sourceLabel || req.body?.datasetLabel || /\.(csv|xlsx?|xls)$/i.test(filename));
}

router.post("/my-clinics/upload", async (req: Request, res: Response, next: NextFunction) => {
  if (!isBulkDatasetUpload(req)) {
    next();
    return;
  }
  if (!isPersistenceConfigured()) {
    res.status(503).json({ error: "DATABASE_URL is required for provider dataset upload." });
    return;
  }

  const rows = Array.isArray(req.body?.rows)
    ? req.body.rows as IncomingRow[]
    : Array.isArray(req.body?.clinics)
      ? req.body.clinics as IncomingRow[]
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
  const originalFilename = text(req.body?.filename || req.body?.originalFilename) || "front-end-upload";
  const sourceLabel = normalizeSourceLabel(
    req.body?.sourceLabel || req.body?.datasetLabel || req.body?.groupName || req.body?.uploadLabel,
    originalFilename,
  );
  const sourceKey = sourceKeyForLabel(sourceLabel);
  const uploadLabel = text(req.body?.uploadLabel || req.body?.groupName) || sourceLabel;
  const uploadedBy = text(req.body?.uploadedBy) || null;
  const rowOffset = Math.max(0, Math.trunc(Number(req.body?.rowOffset) || 0));
  const prepared = prepareRows(rows, rowOffset);
  const staged = prepared.filter((row) => !row.errorMessage);
  const mapReady = staged.filter((row) => row.coordinatesReady);
  const masters = uniqueBy(mapReady, (row) => row.masterKey);
  const lineage = uniqueBy(mapReady, (row) => `${row.masterKey}|${row.sourceRecordId}`);
  const typeRows = uniqueBy(
    mapReady.flatMap((row) => [...new Set([row.primaryProviderType, ...row.capabilityTags])]
      .filter((typeKey) => PROVIDER_TYPES.has(typeKey))
      .map((typeKey) => ({ masterKey: row.masterKey, typeKey, qualityScore: row.qualityScore }))),
    (row) => `${row.masterKey}|${row.typeKey}`,
  );

  const errorRows = prepared.filter((row) => row.errorMessage).length;
  const needsGeocodeRows = staged.filter((row) => !row.coordinatesReady).length;
  const rowErrors = prepared
    .filter((row) => row.errorMessage || !row.coordinatesReady)
    .slice(0, 100)
    .map((row) => ({
      row: row.fileRowNumber,
      reasons: row.errorMessage ? row.errorMessage.split(",") : ["needs_geocode"],
    }));

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '180s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '60s'");

    await client.query(
      `INSERT INTO public.provider_source_catalog (
         source_key, display_name, source_kind, trust_tier, active, notes
       ) VALUES ($1,$2,'user_upload','verified',true,$3)
       ON CONFLICT (source_key) DO UPDATE SET
         display_name=EXCLUDED.display_name,
         source_kind='user_upload',
         trust_tier='verified',
         active=true,
         updated_at=now()`,
      [sourceKey, sourceLabel, `Uploaded from ${originalFilename}`],
    );

    const batch = await client.query(
      `INSERT INTO public.provider_ingest_batches (
         source_key, upload_label, upload_method, original_filename, uploaded_by,
         status, total_rows, metadata
       ) VALUES ($1,$2,$3,$4,$5,'raw_loaded',$6,$7::jsonb)
       RETURNING id`,
      [
        sourceKey,
        uploadLabel,
        dryRun ? "dry_run" : "front_end_upload",
        originalFilename,
        uploadedBy,
        rows.length,
        JSON.stringify({ frontend: true, dryRun, mirrorLegacy, sourceLabel, sourceKey }),
      ],
    );
    const batchId = batch.rows[0].id as string;

    const rawPayload = prepared.map((row) => ({
      raw_id: row.rawId,
      source_record_id: row.sourceRecordId,
      file_row_number: row.fileRowNumber,
      content_hash: contentHash(row.raw),
      raw_payload: row.raw,
      raw_text: JSON.stringify(row.raw),
      status: row.errorMessage ? "error" : "raw_loaded",
      error_message: row.errorMessage,
    }));
    await client.query(
      `INSERT INTO public.provider_raw_records (
         id, batch_id, source_key, source_record_id, file_row_number, content_hash,
         raw_payload, raw_text, status, error_message
       )
       SELECT x.raw_id,$2,$3,x.source_record_id,x.file_row_number,x.content_hash,
              x.raw_payload,x.raw_text,x.status,x.error_message
       FROM jsonb_to_recordset($1::jsonb) AS x(
         raw_id uuid, source_record_id text, file_row_number integer, content_hash text,
         raw_payload jsonb, raw_text text, status text, error_message text
       )`,
      [JSON.stringify(rawPayload), batchId, sourceKey],
    );

    if (staged.length) {
      const stagePayload = staged.map((row) => ({
        stage_id: row.stageId,
        raw_id: row.rawId,
        source_record_id: row.sourceRecordId,
        name: row.name,
        normalized_name: row.normalizedName,
        address: row.address,
        city: row.city,
        state: row.state,
        postal_code: row.postalCode,
        country_code: row.countryCode,
        lat: row.lat,
        lng: row.lng,
        phone: row.phone || null,
        email: row.email || null,
        website: row.website || null,
        npi: row.npi || null,
        taxonomy_code: row.taxonomyCode || null,
        taxonomy_description: row.taxonomyDescription || null,
        primary_provider_type: row.primaryProviderType,
        capability_tags: row.capabilityTags,
        quality_score: row.qualityScore,
        normalization_status: row.coordinatesReady ? "staged" : "needs_geocode",
        normalized_payload: row,
      }));
      await client.query(
        `INSERT INTO public.provider_stage_records (
           id, raw_record_id, batch_id, source_key, source_record_id, name, normalized_name,
           address_line1, formatted_address, city, state_region, postal_code, country_code,
           lat, lng, phone, email, website, npi, taxonomy_code, taxonomy_description,
           primary_provider_type, capability_tags, confidence_score, normalization_status,
           normalized_payload
         )
         SELECT x.stage_id,x.raw_id,$2,$3,x.source_record_id,x.name,x.normalized_name,
                NULLIF(x.address,''),NULLIF(x.address,''),NULLIF(x.city,''),NULLIF(x.state,''),
                NULLIF(x.postal_code,''),NULLIF(x.country_code,''),x.lat,x.lng,x.phone,x.email,
                x.website,x.npi,x.taxonomy_code,x.taxonomy_description,x.primary_provider_type,
                ARRAY(SELECT jsonb_array_elements_text(COALESCE(x.capability_tags,'[]'::jsonb))),
                x.quality_score,x.normalization_status,x.normalized_payload
         FROM jsonb_to_recordset($1::jsonb) AS x(
           stage_id uuid, raw_id uuid, source_record_id text, name text, normalized_name text,
           address text, city text, state text, postal_code text, country_code text,
           lat double precision, lng double precision, phone text, email text, website text,
           npi text, taxonomy_code text, taxonomy_description text, primary_provider_type text,
           capability_tags jsonb, quality_score numeric, normalization_status text,
           normalized_payload jsonb
         )`,
        [JSON.stringify(stagePayload), batchId, sourceKey],
      );
    }

    let duplicateMasterRows = mapReady.length - masters.length;
    if (masters.length) {
      const existing = await client.query(
        `SELECT count(*)::int AS total
         FROM public.provider_master
         WHERE master_key = ANY($1::text[])`,
        [masters.map((row) => row.masterKey)],
      );
      duplicateMasterRows += Number(existing.rows[0]?.total || 0);

      const masterPayload = masters.map((row) => ({
        master_key: row.masterKey,
        name: row.name,
        normalized_name: row.normalizedName,
        address: row.address,
        city: row.city,
        state: row.state,
        postal_code: row.postalCode,
        country_code: row.countryCode,
        lat: row.lat,
        lng: row.lng,
        phone: row.phone || null,
        email: row.email || null,
        website: row.website || null,
        npi: row.npi || null,
        primary_provider_type: row.primaryProviderType,
        capability_tags: row.capabilityTags,
        quality_score: row.qualityScore,
        raw_payload: row.raw,
      }));
      await client.query(
        `INSERT INTO public.provider_master (
           master_key, name, normalized_name, address_line1, formatted_address, city,
           state_region, postal_code, country_code, lat, lng, phone, email, website, npi,
           primary_provider_type, capability_tags, primary_source_key, quality_score,
           last_seen_at, updated_at
         )
         SELECT x.master_key,x.name,x.normalized_name,NULLIF(x.address,''),NULLIF(x.address,''),
                NULLIF(x.city,''),NULLIF(x.state,''),NULLIF(x.postal_code,''),NULLIF(x.country_code,''),
                x.lat,x.lng,x.phone,x.email,x.website,x.npi,x.primary_provider_type,
                ARRAY(SELECT jsonb_array_elements_text(COALESCE(x.capability_tags,'[]'::jsonb))),
                $2,x.quality_score,now(),now()
         FROM jsonb_to_recordset($1::jsonb) AS x(
           master_key text, name text, normalized_name text, address text, city text, state text,
           postal_code text, country_code text, lat double precision, lng double precision,
           phone text, email text, website text, npi text, primary_provider_type text,
           capability_tags jsonb, quality_score numeric, raw_payload jsonb
         )
         ON CONFLICT (master_key) DO UPDATE SET
           name=EXCLUDED.name,
           normalized_name=EXCLUDED.normalized_name,
           address_line1=COALESCE(NULLIF(EXCLUDED.address_line1,''),provider_master.address_line1),
           formatted_address=COALESCE(NULLIF(EXCLUDED.formatted_address,''),provider_master.formatted_address),
           city=COALESCE(NULLIF(EXCLUDED.city,''),provider_master.city),
           state_region=COALESCE(NULLIF(EXCLUDED.state_region,''),provider_master.state_region),
           postal_code=COALESCE(NULLIF(EXCLUDED.postal_code,''),provider_master.postal_code),
           country_code=COALESCE(NULLIF(EXCLUDED.country_code,''),provider_master.country_code),
           lat=EXCLUDED.lat,
           lng=EXCLUDED.lng,
           phone=COALESCE(NULLIF(EXCLUDED.phone,''),provider_master.phone),
           email=COALESCE(NULLIF(EXCLUDED.email,''),provider_master.email),
           website=COALESCE(NULLIF(EXCLUDED.website,''),provider_master.website),
           npi=COALESCE(NULLIF(EXCLUDED.npi,''),provider_master.npi),
           primary_provider_type=EXCLUDED.primary_provider_type,
           capability_tags=ARRAY(
             SELECT DISTINCT value
             FROM unnest(
               COALESCE(provider_master.capability_tags,ARRAY[]::text[])
               || COALESCE(EXCLUDED.capability_tags,ARRAY[]::text[])
             ) value
             WHERE value IS NOT NULL AND value <> ''
           ),
           primary_source_key=CASE
             WHEN provider_master.primary_source_key IS NULL
               OR provider_master.primary_source_key = 'my_clinics_upload'
               OR provider_master.primary_source_key LIKE 'user_upload_%'
             THEN EXCLUDED.primary_source_key
             ELSE provider_master.primary_source_key
           END,
           quality_score=GREATEST(COALESCE(provider_master.quality_score,0),COALESCE(EXCLUDED.quality_score,0)),
           active=true,
           last_seen_at=now(),
           updated_at=now()`,
        [JSON.stringify(masterPayload), sourceKey],
      );

      const lineagePayload = lineage.map((row) => ({
        master_key: row.masterKey,
        stage_id: row.stageId,
        raw_id: row.rawId,
        source_record_id: row.sourceRecordId,
        source_url: row.website || null,
        quality_score: row.qualityScore,
        raw_payload: row.raw,
      }));
      await client.query(
        `INSERT INTO public.provider_master_sources (
           master_provider_id, stage_record_id, raw_record_id, source_key, source_record_id,
           source_url, source_confidence_score, raw_payload
         )
         SELECT pm.id,x.stage_id,x.raw_id,$2,x.source_record_id,x.source_url,x.quality_score,x.raw_payload
         FROM jsonb_to_recordset($1::jsonb) AS x(
           master_key text, stage_id uuid, raw_id uuid, source_record_id text,
           source_url text, quality_score numeric, raw_payload jsonb
         )
         INNER JOIN public.provider_master pm ON pm.master_key=x.master_key
         ON CONFLICT (master_provider_id, source_key, (COALESCE(source_record_id,'')))
         DO UPDATE SET
           stage_record_id=EXCLUDED.stage_record_id,
           raw_record_id=EXCLUDED.raw_record_id,
           source_url=COALESCE(EXCLUDED.source_url,provider_master_sources.source_url),
           source_confidence_score=GREATEST(
             COALESCE(provider_master_sources.source_confidence_score,0),
             COALESCE(EXCLUDED.source_confidence_score,0)
           ),
           raw_payload=EXCLUDED.raw_payload,
           updated_at=now()`,
        [JSON.stringify(lineagePayload), sourceKey],
      );

      if (typeRows.length) {
        await client.query(
          `INSERT INTO public.provider_master_types (
             master_provider_id, type_key, source_key, confidence_score
           )
           SELECT pm.id,x.type_key,$2,x.quality_score
           FROM jsonb_to_recordset($1::jsonb) AS x(
             master_key text, type_key text, quality_score numeric
           )
           INNER JOIN public.provider_master pm ON pm.master_key=x.master_key
           ON CONFLICT (master_provider_id,type_key) DO UPDATE SET
             source_key=EXCLUDED.source_key,
             confidence_score=GREATEST(
               COALESCE(provider_master_types.confidence_score,0),
               COALESCE(EXCLUDED.confidence_score,0)
             )`,
          [JSON.stringify(typeRows.map((row) => ({
            master_key: row.masterKey,
            type_key: row.typeKey,
            quality_score: row.qualityScore,
          }))), sourceKey],
        );
      }

      if (mirrorLegacy) {
        await client.query(
          `INSERT INTO public.medical_providers (
             place_id, name, formatted_address, lat, lng, types, category, phone, website,
             country_code, locality, administrative_area_level_1, postal_code, data_source,
             source_id, source_type, confidence_score, raw_data, scraped_at, updated_at
           )
           SELECT $2 || ':' || x.master_key,x.name,NULLIF(x.address,''),x.lat,x.lng,
                  ARRAY(SELECT jsonb_array_elements_text(COALESCE(x.capability_tags,'[]'::jsonb))),
                  x.primary_provider_type,x.phone,x.website,NULLIF(x.country_code,''),
                  NULLIF(x.city,''),NULLIF(x.state,''),NULLIF(x.postal_code,''),$3,
                  $2 || ':' || x.master_key,'user_upload',x.quality_score,
                  x.raw_payload || jsonb_build_object(
                    'provider_master_key',x.master_key,
                    'source_key',$2,
                    'source_label',$3,
                    'upload_label',$4
                  ),now(),now()
           FROM jsonb_to_recordset($1::jsonb) AS x(
             master_key text, name text, normalized_name text, address text, city text, state text,
             postal_code text, country_code text, lat double precision, lng double precision,
             phone text, email text, website text, npi text, primary_provider_type text,
             capability_tags jsonb, quality_score double precision, raw_payload jsonb
           )
           ON CONFLICT (source_id) DO UPDATE SET
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
             data_source=EXCLUDED.data_source,
             source_type=EXCLUDED.source_type,
             confidence_score=EXCLUDED.confidence_score,
             raw_data=EXCLUDED.raw_data,
             updated_at=now()`,
          [JSON.stringify(masterPayload), sourceKey, sourceLabel, uploadLabel],
        );
      }
    }

    await client.query(
      `UPDATE public.provider_ingest_batches
       SET status=$2, raw_rows=$3, staged_rows=$4, mastered_rows=$5, error_rows=$6,
           completed_at=now(), updated_at=now(), metadata=metadata || $7::jsonb
       WHERE id=$1`,
      [
        batchId,
        errorRows ? "completed_with_errors" : "completed",
        prepared.length,
        staged.length,
        mapReady.length,
        errorRows,
        JSON.stringify({ dryRun, mirrorLegacy, needsGeocodeRows, duplicateMasterRows, sourceLabel, sourceKey }),
      ],
    );

    if (dryRun) await client.query("ROLLBACK");
    else await client.query("COMMIT");

    res.status(dryRun ? 200 : 201).json({
      batchId: dryRun ? null : batchId,
      sourceKey,
      sourceLabel,
      dryRun,
      committed: !dryRun,
      totalRows: prepared.length,
      rawRows: prepared.length,
      stagedRows: staged.length,
      masteredRows: mapReady.length,
      mirroredRows: mirrorLegacy ? masters.length : 0,
      needsGeocodeRows,
      duplicateMasterRows,
      errorRows,
      rowErrors,
      message: dryRun
        ? `Dry run validated ${prepared.length} rows; no database changes were committed.`
        : `Uploaded ${mapReady.length} mapped rows as "${sourceLabel}".`,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("[ProviderDatasetUploads] upload failed:", error);
    res.status(500).json({ error: "Provider dataset upload failed" });
  } finally {
    client.release();
  }
});

function addParam(params: Array<string | number>, value: string | number): string {
  params.push(value);
  return `$${params.length}`;
}

function providerIdentity(provider: LayerProvider): string {
  const name = text(provider.name || provider.clinic_name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const address = text(provider.address_1).toLowerCase().replace(/\s+/g, " ").trim();
  const city = text(provider.city).toLowerCase();
  const state = text(provider.state).toLowerCase();
  const postal = text(provider.zip).toLowerCase();
  if (name && (address || city || state || postal)) return `${name}|${address}|${city}|${state}|${postal}`;
  return text(provider.source_id) || name;
}

function savedCandidateConditions(bounds: Bounds | null, clinicType: string, params: Array<string | number>): string[] {
  const conditions = [
    "status='saved'",
    "lat IS NOT NULL",
    "lng IS NOT NULL",
    "lat BETWEEN -90 AND 90",
    "lng BETWEEN -180 AND 180",
    "(lat <> 0 OR lng <> 0)",
    "NULLIF(btrim(name),'') IS NOT NULL",
  ];
  if (bounds) {
    conditions.push(`lat BETWEEN ${addParam(params, bounds.south)} AND ${addParam(params, bounds.north)}`);
    conditions.push(bounds.west <= bounds.east
      ? `lng BETWEEN ${addParam(params, bounds.west)} AND ${addParam(params, bounds.east)}`
      : `(lng >= ${addParam(params, bounds.west)} OR lng <= ${addParam(params, bounds.east)})`);
  }
  if (clinicType) {
    const placeholder = addParam(params, clinicType);
    conditions.push(`(
      clinic_type=${placeholder}
      OR array_to_string(COALESCE(services,ARRAY[]::text[]),',') ILIKE '%' || ${placeholder} || '%'
      OR array_to_string(COALESCE(categories,ARRAY[]::text[]),',') ILIKE '%' || ${placeholder} || '%'
    )`);
  }
  return conditions;
}

async function relationExists(relation: string): Promise<boolean> {
  const result = await getPool().query("SELECT to_regclass($1) IS NOT NULL AS ok", [`public.${relation}`]);
  return result.rows[0]?.ok === true;
}

async function countSavedCandidates(bounds: Bounds | null, clinicType: string): Promise<number> {
  if (!(await relationExists("provider_candidates"))) return 0;
  const params: Array<string | number> = [];
  const conditions = savedCandidateConditions(bounds, clinicType, params);
  const result = await getPool().query(
    `SELECT count(*)::int AS total
     FROM public.provider_candidates
     WHERE ${conditions.join(" AND ")}`,
    params,
  );
  return Number(result.rows[0]?.total || 0);
}

async function loadSavedCandidates(
  bounds: Bounds | null,
  clinicType: string,
  limit: number,
  offset: number,
): Promise<LayerProvider[]> {
  if (!limit || !(await relationExists("provider_candidates"))) return [];
  const params: Array<string | number> = [];
  const conditions = savedCandidateConditions(bounds, clinicType, params);
  const limitPlaceholder = addParam(params, limit);
  const offsetPlaceholder = addParam(params, offset);
  const result = await getPool().query(
    `SELECT id::text, name, address, city, admin_area, postal_code, lat, lng, phone, website,
            source_url, trust_tier, confidence_score, clinic_type, services, categories
     FROM public.provider_candidates
     WHERE ${conditions.join(" AND ")}
     ORDER BY name ASC, id ASC
     LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
    params,
  );
  return result.rows.map((row: Record<string, unknown>) => {
    const tags = [...new Set([
      ...(Array.isArray(row.services) ? row.services : []),
      ...(Array.isArray(row.categories) ? row.categories : []),
    ].map(String))];
    return {
      clinic_name: row.name,
      name: row.name,
      address_1: row.address,
      city: row.city,
      state: row.admin_area,
      zip: row.postal_code,
      phone: row.phone,
      website: row.website,
      lat: Number(row.lat),
      lng: Number(row.lng),
      source_url: row.source_url,
      source_id: `candidate:${String(row.id)}`,
      source_type: "saved_candidate",
      data_source: "My Clinics",
      source: "My Clinics",
      trust_tier: row.trust_tier || "verified",
      confidence_score: row.confidence_score == null ? null : Number(row.confidence_score),
      category: row.clinic_type || "unknown",
      clinic_type: row.clinic_type || "unknown",
      providerType: row.clinic_type || "unknown",
      taxonomy_description: row.clinic_type || "unknown",
      services: tags.join(", "),
      types: tags,
    };
  });
}

router.get("/provider-layers/my-clinics", async (req: Request, res: Response) => {
  if (!isPersistenceConfigured()) {
    res.json({
      providers: [], count: 0, loaded: 0, total: 0, source: "my-clinics",
      page: 1, limit: 0, hasMore: false, all: false, storage: "none", visibleCapped: false,
    });
    return;
  }

  try {
    const all = req.query.all === "true";
    const limit = Math.min(Math.max(Number(req.query.limit) || 2000, 1), MAX_PAGE_SIZE);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const north = parseOptionalNumber(req.query.north);
    const south = parseOptionalNumber(req.query.south);
    const east = parseOptionalNumber(req.query.east);
    const west = parseOptionalNumber(req.query.west);
    const useBounds = req.query.useBounds === "true" || req.query.bounds === "true";
    const bounds = useBounds && north !== null && south !== null && east !== null && west !== null
      ? { north, south, east, west }
      : null;
    const clinicType = typeof req.query.clinic_type === "string"
      ? req.query.clinic_type
      : typeof req.query.provider_type === "string"
        ? req.query.provider_type
        : "";

    const params: Array<string | number> = [];
    const conditions = [
      "pm.active=true",
      "pm.lat IS NOT NULL",
      "pm.lng IS NOT NULL",
      "pm.lat BETWEEN -90 AND 90",
      "pm.lng BETWEEN -180 AND 180",
      "(pm.lat <> 0 OR pm.lng <> 0)",
      `EXISTS (
        SELECT 1
        FROM public.provider_master_sources pms_check
        INNER JOIN public.provider_source_catalog psc_check ON psc_check.source_key=pms_check.source_key
        WHERE pms_check.master_provider_id=pm.id AND psc_check.source_kind='user_upload'
      )`,
    ];
    if (bounds) {
      conditions.push(`pm.lat BETWEEN ${addParam(params, bounds.south)} AND ${addParam(params, bounds.north)}`);
      conditions.push(bounds.west <= bounds.east
        ? `pm.lng BETWEEN ${addParam(params, bounds.west)} AND ${addParam(params, bounds.east)}`
        : `(pm.lng >= ${addParam(params, bounds.west)} OR pm.lng <= ${addParam(params, bounds.east)})`);
    }
    if (clinicType) {
      const placeholder = addParam(params, clinicType);
      conditions.push(`(
        pm.primary_provider_type=${placeholder}
        OR array_to_string(COALESCE(pm.capability_tags,ARRAY[]::text[]),',') ILIKE '%' || ${placeholder} || '%'
      )`);
    }
    const whereSql = conditions.join(" AND ");

    const countResult = await getPool().query(
      `SELECT count(*)::int AS total
       FROM public.provider_master pm
       WHERE ${whereSql}`,
      params,
    );
    const uploadTotal = Number(countResult.rows[0]?.total || 0);
    const candidateTotal = await countSavedCandidates(bounds, clinicType);
    const total = uploadTotal + candidateTotal;
    const requestLimit = all ? MAX_ALL_ROWS : limit;
    const offset = all ? 0 : (page - 1) * limit;
    const uploadOffset = Math.min(offset, uploadTotal);
    const uploadLimit = Math.max(Math.min(requestLimit, uploadTotal - uploadOffset), 0);
    const candidateOffset = Math.max(offset - uploadTotal, 0);
    const candidateLimit = Math.max(requestLimit - uploadLimit, 0);
    const providers: LayerProvider[] = [];

    if (uploadLimit > 0) {
      const dataParams = [...params];
      const limitPlaceholder = addParam(dataParams, uploadLimit);
      const offsetPlaceholder = addParam(dataParams, uploadOffset);
      const result = await getPool().query(
        `SELECT pm.*, upload_source.source_key AS uploaded_source_key,
                upload_source.display_name AS source_display_name,
                upload_source.trust_tier AS source_trust_tier
         FROM public.provider_master pm
         INNER JOIN LATERAL (
           SELECT pms.source_key, psc.display_name, psc.trust_tier
           FROM public.provider_master_sources pms
           INNER JOIN public.provider_source_catalog psc ON psc.source_key=pms.source_key
           WHERE pms.master_provider_id=pm.id AND psc.source_kind='user_upload'
           ORDER BY pms.updated_at DESC, pms.created_at DESC, pms.id DESC
           LIMIT 1
         ) upload_source ON true
         WHERE ${whereSql}
         ORDER BY pm.name ASC, pm.id ASC
         LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
        dataParams,
      );
      providers.push(...result.rows.map((row: Record<string, unknown>) => {
        const providerType = String(row.primary_provider_type || "unknown");
        const tags = Array.isArray(row.capability_tags) ? row.capability_tags.map(String) : [providerType];
        return {
          clinic_name: row.name,
          name: row.name,
          address_1: row.formatted_address || row.address_line1,
          city: row.city,
          state: row.state_region,
          zip: row.postal_code,
          phone: row.phone,
          website: row.website,
          lat: Number(row.lat),
          lng: Number(row.lng),
          npi: row.npi,
          source_id: row.master_key || row.id,
          source_type: "user_upload",
          data_source: row.source_display_name,
          source: row.source_display_name,
          source_key: row.uploaded_source_key,
          trust_tier: row.source_trust_tier || "verified",
          confidence_score: row.quality_score == null ? null : Number(row.quality_score),
          category: providerType,
          clinic_type: providerType,
          providerType,
          taxonomy_description: providerType,
          services: tags.join(", "),
          types: tags,
        };
      }));
    }

    providers.push(...await loadSavedCandidates(bounds, clinicType, candidateLimit, candidateOffset));

    const deduped = new Map<string, LayerProvider>();
    for (const provider of providers) {
      const key = providerIdentity(provider);
      if (!deduped.has(key)) deduped.set(key, provider);
    }
    const pageProviders = [...deduped.values()];
    const visibleCapped = all && total > MAX_ALL_ROWS;

    res.json({
      providers: pageProviders,
      count: pageProviders.length,
      loaded: pageProviders.length,
      total,
      source: "my-clinics",
      page: all ? 1 : page,
      limit: all ? pageProviders.length : limit,
      hasMore: all ? visibleCapped : offset + requestLimit < total,
      all,
      storage: "provider_master_user_uploads",
      visibleCapped,
    });
  } catch (error) {
    console.error("[ProviderDatasetUploads] layer query failed:", error);
    res.status(503).json({
      providers: [],
      count: 0,
      loaded: 0,
      total: 0,
      source: "my-clinics",
      page: 1,
      limit: 0,
      hasMore: false,
      all: false,
      storage: "none",
      warning: "Uploaded dataset layer query unavailable",
      transientFailure: true,
      visibleCapped: false,
    });
  }
});

export default router;

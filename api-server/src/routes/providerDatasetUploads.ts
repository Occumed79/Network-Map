import { createHash } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { getPool, type PoolClient } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { hasValidCoordinates, parseOptionalNumber } from "../lib/providerCoordinates";
import { isUsableProviderName, normalizedProviderName, providerQualityReasons } from "../lib/providerDataQuality";

const router = Router();
const MAX_ROWS_PER_REQUEST = 5000;
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

type LayerProvider = Record<string, unknown> & {
  name?: string;
  clinic_name?: string;
  lat?: number;
  lng?: number;
  source_id?: string | null;
};

type Bounds = { north: number; south: number; east: number; west: number };

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function asBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "1";
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
  if (/lab|toxicology|drug|urine|screen|specimen|collection|mro/.test(blob)) add("lab");
  if (/dental|dentist|orthodont|periodont|endodont|dd\s*2813/.test(blob)) add("dental");
  if (/x[- ]?ray|imaging|radiology|mammogram|ultrasound|mri|ct\b|b[- ]?read/.test(blob)) add("imaging");
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
  const countryCode = (first(row, "countryCode", "country_code", "country") || "US").toUpperCase().slice(0, 3);
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
  const qualityReasons = providerQualityReasons({ name, address, lat, lng });
  const providedQuality = parseOptionalNumber(first(row, "qualityScore", "quality_score"));
  const qualityScore = providedQuality ?? (hasValidCoordinates(lat, lng) && isUsableProviderName(name) ? 0.95 : 0.35);

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
    lat: row.lat,
    lng: row.lng,
  })}`;
}

function isBulkDatasetUpload(req: Request): boolean {
  const filename = text(req.body?.filename || req.body?.originalFilename);
  return Boolean(req.body?.sourceLabel || req.body?.datasetLabel || /\.(csv|xlsx?|xls)$/i.test(filename));
}

async function upsertMasterSource(client: PoolClient, input: {
  sourceKey: string;
  masterProviderId: string;
  stageRecordId: string;
  rawRecordId: string;
  sourceRecordId: string;
  sourceUrl: string | null;
  qualityScore: number;
  raw: IncomingRow;
}) {
  const existing = await client.query(
    `SELECT id FROM public.provider_master_sources
     WHERE source_key=$1 AND source_record_id=$2
     ORDER BY created_at ASC LIMIT 1`,
    [input.sourceKey, input.sourceRecordId],
  );
  if (existing.rows[0]?.id) {
    await client.query(
      `UPDATE public.provider_master_sources
       SET master_provider_id=$2, stage_record_id=$3, raw_record_id=$4,
           source_url=COALESCE($5, source_url),
           source_confidence_score=GREATEST(COALESCE(source_confidence_score,0),$6),
           raw_payload=$7::jsonb, updated_at=now()
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
    [input.masterProviderId, input.stageRecordId, input.rawRecordId, input.sourceKey, input.sourceRecordId, input.sourceUrl, input.qualityScore, JSON.stringify(input.raw)],
  );
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
    res.status(413).json({ error: `Too many rows in one request. Send ${MAX_ROWS_PER_REQUEST} or fewer rows per chunk.`, maxRows: MAX_ROWS_PER_REQUEST });
    return;
  }

  const dryRun = asBoolean(req.body?.dryRun) || asBoolean(req.query.dryRun);
  const mirrorLegacy = req.body?.mirrorLegacy === undefined ? true : asBoolean(req.body?.mirrorLegacy);
  const originalFilename = text(req.body?.filename || req.body?.originalFilename) || "front-end-upload";
  const sourceLabel = normalizeSourceLabel(req.body?.sourceLabel || req.body?.datasetLabel || req.body?.groupName || req.body?.uploadLabel, originalFilename);
  const sourceKey = sourceKeyForLabel(sourceLabel);
  const uploadLabel = text(req.body?.uploadLabel || req.body?.groupName) || sourceLabel;
  const uploadedBy = text(req.body?.uploadedBy) || null;
  const client = await getPool().connect();

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
      [sourceKey, uploadLabel, dryRun ? "dry_run" : "front_end_upload", originalFilename, uploadedBy, rows.length, JSON.stringify({ frontend: true, dryRun, mirrorLegacy, sourceLabel, sourceKey })],
    );
    const batchId = batch.rows[0].id as string;

    for (let index = 0; index < rows.length; index += 1) {
      const normalized = normalizeRow(rows[index] || {}, index);
      const fatalReasons = normalized.qualityReasons.filter((reason) => reason === "blank_name" || reason === "placeholder_name");
      const rowError = fatalReasons.length ? fatalReasons.join(",") : null;
      const raw = await client.query(
        `INSERT INTO public.provider_raw_records (
           batch_id, source_key, source_record_id, file_row_number, content_hash,
           raw_payload, raw_text, status, error_message
         ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)
         RETURNING id`,
        [batchId, sourceKey, normalized.sourceRecordId, normalized.fileRowNumber, contentHash(normalized.raw), JSON.stringify(normalized.raw), JSON.stringify(normalized.raw), rowError ? "error" : "raw_loaded", rowError],
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
           lat, lng, phone, email, website, npi, taxonomy_code, taxonomy_description,
           primary_provider_type, capability_tags, confidence_score, normalization_status,
           normalized_payload
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25::jsonb
         ) RETURNING id`,
        [raw.rows[0].id, batchId, sourceKey, normalized.sourceRecordId, normalized.name, normalized.normalizedName, normalized.address, normalized.address, normalized.city, normalized.state, normalized.postalCode, normalized.countryCode, normalized.lat, normalized.lng, normalized.phone || null, normalized.email || null, normalized.website || null, normalized.npi || null, normalized.taxonomyCode || null, normalized.taxonomyDescription || null, normalized.primaryProviderType, normalized.capabilityTags, normalized.qualityScore, coordinatesReady ? "staged" : "needs_geocode", JSON.stringify(normalized)],
      );
      stagedRows += 1;
      if (!coordinatesReady) {
        needsGeocodeRows += 1;
        rowErrors.push({ row: normalized.fileRowNumber, reasons: ["needs_geocode"] });
        continue;
      }

      const masterKey = masterKeyFor(normalized);
      const existingMaster = await client.query("SELECT id FROM public.provider_master WHERE master_key=$1 LIMIT 1", [masterKey]);
      if (existingMaster.rows.length) duplicateMasterRows += 1;
      const master = await client.query(
        `INSERT INTO public.provider_master (
           master_key, name, normalized_name, address_line1, formatted_address, city,
           state_region, postal_code, country_code, lat, lng, phone, email, website, npi,
           primary_provider_type, capability_tags, primary_source_key, quality_score,
           last_seen_at, updated_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,now(),now()
         ) ON CONFLICT (master_key) DO UPDATE SET
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
             SELECT DISTINCT value FROM unnest(provider_master.capability_tags || EXCLUDED.capability_tags) value
             WHERE value IS NOT NULL AND value <> ''
           ),
           primary_source_key=EXCLUDED.primary_source_key,
           quality_score=GREATEST(COALESCE(provider_master.quality_score,0),COALESCE(EXCLUDED.quality_score,0)),
           active=true,
           last_seen_at=now(),
           updated_at=now()
         RETURNING id`,
        [masterKey, normalized.name, normalized.normalizedName, normalized.address, normalized.address, normalized.city, normalized.state, normalized.postalCode, normalized.countryCode, normalized.lat, normalized.lng, normalized.phone || null, normalized.email || null, normalized.website || null, normalized.npi || null, normalized.primaryProviderType, normalized.capabilityTags, sourceKey, normalized.qualityScore],
      );
      masteredRows += 1;
      const masterProviderId = master.rows[0].id as string;

      await upsertMasterSource(client, {
        sourceKey,
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
           ON CONFLICT (master_provider_id,type_key) DO UPDATE SET
             source_key=EXCLUDED.source_key,
             confidence_score=GREATEST(COALESCE(provider_master_types.confidence_score,0),COALESCE(EXCLUDED.confidence_score,0))`,
          [masterProviderId, providerType, sourceKey, normalized.qualityScore],
        );
      }

      if (mirrorLegacy) {
        const legacySourceId = `${sourceKey}:${masterKey}`;
        await client.query(
          `INSERT INTO public.medical_providers (
             place_id, name, formatted_address, lat, lng, types, category, phone, website,
             country_code, locality, administrative_area_level_1, postal_code, data_source,
             source_id, source_type, confidence_score, raw_data, scraped_at, updated_at
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'user_upload',$16,$17::jsonb,now(),now()
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
             data_source=EXCLUDED.data_source,
             source_type=EXCLUDED.source_type,
             confidence_score=EXCLUDED.confidence_score,
             raw_data=EXCLUDED.raw_data,
             updated_at=now()`,
          [legacySourceId, normalized.name, normalized.address, normalized.lat, normalized.lng, normalized.capabilityTags, normalized.primaryProviderType, normalized.phone || null, normalized.website || null, normalized.countryCode, normalized.city, normalized.state, normalized.postalCode, sourceLabel, legacySourceId, normalized.qualityScore, JSON.stringify({ ...normalized.raw, provider_master_id: masterProviderId, source_key: sourceKey, source_label: sourceLabel, upload_label: uploadLabel })],
        );
        mirroredRows += 1;
      }
    }

    await client.query(
      `UPDATE public.provider_ingest_batches
       SET status=$2, raw_rows=$3, staged_rows=$4, mastered_rows=$5, error_rows=$6,
           completed_at=now(), updated_at=now(), metadata=metadata || $7::jsonb
       WHERE id=$1`,
      [batchId, errorRows ? "completed_with_errors" : "completed", rawRows, stagedRows, masteredRows, errorRows, JSON.stringify({ dryRun, mirrorLegacy, needsGeocodeRows, duplicateMasterRows, sourceLabel, sourceKey })],
    );

    if (dryRun) await client.query("ROLLBACK");
    else await client.query("COMMIT");

    res.status(dryRun ? 200 : 201).json({
      batchId: dryRun ? null : batchId,
      sourceKey,
      sourceLabel,
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
        : `Uploaded ${masteredRows} mapped rows as "${sourceLabel}".`,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    res.status(500).json({ error: error instanceof Error ? error.message : "Provider dataset upload failed" });
  } finally {
    client.release();
  }
});

function addParam(params: Array<string | number>, value: string | number): string {
  params.push(value);
  return `$${params.length}`;
}

function providerIdentity(provider: LayerProvider): string {
  const name = String(provider.name || provider.clinic_name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const lat = Number(provider.lat);
  const lng = Number(provider.lng);
  if (name && Number.isFinite(lat) && Number.isFinite(lng)) return `${name}|${lat.toFixed(5)}|${lng.toFixed(5)}`;
  return String(provider.source_id || `${name}|${provider.city || ""}|${provider.state || ""}`);
}

async function relationExists(relation: string): Promise<boolean> {
  const result = await getPool().query("SELECT to_regclass($1) IS NOT NULL AS ok", [`public.${relation}`]);
  return result.rows[0]?.ok === true;
}

async function loadSavedCandidates(bounds: Bounds | null, clinicType: string): Promise<LayerProvider[]> {
  if (!(await relationExists("provider_candidates"))) return [];
  const params: Array<string | number> = [];
  const conditions = [
    "status='saved'",
    "lat IS NOT NULL",
    "lng IS NOT NULL",
    "lat BETWEEN -90 AND 90",
    "lng BETWEEN -180 AND 180",
    "(lat <> 0 OR lng <> 0)",
  ];
  if (bounds) {
    conditions.push(`lat BETWEEN ${addParam(params, bounds.south)} AND ${addParam(params, bounds.north)}`);
    conditions.push(bounds.west <= bounds.east
      ? `lng BETWEEN ${addParam(params, bounds.west)} AND ${addParam(params, bounds.east)}`
      : `(lng >= ${addParam(params, bounds.west)} OR lng <= ${addParam(params, bounds.east)})`);
  }
  if (clinicType) {
    const placeholder = addParam(params, clinicType);
    conditions.push(`(clinic_type=${placeholder} OR array_to_string(services,',') ILIKE '%' || ${placeholder} || '%')`);
  }
  const result = await getPool().query(
    `SELECT id::text, name, address, city, admin_area, postal_code, lat, lng, phone, website,
            source_url, trust_tier, confidence_score, clinic_type, services, categories
     FROM public.provider_candidates
     WHERE ${conditions.join(" AND ")}
     ORDER BY name ASC`,
    params,
  );
  return result.rows.map((row: Record<string, unknown>) => {
    const tags = [...new Set([...(Array.isArray(row.services) ? row.services : []), ...(Array.isArray(row.categories) ? row.categories : [])].map(String))];
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
    res.json({ providers: [], count: 0, loaded: 0, total: 0, source: "my-clinics", page: 1, limit: 0, hasMore: false, all: false, storage: "none", visibleCapped: false });
    return;
  }
  try {
    const all = req.query.all === "true";
    const limit = Math.min(Math.max(Number(req.query.limit) || 2000, 1), 5000);
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
      "psc.source_kind='user_upload'",
      "pm.lat IS NOT NULL",
      "pm.lng IS NOT NULL",
      "pm.lat BETWEEN -90 AND 90",
      "pm.lng BETWEEN -180 AND 180",
      "(pm.lat <> 0 OR pm.lng <> 0)",
    ];
    if (bounds) {
      conditions.push(`pm.lat BETWEEN ${addParam(params, bounds.south)} AND ${addParam(params, bounds.north)}`);
      conditions.push(bounds.west <= bounds.east
        ? `pm.lng BETWEEN ${addParam(params, bounds.west)} AND ${addParam(params, bounds.east)}`
        : `(pm.lng >= ${addParam(params, bounds.west)} OR pm.lng <= ${addParam(params, bounds.east)})`);
    }
    if (clinicType) {
      const placeholder = addParam(params, clinicType);
      conditions.push(`(pm.primary_provider_type=${placeholder} OR array_to_string(COALESCE(pm.capability_tags,ARRAY[]::text[]),',') ILIKE '%' || ${placeholder} || '%')`);
    }
    const whereSql = conditions.join(" AND ");
    const countResult = await getPool().query(
      `SELECT count(*)::int AS total
       FROM public.provider_master pm
       INNER JOIN public.provider_source_catalog psc ON psc.source_key=pm.primary_source_key
       WHERE ${whereSql}`,
      params,
    );
    const uploadTotal = Number(countResult.rows[0]?.total || 0);
    const savedCandidates = await loadSavedCandidates(bounds, clinicType);
    const total = uploadTotal + savedCandidates.length;
    const offset = (page - 1) * limit;
    const uploadOffset = Math.min(offset, uploadTotal);
    const uploadLimit = all ? uploadTotal : Math.max(Math.min(limit, uploadTotal - uploadOffset), 0);
    const providers: LayerProvider[] = [];

    if (uploadLimit > 0) {
      const dataParams = [...params, uploadLimit, uploadOffset];
      const result = await getPool().query(
        `SELECT pm.*, psc.display_name AS source_display_name, psc.trust_tier AS source_trust_tier
         FROM public.provider_master pm
         INNER JOIN public.provider_source_catalog psc ON psc.source_key=pm.primary_source_key
         WHERE ${whereSql}
         ORDER BY pm.name ASC, pm.id ASC
         LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
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
          source_key: row.primary_source_key,
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

    if (all) {
      providers.push(...savedCandidates);
    } else if (providers.length < limit) {
      const candidateOffset = Math.max(offset - uploadTotal, 0);
      providers.push(...savedCandidates.slice(candidateOffset, candidateOffset + (limit - providers.length)));
    }

    const deduped = new Map<string, LayerProvider>();
    for (const provider of providers) {
      const key = providerIdentity(provider);
      if (!deduped.has(key)) deduped.set(key, provider);
    }
    const pageProviders = [...deduped.values()];
    res.json({
      providers: pageProviders,
      count: pageProviders.length,
      loaded: pageProviders.length,
      total,
      source: "my-clinics",
      page: all ? 1 : page,
      limit: all ? pageProviders.length : limit,
      hasMore: all ? false : offset + pageProviders.length < total,
      all,
      storage: "provider_master_user_uploads",
      visibleCapped: false,
    });
  } catch (error) {
    const warning = error instanceof Error ? error.message : "Uploaded dataset layer query failed";
    console.error("[ProviderDatasetUploads] layer query failed:", error);
    res.status(503).json({ providers: [], count: 0, loaded: 0, total: 0, source: "my-clinics", warning, transientFailure: true, visibleCapped: false });
  }
});

export default router;

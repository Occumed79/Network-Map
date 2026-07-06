import { Router, type Request, type Response } from "express";
import crypto from "node:crypto";
import { getPool } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";

const router = Router();
const SOURCE_KEY = "my_clinics_upload";
const MAX_ROWS = 5000;

type AnyRow = Record<string, unknown>;
type ProviderType = "urgent_care" | "dot_provider" | "faa_provider" | "lab" | "general_practitioner" | "occupational_health_clinic" | "dental" | "imaging" | "pharmacy_vaccination" | "hospital" | "specialist" | "unknown";

type NormalizedClinic = {
  sourceRecordId: string; name: string; normalizedName: string; address: string | null; city: string | null; adminArea: string | null; postalCode: string | null; country: string | null;
  lat: number | null; lng: number | null; phone: string | null; website: string | null; notes: string | null; npi: string | null; taxonomy: string | null;
  primaryProviderType: ProviderType; capabilityTags: ProviderType[]; normalizationStatus: "ready" | "needs_geocode" | "error"; masterKey: string | null; qualityScore: number;
};

function normalizeKey(key: string) { return key.toLowerCase().replace(/[\s_-]/g, ""); }
function pick(row: AnyRow, keys: string[]) { const wanted = new Set(keys.map(normalizeKey)); const found = Object.keys(row).find((key) => wanted.has(normalizeKey(key))); const value = found ? row[found] : undefined; return value == null ? "" : String(value).trim(); }
function nullable(value: string) { return value ? value : null; }
function numberOrNull(value: string) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function validLatLng(lat: number | null, lng: number | null) { return lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0); }
function normalizedName(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function deterministicId(value: string) { return crypto.createHash("sha256").update(value).digest("hex").slice(0, 32); }
function validNpi(value: string | null) { return value && /^\d{10}$/.test(value) ? value : null; }

function classifyProviderType(row: AnyRow, name: string): { primary: ProviderType; tags: ProviderType[] } {
  const text = [name, pick(row, ["providerType", "clinicType", "category", "type", "services", "capabilities", "tags", "taxonomy", "taxonomy_description", "taxonomy_code", "notes", "description"])]
    .join(" ").toLowerCase();
  const tags: ProviderType[] = [];
  const add = (type: ProviderType, re: RegExp) => { if (re.test(text) && !tags.includes(type)) tags.push(type); };
  add("urgent_care", /urgent|walk[-\s]?in/);
  add("occupational_health_clinic", /occupational|occ\s*med|employee health|workers? comp|fit for duty|\bffd\b/);
  add("dot_provider", /\bdot\b|\bcdl\b|medical examiner/);
  add("faa_provider", /\bfaa\b|\bame\b|aviation medical/);
  add("lab", /\blab\b|toxicology|drug screen|specimen collection/);
  add("dental", /dental|dentist|dd2813|dd 2813/);
  add("imaging", /x[-\s]?ray|imaging|radiology|mammogram|ultrasound|\bmri\b|ct scan|b[-\s]?read/);
  add("pharmacy_vaccination", /pharmacy|vaccine|vaccination|immunization|travel medicine/);
  add("hospital", /hospital|medical center|\ber\b/);
  add("general_practitioner", /family medicine|internal medicine|primary care|general practice/);
  add("specialist", /cardiology|pulmonary|orthopedics|neurology|specialist/);
  return { primary: tags[0] || "unknown", tags: tags.length ? tags : ["unknown"] };
}

function normalizeClinicRow(row: AnyRow, rowNumber: number): NormalizedClinic {
  const name = pick(row, ["name", "providerName", "clinicName", "practiceName", "facility", "facilityName"]) || "Unnamed clinic";
  const address = nullable(pick(row, ["address", "formattedAddress", "streetAddress", "street", "address1", "address_1"]));
  const city = nullable(pick(row, ["city", "town", "locality"]));
  const adminArea = nullable(pick(row, ["state", "st", "region", "province", "admin_area"]));
  const postalCode = nullable(pick(row, ["zip", "zipcode", "postalCode", "postal_code"]));
  const country = nullable(pick(row, ["country", "countryCode", "country_code"])) || "US";
  const lat = numberOrNull(pick(row, ["lat", "latitude"]));
  const lng = numberOrNull(pick(row, ["lng", "lon", "long", "longitude"]));
  const phone = nullable(pick(row, ["phone", "telephone", "tel"]));
  const website = nullable(pick(row, ["website", "url"]));
  const notes = nullable(pick(row, ["notes", "description"]));
  const npi = validNpi(pick(row, ["npi", "npi_number"]).replace(/\D/g, ""));
  const taxonomy = nullable(pick(row, ["taxonomy", "taxonomy_description", "taxonomy_code"]));
  const type = classifyProviderType(row, name);
  const hasCoords = validLatLng(lat, lng);
  const locationKey = [normalizedName(name), address, city, adminArea, postalCode, country].filter(Boolean).join("|");
  return {
    sourceRecordId: npi ? `npi:${npi}` : `my-clinics:${deterministicId(`${rowNumber}|${locationKey || JSON.stringify(row)}`)}`,
    name, normalizedName: normalizedName(name), address, city, adminArea, postalCode, country, lat: hasCoords ? lat : null, lng: hasCoords ? lng : null,
    phone, website, notes, npi, taxonomy, primaryProviderType: type.primary, capabilityTags: type.tags, normalizationStatus: hasCoords ? "ready" : "needs_geocode",
    masterKey: hasCoords ? (npi ? `npi:${npi}` : `loc:${deterministicId(locationKey)}`) : null, qualityScore: hasCoords ? 0.82 : 0.45,
  };
}

async function tableColumns(client: any, table: string): Promise<Set<string>> {
  const { rows } = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`, [table]);
  return new Set(rows.map((row: { column_name: string }) => row.column_name));
}
async function insertDynamic(client: any, table: string, columns: Set<string>, values: Record<string, unknown>, returning = "id") {
  const names = Object.keys(values).filter((key) => columns.has(key));
  if (!names.length) throw new Error(`No compatible columns for ${table}`);
  const params = names.map((name) => values[name]);
  const placeholders = names.map((_, index) => `$${index + 1}`);
  const { rows } = await client.query(`INSERT INTO ${table} (${names.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING ${returning}`, params);
  return rows[0];
}
async function upsertMaster(client: any, columns: Set<string>, clinic: NormalizedClinic) {
  if (!clinic.masterKey) return null;
  const values: Record<string, unknown> = {
    master_key: clinic.masterKey, name: clinic.name, normalized_name: clinic.normalizedName, address: clinic.address, city: clinic.city, admin_area: clinic.adminArea, state: clinic.adminArea,
    postal_code: clinic.postalCode, country: clinic.country, lat: clinic.lat, lng: clinic.lng, phone: clinic.phone, website: clinic.website, npi: clinic.npi,
    primary_provider_type: clinic.primaryProviderType, capability_tags: clinic.capabilityTags, quality_score: clinic.qualityScore, updated_at: new Date(), last_seen_at: new Date(), source_key: SOURCE_KEY,
  };
  const names = Object.keys(values).filter((key) => columns.has(key));
  const params = names.map((name) => values[name]);
  const updates = names.filter((name) => !["master_key", "created_at"].includes(name)).map((name) => name === "quality_score" ? `${name}=GREATEST(provider_master.${name}, EXCLUDED.${name})` : `${name}=EXCLUDED.${name}`);
  const placeholders = names.map((_, index) => `$${index + 1}`);
  const { rows } = await client.query(`INSERT INTO provider_master (${names.join(", ")}) VALUES (${placeholders.join(", ")}) ON CONFLICT (master_key) DO UPDATE SET ${updates.join(", ")} RETURNING id`, params);
  return rows[0]?.id as string | undefined;
}

async function mirrorMedicalProvider(client: any, clinic: NormalizedClinic) {
  if (!clinic.masterKey || !validLatLng(clinic.lat, clinic.lng)) return;
  const params = [clinic.masterKey, clinic.name, clinic.address, clinic.city, clinic.adminArea, clinic.postalCode, clinic.country, clinic.lat, clinic.lng, clinic.phone, clinic.website, clinic.primaryProviderType, clinic.capabilityTags, JSON.stringify(clinic), clinic.qualityScore];
  const update = await client.query(`UPDATE medical_providers SET name=$2, formatted_address=$3, locality=$4, administrative_area_level_1=$5, postal_code=$6, country_code=$7, lat=$8, lng=$9, phone=$10, website=$11, category=$12, types=$13, raw_data=$14, confidence_score=GREATEST(COALESCE(confidence_score, 0), $15), updated_at=now() WHERE source_id=$1`, params);
  if (update.rowCount > 0) return;
  await client.query(`
    INSERT INTO medical_providers (source_id, source_type, data_source, name, formatted_address, locality, administrative_area_level_1, postal_code, country_code, lat, lng, phone, website, category, types, raw_data, confidence_score, created_at, updated_at)
    VALUES ($1,'user_upload','My Clinics',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now(),now())
  `, params);
}

router.post("/my-clinics/upload", async (req: Request, res: Response) => {
  if (!isPersistenceConfigured()) { res.status(503).json({ error: "My Clinics upload requires database persistence." }); return; }
  const groupName = typeof req.body?.groupName === "string" && req.body.groupName.trim() ? req.body.groupName.trim() : "My Clinics Upload";
  const filename = typeof req.body?.filename === "string" ? req.body.filename : "upload";
  const rows = Array.isArray(req.body?.rows) ? req.body.rows as AnyRow[] : [];
  if (!rows.length) { res.status(400).json({ error: "rows must be a non-empty array" }); return; }
  if (rows.length > MAX_ROWS) { res.status(413).json({ error: `Upload contains ${rows.length} rows; maximum per request is ${MAX_ROWS}. Please upload in chunks.` }); return; }

  const pool = getPool(); const client = await pool.connect();
  const summary = { rawRows: rows.length, stagedRows: 0, masteredRows: 0, errorRows: 0, needsGeocodeRows: 0 };
  try {
    await client.query("BEGIN");
    const [batchCols, rawCols, stageCols, masterCols, sourceCols, typeCols] = await Promise.all([
      tableColumns(client, "provider_ingest_batches"), tableColumns(client, "provider_raw_records"), tableColumns(client, "provider_stage_records"), tableColumns(client, "provider_master"), tableColumns(client, "provider_master_sources"), tableColumns(client, "provider_master_types"),
    ]);
    for (const [table, cols] of Object.entries({ provider_ingest_batches: batchCols, provider_raw_records: rawCols, provider_stage_records: stageCols, provider_master: masterCols, provider_master_sources: sourceCols, provider_master_types: typeCols })) {
      if (!cols.size) throw new Error(`${table} is not available`);
    }
    const batch = await insertDynamic(client, "provider_ingest_batches", batchCols, { source_key: SOURCE_KEY, source_label: "My Clinics", group_name: groupName, filename, status: "processing", raw_row_count: rows.length, created_at: new Date(), updated_at: new Date() });
    for (let index = 0; index < rows.length; index++) {
      const rawPayload = rows[index] || {}; const clinic = normalizeClinicRow(rawPayload, index + 1);
      const raw = await insertDynamic(client, "provider_raw_records", rawCols, { ingest_batch_id: batch.id, batch_id: batch.id, source_key: SOURCE_KEY, source_record_id: clinic.sourceRecordId, row_number: index + 1, raw_payload: JSON.stringify(rawPayload), created_at: new Date() });
      await insertDynamic(client, "provider_stage_records", stageCols, { ingest_batch_id: batch.id, batch_id: batch.id, raw_record_id: raw.id, source_key: SOURCE_KEY, source_record_id: clinic.sourceRecordId, name: clinic.name, normalized_name: clinic.normalizedName, address: clinic.address, city: clinic.city, admin_area: clinic.adminArea, state: clinic.adminArea, postal_code: clinic.postalCode, country: clinic.country, lat: clinic.lat, lng: clinic.lng, phone: clinic.phone, website: clinic.website, npi: clinic.npi, taxonomy: clinic.taxonomy, primary_provider_type: clinic.primaryProviderType, capability_tags: clinic.capabilityTags, normalization_status: clinic.normalizationStatus, raw_payload: JSON.stringify(rawPayload), created_at: new Date(), updated_at: new Date() });
      summary.stagedRows++;
      if (clinic.normalizationStatus === "needs_geocode") { summary.needsGeocodeRows++; continue; }
      const masterId = await upsertMaster(client, masterCols, clinic);
      if (!masterId) { summary.errorRows++; continue; }
      summary.masteredRows++;
      await insertDynamic(client, "provider_master_sources", sourceCols, { provider_master_id: masterId, master_id: masterId, source_key: SOURCE_KEY, source_record_id: clinic.sourceRecordId, ingest_batch_id: batch.id, batch_id: batch.id, raw_record_id: raw.id, source_payload: JSON.stringify(rawPayload), first_seen_at: new Date(), last_seen_at: new Date(), created_at: new Date(), updated_at: new Date() }).catch(() => undefined);
      for (const providerType of new Set([clinic.primaryProviderType, ...clinic.capabilityTags])) {
        await insertDynamic(client, "provider_master_types", typeCols, { provider_master_id: masterId, master_id: masterId, provider_type_key: providerType, provider_type: providerType, type_key: providerType, source_key: SOURCE_KEY, created_at: new Date(), updated_at: new Date() }).catch(() => undefined);
      }
      await mirrorMedicalProvider(client, clinic).catch(() => undefined);
    }
    if (batchCols.has("status")) await client.query("UPDATE provider_ingest_batches SET status='completed', staged_row_count=$2, mastered_row_count=$3, error_row_count=$4, needs_geocode_row_count=$5, updated_at=now() WHERE id=$1", [batch.id, summary.stagedRows, summary.masteredRows, summary.errorRows, summary.needsGeocodeRows]).catch(() => undefined);
    await client.query("COMMIT");
    res.status(201).json({ batchId: batch.id, groupName, filename, ...summary });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    res.status(500).json({ error: error instanceof Error ? error.message : "My Clinics upload failed" });
  } finally { client.release(); }
});

export default router;

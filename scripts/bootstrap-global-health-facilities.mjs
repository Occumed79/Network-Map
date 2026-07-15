#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = path.resolve("data/generated/global-health-facilities");
const SOURCE_KEY = "healthsites_osm";
const CHUNK_SIZE = Math.max(25, Number(process.env.SQL_CHUNK_SIZE || 150));
const DEFAULT_COUNTRIES = "AF,AL,DZ,AD,AO,AG,AR,AM,AU,AT,AZ";
const COUNTRY_CODES = String(process.env.COUNTRY_CODES || DEFAULT_COUNTRIES)
  .split(",")
  .map((value) => value.trim().toUpperCase())
  .filter((value) => /^[A-Z]{2}$/.test(value));
const HEALTHSITES_API_KEY = String(process.env.HEALTHSITES_API_KEY || "").trim();
const MAX_HEALTHSITES_PAGES = Math.max(1, Number(process.env.MAX_HEALTHSITES_PAGES || 500));
const OVERPASS_ENDPOINTS = String(
  process.env.OVERPASS_ENDPOINTS ||
    "https://overpass-api.de/api/interpreter,https://overpass.kumi.systems/api/interpreter",
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const text = (value) => (value === null || value === undefined ? "" : String(value).trim());
const hash = (value) => createHash("sha256").update(String(value)).digest("hex");

function sqlString(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value ?? {}))}::jsonb`;
}

function sqlArray(values) {
  const cleaned = [...new Set((values || []).map(text).filter(Boolean))];
  return `ARRAY[${cleaned.map(sqlString).join(", ")}]::text[]`;
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedName(value) {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function first(tags, ...keys) {
  for (const key of keys) {
    const value = text(tags?.[key]);
    if (value) return value;
  }
  return "";
}

function classify(tags) {
  const amenity = text(tags?.amenity).toLowerCase();
  const healthcare = text(tags?.healthcare).toLowerCase();
  const speciality = text(tags?.["healthcare:speciality"]).toLowerCase();
  const blob = `${amenity} ${healthcare} ${speciality} ${text(tags?.name)}`.toLowerCase();
  const capabilities = new Set();
  let primary = "unknown";

  const add = (type) => {
    capabilities.add(type);
    if (primary === "unknown") primary = type;
  };

  if (/dentist|dental|orthodont/.test(blob)) add("dental");
  if (/pharmacy|vaccin|immuni[sz]/.test(blob)) add("pharmacy_vaccination");
  if (/laboratory|diagnostic|pathology|blood.?bank/.test(blob)) add("lab");
  if (/hospital|emergency/.test(blob)) add("hospital");
  if (/radiolog|imaging|x.?ray|mri|ultrasound|mammograph|ct.?scan/.test(blob)) add("imaging");
  if (/occupational|employee.?health|workplace.?health/.test(blob)) add("occupational_health_clinic");
  if (/doctor|clinic|physician|general.?practice|primary.?care|health.?centre|health.?center/.test(blob)) add("general_practitioner");
  if (/cardio|pulmon|ortho|neuro|specialist|speciality/.test(blob)) add("specialist");
  if (!capabilities.size) capabilities.add("unknown");

  return { primary, capabilities: [...capabilities] };
}

function addressFromTags(tags) {
  const house = first(tags, "addr:housenumber");
  const street = first(tags, "addr:street", "addr:place");
  const line1 = [house, street].filter(Boolean).join(" ");
  const city = first(tags, "addr:city", "addr:town", "addr:village", "addr:municipality");
  const state = first(tags, "addr:state", "addr:province", "addr:region");
  const postal = first(tags, "addr:postcode");
  const formatted = [line1, city, state, postal].filter(Boolean).join(", ");
  return { line1, city, state, postal, formatted };
}

function normalizeRecord({ sourceRecordId, sourceUrl, countryCode, lat, lng, tags, rawPayload }) {
  const latitude = numberOrNull(lat);
  const longitude = numberOrNull(lng);
  if (latitude === null || longitude === null || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  const name = first(tags, "name", "official_name", "brand", "operator", "short_name");
  if (!name || /^(nan|null|undefined|unknown|n\/?a)$/iu.test(name)) return null;

  const address = addressFromTags(tags);
  const classification = classify(tags);
  const phone = first(tags, "contact:phone", "phone", "telephone");
  const website = first(tags, "contact:website", "website", "url");
  const email = first(tags, "contact:email", "email");
  const normalized = normalizedName(name);
  const masterKey = `loc:${hash(JSON.stringify({
    name: normalized,
    address: address.formatted.toLowerCase(),
    country: countryCode,
    lat: Number(latitude.toFixed(6)),
    lng: Number(longitude.toFixed(6)),
  }))}`;
  const qualityScore = address.formatted ? 0.86 : 0.78;

  return {
    source_record_id: sourceRecordId,
    source_url: sourceUrl,
    raw_payload: rawPayload,
    content_hash: hash(JSON.stringify(rawPayload)),
    name,
    normalized_name: normalized,
    address_line1: address.line1,
    formatted_address: address.formatted,
    city: address.city,
    state_region: address.state,
    postal_code: address.postal,
    country_code: countryCode,
    lat: latitude,
    lng: longitude,
    phone,
    website,
    email,
    primary_provider_type: classification.primary,
    capability_tags: classification.capabilities,
    quality_score: qualityScore,
    master_key: masterKey,
  };
}

async function fetchJson(url, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180_000);
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Accept: "application/json",
          "User-Agent": "Occu-Med-Network-Map/1.0 global-health-facility-import",
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 5) await sleep(attempt * 4000);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function healthsitesTags(feature) {
  const properties = feature?.properties || {};
  const tags = properties?.tags && typeof properties.tags === "object" ? properties.tags : properties;
  return { ...tags };
}

async function fetchHealthsitesCountry(countryCode) {
  const records = [];
  let page = 1;
  let next = true;
  while (next && page <= MAX_HEALTHSITES_PAGES) {
    const url = new URL("https://healthsites.io/api/v3/facilities/");
    url.searchParams.set("api-key", HEALTHSITES_API_KEY);
    url.searchParams.set("country", countryCode);
    url.searchParams.set("page", String(page));
    url.searchParams.set("flat-properties", "true");
    url.searchParams.set("output", "geojson");
    const payload = await fetchJson(url.toString());
    const features = Array.isArray(payload?.features) ? payload.features : Array.isArray(payload?.results) ? payload.results : [];
    for (const feature of features) {
      const coordinates = feature?.geometry?.coordinates || [];
      const tags = healthsitesTags(feature);
      const osmType = first(tags, "osm_type", "osmType") || "feature";
      const osmId = first(tags, "osm_id", "osmId", "id", "uuid") || hash(JSON.stringify(feature)).slice(0, 24);
      const normalized = normalizeRecord({
        sourceRecordId: `healthsites:${osmType}:${osmId}`,
        sourceUrl: `https://healthsites.io/map#!/locality/${osmType}/${osmId}`,
        countryCode,
        lat: coordinates?.[1] ?? tags?.lat ?? tags?.latitude,
        lng: coordinates?.[0] ?? tags?.lon ?? tags?.lng ?? tags?.longitude,
        tags,
        rawPayload: { provider: "healthsites", feature },
      });
      if (normalized) records.push(normalized);
    }
    next = Boolean(payload?.next) && features.length > 0;
    page += 1;
    if (next) await sleep(500);
  }
  return records;
}

function overpassQuery(countryCode) {
  return `[out:json][timeout:240];\narea["ISO3166-1"="${countryCode}"][admin_level=2]->.country;\n(\n  nwr["amenity"~"^(hospital|clinic|doctors|dentist|pharmacy)$"](area.country);\n  nwr["healthcare"](area.country);\n);\nout center tags;`;
}

async function fetchOverpassCountry(countryCode) {
  let lastError;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const payload = await fetchJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ data: overpassQuery(countryCode) }).toString(),
      });
      const records = [];
      for (const element of Array.isArray(payload?.elements) ? payload.elements : []) {
        const tags = element?.tags || {};
        const lat = element?.lat ?? element?.center?.lat;
        const lng = element?.lon ?? element?.center?.lon;
        const normalized = normalizeRecord({
          sourceRecordId: `osm:${element?.type || "element"}:${element?.id}`,
          sourceUrl: `https://www.openstreetmap.org/${element?.type || "node"}/${element?.id}`,
          countryCode,
          lat,
          lng,
          tags,
          rawPayload: { provider: "openstreetmap", element },
        });
        if (normalized) records.push(normalized);
      }
      return records;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function tuple(row) {
  return `(${[
    sqlString(row.source_record_id),
    sqlString(row.source_url),
    sqlJson(row.raw_payload),
    sqlString(row.content_hash),
    sqlString(row.name),
    sqlString(row.normalized_name),
    sqlString(row.address_line1),
    sqlString(row.formatted_address),
    sqlString(row.city),
    sqlString(row.state_region),
    sqlString(row.postal_code),
    sqlString(row.country_code),
    row.lat,
    row.lng,
    sqlString(row.phone),
    sqlString(row.website),
    sqlString(row.email),
    sqlString(row.primary_provider_type),
    sqlArray(row.capability_tags),
    row.quality_score,
    sqlString(row.master_key),
  ].join(", ")})`;
}

function makeSql(rows) {
  return `BEGIN;
CREATE TEMP TABLE tmp_global_health_facilities (
  source_record_id text NOT NULL,
  source_url text,
  raw_payload jsonb NOT NULL,
  content_hash text,
  name text NOT NULL,
  normalized_name text,
  address_line1 text,
  formatted_address text,
  city text,
  state_region text,
  postal_code text,
  country_code text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  phone text,
  website text,
  email text,
  primary_provider_type text,
  capability_tags text[] NOT NULL,
  quality_score numeric,
  master_key text NOT NULL
) ON COMMIT DROP;
INSERT INTO tmp_global_health_facilities VALUES
${rows.map(tuple).join(",\n")};

INSERT INTO public.provider_source_catalog (source_key, display_name, source_kind, trust_tier, active, notes)
VALUES ('${SOURCE_KEY}', 'Healthsites / OpenStreetMap health facilities', 'open_data', 'directory', true, 'International health-facility locations; backend ingestion only')
ON CONFLICT (source_key) DO UPDATE SET display_name=EXCLUDED.display_name, source_kind=EXCLUDED.source_kind, trust_tier=EXCLUDED.trust_tier, active=true, notes=EXCLUDED.notes, updated_at=now();

INSERT INTO public.provider_raw_records (source_key, source_record_id, content_hash, raw_payload, raw_text, status)
SELECT '${SOURCE_KEY}', t.source_record_id, t.content_hash, t.raw_payload, t.raw_payload::text, 'raw_loaded'
FROM tmp_global_health_facilities t
WHERE NOT EXISTS (
  SELECT 1 FROM public.provider_raw_records r
  WHERE r.source_key='${SOURCE_KEY}' AND r.source_record_id=t.source_record_id
);

INSERT INTO public.provider_stage_records (
  raw_record_id, source_key, source_record_id, name, normalized_name, address_line1,
  formatted_address, city, state_region, postal_code, country_code, lat, lng, phone,
  website, email, primary_provider_type, capability_tags, confidence_score,
  normalization_status, normalized_payload
)
SELECT r.id, '${SOURCE_KEY}', t.source_record_id, t.name, t.normalized_name, t.address_line1,
       t.formatted_address, t.city, t.state_region, t.postal_code, t.country_code,
       t.lat, t.lng, t.phone, t.website, t.email, t.primary_provider_type,
       t.capability_tags, t.quality_score, 'staged', t.raw_payload
FROM tmp_global_health_facilities t
JOIN LATERAL (
  SELECT id FROM public.provider_raw_records r
  WHERE r.source_key='${SOURCE_KEY}' AND r.source_record_id=t.source_record_id
  ORDER BY r.created_at ASC LIMIT 1
) r ON true
WHERE NOT EXISTS (
  SELECT 1 FROM public.provider_stage_records s
  WHERE s.source_key='${SOURCE_KEY}' AND s.source_record_id=t.source_record_id
);

INSERT INTO public.provider_master (
  master_key, name, normalized_name, address_line1, formatted_address, city,
  state_region, postal_code, country_code, lat, lng, phone, website, email,
  primary_provider_type, capability_tags, primary_source_key, quality_score,
  active, last_seen_at, updated_at
)
SELECT master_key, name, normalized_name, address_line1, formatted_address, city,
       state_region, postal_code, country_code, lat, lng, phone, website, email,
       primary_provider_type, capability_tags, '${SOURCE_KEY}', quality_score,
       true, now(), now()
FROM tmp_global_health_facilities
ON CONFLICT (master_key) DO UPDATE SET
  name=EXCLUDED.name,
  normalized_name=EXCLUDED.normalized_name,
  address_line1=COALESCE(NULLIF(EXCLUDED.address_line1,''), provider_master.address_line1),
  formatted_address=COALESCE(NULLIF(EXCLUDED.formatted_address,''), provider_master.formatted_address),
  city=COALESCE(NULLIF(EXCLUDED.city,''), provider_master.city),
  state_region=COALESCE(NULLIF(EXCLUDED.state_region,''), provider_master.state_region),
  postal_code=COALESCE(NULLIF(EXCLUDED.postal_code,''), provider_master.postal_code),
  country_code=EXCLUDED.country_code,
  lat=EXCLUDED.lat,
  lng=EXCLUDED.lng,
  phone=COALESCE(NULLIF(EXCLUDED.phone,''), provider_master.phone),
  website=COALESCE(NULLIF(EXCLUDED.website,''), provider_master.website),
  email=COALESCE(NULLIF(EXCLUDED.email,''), provider_master.email),
  primary_provider_type=CASE WHEN provider_master.primary_provider_type IS NULL OR provider_master.primary_provider_type='unknown' THEN EXCLUDED.primary_provider_type ELSE provider_master.primary_provider_type END,
  capability_tags=ARRAY(SELECT DISTINCT value FROM unnest(provider_master.capability_tags || EXCLUDED.capability_tags) value WHERE value IS NOT NULL AND value<>''),
  primary_source_key=COALESCE(provider_master.primary_source_key, EXCLUDED.primary_source_key),
  quality_score=GREATEST(COALESCE(provider_master.quality_score,0), COALESCE(EXCLUDED.quality_score,0)),
  active=true,
  last_seen_at=now(),
  updated_at=now();

INSERT INTO public.provider_master_sources (
  master_provider_id, stage_record_id, raw_record_id, source_key, source_record_id,
  source_url, source_confidence_score, raw_payload
)
SELECT pm.id, s.id, r.id, '${SOURCE_KEY}', t.source_record_id, t.source_url,
       t.quality_score, t.raw_payload
FROM tmp_global_health_facilities t
JOIN public.provider_master pm ON pm.master_key=t.master_key
LEFT JOIN LATERAL (
  SELECT id FROM public.provider_raw_records r
  WHERE r.source_key='${SOURCE_KEY}' AND r.source_record_id=t.source_record_id
  ORDER BY r.created_at ASC LIMIT 1
) r ON true
LEFT JOIN LATERAL (
  SELECT id FROM public.provider_stage_records s
  WHERE s.source_key='${SOURCE_KEY}' AND s.source_record_id=t.source_record_id
  ORDER BY s.created_at ASC LIMIT 1
) s ON true
ON CONFLICT (master_provider_id, source_key, (COALESCE(source_record_id, ''))) DO UPDATE SET
  stage_record_id=EXCLUDED.stage_record_id,
  raw_record_id=EXCLUDED.raw_record_id,
  source_url=EXCLUDED.source_url,
  source_confidence_score=GREATEST(COALESCE(provider_master_sources.source_confidence_score,0), COALESCE(EXCLUDED.source_confidence_score,0)),
  raw_payload=EXCLUDED.raw_payload,
  updated_at=now();

INSERT INTO public.provider_master_types (master_provider_id, type_key, source_key, confidence_score)
SELECT DISTINCT pm.id, type_key, '${SOURCE_KEY}', t.quality_score
FROM tmp_global_health_facilities t
JOIN public.provider_master pm ON pm.master_key=t.master_key
CROSS JOIN LATERAL unnest(ARRAY[t.primary_provider_type] || t.capability_tags) type_key
WHERE type_key IS NOT NULL AND type_key<>''
  AND EXISTS (SELECT 1 FROM public.provider_type_catalog c WHERE c.type_key=type_key)
ON CONFLICT (master_provider_id, type_key) DO UPDATE SET
  source_key=EXCLUDED.source_key,
  confidence_score=GREATEST(COALESCE(provider_master_types.confidence_score,0), COALESCE(EXCLUDED.confidence_score,0));

INSERT INTO public.medical_providers (
  place_id, name, formatted_address, lat, lng, types, category, phone, website,
  country_code, locality, administrative_area_level_1, postal_code, data_source,
  source_id, source_type, confidence_score, raw_data, scraped_at, updated_at
)
SELECT '${SOURCE_KEY}:' || source_record_id, name, formatted_address, lat, lng,
       capability_tags, primary_provider_type, phone, website, country_code, city,
       state_region, postal_code, 'Healthsites / OpenStreetMap',
       '${SOURCE_KEY}:' || source_record_id, 'open_data', quality_score::double precision,
       raw_payload || jsonb_build_object('provider_master_key', master_key, 'source_key', '${SOURCE_KEY}'),
       now(), now()
FROM tmp_global_health_facilities
ON CONFLICT (source_id) DO UPDATE SET
  name=EXCLUDED.name,
  formatted_address=EXCLUDED.formatted_address,
  lat=EXCLUDED.lat,
  lng=EXCLUDED.lng,
  types=EXCLUDED.types,
  category=EXCLUDED.category,
  phone=COALESCE(EXCLUDED.phone, medical_providers.phone),
  website=COALESCE(EXCLUDED.website, medical_providers.website),
  country_code=EXCLUDED.country_code,
  locality=EXCLUDED.locality,
  administrative_area_level_1=EXCLUDED.administrative_area_level_1,
  postal_code=EXCLUDED.postal_code,
  confidence_score=GREATEST(COALESCE(medical_providers.confidence_score,0), COALESCE(EXCLUDED.confidence_score,0)),
  raw_data=EXCLUDED.raw_data,
  updated_at=now();
COMMIT;
`;
}

async function main() {
  if (!COUNTRY_CODES.length) throw new Error("COUNTRY_CODES must contain at least one ISO alpha-2 code");
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const retrievedAt = new Date().toISOString();
  const allRecords = [];
  const countryResults = {};
  const seen = new Set();

  for (const countryCode of COUNTRY_CODES) {
    const mode = HEALTHSITES_API_KEY ? "healthsites" : "openstreetmap-overpass";
    console.log(`Fetching ${countryCode} from ${mode}`);
    try {
      const records = HEALTHSITES_API_KEY
        ? await fetchHealthsitesCountry(countryCode)
        : await fetchOverpassCountry(countryCode);
      let accepted = 0;
      for (const record of records) {
        if (seen.has(record.source_record_id)) continue;
        seen.add(record.source_record_id);
        allRecords.push(record);
        accepted += 1;
      }
      countryResults[countryCode] = { mode, accepted, fetched: records.length };
    } catch (error) {
      countryResults[countryCode] = { mode, accepted: 0, fetched: 0, error: String(error?.message || error) };
    }
    await sleep(1500);
  }

  if (!allRecords.length) throw new Error(`No usable facilities were downloaded: ${JSON.stringify(countryResults)}`);
  allRecords.sort((a, b) => a.country_code.localeCompare(b.country_code) || a.name.localeCompare(b.name) || a.source_record_id.localeCompare(b.source_record_id));

  const sqlFiles = [];
  for (let offset = 0; offset < allRecords.length; offset += CHUNK_SIZE) {
    const rows = allRecords.slice(offset, offset + CHUNK_SIZE);
    const fileName = `global_health_facilities_${String(sqlFiles.length + 1).padStart(3, "0")}.sql`;
    await fs.writeFile(path.join(OUTPUT_DIR, fileName), makeSql(rows), "utf8");
    sqlFiles.push({ file: fileName, rows: rows.length });
  }

  const manifest = {
    generated_at: retrievedAt,
    source_number: 5,
    source: HEALTHSITES_API_KEY ? "Healthsites.io API v3" : "OpenStreetMap via Overpass API",
    source_key: SOURCE_KEY,
    countries_requested: COUNTRY_CODES,
    country_results: countryResults,
    total_rows: allRecords.length,
    destination_tables: [
      "public.provider_raw_records",
      "public.provider_stage_records",
      "public.provider_master",
      "public.provider_master_sources",
      "public.provider_master_types",
      "public.medical_providers",
    ],
    sql_files: sqlFiles,
    safeguards: [
      "Backend/Neon ingestion only; no frontend data bundle",
      "Valid coordinates required",
      "Blank and placeholder facility names excluded",
      "Source lineage retained",
      "Idempotent source-record and master-provider upserts",
      "Healthsites API used when HEALTHSITES_API_KEY is configured; OpenStreetMap Overpass otherwise",
    ],
  };
  await fs.writeFile(path.join(OUTPUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

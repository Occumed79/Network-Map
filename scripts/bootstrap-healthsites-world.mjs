#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = path.resolve("data/generated/global-health-facilities");
const SOURCE_KEY = "healthsites_osm";
const CHUNK_SIZE = Math.max(25, Number(process.env.SQL_CHUNK_SIZE || 500));
const HEALTHSITES_API_KEY = String(process.env.HEALTHSITES_API_KEY || "").trim();
const HEALTHSITES_API_URL = String(
  process.env.HEALTHSITES_API_URL || "https://healthsites.io/api/v3/facilities/",
).trim();
const HEALTHSITES_FIXTURE_DIR = String(process.env.HEALTHSITES_FIXTURE_DIR || "").trim();
const MAX_HEALTHSITES_PAGES = Math.max(1, Number(process.env.MAX_HEALTHSITES_PAGES || 5000));

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
  const speciality = first(tags, "healthcare:speciality", "speciality").toLowerCase();
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
  const house = first(tags, "addr:housenumber", "addr_housenumber");
  const street = first(tags, "addr:street", "addr_street", "addr:place");
  const line1 = [house, street].filter(Boolean).join(" ");
  const city = first(tags, "addr:city", "addr_city", "addr:town", "addr:village", "addr:municipality");
  const state = first(tags, "addr:state", "addr:province", "addr:region");
  const postal = first(tags, "addr:postcode", "addr_postcode");
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
  const phone = first(tags, "contact:phone", "contact_number", "phone", "telephone");
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
      if (!response.ok) {
        const responseText = (await response.text()).slice(0, 500);
        const safeUrl = new URL(url);
        if (safeUrl.searchParams.has("api-key")) safeUrl.searchParams.set("api-key", "REDACTED");
        throw new Error(`${response.status} ${response.statusText}: ${safeUrl.toString()} ${responseText}`);
      }
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

function countryCodeFromTags(tags) {
  const candidate = first(
    tags,
    "country_code",
    "country-code",
    "addr:country",
    "iso3166_1_alpha_2",
    "iso3166-1:alpha2",
    "administrative_code",
  ).toUpperCase();
  const match = candidate.match(/^([A-Z]{2})(?:[-_].*)?$/u);
  return match?.[1] || "XX";
}

async function fetchAllHealthsites() {
  const records = [];
  let page = 1;
  let pagesFetched = 0;
  let featuresFetched = 0;
  while (page <= MAX_HEALTHSITES_PAGES) {
    const url = new URL(HEALTHSITES_API_URL);
    url.searchParams.set("api-key", HEALTHSITES_API_KEY);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", "1000");
    url.searchParams.set("flat-properties", "true");
    url.searchParams.set("output", "geojson");
    const payload = HEALTHSITES_FIXTURE_DIR
      ? JSON.parse(await fs.readFile(path.join(HEALTHSITES_FIXTURE_DIR, `page-${page}.json`), "utf8"))
      : await fetchJson(url.toString());
    const features = Array.isArray(payload?.features)
      ? payload.features
      : Array.isArray(payload?.results)
        ? payload.results
        : Array.isArray(payload)
          ? payload
          : [];
    if (!features.length) break;
    pagesFetched += 1;
    featuresFetched += features.length;
    for (const feature of features) {
      const coordinates = feature?.geometry?.coordinates || [];
      const tags = healthsitesTags(feature);
      const countryCode = countryCodeFromTags(tags);
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
    console.log(`Healthsites page ${page}: ${features.length} features (${records.length} usable total)`);
    if (payload?.next === null) break;
    page += 1;
    await sleep(250);
  }
  if (page > MAX_HEALTHSITES_PAGES) throw new Error(`Healthsites exceeded ${MAX_HEALTHSITES_PAGES} pages`);
  return { records, pagesFetched, featuresFetched };
}

function tuple(row) {
  return `(${[
    sqlString(row.source_record_id),
    sqlString(row.source_url),
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
  return `INSERT INTO public.source5_import_staging (
  source_record_id, source_url, name, normalized_name, address_line1, formatted_address,
  city, state_region, postal_code, country_code, lat, lng, phone, website, email,
  primary_provider_type, capability_tags, quality_score, master_key
) VALUES
${rows.map(tuple).join(",\n")}
ON CONFLICT (source_record_id) DO UPDATE SET
  source_url=EXCLUDED.source_url, name=EXCLUDED.name, normalized_name=EXCLUDED.normalized_name,
  address_line1=EXCLUDED.address_line1, formatted_address=EXCLUDED.formatted_address,
  city=EXCLUDED.city, state_region=EXCLUDED.state_region, postal_code=EXCLUDED.postal_code,
  country_code=EXCLUDED.country_code, lat=EXCLUDED.lat, lng=EXCLUDED.lng, phone=EXCLUDED.phone,
  website=EXCLUDED.website, email=EXCLUDED.email, primary_provider_type=EXCLUDED.primary_provider_type,
  capability_tags=EXCLUDED.capability_tags, quality_score=EXCLUDED.quality_score,
  master_key=EXCLUDED.master_key;
`;
}

async function main() {
  if (!HEALTHSITES_API_KEY) throw new Error("HEALTHSITES_API_KEY is required; Overpass fallback is disabled");
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const retrievedAt = new Date().toISOString();
  const allRecords = [];
  const seen = new Set();

  console.log("Fetching all countries from Healthsites API v3");
  const { records, pagesFetched, featuresFetched } = await fetchAllHealthsites();
  for (const record of records) {
    if (seen.has(record.source_record_id)) continue;
    seen.add(record.source_record_id);
    allRecords.push(record);
  }

  if (!allRecords.length) throw new Error("No usable Healthsites facilities were downloaded");
  allRecords.sort((a, b) => a.country_code.localeCompare(b.country_code) || a.name.localeCompare(b.name) || a.source_record_id.localeCompare(b.source_record_id));

  const sqlFiles = [];
  for (let offset = 0; offset < allRecords.length; offset += CHUNK_SIZE) {
    const rows = allRecords.slice(offset, offset + CHUNK_SIZE);
    const fileName = `healthsites_world_${String(sqlFiles.length + 1).padStart(4, "0")}.sql`;
    await fs.writeFile(path.join(OUTPUT_DIR, fileName), makeSql(rows), "utf8");
    sqlFiles.push({ file: fileName, rows: rows.length });
  }

  const manifest = {
    generated_at: retrievedAt,
    source_number: 5,
    source: "Healthsites.io API v3",
    source_key: SOURCE_KEY,
    scope: "world",
    api_pages_fetched: pagesFetched,
    api_features_fetched: featuresFetched,
    country_codes_present: [...new Set(allRecords.map((row) => row.country_code).filter(Boolean))].sort(),
    total_rows: allRecords.length,
    distinct_master_keys: new Set(allRecords.map((row) => row.master_key)).size,
    coordinate_bounds: allRecords.reduce(
      (bounds, row) => ({
        min_lat: Math.min(bounds.min_lat, row.lat),
        max_lat: Math.max(bounds.max_lat, row.lat),
        min_lng: Math.min(bounds.min_lng, row.lng),
        max_lng: Math.max(bounds.max_lng, row.lng),
      }),
      { min_lat: 90, max_lat: -90, min_lng: 180, max_lng: -180 },
    ),
    geographic_quadrants: {
      north_west: allRecords.filter((row) => row.lat >= 0 && row.lng < 0).length,
      north_east: allRecords.filter((row) => row.lat >= 0 && row.lng >= 0).length,
      south_west: allRecords.filter((row) => row.lat < 0 && row.lng < 0).length,
      south_east: allRecords.filter((row) => row.lat < 0 && row.lng >= 0).length,
    },
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
      "Full-world staging is loaded before a single transactional production replacement",
      "Idempotent source-record and master-provider upserts",
    ],
  };
  await fs.writeFile(path.join(OUTPUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

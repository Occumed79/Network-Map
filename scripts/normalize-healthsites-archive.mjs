#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import readline from "node:readline";

const columns = [
  "source_record_id", "source_url", "name", "normalized_name", "address_line1",
  "formatted_address", "city", "state_region", "postal_code", "country_code",
  "lat", "lng", "phone", "website", "email", "primary_provider_type",
  "capability_tags", "quality_score", "master_key",
];

function argument(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? String(process.argv[index + 1] || "") : fallback;
}

const outputPath = argument("output");
const layerKind = argument("layer", "feature").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
if (!outputPath) throw new Error("--output is required");

const text = (value) => value === null || value === undefined ? "" : String(value).trim();
const hash = (value) => createHash("sha256").update(String(value)).digest("hex");

function first(tags, ...keys) {
  for (const key of keys) {
    const value = text(tags?.[key]);
    if (value) return value;
  }
  return "";
}

function normalizedName(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/gu, " ").trim().replace(/\s+/gu, " ");
}

function classify(tags) {
  const blob = [
    first(tags, "amenity"),
    first(tags, "healthcare"),
    first(tags, "healthcare:speciality", "healthcare_", "speciality"),
    first(tags, "name"),
  ].join(" ").toLowerCase();
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

function countryCode(tags) {
  const candidate = first(
    tags,
    "country_code", "country_cod", "countrycode", "country-code", "country", "iso2", "iso", "addr:country", "addr_country",
    "addr_count", "iso3166_1_", "iso3166_1_alpha_2", "iso3166-1:alpha2",
    "administrative_code", "administra",
  ).toUpperCase();
  return candidate.match(/^([A-Z]{2})(?:[-_].*)?$/u)?.[1] || "XX";
}

function address(tags) {
  const house = first(tags, "addr:housenumber", "addr_house", "addr_housenumber");
  const street = first(tags, "addr:street", "addr_stre", "addr_street", "addr:place");
  const line1 = [house, street].filter(Boolean).join(" ");
  const city = first(tags, "addr:city", "addr_city", "addr:town", "addr_town", "addr:village", "addr_villa", "addr:municipality");
  const state = first(tags, "addr:state", "addr_stat", "addr:province", "addr:region", "admin_area", "state", "province");
  const postal = first(tags, "addr:postcode", "addr_postc", "addr_postcode");
  const full = first(tags, "addr:full", "addr_full") || [line1, city, state, postal].filter(Boolean).join(", ");
  return { line1, city, state, postal, full };
}

function representativePoint(geometry) {
  if (!geometry || !Array.isArray(geometry.coordinates)) return null;
  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates;
    return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) ? [Number(lng), Number(lat)] : null;
  }
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;
  let found = false;
  const visit = (value) => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) {
      const lng = Number(value[0]);
      const lat = Number(value[1]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        found = true;
      }
      return;
    }
    for (const child of value) visit(child);
  };
  visit(geometry.coordinates);
  return found ? [(minLng + maxLng) / 2, (minLat + maxLat) / 2] : null;
}

function postgresArray(values) {
  return `{${values.map((value) => `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`).join(",")}}`;
}

function csvField(value) {
  if (value === null || value === undefined || value === "") return "\\N";
  const encoded = String(value).replace(/[\t\r\n]+/gu, " ").replaceAll('"', '""');
  return `"${encoded}"`;
}

function rowFromFeature(feature) {
  let nestedTags = feature?.properties?.tags;
  if (typeof nestedTags === "string") {
    try { nestedTags = JSON.parse(nestedTags); } catch { nestedTags = {}; }
  }
  const tags = { ...(feature?.properties || {}), ...(nestedTags && typeof nestedTags === "object" ? nestedTags : {}) };
  const point = representativePoint(feature?.geometry);
  if (!point) return null;
  const [lng, lat] = point;
  const name = first(tags, "name", "name_en", "facility_name", "facility_n", "official_name", "official_n", "brand", "operator", "short_name");
  if (!name || /^(nan|null|undefined|unknown|n\/?a)$/iu.test(name)) return null;

  const rawId = first(tags, "osm_id", "osmId", "@id", "id", "uuid", "node_id", "way_id") || hash(JSON.stringify(feature)).slice(0, 24);
  const sourceRecordId = `healthsites:${layerKind}:${rawId}`;
  const code = countryCode(tags);
  const location = address(tags);
  const classification = classify(tags);
  const normalized = normalizedName(name);
  const masterKey = `loc:${hash(JSON.stringify({
    name: normalized,
    address: location.full.toLowerCase(),
    country: code,
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  }))}`;

  return [
    sourceRecordId,
    `https://www.openstreetmap.org/${layerKind}/${rawId}`,
    name,
    normalized,
    location.line1,
    location.full,
    location.city,
    location.state,
    location.postal,
    code,
    lat,
    lng,
    first(tags, "contact:phone", "contact_ph", "contact_number", "phone", "telephone"),
    first(tags, "contact:website", "contact_we", "website", "url"),
    first(tags, "contact:email", "contact_em", "email"),
    classification.primary,
    postgresArray(classification.capabilities),
    location.full ? 0.86 : 0.78,
    masterKey,
  ];
}

const append = fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0;
const output = fs.createWriteStream(outputPath, { flags: append ? "a" : "w" });
if (!append) output.write(`${columns.join("\t")}\n`);

let inputRows = 0;
let outputRows = 0;
let rejectedRows = 0;
const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const rawLine of lines) {
  const line = rawLine.replace(/^\x1e/u, "").trim();
  if (!line) continue;
  inputRows += 1;
  try {
    const row = rowFromFeature(JSON.parse(line));
    if (!row) {
      rejectedRows += 1;
      continue;
    }
    if (!output.write(`${row.map(csvField).join("\t")}\n`)) {
      await new Promise((resolve) => output.once("drain", resolve));
    }
    outputRows += 1;
  } catch {
    rejectedRows += 1;
  }
}
await new Promise((resolve, reject) => output.end((error) => error ? reject(error) : resolve()));
console.log(JSON.stringify({ layer: layerKind, inputRows, outputRows, rejectedRows, outputPath }));

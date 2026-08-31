#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const RESOURCE_URL = "https://data.gov.ua/dataset/46fa40f9-875b-41ee-8d6f-be2cc3e40ace/resource/d98f7120-59fd-47f6-a5a5-e7f220bebc53/download/pmg_legal_entity_divisions_info.csv";
const DATASET_URL = "https://data.gov.ua/dataset/a1d554df-be4b-4d3f-8063-dd0db4d83ff5/resource/d98f7120-59fd-47f6-a5a5-e7f220bebc53";
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
if (!outputPath) throw new Error("--output is required");

const text = (value) => value === null || value === undefined ? "" : String(value).trim();
const hash = (value) => createHash("sha256").update(String(value)).digest("hex");

function normalizedName(value) {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ]+/giu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function numberValue(value) {
  const parsed = Number(text(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function validCoordinates(lat, lng) {
  return lat !== null && lng !== null && lat >= 43 && lat <= 53 && lng >= 21 && lng <= 41;
}

function parseCsv(raw) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    if (quoted) {
      if (char === '"') {
        if (raw[i + 1] === '"') { field += '"'; i += 1; }
        else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/u, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/u, "")); rows.push(row); }
  return rows;
}

function objectsFromCsv(raw) {
  const rows = parseCsv(raw.replace(/^\uFEFF/u, ""));
  if (!rows.length) return [];
  const headers = rows[0].map((value) => text(value));
  return rows.slice(1)
    .filter((row) => row.some((value) => text(value)))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function pick(row, names) {
  for (const name of names) {
    const value = text(row[name]);
    if (value) return value;
  }
  return "";
}

function parseLocation(row) {
  const explicitLat = numberValue(pick(row, ["latitude", "lat", "division_latitude", "location_latitude"]));
  const explicitLng = numberValue(pick(row, ["longitude", "lng", "lon", "division_longitude", "location_longitude"]));
  if (validCoordinates(explicitLat, explicitLng)) return { lat: explicitLat, lng: explicitLng };

  const raw = pick(row, ["location", "coordinates", "geo", "coordinate"]);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length >= 2) {
      const first = numberValue(parsed[0]);
      const second = numberValue(parsed[1]);
      if (validCoordinates(second, first)) return { lat: second, lng: first };
      if (validCoordinates(first, second)) return { lat: first, lng: second };
    }
    if (parsed && typeof parsed === "object") {
      const lat = numberValue(parsed.lat ?? parsed.latitude ?? parsed.y);
      const lng = numberValue(parsed.lng ?? parsed.lon ?? parsed.longitude ?? parsed.x);
      if (validCoordinates(lat, lng)) return { lat, lng };
      if (Array.isArray(parsed.coordinates) && parsed.coordinates.length >= 2) {
        const first = numberValue(parsed.coordinates[0]);
        const second = numberValue(parsed.coordinates[1]);
        if (validCoordinates(second, first)) return { lat: second, lng: first };
      }
    }
  } catch {
    // Continue with text coordinate formats.
  }

  const point = raw.match(/POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/iu);
  if (point) {
    const lng = numberValue(point[1]);
    const lat = numberValue(point[2]);
    if (validCoordinates(lat, lng)) return { lat, lng };
  }

  const pairs = [...raw.matchAll(/-?\d+(?:\.\d+)?/gu)].map((match) => numberValue(match[0])).filter((value) => value !== null);
  if (pairs.length >= 2) {
    if (validCoordinates(pairs[0], pairs[1])) return { lat: pairs[0], lng: pairs[1] };
    if (validCoordinates(pairs[1], pairs[0])) return { lat: pairs[1], lng: pairs[0] };
  }
  return null;
}

function classify(row) {
  const haystack = [pick(row, ["division_name"]), pick(row, ["division_type"]), pick(row, ["legal_entity_name"])]
    .join(" ")
    .toLowerCase();
  let primary = "healthcare_facility";
  if (/(стомат|дентал|dental)/u.test(haystack)) primary = "dental";
  else if (/(лаборатор|laborator|патолог)/u.test(haystack)) primary = "lab";
  else if (/(рентген|радіолог|radiolog|мрт|кт |узд|діагност)/u.test(haystack)) primary = "imaging";
  else if (/(лікарн|hospital|стаціонар|клінічн)/u.test(haystack)) primary = "hospital";
  else if (/(амбулатор|поліклінік|сімейн|primary|первинн)/u.test(haystack)) primary = "general_practitioner";
  else if (/(центр|диспансер|клінік|медичн)/u.test(haystack)) primary = "specialist";
  return { primary, tags: primary === "healthcare_facility" ? ["healthcare_facility"] : [primary, "healthcare_facility"] };
}

function postgresArray(values) {
  return `{${[...new Set(values.filter(Boolean))].map((value) => `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`).join(",")}}`;
}

function csvField(value) {
  if (value === null || value === undefined || value === "") return "\\N";
  const encoded = String(value).replace(/[\t\r\n]+/gu, " ").replaceAll('"', '""');
  return `"${encoded}"`;
}

const response = await fetch(RESOURCE_URL, {
  headers: { accept: "text/csv,*/*", "user-agent": "Occu-Med-Network-Map/1.0" },
  redirect: "follow",
  signal: AbortSignal.timeout(180_000),
});
if (!response.ok) throw new Error(`Ukraine NHSU download failed: HTTP ${response.status} ${response.statusText}`);
const raw = await response.text();
const objects = objectsFromCsv(raw);
if (!objects.length) throw new Error("Ukraine NHSU CSV contained no data rows");

const output = new Map();
let rejectedCoordinates = 0;
for (const row of objects) {
  const divisionId = pick(row, ["division_id", "division_uuid", "id"]);
  const name = pick(row, ["division_name", "name"]);
  if (!divisionId || !name) continue;
  const coordinates = parseLocation(row);
  if (!coordinates) { rejectedCoordinates += 1; continue; }

  const address1 = pick(row, ["residence_street", "address", "division_address"]);
  const building = pick(row, ["residence_building", "building"]);
  const city = pick(row, ["residence_city", "city", "settlement"]);
  const region = pick(row, ["residence_area", "region", "oblast"]);
  const postal = pick(row, ["residence_postal_code", "postal_code", "zip"]);
  const line1 = [address1, building].filter(Boolean).join(" ");
  const formatted = [line1, city, region, postal, "Ukraine"].filter(Boolean).join(", ");
  const classification = classify(row);
  const normalized = normalizedName(name);
  const masterKey = `loc:${hash(JSON.stringify({
    name: normalized,
    address: formatted.toLowerCase(),
    country: "UA",
    lat: Number(coordinates.lat.toFixed(6)),
    lng: Number(coordinates.lng.toFixed(6)),
  }))}`;

  output.set(`ua-nhsu:${divisionId}`, [
    `ua-nhsu:${divisionId}`,
    DATASET_URL,
    name,
    normalized,
    line1,
    formatted,
    city,
    region,
    postal,
    "UA",
    coordinates.lat,
    coordinates.lng,
    pick(row, ["division_phone", "phone"]),
    pick(row, ["division_url", "website", "url"]),
    pick(row, ["division_email", "email"]),
    classification.primary,
    postgresArray([...classification.tags, "nhsu_pmg_contracted", "active_service_location"]),
    0.99,
    masterKey,
  ]);
}

const sorted = [...output.values()].sort((a, b) => String(a[2]).localeCompare(String(b[2])) || String(a[0]).localeCompare(String(b[0])));
if (!sorted.length) throw new Error("Ukraine NHSU normalization produced zero geocoded active service locations");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${[columns.join("\t"), ...sorted.map((row) => row.map(csvField).join("\t"))].join("\n")}\n`, "utf8");
console.log(JSON.stringify({ source: "ua_nhsu_pmg", scanned: objects.length, rejectedCoordinates, geocodedFacilities: sorted.length, outputPath }));

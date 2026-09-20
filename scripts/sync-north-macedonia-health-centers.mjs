#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SOURCE_URL = "https://zdravstvo.gov.mk/en-GB/ustanovi/adresi-na-zd";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Occu-Med-Network-Map/1.0 (+https://github.com/Occumed79/Network-Map)";
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
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalized(value) {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04ff]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function decodeHtml(value) {
  return text(value)
    .replace(/&nbsp;|&#160;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;|&apos;/giu, "'")
    .replace(/&#(\d+);/gu, (_, code) => String.fromCodePoint(Number(code)));
}

function cellText(value) {
  return decodeHtml(value)
    .replace(/<br\s*\/?>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function parseTables(html) {
  const rows = [];
  for (const tableMatch of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/giu)) {
    for (const rowMatch of tableMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/giu)) {
      const cells = [...rowMatch[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/giu)].map((match) => cellText(match[1]));
      if (cells.length >= 2) rows.push(cells);
    }
  }
  return rows;
}

function isHeader(cells) {
  const joined = normalized(cells.join(" "));
  return /(health center.*address|health organization.*address|telephone.*fax|email)/u.test(joined);
}

function classify(name) {
  const value = normalized(name);
  let primary = "general_practitioner";
  if (/(sports medicine|спортска медицина|sports)/u.test(value)) primary = "specialist";
  else if (/(mental health|ментал)/u.test(value)) primary = "specialist";
  else if (/(workers|работниц|occupational|work protection)/u.test(value)) primary = "occupational_health_clinic";
  else if (/(institute|институт)/u.test(value)) primary = "specialist";
  const tags = [primary, "healthcare_facility", "north_macedonia_moh_health_center"];
  return { primary, tags };
}

function validCoordinates(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 40.8 && lat <= 42.4 && lng >= 20.3 && lng <= 23.1;
}

async function geocode(name, address) {
  const queries = [
    [name, address, "North Macedonia"].filter(Boolean).join(", "),
    [address, "North Macedonia"].filter(Boolean).join(", "),
    [name, "North Macedonia"].filter(Boolean).join(", "),
  ];
  for (const query of queries) {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "mk");
    url.searchParams.set("q", query);
    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT, "accept-language": "mk,en" },
      signal: AbortSignal.timeout(45_000),
    });
    if (response.status === 429) { await sleep(3000); continue; }
    if (!response.ok) continue;
    const payload = await response.json();
    const item = payload?.[0];
    const lat = Number(item?.lat);
    const lng = Number(item?.lon);
    if (!validCoordinates(lat, lng)) continue;
    const a = item?.address || {};
    return {
      lat,
      lng,
      city: text(a.city) || text(a.town) || text(a.village) || text(a.municipality),
      postal: text(a.postcode),
      address1: text(a.road) || text(a.pedestrian) || address,
    };
  }
  return null;
}

function postgresArray(values) {
  return `{${[...new Set(values.filter(Boolean))].map((value) => `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`).join(",")}}`;
}
function csvField(value) {
  if (value === null || value === undefined || value === "") return "\\N";
  const encoded = String(value).replace(/[\t\r\n]+/gu, " ").replaceAll('"', '""');
  return `"${encoded}"`;
}

const response = await fetch(SOURCE_URL, {
  headers: { "user-agent": USER_AGENT, accept: "text/html" },
  signal: AbortSignal.timeout(60_000),
});
if (!response.ok) throw new Error(`North Macedonia Ministry health-center page HTTP ${response.status}`);
const html = await response.text();
const tableRows = parseTables(html).filter((cells) => !isHeader(cells));
const candidates = new Map();

for (const cells of tableRows) {
  const nameRaw = text(cells[0]);
  const address = text(cells[1]);
  if (!nameRaw || !address || nameRaw.length > 180) continue;
  if (/^(health center|polyclinic|emergency medical care|institute|health station)/iu.test(nameRaw)) {
    const phone = text(cells[2]);
    const email = text(cells[4]) || text(cells.find((cell) => /@/u.test(cell)));
    candidates.set(`${normalized(nameRaw)}|${normalized(address)}`, { name: nameRaw, address, phone, email });
    continue;
  }
  // The first Ministry table uses city names as the health-center name.
  if (cells.length >= 4 && /@zdravstvo\.gov\.mk$/iu.test(text(cells[4] || cells[cells.length - 1]))) {
    const displayName = /^health/i.test(nameRaw) ? nameRaw : `Health Center ${nameRaw}`;
    const phone = text(cells[2]);
    const email = text(cells[4]) || text(cells[cells.length - 1]);
    candidates.set(`${normalized(displayName)}|${normalized(address)}`, { name: displayName, address, phone, email });
  }
}

if (candidates.size < 25) throw new Error(`Only ${candidates.size} North Macedonia Ministry health-center candidates parsed; refusing sync`);

const rows = [];
let lastGeocodeAt = 0;
let skipped = 0;
for (const candidate of candidates.values()) {
  const wait = 1100 - (Date.now() - lastGeocodeAt);
  if (wait > 0) await sleep(wait);
  const geo = await geocode(candidate.name, candidate.address);
  lastGeocodeAt = Date.now();
  if (!geo) { skipped += 1; continue; }
  const classification = classify(candidate.name);
  const sourceId = `mk-moh:${hash(`${normalized(candidate.name)}|${normalized(candidate.address)}`).slice(0, 22)}`;
  const formatted = [candidate.address, geo.city, "North Macedonia"].filter(Boolean).join(", ");
  const masterKey = `loc:${hash(JSON.stringify({
    name: normalized(candidate.name), address: formatted.toLowerCase(), country: "MK",
    lat: Number(geo.lat.toFixed(6)), lng: Number(geo.lng.toFixed(6)),
  }))}`;
  rows.push([
    sourceId, SOURCE_URL, candidate.name, normalized(candidate.name), candidate.address, formatted,
    geo.city, "", geo.postal, "MK", geo.lat, geo.lng, candidate.phone, "", candidate.email,
    classification.primary, postgresArray(classification.tags), 0.98, masterKey,
  ]);
}

if (rows.length < 20) throw new Error(`Only ${rows.length} North Macedonia health centers were map-renderable; refusing output`);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${[columns.join("\t"), ...rows.sort((a, b) => String(a[2]).localeCompare(String(b[2]))).map((row) => row.map(csvField).join("\t"))].join("\n")}\n`, "utf8");
console.log(JSON.stringify({ source: "mk_moh_health_centers", parsedCandidates: candidates.size, mapRows: rows.length, skippedUnplaced: skipped, outputPath }));

#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SOURCES = [
  {
    key: "direct",
    url: "https://admin.opendata.az/dataset/516934d5-0b5d-4263-959c-84701f859825/resource/d23858f2-2158-47e6-9a31-9ac03e55c069/download/tbib-tabeli-tibb-muessiselerinin-siyahs.csv",
    page: "https://opendata.az/en/@tibbi-erazi-bolmelerini-idareetme-birliyi/tebib-tabeli-tibb-muessiseleri",
  },
  {
    key: "subordinate",
    url: "https://admin.opendata.az/dataset/6dfb0cb6-0c4c-4b49-84a2-13b2c53c8149/resource/6e19decb-75c4-41d2-818a-03425672b8a7/download/tbib-tabeli-tibb-muessiselerinin-alt-tibb-muessiselerinin-siyahs.csv",
    page: "https://opendata.az/@tibbi-erazi-bolmelerini-idareetme-birliyi/tibb-muessiseleri-ve-alt-muessiseler",
  },
];
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
const existingPath = argument("existing");
if (!outputPath) throw new Error("--output is required");

const text = (value) => value === null || value === undefined ? "" : String(value).trim();
const hash = (value) => createHash("sha256").update(String(value)).digest("hex");

function normalizedKey(value) {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replaceAll("ə", "e").replaceAll("Ə", "E")
    .replaceAll("ı", "i").replaceAll("İ", "I")
    .replaceAll("ş", "s").replaceAll("Ş", "S")
    .replaceAll("ç", "c").replaceAll("Ç", "C")
    .replaceAll("ğ", "g").replaceAll("Ğ", "G")
    .replaceAll("ö", "o").replaceAll("Ö", "O")
    .replaceAll("ü", "u").replaceAll("Ü", "U")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function validCoordinates(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 38.2 && lat <= 42.1 && lng >= 44.4 && lng <= 51.1;
}

function detectDelimiter(raw) {
  const line = raw.replace(/^\uFEFF/u, "").split(/\r?\n/u).find((value) => value.trim()) || "";
  const candidates = [",", ";", "\t"];
  return candidates.sort((a, b) => line.split(b).length - line.split(a).length)[0];
}

function parseDelimited(raw) {
  raw = raw.replace(/^\uFEFF/u, "");
  const delimiter = detectDelimiter(raw);
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (quoted) {
      if (char === '"') {
        if (raw[index + 1] === '"') { field += '"'; index += 1; }
        else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/u, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/u, "")); rows.push(row); }
  return rows;
}

function rowsToObjects(rows) {
  const scored = rows.slice(0, 25).map((row, index) => {
    const joined = row.map(normalizedKey).join(" | ");
    const signals = ["muessise", "unvan", "rayon", "seher", "ad", "tibb", "kod", "tip", "nov"];
    return { index, score: signals.reduce((sum, signal) => sum + (joined.includes(signal) ? 1 : 0), 0), populated: row.filter((value) => text(value)).length };
  }).filter((item) => item.populated >= 2).sort((a, b) => b.score - a.score || b.populated - a.populated);
  if (!scored.length || scored[0].score < 1) throw new Error("Azerbaijan CSV header row could not be identified");
  const headerIndex = scored[0].index;
  const headers = rows[headerIndex].map((value, index) => normalizedKey(value) || `column ${index}`);
  return rows.slice(headerIndex + 1)
    .filter((row) => row.some((value) => text(value)))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function pick(row, exact = [], contains = []) {
  for (const key of exact) {
    const value = text(row[normalizedKey(key)]);
    if (value) return value;
  }
  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizedKey(key);
    if (contains.some((token) => normalized.includes(token)) && text(value)) return text(value);
  }
  return "";
}

function likelyName(row) {
  const direct = pick(row,
    ["tibb muessisesinin adi", "muessisenin adi", "tibb muessisesi", "muessise adi", "ad"],
    ["muessisenin adi", "muessise adi", "tibb muessise", "alt tibb muessise"],
  );
  if (direct) return direct;
  const candidates = Object.entries(row)
    .filter(([key, value]) => text(value).length >= 4 && !/(unvan|rayon|seher|telefon|email|kod|id|sira|no)/u.test(normalizedKey(key)))
    .map(([, value]) => text(value))
    .sort((a, b) => b.length - a.length);
  return candidates[0] || "";
}

function classify(name, type, parent) {
  const value = normalizedKey(`${name} ${type} ${parent}`);
  let primary = "healthcare_facility";
  if (/(stomat|dental|dis klin)/u.test(value)) primary = "dental";
  else if (/(laborator|patolog|biokim)/u.test(value)) primary = "lab";
  else if (/(radiolog|diaqnost|diagnost|mrt|rentgen|ultras|tomograf)/u.test(value)) primary = "imaging";
  else if (/(xestexana|hospital|kliniki merkez|klinik merkez)/u.test(value)) primary = "hospital";
  else if (/(poliklin|ambulator|aile saglamliq|aile hekim|ilkin tibbi|saglamliq merkezi)/u.test(value)) primary = "general_practitioner";
  else if (/(kardiolog|nevrolog|psixiatr|ortoped|ginekolog|oftalmolog|ixtisas)/u.test(value)) primary = "specialist";
  const tags = primary === "healthcare_facility" ? ["healthcare_facility", "azerbaijan_tabib"] : [primary, "healthcare_facility", "azerbaijan_tabib"];
  return { primary, tags };
}

function loadExisting(filePath) {
  const result = new Map();
  if (!filePath || !fs.existsSync(filePath)) return result;
  const rows = parseDelimited(fs.readFileSync(filePath, "utf8"));
  if (!rows.length) return result;
  const headers = rows[0].map(normalizedKey);
  const sourceIndex = headers.indexOf("source record id");
  const latIndex = headers.indexOf("lat");
  const lngIndex = headers.indexOf("lng");
  for (const row of rows.slice(1)) {
    const sourceId = text(row[sourceIndex]);
    const lat = Number(row[latIndex]);
    const lng = Number(row[lngIndex]);
    if (sourceId && validCoordinates(lat, lng)) result.set(sourceId, { lat, lng });
  }
  return result;
}

async function fetchText(url, headers = {}) {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "text/csv,*/*", ...headers },
    redirect: "follow",
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
  return await response.text();
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function geocode(query) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "az");
  url.searchParams.set("q", query);
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, "accept-language": "az,en" },
    signal: AbortSignal.timeout(45_000),
  });
  if (response.status === 429) { await sleep(3000); return null; }
  if (!response.ok) return null;
  const payload = await response.json();
  const lat = Number(payload?.[0]?.lat);
  const lng = Number(payload?.[0]?.lon);
  return validCoordinates(lat, lng) ? { lat, lng } : null;
}

function postgresArray(values) {
  return `{${[...new Set(values.filter(Boolean))].map((value) => `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`).join(",")}}`;
}
function csvField(value) {
  if (value === null || value === undefined || value === "") return "\\N";
  const encoded = String(value).replace(/[\t\r\n]+/gu, " ").replaceAll('"', '""');
  return `"${encoded}"`;
}

const existing = loadExisting(existingPath);
const output = new Map();
let scanned = 0;
let reused = 0;
let newlyGeocoded = 0;
let skippedUnplaced = 0;
let lastGeocodeAt = 0;

for (const source of SOURCES) {
  const raw = await fetchText(source.url, { referer: source.page });
  const objects = rowsToObjects(parseDelimited(raw));
  scanned += objects.length;

  for (const row of objects) {
    const name = likelyName(row);
    if (!name || normalizedKey(name).length < 3) continue;
    const parent = pick(row, ["tabeliyinde oldugu tibb muessisesi", "esas muessise"], ["tabeliyinde", "esas muessise", "parent"]);
    const address = pick(row, ["unvan", "adres"], ["unvan", "adres"]);
    const city = pick(row, ["seher", "rayon", "inzibati erazi"], ["seher", "rayon", "inzibati", "region"]);
    const type = pick(row, ["muessisenin novu", "tip"], ["nov", "tip", "profil"]);
    const code = pick(row, ["kod", "id", "muessise kodu"], ["kod", "identifik"]);
    const phone = pick(row, ["telefon"], ["telefon", "phone"]);
    const email = pick(row, ["email"], ["email", "e mail"]);

    const identity = code || hash(`${normalizedKey(name)}|${normalizedKey(parent)}|${normalizedKey(address)}|${normalizedKey(city)}`).slice(0, 20);
    const sourceId = `az-tabib:${source.key}:${identity}`;
    let coordinates = existing.get(sourceId) || null;
    if (coordinates) reused += 1;
    if (!coordinates) {
      if (!address && !city) { skippedUnplaced += 1; continue; }
      const wait = 1100 - (Date.now() - lastGeocodeAt);
      if (wait > 0) await sleep(wait);
      coordinates = await geocode([name, address, city, "Azerbaijan"].filter(Boolean).join(", "));
      lastGeocodeAt = Date.now();
      if (!coordinates && address && city) {
        const waitRetry = 1100 - (Date.now() - lastGeocodeAt);
        if (waitRetry > 0) await sleep(waitRetry);
        coordinates = await geocode(`${address}, ${city}, Azerbaijan`);
        lastGeocodeAt = Date.now();
      }
      if (!coordinates) { skippedUnplaced += 1; continue; }
      newlyGeocoded += 1;
    }

    const normalized = normalizedKey(name);
    const formatted = [address, city, "Azerbaijan"].filter(Boolean).join(", ");
    const classification = classify(name, type, parent);
    const masterKey = `loc:${hash(JSON.stringify({
      name: normalized,
      address: formatted.toLowerCase(),
      country: "AZ",
      lat: Number(coordinates.lat.toFixed(6)),
      lng: Number(coordinates.lng.toFixed(6)),
    }))}`;
    const rowOut = [
      sourceId, source.page, name, normalized, address, formatted, city, city, "", "AZ",
      coordinates.lat, coordinates.lng, phone, "", email, classification.primary,
      postgresArray([...classification.tags, source.key === "subordinate" ? "tabib_subordinate_facility" : "tabib_direct_facility"]),
      0.96, masterKey,
    ];

    const dedupeKey = `${normalized}|${normalizedKey(address)}|${normalizedKey(city)}`;
    if (!output.has(dedupeKey) || source.key === "direct") output.set(dedupeKey, rowOut);
  }
}

const sorted = [...output.values()].sort((a, b) => String(a[2]).localeCompare(String(b[2])) || String(a[0]).localeCompare(String(b[0])));
if (!sorted.length) throw new Error("Azerbaijan TABIB normalization produced zero map-renderable facilities");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${[columns.join("\t"), ...sorted.map((row) => row.map(csvField).join("\t"))].join("\n")}\n`, "utf8");
console.log(JSON.stringify({ source: "az_tabib_healthcare", scanned, mapRows: sorted.length, coordinatesReused: reused, newlyGeocoded, skippedUnplaced, outputPath }));

#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = "https://lkv.li/leistungserbringer-liste";
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
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, '"')
    .replace(/&#039;|&apos;/giu, "'")
    .replace(/&auml;/giu, "ä").replace(/&ouml;/giu, "ö").replace(/&uuml;/giu, "ü")
    .replace(/&Auml;/gu, "Ä").replace(/&Ouml;/gu, "Ö").replace(/&Uuml;/gu, "Ü")
    .replace(/&szlig;/giu, "ß")
    .replace(/&#(\d+);/gu, (_, code) => String.fromCodePoint(Number(code)));
}

function htmlLines(html) {
  return decodeHtml(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<(?:br|\/p|\/div|\/li|\/tr|\/td|\/h\d)\b[^>]*>/giu, "\n")
    .replace(/<[^>]+>/gu, " ")
    .split(/\r?\n/gu)
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter(Boolean);
}

function labelIndex(line) {
  const lower = line.toLowerCase();
  if (lower.startsWith("adresse:")) return "address";
  if (lower.startsWith("plz / ort:") || lower.startsWith("plz/ort:")) return "place";
  if (lower.startsWith("kategorie:")) return "category";
  if (lower.startsWith("homepage:")) return "website";
  if (lower.startsWith("e-mail:") || lower.startsWith("email:")) return "email";
  if (lower.startsWith("okp zugelassen:")) return "okp";
  if (lower.startsWith("tel:")) return "phone";
  return "";
}

function valueAfterLabel(line, label) {
  const idx = line.indexOf(":");
  if (idx < 0) return "";
  const value = line.slice(idx + 1).trim();
  return label === "email" ? value.replace(/\(at\)/giu, "@").replace(/\s+/gu, "") : value;
}

function parseProviders(html, pageUrl) {
  const lines = htmlLines(html);
  const providers = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (labelIndex(lines[index]) !== "address") continue;
    let name = "";
    for (let back = index - 1; back >= 0 && back >= index - 6; back -= 1) {
      if (!labelIndex(lines[back]) && !/^(suchergebnisse|leistungserbringer|liste|filter|name|ort)$/iu.test(lines[back])) {
        name = lines[back];
        break;
      }
    }
    if (!name) continue;
    const record = { name, address: valueAfterLabel(lines[index], "address"), place: "", category: "", website: "", email: "", okp: "", phone: "", pageUrl };
    if (!record.address && lines[index + 1] && !labelIndex(lines[index + 1])) record.address = lines[index + 1];
    for (let forward = index + 1; forward < lines.length && forward <= index + 18; forward += 1) {
      if (forward > index + 1 && labelIndex(lines[forward]) === "address") break;
      const label = labelIndex(lines[forward]);
      if (!label) continue;
      let value = valueAfterLabel(lines[forward], label);
      if (!value && lines[forward + 1] && !labelIndex(lines[forward + 1])) value = lines[forward + 1];
      record[label] = label === "email" ? value.replace(/\(at\)/giu, "@").replace(/\s+/gu, "") : value;
    }
    providers.push(record);
  }
  return providers;
}

async function fetchPage(page) {
  const url = new URL(BASE_URL);
  url.searchParams.set("ccm_order_by", "cv.cvName");
  url.searchParams.set("ccm_order_by_direction", "asc");
  if (page > 1) url.searchParams.set("ccm_paging_p", String(page));
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "text/html" },
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`Liechtenstein LKV page ${page} HTTP ${response.status}`);
  return { html: await response.text(), url: url.toString() };
}

function localPlace(place) {
  const match = text(place).match(/\b(949[0-9])\b\s*(.*)$/u);
  if (!match) return null;
  return { postal: match[1], city: text(match[2]) };
}

function classify(category, name) {
  const value = normalized(`${category} ${name}`);
  let primary = "healthcare_facility";
  if (/(zahnarzt|zahnarzte|dental)/u.test(value)) primary = "dental";
  else if (/(apotheke|pharma)/u.test(value)) primary = "pharmacy_vaccination";
  else if (/(labor|diagnostiker)/u.test(value)) primary = "lab";
  else if (/(spital|heilanstalt|hospital)/u.test(value)) primary = "hospital";
  else if (/(grundversorgung|allgemeinmedizin|praktischer arzt)/u.test(value)) primary = "general_practitioner";
  else if (/(arzt|arzte|rheumat|kardiolog|pneumolog|psychiatr|urolog|gastro|chirurg|gynakolog|orthopad|augen|hno)/u.test(value)) primary = "specialist";
  else if (/(physiotherap|ergotherap|psychotherap|hebamme|pflege|massage)/u.test(value)) primary = "specialist";
  const tags = primary === "healthcare_facility" ? ["healthcare_facility", "liechtenstein_okp"] : [primary, "healthcare_facility", "liechtenstein_okp"];
  return { primary, tags };
}

function validCoordinates(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 47.02 && lat <= 47.30 && lng >= 9.45 && lng <= 9.68;
}

async function geocode(query) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "li");
  url.searchParams.set("q", query);
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, "accept-language": "de,en" },
    signal: AbortSignal.timeout(45_000),
  });
  if (response.status === 429) { await sleep(3000); return null; }
  if (!response.ok) return null;
  const payload = await response.json();
  const lat = Number(payload?.[0]?.lat);
  const lng = Number(payload?.[0]?.lon);
  if (!validCoordinates(lat, lng)) return null;
  return { lat, lng };
}

function postgresArray(values) {
  return `{${[...new Set(values.filter(Boolean))].map((value) => `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`).join(",")}}`;
}
function csvField(value) {
  if (value === null || value === undefined || value === "") return "\\N";
  const encoded = String(value).replace(/[\t\r\n]+/gu, " ").replaceAll('"', '""');
  return `"${encoded}"`;
}

const rawProviders = new Map();
let emptyPages = 0;
for (let page = 1; page <= 30; page += 1) {
  const { html, url } = await fetchPage(page);
  const pageProviders = parseProviders(html, url);
  const before = rawProviders.size;
  for (const provider of pageProviders) {
    const place = localPlace(provider.place);
    if (!place) continue;
    const key = `${normalized(provider.name)}|${normalized(provider.address)}|${place.postal}`;
    rawProviders.set(key, { ...provider, ...place });
  }
  if (rawProviders.size === before) emptyPages += 1; else emptyPages = 0;
  if (page >= 3 && emptyPages >= 2) break;
}
if (!rawProviders.size) throw new Error("Liechtenstein LKV scrape produced zero local providers");

const rows = [];
let lastGeocodeAt = 0;
let skipped = 0;
for (const provider of rawProviders.values()) {
  const wait = 1100 - (Date.now() - lastGeocodeAt);
  if (wait > 0) await sleep(wait);
  let coords = await geocode(`${provider.address}, ${provider.postal} ${provider.city}, Liechtenstein`);
  lastGeocodeAt = Date.now();
  if (!coords) {
    const waitRetry = 1100 - (Date.now() - lastGeocodeAt);
    if (waitRetry > 0) await sleep(waitRetry);
    coords = await geocode(`${provider.name}, ${provider.city}, Liechtenstein`);
    lastGeocodeAt = Date.now();
  }
  if (!coords) { skipped += 1; continue; }

  const classification = classify(provider.category, provider.name);
  const sourceId = `li-lkv:${hash(`${normalized(provider.name)}|${normalized(provider.address)}|${provider.postal}`).slice(0, 20)}`;
  const formatted = [provider.address, `${provider.postal} ${provider.city}`, "Liechtenstein"].filter(Boolean).join(", ");
  const masterKey = `loc:${hash(JSON.stringify({
    name: normalized(provider.name), address: formatted.toLowerCase(), country: "LI",
    lat: Number(coords.lat.toFixed(6)), lng: Number(coords.lng.toFixed(6)),
  }))}`;
  rows.push([
    sourceId, BASE_URL, provider.name, normalized(provider.name), provider.address, formatted,
    provider.city, "", provider.postal, "LI", coords.lat, coords.lng, provider.phone,
    provider.website, provider.email, classification.primary,
    postgresArray([...classification.tags, provider.category ? `category:${provider.category}` : ""]),
    0.97, masterKey,
  ]);
}
if (!rows.length) throw new Error("Liechtenstein LKV normalization produced zero map-renderable providers");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${[columns.join("\t"), ...rows.sort((a, b) => String(a[2]).localeCompare(String(b[2]))).map((row) => row.map(csvField).join("\t"))].join("\n")}\n`, "utf8");
console.log(JSON.stringify({ source: "li_lkv_okp", scrapedLocalProviders: rawProviders.size, mapRows: rows.length, skippedUnplaced: skipped, outputPath }));

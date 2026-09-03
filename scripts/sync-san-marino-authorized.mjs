#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PDF_URL = "https://www.gov.sm/pub2/GovSM/dam/jcr%3A86ce8b7c-b7f5-40c0-8441-2c229f3746f8/SITO_WEB_ELENCO_strutture%20autoriz%2019_2_2026.pdf";
const AUTHORITY_PAGE = "https://www.gov.sm/pub2/GovSM/Authority-Sanitaria/Autorizzazione-ed-Accreditamento-delle-Strutture-Sanitarie-Socio-Sanitarie-e-Socio-Educative.html";
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

function validCoordinates(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 43.88 && lat <= 44.02 && lng >= 12.38 && lng <= 12.57;
}

function cleanFacilityName(value) {
  return text(value)
    .replace(/^[-–—•]+\s*/u, "")
    .replace(/\s+/gu, " ")
    .replace(/\s+(?:pagina|pag\.)\s*\d+.*$/giu, "")
    .trim();
}

function classify(name) {
  const value = normalized(name);
  let primary = "healthcare_facility";
  if (/(odontoiatr|dent|stomat)/u.test(value)) primary = "dental";
  else if (/(laborator|analisi|patolog|biolog)/u.test(value)) primary = "lab";
  else if (/(radiolog|diagnostic|risonanza|tomograf|ecograf|imaging)/u.test(value)) primary = "imaging";
  else if (/(ospedale|hospital|casa di cura|clinica)/u.test(value)) primary = "hospital";
  else if (/(medicina del lavoro|medico competente|salute lavoro|occupazional)/u.test(value)) primary = "occupational_health_clinic";
  else if (/(ambulatorio medico|poliambulator|centro medico|medicina generale)/u.test(value)) primary = "general_practitioner";
  else if (/(cardiolog|pneumolog|neurolog|psichiatr|ortoped|ginecolog|oculist|oftalmolog|fisioterap|riabilit|special)/u.test(value)) primary = "specialist";
  const tags = primary === "healthcare_facility" ? ["healthcare_facility", "san_marino_authorized"] : [primary, "healthcare_facility", "san_marino_authorized"];
  return { primary, tags };
}

function candidateFacilities(rawText) {
  const lines = rawText
    .replace(/\f/gu, "\n")
    .split(/\r?\n/gu)
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter(Boolean);

  const facilities = [];
  let current = "";
  const flush = () => {
    const name = cleanFacilityName(current);
    current = "";
    if (!name || name.length < 4) return;
    if (/^(elenco|strutture|authority|repubblica di san marino|aggiornato|autorizzate|sanitarie|socio sanitarie|socio-sanitarie|socio educative|socio-educative)$/iu.test(name)) return;
    facilities.push(name);
  };

  for (const line of lines) {
    const numbered = line.match(/^\s*(\d{1,3})[.)\-]?\s+(.+)$/u);
    if (numbered) {
      flush();
      current = numbered[2];
      continue;
    }
    if (current && !/^\d+\s*$/u.test(line) && !/^(pagina|pag\.)\s*\d+/iu.test(line)) {
      if (line.length <= 120) current += ` ${line}`;
    }
  }
  flush();

  return [...new Set(facilities.map(cleanFacilityName))]
    .filter((name) => !/^(via|strada|contrada|piazza|tel\.?|telefono|email|www\.)\b/iu.test(name));
}

async function downloadPdf(filePath) {
  const response = await fetch(PDF_URL, {
    headers: { "user-agent": USER_AGENT, accept: "application/pdf,*/*", referer: AUTHORITY_PAGE },
    redirect: "follow",
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`San Marino Authority PDF HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 5_000 || !buffer.subarray(0, 5).toString("ascii").startsWith("%PDF")) {
    throw new Error("San Marino authorized-structures download was not a valid PDF");
  }
  fs.writeFileSync(filePath, buffer);
}

function extractPdfText(pdfPath, txtPath) {
  const result = spawnSync("pdftotext", ["-layout", pdfPath, txtPath], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`pdftotext failed: ${text(result.stderr) || `exit ${result.status}`}`);
  const raw = fs.readFileSync(txtPath, "utf8");
  if (raw.length < 100) throw new Error("San Marino authorized-structures PDF yielded no usable text");
  return raw;
}

async function geocode(query) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "sm");
  url.searchParams.set("q", query);
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, "accept-language": "it,en" },
    signal: AbortSignal.timeout(45_000),
  });
  if (response.status === 429) { await sleep(3000); return null; }
  if (!response.ok) return null;
  const payload = await response.json();
  const item = payload?.[0];
  const lat = Number(item?.lat);
  const lng = Number(item?.lon);
  if (!validCoordinates(lat, lng)) return null;
  const address = item?.address || {};
  return {
    lat,
    lng,
    address1: text(address.road) || text(address.pedestrian) || text(address.neighbourhood),
    city: text(address.city) || text(address.town) || text(address.village) || text(address.municipality),
    postal: text(address.postcode),
  };
}

function postgresArray(values) {
  return `{${[...new Set(values.filter(Boolean))].map((value) => `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`).join(",")}}`;
}
function csvField(value) {
  if (value === null || value === undefined || value === "") return "\\N";
  const encoded = String(value).replace(/[\t\r\n]+/gu, " ").replaceAll('"', '""');
  return `"${encoded}"`;
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "san-marino-authorized-"));
const pdfPath = path.join(tempDir, "authorized.pdf");
const txtPath = path.join(tempDir, "authorized.txt");
await downloadPdf(pdfPath);
const names = candidateFacilities(extractPdfText(pdfPath, txtPath));
if (names.length < 15) throw new Error(`Only ${names.length} San Marino authorized facility names parsed; refusing output`);

const rows = [];
let lastGeocodeAt = 0;
let skippedUnplaced = 0;
for (const name of names) {
  const wait = 1100 - (Date.now() - lastGeocodeAt);
  if (wait > 0) await sleep(wait);
  let geo = await geocode(`${name}, San Marino`);
  lastGeocodeAt = Date.now();
  if (!geo) {
    const waitRetry = 1100 - (Date.now() - lastGeocodeAt);
    if (waitRetry > 0) await sleep(waitRetry);
    const shortened = name.replace(/\b(srl|s\.r\.l\.|spa|s\.p\.a\.|societa|società|studio|poliambulatorio)\b/giu, " ").replace(/\s+/gu, " ").trim();
    geo = shortened && shortened !== name ? await geocode(`${shortened}, San Marino`) : null;
    lastGeocodeAt = Date.now();
  }
  if (!geo) { skippedUnplaced += 1; continue; }

  const classification = classify(name);
  const sourceId = `sm-authority:${hash(normalized(name)).slice(0, 20)}`;
  const formatted = [geo.address1, geo.postal, geo.city, "San Marino"].filter(Boolean).join(", ");
  const masterKey = `loc:${hash(JSON.stringify({
    name: normalized(name), address: formatted.toLowerCase(), country: "SM",
    lat: Number(geo.lat.toFixed(6)), lng: Number(geo.lng.toFixed(6)),
  }))}`;
  rows.push([
    sourceId, AUTHORITY_PAGE, name, normalized(name), geo.address1, formatted, geo.city, "",
    geo.postal, "SM", geo.lat, geo.lng, "", "", "", classification.primary,
    postgresArray(classification.tags), 0.97, masterKey,
  ]);
}

if (rows.length < 12) throw new Error(`Only ${rows.length} San Marino authorized facilities were map-renderable; refusing output`);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${[columns.join("\t"), ...rows.sort((a, b) => String(a[2]).localeCompare(String(b[2]))).map((row) => row.map(csvField).join("\t"))].join("\n")}\n`, "utf8");
console.log(JSON.stringify({ source: "sm_authorized_healthcare", parsedAuthorizedNames: names.length, mapRows: rows.length, skippedUnplaced, outputPath }));

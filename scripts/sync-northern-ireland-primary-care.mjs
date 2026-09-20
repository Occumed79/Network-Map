#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const GP_PACKAGE = "gp-practice-list-sizes";
const DENTAL_PACKAGE = "7a65dda8-5d57-4344-bc0a-9cca26a3a57c";
const OPHTHALMIC_PACKAGE = "72fd6646-f7d9-4a90-85b8-8bb48470f9c7";
const CKAN = "https://admin.opendatani.gov.uk/api/3/action/package_show?id=";
const POSTCODES_IO = "https://api.postcodes.io/postcodes";
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
function normalizedName(value) {
  return text(value).normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ").trim().replace(/\s+/gu, " ");
}
function normalizedHeader(value) {
  return normalizedName(value).replace(/\s+/gu, "_");
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { accept: "application/json", "user-agent": USER_AGENT, ...(init.headers || {}) },
    redirect: "follow",
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
  return await response.json();
}
async function fetchText(url) {
  const response = await fetch(url, {
    headers: { accept: "text/csv,*/*", "user-agent": USER_AGENT },
    redirect: "follow",
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
  return await response.text();
}

function parseCsv(raw) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (quoted) {
      if (ch === '"') {
        if (raw[i + 1] === '"') { field += '"'; i += 1; }
        else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field.replace(/\r$/u, "")); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/u, "")); rows.push(row); }
  return rows;
}
function objectsFromCsv(raw) {
  const rows = parseCsv(raw.replace(/^\uFEFF/u, ""));
  if (!rows.length) return [];
  const headerIndex = rows.findIndex((row) => row.filter((cell) => text(cell)).length >= 2);
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex].map((value, index) => normalizedHeader(value) || `column_${index + 1}`);
  return rows.slice(headerIndex + 1)
    .filter((row) => row.some((value) => text(value)))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function pick(row, candidates) {
  for (const candidate of candidates) {
    const value = text(row[normalizedHeader(candidate)]);
    if (value) return value;
  }
  return "";
}
function pickMatching(row, patterns) {
  for (const [key, raw] of Object.entries(row)) {
    if (patterns.some((pattern) => pattern.test(key))) {
      const value = text(raw);
      if (value) return value;
    }
  }
  return "";
}
function addressParts(row) {
  const entries = Object.entries(row)
    .filter(([key, raw]) => text(raw) && /(^|_)(address|addr|street|road|building|premises|town|city|locality)(_|$)/iu.test(key))
    .filter(([key]) => !/(email|web|phone|tel)/iu.test(key))
    .map(([, raw]) => text(raw));
  return [...new Set(entries)];
}
function postcode(row) {
  return pick(row, ["Postcode", "Post Code", "Postal Code"])
    || pickMatching(row, [/(^|_)postcode($|_)/iu, /postal.*code/iu]);
}
function phone(row) {
  return pick(row, ["Telephone", "Telephone Number", "Phone", "Tel"])
    || pickMatching(row, [/(^|_)(telephone|phone|tel)($|_)/iu]);
}
function email(row) {
  return pick(row, ["Email", "Email Address"]) || pickMatching(row, [/(^|_)email($|_)/iu]);
}
function website(row) {
  return pick(row, ["Website", "Web Address", "URL"]) || pickMatching(row, [/(website|web_address|url)/iu]);
}

function resourceDate(resource) {
  for (const field of [resource?.last_modified, resource?.modified, resource?.created, resource?.created_at]) {
    const parsed = Date.parse(field || "");
    if (Number.isFinite(parsed)) return parsed;
  }
  const match = text(resource?.name).match(/(\d{4})/u);
  return match ? Number(match[1]) : 0;
}
async function packageResources(id) {
  const payload = await fetchJson(`${CKAN}${encodeURIComponent(id)}`);
  if (payload?.success !== true || !Array.isArray(payload?.result?.resources)) {
    throw new Error(`OpenDataNI package ${id} returned invalid metadata`);
  }
  return payload.result.resources;
}
function latestCsv(resources, namePattern = null) {
  const candidates = resources
    .filter((resource) => text(resource?.format).toLowerCase() === "csv" && text(resource?.url))
    .filter((resource) => !namePattern || namePattern.test(text(resource?.name)))
    .sort((a, b) => resourceDate(b) - resourceDate(a));
  if (!candidates.length) throw new Error("No matching OpenDataNI CSV resource found");
  return candidates[0];
}

async function geocodePostcodes(postcodes) {
  const unique = [...new Set(postcodes.map((value) => text(value).toUpperCase().replace(/\s+/gu, " ")).filter(Boolean))];
  const result = new Map();
  for (let index = 0; index < unique.length; index += 100) {
    const batch = unique.slice(index, index + 100);
    const payload = await fetchJson(POSTCODES_IO, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ postcodes: batch }),
    });
    for (const entry of Array.isArray(payload?.result) ? payload.result : []) {
      const query = text(entry?.query).toUpperCase().replace(/\s+/gu, " ");
      const resolved = entry?.result;
      const lat = Number(resolved?.latitude);
      const lng = Number(resolved?.longitude);
      if (!query || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < 53.8 || lat > 55.4 || lng < -8.3 || lng > -5.2) continue;
      result.set(query, {
        lat, lng,
        city: text(resolved?.admin_district) || text(resolved?.parish),
        region: text(resolved?.region) || text(resolved?.admin_county) || text(resolved?.admin_district),
      });
    }
  }
  return result;
}

function sourceId(kind, row, name, postal) {
  const explicit = pick(row, [
    "PracNo", "Practice No", "PracticeNo", "Surgery No", "Surgery Number", "Surgery ID",
    "Practice ID", "Code", "ID", "Reference Number",
  ]) || pickMatching(row, [/(^|_)(practice|surgery).*(no|number|id|code)($|_)/iu, /(^|_)(id|code)($|_)/iu]);
  return explicit ? `ni-health:${kind}:${explicit}` : `ni-health:${kind}:${hash(`${name}|${postal}|${JSON.stringify(row)}`).slice(0, 24)}`;
}
function recordName(kind, row) {
  if (kind === "gp") return pick(row, ["PracticeName", "Practice Name", "Name"]);
  if (kind === "dental") return pick(row, ["Surgery Name", "Practice Name", "Dental Surgery Name", "Name"])
    || pickMatching(row, [/(surgery|practice).*name/iu, /(^|_)name($|_)/iu]);
  return pick(row, ["Surgery Name", "Practice Name", "Ophthalmic Surgery Name", "Name"])
    || pickMatching(row, [/(surgery|practice).*name/iu, /(^|_)name($|_)/iu]);
}
function typeFor(kind) {
  if (kind === "gp") return { primary: "general_practitioner", tags: ["general_practitioner", "healthcare_facility", "northern_ireland_gp"] };
  if (kind === "dental") return { primary: "dental", tags: ["dental", "healthcare_facility", "northern_ireland_dental_surgery"] };
  return { primary: "specialist", tags: ["ophthalmology", "specialist", "healthcare_facility", "northern_ireland_ophthalmic_surgery"] };
}
function postgresArray(values) {
  return `{${[...new Set(values.filter(Boolean))].map((value) => `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`).join(",")}}`;
}
function csvField(value) {
  if (value === null || value === undefined || value === "") return "\\N";
  return `"${String(value).replace(/[\t\r\n]+/gu, " ").replaceAll('"', '""')}"`;
}

const [gpResources, dentalResources, ophthalmicResources] = await Promise.all([
  packageResources(GP_PACKAGE), packageResources(DENTAL_PACKAGE), packageResources(OPHTHALMIC_PACKAGE),
]);
const selected = {
  gp: latestCsv(gpResources),
  dental: latestCsv(dentalResources, /dental\s+surgery\s+list/iu),
  ophthalmic: latestCsv(ophthalmicResources, /ophthalmic\s+surgery\s+list/iu),
};
const parsed = {};
for (const [kind, resource] of Object.entries(selected)) {
  parsed[kind] = objectsFromCsv(await fetchText(resource.url));
  if (!parsed[kind].length) throw new Error(`${kind} CSV parsed zero records`);
}

const allPostcodes = Object.values(parsed).flatMap((rows) => rows.map(postcode));
const geocodes = await geocodePostcodes(allPostcodes);
const output = new Map();
const stats = {};
for (const [kind, rows] of Object.entries(parsed)) {
  let accepted = 0;
  let unplaced = 0;
  for (const row of rows) {
    const name = recordName(kind, row);
    const postal = postcode(row).toUpperCase().replace(/\s+/gu, " ");
    if (!name || !postal) continue;
    const geo = geocodes.get(postal);
    if (!geo) { unplaced += 1; continue; }
    const address = addressParts(row);
    const line1 = address[0] || "";
    const formatted = [...address, postal, "Northern Ireland", "United Kingdom"].filter(Boolean).join(", ");
    const classification = typeFor(kind);
    const id = sourceId(kind, row, name, postal);
    const masterKey = `loc:${hash(JSON.stringify({
      name: normalizedName(name), address: formatted.toLowerCase(), country: "GB",
      lat: Number(geo.lat.toFixed(6)), lng: Number(geo.lng.toFixed(6)),
    }))}`;
    output.set(id, [
      id,
      kind === "gp" ? "https://admin.opendatani.gov.uk/dataset/gp-practice-list-sizes" : kind === "dental" ? "https://www.data.gov.uk/dataset/7a65dda8-5d57-4344-bc0a-9cca26a3a57c/dental-list-march-2018" : "https://www.data.gov.uk/dataset/72fd6646-f7d9-4a90-85b8-8bb48470f9c7/ophthalmic-surgery-list",
      name, normalizedName(name), line1, formatted, geo.city, geo.region, postal, "GB", geo.lat, geo.lng,
      phone(row), website(row), email(row), classification.primary, postgresArray(classification.tags), 0.99, masterKey,
    ]);
    accepted += 1;
  }
  stats[kind] = { scanned: rows.length, accepted, unplaced, resource: { name: selected[kind].name, url: selected[kind].url } };
}

const records = [...output.values()].sort((a, b) => String(a[2]).localeCompare(String(b[2])) || String(a[0]).localeCompare(String(b[0])));
if ((stats.gp?.accepted || 0) < 200) throw new Error(`Only ${stats.gp?.accepted || 0} Northern Ireland GP practices mapped`);
if ((stats.dental?.accepted || 0) < 100) throw new Error(`Only ${stats.dental?.accepted || 0} Northern Ireland dental surgeries mapped`);
if ((stats.ophthalmic?.accepted || 0) < 50) throw new Error(`Only ${stats.ophthalmic?.accepted || 0} Northern Ireland ophthalmic surgeries mapped`);
if (records.length < 400) throw new Error(`Only ${records.length} Northern Ireland primary-care locations mapped`);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${[columns.join("\t"), ...records.map((row) => row.map(csvField).join("\t"))].join("\n")}\n`, "utf8");
console.log(JSON.stringify({ source: "gb_ni_primarycare", total: records.length, stats, outputPath }));

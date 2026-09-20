#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const CQC_PAGE = "https://www.cqc.org.uk/about-us/transparency/using-cqc-data";
const NI_PACKAGE_API = "https://admin.opendatani.gov.uk/api/3/action/package_show?id=gp-practice-list-sizes";
const NI_DATASET_PAGE = "https://admin.opendatani.gov.uk/dataset/gp-practice-list-sizes";
const POSTCODES_IO = "https://api.postcodes.io/postcodes";

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

const source = argument("source");
const outputPath = argument("output");
if (!outputPath) throw new Error("--output is required");
if (!new Set(["england-cqc", "northern-ireland-gp"]).has(source)) {
  throw new Error("--source must be england-cqc or northern-ireland-gp");
}

const text = (value) => value === null || value === undefined ? "" : String(value).trim();
const hash = (value) => createHash("sha256").update(String(value)).digest("hex");

function normalizedName(value) {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function numberValue(value) {
  const parsed = Number(text(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function validCoordinates(lat, lng) {
  return lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0);
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
        if (raw[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/u, ""));
    rows.push(row);
  }
  return rows;
}

function rowsToObjects(rows, requiredHeaders) {
  const headerIndex = rows.findIndex((row) => requiredHeaders.every((header) => row.map(text).includes(header)));
  if (headerIndex < 0) throw new Error(`CSV header not found: ${requiredHeaders.join(", ")}`);
  const headers = rows[headerIndex].map((value) => text(value));
  return rows.slice(headerIndex + 1)
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

function postgresArray(values) {
  return `{${[...new Set(values.filter(Boolean))].map((value) => `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`).join(",")}}`;
}

function csvField(value) {
  if (value === null || value === undefined || value === "") return "\\N";
  const encoded = String(value).replace(/[\t\r\n]+/gu, " ").replaceAll('"', '""');
  return `"${encoded}"`;
}

async function fetchText(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; Occu-Med-Network-Map/1.0; +https://github.com/Occumed79/Network-Map)",
      ...headers,
    },
    redirect: "follow",
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
  return await response.text();
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      "user-agent": "Occu-Med-Network-Map/1.0",
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
  return await response.json();
}

function classifyEngland(row) {
  const haystack = Object.entries(row)
    .filter(([key]) => /(location|service|specialism|regulated activity)/iu.test(key))
    .map(([, value]) => text(value))
    .join(" ")
    .toLowerCase();

  let primary = "healthcare_facility";
  if (/(occupational health|occupational medicine|workplace health|employee health)/u.test(haystack)) primary = "occupational_health_clinic";
  else if (/(dentist|dental|orthodont|oral surgery)/u.test(haystack)) primary = "dental";
  else if (/(laborator|pathology|phlebotom)/u.test(haystack)) primary = "lab";
  else if (/(radiolog|imaging|x-ray|xray|mri|ct scan|ultrasound|diagnostic imaging)/u.test(haystack)) primary = "imaging";
  else if (/(hospital|acute services|inpatient)/u.test(haystack)) primary = "hospital";
  else if (/(general practice|primary medical|\bgp\b|doctor)/u.test(haystack)) primary = "general_practitioner";
  else if (/(clinic|independent healthcare|mental health|maternity|midwif|ambulance|hospice|diagnostic|screening|medical)/u.test(haystack)) primary = "specialist";

  const clinical = /(hospital|healthcare|health care|primary medical|general practice|\bgp\b|dent|ambulance|hospice|clinic|diagnostic|screening|mental health|maternity|midwif|medical|doctor|surgery|pathology|radiolog|imaging)/u.test(haystack);
  const socialOnly = /(adult social care|care home|homecare|domiciliary|supported living|residential social care|specialist college)/u.test(haystack)
    && !/(hospital|dent|general practice|primary medical|\bgp\b|clinic|diagnostic|medical|mental health|ambulance|hospice)/u.test(haystack);

  return { primary, tags: primary === "healthcare_facility" ? ["healthcare_facility"] : [primary, "healthcare_facility"], keep: clinical && !socialOnly };
}

async function latestCqcCsv() {
  const html = await fetchText(CQC_PAGE, { accept: "text/html" });
  const matches = [...html.matchAll(/href=["']([^"']*CQC_directory\.csv(?:\?[^"']*)?)["']/giu)];
  if (!matches.length) throw new Error("CQC transparency page did not expose the care-directory CSV link");
  const href = matches[0][1].replaceAll("&amp;", "&");
  return new URL(href, CQC_PAGE).toString();
}

async function normalizeEngland() {
  const csvUrl = await latestCqcCsv();
  const raw = await fetchText(csvUrl, { accept: "text/csv,*/*", referer: CQC_PAGE });
  const objects = rowsToObjects(parseCsv(raw), ["Location ID", "Location Name"]);
  const normalized = [];
  let rejectedNonClinical = 0;
  let rejectedCoordinates = 0;

  for (const row of objects) {
    const locationId = pick(row, ["Location ID", "CQC Location ID"]);
    const name = pick(row, ["Location Name", "Name"]);
    if (!locationId || !name) continue;
    if (/^(y|yes|true|1)$/iu.test(pick(row, ["Dormant (Y/N)", "Dormant"]))) continue;

    const classification = classifyEngland(row);
    if (!classification.keep) {
      rejectedNonClinical += 1;
      continue;
    }

    const lat = numberValue(pick(row, ["Location Latitude", "Latitude"]));
    const lng = numberValue(pick(row, ["Location Longitude", "Longitude"]));
    if (!validCoordinates(lat, lng)) {
      rejectedCoordinates += 1;
      continue;
    }

    const address1 = pick(row, ["Location Street Address", "Location Address Line 1", "Address Line 1"]);
    const address2 = pick(row, ["Location Address Line 2", "Address Line 2"]);
    const city = pick(row, ["Location City", "City"]);
    const county = pick(row, ["Location County", "County"]);
    const postal = pick(row, ["Location Postal Code", "Postcode", "Postal Code"]);
    const region = pick(row, ["Location Region", "Location NHS Region", "Location Local Authority"]);
    const formatted = [address1, address2, city, county, postal, "England", "United Kingdom"].filter(Boolean).join(", ");
    const normalizedNameValue = normalizedName(name);
    const masterKey = `loc:${hash(JSON.stringify({
      name: normalizedNameValue,
      address: formatted.toLowerCase(),
      country: "GB",
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    }))}`;

    normalized.push([
      `cqc:${locationId}`,
      `https://www.cqc.org.uk/location/${encodeURIComponent(locationId)}`,
      name,
      normalizedNameValue,
      address1 || address2,
      formatted,
      city,
      region,
      postal,
      "GB",
      lat,
      lng,
      pick(row, ["Location Telephone Number", "Telephone Number", "Phone"]),
      pick(row, ["Location Web Address", "Web Address", "Website"]),
      "",
      classification.primary,
      postgresArray([...classification.tags, "cqc_registered"]),
      0.99,
      masterKey,
    ]);
  }

  console.log(JSON.stringify({ source: "gb_cqc_healthcare", csvUrl, scanned: objects.length, rejectedNonClinical, rejectedCoordinates, geocodedFacilities: normalized.length }));
  return normalized;
}

function resourceDate(resource) {
  const raw = resource?.last_modified || resource?.modified || resource?.created || resource?.created_at || "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function latestNorthernIrelandCsv() {
  const payload = await fetchJson(NI_PACKAGE_API);
  if (payload?.success !== true || !Array.isArray(payload?.result?.resources)) throw new Error("OpenDataNI package metadata was invalid");
  const resources = payload.result.resources
    .filter((resource) => text(resource?.format).toLowerCase() === "csv" && text(resource?.url))
    .sort((a, b) => resourceDate(b) - resourceDate(a));
  if (!resources.length) throw new Error("OpenDataNI GP Practice List Sizes has no CSV resource");
  return resources[0];
}

async function geocodePostcodes(postcodes) {
  const result = new Map();
  const unique = [...new Set(postcodes.map((postcode) => text(postcode).toUpperCase()).filter(Boolean))];
  for (let index = 0; index < unique.length; index += 100) {
    const batch = unique.slice(index, index + 100);
    const payload = await fetchJson(POSTCODES_IO, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ postcodes: batch }),
    });
    for (const entry of Array.isArray(payload?.result) ? payload.result : []) {
      const query = text(entry?.query).toUpperCase();
      const resolved = entry?.result;
      if (!query || !resolved) continue;
      const lat = numberValue(resolved.latitude);
      const lng = numberValue(resolved.longitude);
      if (!validCoordinates(lat, lng)) continue;
      result.set(query, {
        lat,
        lng,
        city: text(resolved.admin_district) || text(resolved.parish),
        region: text(resolved.region) || text(resolved.admin_county) || text(resolved.admin_district),
      });
    }
  }
  return result;
}

async function normalizeNorthernIreland() {
  const resource = await latestNorthernIrelandCsv();
  const raw = await fetchText(resource.url, { accept: "text/csv,*/*", referer: NI_DATASET_PAGE });
  const objects = rowsToObjects(parseCsv(raw), ["PracticeName", "Postcode"]);
  const geocodes = await geocodePostcodes(objects.map((row) => row.Postcode));
  const normalized = [];

  for (const row of objects) {
    const practiceNo = pick(row, ["PracNo", "Practice No", "PracticeNo"]);
    const name = pick(row, ["PracticeName", "Practice Name"]);
    const postal = pick(row, ["Postcode"]);
    const geo = geocodes.get(postal.toUpperCase());
    if (!practiceNo || !name || !postal || !geo) continue;

    const address1 = pick(row, ["Address1"]);
    const address2 = pick(row, ["Address2"]);
    const address3 = pick(row, ["Address3"]);
    const lcg = pick(row, ["LCG"]);
    const formatted = [address1, address2, address3, postal, "Northern Ireland", "United Kingdom"].filter(Boolean).join(", ");
    const normalizedNameValue = normalizedName(name);
    const masterKey = `loc:${hash(JSON.stringify({
      name: normalizedNameValue,
      address: formatted.toLowerCase(),
      country: "GB",
      lat: Number(geo.lat.toFixed(6)),
      lng: Number(geo.lng.toFixed(6)),
    }))}`;

    normalized.push([
      `ni-gp:${practiceNo}`,
      NI_DATASET_PAGE,
      name,
      normalizedNameValue,
      address1 || address2 || address3,
      formatted,
      geo.city || address3,
      lcg || geo.region,
      postal,
      "GB",
      geo.lat,
      geo.lng,
      "",
      "",
      "",
      "general_practitioner",
      postgresArray(["general_practitioner", "healthcare_facility", "northern_ireland_gp"]),
      0.98,
      masterKey,
    ]);
  }

  console.log(JSON.stringify({ source: "gb_ni_gp", resource: { name: resource.name, url: resource.url, modified: resource.last_modified || resource.modified || null }, scanned: objects.length, geocodedPractices: normalized.length }));
  return normalized;
}

const rows = source === "england-cqc" ? await normalizeEngland() : await normalizeNorthernIreland();
if (!rows.length) throw new Error(`${source} normalization produced zero rows`);
rows.sort((a, b) => String(a[2]).localeCompare(String(b[2])) || String(a[0]).localeCompare(String(b[0])));
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${[columns.join("\t"), ...rows.map((row) => row.map(csvField).join("\t"))].join("\n")}\n`, "utf8");
console.log(JSON.stringify({ source, outputPath, records: rows.length }));

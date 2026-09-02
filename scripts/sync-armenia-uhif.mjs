#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const DIRECTORY_URL = "https://www.uhif.am/en/hospitals";
const COUNTRY_CODE = "AM";
const COUNTRY_NAME = "Armenia";
const MIN_FACILITIES = 500;
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Occu-Med-Network-Map/1.0 (+https://github.com/Occumed79/Network-Map)";

const COLUMNS = [
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

function normalizedKey(value) {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function validCoordinates(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= 38.7 && lat <= 41.4
    && lng >= 43.3 && lng <= 46.8;
}

function parseRscData(raw) {
  for (const line of raw.split(/\r?\n/u)) {
    if (!line.startsWith("1:")) continue;
    try {
      const parsed = JSON.parse(line.slice(2));
      if (parsed && typeof parsed === "object") return parsed;
    } catch (_) {}
  }
  return null;
}

function classify(name) {
  const value = normalizedKey(name);
  let primary = "healthcare_facility";
  if (/(dental|dent|stomat|odont)/u.test(value)) primary = "dental";
  else if (/(laborator|patholog|biochim|biochem)/u.test(value)) primary = "lab";
  else if (/(radiolog|diagnostic imaging|imaging|mri|ct scan)/u.test(value)) primary = "imaging";
  else if (/(hospital|clinical center|clinical centre|clinic hospital)/u.test(value)) primary = "hospital";
  else if (/(primary healthcare|primary health care|polyclinic|medical ambulatory|family medicine|health center|health centre)/u.test(value)) primary = "general_practitioner";

  return {
    primary,
    tags: [...new Set([primary, "healthcare_facility", "armenia_uhif", "domestic_authority_registry"])],
  };
}

function postgresArray(values) {
  return `{${[...new Set(values.filter(Boolean))]
    .map((value) => `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`)
    .join(",")}}`;
}

function csvField(value) {
  if (value === null || value === undefined || value === "") return "\\N";
  const encoded = String(value).replace(/[\t\r\n]+/gu, " ").replaceAll('"', '""');
  return `"${encoded}"`;
}

function headingTotal(headings) {
  for (const heading of headings) {
    const match = String(heading).match(/Found\s+(\d+)\s+results/i);
    if (match) return Number(match[1]);
  }
  return null;
}

async function geocodeFallback(facility) {
  const name = text(facility?.name);
  const address = text(facility?.address);
  const community = text(facility?.community);
  const region = text(facility?.region);
  const queries = [
    [address, community, region, COUNTRY_NAME],
    [name, address, community, region, COUNTRY_NAME],
    [name, community, region, COUNTRY_NAME],
  ].map((parts) => parts.filter(Boolean).join(", ")).filter(Boolean);

  for (const query of [...new Set(queries)]) {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "am");
    url.searchParams.set("q", query);
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, "Accept-Language": "en,hy" },
      });
      if (response.ok) {
        const payload = await response.json();
        const item = Array.isArray(payload) ? payload[0] : null;
        const lat = Number(item?.lat);
        const lng = Number(item?.lon);
        if (validCoordinates(lat, lng)) return { lat, lng, query };
      }
    } catch (_) {}
    await sleep(1100);
  }
  return null;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: "en-US" });
const payloadPromises = [];

page.on("response", (response) => {
  const request = response.request();
  if (response.url() !== DIRECTORY_URL || request.method() !== "POST") return;
  if ((request.postData() || "") !== '["en"]') return;

  payloadPromises.push((async () => {
    try {
      const raw = await response.text();
      const parsed = parseRscData(raw);
      if (parsed && Array.isArray(parsed.hospitals)) {
        return { hospitals: parsed.hospitals, action: request.headers()["next-action"] || "", bytes: raw.length };
      }
    } catch (error) {
      console.warn(`UHIF response body could not be read: ${error instanceof Error ? error.message : String(error)}`);
    }
    return null;
  })());
});

try {
  await page.goto(DIRECTORY_URL, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForTimeout(1500);

  const reportedTotal = headingTotal(await page.locator("h2").allTextContents());
  if (!Number.isInteger(reportedTotal) || reportedTotal < MIN_FACILITIES) {
    throw new Error(`UHIF page did not expose a plausible facility total; saw ${reportedTotal}`);
  }

  let captured = (await Promise.all(payloadPromises)).filter(Boolean);
  if (!captured.length) {
    const mapButton = page.getByRole("button", { name: /^\s*Map\s*$/i });
    if (await mapButton.count()) {
      const before = payloadPromises.length;
      await mapButton.first().click();
      await page.waitForTimeout(2500);
      captured = (await Promise.all(payloadPromises.slice(before))).filter(Boolean);
    }
  }
  if (!captured.length) throw new Error("UHIF did not expose its medical-center map payload");

  captured.sort((a, b) => b.hospitals.length - a.hospitals.length);
  const facilities = captured[0].hospitals;
  if (facilities.length !== reportedTotal) {
    throw new Error(`UHIF completeness guard failed: page reports ${reportedTotal}, map payload contains ${facilities.length}`);
  }

  const rows = new Map();
  let unnamed = 0;
  let fallbackGeocoded = 0;
  const unresolved = [];

  for (const facility of facilities) {
    const facilityId = text(facility?.id);
    const name = text(facility?.name);
    if (!facilityId || !name) {
      unnamed += 1;
      continue;
    }

    let lat = Number(facility?.lat);
    let lng = Number(facility?.lng);
    let coordinateSource = "uhif";
    if (!validCoordinates(lat, lng)) {
      console.log(JSON.stringify({ missingOfficialCoordinates: true, id: facilityId, name, address: facility?.address, community: facility?.community, region: facility?.region, lat: facility?.lat, lng: facility?.lng }));
      const fallback = await geocodeFallback(facility);
      if (!fallback) {
        unresolved.push({ id: facilityId, name, address: text(facility?.address), community: text(facility?.community), region: text(facility?.region) });
        continue;
      }
      lat = fallback.lat;
      lng = fallback.lng;
      coordinateSource = "nominatim_fallback";
      fallbackGeocoded += 1;
      console.log(JSON.stringify({ fallbackGeocoded: true, id: facilityId, name, query: fallback.query, lat, lng }));
    }

    const address = text(facility?.address);
    const region = text(facility?.region);
    const community = text(facility?.community);
    const phone = text(facility?.phone);
    const classification = classify(name);
    const tags = coordinateSource === "uhif" ? classification.tags : [...classification.tags, "coordinate_source:nominatim_fallback"];
    const formatted = [address, community, region, COUNTRY_NAME]
      .filter(Boolean)
      .filter((value, index, all) => all.findIndex((candidate) => normalizedKey(candidate) === normalizedKey(value)) === index)
      .join(", ");
    const sourceId = `am-uhif:${facilityId}`;
    const masterKey = `loc:${hash(JSON.stringify({
      name: normalizedKey(name),
      address: normalizedKey(formatted),
      country: COUNTRY_CODE,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    }))}`;

    rows.set(sourceId, [
      sourceId, DIRECTORY_URL, name, normalizedKey(name), address, formatted,
      community || region, region, "", COUNTRY_CODE, lat, lng, phone, "", "",
      classification.primary, postgresArray(tags), coordinateSource === "uhif" ? 0.995 : 0.985, masterKey,
    ]);
  }

  if (unnamed !== 0) throw new Error(`${unnamed} UHIF facilities lacked a stable id or name; refusing incomplete output`);
  if (unresolved.length !== 0) throw new Error(`UHIF coordinate fallback failed for ${JSON.stringify(unresolved)}`);
  if (rows.size !== reportedTotal) throw new Error(`UHIF output guard failed: ${rows.size} unique map rows vs ${reportedTotal} official facilities`);

  const sorted = [...rows.values()].sort((a, b) => String(a[2]).localeCompare(String(b[2])) || String(a[0]).localeCompare(String(b[0])));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${[COLUMNS.join("\t"), ...sorted.map((row) => row.map(csvField).join("\t"))].join("\n")}\n`, "utf8");

  console.log(JSON.stringify({
    source: "am_uhif_healthcare",
    officialFacilityTotal: reportedTotal,
    mapPayloadFacilities: facilities.length,
    mapRows: sorted.length,
    fallbackGeocoded,
    payloadActionDiscoveredDynamically: Boolean(captured[0].action),
    payloadBytes: captured[0].bytes,
    output: outputPath,
  }));
} finally {
  await page.close();
  await browser.close();
}

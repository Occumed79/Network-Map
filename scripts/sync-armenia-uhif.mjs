#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const DIRECTORY_URL = "https://www.uhif.am/en/hospitals";
const COUNTRY_CODE = "AM";
const COUNTRY_NAME = "Armenia";
const MIN_FACILITIES = 500;

// UHIF currently publishes malformed coordinates for exactly these two stable facility IDs.
// Corrections are pinned to the official UHIF address and independently verified against
// exact-address map records. No other invalid coordinate is allowed through this importer.
const VERIFIED_COORDINATE_CORRECTIONS = new Map([
  [
    "cmpktazp300000bjbtpc6ad52",
    {
      expectedName: "Sole Proprietor Petros Petrosyan",
      expectedAddress: "Yerevanian Highway 107/1",
      expectedCommunity: "Gyumri",
      expectedRegion: "Shirak",
      lat: 40.769079,
      lng: 43.846254,
      verificationUrl: "https://2gis.am/gyumri/directions/points/%7C43.846254%2C40.769079%3B70030076832040043",
    },
  ],
  [
    "cmpwow4vm000204jr6ay66ihr",
    {
      expectedName: "Dclinic Group",
      expectedAddress: "Margaryan 6/1",
      expectedCommunity: "HAT",
      expectedRegion: "Yerevan",
      lat: 40.207535,
      lng: 44.477683,
      verificationUrl: "https://yandex.com/maps/10262/yerevan/house/margaryan_poghots_6_1/YE0YcgBnT00EQFpqfX5xdnlgYA%3D%3D/",
    },
  ],
]);

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

function verifiedCorrection(facility) {
  const facilityId = text(facility?.id);
  const correction = VERIFIED_COORDINATE_CORRECTIONS.get(facilityId);
  if (!correction) return null;

  const actualName = normalizedKey(facility?.name);
  const actualAddress = normalizedKey(facility?.address);
  const actualCommunity = normalizedKey(facility?.community);
  const actualRegion = normalizedKey(facility?.region);
  if (
    actualName !== normalizedKey(correction.expectedName)
    || actualAddress !== normalizedKey(correction.expectedAddress)
    || actualCommunity !== normalizedKey(correction.expectedCommunity)
    || actualRegion !== normalizedKey(correction.expectedRegion)
  ) {
    throw new Error(`UHIF correction guard failed for ${facilityId}: source identity/address changed; manual re-verification required`);
  }
  if (!validCoordinates(correction.lat, correction.lng)) {
    throw new Error(`Verified correction for ${facilityId} is outside Armenia bounds`);
  }
  return correction;
}

async function replayLanguageAction(page, action, routerState) {
  return await page.evaluate(async ({ action, routerState }) => {
    const headers = {
      accept: "text/x-component",
      "content-type": "text/plain;charset=UTF-8",
      "next-action": action,
    };
    if (routerState) headers["next-router-state-tree"] = routerState;
    const response = await fetch("/en/hospitals", {
      method: "POST",
      headers,
      body: '["en"]',
    });
    return { status: response.status, body: await response.text() };
  }, { action, routerState });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: "en-US" });
const languageActions = new Map();

page.on("request", (request) => {
  if (request.url() !== DIRECTORY_URL || request.method() !== "POST") return;
  if ((request.postData() || "") !== '["en"]') return;
  const headers = request.headers();
  const action = headers["next-action"] || "";
  if (!action) return;
  languageActions.set(action, {
    action,
    routerState: headers["next-router-state-tree"] || "",
  });
});

async function discoverCompletePayload() {
  const candidates = [];
  for (const descriptor of languageActions.values()) {
    try {
      const response = await replayLanguageAction(page, descriptor.action, descriptor.routerState);
      if (response.status !== 200) continue;
      const parsed = parseRscData(response.body);
      if (parsed && Array.isArray(parsed.hospitals)) {
        candidates.push({ hospitals: parsed.hospitals, action: descriptor.action, bytes: response.body.length });
      }
    } catch (error) {
      console.warn(`UHIF action replay failed for ${descriptor.action.slice(0, 10)}…: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  candidates.sort((a, b) => b.hospitals.length - a.hospitals.length);
  return candidates[0] || null;
}

try {
  await page.goto(DIRECTORY_URL, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForTimeout(1500);

  const reportedTotal = headingTotal(await page.locator("h2").allTextContents());
  if (!Number.isInteger(reportedTotal) || reportedTotal < MIN_FACILITIES) {
    throw new Error(`UHIF page did not expose a plausible facility total; saw ${reportedTotal}`);
  }

  let captured = await discoverCompletePayload();
  if (!captured) {
    const mapButton = page.getByRole("button", { name: /^\s*Map\s*$/i });
    if (await mapButton.count()) {
      await mapButton.first().click();
      await page.waitForTimeout(2500);
      captured = await discoverCompletePayload();
    }
  }
  if (!captured) throw new Error(`UHIF did not expose a replayable medical-center payload; discovered ${languageActions.size} language actions`);

  const facilities = captured.hospitals;
  if (facilities.length !== reportedTotal) {
    throw new Error(`UHIF completeness guard failed: page reports ${reportedTotal}, map payload contains ${facilities.length}`);
  }

  const rows = new Map();
  let unnamed = 0;
  let correctedCoordinates = 0;
  const unresolvedInvalidCoordinates = [];
  const correctionsSeen = new Set();

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
      const correction = verifiedCorrection(facility);
      if (!correction) {
        unresolvedInvalidCoordinates.push({
          id: facilityId,
          name,
          address: text(facility?.address),
          community: text(facility?.community),
          region: text(facility?.region),
          lat: facility?.lat,
          lng: facility?.lng,
        });
        continue;
      }
      lat = correction.lat;
      lng = correction.lng;
      coordinateSource = "address_verified_correction";
      correctedCoordinates += 1;
      correctionsSeen.add(facilityId);
      console.log(JSON.stringify({
        coordinateCorrectionApplied: true,
        id: facilityId,
        name,
        sourceLat: facility?.lat,
        sourceLng: facility?.lng,
        correctedLat: lat,
        correctedLng: lng,
        verificationUrl: correction.verificationUrl,
      }));
    }

    const address = text(facility?.address);
    const region = text(facility?.region);
    const community = text(facility?.community);
    const phone = text(facility?.phone);
    const classification = classify(name);
    const tags = coordinateSource === "uhif"
      ? classification.tags
      : [...classification.tags, "coordinate_source:address_verified_correction"];
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
      classification.primary, postgresArray(tags), coordinateSource === "uhif" ? 0.995 : 0.99, masterKey,
    ]);
  }

  if (unnamed !== 0) throw new Error(`${unnamed} UHIF facilities lacked a stable id or name; refusing incomplete output`);
  if (unresolvedInvalidCoordinates.length !== 0) {
    throw new Error(`UHIF published new/unverified invalid coordinates: ${JSON.stringify(unresolvedInvalidCoordinates)}`);
  }
  if (correctionsSeen.size !== VERIFIED_COORDINATE_CORRECTIONS.size) {
    throw new Error(`Expected ${VERIFIED_COORDINATE_CORRECTIONS.size} known UHIF coordinate corrections but applied ${correctionsSeen.size}; re-verify source changes before promotion`);
  }
  if (rows.size !== reportedTotal) throw new Error(`UHIF output guard failed: ${rows.size} unique map rows vs ${reportedTotal} official facilities`);

  const sorted = [...rows.values()].sort((a, b) => String(a[2]).localeCompare(String(b[2])) || String(a[0]).localeCompare(String(b[0])));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${[COLUMNS.join("\t"), ...sorted.map((row) => row.map(csvField).join("\t"))].join("\n")}\n`, "utf8");

  console.log(JSON.stringify({
    source: "am_uhif_healthcare",
    officialFacilityTotal: reportedTotal,
    mapPayloadFacilities: facilities.length,
    mapRows: sorted.length,
    correctedCoordinates,
    discoveredLanguageActions: languageActions.size,
    payloadActionDiscoveredDynamically: Boolean(captured.action),
    payloadBytes: captured.bytes,
    output: outputPath,
  }));
} finally {
  await page.close();
  await browser.close();
}

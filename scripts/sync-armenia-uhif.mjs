#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
  expandOrganizationBranches,
  isSyntheticTestFacility,
  payloadsFromText,
  selectPayload,
  uniqueFacilityIds,
} from "./lib/armenia-uhif-payload.mjs";

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
  [
    "cmu2bwb7h00000agmure7dh9x",
    {
      expectedName: "Biomed LLC",
      expectedAddress: "Shengavit, E․ Tadevosyan, bldg․ 5, 2",
      expectedCommunity: "Shengavit",
      expectedRegion: "Yerevan",
      lat: 40.1466965,
      lng: 44.4914363,
      verificationUrl: "https://photon.komoot.io/api/?q=Biomed%20LLC%2C%20Shengavit%2C%20E.%20Tadevosyan%205%2C%20Yerevan%2C%20Armenia&limit=5",
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

async function photonGeocodeArmenia(name, address) {
  const queries = [
    [name, address, "Armenia"].filter(Boolean).join(", "),
    [address, "Armenia"].filter(Boolean).join(", "),
    [name, "Armenia"].filter(Boolean).join(", "),
  ];
  for (const query of queries) {
    if (!query) continue;
    try {
      const url = new URL("https://photon.komoot.io/api/");
      url.searchParams.set("q", query);
      url.searchParams.set("limit", "5");
      const response = await fetch(url, {
        headers: { "user-agent": "Occu-Med-Network-Map/1.0", "accept-language": "en,hy" },
        signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok) continue;
      const payload = await response.json();
      for (const feature of payload?.features || []) {
        const coords = feature?.geometry?.coordinates || [];
        if (coords.length < 2) continue;
        const lng = Number(coords[0]);
        const lat = Number(coords[1]);
        if (validCoordinates(lat, lng)) return { lat, lng };
      }
    } catch (_) {}
  }
  return null;
}

async function renderedHospitalCards(page) {
  return await page.evaluate(() => {
    const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const output = [];

    // Prefer semantic headings when present.
    for (const heading of [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]) {
      const name = clean(heading.textContent);
      if (!name || /services and hospitals|referral assistant|contact|medical organizations/i.test(name)) continue;
      let node = heading.parentElement;
      let chosenLines = null;
      for (let depth = 0; node && depth < 7; depth += 1, node = node.parentElement) {
        const raw = String(node.innerText || "");
        if (raw.length >= 6000) continue;
        const lines = raw.split(/\n+/).map(clean).filter(Boolean);
        const nameIndex = lines.findIndex((line) => line === name);
        if (nameIndex < 0) continue;
        const details = lines.slice(nameIndex + 1).filter((line) =>
          !/^\s*(?:load more|view more|details|directions|website)\s*$/i.test(line)
        );
        if (details.length) {
          chosenLines = lines;
          break;
        }
      }
      if (!chosenLines) continue;
      const nameIndex = chosenLines.findIndex((line) => line === name);
      const phoneIndex = chosenLines.findIndex((line, index) => index > nameIndex && /^\+374\s*\d/.test(line));
      const details = chosenLines.slice(nameIndex + 1).filter((line) =>
        !/^\+374\s*\d/.test(line)
        && !/^\s*(?:load more|view more|details|directions|website)\s*$/i.test(line)
      );
      const address = clean(phoneIndex > nameIndex ? chosenLines[phoneIndex - 1] : details[0]);
      if (!address) continue;
      output.push({ name, address, phone: phoneIndex > nameIndex ? clean(chosenLines[phoneIndex]) : "" });
    }

    // The current UHIF client can render cards without heading tags. Its
    // visible list is still consistently Name -> Address -> +374 phone.
    if (!output.length) {
      const lines = String(document.body?.innerText || "")
        .split(/\n+/).map(clean).filter(Boolean);
      for (let i = 2; i < lines.length; i += 1) {
        if (!/^\+374\s*\d/.test(lines[i])) continue;
        const address = clean(lines[i - 1]);
        const name = clean(lines[i - 2]);
        if (!name || !address) continue;
        if (/found \d+ results|load more|all regions|all services|medical centers|pharmacies/i.test(name)) continue;
        if (name.length > 220 || address.length > 180) continue;
        output.push({ name, address, phone: clean(lines[i]) });
      }
    }

    const seen = new Set();
    return output.filter((item) => {
      const key = (item.name + "|" + item.address).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
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
const responsePayloads = [];
const serverActions = new Map();

function diagnosticValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value.slice(0, 180);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return `[array:${value.length}]`;
  if (typeof value === "object") return `[object:${Object.keys(value).slice(0, 12).join(",")}]`;
  return String(value).slice(0, 180);
}

function candidateProfile(candidate) {
  const sample = candidate.hospitals.slice(0, 3);
  const branches = candidate.hospitals.flatMap((item) => Array.isArray(item?.branches) ? item.branches : []);
  const expanded = expandOrganizationBranches(candidate.hospitals);
  const keys = [...new Set(sample.flatMap((item) => item && typeof item === "object" ? Object.keys(item) : []))].sort();
  return {
    rows: candidate.hospitals.length,
    uniqueIds: uniqueFacilityIds(candidate.hospitals),
    keys,
    samples: sample.map((item) => item && typeof item === "object"
      ? Object.fromEntries(Object.entries(item).map(([key, value]) => [key, diagnosticValue(value)]))
      : diagnosticValue(item)),
    branchRows: branches.length,
    expandedRows: expanded.length,
    expandedUniqueIds: uniqueFacilityIds(expanded),
    branchKeys: [...new Set(branches.slice(0, 10).flatMap((branch) => branch && typeof branch === "object" ? Object.keys(branch) : []))].sort(),
    branchSamples: branches.slice(0, 3).map((branch) => branch && typeof branch === "object"
      ? Object.fromEntries(Object.entries(branch).map(([key, value]) => [key, diagnosticValue(value)]))
      : diagnosticValue(branch)),
    bytes: candidate.bytes,
    action: candidate.action || "",
  };
}

page.on("response", async (response) => {
  const contentType = String(response.headers()["content-type"] || "").toLowerCase();
  if (!response.url().includes("/hospitals")) return;
  if (!/(json|text\/x-component|text\/html)/u.test(contentType)) return;
  try {
    const body = await response.text();
    for (const hospitals of payloadsFromText(body)) {
      responsePayloads.push({ hospitals, url: response.url(), bytes: body.length });
    }
  } catch (_) {}
});

page.on("request", (request) => {
  if (!request.url().includes("/hospitals") || request.method() !== "POST") return;
  const headers = request.headers();
  const action = headers["next-action"] || "";
  if (!action) return;
  const postData = request.postData() || "";
  serverActions.set(`${action}\n${postData}`, {
    action,
    postData,
    routerState: headers["next-router-state-tree"] || "",
  });
  if (postData !== '["en"]') return;
  languageActions.set(action, {
    action,
    routerState: headers["next-router-state-tree"] || "",
  });
});

async function discoverCompletePayload(reportedTotal) {
  const candidates = [];
  for (const descriptor of languageActions.values()) {
    try {
      const response = await replayLanguageAction(page, descriptor.action, descriptor.routerState);
      if (response.status !== 200) continue;
      for (const hospitals of payloadsFromText(response.body)) {
        candidates.push({ hospitals, action: descriptor.action, bytes: response.body.length });
      }
    } catch (error) {
      console.warn(`UHIF action replay failed for ${descriptor.action.slice(0, 10)}…: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return selectPayload(candidates, reportedTotal);
}

try {
  await page.goto(DIRECTORY_URL, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForTimeout(1500);

  const reportedTotal = headingTotal(await page.locator("h2").allTextContents());
  if (!Number.isInteger(reportedTotal) || reportedTotal < MIN_FACILITIES) {
    throw new Error(`UHIF page did not expose a plausible facility total; saw ${reportedTotal}`);
  }

  // The list view is paginated independently from the map payload. UHIF now
  // exposes records beyond the first map payload through repeated "Load More"
  // server actions, so exhaust that list before checking completeness.
  let stagnantLoads = 0;
  let renderedCount = (await renderedHospitalCards(page)).length;
  for (let attempt = 0; attempt < 160 && stagnantLoads < 8 && renderedCount < reportedTotal; attempt += 1) {
    const beforeCount = renderedCount;
    let clicked = false;

    const roleButton = page.getByRole("button", { name: /load more/i }).first();
    if (await roleButton.count() && await roleButton.isVisible().catch(() => false)) {
      await roleButton.scrollIntoViewIfNeeded().catch(() => {});
      clicked = await roleButton.click({ timeout: 10_000 }).then(() => true, () => false);
    }

    if (!clicked) {
      const textTarget = page.getByText(/^\s*Load More\s*(?:\(.*\))?\s*$/i).last();
      if (await textTarget.count() && await textTarget.isVisible().catch(() => false)) {
        await textTarget.scrollIntoViewIfNeeded().catch(() => {});
        clicked = await textTarget.click({ timeout: 10_000 }).then(() => true, () => false);
      }
    }

    if (!clicked) {
      clicked = await page.evaluate(() => {
        const nodes = [...document.querySelectorAll("button,a,[role='button']")];
        const target = nodes.find((node) => /^\s*Load More\b/i.test((node.textContent || "").trim()));
        if (!target || typeof target.click !== "function") return false;
        target.scrollIntoView({ block: "center" });
        target.click();
        return true;
      });
    }

    if (!clicked) break;
    let afterCount = beforeCount;
    for (let poll = 0; poll < 20; poll += 1) {
      await page.waitForTimeout(500);
      afterCount = (await renderedHospitalCards(page)).length;
      if (afterCount > beforeCount) break;
    }
    const progressed = afterCount > beforeCount;
    stagnantLoads = progressed ? 0 : stagnantLoads + 1;
    renderedCount = Math.max(renderedCount, afterCount);
    console.log(JSON.stringify({
      uhifLoadMoreAttempt: attempt + 1,
      renderedBefore: beforeCount,
      renderedAfter: afterCount,
      progressed,
      stagnantLoads,
    }));
  }
  await page.waitForTimeout(1_000);
  // Capture the fully expanded list before switching to Map view, which
  // removes the list cards from the DOM.
  const renderedCards = await renderedHospitalCards(page);

  const payloadCandidates = [...responsePayloads];
  const html = await page.content();
  for (const hospitals of payloadsFromText(html)) {
    payloadCandidates.push({ hospitals, url: DIRECTORY_URL, bytes: html.length });
  }

  // UHIF's public payload groups physical healthcare locations beneath parent
  // organizations. The page result total counts those branches, so promote the
  // branch rows as an additional candidate while retaining the parent payload
  // for diagnostics and schema-change detection.
  for (const candidate of [...payloadCandidates]) {
    const hospitals = expandOrganizationBranches(candidate.hospitals);
    if (hospitals.length !== candidate.hospitals.length) {
      payloadCandidates.push({ ...candidate, hospitals, expandedBranches: true });
    }
  }

  let captured = selectPayload(payloadCandidates, reportedTotal);
  if (!captured || uniqueFacilityIds(captured.hospitals) !== reportedTotal) {
    const scriptBodies = await page.locator("script").allTextContents();
    for (const body of scriptBodies) {
      for (const hospitals of payloadsFromText(body)) {
        payloadCandidates.push({ hospitals, url: DIRECTORY_URL, bytes: body.length });
      }
    }
    captured = selectPayload(payloadCandidates, reportedTotal);
    if (payloadCandidates.length) {
      console.log(JSON.stringify({
        uhifPayloadCandidateSizes: payloadCandidates
          .slice()
          .sort((a, b) => b.hospitals.length - a.hospitals.length)
          .map(candidateProfile).slice(0, 20),
        uhifServerActions: [...serverActions.values()].map((descriptor) => ({
          action: descriptor.action,
          postData: descriptor.postData.slice(0, 1_000),
        })),
      }));
    }
  }

  if (!captured) captured = await discoverCompletePayload(reportedTotal);
  if (!captured || uniqueFacilityIds(captured.hospitals) !== reportedTotal) {
    const mapButton = page.getByRole("button", { name: /^\s*Map\s*$/i });
    if (await mapButton.count()) {
      await mapButton.first().click();
      await page.waitForTimeout(2500);
      payloadCandidates.push(...responsePayloads);
      captured = selectPayload(payloadCandidates, reportedTotal) || await discoverCompletePayload(reportedTotal);
    }
  }
  let renderedFallback = null;
  if (!captured || uniqueFacilityIds(captured.hospitals) !== reportedTotal) {
    const cards = renderedCards;
    console.log(JSON.stringify({
      uhifRenderedCards: cards.length,
      officialFacilityTotal: reportedTotal,
      selectedPayloadIds: captured ? uniqueFacilityIds(captured.hospitals) : 0,
    }));
    if (cards.length === reportedTotal) {
      const facilities = [];
      let cursor = 0;
      const workers = Array.from({ length: 8 }, async () => {
        while (true) {
          const index = cursor++;
          if (index >= cards.length) return;
          const card = cards[index];
          const geo = await photonGeocodeArmenia(card.name, card.address);
          if (!geo) continue;
          facilities[index] = {
            id: `rendered:${hash(`${normalizedKey(card.name)}|${normalizedKey(card.address)}`).slice(0, 24)}`,
            name: card.name,
            address: card.address,
            phone: card.phone,
            region: "",
            community: "",
            lat: geo.lat,
            lng: geo.lng,
            __coordinateSource: "uhif_rendered_card_geocode",
          };
        }
      });
      await Promise.all(workers);
      const geocoded = facilities.filter(Boolean);
      if (geocoded.length >= Math.max(MIN_FACILITIES, reportedTotal - 12)) {
        renderedFallback = geocoded;
        captured = { hospitals: geocoded, url: DIRECTORY_URL, bytes: 0, renderedFallback: true };
      }
    }
  }
  if (!captured) {
    const scriptSizes = (await page.locator("script").allTextContents()).map((body) => body.length).sort((a,b)=>b-a).slice(0,12);
    const cards = await renderedHospitalCards(page);
    throw new Error(`UHIF exposed no usable hospital payload or complete rendered fallback; page reports ${reportedTotal}, rendered cards=${cards.length}, captured ${responsePayloads.length} payloads, largest script sizes=${JSON.stringify(scriptSizes)}`);
  }

  const candidateArrays = [...payloadCandidates.map((entry) => entry.hospitals), captured.hospitals]
    .filter((candidate) => Array.isArray(candidate) && candidate.length > 0 && candidate.length <= reportedTotal)
    .sort((a, b) => b.length - a.length);

  const facilityById = new Map();
  const exact = candidateArrays.find((candidate) => {
    const ids = new Set(candidate.map((facility) => text(facility?.id)).filter(Boolean));
    return ids.size === reportedTotal;
  });

  if (exact) {
    for (const facility of exact) {
      const id = text(facility?.id);
      if (id) facilityById.set(id, facility);
    }
  } else {
    for (const candidate of candidateArrays) {
      const additions = [];
      let overlap = 0;
      for (const facility of candidate) {
        const id = text(facility?.id);
        if (!id) continue;
        if (facilityById.has(id)) overlap += 1;
        else additions.push([id, facility]);
      }
      if (!facilityById.size || overlap > 0 || facilityById.size + additions.length <= reportedTotal) {
        if (facilityById.size + additions.length > reportedTotal) continue;
        for (const [id, facility] of additions) facilityById.set(id, facility);
      }
      if (facilityById.size === reportedTotal) break;
    }
  }

  const syntheticTestFacilities = [...facilityById.values()].filter(isSyntheticTestFacility);
  const facilities = [...facilityById.values()].filter((facility) => !isSyntheticTestFacility(facility));
  const usingRenderedFallback = Boolean(captured.renderedFallback);
  const expectedPhysicalFacilities = reportedTotal - syntheticTestFacilities.length;
  const minimumAcceptable = usingRenderedFallback ? Math.max(MIN_FACILITIES, expectedPhysicalFacilities - 12) : expectedPhysicalFacilities;
  if (facilities.length < minimumAcceptable || (!usingRenderedFallback && facilities.length !== expectedPhysicalFacilities)) {
    throw new Error(`UHIF completeness guard failed: page reports ${reportedTotal}, selected ${facilities.length}; candidate sizes=${JSON.stringify(candidateArrays.map((candidate) => new Set(candidate.map((facility) => text(facility?.id)).filter(Boolean)).size))}`);
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
    let coordinateSource = text(facility?.__coordinateSource) || "uhif";
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
      : [...classification.tags, `coordinate_source:${coordinateSource}`];
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
  if (!usingRenderedFallback && correctionsSeen.size !== VERIFIED_COORDINATE_CORRECTIONS.size) {
    throw new Error(`Expected ${VERIFIED_COORDINATE_CORRECTIONS.size} known UHIF coordinate corrections but applied ${correctionsSeen.size}; re-verify source changes before promotion`);
  }
  if (rows.size < minimumAcceptable) throw new Error(`UHIF output guard failed: ${rows.size} map rows vs ${reportedTotal} official facilities`);

  const sorted = [...rows.values()].sort((a, b) => String(a[2]).localeCompare(String(b[2])) || String(a[0]).localeCompare(String(b[0])));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${[COLUMNS.join("\t"), ...sorted.map((row) => row.map(csvField).join("\t"))].join("\n")}\n`, "utf8");

  console.log(JSON.stringify({
    source: "am_uhif_healthcare",
    officialFacilityTotal: reportedTotal,
    skippedSyntheticTestFacilities: syntheticTestFacilities.length,
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

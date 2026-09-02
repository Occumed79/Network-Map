#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const DIRECTORY_URL = "https://www.uhif.am/en/hospitals";
const COUNTRY_CODE = "AM";
const COUNTRY_NAME = "Armenia";
const MIN_ORGANIZATIONS = 500;
const MIN_MAP_ROWS = 500;
const MAX_PAGES = 100;

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

function classify(name, categories = []) {
  const value = normalizedKey(`${name} ${categories.join(" ")}`);
  let primary = "healthcare_facility";
  if (/(dental|dent|stomat|odont)/u.test(value)) primary = "dental";
  else if (/(laborator|patholog|biochim|biochem)/u.test(value)) primary = "lab";
  else if (/(radiolog|diagnostic imaging|imaging|mri|ct scan)/u.test(value)) primary = "imaging";
  else if (/(hospital|clinical center|clinical centre|clinic hospital)/u.test(value)) primary = "hospital";
  else if (/(primary healthcare|primary health care|polyclinic|medical ambulatory|family medicine|health center|health centre)/u.test(value)) primary = "general_practitioner";

  const tags = [primary, "healthcare_facility", "armenia_uhif", "domestic_authority_registry"];
  for (const category of categories.slice(0, 8)) {
    const slug = normalizedKey(category).replaceAll(" ", "_").slice(0, 100);
    if (slug) tags.push(`service_category:${slug}`);
  }
  return { primary, tags: [...new Set(tags)] };
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

async function fetchActionPage(page, action, routerState, pageNum) {
  return await page.evaluate(async ({ action, routerState, pageNum }) => {
    const headers = {
      accept: "text/x-component",
      "content-type": "text/plain;charset=UTF-8",
      "next-action": action,
    };
    if (routerState) headers["next-router-state-tree"] = routerState;
    const response = await fetch("/en/hospitals", {
      method: "POST",
      headers,
      body: JSON.stringify([{ page: pageNum, search: "", region: "", serviceId: "", serviceGroupId: "", lang: "en" }]),
    });
    return { status: response.status, body: await response.text() };
  }, { action, routerState, pageNum });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: "en-US" });
let searchRequest = null;

page.on("request", (request) => {
  if (request.url() !== DIRECTORY_URL || request.method() !== "POST") return;
  const body = request.postData() || "";
  if (!body.includes('"page":1') || !body.includes('"serviceGroupId":""') || !body.includes('"lang":"en"')) return;
  searchRequest = { headers: request.headers(), body };
});

try {
  await page.goto(DIRECTORY_URL, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForTimeout(1200);
  if (!searchRequest) throw new Error("UHIF search server action was not observed");

  const action = searchRequest.headers["next-action"];
  const routerState = searchRequest.headers["next-router-state-tree"] || "";
  if (!action) throw new Error("UHIF search server action did not include Next-Action");

  const organizations = new Map();
  let reportedTotal = null;
  let terminalPage = null;

  for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum += 1) {
    const response = await fetchActionPage(page, action, routerState, pageNum);
    if (response.status !== 200) throw new Error(`UHIF page ${pageNum} returned HTTP ${response.status}`);
    const payload = parseRscData(response.body);
    if (!payload || !Array.isArray(payload.data) || !payload.pagination) {
      throw new Error(`UHIF page ${pageNum} did not return the expected data/pagination payload`);
    }

    const pageTotal = Number(payload.pagination.total);
    if (!Number.isInteger(pageTotal) || pageTotal < MIN_ORGANIZATIONS) {
      throw new Error(`UHIF reported an implausible total (${payload.pagination.total}) on page ${pageNum}`);
    }
    if (reportedTotal === null) reportedTotal = pageTotal;
    if (reportedTotal !== pageTotal) throw new Error(`UHIF total changed during sync: ${reportedTotal} -> ${pageTotal}`);

    for (const organization of payload.data) {
      const id = text(organization?.id);
      if (!id) throw new Error(`UHIF page ${pageNum} contained an organization without an id`);
      organizations.set(id, organization);
    }

    const hasMore = payload.pagination.hasMore === true;
    console.log(JSON.stringify({ page: pageNum, received: payload.data.length, uniqueOrganizations: organizations.size, total: reportedTotal, hasMore }));
    if (!hasMore) {
      terminalPage = pageNum;
      break;
    }
  }

  if (terminalPage === null) throw new Error(`UHIF pagination exceeded ${MAX_PAGES} pages`);
  if (reportedTotal === null || organizations.size !== reportedTotal) {
    throw new Error(`UHIF pagination incomplete: collected ${organizations.size} unique organizations but registry reports ${reportedTotal}`);
  }

  const rows = new Map();
  let organizationsWithoutBranches = 0;
  let branchesWithoutCoordinates = 0;

  for (const organization of organizations.values()) {
    const orgId = text(organization.id);
    const name = text(organization.name || organization.legalName);
    if (!name) continue;
    const branches = Array.isArray(organization.branches) ? organization.branches : [];
    if (!branches.length) organizationsWithoutBranches += 1;

    for (const branch of branches) {
      const branchId = text(branch?.id) || hash(`${orgId}|${branch?.address}|${branch?.latitude}|${branch?.longitude}`).slice(0, 24);
      const lat = Number(branch?.latitude);
      const lng = Number(branch?.longitude);
      if (!validCoordinates(lat, lng)) {
        branchesWithoutCoordinates += 1;
        continue;
      }

      const address = text(branch?.address);
      const region = text(branch?.region);
      const community = text(branch?.community);
      const phone = text(branch?.phone);
      const categories = Array.isArray(branch?.previewCategories) ? branch.previewCategories.map(text).filter(Boolean) : [];
      const classification = classify(name, categories);
      const formatted = [address, community, region, COUNTRY_NAME]
        .filter(Boolean)
        .filter((value, index, all) => all.findIndex((candidate) => normalizedKey(candidate) === normalizedKey(value)) === index)
        .join(", ");
      const sourceId = `am-uhif:${orgId}:${branchId}`;
      const masterKey = `loc:${hash(JSON.stringify({
        name: normalizedKey(name),
        address: normalizedKey(formatted),
        country: COUNTRY_CODE,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
      }))}`;
      const row = [
        sourceId, DIRECTORY_URL, name, normalizedKey(name), address, formatted,
        community || region, region, "", COUNTRY_CODE, lat, lng, phone, "", "",
        classification.primary, postgresArray(classification.tags), 0.995, masterKey,
      ];
      rows.set(sourceId, row);
    }
  }

  if (organizationsWithoutBranches > Math.max(5, Math.floor(reportedTotal * 0.02))) {
    throw new Error(`${organizationsWithoutBranches} UHIF organizations had no branches; refusing potentially incomplete output`);
  }
  if (rows.size < MIN_MAP_ROWS) {
    throw new Error(`Only ${rows.size} UHIF branch locations have official coordinates; refusing output`);
  }

  const sorted = [...rows.values()].sort((a, b) => String(a[2]).localeCompare(String(b[2])) || String(a[0]).localeCompare(String(b[0])));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${[COLUMNS.join("\t"), ...sorted.map((row) => row.map(csvField).join("\t"))].join("\n")}\n`, "utf8");
  console.log(JSON.stringify({
    source: "am_uhif_healthcare",
    organizations: organizations.size,
    reportedTotal,
    terminalPage,
    mapRows: sorted.length,
    organizationsWithoutBranches,
    branchesWithoutCoordinates,
    output: outputPath,
  }));
} finally {
  await page.close();
  await browser.close();
}

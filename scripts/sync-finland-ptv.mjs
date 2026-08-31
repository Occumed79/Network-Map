#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";

const API_BASE = "https://api.palvelutietovaranto.suomi.fi/api/v11";
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

function normalizedName(value) {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9åäö]+/giu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function numberValue(value) {
  const parsed = Number(text(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function localized(items, preferredLanguages = ["fi", "sv", "en"], preferredType = "") {
  if (!Array.isArray(items)) return "";
  const candidates = items.filter((item) => item && typeof item === "object");
  for (const language of preferredLanguages) {
    const exact = candidates.find((item) =>
      text(item.language).toLowerCase() === language &&
      (!preferredType || text(item.type).toLowerCase() === preferredType.toLowerCase()) &&
      text(item.value || item.name));
    if (exact) return text(exact.value || exact.name);
  }
  if (preferredType) {
    const typed = candidates.find((item) => text(item.type).toLowerCase() === preferredType.toLowerCase() && text(item.value || item.name));
    if (typed) return text(typed.value || typed.name);
  }
  const any = candidates.find((item) => text(item.value || item.name));
  return any ? text(any.value || any.name) : "";
}

function serviceName(serviceRelation) {
  const service = serviceRelation?.service;
  if (!service) return "";
  if (typeof service === "string") return service;
  return text(service.name) || localized(service.names) || localized(service.serviceNames);
}

function ontologyName(term) {
  return text(term?.name) || localized(term?.names) || localized(term?.ontologyTermNames);
}

function descriptionValues(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => text(item?.value || item?.name)).filter(Boolean);
}

const HEALTH_RE = /(terveys|terveydenhuol|terveysasema|terveyskesk|sairaal|sairaanhoit|lääk|laakar|hammas|suun\s*terv|laborator|kuvant|röntgen|rontgen|fysioterap|mielenterv|psykiatr|työterv|tyoterv|neuvol|rokot|apteek|häls|halsov|hälsov|sjukhus|läkar|lakare|tandv|laborator|röntgen|rontgen|fysioterap|mentalv|psykiatr|företagshäls|foretagshals|vaccin|apotek|health|healthcare|clinic|doctor|physician|hospital|dental|laboratory|imaging|radiolog|physiotherap|mental\s*health|psychiatr|occupational\s*health|vaccin|pharmacy)/iu;

function searchableText(channel) {
  const values = [
    localized(channel.serviceChannelNames, ["fi", "sv", "en"], "Name"),
    ...descriptionValues(channel.serviceChannelNames),
    ...descriptionValues(channel.serviceChannelDescriptions),
    ...(Array.isArray(channel.services) ? channel.services.map(serviceName) : []),
    ...(Array.isArray(channel.ontologyTerms) ? channel.ontologyTerms.map(ontologyName) : []),
  ];
  return values.filter(Boolean).join(" | ");
}

function classify(blob) {
  const value = blob.toLowerCase();
  const tags = new Set();
  if (/(työterv|tyoterv|företagshäls|foretagshals|occupational\s*health)/iu.test(value)) tags.add("occupational_health_clinic");
  if (/(hammas|suun\s*terv|tandv|dental|odont)/iu.test(value)) tags.add("dental");
  if (/(laborator|laboratory|näytteenotto|provtagning)/iu.test(value)) tags.add("lab");
  if (/(kuvant|röntgen|rontgen|radiolog|imaging|mri|magneett|ultraää|ultraljud|ct\b)/iu.test(value)) tags.add("imaging");
  if (/(sairaal|sjukhus|hospital|päivyst|jourmottag|emergency)/iu.test(value)) tags.add("hospital");
  if (/(apteek|apotek|pharmacy|rokot|vaccin)/iu.test(value)) tags.add("pharmacy_vaccination");
  if (/(erikoissairaan|specialist|psykiatr|kardiolog|cardiolog|ortoped|gastro|neurolog|keuhko|lung)/iu.test(value)) tags.add("specialist");
  if (!tags.size) tags.add("general_practitioner");
  const priority = [
    "occupational_health_clinic", "dental", "lab", "imaging", "hospital",
    "pharmacy_vaccination", "specialist", "general_practitioner",
  ];
  return { primary: priority.find((value) => tags.has(value)) || "general_practitioner", tags: [...tags] };
}

function addressFor(channel) {
  const addresses = Array.isArray(channel.addresses) ? channel.addresses : [];
  const ordered = [
    ...addresses.filter((address) => text(address?.type).toLowerCase() === "location"),
    ...addresses.filter((address) => text(address?.type).toLowerCase() !== "location"),
  ];
  for (const address of ordered) {
    const street = address?.streetAddress || {};
    const other = address?.otherAddress || {};
    const lat = numberValue(street.latitude ?? other.latitude);
    const lng = numberValue(street.longitude ?? other.longitude);
    if (lat === null || lng === null || lat < 59 || lat > 71.5 || lng < 18 || lng > 33.5) continue;

    const streetName = localized(street.street);
    const streetNumber = text(street.streetNumber);
    const line1 = [streetName, streetNumber].filter(Boolean).join(" ").trim()
      || localized(other.additionalInformation);
    const city = localized(street.postOffice)
      || localized(street.municipality?.names)
      || localized(street.municipality?.name)
      || localized(other.municipality?.names)
      || localized(other.municipality?.name);
    const postal = text(street.postalCode || other.postalCode);
    const formatted = [line1, [postal, city].filter(Boolean).join(" "), "Finland"].filter(Boolean).join(", ");
    return { line1, city, postal, formatted, lat, lng };
  }
  return null;
}

function firstPhone(channel) {
  for (const collection of [channel.phoneNumbers, channel.supportPhones]) {
    if (!Array.isArray(collection)) continue;
    for (const phone of collection) {
      const prefix = text(phone?.prefixNumber || phone?.countryCode);
      const number = text(phone?.number || phone?.phoneNumber || phone?.value);
      if (number) return [prefix, number].filter(Boolean).join(" ");
    }
  }
  return "";
}

function firstWebPage(channel) {
  if (!Array.isArray(channel.webPages)) return "";
  for (const page of channel.webPages) {
    const url = text(page?.url || page?.value);
    if (url) return url;
  }
  return "";
}

function firstEmail(channel) {
  if (!Array.isArray(channel.supportEmails)) return "";
  return localized(channel.supportEmails, ["fi", "sv", "en"]) || text(channel.supportEmails[0]?.value);
}

function postgresArray(values) {
  return `{${values.map((value) => `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`).join(",")}}`;
}

function csvField(value) {
  if (value === null || value === undefined || value === "") return "\\N";
  const encoded = String(value).replace(/[\t\r\n]+/gu, " ").replaceAll('"', '""');
  return `"${encoded}"`;
}

async function fetchJson(url) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json", "user-agent": "Occu-Med-Network-Map/1.0" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 4) await sleep(500 * attempt);
    }
  }
  throw lastError;
}

async function allServiceLocationIds() {
  const ids = [];
  let page = 1;
  let pageCount = 1;
  do {
    const payload = await fetchJson(`${API_BASE}/ServiceChannel/type/ServiceLocation?page=${page}`);
    const items = Array.isArray(payload?.itemList) ? payload.itemList : [];
    for (const item of items) {
      const id = text(item?.id);
      if (id) ids.push(id);
    }
    pageCount = Math.max(1, Number(payload?.pageCount || 1));
    if (!items.length && page < pageCount) throw new Error(`PTV returned an empty ID page ${page}/${pageCount}`);
    page += 1;
    await sleep(40);
  } while (page <= pageCount);
  return [...new Set(ids)];
}

async function serviceLocationBatch(ids) {
  const params = new URLSearchParams({ guids: ids.join(","), showHeader: "false" });
  const payload = await fetchJson(`${API_BASE}/ServiceChannel/list?${params.toString()}`);
  if (!Array.isArray(payload)) throw new Error("PTV ServiceChannel/list did not return an array");
  return payload.map((wrapper) => wrapper?.locationChannel).filter(Boolean);
}

function normalizedRow(channel) {
  const id = text(channel.id || channel.channelId);
  if (!id || text(channel.serviceChannelType).toLowerCase() !== "servicelocation") return null;
  const blob = searchableText(channel);
  if (!HEALTH_RE.test(blob)) return null;
  const address = addressFor(channel);
  if (!address) return null;

  const name = localized(channel.serviceChannelNames, ["fi", "sv", "en"], "Name")
    || localized(channel.serviceChannelNames, ["fi", "sv", "en"])
    || "Healthcare service location";
  const normalized = normalizedName(name);
  const classification = classify(blob);
  const masterKey = `loc:${hash(JSON.stringify({
    name: normalized,
    address: address.formatted.toLowerCase(),
    country: "FI",
    lat: Number(address.lat.toFixed(6)),
    lng: Number(address.lng.toFixed(6)),
  }))}`;

  return [
    `ptv:${id}`,
    `${API_BASE}/ServiceChannel/${encodeURIComponent(id)}`,
    name,
    normalized,
    address.line1,
    address.formatted,
    address.city,
    "",
    address.postal,
    "FI",
    address.lat,
    address.lng,
    firstPhone(channel),
    firstWebPage(channel),
    firstEmail(channel),
    classification.primary,
    postgresArray(classification.tags),
    0.98,
    masterKey,
  ];
}

const ids = await allServiceLocationIds();
if (!ids.length) throw new Error("PTV returned no published ServiceLocation identifiers");

const rows = new Map();
for (let offset = 0; offset < ids.length; offset += 100) {
  const batchIds = ids.slice(offset, offset + 100);
  const channels = await serviceLocationBatch(batchIds);
  for (const channel of channels) {
    const row = normalizedRow(channel);
    if (row) rows.set(row[0], row);
  }
  if ((offset / 100) % 20 === 0) {
    console.log(JSON.stringify({ scanned: Math.min(offset + batchIds.length, ids.length), totalServiceLocations: ids.length, healthcareLocations: rows.size }));
  }
  await sleep(60);
}

const sorted = [...rows.values()].sort((a, b) => String(a[2]).localeCompare(String(b[2])) || String(a[0]).localeCompare(String(b[0])));
fs.mkdirSync(new URL(".", `file://${outputPath}`).pathname, { recursive: true });
const lines = [columns.join("\t"), ...sorted.map((row) => row.map(csvField).join("\t"))];
fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(JSON.stringify({ source: "fi_ptv_healthcare", serviceLocationIds: ids.length, healthcareLocations: sorted.length, outputPath }));

#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const DATASET_API = "https://www.data.gouv.fr/api/1/datasets/finess-structures-1/";
const DATASET_URL = "https://www.data.gouv.fr/datasets/finess-structures-1";
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

function activeThrough(dateValue) {
  const value = text(dateValue);
  if (!value) return true;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return true;
  return parsed > Date.now();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "Occu-Med-Network-Map/1.0" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
  return await response.json();
}

function resourceDate(resource) {
  const raw = resource?.last_modified || resource?.modified || resource?.created_at || resource?.published || "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resourceLabel(resource) {
  return [resource?.title, resource?.name, resource?.description, resource?.url].map(text).join(" ").toLowerCase();
}

async function latestDailyResource() {
  const metadata = await fetchJson(DATASET_API);
  const resources = Array.isArray(metadata?.resources) ? metadata.resources : [];
  const compressedJson = resources.filter((resource) => {
    const label = resourceLabel(resource);
    return label.includes("json") && (label.includes(".gz") || text(resource?.format).toLowerCase().includes("json.gz"));
  });
  const daily = compressedJson.filter((resource) => resourceLabel(resource).includes("journalier"));
  const candidates = daily.length ? daily : compressedJson;
  candidates.sort((a, b) => resourceDate(b) - resourceDate(a));
  const selected = candidates[0];
  const url = text(selected?.url);
  if (!url) throw new Error("FINESS Structures metadata did not expose a downloadable JSON.GZ resource");
  return { url, title: text(selected?.title || selected?.name), modified: text(selected?.last_modified || selected?.modified) };
}

async function downloadStructures() {
  const resource = await latestDailyResource();
  console.log(JSON.stringify({ source: "fr_finess", resource }));
  const response = await fetch(resource.url, {
    headers: { accept: "application/gzip, application/octet-stream, application/json", "user-agent": "Occu-Med-Network-Map/1.0" },
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`FINESS download failed: HTTP ${response.status} ${response.statusText}`);
  const raw = Buffer.from(await response.arrayBuffer());
  const inflated = raw.length >= 2 && raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw) : raw;
  const payload = JSON.parse(inflated.toString("utf8"));
  if (!Array.isArray(payload?.pmej)) throw new Error("FINESS Structures payload did not contain pmej[]");
  return { payload, resource };
}

function coordinateAddress(addresses) {
  if (!Array.isArray(addresses)) return null;
  for (const address of addresses) {
    const geo = address?.coordonneesGeographique || {};
    const lat = numberValue(geo.directionLatitude ?? geo.latitude ?? geo.coordonneeY);
    const lng = numberValue(geo.directionLongitude ?? geo.longitude ?? geo.coordonneeX);
    if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) continue;

    const postal = text(address?.codePostal);
    const route = [text(address?.numeroVoie), text(address?.typeVoie), text(address?.libelleVoie)].filter(Boolean).join(" ");
    const line1 = text(address?.ligneQuatre) || route || text(address?.ligneTrois) || text(address?.ligneDeux) || text(address?.ligneUne);
    const shipment = text(address?.ligneAcheminement) || text(address?.ligneSix);
    const city = shipment
      ? shipment.replace(new RegExp(`^${postal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "i"), "").trim()
      : "";
    const formatted = [line1, shipment || [postal, city].filter(Boolean).join(" "), "France"].filter(Boolean).join(", ");
    return { line1, city, postal, formatted, lat, lng };
  }
  return null;
}

function contactFor(contacts) {
  if (!Array.isArray(contacts)) return { phone: "", email: "" };
  let phone = "";
  let email = "";
  for (const contact of contacts) {
    const telecom = contact?.telecom || {};
    if (!phone) phone = text(telecom.telephone);
    if (!email) email = text(telecom.courriel);
    if (phone && email) break;
  }
  return { phone, email };
}

function classify(name) {
  const value = normalizedName(name);
  let primary = "healthcare_facility";
  if (/(sante au travail|medecine du travail|service prevention.*sante.*travail|\bspsti\b)/u.test(value)) primary = "occupational_health_clinic";
  else if (/(dentaire|odont|chirurgien dent)/u.test(value)) primary = "dental";
  else if (/(laboratoire|biologie medicale|anatomo patholog)/u.test(value)) primary = "lab";
  else if (/(radiolog|imagerie|scanner|\birm\b|echograph)/u.test(value)) primary = "imaging";
  else if (/(centre hospitalier|hopital|\bchu\b|\bchru\b|polyclinique|clinique chirurgical)/u.test(value)) primary = "hospital";
  else if (/(pharmacie|vaccin|centre de vaccination)/u.test(value)) primary = "pharmacy_vaccination";
  else if (/(maison de sante|centre de sante|cabinet medical|medecine generale)/u.test(value)) primary = "general_practitioner";
  else if (/(cardiolog|pneumolog|psychiatr|orthoped|gastro enter|neurolog|specialis)/u.test(value)) primary = "specialist";

  const tags = primary === "healthcare_facility" ? ["healthcare_facility"] : [primary, "healthcare_facility"];
  return { primary, tags };
}

function postgresArray(values) {
  return `{${values.map((value) => `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`).join(",")}}`;
}

function csvField(value) {
  if (value === null || value === undefined || value === "") return "\\N";
  const encoded = String(value).replace(/[\t\r\n]+/gu, " ").replaceAll('"', '""');
  return `"${encoded}"`;
}

function normalizeEge(ege) {
  const info = ege?.informationsGeneralesEGE || {};
  const finessId = text(info.numFinessEge);
  if (!finessId || !activeThrough(info.dateFermeture)) return null;
  const address = coordinateAddress(ege?.adresse);
  if (!address) return null;
  const name = text(info.nomEgeLong) || text(info.nomEgeCourt) || `FINESS ${finessId}`;
  const normalized = normalizedName(name);
  const contact = contactFor(ege?.contact);
  const classification = classify(name);
  const masterKey = `loc:${hash(JSON.stringify({
    name: normalized,
    address: address.formatted.toLowerCase(),
    country: "FR",
    lat: Number(address.lat.toFixed(6)),
    lng: Number(address.lng.toFixed(6)),
  }))}`;

  return [
    `finess:${finessId}`,
    DATASET_URL,
    name,
    normalized,
    address.line1,
    address.formatted,
    address.city,
    "",
    address.postal,
    "FR",
    address.lat,
    address.lng,
    contact.phone,
    "",
    contact.email,
    classification.primary,
    postgresArray(classification.tags),
    0.99,
    masterKey,
  ];
}

const { payload, resource } = await downloadStructures();
const rows = new Map();
let scannedEge = 0;
for (const legalEntity of payload.pmej) {
  const eges = Array.isArray(legalEntity?.ege) ? legalEntity.ege : [];
  for (const ege of eges) {
    scannedEge += 1;
    const row = normalizeEge(ege);
    if (row) rows.set(row[0], row);
  }
}

const sorted = [...rows.values()].sort((a, b) => String(a[2]).localeCompare(String(b[2])) || String(a[0]).localeCompare(String(b[0])));
if (!sorted.length) throw new Error("FINESS normalization produced zero geocoded EGE facilities");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const lines = [columns.join("\t"), ...sorted.map((row) => row.map(csvField).join("\t"))];
fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(JSON.stringify({
  source: "fr_finess",
  generatedAt: payload.generatedAt || null,
  resource,
  scannedEge,
  geocodedFacilities: sorted.length,
  outputPath,
}));

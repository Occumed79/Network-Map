#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SOURCE_PAGE = "https://shgmturizmdb.saglik.gov.tr/TR-76664/yetkili-saglik-tesisleri.html";
const PDF_SOURCES = [
  {
    key: "hospital",
    url: "https://dosyamerkez.saglik.gov.tr/Eklenti/55803/0/hastanelerpdf.pdf?_tag1=3E9E6C411BF4011A5AA704A00F9F9947AD3D3CCD",
  },
  {
    key: "medical_center",
    url: "https://dosyamerkez.saglik.gov.tr/Eklenti/55804/0/tip-merkezleripdf.pdf?_tag1=39386B8AD70A0F916417E9B8EE1EE96CC2AF8CC3",
  },
  {
    key: "private_practice",
    url: "https://dosyamerkez.saglik.gov.tr/Eklenti/55806/0/muayenehanelerpdf.pdf?_tag1=1D9D85F9377115FB7EAFC9137408A43E8625AC1D",
  },
  {
    key: "other_health_facility",
    url: "https://dosyamerkez.saglik.gov.tr/Eklenti/55807/0/diger-saglik-tesisleripdf.pdf?_tag1=033A20599DD25185767AC3E9B9DA8E5CB7E802FE",
  },
];
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Occu-Med-Network-Map/1.0 (+https://github.com/Occumed79/Network-Map)";
const columns = [
  "source_record_id", "source_url", "name", "normalized_name", "address_line1",
  "formatted_address", "city", "state_region", "postal_code", "country_code",
  "lat", "lng", "phone", "website", "email", "primary_provider_type",
  "capability_tags", "quality_score", "master_key",
];

const PROVINCES = [
  "Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya","Ardahan","Artvin","Aydın",
  "Balıkesir","Bartın","Batman","Bayburt","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı",
  "Çorum","Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun",
  "Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul","İzmir","Kahramanmaraş","Karabük","Karaman","Kars",
  "Kastamonu","Kayseri","Kırıkkale","Kırklareli","Kırşehir","Kilis","Kocaeli","Konya","Kütahya","Malatya","Manisa",
  "Mardin","Mersin","Muğla","Muş","Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya","Samsun","Şanlıurfa","Siirt",
  "Sinop","Şırnak","Sivas","Tekirdağ","Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak",
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
    .replaceAll("ı", "i").replaceAll("İ", "I")
    .replaceAll("ş", "s").replaceAll("Ş", "S")
    .replaceAll("ç", "c").replaceAll("Ç", "C")
    .replaceAll("ğ", "g").replaceAll("Ğ", "G")
    .replaceAll("ö", "o").replaceAll("Ö", "O")
    .replaceAll("ü", "u").replaceAll("Ü", "U")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

const PROVINCE_LOOKUP = new Map(PROVINCES.map((province) => [normalized(province), province]));
const PROVINCE_NAMES = [...PROVINCE_LOOKUP.keys()].sort((a, b) => b.length - a.length);

function validCoordinates(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 35.5 && lat <= 42.3 && lng >= 25.4 && lng <= 45.0;
}

async function downloadPdf(url, filePath) {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "application/pdf,*/*", referer: SOURCE_PAGE },
    redirect: "follow",
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Turkey MOH PDF HTTP ${response.status}: ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 10_000 || !buffer.subarray(0, 5).toString("ascii").startsWith("%PDF")) {
    throw new Error(`Turkey MOH download was not a valid PDF: ${url}`);
  }
  fs.writeFileSync(filePath, buffer);
}

function extractPdfText(pdfPath, txtPath) {
  const result = spawnSync("pdftotext", ["-layout", pdfPath, txtPath], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`pdftotext failed: ${text(result.stderr) || `exit ${result.status}`}`);
  const raw = fs.readFileSync(txtPath, "utf8");
  if (raw.length < 200) throw new Error(`Turkey MOH PDF yielded no usable text: ${pdfPath}`);
  return raw;
}

function stripNoise(line) {
  return text(line)
    .replace(/^\s*(?:\d{1,5}[.)\-]?\s+)+/u, "")
    .replace(/\s+/gu, " ")
    .replace(/\b(?:sayfa|page)\s*\d+\b/giu, "")
    .trim();
}

function parseProvinceLine(line) {
  const clean = stripNoise(line);
  if (!clean || clean.length < 5) return null;
  const key = normalized(clean);
  if (/^(il|sira no|saglik tesisi|saglik tesisi adi|kurum adi|yetkili|uluslararasi saglik turizmi)/u.test(key)) return null;

  for (const provinceKey of PROVINCE_NAMES) {
    const province = PROVINCE_LOOKUP.get(provinceKey);
    if (!province) continue;
    if (key === provinceKey) return { province, remainder: "" };
    if (key.startsWith(`${provinceKey} `)) {
      const tokens = clean.split(/\s+/gu);
      const normalizedTokens = [];
      let consumed = 0;
      for (const token of tokens) {
        normalizedTokens.push(normalized(token));
        consumed += 1;
        if (normalized(normalizedTokens.join(" ")) === provinceKey) break;
      }
      return { province, remainder: tokens.slice(consumed).join(" ").trim() };
    }
    if (key.endsWith(` ${provinceKey}`)) {
      const lastIndex = normalized(clean).lastIndexOf(` ${provinceKey}`);
      const remainder = lastIndex > 0 ? clean.slice(0, Math.max(0, clean.length - province.length)).trim() : "";
      return { province, remainder };
    }
  }
  return null;
}

function parseFacilities(raw, sourceKey) {
  const lines = raw.replace(/\f/gu, "\n").split(/\r?\n/gu);
  const output = [];
  let currentProvince = "";
  for (const original of lines) {
    const clean = stripNoise(original);
    if (!clean) continue;
    const parsed = parseProvinceLine(clean);
    if (parsed) {
      currentProvince = parsed.province;
      if (parsed.remainder && normalized(parsed.remainder).length >= 3) {
        output.push({ name: parsed.remainder, province: currentProvince, sourceKey });
      }
      continue;
    }
    if (!currentProvince) continue;
    const key = normalized(clean);
    if (/(saglik turizmi|yetki belgesi|saglik hizmetleri genel|saglik bakanligi|sira no|tesis adi|toplam)/u.test(key)) continue;
    if (/^\d+$/u.test(clean)) continue;
    if (clean.length < 4 || clean.length > 180) continue;
    if (/^(www\.|http|tel\.?|telefon|adres|e posta|email)/iu.test(clean)) continue;
    output.push({ name: clean, province: currentProvince, sourceKey });
  }
  return output;
}

function likelyFacilityName(name) {
  const value = normalized(name);
  if (!value || value.length < 3) return false;
  if (/^(il|ilce|saglik|tesisi|adi|sira|no|yetkili|liste|listesi)$/u.test(value)) return false;
  return /[a-z]/u.test(value);
}

function classify(name, sourceKey) {
  const value = normalized(name);
  let primary = "healthcare_facility";
  if (sourceKey === "hospital" || /(hastane|hospital)/u.test(value)) primary = "hospital";
  else if (/(dis|dental|agiz|stomat)/u.test(value)) primary = "dental";
  else if (/(laboratu|patolog|biyokim)/u.test(value)) primary = "lab";
  else if (/(goruntuleme|radyolog|mr |tomografi|ultrason|diagnost)/u.test(value)) primary = "imaging";
  else if (sourceKey === "medical_center" || /(tip merkezi|tibbi merkez|poliklinik)/u.test(value)) primary = "general_practitioner";
  else if (sourceKey === "private_practice") primary = "specialist";
  else if (/(kardiy|norolog|psikiy|ortop|gastro|goz|urolo|kadin dogum|fizik tedavi)/u.test(value)) primary = "specialist";
  const tags = primary === "healthcare_facility" ? ["healthcare_facility"] : [primary, "healthcare_facility"];
  return { primary, tags: [...tags, "turkey_moh_health_tourism_authorized", sourceKey] };
}

async function geocode(name, province) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "tr");
  url.searchParams.set("q", `${name}, ${province}, Türkiye`);
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, "accept-language": "tr,en" },
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
    address1: text(address.road) || text(address.neighbourhood) || text(address.suburb),
    city: text(address.city) || text(address.town) || text(address.municipality) || text(address.county) || province,
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

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "turkey-health-tourism-"));
const candidates = new Map();
for (const source of PDF_SOURCES) {
  const pdfPath = path.join(tempDir, `${source.key}.pdf`);
  const txtPath = path.join(tempDir, `${source.key}.txt`);
  await downloadPdf(source.url, pdfPath);
  for (const entry of parseFacilities(extractPdfText(pdfPath, txtPath), source.key)) {
    if (!likelyFacilityName(entry.name)) continue;
    const key = `${normalized(entry.name)}|${normalized(entry.province)}`;
    const previous = candidates.get(key);
    if (!previous || source.key === "hospital") candidates.set(key, entry);
  }
}
if (candidates.size < 150) throw new Error(`Only ${candidates.size} Turkey authorized facility candidates parsed; refusing sync`);

const rows = [];
let lastGeocodeAt = 0;
let skippedUnplaced = 0;
for (const entry of candidates.values()) {
  const wait = 1050 - (Date.now() - lastGeocodeAt);
  if (wait > 0) await sleep(wait);
  let geo = await geocode(entry.name, entry.province);
  lastGeocodeAt = Date.now();
  if (!geo) {
    const shortened = entry.name
      .replace(/\b(ozel|özel|saglik|sağlık|hizmetleri|ticaret|limited|ltd|sti|şti|anonim|as|a s)\b/giu, " ")
      .replace(/\s+/gu, " ").trim();
    if (shortened && shortened !== entry.name) {
      const waitRetry = 1050 - (Date.now() - lastGeocodeAt);
      if (waitRetry > 0) await sleep(waitRetry);
      geo = await geocode(shortened, entry.province);
      lastGeocodeAt = Date.now();
    }
  }
  if (!geo) { skippedUnplaced += 1; continue; }

  const classification = classify(entry.name, entry.sourceKey);
  const sourceId = `tr-moh-tourism:${hash(`${normalized(entry.name)}|${normalized(entry.province)}`).slice(0, 22)}`;
  const formatted = [geo.address1, geo.postal, geo.city, entry.province, "Türkiye"].filter(Boolean).join(", ");
  const masterKey = `loc:${hash(JSON.stringify({
    name: normalized(entry.name), address: formatted.toLowerCase(), country: "TR",
    lat: Number(geo.lat.toFixed(6)), lng: Number(geo.lng.toFixed(6)),
  }))}`;
  rows.push([
    sourceId, SOURCE_PAGE, entry.name, normalized(entry.name), geo.address1, formatted, geo.city,
    entry.province, geo.postal, "TR", geo.lat, geo.lng, "", "", "", classification.primary,
    postgresArray(classification.tags), 0.95, masterKey,
  ]);
}
if (rows.length < 100) throw new Error(`Only ${rows.length} Turkey MOH authorized facilities were map-renderable; refusing output`);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${[columns.join("\t"), ...rows.sort((a, b) => String(a[2]).localeCompare(String(b[2]))).map((row) => row.map(csvField).join("\t"))].join("\n")}\n`, "utf8");
console.log(JSON.stringify({ source: "tr_moh_health_tourism", parsedCandidates: candidates.size, mapRows: rows.length, skippedUnplaced, outputPath }));

#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const BASE = "https://data-archive.hhfa.online/index.php";
const OUTPUT_DIR = path.resolve("data/generated/who-hhfa-sara");
const MAX_CATALOG_ID = 220;
const MAX_REPORT_BYTES = 45 * 1024 * 1024;

const PHRASES = [
  /general service readiness/iu,
  /general readiness index/iu,
  /service readiness index/iu,
  /service availability index/iu,
  /basic amenities/iu,
  /basic equipment/iu,
  /standard precautions/iu,
  /diagnostic capacity/iu,
  /essential medicines/iu,
  /capacit[eé] op[eé]rationnelle g[eé]n[eé]rale/iu,
  /indice de disponibilit[eé]/iu,
  /[eé]quipements de base/iu,
  /pr[eé]cautions standard/iu,
  /capacit[eé] diagnostique/iu,
  /m[eé]dicaments essentiels/iu,
  /capacidade operacional geral/iu,
  /disponibilidade geral dos servi[cç]os/iu,
  /equipamentos b[aá]sicos/iu,
  /medicamentos essenciais/iu,
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchResponse(url, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 90_000);
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: {
          Accept: options.accept ?? "*/*",
          "User-Agent": "Occu-Med-Network-Map/1.0 WHO-HHFA-SARA-archive",
        },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < 4) await sleep(attempt * 1500);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

async function fetchJson(url) {
  const response = await fetchResponse(url, { accept: "application/json" });
  return response.json();
}

async function fetchText(url) {
  const response = await fetchResponse(url, { accept: "text/html,application/xhtml+xml" });
  return response.text();
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/gu, " ").trim();
}

function yearFromMetadata(metadata) {
  const info = metadata?.study_desc?.study_info ?? {};
  const dates = Array.isArray(info.coll_dates) ? info.coll_dates : [];
  for (const candidate of [dates[0]?.end, dates[0]?.start, metadata?.study_desc?.version_statement?.version_date]) {
    const match = String(candidate ?? "").match(/(?:19|20)\d{2}/u);
    if (match) return Number(match[0]);
  }
  return null;
}

function countryFromMetadata(metadata) {
  const nations = metadata?.study_desc?.study_info?.nation;
  const first = Array.isArray(nations) ? nations[0] : null;
  return {
    name: cleanText(first?.name),
    code: cleanText(first?.abbreviation).toUpperCase(),
  };
}

function collectionType(metadata) {
  const title = cleanText(metadata?.study_desc?.title_statement?.title).toUpperCase();
  const idno = cleanText(metadata?.study_desc?.title_statement?.idno).toUpperCase();
  if (title.includes("HHFA") || title.includes("HARMONIZED") || title.includes("HARMONISED") || idno.includes("HHFA")) return "HHFA";
  if (title.includes("SARA") || idno.includes("SARA")) return "SARA";
  if (title.includes("SERVICE AVAILABILITY MAPPING") || idno.includes("SAM")) return "SAM";
  return "HFA_OTHER";
}

function findReportLinks(html, catalogId) {
  const links = new Set();
  const regex = new RegExp(`(?:https://data-archive\\.hhfa\\.online)?/index\\.php/catalog/${catalogId}/download/\\d+`, "giu");
  for (const match of html.matchAll(regex)) {
    const raw = match[0];
    links.add(raw.startsWith("http") ? raw : `https://data-archive.hhfa.online${raw}`);
  }
  return [...links];
}

function reportSnippets(text) {
  const pages = text.split("\f");
  const hits = [];
  pages.forEach((page, pageIndex) => {
    const lines = page.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
    lines.forEach((line, lineIndex) => {
      if (!PHRASES.some((pattern) => pattern.test(line))) return;
      const start = Math.max(0, lineIndex - 2);
      const end = Math.min(lines.length, lineIndex + 4);
      hits.push({
        page: pageIndex + 1,
        line: lineIndex + 1,
        text: lines.slice(start, end).join(" | ").slice(0, 1400),
      });
    });
  });
  const unique = [];
  const seen = new Set();
  for (const hit of hits) {
    const key = `${hit.page}:${hit.text}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(hit);
    }
  }
  return unique.slice(0, 120);
}

async function downloadAndExtract(reportUrl, catalogId, reportIndex) {
  const response = await fetchResponse(reportUrl, { accept: "application/pdf,*/*", timeoutMs: 180_000 });
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REPORT_BYTES) throw new Error(`Report exceeds ${MAX_REPORT_BYTES} bytes`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_REPORT_BYTES) throw new Error(`Downloaded report exceeds ${MAX_REPORT_BYTES} bytes`);
  const tempPdf = path.join(os.tmpdir(), `hhfa-${catalogId}-${reportIndex}.pdf`);
  const tempTxt = path.join(os.tmpdir(), `hhfa-${catalogId}-${reportIndex}.txt`);
  await fs.writeFile(tempPdf, bytes);
  try {
    await execFileAsync("pdftotext", ["-layout", "-enc", "UTF-8", tempPdf, tempTxt], { timeout: 180_000, maxBuffer: 10 * 1024 * 1024 });
    const text = await fs.readFile(tempTxt, "utf8");
    return {
      bytes: bytes.byteLength,
      pages: text.split("\f").length,
      text_characters: text.length,
      candidate_snippets: reportSnippets(text),
    };
  } finally {
    await fs.rm(tempPdf, { force: true });
    await fs.rm(tempTxt, { force: true });
  }
}

async function inspectCatalogId(catalogId) {
  let metadata;
  try {
    metadata = await fetchJson(`${BASE}/metadata/export/${catalogId}/json`);
  } catch {
    return null;
  }
  const title = cleanText(metadata?.study_desc?.title_statement?.title);
  const referenceId = cleanText(metadata?.study_desc?.title_statement?.idno);
  if (!title || !referenceId) return null;

  const country = countryFromMetadata(metadata);
  const relatedUrl = `${BASE}/catalog/${catalogId}/related-materials`;
  let reportLinks = [];
  try {
    reportLinks = findReportLinks(await fetchText(relatedUrl), catalogId);
  } catch {
    reportLinks = [];
  }

  return {
    catalog_id: catalogId,
    reference_id: referenceId,
    title,
    country_name: country.name,
    country_code_reported: country.code || null,
    survey_year: yearFromMetadata(metadata),
    collection_type: collectionType(metadata),
    producer: cleanText(metadata?.study_desc?.authoring_entity?.[0]?.name),
    data_collection_start: metadata?.study_desc?.study_info?.coll_dates?.[0]?.start ?? null,
    data_collection_end: metadata?.study_desc?.study_info?.coll_dates?.[0]?.end ?? null,
    analysis_unit: cleanText(metadata?.study_desc?.study_info?.analysis_unit),
    metadata_url: `${BASE}/metadata/export/${catalogId}/json`,
    catalog_url: `${BASE}/catalog/${catalogId}`,
    related_materials_url: relatedUrl,
    report_urls: reportLinks,
    metadata,
  };
}

async function mapPool(values, concurrency, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= values.length) return;
      try {
        results[index] = await mapper(values[index], index);
      } catch (error) {
        results[index] = { error: String(error?.message || error), value: values[index] };
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

async function main() {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const catalogIds = Array.from({ length: MAX_CATALOG_ID }, (_, index) => index + 1);
  const discovered = (await mapPool(catalogIds, 10, inspectCatalogId)).filter((entry) => entry && !entry.error);
  discovered.sort((a, b) => a.catalog_id - b.catalog_id);

  const reportJobs = [];
  for (const survey of discovered) {
    survey.report_urls.forEach((url, reportIndex) => reportJobs.push({ survey, url, reportIndex }));
  }

  const extracted = await mapPool(reportJobs, 3, async ({ survey, url, reportIndex }) => {
    try {
      const result = await downloadAndExtract(url, survey.catalog_id, reportIndex);
      return {
        catalog_id: survey.catalog_id,
        reference_id: survey.reference_id,
        title: survey.title,
        country_name: survey.country_name,
        survey_year: survey.survey_year,
        collection_type: survey.collection_type,
        report_url: url,
        ...result,
      };
    } catch (error) {
      return {
        catalog_id: survey.catalog_id,
        reference_id: survey.reference_id,
        title: survey.title,
        country_name: survey.country_name,
        survey_year: survey.survey_year,
        collection_type: survey.collection_type,
        report_url: url,
        error: String(error?.message || error),
      };
    }
  });

  const summary = {
    generated_at: new Date().toISOString(),
    official_archive: "https://data-archive.hhfa.online/index.php/catalog",
    surveys_discovered: discovered.length,
    surveys_by_type: Object.fromEntries([...new Set(discovered.map((item) => item.collection_type))].sort().map((type) => [type, discovered.filter((item) => item.collection_type === type).length])),
    countries: new Set(discovered.map((item) => item.country_name).filter(Boolean)).size,
    report_links: reportJobs.length,
    reports_extracted: extracted.filter((item) => !item.error).length,
    reports_failed: extracted.filter((item) => item.error).length,
    candidate_snippets: extracted.reduce((sum, item) => sum + (item.candidate_snippets?.length ?? 0), 0),
    limitations: [
      "The WHO HHFA archive currently publishes reports and metadata, while survey microdata is generally not available.",
      "Candidate snippets are discovery aids only and are not automatically loaded into Neon.",
      "Only values that can be independently verified in report tables will be normalized and ingested.",
    ],
  };

  await fs.writeFile(path.join(OUTPUT_DIR, "catalog.json"), JSON.stringify(discovered, null, 2), "utf8");
  await fs.writeFile(path.join(OUTPUT_DIR, "report-extraction-candidates.json"), JSON.stringify(extracted, null, 2), "utf8");
  await fs.writeFile(path.join(OUTPUT_DIR, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

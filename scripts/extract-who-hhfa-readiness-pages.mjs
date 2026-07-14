#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const OUTPUT_DIR = path.resolve("data/generated/who-hhfa-readiness-pages");
const MAX_BYTES = 65 * 1024 * 1024;

const REPORTS = [
  { catalog_id: 143, country: "Ghana", survey_year: 2023, url: "https://data-archive.hhfa.online/index.php/catalog/143/download/157" },
  { catalog_id: 143, country: "Ghana", survey_year: 2023, url: "https://data-archive.hhfa.online/index.php/catalog/143/download/158" },
  { catalog_id: 144, country: "Somalia", survey_year: 2023, url: "https://data-archive.hhfa.online/index.php/catalog/144/download/159" },
  { catalog_id: 146, country: "Maldives", survey_year: 2023, url: "https://data-archive.hhfa.online/index.php/catalog/146/download/164" },
  { catalog_id: 147, country: "Uganda", survey_year: 2023, url: "https://data-archive.hhfa.online/index.php/catalog/147/download/165" },
  { catalog_id: 148, country: "Burundi", survey_year: 2023, url: "https://data-archive.hhfa.online/index.php/catalog/148/download/166" },
  { catalog_id: 150, country: "Cote d'Ivoire", survey_year: 2023, url: "https://data-archive.hhfa.online/index.php/catalog/150/download/168" },
  { catalog_id: 111, country: "Kenya", survey_year: 2018, url: "https://data-archive.hhfa.online/index.php/catalog/111/download/123" },
  { catalog_id: 49, country: "Ethiopia", survey_year: 2018, url: "https://data-archive.hhfa.online/index.php/catalog/49/download/59" },
];

const MATCHERS = [
  /general service readiness/iu,
  /general readiness index/iu,
  /general service readiness index/iu,
  /service readiness index/iu,
  /basic amenities/iu,
  /basic equipment/iu,
  /standard precautions/iu,
  /diagnostic capacity/iu,
  /essential medicines/iu,
  /capacit[eé] op[eé]rationnelle g[eé]n[eé]rale/iu,
  /indice g[eé]n[eé]ral de capacit[eé]/iu,
  /indice de disponibilit[eé] et de capacit[eé]/iu,
  /[eé]quipements de base/iu,
  /pr[eé]cautions standard/iu,
  /capacit[eé] diagnostique/iu,
  /m[eé]dicaments essentiels/iu,
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function download(url) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180_000);
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: {
          Accept: "application/pdf,*/*",
          "User-Agent": "Occu-Med-Network-Map/1.0 WHO-HHFA-readiness-verification",
        },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length || bytes.length > MAX_BYTES) throw new Error(`Invalid report size ${bytes.length}`);
      return bytes;
    } catch (error) {
      lastError = error;
      if (attempt < 5) await sleep(attempt * 2000);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function normalizePage(page) {
  return page.replace(/\u0000/gu, "").replace(/[ \t]+$/gmu, "").trim();
}

function findPages(pages) {
  const direct = new Set();
  pages.forEach((page, index) => {
    if (MATCHERS.some((pattern) => pattern.test(page))) direct.add(index);
  });

  const expanded = new Set();
  for (const index of direct) {
    for (let offset = -1; offset <= 1; offset += 1) {
      const pageIndex = index + offset;
      if (pageIndex >= 0 && pageIndex < pages.length) expanded.add(pageIndex);
    }
  }

  // Keep the artifact bounded while retaining the first and last readiness sections.
  const selected = [...expanded].sort((a, b) => a - b);
  if (selected.length <= 45) return selected;
  return [...selected.slice(0, 30), ...selected.slice(-15)];
}

async function extractReport(report, index) {
  const pdfPath = path.join(os.tmpdir(), `hhfa-readiness-${index}.pdf`);
  const textPath = path.join(os.tmpdir(), `hhfa-readiness-${index}.txt`);
  try {
    const bytes = await download(report.url);
    await fs.writeFile(pdfPath, bytes);
    await execFileAsync("pdftotext", ["-layout", "-enc", "UTF-8", pdfPath, textPath], {
      timeout: 240_000,
      maxBuffer: 20 * 1024 * 1024,
    });
    const text = await fs.readFile(textPath, "utf8");
    const pages = text.split("\f").map(normalizePage);
    const selectedPages = findPages(pages);
    return {
      ...report,
      report_bytes: bytes.length,
      total_pdf_pages: pages.length,
      matched_pages: selectedPages.map((pageIndex) => ({
        pdf_page: pageIndex + 1,
        text: pages[pageIndex].slice(0, 30000),
      })),
    };
  } catch (error) {
    return { ...report, error: String(error?.message || error) };
  } finally {
    await fs.rm(pdfPath, { force: true });
    await fs.rm(textPath, { force: true });
  }
}

async function main() {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const results = [];
  for (let index = 0; index < REPORTS.length; index += 1) {
    const report = REPORTS[index];
    console.log(`Extracting ${report.country}: ${report.url}`);
    results.push(await extractReport(report, index));
  }

  const summary = {
    generated_at: new Date().toISOString(),
    official_archive: "https://data-archive.hhfa.online/index.php/catalog",
    reports_requested: REPORTS.length,
    reports_extracted: results.filter((item) => !item.error).length,
    reports_failed: results.filter((item) => item.error).length,
    countries: new Set(results.filter((item) => !item.error).map((item) => item.country)).size,
    matched_pages: results.reduce((sum, item) => sum + (item.matched_pages?.length ?? 0), 0),
    neon_rows_created: 0,
    note: "This artifact contains source report pages for human verification. No values are automatically inserted into Neon.",
  };

  await fs.writeFile(path.join(OUTPUT_DIR, "readiness-pages.json"), JSON.stringify(results, null, 2), "utf8");
  await fs.writeFile(path.join(OUTPUT_DIR, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

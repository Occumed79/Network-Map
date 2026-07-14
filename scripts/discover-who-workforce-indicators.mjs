#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = path.resolve("data/generated/who-workforce");
const CATALOG_URL = "https://ghoapi.azureedge.net/api/Indicator?$format=json";

const TARGET_TERMS = [
  "medical doctor",
  "physician",
  "nursing",
  "midwif",
  "dentist",
  "dentistry",
  "pharmac",
  "laboratory",
  "radiograph",
  "medical imaging",
  "physiotherap",
  "occupational health",
  "environmental health",
  "community health worker",
  "ambulance",
  "paramedic",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Occu-Med-Network-Map/1.0 WHO-workforce-discovery",
        },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 5) await sleep(attempt * 2000);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function normalizeCatalog(payload) {
  if (Array.isArray(payload?.value)) return payload.value;
  if (Array.isArray(payload)) return payload;
  return [];
}

function pickText(row) {
  return [
    row?.IndicatorName,
    row?.IndicatorCode,
    row?.Language,
  ].filter(Boolean).join(" ").toLowerCase();
}

async function main() {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const payload = await fetchJson(CATALOG_URL);
  const catalog = normalizeCatalog(payload);
  if (!catalog.length) throw new Error("WHO GHO indicator catalog returned no rows");

  const matches = catalog
    .filter((row) => TARGET_TERMS.some((term) => pickText(row).includes(term)))
    .map((row) => ({
      indicator_code: row.IndicatorCode ?? row.Code ?? row.Id ?? null,
      indicator_name: row.IndicatorName ?? row.Name ?? null,
      language: row.Language ?? null,
    }))
    .filter((row) => row.indicator_code && row.indicator_name)
    .sort((a, b) => a.indicator_name.localeCompare(b.indicator_name));

  await fs.writeFile(
    path.join(OUTPUT_DIR, "who-workforce-indicator-catalog.json"),
    JSON.stringify({
      generated_at: new Date().toISOString(),
      source: "WHO Global Health Observatory OData API",
      catalog_url: CATALOG_URL,
      catalog_rows: catalog.length,
      matching_rows: matches.length,
      target_terms: TARGET_TERMS,
      matches,
    }, null, 2),
    "utf8",
  );

  console.log(`WHO indicator catalog rows: ${catalog.length}`);
  console.log(`Workforce-related matches: ${matches.length}`);
  for (const row of matches) console.log(`${row.indicator_code}\t${row.indicator_name}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

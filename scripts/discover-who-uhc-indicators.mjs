#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const API_ROOT = "https://ghoapi.azureedge.net/api";
const OUTPUT_DIR = path.resolve("data/generated/who-uhc");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url) {
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Occu-Med-Network-Map/1.0 WHO-UHC-indicator-discovery",
        },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 6) await sleep(attempt * 2500);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function rowsFromPayload(payload) {
  if (Array.isArray(payload?.value)) return payload.value;
  if (Array.isArray(payload)) return payload;
  return [];
}

function field(row, ...names) {
  for (const name of names) {
    if (row?.[name] !== null && row?.[name] !== undefined) return String(row[name]);
  }
  return "";
}

function normalize(row) {
  const code = field(row, "IndicatorCode", "Code", "indicatorCode").trim();
  const name = field(row, "IndicatorName", "Title", "Name", "indicatorName").trim();
  const language = field(row, "Language", "language").trim();
  return { code, name, language, raw: row };
}

function isUhcServiceCoverage(item) {
  const text = `${item.code} ${item.name}`.toLowerCase();
  const positive = [
    "universal health coverage",
    "uhc service coverage",
    "service coverage index",
    "coverage of essential health services",
    "sdg 3.8.1",
    "sdg3.8.1",
    "uhc index",
  ].some((term) => text.includes(term));

  const financial = [
    "financial hardship",
    "catastrophic",
    "household expenditure",
    "out-of-pocket",
    "out of pocket",
    "financial protection",
    "sdg 3.8.2",
    "sdg3.8.2",
  ].some((term) => text.includes(term));

  return positive && !financial;
}

async function main() {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const sourceUrl = `${API_ROOT}/Indicator?$format=json`;
  const payload = await fetchJson(sourceUrl);
  const all = rowsFromPayload(payload).map(normalize).filter((item) => item.code && item.name);
  const matches = all.filter(isUhcServiceCoverage).sort((a, b) => a.code.localeCompare(b.code));

  const result = {
    discovered_at: new Date().toISOString(),
    source_url: sourceUrl,
    source: "WHO Global Health Observatory indicator catalog",
    total_catalog_indicators: all.length,
    matched_indicators: matches.length,
    exclusion_rule: "Financial-protection, catastrophic-spending, household-expenditure, and SDG 3.8.2 indicators excluded",
    indicators: matches.map(({ code, name, language, raw }) => ({ code, name, language, raw })),
  };

  await fs.writeFile(path.join(OUTPUT_DIR, "indicator-discovery.json"), JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify(result, null, 2));

  if (!matches.length) throw new Error("No WHO UHC service-coverage indicators matched the catalog");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

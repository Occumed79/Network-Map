#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = path.resolve("data/generated/international");
const CHUNK_SIZE = 250;

const INDICATORS = {
  "SH.MED.PHYS.ZS": ["Physicians (per 1,000 people)", "per 1,000 people"],
  "SH.MED.NUMW.P3": ["Nurses and midwives (per 1,000 people)", "per 1,000 people"],
  "SH.MED.BEDS.ZS": ["Hospital beds (per 1,000 people)", "per 1,000 people"],
  "SH.UHC.SRVS.CV.XD": ["UHC service coverage index", "index (0-100)"],
  "SP.RUR.TOTL.ZS": ["Rural population (% of total population)", "% of total population"],
  "EN.POP.DNST": ["Population density (people per sq. km of land area)", "people per sq. km"],
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url) {
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Occu-Med-Network-Map/1.0 official-data-import" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 6) await sleep(attempt * 2000);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function sqlString(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value ?? {}))}::jsonb`;
}

function tuple(row) {
  return `(${[
    sqlString(row.indicator_code),
    sqlString(row.indicator_name),
    sqlString(row.country_code),
    sqlString(row.country_name),
    "NULL",
    "NULL",
    "'country'",
    row.year,
    row.value,
    sqlString(row.unit),
    "'World Bank Indicators API'",
    sqlString(row.source_url),
    `${sqlString(row.retrieved_at)}::timestamptz`,
    sqlJson(row.metadata),
  ].join(", ")})`;
}

function makeSql(rows) {
  return `BEGIN;\nINSERT INTO public.international_health_indicators (\n  indicator_code, indicator_name, country_code, country_name, admin1_code, admin1_name,\n  geography_level, year, value, unit, source_name, source_url, source_updated_at, metadata\n) VALUES\n${rows.map(tuple).join(",\n")}\nON CONFLICT (indicator_code, country_code, (COALESCE(admin1_code, '')), geography_level, year, source_name)\nDO UPDATE SET\n  indicator_name = EXCLUDED.indicator_name,\n  country_name = EXCLUDED.country_name,\n  value = EXCLUDED.value,\n  unit = EXCLUDED.unit,\n  source_url = EXCLUDED.source_url,\n  source_updated_at = EXCLUDED.source_updated_at,\n  metadata = EXCLUDED.metadata,\n  updated_at = now();\nCOMMIT;\n`;
}

async function main() {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const countryPayload = await fetchJson("https://api.worldbank.org/v2/country?format=json&per_page=400");
  const countryRows = Array.isArray(countryPayload?.[1]) ? countryPayload[1] : [];
  const countries = new Map(
    countryRows
      .filter((row) => row?.region?.id && /^[A-Z]{3}$/.test(row?.id || ""))
      .map((row) => [row.id, row.name]),
  );

  const retrievedAt = new Date().toISOString();
  const normalized = [];
  const counts = {};
  const failures = {};

  for (const [indicatorCode, [indicatorName, unit]] of Object.entries(INDICATORS)) {
    const sourceUrl = `https://api.worldbank.org/v2/country/all/indicator/${indicatorCode}?format=json&per_page=1000&mrv=1`;
    let payload;
    try {
      payload = await fetchJson(sourceUrl);
    } catch (error) {
      const message = String(error?.message || error);
      counts[indicatorCode] = 0;
      failures[indicatorCode] = message;
      console.error(`${indicatorCode}: unavailable after retries — ${message}`);
      continue;
    }

    const observations = Array.isArray(payload?.[1]) ? payload[1] : [];
    if (!observations.length) {
      counts[indicatorCode] = 0;
      failures[indicatorCode] = "No observation array returned by the World Bank API";
      console.error(`${indicatorCode}: no observations returned`);
      continue;
    }

    const latest = new Map();
    for (const observation of observations) {
      const countryCode = String(observation?.countryiso3code || "").toUpperCase();
      const year = Number(observation?.date);
      const value = Number(observation?.value);
      if (!countries.has(countryCode) || !Number.isInteger(year) || !Number.isFinite(value)) continue;
      const existing = latest.get(countryCode);
      if (!existing || year > existing.year) latest.set(countryCode, { observation, year, value });
    }

    counts[indicatorCode] = latest.size;
    for (const [countryCode, selected] of latest) {
      normalized.push({
        indicator_code: indicatorCode,
        indicator_name: selected.observation?.indicator?.value || indicatorName,
        country_code: countryCode,
        country_name: countries.get(countryCode) || selected.observation?.country?.value || countryCode,
        year: selected.year,
        value: selected.value,
        unit: selected.observation?.unit || unit,
        source_url: sourceUrl,
        retrieved_at: retrievedAt,
        metadata: {
          original_indicator_id: selected.observation?.indicator?.id || indicatorCode,
          observation_status: selected.observation?.obs_status || null,
          decimal: selected.observation?.decimal ?? null,
          retrieval_mode: "latest_non_null_country_value",
          source_dataset: "World Development Indicators",
          source_attribution: "World Bank; underlying health-workforce and capacity data may originate from WHO/OECD/country reporting",
          license: "CC BY 4.0",
        },
      });
    }
    console.log(`${indicatorCode}: ${latest.size} countries`);
  }

  if (!normalized.length) {
    throw new Error(`No World Bank indicators downloaded. Failures: ${JSON.stringify(failures)}`);
  }

  normalized.sort((a, b) => a.indicator_code.localeCompare(b.indicator_code) || a.country_code.localeCompare(b.country_code));
  const sqlFiles = [];
  for (let offset = 0; offset < normalized.length; offset += CHUNK_SIZE) {
    const rows = normalized.slice(offset, offset + CHUNK_SIZE);
    const fileName = `world_bank_health_${String(sqlFiles.length + 1).padStart(3, "0")}.sql`;
    await fs.writeFile(path.join(OUTPUT_DIR, fileName), makeSql(rows), "utf8");
    sqlFiles.push({ file: fileName, rows: rows.length });
  }

  const manifest = {
    generated_at: retrievedAt,
    source: "World Bank Indicators API",
    official_api_documentation: "https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation",
    destination_table: "public.international_health_indicators",
    strategy: "latest non-null country-level value per indicator",
    total_rows: normalized.length,
    eligible_countries: countries.size,
    counts_by_indicator: counts,
    failed_indicators: failures,
    sql_files: sqlFiles,
    safeguards: [
      "No webpage scraping",
      "No frontend data bundle",
      "No credentials in generated files",
      "Missing observations omitted rather than converted to zero",
      "Failed indicators are reported and do not block successful sources",
      "Idempotent upsert into Neon",
    ],
  };
  await fs.writeFile(path.join(OUTPUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * Downloads official country-level healthcare-access indicators from:
 *   - World Bank Indicators API
 *   - WHO Global Health Observatory OData API
 *
 * This script DOES NOT connect to Neon and DOES NOT contain credentials.
 * It writes normalized, idempotent SQL chunks that can be reviewed and
 * applied separately to public.international_health_indicators.
 */

import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = path.resolve("data/generated/international");
const FETCH_TIMEOUT_MS = 90_000;
const SQL_CHUNK_SIZE = 250;

const WORLD_BANK_INDICATORS = {
  "SH.MED.PHYS.ZS": {
    name: "Physicians (per 1,000 people)",
    unit: "per 1,000 people",
  },
  "SH.MED.NUMW.P3": {
    name: "Nurses and midwives (per 1,000 people)",
    unit: "per 1,000 people",
  },
  "SH.MED.BEDS.ZS": {
    name: "Hospital beds (per 1,000 people)",
    unit: "per 1,000 people",
  },
  "SH.UHC.SRVS.CV.XD": {
    name: "UHC service coverage index",
    unit: "index (0-100)",
  },
  "SP.RUR.TOTL.ZS": {
    name: "Rural population (% of total population)",
    unit: "% of total population",
  },
  "EN.POP.DNST": {
    name: "Population density (people per sq. km of land area)",
    unit: "people per sq. km",
  },
};

const WHO_TARGETS = {
  physicians: {
    include: ["medical doctor", "physician"],
    prefer: ["density", "10 000", "population"],
    reject: ["specialist", "psychiat", "surgical", "graduat", "foreign"],
  },
  nurses_midwives: {
    include: ["nursing", "midwif"],
    prefer: ["density", "10 000", "population"],
    reject: ["graduat", "foreign", "specialist"],
  },
  hospital_beds: {
    include: ["hospital bed"],
    prefer: ["density", "10 000", "population"],
    reject: ["psychiatric", "occupancy"],
  },
  uhc_service_coverage: {
    include: ["universal health coverage", "service coverage"],
    prefer: ["index"],
    reject: ["expenditure", "financial hardship"],
  },
  dentists: {
    include: ["dentist"],
    prefer: ["density", "10 000", "population"],
    reject: ["graduat", "foreign"],
  },
  pharmacists: {
    include: ["pharmacist"],
    prefer: ["density", "10 000", "population"],
    reject: ["graduat", "foreign"],
  },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Occu-Med-Network-Map/1.0 (official-data-import)" },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} for ${url}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(1_500 * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

async function fetchODataAll(initialUrl, maxPages = 200) {
  const values = [];
  let url = initialUrl;
  let page = 0;
  while (url && page < maxPages) {
    const payload = await fetchJson(url);
    if (Array.isArray(payload?.value)) values.push(...payload.value);
    url = payload?.["@odata.nextLink"] || null;
    page += 1;
  }
  if (url) throw new Error(`OData pagination exceeded ${maxPages} pages: ${initialUrl}`);
  return values;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreWhoIndicator(name, target) {
  const normalized = normalizeText(name);
  if (!target.include.every((term) => normalized.includes(normalizeText(term)))) return -Infinity;
  let score = 100;
  for (const term of target.prefer) {
    if (normalized.includes(normalizeText(term))) score += 12;
  }
  for (const term of target.reject) {
    if (normalized.includes(normalizeText(term))) score -= 80;
  }
  if (normalized.includes("number of")) score -= 20;
  if (normalized.includes("percentage")) score -= 10;
  return score;
}

function asFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    if (cleaned && Number.isFinite(Number(cleaned))) return Number(cleaned);
  }
  return null;
}

function sqlString(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value ?? {}))}::jsonb`;
}

function latestByCountry(rows, countryCodeField, yearField, valueField) {
  const latest = new Map();
  for (const row of rows) {
    const countryCode = String(row?.[countryCodeField] || "").trim().toUpperCase();
    const year = Number(row?.[yearField]);
    const value = asFiniteNumber(row?.[valueField]);
    if (!/^[A-Z]{3}$/.test(countryCode) || !Number.isInteger(year) || value === null) continue;
    const current = latest.get(countryCode);
    if (!current || year > current.year) latest.set(countryCode, { row, year, value });
  }
  return latest;
}

async function loadWorldBankCountries() {
  const payload = await fetchJson("https://api.worldbank.org/v2/country?format=json&per_page=400");
  const countries = Array.isArray(payload) ? payload[1] : [];
  return new Map(
    countries
      .filter((country) => country?.region?.id && /^[A-Z]{3}$/.test(country?.id || ""))
      .map((country) => [country.id, { name: country.name, iso2: country.iso2Code }]),
  );
}

async function loadWorldBankRows(countryMap) {
  const normalized = [];
  const sourceUpdatedAt = new Date().toISOString();

  for (const [indicatorCode, definition] of Object.entries(WORLD_BANK_INDICATORS)) {
    const url = `https://api.worldbank.org/v2/country/all/indicator/${indicatorCode}?format=json&per_page=20000`;
    const payload = await fetchJson(url);
    const records = Array.isArray(payload) ? payload[1] : [];
    const eligible = records.filter((record) => countryMap.has(record?.countryiso3code));
    const latest = latestByCountry(eligible, "countryiso3code", "date", "value");

    for (const [countryCode, selected] of latest) {
      const country = countryMap.get(countryCode);
      normalized.push({
        indicator_code: indicatorCode,
        indicator_name: definition.name,
        country_code: countryCode,
        country_name: country?.name || selected.row?.country?.value || countryCode,
        admin1_code: null,
        admin1_name: null,
        geography_level: "country",
        year: selected.year,
        value: selected.value,
        unit: selected.row?.unit || definition.unit,
        source_name: "World Bank Indicators API",
        source_url: url,
        source_updated_at: sourceUpdatedAt,
        metadata: {
          original_indicator_id: selected.row?.indicator?.id || indicatorCode,
          original_indicator_name: selected.row?.indicator?.value || definition.name,
          observation_status: selected.row?.obs_status || null,
          decimal: selected.row?.decimal ?? null,
          retrieval_mode: "latest_non_null_country_value",
          license: "CC BY 4.0",
        },
      });
    }
    console.log(`World Bank ${indicatorCode}: ${latest.size} countries`);
  }
  return normalized;
}

async function loadWhoIndicatorCatalog() {
  return fetchODataAll("https://ghoapi.azureedge.net/api/Indicator?$format=json");
}

function selectWhoCandidates(catalog) {
  const selections = {};
  const candidates = {};
  for (const [targetId, target] of Object.entries(WHO_TARGETS)) {
    const ranked = catalog
      .map((item) => ({
        indicatorCode: item?.IndicatorCode,
        indicatorName: item?.IndicatorName,
        language: item?.Language,
        score: scoreWhoIndicator(item?.IndicatorName, target),
      }))
      .filter((item) => item.indicatorCode && Number.isFinite(item.score))
      .sort((a, b) => b.score - a.score || String(a.indicatorName).localeCompare(String(b.indicatorName)));
    candidates[targetId] = ranked.slice(0, 15);
    selections[targetId] = ranked[0] || null;
  }
  return { selections, candidates };
}

function chooseWhoCountryRecords(records) {
  // Prefer country-level, all-population records without sex/age breakdowns.
  const bestByCountryYear = new Map();
  for (const record of records) {
    const countryCode = String(record?.SpatialDim || record?.SpatialDimCode || "").trim().toUpperCase();
    const year = Number(record?.TimeDim || record?.TimeDimensionValue || record?.Date?.slice?.(0, 4));
    const value = asFiniteNumber(record?.NumericValue ?? record?.Value);
    if (!/^[A-Z]{3}$/.test(countryCode) || !Number.isInteger(year) || value === null) continue;

    const dimensions = [record?.Dim1, record?.Dim2, record?.Dim3].filter((value) => value !== null && value !== undefined && value !== "");
    const dimensionPenalty = dimensions.length * 20;
    const score = 100 - dimensionPenalty;
    const key = `${countryCode}:${year}`;
    const current = bestByCountryYear.get(key);
    if (!current || score > current.score) bestByCountryYear.set(key, { record, countryCode, year, value, score });
  }

  const latest = new Map();
  for (const selected of bestByCountryYear.values()) {
    const current = latest.get(selected.countryCode);
    if (!current || selected.year > current.year || (selected.year === current.year && selected.score > current.score)) {
      latest.set(selected.countryCode, selected);
    }
  }
  return latest;
}

async function loadWhoRows(countryMap, selections) {
  const normalized = [];
  const failures = [];
  const sourceUpdatedAt = new Date().toISOString();

  for (const [targetId, selection] of Object.entries(selections)) {
    if (!selection?.indicatorCode) {
      failures.push({ targetId, reason: "No matching WHO indicator found" });
      continue;
    }

    const code = selection.indicatorCode;
    const url = `https://ghoapi.azureedge.net/api/${encodeURIComponent(code)}?$format=json`;
    try {
      const records = await fetchODataAll(url);
      const latest = chooseWhoCountryRecords(records);
      for (const [countryCode, selected] of latest) {
        const country = countryMap.get(countryCode);
        normalized.push({
          indicator_code: `WHO:${code}`,
          indicator_name: selection.indicatorName || targetId,
          country_code: countryCode,
          country_name: country?.name || countryCode,
          admin1_code: null,
          admin1_name: null,
          geography_level: "country",
          year: selected.year,
          value: selected.value,
          unit: selected.record?.NumericValue ? null : selected.record?.Unit || null,
          source_name: "WHO Global Health Observatory",
          source_url: url,
          source_updated_at: sourceUpdatedAt,
          metadata: {
            target_category: targetId,
            who_indicator_code: code,
            who_indicator_name: selection.indicatorName,
            display_value: selected.record?.Value ?? null,
            low: selected.record?.Low ?? null,
            high: selected.record?.High ?? null,
            dimensions: {
              dim1_type: selected.record?.Dim1Type ?? null,
              dim1: selected.record?.Dim1 ?? null,
              dim2_type: selected.record?.Dim2Type ?? null,
              dim2: selected.record?.Dim2 ?? null,
              dim3_type: selected.record?.Dim3Type ?? null,
              dim3: selected.record?.Dim3 ?? null,
            },
            retrieval_mode: "latest_non_null_country_value_lowest_dimension_penalty",
          },
        });
      }
      console.log(`WHO ${code} (${targetId}): ${latest.size} countries`);
    } catch (error) {
      failures.push({ targetId, code, reason: String(error?.message || error) });
      console.error(`WHO ${code} failed:`, error?.message || error);
    }
  }

  return { rows: normalized, failures };
}

function rowToSqlTuple(row) {
  return `(${[
    sqlString(row.indicator_code),
    sqlString(row.indicator_name),
    sqlString(row.country_code),
    sqlString(row.country_name),
    sqlString(row.admin1_code),
    sqlString(row.admin1_name),
    sqlString(row.geography_level),
    Number(row.year),
    Number(row.value),
    sqlString(row.unit),
    sqlString(row.source_name),
    sqlString(row.source_url),
    sqlString(row.source_updated_at),
    sqlJson(row.metadata),
  ].join(", ")})`;
}

function buildSqlChunk(rows) {
  return `BEGIN;\n\nINSERT INTO public.international_health_indicators (\n  indicator_code, indicator_name, country_code, country_name,\n  admin1_code, admin1_name, geography_level, year, value, unit,\n  source_name, source_url, source_updated_at, metadata\n) VALUES\n${rows.map(rowToSqlTuple).join(",\n")}\nON CONFLICT (\n  indicator_code,\n  country_code,\n  (COALESCE(admin1_code, '')),\n  geography_level,\n  year,\n  source_name\n) DO UPDATE SET\n  indicator_name = EXCLUDED.indicator_name,\n  country_name = EXCLUDED.country_name,\n  admin1_name = EXCLUDED.admin1_name,\n  value = EXCLUDED.value,\n  unit = EXCLUDED.unit,\n  source_url = EXCLUDED.source_url,\n  source_updated_at = EXCLUDED.source_updated_at,\n  metadata = EXCLUDED.metadata,\n  updated_at = now();\n\nCOMMIT;\n`;
}

async function writeSqlChunks(rows) {
  const sorted = [...rows].sort((a, b) =>
    a.source_name.localeCompare(b.source_name) ||
    a.indicator_code.localeCompare(b.indicator_code) ||
    a.country_code.localeCompare(b.country_code),
  );

  const files = [];
  for (let index = 0; index < sorted.length; index += SQL_CHUNK_SIZE) {
    const chunk = sorted.slice(index, index + SQL_CHUNK_SIZE);
    const fileName = `international_health_indicators_${String(files.length + 1).padStart(3, "0")}.sql`;
    await fs.writeFile(path.join(OUTPUT_DIR, fileName), buildSqlChunk(chunk), "utf8");
    files.push({ fileName, rowCount: chunk.length });
  }
  return files;
}

async function main() {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const countryMap = await loadWorldBankCountries();
  console.log(`Eligible World Bank economies: ${countryMap.size}`);

  const worldBankRows = await loadWorldBankRows(countryMap);

  const whoCatalog = await loadWhoIndicatorCatalog();
  const { selections, candidates } = selectWhoCandidates(whoCatalog);
  await fs.writeFile(
    path.join(OUTPUT_DIR, "who_indicator_candidates.json"),
    JSON.stringify({ generated_at: new Date().toISOString(), selections, candidates }, null, 2),
    "utf8",
  );

  const whoResult = await loadWhoRows(countryMap, selections);
  const allRows = [...worldBankRows, ...whoResult.rows];
  const files = await writeSqlChunks(allRows);

  const countsBySource = Object.groupBy(allRows, (row) => row.source_name);
  const countsByIndicator = Object.groupBy(allRows, (row) => row.indicator_code);
  const manifest = {
    generated_at: new Date().toISOString(),
    purpose: "Country-level international healthcare access baseline",
    row_count: allRows.length,
    world_bank_row_count: worldBankRows.length,
    who_row_count: whoResult.rows.length,
    who_failures: whoResult.failures,
    selected_who_indicators: selections,
    counts_by_source: Object.fromEntries(Object.entries(countsBySource).map(([key, values]) => [key, values.length])),
    counts_by_indicator: Object.fromEntries(Object.entries(countsByIndicator).map(([key, values]) => [key, values.length])),
    sql_files: files,
    destination_table: "public.international_health_indicators",
    notes: [
      "Only the latest non-null country-level observation per indicator is included.",
      "Missing values are omitted and must reduce scoring confidence rather than increase difficulty.",
      "WHO indicator selection candidates are preserved for human review.",
      "No data was scraped from rendered webpages; official APIs were used.",
    ],
  };

  await fs.writeFile(path.join(OUTPUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

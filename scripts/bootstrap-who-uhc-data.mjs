#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = path.resolve("data/generated/who-uhc");
const CHUNK_SIZE = 200;
const API_ROOT = "https://ghoapi.azureedge.net/api";

const INDICATORS = {
  UHC_INDEX_REPORTED: {
    name: "UHC Service Coverage Index (SDG 3.8.1)",
    unit: "index (0-100)",
    metric: "uhc_service_coverage_index",
    category: "overall_service_coverage",
  },
  UHC_SCI_CAPACITY: {
    name: "UHC Service Coverage sub-index on service capacity and access",
    unit: "index (0-100)",
    metric: "uhc_service_capacity_access_subindex",
    category: "service_capacity_access",
  },
  UHC_SCI_INFECT: {
    name: "UHC Service Coverage sub-index on infectious diseases",
    unit: "index (0-100)",
    metric: "uhc_infectious_diseases_subindex",
    category: "infectious_diseases",
  },
  UHC_SCI_NCD: {
    name: "UHC Service Coverage sub-index on noncommunicable diseases",
    unit: "index (0-100)",
    metric: "uhc_noncommunicable_diseases_subindex",
    category: "noncommunicable_diseases",
  },
  UHC_SCI_RMNCH: {
    name: "UHC Service Coverage sub-index on reproductive, maternal, newborn and child health",
    unit: "index (0-100)",
    metric: "uhc_rmnch_subindex",
    category: "reproductive_maternal_newborn_child_health",
  },
  UHC_AVAILABILITY_SCORE: {
    name: "Primary data availability for UHC Service Coverage Index (SDG 3.8.1)",
    unit: "percent",
    metric: "uhc_primary_data_availability",
    category: "data_quality",
  },
};

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
          "User-Agent": "Occu-Med-Network-Map/1.0 WHO-UHC-service-coverage-import",
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

function nextLink(payload) {
  return payload?.["@odata.nextLink"] || payload?.["odata.nextLink"] || payload?.nextLink || null;
}

async function fetchAll(url) {
  const rows = [];
  let pageUrl = url;
  let pages = 0;
  const visited = new Set();
  while (pageUrl) {
    if (visited.has(pageUrl)) throw new Error(`WHO API pagination loop: ${pageUrl}`);
    visited.add(pageUrl);
    const payload = await fetchJson(pageUrl);
    rows.push(...rowsFromPayload(payload));
    pageUrl = nextLink(payload);
    pages += 1;
    if (pages > 100) throw new Error(`WHO API exceeded 100 pages: ${url}`);
  }
  return rows;
}

function numericValue(row) {
  for (const candidate of [row?.NumericValue, row?.numericValue, row?.Value, row?.value]) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === "string") {
      const cleaned = candidate.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/u)?.[0];
      if (cleaned !== undefined) {
        const parsed = Number(cleaned);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
  }
  return null;
}

function yearValue(row) {
  for (const candidate of [row?.TimeDim, row?.TimeDimensionValue, row?.Year, row?.year]) {
    const parsed = Number(candidate);
    if (Number.isInteger(parsed) && parsed >= 1900 && parsed <= 2200) return parsed;
  }
  return null;
}

function countryCode(row) {
  const value = String(row?.SpatialDim || row?.SpatialDimensionCode || row?.CountryCode || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(value) ? value : null;
}

function countryName(row, code, countryNames) {
  const direct = String(row?.SpatialDimensionValue || row?.SpatialDimValue || row?.CountryName || "").trim();
  return direct || countryNames.get(code) || code;
}

function dimensionValues(row) {
  return [row?.Dim1, row?.Dim2, row?.Dim3].filter((value) => value !== null && value !== undefined && value !== "");
}

function dimensionPenalty(row) {
  const totalCodes = new Set(["SEX_BTSX", "BTSX", "TOTAL", "ALL", "ALLA", "ALL_SEXES", "BOTH_SEXES"]);
  return dimensionValues(row).reduce((penalty, value) => penalty + (totalCodes.has(String(value).toUpperCase()) ? 0 : 1), 0);
}

function isCountryRow(row) {
  const type = String(row?.SpatialDimType || row?.SpatialDimensionType || "").toUpperCase();
  return !type || type === "COUNTRY";
}

async function loadCountryNames() {
  const candidates = [
    `${API_ROOT}/Dimension/COUNTRY/DimensionValues?$format=json`,
    `${API_ROOT}/DIMENSION/COUNTRY/DimensionValues?$format=json`,
  ];
  for (const url of candidates) {
    try {
      const rows = await fetchAll(url);
      const names = new Map();
      for (const row of rows) {
        const code = String(row?.Code || row?.DimensionValueCode || row?.SpatialDim || "").trim().toUpperCase();
        const title = String(row?.Title || row?.DimensionValue || row?.Name || "").trim();
        if (/^[A-Z]{3}$/.test(code) && title) names.set(code, title);
      }
      if (names.size) return names;
    } catch (error) {
      console.error(`Country-name lookup unavailable at ${url}: ${String(error?.message || error)}`);
    }
  }
  return new Map();
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
    sqlString(row.source_name),
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

  const retrievedAt = new Date().toISOString();
  const countryNames = await loadCountryNames();
  const normalized = [];
  const counts = {};
  const diagnostics = {};

  for (const [indicatorCode, definition] of Object.entries(INDICATORS)) {
    const sourceUrl = `${API_ROOT}/${indicatorCode}?$format=json`;
    console.log(`Fetching ${indicatorCode}: ${definition.name}`);

    let sourceRows;
    try {
      sourceRows = await fetchAll(sourceUrl);
    } catch (error) {
      diagnostics[indicatorCode] = { error: String(error?.message || error), source_rows: 0, usable_rows: 0, countries: 0 };
      counts[indicatorCode] = 0;
      console.error(`${indicatorCode} failed: ${String(error?.message || error)}`);
      continue;
    }

    const latest = new Map();
    let usableRows = 0;
    for (const row of sourceRows) {
      if (!isCountryRow(row)) continue;
      const code = countryCode(row);
      const year = yearValue(row);
      const value = numericValue(row);
      if (!code || year === null || value === null) continue;
      usableRows += 1;

      const candidate = { row, year, value, penalty: dimensionPenalty(row) };
      const existing = latest.get(code);
      if (!existing || candidate.year > existing.year || (candidate.year === existing.year && candidate.penalty < existing.penalty)) {
        latest.set(code, candidate);
      }
    }

    counts[indicatorCode] = latest.size;
    diagnostics[indicatorCode] = {
      source_rows: sourceRows.length,
      usable_rows: usableRows,
      countries: latest.size,
      newest_year: latest.size ? Math.max(...[...latest.values()].map((item) => item.year)) : null,
      oldest_selected_year: latest.size ? Math.min(...[...latest.values()].map((item) => item.year)) : null,
    };

    for (const [code, selected] of latest) {
      const row = selected.row;
      normalized.push({
        indicator_code: indicatorCode,
        indicator_name: definition.name,
        country_code: code,
        country_name: countryName(row, code, countryNames),
        year: selected.year,
        value: selected.value,
        unit: definition.unit,
        source_name: "WHO Global Health Observatory / UHC Service Coverage",
        source_url: sourceUrl,
        retrieved_at: retrievedAt,
        metadata: {
          source_indicator_code: indicatorCode,
          canonical_metric: definition.metric,
          uhc_category: definition.category,
          source_dataset: "WHO Global Health Observatory / Universal Health Coverage Service Coverage",
          sdg_indicator: indicatorCode === "UHC_AVAILABILITY_SCORE" ? "SDG 3.8.1 data availability" : "SDG 3.8.1",
          retrieval_mode: "latest_numeric_country_observation_prefer_aggregate_dimensions",
          financial_protection_excluded: true,
          spatial_dim_type: row?.SpatialDimType ?? row?.SpatialDimensionType ?? null,
          time_dim_type: row?.TimeDimType ?? null,
          dimension_1_type: row?.Dim1Type ?? null,
          dimension_1: row?.Dim1 ?? null,
          dimension_2_type: row?.Dim2Type ?? null,
          dimension_2: row?.Dim2 ?? null,
          dimension_3_type: row?.Dim3Type ?? null,
          dimension_3: row?.Dim3 ?? null,
          source_value_text: row?.Value ?? null,
          source_low: row?.Low ?? null,
          source_high: row?.High ?? null,
          source_comments: row?.Comments ?? null,
          source_date: row?.Date ?? null,
          dimension_penalty: selected.penalty,
          missing_values_omitted: true,
        },
      });
    }

    console.log(`${indicatorCode}: ${latest.size} countries from ${sourceRows.length} source rows`);
  }

  if (!normalized.length) throw new Error("No WHO UHC service-coverage observations were normalized");

  normalized.sort((a, b) => a.indicator_code.localeCompare(b.indicator_code) || a.country_code.localeCompare(b.country_code));
  const sqlFiles = [];
  for (let offset = 0; offset < normalized.length; offset += CHUNK_SIZE) {
    const rows = normalized.slice(offset, offset + CHUNK_SIZE);
    const fileName = `who_uhc_${String(sqlFiles.length + 1).padStart(3, "0")}.sql`;
    await fs.writeFile(path.join(OUTPUT_DIR, fileName), makeSql(rows), "utf8");
    sqlFiles.push({ file: fileName, rows: rows.length });
  }

  const manifest = {
    generated_at: retrievedAt,
    source: "WHO Global Health Observatory / UHC Service Coverage",
    official_indicator_catalog: `${API_ROOT}/Indicator?$format=json`,
    destination_table: "public.international_health_indicators",
    strategy: "latest non-null country-level observation per UHC service-coverage indicator",
    included_indicators: Object.keys(INDICATORS),
    excluded_data: [
      "SDG 3.8.2 financial-hardship indicators",
      "catastrophic health spending",
      "out-of-pocket expenditure",
      "household health expenditure",
      "financial-protection indicators",
    ],
    total_rows: normalized.length,
    country_name_lookup_rows: countryNames.size,
    counts_by_indicator: counts,
    diagnostics,
    sql_files: sqlFiles,
    safeguards: [
      "No financial data",
      "No webpage scraping",
      "No frontend data bundle",
      "No credentials in generated files",
      "Missing observations omitted rather than converted to zero",
      "Country-level rows only",
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

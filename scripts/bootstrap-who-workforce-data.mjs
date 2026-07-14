#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = path.resolve("data/generated/who-workforce");
const CHUNK_SIZE = 200;
const API_ROOT = "https://ghoapi.azureedge.net/api";

const INDICATORS = {
  HWF_0001: { name: "Medical doctors (per 10,000)", unit: "per 10,000 population", metric: "medical_doctors_density", category: "workforce_density" },
  HWF_0002: { name: "Medical doctors (number)", unit: "number", metric: "medical_doctors_count", category: "workforce_count" },
  HWF_0006: { name: "Nursing and midwifery personnel (per 10,000)", unit: "per 10,000 population", metric: "nursing_midwifery_density", category: "workforce_density" },
  HWF_0007: { name: "Nursing and midwifery personnel (number)", unit: "number", metric: "nursing_midwifery_count", category: "workforce_count" },
  HWF_0008: { name: "Nursing personnel (number)", unit: "number", metric: "nursing_personnel_count", category: "workforce_count" },
  HWF_0009: { name: "Midwifery personnel (number)", unit: "number", metric: "midwifery_personnel_count", category: "workforce_count" },
  HWF_0010: { name: "Dentists (per 10,000)", unit: "per 10,000 population", metric: "dentists_density", category: "workforce_density" },
  HWF_0011: { name: "Dentists (number)", unit: "number", metric: "dentists_count", category: "workforce_count" },
  HWF_0014: { name: "Pharmacists (per 10,000)", unit: "per 10,000 population", metric: "pharmacists_density", category: "workforce_density" },
  HWF_0015: { name: "Pharmacists (number)", unit: "number", metric: "pharmacists_count", category: "workforce_count" },
  HWF_0016: { name: "Pharmaceutical technicians and assistants (number)", unit: "number", metric: "pharmacy_technicians_count", category: "workforce_count" },
  HWF_0017: { name: "Environmental and occupational health and hygiene professionals (number)", unit: "number", metric: "environmental_occupational_health_professionals_count", category: "workforce_count" },
  HWF_0018: { name: "Environmental and occupational health inspectors and associates (number)", unit: "number", metric: "environmental_occupational_health_inspectors_count", category: "workforce_count" },
  HWF_0019: { name: "Medical and pathology laboratory scientists (number)", unit: "number", metric: "medical_laboratory_scientists_count", category: "workforce_count" },
  HWF_0020: { name: "Medical and pathology laboratory technicians (number)", unit: "number", metric: "medical_laboratory_technicians_count", category: "workforce_count" },
  HWF_0021: { name: "Physiotherapists (number)", unit: "number", metric: "physiotherapists_count", category: "workforce_count" },
  HWF_0022: { name: "Physiotherapy technicians and assistants (number)", unit: "number", metric: "physiotherapy_technicians_count", category: "workforce_count" },
  HWF_0024: { name: "Community health workers (number)", unit: "number", metric: "community_health_workers_count", category: "workforce_count" },
  HWF_0025: { name: "Medical doctors (%)", unit: "percent", metric: "medical_doctors_share", category: "workforce_composition" },
  HWF_0026: { name: "Nursing personnel (%)", unit: "percent", metric: "nursing_personnel_share", category: "workforce_composition" },
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
          "User-Agent": "Occu-Med-Network-Map/1.0 WHO-GHO-NHWA-import",
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

function countryName(row, code) {
  const value = String(row?.SpatialDimensionValue || row?.SpatialDimValue || row?.CountryName || "").trim();
  return value || code;
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

      const candidate = {
        row,
        year,
        value,
        penalty: dimensionPenalty(row),
      };
      const existing = latest.get(code);
      if (
        !existing ||
        candidate.year > existing.year ||
        (candidate.year === existing.year && candidate.penalty < existing.penalty)
      ) {
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
        country_name: countryName(row, code),
        year: selected.year,
        value: selected.value,
        unit: definition.unit,
        source_name: "WHO Global Health Observatory / National Health Workforce Accounts",
        source_url: sourceUrl,
        retrieved_at: retrievedAt,
        metadata: {
          source_indicator_code: indicatorCode,
          canonical_metric: definition.metric,
          workforce_category: definition.category,
          source_dataset: "WHO Global Health Observatory / National Health Workforce Accounts",
          retrieval_mode: "latest_numeric_country_observation_prefer_aggregate_dimensions",
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

  if (!normalized.length) throw new Error("No WHO workforce observations were normalized");

  normalized.sort((a, b) => a.indicator_code.localeCompare(b.indicator_code) || a.country_code.localeCompare(b.country_code));
  const sqlFiles = [];
  for (let offset = 0; offset < normalized.length; offset += CHUNK_SIZE) {
    const rows = normalized.slice(offset, offset + CHUNK_SIZE);
    const fileName = `who_workforce_${String(sqlFiles.length + 1).padStart(3, "0")}.sql`;
    await fs.writeFile(path.join(OUTPUT_DIR, fileName), makeSql(rows), "utf8");
    sqlFiles.push({ file: fileName, rows: rows.length });
  }

  const manifest = {
    generated_at: retrievedAt,
    source: "WHO Global Health Observatory / National Health Workforce Accounts",
    api_root: API_ROOT,
    destination_table: "public.international_health_indicators",
    strategy: "latest numeric country-level observation per curated workforce indicator; aggregate dimensions preferred",
    total_rows: normalized.length,
    indicators_requested: Object.keys(INDICATORS).length,
    counts_by_indicator: counts,
    diagnostics,
    sql_files: sqlFiles,
    safeguards: [
      "Official WHO API only",
      "No webpage scraping",
      "No frontend data bundle",
      "No credentials in generated files",
      "Missing observations omitted rather than converted to zero",
      "Country-level records only",
      "Source dimensions retained in metadata",
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

import { randomUUID } from "node:crypto";
import { getScoringPool } from "@workspace/db";
import { logger } from "../lib/logger";
import { calculateUnifiedAccessScore, scarcityScore, burdenScore, type ComponentInput } from "../lib/healthcareAccessScoring";

const WORLD_BANK_INDICATORS = [
  ["SH.MED.PHYS.ZS", "Physicians per 1,000 people"],
  ["SH.MED.BEDS.ZS", "Hospital beds per 1,000 people"],
  ["SH.UHC.SRVS.CV.XD", "Universal health coverage service index"],
  ["SP.RUR.TOTL.ZS", "Rural population percentage"],
  ["SP.POP.TOTL", "Population"],
  ["EN.POP.DNST", "Population density"],
] as const;

async function fetchIndicator(code: string): Promise<any[]> {
  const response = await fetch(`https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=20000&mrnev=1`, {
    signal: AbortSignal.timeout(30_000),
    headers: { "user-agent": "Network-Map healthcare access indicator sync" },
  });
  if (!response.ok) throw new Error(`World Bank ${code} returned HTTP ${response.status}`);
  const payload = await response.json() as [unknown, any[]];
  return Array.isArray(payload?.[1]) ? payload[1] : [];
}

async function upsertIndicator(row: any, name: string): Promise<boolean> {
  const countryCode = String(row.countryiso3code || "").toUpperCase();
  const year = Number(row.date); const value = Number(row.value);
  if (!/^[A-Z]{3}$/.test(countryCode) || !Number.isInteger(year) || !Number.isFinite(value)) return false;
  const pool = getScoringPool();
  const updated = await pool.query(`
    UPDATE public.international_health_indicators SET
      indicator_name=$4, country_name=$5, value=$6, unit=$7,
      source_name='World Bank', source_url=$8, source_updated_at=now(), updated_at=now()
    WHERE indicator_code=$1 AND country_code=$2 AND year=$3 AND admin1_code IS NULL
  `, [row.indicator.id, countryCode, year, name, row.country?.value || countryCode, value, row.unit || null, `https://data.worldbank.org/indicator/${row.indicator.id}`]);
  if (updated.rowCount) return true;
  await pool.query(`
    INSERT INTO public.international_health_indicators
      (id,indicator_code,indicator_name,country_code,country_name,geography_level,year,value,unit,source_name,source_url,source_updated_at,metadata,created_at,updated_at)
    VALUES ($1,$2,$3,$4,$5,'country',$6,$7,$8,'World Bank',$9,now(),$10::jsonb,now(),now())
  `, [randomUUID(), row.indicator.id, name, countryCode, row.country?.value || countryCode, year, value, row.unit || null, `https://data.worldbank.org/indicator/${row.indicator.id}`, JSON.stringify({ automated: true })]);
  return true;
}

function present(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function populateInternationalAccessScores(): Promise<number> {
  const pool = getScoringPool();
  const result = await pool.query(`
    SELECT country_code, max(country_name) country_name,
      jsonb_object_agg(indicator_code, jsonb_build_object(
        'value', value, 'year', year, 'source', source_name
      ) ORDER BY year) indicators
    FROM public.international_health_indicators
    WHERE admin1_code IS NULL AND value IS NOT NULL
      AND indicator_code = ANY($1::text[])
    GROUP BY country_code
  `, [WORLD_BANK_INDICATORS.map(([code]) => code)]);
  let populated = 0;
  for (const row of result.rows) {
    const indicators = row.indicators || {};
    const inputs: Record<string, ComponentInput> = {};
    const physician = present(indicators["SH.MED.PHYS.ZS"]?.value);
    const beds = present(indicators["SH.MED.BEDS.ZS"]?.value);
    const coverage = present(indicators["SH.UHC.SRVS.CV.XD"]?.value);
    const rural = present(indicators["SP.RUR.TOTL.ZS"]?.value);
    const density = present(indicators["EN.POP.DNST"]?.value);
    if (physician !== null) inputs.workforce = { score: scarcityScore(physician, 3, 0.2), evidence: { physiciansPer1000: physician }, sources: [indicators["SH.MED.PHYS.ZS"].source], year: present(indicators["SH.MED.PHYS.ZS"].year) ?? undefined };
    if (beds !== null) inputs.capacity = { score: scarcityScore(beds, 5, 0.5), evidence: { bedsPer1000: beds }, sources: [indicators["SH.MED.BEDS.ZS"].source], year: present(indicators["SH.MED.BEDS.ZS"].year) ?? undefined };
    if (coverage !== null) inputs.coverage = { score: scarcityScore(coverage, 90, 30), evidence: { universalHealthCoverageIndex: coverage }, sources: [indicators["SH.UHC.SRVS.CV.XD"].source], year: present(indicators["SH.UHC.SRVS.CV.XD"].year) ?? undefined };
    const geographicScores = [rural === null ? null : burdenScore(rural, 10, 80), density === null ? null : scarcityScore(density, 500, 5)].filter((value): value is number => value !== null);
    if (geographicScores.length) inputs.geographic = { score: geographicScores.reduce((sum, value) => sum + value, 0) / geographicScores.length, evidence: { ruralPopulationPercent: rural, populationDensity: density }, sources: ["World Bank"], year: Math.max(present(indicators["SP.RUR.TOTL.ZS"]?.year) ?? 0, present(indicators["EN.POP.DNST"]?.year) ?? 0) || undefined };
    if (!Object.keys(inputs).length) continue;
    const score = calculateUnifiedAccessScore(inputs as any);
    const values = [row.country_code, row.country_name, score.score, score.confidence, score.components.workforce?.score ?? null, score.components.capacity?.score ?? null, score.components.coverage?.score ?? null, score.components.geographic?.score ?? null, JSON.stringify(Object.fromEntries(Object.entries(score.components).map(([key, component]) => [key, component?.evidence]))), score.sourceYears, score.sourceNames, score.missingIndicators, score.algorithmVersion];
    const updated = await pool.query(`UPDATE public.international_access_scores SET country_name=$2,score=$3,confidence=$4,workforce_component=$5,capacity_component=$6,coverage_component=$7,geographic_component=$8,local_access_component=NULL,component_details=$9::jsonb,source_years=$10,source_names=$11,missing_indicators=$12,geography_level='country',algorithm_version=$13,calculated_at=now(),updated_at=now() WHERE country_code=$1 AND admin1_code IS NULL AND service_type='overall'`, values);
    if (!updated.rowCount) await pool.query(`INSERT INTO public.international_access_scores(id,country_code,country_name,service_type,score,confidence,workforce_component,capacity_component,coverage_component,geographic_component,local_access_component,component_details,source_years,source_names,missing_indicators,geography_level,algorithm_version,calculated_at,updated_at) VALUES($14,$1,$2,'overall',$3,$4,$5,$6,$7,$8,NULL,$9::jsonb,$10,$11,$12,'country',$13,now(),now())`, [...values, randomUUID()]);
    populated += 1;
  }
  return populated;
}

export async function syncHealthcareAccessIndicators(): Promise<void> {
  if (!process.env.DATABASE_URL_2?.trim()) return;
  const pool = getScoringPool();
  const lock = await pool.query("SELECT pg_try_advisory_lock(hashtext('network-map-healthcare-access-sync')) AS acquired");
  if (!lock.rows[0]?.acquired) return;
  let imported = 0;
  try {
    for (const [code, name] of WORLD_BANK_INDICATORS) {
      const rows = await fetchIndicator(code);
      for (const row of rows) if (await upsertIndicator(row, name)) imported += 1;
    }
    const accessScores = await populateInternationalAccessScores();
    logger.info({ imported, accessScores, source: "World Bank" }, "Healthcare access indicators and country scores synchronized");
  } finally {
    await pool.query("SELECT pg_advisory_unlock(hashtext('network-map-healthcare-access-sync'))").catch(() => undefined);
  }
}

export function startHealthcareAccessIndicatorSync(): void {
  if (!process.env.DATABASE_URL_2?.trim() || process.env.SCORING_SOURCE_SYNC === "false") return;
  const run = () => void syncHealthcareAccessIndicators().catch((error) => logger.error({ error }, "Healthcare access indicator sync failed"));
  setTimeout(run, 30_000).unref();
  setInterval(run, 24 * 60 * 60 * 1000).unref();
}

import { randomUUID } from "node:crypto";
import { getScoringPool } from "@workspace/db";
import { logger } from "../lib/logger";

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
    logger.info({ imported, source: "World Bank" }, "Healthcare access indicators synchronized");
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

import 'dotenv/config';
import { setTimeout as delay } from 'node:timers/promises';
import { getPool } from '@workspace/db';

type Source = 'medical_providers' | 'clinic_imports';
type GeocodeTarget = {
  source: Source;
  id: number;
  providerName: string | null;
  dataSource: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  rawData: Record<string, unknown> | null;
};

type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress?: string;
  quality: 'street' | 'postal' | 'city' | 'unknown';
  provider: string;
};

const args = new Set(process.argv.slice(2));
const DRY_RUN = !args.has('--apply');
const LIMIT = numberArg('--limit', 200);
const ONLY_SOURCE = stringArg('--source');
const INCLUDE_CITY_CENTROIDS = args.has('--allow-city-centroids');
const REPAIR_CLINIC_IMPORTS = args.has('--clinic-imports');
const NPI_ENRICH = !args.has('--skip-npi-enrich');
const DELAY_MS = numberArg('--delay-ms', 1100);
const USER_AGENT = process.env.NOMINATIM_USER_AGENT || 'Occu-Med-Network-Map-Geocode-Repair/1.0';

function stringArg(name: string): string | null {
  const prefix = `${name}=`;
  const item = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length).trim() || null : null;
}

function numberArg(name: string, fallback: number): number {
  const raw = stringArg(name);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function clean(value: unknown): string {
  if (value == null) return '';
  const text = String(value).trim();
  if (!text || /^nan$/i.test(text) || /^null$/i.test(text) || /^address not available$/i.test(text)) return '';
  return text;
}

function rawText(raw: Record<string, unknown> | null, key: string): string {
  return clean(raw?.[key]);
}

function buildExactAddress(row: GeocodeTarget): string {
  const raw = row.rawData;
  const street = clean(row.address) || rawText(raw, 'address') || rawText(raw, 'address_1');
  const address2 = rawText(raw, 'address_2');
  const city = clean(row.city) || rawText(raw, 'city') || rawText(raw, 'location').split(',')[0]?.trim() || '';
  const state = clean(row.state) || rawText(raw, 'state');
  const zip = clean(row.postalCode) || rawText(raw, 'zip') || rawText(raw, 'postal_code');
  const parts = [street, address2, city, state, zip, 'USA'].filter(Boolean);
  return parts.join(', ');
}

function addressQuality(row: GeocodeTarget): 'street' | 'postal' | 'city' | 'unknown' {
  const raw = row.rawData;
  const street = clean(row.address) || rawText(raw, 'address') || rawText(raw, 'address_1');
  const city = clean(row.city) || rawText(raw, 'city') || rawText(raw, 'location').split(',')[0]?.trim() || '';
  const state = clean(row.state) || rawText(raw, 'state');
  const zip = clean(row.postalCode) || rawText(raw, 'zip') || rawText(raw, 'postal_code');
  if (/\d/.test(street) && city && state) return 'street';
  if (city && state && zip) return 'postal';
  if (city && state) return 'city';
  return 'unknown';
}

function validCoord(lat: unknown, lng: unknown): boolean {
  const a = Number(lat);
  const b = Number(lng);
  return Number.isFinite(a) && Number.isFinite(b) && a >= -90 && a <= 90 && b >= -180 && b <= 180 && !(a === 0 && b === 0);
}

async function fetchNpi(npi: string): Promise<Record<string, unknown> | null> {
  if (!NPI_ENRICH || !/^\d{10}$/.test(npi)) return null;
  const url = `https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${encodeURIComponent(npi)}`;
  const resp = await fetch(url, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(15000) });
  if (!resp.ok) return null;
  const json = await resp.json() as { results?: Array<any> };
  const result = json.results?.[0];
  if (!result) return null;
  const address = Array.isArray(result.addresses)
    ? (result.addresses.find((a: any) => a.address_purpose === 'LOCATION') || result.addresses[0])
    : null;
  const basic = result.basic || {};
  const taxonomy = Array.isArray(result.taxonomies)
    ? (result.taxonomies.find((t: any) => t.primary === true) || result.taxonomies[0])
    : null;
  return {
    organization_name: basic.organization_name || basic.organization_subpart_name || '',
    provider_first_name: basic.first_name || '',
    provider_last_name: basic.last_name || '',
    address_1: address?.address_1 || '',
    address_2: address?.address_2 || '',
    city: address?.city || '',
    state: address?.state || '',
    zip: address?.postal_code || '',
    phone: address?.telephone_number || '',
    fax: address?.fax_number || '',
    taxonomy_description: taxonomy?.desc || taxonomy?.description || '',
  };
}

function mergeNpiRaw(raw: Record<string, unknown> | null, npiData: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!npiData) return raw;
  return { ...(raw || {}), npi_repair: npiData, ...Object.fromEntries(Object.entries(npiData).filter(([, v]) => clean(v))) };
}

async function geocode(query: string, quality: GeocodeResult['quality']): Promise<GeocodeResult | null> {
  const provider = process.env.GEOCODER_PROVIDER || 'nominatim';
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`;
  const resp = await fetch(url, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(20000) });
  if (!resp.ok) throw new Error(`geocoder ${resp.status}`);
  const data = await resp.json() as Array<{ lat?: string; lon?: string; display_name?: string }>;
  const best = data[0];
  if (!best || !validCoord(best.lat, best.lon)) return null;
  return { lat: Number(best.lat), lng: Number(best.lon), formattedAddress: best.display_name, quality, provider };
}

async function loadTargets(): Promise<GeocodeTarget[]> {
  const pool = getPool();
  const sourceFilter = ONLY_SOURCE ? 'AND data_source = $1' : '';
  const params: Array<string | number> = ONLY_SOURCE ? [ONLY_SOURCE, LIMIT] : [LIMIT];
  const limitParam = ONLY_SOURCE ? '$2' : '$1';
  const medical = await pool.query(`
    SELECT 'medical_providers'::text AS source, id, name AS provider_name, data_source,
           formatted_address AS address, locality AS city, administrative_area_level_1 AS state,
           postal_code, raw_data
    FROM public.medical_providers
    WHERE (lat IS NULL OR lng IS NULL OR NOT (lat BETWEEN -90 AND 90) OR NOT (lng BETWEEN -180 AND 180) OR (lat = 0 AND lng = 0))
      ${sourceFilter}
    ORDER BY CASE data_source WHEN 'npi_bulk' THEN 1 WHEN 'npi_registry' THEN 2 WHEN 'healthgrades' THEN 3 ELSE 9 END, id ASC
    LIMIT ${limitParam}
  `, params);

  let rows = medical.rows as any[];
  if (REPAIR_CLINIC_IMPORTS) {
    const clinic = await pool.query(`
      SELECT 'clinic_imports'::text AS source, id, name AS provider_name, source_tag AS data_source,
             address, city, state, postal_code, jsonb_build_object('services', services, 'npi', npi, 'source_tag', source_tag) AS raw_data
      FROM public.clinic_imports
      WHERE (lat IS NULL OR lng IS NULL)
      ORDER BY id ASC
      LIMIT $1
    `, [LIMIT]);
    rows = [...rows, ...clinic.rows];
  }

  return rows.map((row) => ({
    source: row.source,
    id: Number(row.id),
    providerName: clean(row.provider_name) || null,
    dataSource: clean(row.data_source) || null,
    address: clean(row.address) || null,
    city: clean(row.city) || null,
    state: clean(row.state) || null,
    postalCode: clean(row.postal_code) || null,
    rawData: row.raw_data || null,
  }));
}

async function updateTarget(target: GeocodeTarget, result: GeocodeResult, rawData: Record<string, unknown> | null): Promise<void> {
  const pool = getPool();
  if (target.source === 'medical_providers') {
    await pool.query(`
      UPDATE public.medical_providers
      SET lat = $1,
          lng = $2,
          raw_data = COALESCE(raw_data, '{}'::jsonb) || $3::jsonb,
          formatted_address = CASE WHEN $4 <> '' AND (formatted_address IS NULL OR formatted_address = '' OR formatted_address = 'Address not available') THEN $4 ELSE formatted_address END,
          locality = COALESCE(NULLIF(locality, ''), NULLIF($5, '')),
          administrative_area_level_1 = COALESCE(NULLIF(administrative_area_level_1, ''), NULLIF($6, '')),
          postal_code = COALESCE(NULLIF(postal_code, ''), NULLIF($7, '')),
          updated_at = now()
      WHERE id = $8
    `, [result.lat, result.lng, JSON.stringify({ geocode_repair: { ...result, repaired_at: new Date().toISOString() }, repaired_raw_data: rawData }), result.formattedAddress || '', target.city || '', target.state || '', target.postalCode || '', target.id]);
  } else {
    await pool.query(`
      UPDATE public.clinic_imports
      SET lat = $1,
          lng = $2,
          evidence_note = CONCAT(COALESCE(evidence_note, ''), CASE WHEN evidence_note IS NULL OR evidence_note = '' THEN '' ELSE ' | ' END, $3)
      WHERE id = $4
    `, [result.lat, result.lng, `geocode_repair:${result.provider}:${result.quality}`, target.id]);
  }
}

async function main() {
  console.log(`Provider geocode repair starting. dryRun=${DRY_RUN} limit=${LIMIT} source=${ONLY_SOURCE || 'all'} clinicImports=${REPAIR_CLINIC_IMPORTS}`);
  const targets = await loadTargets();
  console.log(`Loaded ${targets.length} repair candidates.`);

  let repaired = 0;
  let skipped = 0;
  let failed = 0;

  for (const target of targets) {
    try {
      let raw = target.rawData;
      const npi = rawText(raw, 'npi_number') || rawText(raw, 'npi');
      if (/^\d{10}$/.test(npi)) {
        const npiData = await fetchNpi(npi);
        raw = mergeNpiRaw(raw, npiData);
        if (npiData) {
          target.address = rawText(raw, 'address_1') || target.address;
          target.city = rawText(raw, 'city') || target.city;
          target.state = rawText(raw, 'state') || target.state;
          target.postalCode = rawText(raw, 'zip') || target.postalCode;
        }
      }

      const quality = addressQuality(target);
      if (quality === 'unknown' || (quality !== 'street' && !INCLUDE_CITY_CENTROIDS)) {
        skipped++;
        console.log(`SKIP ${target.source}:${target.id} ${target.dataSource || ''} quality=${quality} ${target.providerName || ''}`);
        continue;
      }

      const query = buildExactAddress(target);
      if (!query) {
        skipped++;
        console.log(`SKIP ${target.source}:${target.id} empty-query`);
        continue;
      }

      await delay(DELAY_MS);
      const result = await geocode(query, quality);
      if (!result) {
        skipped++;
        console.log(`MISS ${target.source}:${target.id} ${query}`);
        continue;
      }

      console.log(`${DRY_RUN ? 'DRY' : 'UPDATE'} ${target.source}:${target.id} ${target.dataSource || ''} ${quality} -> ${result.lat},${result.lng} :: ${query}`);
      if (!DRY_RUN) await updateTarget(target, result, raw);
      repaired++;
    } catch (error: any) {
      failed++;
      console.error(`FAIL ${target.source}:${target.id}: ${error?.message || error}`);
    }
  }

  await getPool().end();
  console.log(`Provider geocode repair complete. repaired=${repaired} skipped=${skipped} failed=${failed} dryRun=${DRY_RUN}`);
}

void main().catch(async (error) => {
  console.error(error);
  try { await getPool().end(); } catch {}
  process.exit(1);
});

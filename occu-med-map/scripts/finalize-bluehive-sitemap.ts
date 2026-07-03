import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

interface ProviderRecord {
  clinic_name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  fax?: string;
  website?: string;
  hours?: string;
  services?: string;
  service_categories?: string;
  accepts_new_patients?: string;
  telehealth?: string;
  source_url?: string;
  source_city_url?: string;
  source_state_url?: string;
  [key: string]: unknown;
}

interface Coordinate {
  lat: number;
  lng: number;
}

interface GeocodeEntry {
  status: 'found' | 'not-found' | 'failed';
  checked_at: string;
  query: string;
  lat?: number;
  lng?: number;
  error?: string;
}

const HEADERS = [
  'clinic_name', 'address_1', 'address_2', 'city', 'state', 'zip', 'phone',
  'fax', 'website', 'hours', 'services', 'service_categories',
  'accepts_new_patients', 'telehealth', 'source_url', 'source_city_url',
  'source_state_url',
] as const;

function arg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function normalize(value: unknown): string {
  return String(value ?? '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function cityKey(row: ProviderRecord): string {
  return `${normalize(row.city)}, ${normalize(row.state)}`;
}

function postalKey(value: unknown): string {
  const compact = normalize(value).replace(/[^a-z0-9]/g, '');
  return /^\d{9}$/.test(compact) ? compact.slice(0, 5) : compact;
}

function compositeKey(row: ProviderRecord): string {
  return [row.clinic_name, row.address_1, row.city, row.state, row.phone].map(normalize).join('|');
}

function hasLocationFields(row: ProviderRecord): boolean {
  return [row.address_1, row.address_2, row.city, row.state, row.zip].some((value) => normalize(value).length > 0);
}

function hash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function deterministicJitter(sourceUrl: string): Coordinate {
  const digest = createHash('sha256').update(sourceUrl).digest();
  const latUnit = digest.readUInt32BE(0) / 0xffffffff - 0.5;
  const lngUnit = digest.readUInt32BE(4) / 0xffffffff - 0.5;
  return { lat: latUnit * 0.008, lng: lngUnit * 0.012 };
}

function escapeCsv(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function readJsonl(file: string): Promise<ProviderRecord[]> {
  const raw = await fs.readFile(file, 'utf8');
  return raw.split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line));
}

function jsonl(rows: ProviderRecord[]): string {
  return rows.map((row) => JSON.stringify(row)).join('\n') + '\n';
}

function csv(rows: ProviderRecord[]): string {
  const output = [HEADERS.join(',')];
  for (const row of rows) output.push(HEADERS.map((header) => escapeCsv(row[header])).join(','));
  return output.join('\n') + '\n';
}

async function loadLocs(file: string): Promise<Map<string, Coordinate>> {
  const dataTs = await fs.readFile(file, 'utf8');
  const lines = dataTs.split('\n');
  const expression: string[] = [];
  let inLocs = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('export const LOCS')) {
      inLocs = true;
      const equals = line.indexOf('=');
      const bracket = line.indexOf('[', equals);
      expression.push(line.slice(bracket));
      continue;
    }
    if (!inLocs) continue;
    expression.push(line);
    if (trimmed === '];') break;
  }
  const rows = Function(`"use strict"; return (${expression.join('\n').replace(/;\s*$/, '')});`)() as unknown[][];
  const result = new Map<string, Coordinate>();
  for (const row of rows) {
    result.set(`${normalize(row[0])}, ${normalize(row[1])}`, { lat: Number(row[2]), lng: Number(row[3]) });
  }
  return result;
}

async function loadObject<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw error;
  }
}

function geocodeQuery(row: ProviderRecord, fallback: boolean): string {
  const city = String(row.city ?? '').trim();
  const state = String(row.state ?? '').trim();
  const zip = postalKey(row.zip);
  if (fallback) {
    if (state && zip) return `${zip}, ${state}, USA`;
    if (city && zip) return `${city}, ${zip}`;
    return [city, state].filter(Boolean).join(', ');
  }
  const usRegion = state.length > 0;
  return [row.address_1, row.address_2, city, state, zip, usRegion ? 'USA' : '']
    .map((value) => String(value ?? '').trim()).filter(Boolean).join(', ');
}

async function geocode(row: ProviderRecord, fallback: boolean): Promise<GeocodeEntry> {
  const query = geocodeQuery(row, fallback);
  const checkedAt = new Date().toISOString();
  if (!query) return { status: 'not-found', checked_at: checkedAt, query };
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('q', query);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'OccuMed-BlueHive-Provenance-Audit/1.0 (https://github.com/Occumed79/Network-Map)',
        'Accept-Language': 'en-US,en;q=0.8',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const results = await response.json() as Array<{ lat: string; lon: string }>;
    if (!results[0]) return { status: 'not-found', checked_at: checkedAt, query };
    return { status: 'found', checked_at: checkedAt, query, lat: Number(results[0].lat), lng: Number(results[0].lon) };
  } catch (error) {
    return { status: 'failed', checked_at: checkedAt, query, error: (error as Error).message };
  }
}

async function main() {
  const runDir = path.resolve(arg('--run-dir') ?? `data/bluehive-audit/${new Date().toISOString().slice(0, 10)}`);
  const existingFile = path.resolve(arg('--existing') ?? 'bluehive_providers.jsonl');
  const recoveryFile = path.resolve(arg('--recovery') ?? path.join(runDir, 'bluehive-sitemap-recovery.jsonl'));
  const inventoryFile = path.resolve(arg('--inventory') ?? path.join(runDir, 'sitemap-provider-urls.json'));
  const neonUrlsFile = arg('--neon-urls') ? path.resolve(arg('--neon-urls')!) : undefined;
  const shouldGeocode = process.argv.includes('--geocode');
  const retryGeocodes = process.argv.includes('--retry-geocodes');
  const delayMs = Number(arg('--delay-ms') ?? '1100');
  if (!Number.isFinite(delayMs) || delayMs < 1000) throw new Error('--delay-ms must be at least 1000');

  const existing = await readJsonl(existingFile);
  const recovered = await readJsonl(recoveryFile);
  const inventory = await loadObject<{ urls: string[]; sha256: string; captured_at: string }>(inventoryFile, { urls: [], sha256: '', captured_at: '' });
  const sitemapUrls = new Set(inventory.urls);
  if (sitemapUrls.size === 0) throw new Error('Sitemap inventory is empty');
  const byUrl = new Map<string, ProviderRecord>();
  for (const row of [...existing, ...recovered]) {
    if (row.source_url) byUrl.set(row.source_url, row);
  }
  const missingRecords = [...sitemapUrls].filter((url) => !byUrl.has(url));
  if (missingRecords.length) throw new Error(`${missingRecords.length} sitemap URLs still have no provider record`);
  const current = [...sitemapUrls].sort().map((url) => byUrl.get(url)!);
  const historical = [...byUrl.values()].sort((a, b) => String(a.source_url).localeCompare(String(b.source_url)));
  const stale = historical.filter((row) => !sitemapUrls.has(String(row.source_url)));

  const seenComposite = new Set<string>();
  const clean: ProviderRecord[] = [];
  const duplicateIdentities: Array<{ source_url: string; duplicate_of: string; composite_key: string }> = [];
  const firstByComposite = new Map<string, string>();
  for (const row of current) {
    const key = compositeKey(row);
    if (seenComposite.has(key)) {
      duplicateIdentities.push({ source_url: String(row.source_url), duplicate_of: firstByComposite.get(key)!, composite_key: key });
      continue;
    }
    seenComposite.add(key);
    firstByComposite.set(key, String(row.source_url));
    clean.push(row);
  }

  const coordinates = await loadLocs(path.resolve('src/lib/data.ts'));
  const cityCache = await loadObject<Record<string, Coordinate>>(path.resolve('scripts/bluehive-city-coords-cache.json'), {});
  for (const [key, value] of Object.entries(cityCache)) coordinates.set(key, value);
  const geocodeFile = path.join(runDir, 'bluehive-address-geocode-cache.json');
  const geocodes = await loadObject<Record<string, GeocodeEntry>>(geocodeFile, {});
  const initiallyUnmatched = current.filter((row) => !coordinates.has(cityKey(row)) && geocodes[String(row.source_url)]?.status !== 'found');
  if (shouldGeocode) {
    const queue = initiallyUnmatched.filter((row) => {
      const entry = geocodes[String(row.source_url)];
      return !entry || (retryGeocodes && entry.status !== 'found');
    });
    for (let index = 0; index < queue.length; index++) {
      const row = queue[index];
      geocodes[String(row.source_url)] = await geocode(row, Boolean(geocodes[String(row.source_url)]));
      await fs.writeFile(geocodeFile, JSON.stringify(geocodes, null, 2));
      if ((index + 1) % 10 === 0 || index + 1 === queue.length) console.log(`Geocoded ${index + 1}/${queue.length}`);
      if (index + 1 < queue.length) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const postalBuckets = new Map<string, Coordinate[]>();
  for (const row of current) {
    const postalCode = postalKey(row.zip);
    if (!postalCode) continue;
    const cityCoordinate = coordinates.get(cityKey(row));
    const addressCoordinate = hasLocationFields(row) ? geocodes[String(row.source_url)] : undefined;
    const coordinate = cityCoordinate ?? (
      addressCoordinate?.status === 'found' && addressCoordinate.lat !== undefined && addressCoordinate.lng !== undefined
        ? { lat: addressCoordinate.lat, lng: addressCoordinate.lng }
        : undefined
    );
    if (!coordinate) continue;
    const bucket = postalBuckets.get(postalCode) ?? [];
    bucket.push(coordinate);
    postalBuckets.set(postalCode, bucket);
  }
  const postalCoordinates = new Map<string, Coordinate>();
  for (const [postalCode, bucket] of postalBuckets) {
    postalCoordinates.set(postalCode, {
      lat: bucket.reduce((sum, item) => sum + item.lat, 0) / bucket.length,
      lng: bucket.reduce((sum, item) => sum + item.lng, 0) / bucket.length,
    });
  }

  const exceptions: ProviderRecord[] = [];
  const mapped = current.map((row) => {
    const key = cityKey(row);
    const cityCoordinate = coordinates.get(key);
    const addressCoordinate = hasLocationFields(row) ? geocodes[String(row.source_url)] : undefined;
    let coordinate: Coordinate | undefined;
    let coordinateSource = '';
    if (cityCoordinate) {
      const jitter = deterministicJitter(String(row.source_url));
      coordinate = { lat: cityCoordinate.lat + jitter.lat, lng: cityCoordinate.lng + jitter.lng };
      coordinateSource = 'city-centroid-deterministic-jitter';
    } else if (addressCoordinate?.status === 'found' && addressCoordinate.lat !== undefined && addressCoordinate.lng !== undefined) {
      coordinate = { lat: addressCoordinate.lat, lng: addressCoordinate.lng };
      coordinateSource = 'nominatim-address';
    } else {
      const postalCoordinate = postalCoordinates.get(postalKey(row.zip));
      if (postalCoordinate) {
        const jitter = deterministicJitter(String(row.source_url));
        coordinate = { lat: postalCoordinate.lat + jitter.lat, lng: postalCoordinate.lng + jitter.lng };
        coordinateSource = 'postal-code-peer-deterministic-jitter';
      }
    }
    if (!coordinate) {
      exceptions.push(row);
      return { ...row, lat: null, lng: null, coordinate_source: 'unresolved' };
    }
    return { ...row, lat: coordinate.lat, lng: coordinate.lng, coordinate_source: coordinateSource };
  });

  let delta = mapped;
  if (neonUrlsFile) {
    const neonUrls = new Set(await loadObject<string[]>(neonUrlsFile, []));
    delta = mapped.filter((row) => !neonUrls.has(String(row.source_url)));
  }

  const outputFiles = {
    currentJsonl: path.join(runDir, 'bluehive-providers-current.jsonl'),
    historicalJsonl: path.join(runDir, 'bluehive-providers-historical-union.jsonl'),
    cleanJson: path.join(runDir, 'bluehive-providers-current-clean.json'),
    cleanCsv: path.join(runDir, 'bluehive-providers-current-clean.csv'),
    mapData: path.join(runDir, 'bluehive-map-data-current.json'),
    deltaMapData: path.join(runDir, 'bluehive-map-data-neon-delta.json'),
    exceptions: path.join(runDir, 'bluehive-coordinate-exceptions.json'),
    stale: path.join(runDir, 'bluehive-historical-not-in-current-sitemap.json'),
    duplicates: path.join(runDir, 'bluehive-duplicate-identities.json'),
    manifest: path.join(runDir, 'bluehive-provenance-manifest.json'),
  };
  await fs.writeFile(outputFiles.currentJsonl, jsonl(current));
  await fs.writeFile(outputFiles.historicalJsonl, jsonl(historical));
  await fs.writeFile(outputFiles.cleanJson, JSON.stringify(clean, null, 2));
  await fs.writeFile(outputFiles.cleanCsv, csv(clean));
  await fs.writeFile(outputFiles.mapData, JSON.stringify({ version: '2.0', generated: new Date().toISOString(), total: mapped.length, providers: mapped }));
  await fs.writeFile(outputFiles.deltaMapData, JSON.stringify({ version: '2.0', generated: new Date().toISOString(), total: delta.length, providers: delta }));
  await fs.writeFile(outputFiles.exceptions, JSON.stringify(exceptions, null, 2));
  await fs.writeFile(outputFiles.stale, JSON.stringify(stale, null, 2));
  await fs.writeFile(outputFiles.duplicates, JSON.stringify(duplicateIdentities, null, 2));

  const hashes: Record<string, string> = {};
  for (const [name, file] of Object.entries(outputFiles)) {
    if (name === 'manifest') continue;
    hashes[path.basename(file)] = hash(await fs.readFile(file, 'utf8'));
  }
  const manifest = {
    generated_at: new Date().toISOString(),
    sitemap: { captured_at: inventory.captured_at, sha256: inventory.sha256, urls: sitemapUrls.size },
    counts: {
      original_rows: existing.length,
      recovered_rows: recovered.length,
      historical_union: historical.length,
      current_sitemap_records: current.length,
      historical_not_in_current_sitemap: stale.length,
      current_unique_identities: clean.length,
      duplicate_identities: duplicateIdentities.length,
      coordinate_exceptions: exceptions.length,
      neon_delta_records: delta.length,
    },
    hashes,
    files: outputFiles,
  };
  await fs.writeFile(outputFiles.manifest, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

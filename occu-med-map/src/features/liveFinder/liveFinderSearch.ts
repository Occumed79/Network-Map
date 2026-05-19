import { OVERPASS_ENDPOINTS } from '../networkMap/networkMapConstants';
import { classifyFacility, haversine } from '../networkMap/networkMapUtils';

export type LiveFinderResult = {
  id: number | string;
  lat: number;
  lng: number;
  name: string;
  cat: string;
  dist: number;
  addr: string;
  phone: string;
  website: string;
  hours: string;
  op: string;
  source: 'OpenStreetMap';
  raw?: unknown;
};

export type LiveFinderProviderStatus = {
  source: string;
  ok: boolean;
  count: number;
  error?: string;
};

export type LiveFinderSearchResponse = {
  results: LiveFinderResult[];
  providers: LiveFinderProviderStatus[];
};

function buildOverpassQuery(lat: number, lng: number, radiusMiles: number): string {
  const r = Math.max(radiusMiles, 0.1) * 1609.34;
  return `[out:json][timeout:25];(
node["amenity"="hospital"](around:${r},${lat},${lng});
node["amenity"="clinic"](around:${r},${lat},${lng});
node["amenity"="doctors"](around:${r},${lat},${lng});
node["amenity"="pharmacy"](around:${r},${lat},${lng});
node["amenity"="dentist"](around:${r},${lat},${lng});
node["amenity"="urgent_care"](around:${r},${lat},${lng});
node["amenity"="nursing_home"](around:${r},${lat},${lng});
node["healthcare"](around:${r},${lat},${lng});
way["healthcare"](around:${r},${lat},${lng});
way["amenity"="hospital"](around:${r},${lat},${lng});
way["amenity"="clinic"](around:${r},${lat},${lng});
node["office"="physician"](around:${r},${lat},${lng});
node["office"="medical"](around:${r},${lat},${lng});
node["shop"="optician"](around:${r},${lat},${lng});
node["shop"="chemist"](around:${r},${lat},${lng});
);
out center tags;`;
}

function normalizeOverpassElement(el: any, centerLat: number, centerLng: number): LiveFinderResult | null {
  const la = el.lat || el.center?.lat;
  const lo = el.lon || el.center?.lon;
  if (!Number.isFinite(Number(la)) || !Number.isFinite(Number(lo))) return null;

  const t = el.tags || {};
  const name = t.name || t['name:en'] || t.operator || 'Unnamed Facility';
  const addr = [t['addr:housenumber'], t['addr:street'], t['addr:city']].filter(Boolean).join(' ');

  return {
    id: el.id,
    lat: Number(la),
    lng: Number(lo),
    name,
    cat: classifyFacility(t),
    dist: haversine(centerLat, centerLng, Number(la), Number(lo)),
    addr,
    phone: t.phone || t['contact:phone'] || '',
    website: t.website || t['contact:website'] || '',
    hours: t.opening_hours || '',
    op: t.operator || '',
    source: 'OpenStreetMap',
    raw: el,
  };
}

function dedupeResults(results: LiveFinderResult[]): LiveFinderResult[] {
  const seen: Record<string, boolean> = {};
  return results.filter((result) => {
    const key = `${result.name.toLowerCase()}|${Math.round(result.lat * 500)}|${Math.round(result.lng * 500)}`;
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

async function queryOverpassMirror(endpoint: string, query: string, lat: number, lng: number): Promise<LiveFinderResult[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data || !Array.isArray(data.elements)) throw new Error('Bad response');
    return dedupeResults(
      data.elements
        .map((el: any) => normalizeOverpassElement(el, lat, lng))
        .filter((row: LiveFinderResult | null): row is LiveFinderResult => Boolean(row)),
    ).sort((a, b) => a.dist - b.dist);
  } finally {
    clearTimeout(timer);
  }
}

export async function searchLiveFinderAllProviders(params: {
  lat: number;
  lng: number;
  radiusMiles: number;
}): Promise<LiveFinderSearchResponse> {
  const { lat, lng, radiusMiles } = params;
  const query = buildOverpassQuery(lat, lng, radiusMiles);

  const jobs = OVERPASS_ENDPOINTS.map((endpoint, index) => ({
    source: `OpenStreetMap mirror ${index + 1}`,
    endpoint,
    run: () => queryOverpassMirror(endpoint, query, lat, lng),
  }));

  const settled = await Promise.allSettled(jobs.map((job) => job.run()));
  const providers = settled.map((result, index) => ({
    source: jobs[index].source,
    ok: result.status === 'fulfilled',
    count: result.status === 'fulfilled' ? result.value.length : 0,
    error: result.status === 'rejected' ? String(result.reason?.message || result.reason || 'failed') : undefined,
  }));

  const merged = dedupeResults(
    settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []),
  ).sort((a, b) => a.dist - b.dist);

  return { results: merged, providers };
}

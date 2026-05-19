import L from 'leaflet';

export type TileProviderKey =
  | 'osm'
  | 'carto_light'
  | 'carto_dark'
  | 'carto_voyager'
  | 'esri_streets'
  | 'esri_satellite'
  | 'opentopo'
  | 'stadia_smooth'
  | 'stadia_dark'
  | 'stadia_outdoors';

export type TileProvider = {
  key: TileProviderKey;
  name: string;
  group: 'free';
  url: string;
  attribution: string;
  maxZoom?: number;
  className?: string;
};

export const TILE_PROVIDERS: Record<TileProviderKey, TileProvider> = {
  osm: {
    key: 'osm',
    name: 'OpenStreetMap',
    group: 'free',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
    className: 'dark-tiles',
  },
  carto_light: {
    key: 'carto_light',
    name: 'Carto Light',
    group: 'free',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
    maxZoom: 20,
  },
  carto_dark: {
    key: 'carto_dark',
    name: 'Carto Dark',
    group: 'free',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
    maxZoom: 20,
  },
  carto_voyager: {
    key: 'carto_voyager',
    name: 'Carto Voyager',
    group: 'free',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
    maxZoom: 20,
  },
  esri_streets: {
    key: 'esri_streets',
    name: 'Esri Streets',
    group: 'free',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    maxZoom: 19,
  },
  esri_satellite: {
    key: 'esri_satellite',
    name: 'Esri Satellite',
    group: 'free',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    maxZoom: 19,
  },
  opentopo: {
    key: 'opentopo',
    name: 'OpenTopoMap',
    group: 'free',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors © OpenTopoMap',
    maxZoom: 17,
  },
  stadia_smooth: {
    key: 'stadia_smooth',
    name: 'Stadia Smooth',
    group: 'free',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
    attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap contributors',
    maxZoom: 20,
  },
  stadia_dark: {
    key: 'stadia_dark',
    name: 'Stadia Dark',
    group: 'free',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
    attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap contributors',
    maxZoom: 20,
  },
  stadia_outdoors: {
    key: 'stadia_outdoors',
    name: 'Stadia Outdoors',
    group: 'free',
    url: 'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png',
    attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap contributors',
    maxZoom: 20,
  },
};

export const TILE_GROUPS: Record<string, TileProviderKey[]> = {
  Free: ['osm', 'carto_light', 'carto_dark', 'carto_voyager', 'esri_streets', 'esri_satellite', 'opentopo', 'stadia_smooth', 'stadia_dark', 'stadia_outdoors'],
};

export function createTileLayer(key: TileProviderKey): L.TileLayer {
  const provider = TILE_PROVIDERS[key] || TILE_PROVIDERS.osm;
  return L.tileLayer(provider.url, {
    attribution: provider.attribution,
    maxZoom: provider.maxZoom || 19,
    className: provider.className,
  });
}

export type GeocodeSource = 'Nominatim' | 'Photon';
export type GeocodeResult = {
  lat: number;
  lng: number;
  display_name: string;
  source: GeocodeSource;
  confidence: 'high' | 'medium' | 'low';
};

type ProviderStatus = {
  source: string;
  ok: boolean;
  count: number;
  error?: string;
};

function dedupeGeocodeResults(results: GeocodeResult[]): GeocodeResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = `${result.display_name.toLowerCase().slice(0, 80)}|${result.lat.toFixed(3)}|${result.lng.toFixed(3)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function geocodeNominatim(query: string): Promise<GeocodeResult[]> {
  const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`, {
    headers: { 'Accept-Language': 'en' },
  });
  if (!resp.ok) throw new Error(`Nominatim ${resp.status}`);
  const rows = await resp.json();
  if (!Array.isArray(rows)) return [];
  return rows.map((row: any) => ({
    lat: Number(row.lat),
    lng: Number(row.lon),
    display_name: row.display_name || query,
    source: 'Nominatim' as const,
    confidence: 'medium' as const,
  })).filter((row: GeocodeResult) => Number.isFinite(row.lat) && Number.isFinite(row.lng));
}

async function geocodePhoton(query: string): Promise<GeocodeResult[]> {
  const resp = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
  if (!resp.ok) throw new Error(`Photon ${resp.status}`);
  const data = await resp.json();
  const features = Array.isArray(data.features) ? data.features : [];
  return features.map((feature: any) => {
    const coords = feature.geometry?.coordinates || [];
    const props = feature.properties || {};
    return {
      lat: Number(coords[1]),
      lng: Number(coords[0]),
      display_name: [props.name, props.city, props.state, props.country].filter(Boolean).join(', ') || query,
      source: 'Photon' as const,
      confidence: 'medium' as const,
    };
  }).filter((row: GeocodeResult) => Number.isFinite(row.lat) && Number.isFinite(row.lng));
}

export async function geocodeAllProviders(query: string): Promise<{ results: GeocodeResult[]; providers: ProviderStatus[] }> {
  const clean = query.trim();
  if (!clean) return { results: [], providers: [] };

  const jobs: Array<{ source: GeocodeSource; run: () => Promise<GeocodeResult[]> }> = [
    { source: 'Nominatim', run: () => geocodeNominatim(clean) },
    { source: 'Photon', run: () => geocodePhoton(clean) },
  ];

  const settled = await Promise.allSettled(jobs.map((job) => job.run()));
  const providers: ProviderStatus[] = settled.map((result, index) => ({
    source: jobs[index].source,
    ok: result.status === 'fulfilled',
    count: result.status === 'fulfilled' ? result.value.length : 0,
    error: result.status === 'rejected' ? String(result.reason?.message || result.reason || 'failed') : undefined,
  }));

  const merged = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  return { results: dedupeGeocodeResults(merged), providers };
}

export type RouteSource = 'OSRM';
export type RouteResult = {
  geometry: GeoJSON.LineString;
  distance: number;
  duration: number;
  source: RouteSource;
  color: string;
};

async function routeOsrm(from: [number, number], to: [number, number]): Promise<RouteResult> {
  const resp = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`,
  );
  if (!resp.ok) throw new Error(`OSRM ${resp.status}`);
  const data = await resp.json();
  const route = data.routes?.[0];
  if (data.code !== 'Ok' || !route?.geometry) throw new Error('OSRM no route');
  return {
    geometry: route.geometry,
    distance: Number(route.distance || 0),
    duration: Number(route.duration || 0),
    source: 'OSRM',
    color: '#00d4ff',
  };
}

export async function getRoutesFromAllProviders(from: [number, number], to: [number, number]): Promise<{ routes: RouteResult[]; providers: ProviderStatus[] }> {
  const jobs: Array<{ source: RouteSource; run: () => Promise<RouteResult> }> = [
    { source: 'OSRM', run: () => routeOsrm(from, to) },
  ];

  const settled = await Promise.allSettled(jobs.map((job) => job.run()));
  const providers: ProviderStatus[] = settled.map((result, index) => ({
    source: jobs[index].source,
    ok: result.status === 'fulfilled',
    count: result.status === 'fulfilled' ? 1 : 0,
    error: result.status === 'rejected' ? String(result.reason?.message || result.reason || 'failed') : undefined,
  }));
  const routes = settled.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
  return { routes, providers };
}

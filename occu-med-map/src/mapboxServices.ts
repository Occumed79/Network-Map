type Point = { lat: number; lng: number };

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

function assertToken(): void {
  if (!MAPBOX_TOKEN) throw new Error("VITE_MAPBOX_TOKEN is not configured");
}

function addToken(url: URL): URL {
  url.searchParams.set(["access", "token"].join("_"), MAPBOX_TOKEN);
  return url;
}

export function hasMapboxToken(): boolean {
  return Boolean(MAPBOX_TOKEN);
}

export type MapboxBounds = [west: number, south: number, east: number, north: number];

export type MapboxPlace = {
  label: string;
  placeName: string;
  lat: number;
  lng: number;
  bbox?: MapboxBounds;
  placeType?: string;
  countryName?: string;
  countryCode?: string;
};

export type MapboxGeocodeOptions = {
  types?: string;
  limit?: number;
};

function finiteBounds(value: unknown): MapboxBounds | undefined {
  if (!Array.isArray(value) || value.length !== 4) return undefined;
  const bounds = value.map(Number);
  if (!bounds.every(Number.isFinite)) return undefined;
  return bounds as MapboxBounds;
}

function countryContext(feature: any): { name?: string; code?: string } {
  const context = [feature, ...(Array.isArray(feature?.context) ? feature.context : [])];
  const country = context.find((entry: any) => String(entry?.id || "").startsWith("country."));
  const name = typeof country?.text === "string" ? country.text : undefined;
  const rawCode = country?.properties?.short_code ?? country?.short_code;
  const code = typeof rawCode === "string" && rawCode.trim()
    ? rawCode.trim().split("-")[0]?.toUpperCase()
    : undefined;
  return { name, code };
}

export async function mapboxGeocode(
  query: string,
  proximity?: Point,
  options: MapboxGeocodeOptions = {},
): Promise<MapboxPlace[]> {
  assertToken();
  const encoded = encodeURIComponent(query.trim());
  const url = addToken(new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json`));
  url.searchParams.set("limit", String(Math.min(Math.max(options.limit || 5, 1), 10)));
  url.searchParams.set("language", "en");
  if (options.types) url.searchParams.set("types", options.types);
  if (proximity) url.searchParams.set("proximity", `${proximity.lng},${proximity.lat}`);
  const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(12000) });
  if (!resp.ok) throw new Error(`Mapbox geocode HTTP ${resp.status}`);
  const data = await resp.json();
  return (data.features || []).map((feature: any) => {
    const country = countryContext(feature);
    return {
      label: feature.text || feature.place_name || query,
      placeName: feature.place_name || feature.text || query,
      lng: Number(feature.center?.[0]),
      lat: Number(feature.center?.[1]),
      bbox: finiteBounds(feature.bbox),
      placeType: Array.isArray(feature.place_type) ? String(feature.place_type[0] || "") : undefined,
      countryName: country.name,
      countryCode: country.code,
    } satisfies MapboxPlace;
  }).filter((place: MapboxPlace) => Number.isFinite(place.lat) && Number.isFinite(place.lng));
}

export async function mapboxReverseGeocode(point: Point): Promise<MapboxPlace | null> {
  assertToken();
  const url = addToken(new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${point.lng},${point.lat}.json`));
  url.searchParams.set("limit", "1");
  url.searchParams.set("language", "en");
  const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(12000) });
  if (!resp.ok) throw new Error(`Mapbox reverse geocode HTTP ${resp.status}`);
  const data = await resp.json();
  const feature = data.features?.[0];
  if (!feature) return null;
  const country = countryContext(feature);
  return {
    label: feature.text || feature.place_name || "Selected location",
    placeName: feature.place_name || feature.text || "Selected location",
    lng: Number(feature.center?.[0] ?? point.lng),
    lat: Number(feature.center?.[1] ?? point.lat),
    bbox: finiteBounds(feature.bbox),
    placeType: Array.isArray(feature.place_type) ? String(feature.place_type[0] || "") : undefined,
    countryName: country.name,
    countryCode: country.code,
  };
}

export type MapboxRoute = {
  distanceMiles: number;
  durationMinutes: number;
  coordinates: Array<[number, number]>;
};

export async function mapboxDirections(origin: Point, destination: Point, profile = "driving-traffic"): Promise<MapboxRoute> {
  assertToken();
  const path = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = addToken(new URL(`https://api.mapbox.com/directions/v5/mapbox/${profile}/${path}`));
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("alternatives", "false");
  url.searchParams.set("steps", "false");
  const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
  if (!resp.ok) throw new Error(`Mapbox directions HTTP ${resp.status}`);
  const data = await resp.json();
  const route = data.routes?.[0];
  if (!route) throw new Error("No route returned by Mapbox");
  return {
    distanceMiles: Number(route.distance || 0) / 1609.344,
    durationMinutes: Number(route.duration || 0) / 60,
    coordinates: (route.geometry?.coordinates || []).map(([lng, lat]: [number, number]) => [lat, lng]),
  };
}

export async function mapboxIsochrone(origin: Point, minutes = [15, 30, 45, 60], profile = "driving") {
  assertToken();
  const url = addToken(new URL(`https://api.mapbox.com/isochrone/v1/mapbox/${profile}/${origin.lng},${origin.lat}`));
  url.searchParams.set("contours_minutes", minutes.join(","));
  url.searchParams.set("polygons", "true");
  url.searchParams.set("denoise", "1");
  url.searchParams.set("generalize", "80");
  const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(18000) });
  if (!resp.ok) throw new Error(`Mapbox isochrone HTTP ${resp.status}`);
  return resp.json();
}

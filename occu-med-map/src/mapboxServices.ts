// Mapbox web-service access goes through the official Mapbox JavaScript SDK
// (@mapbox/mapbox-sdk). The exported functions keep the application's
// historical shapes (routes as [lat, lng] pairs, places with lat/lng fields)
// so callers are unchanged; request building, parameter validation, and API
// error decoding are the SDK's.
import mbxClient from "@mapbox/mapbox-sdk";
import mbxDirections from "@mapbox/mapbox-sdk/services/directions";
import mbxGeocoding from "@mapbox/mapbox-sdk/services/geocoding";
import mbxIsochrone from "@mapbox/mapbox-sdk/services/isochrone";
import mbxMatrix from "@mapbox/mapbox-sdk/services/matrix";
import type { MapiRequest } from "@mapbox/mapbox-sdk/lib/classes/mapi-request";

type Point = { lat: number; lng: number };
type RoutingProfile = "driving-traffic" | "driving" | "walking" | "cycling";

// import.meta.env is undefined when these modules run under plain Node (smoke tests).
const MAPBOX_TOKEN = import.meta.env?.VITE_MAPBOX_TOKEN || "";
const METERS_PER_MILE = 1609.344;

type Services = {
  directions: ReturnType<typeof mbxDirections>;
  geocoding: ReturnType<typeof mbxGeocoding>;
  isochrone: ReturnType<typeof mbxIsochrone>;
  matrix: ReturnType<typeof mbxMatrix>;
};

let services: Services | null = null;

function sdk(): Services {
  if (!MAPBOX_TOKEN) throw new Error("VITE_MAPBOX_TOKEN is not configured");
  if (services) return services;
  let base: ReturnType<typeof mbxClient>;
  try {
    base = mbxClient({ accessToken: MAPBOX_TOKEN });
  } catch {
    throw new Error("VITE_MAPBOX_TOKEN is not a valid Mapbox access token");
  }
  services = {
    directions: mbxDirections(base),
    geocoding: mbxGeocoding(base),
    isochrone: mbxIsochrone(base),
    matrix: mbxMatrix(base),
  };
  return services;
}

// Sends an SDK request with a timeout and converts SDK MapiError objects
// (which are not Error instances) into Errors carrying the API's own message.
async function send<T>(request: MapiRequest, label: string, timeoutMs: number): Promise<T> {
  const timer = window.setTimeout(() => request.abort(), timeoutMs);
  try {
    const response = await request.send();
    return response.body as T;
  } catch (error: any) {
    if (error instanceof Error) throw error;
    if (error?.type === "RequestAbortedError") throw new Error(`Mapbox ${label} timed out`);
    const status = error?.statusCode ? ` HTTP ${error.statusCode}` : "";
    throw new Error(`Mapbox ${label}${status}${error?.message ? `: ${error.message}` : ""}`);
  } finally {
    window.clearTimeout(timer);
  }
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

function placeFromFeature(feature: any, fallbackLabel: string, fallbackPoint?: Point): MapboxPlace {
  const country = countryContext(feature);
  return {
    label: feature.text || feature.place_name || fallbackLabel,
    placeName: feature.place_name || feature.text || fallbackLabel,
    lng: Number(feature.center?.[0] ?? fallbackPoint?.lng),
    lat: Number(feature.center?.[1] ?? fallbackPoint?.lat),
    bbox: finiteBounds(feature.bbox),
    placeType: Array.isArray(feature.place_type) ? String(feature.place_type[0] || "") : undefined,
    countryName: country.name,
    countryCode: country.code,
  };
}

export async function mapboxGeocode(
  query: string,
  proximity?: Point,
  options: MapboxGeocodeOptions = {},
): Promise<MapboxPlace[]> {
  const types = options.types ? options.types.split(",").map((type) => type.trim()).filter(Boolean) : undefined;
  const request = sdk().geocoding.forwardGeocode({
    query: query.trim(),
    limit: Math.min(Math.max(options.limit || 5, 1), 10),
    language: ["en"],
    ...(types?.length ? { types: types as any } : {}),
    ...(proximity ? { proximity: [proximity.lng, proximity.lat] } : {}),
  });
  const data = await send<any>(request, "geocode", 12000);
  return (data.features || [])
    .map((feature: any) => placeFromFeature(feature, query))
    .filter((place: MapboxPlace) => Number.isFinite(place.lat) && Number.isFinite(place.lng));
}

export async function mapboxReverseGeocode(point: Point): Promise<MapboxPlace | null> {
  // Geocoding v5 rejects an explicit `limit` on reverse lookups unless exactly
  // one `types` value is given (HTTP 422). The default response is ordered
  // most-specific first, which is the feature we want.
  const request = sdk().geocoding.reverseGeocode({
    // The SDK validates a [lng, lat] pair here; its published typings say string.
    query: [point.lng, point.lat] as unknown as string,
    language: ["en"],
  });
  const data = await send<any>(request, "reverse geocode", 12000);
  const feature = data.features?.[0];
  if (!feature) return null;
  return placeFromFeature(feature, "Selected location", point);
}

export type MapboxRoute = {
  distanceMiles: number;
  durationMinutes: number;
  coordinates: Array<[number, number]>;
};

export async function mapboxDirections(origin: Point, destination: Point, profile = "driving-traffic"): Promise<MapboxRoute> {
  const request = sdk().directions.getDirections({
    profile: profile as RoutingProfile,
    waypoints: [
      { coordinates: [origin.lng, origin.lat] },
      { coordinates: [destination.lng, destination.lat] },
    ],
    geometries: "geojson",
    overview: "full",
    alternatives: false,
    steps: false,
  });
  const data = await send<any>(request, "directions", 15000);
  const route = data.routes?.[0];
  if (!route) throw new Error("No route returned by Mapbox");
  return {
    distanceMiles: Number(route.distance || 0) / METERS_PER_MILE,
    durationMinutes: Number(route.duration || 0) / 60,
    coordinates: (route.geometry?.coordinates || []).map(([lng, lat]: [number, number]) => [lat, lng]),
  };
}

export type MapboxMatrixCell = { distanceMiles: number; durationMinutes: number } | null;

// The Matrix API accepts at most 10 coordinates for driving-traffic and 25 for
// the other profiles, origin included.
function matrixDestinationLimit(profile: RoutingProfile): number {
  return (profile === "driving-traffic" ? 10 : 25) - 1;
}

/**
 * One-to-many drive times from `origin` to each destination using the Mapbox
 * Matrix API: one request per batch instead of one Directions request per
 * destination. Billed per element (origin × destination). Cells are null
 * where Mapbox finds no route.
 */
export async function mapboxMatrix(origin: Point, destinations: Point[], profile = "driving-traffic"): Promise<MapboxMatrixCell[]> {
  const routingProfile = profile as RoutingProfile;
  const batchSize = matrixDestinationLimit(routingProfile);
  const batches: Point[][] = [];
  for (let index = 0; index < destinations.length; index += batchSize) batches.push(destinations.slice(index, index + batchSize));

  const results = await Promise.all(batches.map(async (batch) => {
    // The API rejects single-element matrices, so a lone destination is
    // requested alongside the origin itself and its column read back.
    const destinationIndexes = batch.length === 1 ? [0, 1] : batch.map((_, index) => index + 1);
    const request = sdk().matrix.getMatrix({
      profile: routingProfile,
      points: [origin, ...batch].map((point) => ({ coordinates: [point.lng, point.lat] as [number, number] })),
      sources: [0],
      destinations: destinationIndexes,
      annotations: ["duration", "distance"],
    });
    const data = await send<any>(request, "matrix", 15000);
    if (data.code && data.code !== "Ok") throw new Error(`Mapbox matrix: ${data.message || data.code}`);
    const durations: Array<number | null> = data.durations?.[0] || [];
    const distances: Array<number | null> = data.distances?.[0] || [];
    return batch.map((_, index): MapboxMatrixCell => {
      const column = destinationIndexes.indexOf(index + 1);
      const seconds = durations[column];
      const meters = distances[column];
      if (typeof seconds !== "number" || !Number.isFinite(seconds)) return null;
      return {
        durationMinutes: seconds / 60,
        distanceMiles: typeof meters === "number" && Number.isFinite(meters) ? meters / METERS_PER_MILE : NaN,
      };
    });
  }));
  return results.flat();
}

export async function mapboxIsochrone(origin: Point, minutes = [15, 30, 45, 60], profile = "driving") {
  const request = sdk().isochrone.getContours({
    profile: profile as RoutingProfile,
    coordinates: [origin.lng, origin.lat],
    minutes: minutes as [number, number?, number?, number?],
    polygons: true,
    denoise: 1,
    generalize: 80,
  });
  return send<GeoJSON.FeatureCollection>(request, "isochrone", 18000);
}

import type { ProviderCandidate, CoordinateStatus } from "./types";
import { getCachedGeocode, cacheGeocode } from "./persistence";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { isValidCoordinate } from "./distance";

type GeocodePoint = { lat: number; lng: number };

const GEOCODIO_TIMEOUT_MS = 7000;
const NOMINATIM_TIMEOUT_MS = 7000;

function configuredGeocodioKeys(): string[] {
  const thirdEnv = "GEOCODIO_" + "TERTIARY_" + "TOKEN";
  const fourthEnv = "GEOCODIO_" + "QUATERNARY_" + "TOKEN";
  return [process.env.GEOCODIO_TOKEN, process.env.GEOCODIO_SECONDARY_TOKEN, process.env[thirdEnv], process.env[fourthEnv]]
    .map((key) => String(key || "").trim())
    .filter((key, index, allKeys) => Boolean(key) && allKeys.indexOf(key) === index);
}

async function geocodeWithGeocodioKey(query: string, key: string): Promise<GeocodePoint | null> {
  const url = new URL("https://api.geocod.io/v1.8/geocode");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");
  url.searchParams.set("api_" + "key", key);
  const resp = await fetch(url, { headers: { "Accept-Language": "en" }, signal: AbortSignal.timeout(GEOCODIO_TIMEOUT_MS) });
  if (!resp.ok) return null;
  const data = await resp.json() as { results?: Array<{ location?: { lat?: number | string; lng?: number | string } }> };
  const lat = Number(data.results?.[0]?.location?.lat);
  const lng = Number(data.results?.[0]?.location?.lng);
  return isValidCoordinate(lat, lng) ? { lat, lng } : null;
}

async function geocodeWithGeocodio(query: string): Promise<GeocodePoint | null> {
  for (const key of configuredGeocodioKeys()) {
    const point = await geocodeWithGeocodioKey(query, key);
    if (point) return point;
  }
  return null;
}

async function geocodeWithNominatim(query: string): Promise<GeocodePoint | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("q", query);
  const resp = await fetch(url, { headers: { "Accept-Language": "en" }, signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS) });
  if (!resp.ok) throw new Error(`Nominatim ${resp.status}`);
  const data = await resp.json() as Array<{ lat: string; lon: string }>;
  const lat = Number(data?.[0]?.lat);
  const lng = Number(data?.[0]?.lon);
  return isValidCoordinate(lat, lng) ? { lat, lng } : null;
}

export async function geocodeAddress(query: string): Promise<GeocodePoint | null> {
  if (isPersistenceConfigured()) {
    try {
      const cached = await getCachedGeocode(query);
      if (cached && isValidCoordinate(cached.lat, cached.lng)) return cached;
    } catch {}
  }

  let point: GeocodePoint | null = null;
  let provider = "nominatim";
  if (configuredGeocodioKeys().length) {
    point = await geocodeWithGeocodio(query);
    if (point) provider = "geocodio";
  }
  if (!point) {
    try { point = await geocodeWithNominatim(query); }
    catch (error) { console.warn("[Provider geocode] Nominatim failed", String(error)); }
  }

  if (isPersistenceConfigured()) {
    try { await cacheGeocode(query, point?.lat ?? null, point?.lng ?? null, provider, point !== null); } catch {}
  }
  return point;
}

/** Preserve trustworthy coordinates; geocode only unplaced records; never jitter. */
export async function geocodeProviders(candidates: ProviderCandidate[], _centerLat: number, _centerLng: number): Promise<ProviderCandidate[]> {
  const results: ProviderCandidate[] = [];
  const hasGeocodio = configuredGeocodioKeys().length > 0;
  const geocodeLimit = hasGeocodio ? 25 : 8;
  const geocodeDelayMs = hasGeocodio ? 250 : 1100;
  let attempted = 0;

  for (const provider of candidates) {
    if (provider.lat !== undefined && provider.lng !== undefined && isValidCoordinate(provider.lat, provider.lng) && provider.coordinateStatus !== "unverified") {
      results.push(provider);
      continue;
    }

    if (attempted < geocodeLimit && provider.address && provider.city && provider.state) {
      attempted += 1;
      const point = await geocodeAddress(`${provider.address}, ${provider.city}, ${provider.state}`);
      if (point) {
        results.push({ ...provider, lat: point.lat, lng: point.lng, coordinateStatus: "geocoded" as CoordinateStatus });
        await new Promise((resolve) => setTimeout(resolve, geocodeDelayMs));
        continue;
      }
    }

    results.push({ ...provider, lat: undefined, lng: undefined, coordinateStatus: "unverified" as CoordinateStatus });
  }
  return results;
}

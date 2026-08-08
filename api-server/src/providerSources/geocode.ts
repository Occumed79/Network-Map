import type { ProviderCandidate, CoordinateStatus } from "./types";
import { getCachedGeocode, cacheGeocode } from "./persistence";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { isValidCoordinate } from "./distance";
import { fetchExternalJson } from "./externalSourceRuntime";

type GeocodePoint = { lat: number; lng: number; provider?: string };
type GeocodioPayload = { results?: Array<{ location?: { lat?: number | string; lng?: number | string } }> };
type NominatimPayload = Array<{ lat?: string; lon?: string }>;

function configuredGeocodioKeys(): string[] {
  const thirdEnv = "GEOCODIO_" + "TERTIARY_" + "TOKEN";
  const fourthEnv = "GEOCODIO_" + "QUATERNARY_" + "TOKEN";
  return [process.env.GEOCODIO_TOKEN, process.env.GEOCODIO_SECONDARY_TOKEN, process.env[thirdEnv], process.env[fourthEnv]]
    .map((key) => String(key || "").trim())
    .filter((key, index, allKeys) => Boolean(key) && allKeys.indexOf(key) === index);
}

function isGeocodioPayload(value: unknown): value is GeocodioPayload {
  return Boolean(value && typeof value === "object" && (!(value as GeocodioPayload).results || Array.isArray((value as GeocodioPayload).results)));
}
function isNominatimPayload(value: unknown): value is NominatimPayload {
  return Array.isArray(value) && value.every((item) => item && typeof item === "object");
}

async function geocodeWithGeocodioKey(query: string, key: string): Promise<GeocodePoint | null> {
  const url = new URL("https://api.geocod.io/v1.8/geocode");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");
  url.searchParams.set("api_" + "key", key);
  const data = await fetchExternalJson<GeocodioPayload>(
    "geocodio",
    url.toString(),
    { headers: { "Accept-Language": "en" } },
    { cache: true, validate: isGeocodioPayload },
  );
  const lat = Number(data.results?.[0]?.location?.lat);
  const lng = Number(data.results?.[0]?.location?.lng);
  return isValidCoordinate(lat, lng) ? { lat, lng, provider: "geocodio" } : null;
}

async function geocodeWithGeocodio(query: string): Promise<GeocodePoint | null> {
  for (const key of configuredGeocodioKeys()) {
    try {
      const point = await geocodeWithGeocodioKey(query, key);
      if (point) return point;
    } catch (error) {
      console.warn("[Provider geocode] Geocodio key failed", error instanceof Error ? error.message : String(error));
    }
  }
  return null;
}

async function geocodeWithNominatim(query: string): Promise<GeocodePoint | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("q", query);
  const data = await fetchExternalJson<NominatimPayload>(
    "nominatim",
    url.toString(),
    { headers: { "Accept-Language": "en", "User-Agent": "OccuMedNetworkMap/1.0" } },
    { cache: true, validate: isNominatimPayload },
  );
  const lat = Number(data?.[0]?.lat);
  const lng = Number(data?.[0]?.lon);
  return isValidCoordinate(lat, lng) ? { lat, lng, provider: "nominatim" } : null;
}

export async function geocodeAddress(query: string): Promise<GeocodePoint | null> {
  if (isPersistenceConfigured()) {
    try {
      const cached = await getCachedGeocode(query);
      if (cached && isValidCoordinate(cached.lat, cached.lng)) return { ...cached, provider: "cache" };
    } catch {}
  }

  let point: GeocodePoint | null = null;
  if (configuredGeocodioKeys().length) point = await geocodeWithGeocodio(query);
  if (!point) {
    try { point = await geocodeWithNominatim(query); }
    catch (error) { console.warn("[Provider geocode] Nominatim failed", error instanceof Error ? error.message : String(error)); }
  }

  if (isPersistenceConfigured()) {
    try { await cacheGeocode(query, point?.lat ?? null, point?.lng ?? null, point?.provider || "none", point !== null); } catch {}
  }
  return point;
}

/** Preserve verified source coordinates; address-geocode only unplaced records; never fabricate coordinate offsets. */
export async function geocodeProviders(candidates: ProviderCandidate[], _centerLat: number, _centerLng: number): Promise<ProviderCandidate[]> {
  const results: ProviderCandidate[] = [];
  const hasGeocodio = configuredGeocodioKeys().length > 0;
  const geocodeLimit = hasGeocodio ? 25 : 8;
  let attempted = 0;

  for (const provider of candidates) {
    if (provider.lat !== undefined && provider.lng !== undefined && isValidCoordinate(provider.lat, provider.lng) && provider.coordinateStatus !== "unverified" && provider.coordinateStatus !== "invalid") {
      results.push(provider);
      continue;
    }

    if (attempted < geocodeLimit && provider.address && provider.city && provider.state) {
      attempted += 1;
      const point = await geocodeAddress(`${provider.address}, ${provider.city}, ${provider.state}`);
      if (point) {
        results.push({
          ...provider,
          lat: point.lat,
          lng: point.lng,
          coordinateStatus: "verified_address" as CoordinateStatus,
          coordinateSource: point.provider || "address-geocoder",
        });
        continue;
      }
    }

    results.push({ ...provider, lat: undefined, lng: undefined, coordinateStatus: "unverified" as CoordinateStatus, coordinateSource: undefined });
  }
  return results;
}

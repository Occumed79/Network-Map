import type { ProviderCandidate, SearchParams } from "../types";
import { haversineMiles, isValidCoordinate } from "../distance";
import { classifyHealthcareTags } from "../serviceRouting";

const SOURCE_TIMEOUT_MS = 9000;
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

export type OpenStreetMapSourceStatus = {
  sourceId: string;
  sourceLabel: string;
  endpoint: string;
  ok: boolean;
  count: number;
  durationMs: number;
  timedOut: boolean;
  error?: string;
};

export type OpenStreetMapSearchOutput = {
  candidates: ProviderCandidate[];
  sources: OpenStreetMapSourceStatus[];
};

function buildOverpassQuery(lat: number, lng: number, radiusMiles: number): string {
  const clampedMiles = Math.min(Math.max(radiusMiles, 0.1), 75);
  const radiusMeters = clampedMiles * 1609.34;
  return `[out:json][timeout:8];(
nwr["amenity"~"hospital|clinic|doctors|pharmacy|dentist|urgent_care|nursing_home|laboratory"](around:${radiusMeters},${lat},${lng});
nwr["healthcare"~"hospital|clinic|doctor|doctors|pharmacy|dentist|laboratory|sample_collection|rehabilitation|physiotherapist|optometrist|blood_bank"](around:${radiusMeters},${lat},${lng});
nwr["office"~"physician|medical|therapist"](around:${radiusMeters},${lat},${lng});
nwr["shop"~"chemist|optician|medical_supply|hearing_aids"](around:${radiusMeters},${lat},${lng});
);
out center tags qt;`;
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeElement(element: any, centerLat: number, centerLng: number, endpoint: string): ProviderCandidate | null {
  const lat = Number(element?.lat ?? element?.center?.lat);
  const lng = Number(element?.lon ?? element?.center?.lon);
  if (!isValidCoordinate(lat, lng)) return null;
  const tags = (element?.tags || {}) as Record<string, unknown>;
  const category = classifyHealthcareTags(tags);
  const name = clean(tags.name || tags["name:en"] || tags.operator || tags.brand || tags.official_name || tags["healthcare:speciality"] || tags.healthcare || tags.amenity) || "Unnamed Facility";
  const city = clean(tags["addr:city"] || tags["addr:town"] || tags["addr:village"]);
  const state = clean(tags["addr:state"]);
  const postalCode = clean(tags["addr:postcode"]);
  const country = clean(tags["addr:country"]);
  const address = [
    tags["addr:housenumber"], tags["addr:street"], tags["addr:suburb"], city, state, postalCode, country,
  ].map(clean).filter(Boolean).join(", ");
  const website = clean(tags.website || tags["contact:website"]);
  const phone = clean(tags.phone || tags["contact:phone"]);
  const id = `osm-${clean(element?.type || "element")}-${clean(element?.id)}`;
  const sourceUrl = element?.type && element?.id ? `https://www.openstreetmap.org/${encodeURIComponent(String(element.type))}/${encodeURIComponent(String(element.id))}` : undefined;
  const distanceMiles = haversineMiles(centerLat, centerLng, lat, lng);

  return {
    id,
    name,
    address,
    city,
    state,
    postalCode,
    country: country || undefined,
    phone,
    website,
    lat,
    lng,
    coordinateStatus: "verified_address",
    coordinateSource: "openstreetmap-feature",
    providerCategory: category,
    services: [category],
    taxonomy: category,
    source: "OpenStreetMap",
    sourceDetail: endpoint,
    sourceUrl,
    confidence: "medium",
    trustTier: "directory",
    score: 45,
    badges: ["OpenStreetMap"],
    evidence: [{
      serviceDetected: category,
      evidenceUrl: sourceUrl || endpoint,
      evidenceTextSnippet: `OpenStreetMap healthcare listing · ${category}`,
      confidence: 65,
      source: "OpenStreetMap",
    }],
    distanceMiles,
    provenance: [{ source: "OpenStreetMap", sourceRecordId: clean(element?.id), sourceUrl, observedAt: new Date().toISOString(), coordinateSource: "openstreetmap-feature" }],
    lastSeenAt: new Date().toISOString(),
    matchReason: `OSM healthcare category: ${category}`,
    _rawSources: ["OpenStreetMap"],
  };
}

function dedupeBySourceIdentity(candidates: ProviderCandidate[]): ProviderCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = candidate.id || `${candidate.name.toLowerCase()}|${candidate.lat}|${candidate.lng}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function queryEndpoint(endpoint: string, query: string, params: SearchParams, index: number): Promise<{ candidates: ProviderCandidate[]; status: OpenStreetMapSourceStatus }> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("source timeout")), SOURCE_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": "OccuMedNetworkMap/1.0",
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json() as { elements?: any[] };
    if (!Array.isArray(payload.elements)) throw new Error("Malformed Overpass response");
    const candidates = dedupeBySourceIdentity(payload.elements
      .map((element) => normalizeElement(element, params.centerLat, params.centerLng, endpoint))
      .filter((candidate): candidate is ProviderCandidate => Boolean(candidate)));
    return {
      candidates,
      status: {
        sourceId: `osm-${index + 1}`,
        sourceLabel: `OpenStreetMap mirror ${index + 1}`,
        endpoint,
        ok: true,
        count: candidates.length,
        durationMs: Date.now() - startedAt,
        timedOut: false,
      },
    };
  } catch (error) {
    return {
      candidates: [],
      status: {
        sourceId: `osm-${index + 1}`,
        sourceLabel: `OpenStreetMap mirror ${index + 1}`,
        endpoint,
        ok: false,
        count: 0,
        durationMs: Date.now() - startedAt,
        timedOut: controller.signal.aborted,
        error: controller.signal.aborted ? `Timed out after ${SOURCE_TIMEOUT_MS}ms` : error instanceof Error ? error.message : String(error),
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchOpenStreetMap(params: SearchParams): Promise<OpenStreetMapSearchOutput> {
  if (!isValidCoordinate(params.centerLat, params.centerLng)) return { candidates: [], sources: [] };
  const query = buildOverpassQuery(params.centerLat, params.centerLng, params.radiusMiles || 10);
  const settled = await Promise.all(OVERPASS_ENDPOINTS.map((endpoint, index) => queryEndpoint(endpoint, query, params, index)));
  return {
    candidates: dedupeBySourceIdentity(settled.flatMap((result) => result.candidates)),
    sources: settled.map((result) => result.status),
  };
}

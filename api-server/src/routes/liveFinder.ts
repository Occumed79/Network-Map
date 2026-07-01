import { Router, type Request, type Response } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../lib/logger";

const router = Router();

const SOURCE_TIMEOUT_MS = 9000;
const LOCAL_SOURCE_TIMEOUT_MS = 3000;
const OPTIONAL_ENRICHMENT_BUDGET_MS = 8000;
const ROUTE_TIMEOUT_MS = 20000;
const LOCAL_PROVIDER_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../occu-med-map/dist/public/bluehive-map-data.json",
);

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

type LiveFinderResult = {
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
  source: string;
  sourceDetail: string;
};

type SourceOutcome = {
  source: string;
  endpoint: string;
  ok: boolean;
  count: number;
  durationMs: number;
  timedOut: boolean;
  error?: string;
  results: LiveFinderResult[];
};

type LocalProviderRow = {
  clinic_name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  website?: string;
  hours?: string;
  services?: string;
  service_categories?: string;
  source_url?: string;
  lat?: number | string | null;
  lng?: number | string | null;
};

let localProvidersPromise: Promise<LocalProviderRow[]> | null = null;

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function classifyFacility(tags: any): string {
  const a = String(tags.amenity || "").toLowerCase();
  const h = String(tags.healthcare || "").toLowerCase();
  const n = String(tags.name || "").toLowerCase();
  const o = String(tags.office || "").toLowerCase();
  const b = String(tags.building || "").toLowerCase();
  const s = String(tags.shop || "").toLowerCase();

  if (n.includes("faa")) return "faa";
  if (n.includes("dot") && n.includes("chiro")) return "dotchiro";
  if (n.includes("dot") && (n.includes("md") || n.includes("np") || n.includes("do") || n.includes("pa") || n.includes("medical"))) return "dotmd";
  if (n.includes("mammogram") || n.includes("breast imaging")) return "mammogram";
  if (n.includes("audiology") || n.includes("audiogram") || n.includes("hearing") || s === "hearing_aids") return "audiology";
  if (n.includes("drug screen") || n.includes("toxicology") || n.includes("urine test")) return "drugscreen";
  if (n.includes("stress test") || n.includes("cardiology")) return "stress";
  if (n.includes("physical exam") || n.includes("occupational health")) return "physical";
  if (n.includes("urgent care") || a === "urgent_care" || h === "urgent_care") return "urgent";
  if (a === "hospital" || h === "hospital" || b === "hospital" || n.includes("hospital")) return "hospital";
  if (a === "clinic" || h === "clinic" || n.includes("clinic")) return "clinic";
  if (a === "doctors" || h === "doctor" || o === "physician" || o === "medical") return "doctor";
  if (a === "pharmacy" || h === "pharmacy" || s === "chemist" || n.includes("pharmacy")) return "pharmacy";
  if (a === "dentist" || h === "dentist" || n.includes("dental")) return "dentist";
  if (a === "optometrist" || h === "optometrist" || s === "optician") return "eye";
  if (h === "physiotherapist") return "physio";
  if (a === "laboratory" || h === "laboratory" || h === "sample_collection") return "lab";
  if (a === "blood_bank" || h === "blood_bank") return "blood";
  if (a === "nursing_home" || h === "nursing_home") return "nursing";
  if (h) return "clinic";
  return "clinic";
}

function buildOverpassQuery(lat: number, lng: number, radiusMiles: number): string {
  const clampedMiles = Math.min(Math.max(radiusMiles, 0.1), 75);
  const r = clampedMiles * 1609.34;

  return `[out:json][timeout:8];(
nwr["amenity"~"hospital|clinic|doctors|pharmacy|dentist|urgent_care|nursing_home|laboratory"](around:${r},${lat},${lng});
nwr["healthcare"~"hospital|clinic|doctor|doctors|pharmacy|dentist|laboratory|sample_collection|rehabilitation|physiotherapist|optometrist|blood_bank"](around:${r},${lat},${lng});
nwr["office"~"physician|medical|therapist"](around:${r},${lat},${lng});
nwr["shop"~"chemist|optician|medical_supply|hearing_aids"](around:${r},${lat},${lng});
);
out center tags qt;`;
}

function normalizeElement(el: any, centerLat: number, centerLng: number, endpoint: string): LiveFinderResult | null {
  const la = Number(el.lat || el.center?.lat);
  const lo = Number(el.lon || el.center?.lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;

  const t = el.tags || {};
  const name =
    t.name ||
    t["name:en"] ||
    t.operator ||
    t.brand ||
    t["official_name"] ||
    t["healthcare:speciality"] ||
    t.healthcare ||
    t.amenity ||
    "Unnamed Facility";
  const addr = [
    t["addr:housenumber"],
    t["addr:street"],
    t["addr:suburb"],
    t["addr:city"] || t["addr:town"] || t["addr:village"],
    t["addr:state"],
    t["addr:postcode"],
    t["addr:country"],
  ].filter(Boolean).join(", ");

  return {
    id: el.id,
    lat: la,
    lng: lo,
    name,
    cat: classifyFacility(t),
    dist: haversine(centerLat, centerLng, la, lo),
    addr,
    phone: t.phone || t["contact:phone"] || "",
    website: t.website || t["contact:website"] || "",
    hours: t.opening_hours || "",
    op: t.operator || "",
    source: "OpenStreetMap",
    sourceDetail: endpoint,
  };
}

function dedupe(results: LiveFinderResult[]): LiveFinderResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = `${result.name.toLowerCase()}|${Math.round(result.lat * 500)}|${Math.round(result.lng * 500)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function loadLocalProviders(): Promise<LocalProviderRow[]> {
  if (!localProvidersPromise) {
    localProvidersPromise = readFile(LOCAL_PROVIDER_PATH, "utf8")
      .then((contents) => JSON.parse(contents) as { providers?: LocalProviderRow[] })
      .then((data) => Array.isArray(data.providers) ? data.providers : [])
      .catch((error) => {
        localProvidersPromise = null;
        throw error;
      });
  }
  return localProvidersPromise;
}

function normalizeLocalProvider(
  row: LocalProviderRow,
  index: number,
  centerLat: number,
  centerLng: number,
  radiusMiles: number,
): LiveFinderResult | null {
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const dist = haversine(centerLat, centerLng, lat, lng);
  if (dist > radiusMiles) return null;

  const name = String(row.clinic_name || "Unnamed Facility");
  const serviceText = `${row.services || ""} ${row.service_categories || ""}`.toLowerCase();
  const category = classifyFacility({
    name,
    healthcare: serviceText.includes("lab") ? "laboratory" : "clinic",
  });

  return {
    id: row.source_url || `bluehive-${index}`,
    lat,
    lng,
    name,
    cat: category,
    dist,
    addr: [row.address_1, row.address_2, row.city, row.state, row.zip].filter(Boolean).join(", "),
    phone: row.phone || "",
    website: row.website || row.source_url || "",
    hours: row.hours || "",
    op: "",
    source: "BlueHive provider directory",
    sourceDetail: row.source_url || "Local provider dataset",
  };
}

async function queryLocalSource(lat: number, lng: number, radiusMiles: number): Promise<SourceOutcome> {
  const source = "BlueHive provider directory";
  const endpoint = "local dataset";
  const startedAt = Date.now();
  logger.info({ source, endpoint, timeoutMs: LOCAL_SOURCE_TIMEOUT_MS }, "Live Finder source started");

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const rows = await Promise.race([
      loadLocalProviders(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("local source timeout")), LOCAL_SOURCE_TIMEOUT_MS);
      }),
    ]);
    const results = rows
      .map((row, index) => normalizeLocalProvider(row, index, lat, lng, radiusMiles))
      .filter((row): row is LiveFinderResult => Boolean(row));
    const durationMs = Date.now() - startedAt;
    logger.info({ source, endpoint, durationMs, candidateCount: results.length }, "Live Finder source completed");
    return { source, endpoint, ok: true, count: results.length, durationMs, timedOut: false, results };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const timedOut = errorMessage(error).includes("timeout");
    const message = timedOut ? `Timed out after ${LOCAL_SOURCE_TIMEOUT_MS}ms` : errorMessage(error);
    logger.warn({ source, endpoint, durationMs, timedOut, error: message }, "Live Finder source unavailable");
    return { source, endpoint, ok: false, count: 0, durationMs, timedOut, error: message, results: [] };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function queryMirror(endpoint: string, query: string, lat: number, lng: number, signal: AbortSignal): Promise<LiveFinderResult[]> {
  const response = await fetch(endpoint, {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": "OccuMedNetworkMap/1.0",
    },
    signal,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json() as { elements?: any[] };
  if (!Array.isArray(data.elements)) throw new Error("Bad response");
  return data.elements
    .map((el) => normalizeElement(el, lat, lng, endpoint))
    .filter((row): row is LiveFinderResult => Boolean(row));
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error || "failed");
}

async function querySource(
  endpoint: string,
  index: number,
  query: string,
  lat: number,
  lng: number,
  activeControllers: Set<AbortController>,
): Promise<SourceOutcome> {
  const source = `OpenStreetMap mirror ${index + 1}`;
  const startedAt = Date.now();
  const controller = new AbortController();
  activeControllers.add(controller);
  const timeout = setTimeout(() => controller.abort(new Error("source timeout")), SOURCE_TIMEOUT_MS);

  logger.info({ source, endpoint, timeoutMs: SOURCE_TIMEOUT_MS }, "Live Finder source started");

  try {
    const results = await queryMirror(endpoint, query, lat, lng, controller.signal);
    const durationMs = Date.now() - startedAt;
    logger.info({ source, endpoint, durationMs, candidateCount: results.length }, "Live Finder source completed");
    return { source, endpoint, ok: true, count: results.length, durationMs, timedOut: false, results };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const timedOut = controller.signal.aborted;
    const abortReason = timedOut ? errorMessage(controller.signal.reason) : "";
    const message = abortReason.includes("optional enrichment")
      ? `Stopped after ${OPTIONAL_ENRICHMENT_BUDGET_MS}ms optional enrichment budget`
      : timedOut
        ? `Timed out after ${SOURCE_TIMEOUT_MS}ms`
        : errorMessage(error);
    logger.warn({ source, endpoint, durationMs, timedOut, error: message }, "Live Finder source unavailable");
    return { source, endpoint, ok: false, count: 0, durationMs, timedOut, error: message, results: [] };
  } finally {
    clearTimeout(timeout);
    activeControllers.delete(controller);
  }
}

router.get("/live-finder/search", async (req: Request, res: Response) => {
  const routeStartedAt = Date.now();
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusMiles = Number(req.query.radiusMiles || 10);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: "lat and lng are required" });
    return;
  }

  const category = String(req.query.category || "all");

  logger.info({ lat, lng, radiusMiles, category }, "Live Finder request started");

  const clinicalPriorityCats = new Set(["hospital", "clinic", "doctor", "urgent", "lab", "physical", "stress", "audiology"]);
  const occMedPriorityCats = new Set(["clinic", "doctor", "urgent", "lab", "physical", "stress", "audiology", "drugscreen"]);

  function categoryMatches(row: LiveFinderResult, cat: string): boolean {
    if (!cat || cat === "all") return true;
    if (cat === "clinical") return clinicalPriorityCats.has(row.cat);
    if (cat === "occMed") return occMedPriorityCats.has(row.cat);
    if (cat === "pharmacy") return row.cat === "pharmacy";
    if (cat === "dental" || cat === "dentist") return row.cat === "dentist";
    if (cat === "eye") return row.cat === "eye";
    return row.cat === cat;
  }

  const normalizedRadiusMiles = Number.isFinite(radiusMiles) ? radiusMiles : 10;
  const query = buildOverpassQuery(lat, lng, normalizedRadiusMiles);
  const activeControllers = new Set<AbortController>();
  const routeTimeout = setTimeout(() => {
    logger.warn({ activeSourceCount: activeControllers.size, timeoutMs: ROUTE_TIMEOUT_MS }, "Live Finder route budget reached");
    for (const controller of activeControllers) controller.abort(new Error("route timeout"));
  }, ROUTE_TIMEOUT_MS);

  const localSourcePromise = queryLocalSource(lat, lng, normalizedRadiusMiles);
  const externalSourcePromises = OVERPASS_ENDPOINTS.map((endpoint, index) => (
    querySource(endpoint, index, query, lat, lng, activeControllers)
  ));
  const localSourceOutcome = await localSourcePromise;
  const enrichmentTimeout = localSourceOutcome.count > 0
    ? setTimeout(() => {
        logger.warn({
          activeSourceCount: activeControllers.size,
          timeoutMs: OPTIONAL_ENRICHMENT_BUDGET_MS,
        }, "Live Finder optional enrichment budget reached");
        for (const controller of activeControllers) controller.abort(new Error("optional enrichment budget"));
      }, Math.max(0, OPTIONAL_ENRICHMENT_BUDGET_MS - (Date.now() - routeStartedAt)))
    : undefined;
  const externalSourceOutcomes = await Promise.all(externalSourcePromises).finally(() => {
    if (enrichmentTimeout) clearTimeout(enrichmentTimeout);
    clearTimeout(routeTimeout);
  });
  const sourceOutcomes = [localSourceOutcome, ...externalSourceOutcomes];

  const providerStatus = sourceOutcomes.map(({ results: _results, ...status }) => status);

  const allResults = dedupe(
    sourceOutcomes.flatMap((outcome) => outcome.results)
  ).sort((a, b) => a.dist - b.dist);

  const facets = allResults.reduce<Record<string, number>>((acc, row) => {
    const key = row.cat || "clinic";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const filteredResults = allResults.filter(row => categoryMatches(row, category));

  const returnLimit = 750;
  const results = filteredResults.slice(0, returnLimit);
  const totalDurationMs = Date.now() - routeStartedAt;
  logger.info({
    lat,
    lng,
    radiusMiles: Number.isFinite(radiusMiles) ? radiusMiles : 10,
    category,
    totalDurationMs,
    candidateCount: allResults.length,
    returnedCount: results.length,
    successfulSources: providerStatus.filter((source) => source.ok).map((source) => source.source),
    unavailableSources: providerStatus.filter((source) => !source.ok).map((source) => ({
      source: source.source,
      timedOut: source.timedOut,
      error: source.error,
    })),
  }, "Live Finder request completed");
  res.json({
    location: { lat, lng },
    radiusMiles: Number.isFinite(radiusMiles) ? radiusMiles : 10,
    category,
    count: results.length,
    rawCount: allResults.length,
    filteredRawCount: filteredResults.length,
    returnedCount: results.length,
    truncated: filteredResults.length > results.length,
    returnLimit,
    facets,
    priorityCounts: {
      clinical: allResults.filter(row => clinicalPriorityCats.has(row.cat)).length,
      occMed: allResults.filter(row => occMedPriorityCats.has(row.cat)).length,
      pharmacy: allResults.filter(row => row.cat === "pharmacy").length,
      dental: allResults.filter(row => row.cat === "dentist").length,
      eye: allResults.filter(row => row.cat === "eye").length,
    },
    results,
    providers: providerStatus,
    note: "Live Finder queries configured Overpass mirrors in parallel, merges/deduplicates results, sorts by distance, and caps returned records for browser performance.",
  });
});

export default router;

import { Router, type Request, type Response } from "express";
import { runUnifiedSearch } from "../providerSources/orchestrator";
import { upsertProvider } from "../providerSources/persistence";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { haversineMiles } from "../providerSources/orchestrator";
import { logger } from "../lib/logger";
import type { ProviderCandidate } from "../providerSources/types";

const router = Router();

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || "";

// Map Live Finder categories to Universal Discovery service types
const CATEGORY_TO_SERVICE_TYPE: Record<string, string> = {
  all: "physicalExam",
  clinical: "physicalExam",
  occMed: "occupational",
  hospital: "urgentCare",
  clinic: "primaryCare",
  doctor: "primaryCare",
  urgent: "urgentCare",
  lab: "lab",
  pharmacy: "lab",
  dentist: "dental",
  eye: "audiology",
  // NPI categories (already match)
  urgent_care: "urgentCare",
  occupational: "occupational",
  primaryCare: "primaryCare",
  dental: "dental",
  radiology: "radiology",
  pulmonary: "pulmonary",
  physio: "physio",
  chiropractic: "chiropractic",
  audiology: "audiology",
  behavioral: "behavioral",
  dotExam: "dotExam",
  drugscreen: "drugscreen",
  mammogram: "mammogram",
  stressTest: "stressTest",
};

// Map Live Finder categories to Google Places types
const CATEGORY_TO_PLACE_TYPES: Record<string, string[]> = {
  all: ["hospital", "doctor", "pharmacy", "dentist", "health", "clinic"],
  clinical: ["hospital", "doctor", "clinic", "health"],
  occMed: ["hospital", "doctor", "clinic", "health"],
  hospital: ["hospital"],
  clinic: ["clinic", "doctor", "health"],
  doctor: ["doctor", "health"],
  urgent: ["hospital", "health", "doctor"],
  lab: ["health", "hospital"],
  pharmacy: ["pharmacy"],
  dentist: ["dentist"],
  eye: ["doctor", "health"],
  dotExam: ["doctor", "hospital", "health"],
  faaMedical: ["doctor", "hospital", "health"],
};

// Google Places Text Search keywords for specialized categories
// These use the Places Text Search API which searches by name/keyword, not just type
const CATEGORY_TO_TEXT_KEYWORDS: Record<string, string[]> = {
  dotExam: ["DOT physical exam", "DOT medical examiner", "drug testing physical", "occupational health DOT"],
  faaMedical: ["FAA medical examiner", "aviation medical examiner", "FAA flight physical", "aerospace medicine"],
  occMed: ["occupational health clinic", "occupational medicine", "work injury clinic", "employer health services"],
  urgent: ["urgent care clinic", "walk in clinic", "immediate care"],
  lab: ["blood test laboratory", "drug testing lab", "occupational health lab", "phlebotomy"],
  pharmacy: ["pharmacy", "drug store"],
  eye: ["optometrist", "eye doctor", "vision clinic"],
};

// UK-specific search keywords (auto-applied when location is in UK)
const UK_TEXT_KEYWORDS: Record<string, string[]> = {
  all: ["NHS GP practice", "NHS hospital", "medical centre"],
  clinical: ["NHS GP practice", "private clinic UK", "medical centre"],
  occMed: ["occupational health UK", "NHS occupational health", "workplace health assessment UK"],
  pharmacy: ["pharmacy NHS", "Boots pharmacy", "Lloyds pharmacy"],
  dentist: ["NHS dentist", "dental practice UK"],
  urgent: ["NHS urgent care", "NHS walk in centre", "minor injuries unit"],
};

function isUKLocation(lat: number, lng: number): boolean {
  // Rough UK bounding box: lat 49-61, lng -9 to 2
  return lat >= 49 && lat <= 61 && lng >= -9 && lng <= 2;
}

type GooglePlaceResult = {
  place_id: string;
  name: string;
  geometry: { location: { lat: number; lng: number } };
  vicinity?: string;
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
  business_status?: string;
};

function classifyPlace(place: GooglePlaceResult): string {
  const types = new Set(place.types || []);
  const name = (place.name || "").toLowerCase();
  if (types.has("hospital")) return "hospital";
  if (types.has("pharmacy")) return "pharmacy";
  if (types.has("dentist")) return "dentist";
  if (types.has("doctor") || types.has("health")) return "doctor";
  if (name.includes("clinic")) return "clinic";
  return "clinic";
}

async function fetchPlaceDetails(placeId: string): Promise<{ phone?: string; website?: string; formattedAddress?: string }> {
  if (!GOOGLE_API_KEY) return {};
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,formatted_phone_number,website&key=${GOOGLE_API_KEY}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return {};
    const data: any = await resp.json();
    const r = data.result || {};
    return {
      phone: r.formatted_phone_number || undefined,
      website: r.website || undefined,
      formattedAddress: r.formatted_address || undefined,
    };
  } catch {
    return {};
  }
}

async function searchGooglePlacesText(lat: number, lng: number, radiusMiles: number, keywords: string[]): Promise<ProviderCandidate[]> {
  if (!GOOGLE_API_KEY || keywords.length === 0) return [];
  const radiusMeters = Math.min(Math.round(radiusMiles * 1609.344), 50000);
  const seenPlaceIds = new Set<string>();
  const candidates: ProviderCandidate[] = [];

  for (const keyword of keywords) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(keyword)}&location=${lat},${lng}&radius=${radiusMeters}&key=${GOOGLE_API_KEY}`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) continue;
      const data: any = await resp.json();
      const places: GooglePlaceResult[] = data.results || [];

      for (const place of places) {
        if (!place.place_id || seenPlaceIds.has(place.place_id)) continue;
        if (place.business_status === "CLOSED_PERMANENTLY") continue;
        seenPlaceIds.add(place.place_id);

        const pLat = place.geometry.location.lat;
        const pLng = place.geometry.location.lng;
        const dist = haversineMiles(lat, lng, pLat, pLng);

        let details: { phone?: string; website?: string; formattedAddress?: string } = {};
        if (candidates.length < 20) {
          details = await fetchPlaceDetails(place.place_id);
        }

        candidates.push({
          id: `gplaces-text-${place.place_id}`,
          name: place.name,
          address: details.formattedAddress || place.vicinity || "",
          city: "",
          state: "",
          postalCode: "",
          phone: details.phone || "",
          website: details.website || "",
          lat: pLat,
          lng: pLng,
          coordinateStatus: "geocoded" as const,
          source: "Google Places",
          sourceDetail: `Google Places Text (${keyword})`,
          sourceUrl: details.website || "",
          confidence: place.rating && place.rating >= 4 ? "high" : "medium",
          trustTier: "directory" as const,
          score: (place.rating ? Math.round(place.rating * 15) : 40) + (place.user_ratings_total ? Math.min(20, Math.round(place.user_ratings_total / 50)) : 0),
          badges: ["Google Places", ...(place.rating ? [`★${place.rating}`] : [])],
          evidence: [{
            serviceDetected: keyword,
            evidenceUrl: details.website || "",
            evidenceTextSnippet: place.vicinity || "",
            confidence: 70,
            source: "Google Places",
          }],
          distanceMiles: dist,
          _rawSources: ["google_places_text"],
        });
      }
    } catch (e) {
      logger.warn({ keyword, error: String(e) }, "Google Places text search error");
    }
  }

  return candidates;
}

async function searchGooglePlaces(lat: number, lng: number, radiusMiles: number, category: string): Promise<ProviderCandidate[]> {
  if (!GOOGLE_API_KEY) return [];
  const placeTypes = CATEGORY_TO_PLACE_TYPES[category] || CATEGORY_TO_PLACE_TYPES.all;
  const radiusMeters = Math.min(Math.round(radiusMiles * 1609.344), 50000);
  const seenPlaceIds = new Set<string>();
  const candidates: ProviderCandidate[] = [];

  // 1. Nearby Search by type
  for (const placeType of placeTypes) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=${placeType}&key=${GOOGLE_API_KEY}`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) continue;
      const data: any = await resp.json();
      const places: GooglePlaceResult[] = data.results || [];

      for (const place of places) {
        if (!place.place_id || seenPlaceIds.has(place.place_id)) continue;
        if (place.business_status === "CLOSED_PERMANENTLY") continue;
        seenPlaceIds.add(place.place_id);

        const pLat = place.geometry.location.lat;
        const pLng = place.geometry.location.lng;
        const dist = haversineMiles(lat, lng, pLat, pLng);

        let details: { phone?: string; website?: string; formattedAddress?: string } = {};
        if (candidates.length < 20) {
          details = await fetchPlaceDetails(place.place_id);
        }

        candidates.push({
          id: `gplaces-${place.place_id}`,
          name: place.name,
          address: details.formattedAddress || place.vicinity || "",
          city: "",
          state: "",
          postalCode: "",
          phone: details.phone || "",
          website: details.website || "",
          lat: pLat,
          lng: pLng,
          coordinateStatus: "geocoded" as const,
          source: "Google Places",
          sourceDetail: `Google Places (${classifyPlace(place)})`,
          sourceUrl: details.website || "",
          confidence: place.rating && place.rating >= 4 ? "high" : "medium",
          trustTier: "directory" as const,
          score: (place.rating ? Math.round(place.rating * 15) : 40) + (place.user_ratings_total ? Math.min(20, Math.round(place.user_ratings_total / 50)) : 0),
          badges: ["Google Places", ...(place.rating ? [`★${place.rating}`] : [])],
          evidence: [{
            serviceDetected: classifyPlace(place),
            evidenceUrl: details.website || "",
            evidenceTextSnippet: place.vicinity || "",
            confidence: 70,
            source: "Google Places",
          }],
          distanceMiles: dist,
          _rawSources: ["google_places"],
        });
      }
    } catch (e) {
      logger.warn({ placeType, error: String(e) }, "Google Places search error");
    }
  }

  // 2. Text Search for specialized keywords (DOT, FAA, occ health, etc.)
  const textKeywords = CATEGORY_TO_TEXT_KEYWORDS[category] || [];
  const ukKeywords = isUKLocation(lat, lng) ? (UK_TEXT_KEYWORDS[category] || UK_TEXT_KEYWORDS.all) : [];
  const allKeywords = [...textKeywords, ...ukKeywords];

  if (allKeywords.length > 0) {
    const textCandidates = await searchGooglePlacesText(lat, lng, radiusMiles, allKeywords);
    // Merge text search results, deduping by place_id
    for (const tc of textCandidates) {
      const placeId = tc.id.replace("gplaces-text-", "");
      if (!seenPlaceIds.has(placeId)) {
        seenPlaceIds.add(placeId);
        candidates.push(tc);
      }
    }
  }

  return candidates;
}

/**
 * GET /api/enhanced-search
 * Combined search that runs:
 * 1. Google Places Nearby Search (global)
 * 2. Universal Discovery pipeline (NPI + clinic imports + web evidence + AI extraction + geocoding)
 * Merges, dedupes, and saves all results to Neon.
 */
router.get("/enhanced-search", async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusMiles = Number(req.query.radiusMiles || 25);
    const category = String(req.query.category || "all");
    const city = String(req.query.city || "").trim();
    const state = String(req.query.state || "").trim();
    const mode = String(req.query.mode || "balanced") as any;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ error: "Missing or invalid lat/lng" });
      return;
    }

    const serviceType = CATEGORY_TO_SERVICE_TYPE[category] || "physicalExam";
    const isUS = lat >= 24 && lat <= 50 && lng >= -125 && lng <= -66;

    // Run Google Places + Universal Discovery in parallel
    const [placesResult, discoveryResult] = await Promise.allSettled([
      searchGooglePlaces(lat, lng, radiusMiles, category),
      (async () => {
        // Universal discovery requires city/state — only run if we have them and it's US
        if (!isUS || !city || !state) return null;
        return runUnifiedSearch({
          city,
          state,
          serviceType,
          radiusMiles,
          centerLat: lat,
          centerLng: lng,
          mode,
        });
      })(),
    ]);

    const placesCandidates = placesResult.status === "fulfilled" ? placesResult.value : [];
    const discoveryResponse = discoveryResult.status === "fulfilled" ? discoveryResult.value : null;
    const discoveryCandidates = discoveryResponse?.results || [];

    // Merge all candidates
    const allCandidates = [...placesCandidates, ...discoveryCandidates];

    // Dedupe by name + lat/lng proximity
    const seen = new Set<string>();
    const deduped = allCandidates.filter((c) => {
      const key = `${(c.name || "").toLowerCase().slice(0, 30)}|${(c.lat || 0).toFixed(3)}|${(c.lng || 0).toFixed(3)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by distance
    const sorted = deduped.sort((a, b) => (a.distanceMiles || 999) - (b.distanceMiles || 999));

    // Save all results to Neon
    let savedCount = 0;
    if (isPersistenceConfigured()) {
      for (const candidate of sorted) {
        try {
          await upsertProvider(candidate, serviceType);
          savedCount++;
        } catch (e) {
          // ignore individual persistence errors
        }
      }
    }

    // Build source summary
    const sources: string[] = [];
    if (placesCandidates.length > 0) sources.push("Google Places");
    if (discoveryCandidates.length > 0) sources.push("Universal Discovery");

    res.json({
      results: sorted.map((c) => ({
        id: c.id,
        name: c.name,
        lat: c.lat,
        lng: c.lng,
        cat: c.sourceDetail || c.source,
        dist: c.distanceMiles,
        addr: c.address,
        phone: c.phone,
        website: c.website,
        source: c.source,
        sourceDetail: c.sourceDetail,
        tags: { confidence: c.confidence, score: c.score, badges: c.badges, trustTier: c.trustTier },
      })),
      facets: {} as Record<string, number>,
      sourceSummary: {
        googlePlaces: placesCandidates.length,
        universalDiscovery: discoveryCandidates.length,
        merged: sorted.length,
        sources,
        savedToNeon: savedCount,
        discoveryAudit: discoveryResponse?.audit || null,
      },
    });
  } catch (e: any) {
    logger.error({ error: e.message }, "Enhanced search error");
    res.status(500).json({ error: e.message || "Enhanced search failed" });
  }
});

export default router;

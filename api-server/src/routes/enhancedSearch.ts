import { Router, type Request, type Response } from "express";
import {
  GOOGLE_PLACES_FIELD_MASK,
  googleHealthcarePolicy,
  searchGoogleHealthcarePlaces,
  type GoogleHealthcarePlace,
  type GooglePlacesMetadata,
} from "../lib/googleHealthcarePlaces";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { logger } from "../lib/logger";
import { haversineMiles, runUnifiedSearch } from "../providerSources/orchestrator";
import { upsertProvider } from "../providerSources/persistence";
import type { ProviderCandidate } from "../providerSources/types";

const router = Router();
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || "";

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
  faaMedical: "faaMedical",
  drugscreen: "drugscreen",
  mammogram: "mammogram",
  stressTest: "stressTest",
};

function classifyPlace(place: GoogleHealthcarePlace): string {
  const types = new Set(place.types || []);
  const name = (place.displayName?.text || "").toLowerCase();
  if (types.has("hospital") || types.has("general_hospital")) return "hospital";
  if (types.has("pharmacy") || types.has("drugstore")) return "pharmacy";
  if (types.has("dentist") || types.has("dental_clinic")) return "dentist";
  if (types.has("medical_lab")) return "lab";
  if (types.has("physiotherapist")) return "physio";
  if (types.has("chiropractor")) return "chiropractic";
  if (name.includes("urgent")) return "urgent";
  return types.has("doctor") ? "doctor" : "clinic";
}

function normalizeGooglePlace(place: GoogleHealthcarePlace, lat: number, lng: number, serviceType: string): ProviderCandidate | null {
  const placeLat = Number(place.location?.latitude);
  const placeLng = Number(place.location?.longitude);
  if (!place.id || !Number.isFinite(placeLat) || !Number.isFinite(placeLng)) return null;
  const category = classifyPlace(place);
  return {
    id: `gplaces-${place.id}`,
    name: place.displayName?.text || "Unnamed healthcare provider",
    address: place.formattedAddress || "",
    city: "",
    state: "",
    postalCode: "",
    phone: "",
    website: "",
    lat: placeLat,
    lng: placeLng,
    coordinateStatus: "geocoded",
    source: "Google Places",
    sourceDetail: `Google Places healthcare (${category})`,
    sourceUrl: `https://www.google.com/maps/place/?q=place_id=${place.id}`,
    confidence: "medium",
    trustTier: "directory",
    score: 50,
    badges: ["Google Places"],
    evidence: [{
      serviceDetected: serviceType,
      evidenceUrl: `https://www.google.com/maps/place/?q=place_id=${place.id}`,
      evidenceTextSnippet: place.primaryType || category,
      confidence: 70,
      source: "Google Places",
    }],
    distanceMiles: haversineMiles(lat, lng, placeLat, placeLng),
    _rawSources: ["google_places"],
  };
}

function disabledGoogleMetadata(serviceType: string): GooglePlacesMetadata {
  return {
    googlePlacesCache: "disabled",
    googlePlacesTypesUsed: googleHealthcarePolicy(serviceType).includedTypes,
    googlePlacesFieldMaskUsed: GOOGLE_PLACES_FIELD_MASK,
  };
}

router.get("/enhanced-search", async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusMiles = Number(req.query.radiusMiles || 25);
    const category = String(req.query.category || "all");
    const city = String(req.query.city || "").trim();
    const state = String(req.query.state || "").trim();
    const mode = String(req.query.mode || "balanced") as "fast" | "balanced" | "deep";
    const googlePlacesTrigger = req.query.googlePlacesTrigger;

    // Live Finder calls this endpoint without an explicit discovery opt-in.
    // Keep that path limited to actual place-directory results. NPI/web/AI
    // discovery belongs to the dedicated provider-source tools and must be
    // explicitly requested with sourceScope=all or includeDiscovery=true.
    const sourceScope = String(req.query.sourceScope || "places").trim().toLowerCase();
    const includeDiscovery = sourceScope === "all" || String(req.query.includeDiscovery || "").toLowerCase() === "true";

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ error: "Missing or invalid lat/lng" });
      return;
    }

    const serviceType = CATEGORY_TO_SERVICE_TYPE[category] || "physicalExam";
    const googleServiceType = googleHealthcarePolicy(category).includedTypes.length > 0 ? category : serviceType;
    const isUS = lat >= 24 && lat <= 50 && lng >= -125 && lng <= -66;

    const [placesResult, discoveryResult] = await Promise.allSettled([
      searchGoogleHealthcarePlaces({
        apiKey: GOOGLE_API_KEY,
        lat,
        lng,
        radiusMeters: radiusMiles * 1609.344,
        serviceType: googleServiceType,
        trigger: googlePlacesTrigger,
      }),
      (async () => {
        if (!includeDiscovery || !isUS || !city || !state) return null;
        return runUnifiedSearch({ city, state, serviceType, radiusMiles, centerLat: lat, centerLng: lng, mode });
      })(),
    ]);

    const placesResponse = placesResult.status === "fulfilled" ? placesResult.value : null;
    const placesMetadata = placesResponse?.metadata || disabledGoogleMetadata(googleServiceType);
    const placesCandidates = (placesResponse?.places || [])
      .map(place => normalizeGooglePlace(place, lat, lng, googleServiceType))
      .filter((candidate): candidate is ProviderCandidate => Boolean(candidate));
    const discoveryResponse = discoveryResult.status === "fulfilled" ? discoveryResult.value : null;
    const discoveryCandidates = includeDiscovery ? (discoveryResponse?.results || []) : [];

    const seen = new Set<string>();
    const sorted = [...placesCandidates, ...discoveryCandidates]
      .filter(candidate => {
        const key = `${(candidate.name || "").toLowerCase().slice(0, 30)}|${(candidate.lat || 0).toFixed(3)}|${(candidate.lng || 0).toFixed(3)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) => (left.distanceMiles || 999) - (right.distanceMiles || 999));

    let savedCount = 0;
    if (isPersistenceConfigured()) {
      for (const candidate of sorted) {
        try {
          await upsertProvider(candidate, serviceType);
          savedCount += 1;
        } catch {
          // Individual persistence failures do not fail provider discovery.
        }
      }
    }

    const sources: string[] = [];
    if (placesCandidates.length > 0) sources.push("Google Places");
    if (discoveryCandidates.length > 0) sources.push("Universal Discovery");

    res.json({
      results: sorted.map(candidate => ({
        id: candidate.id,
        name: candidate.name,
        lat: candidate.lat,
        lng: candidate.lng,
        cat: candidate.sourceDetail || candidate.source,
        dist: candidate.distanceMiles,
        addr: candidate.address,
        phone: candidate.phone,
        website: candidate.website,
        source: candidate.source,
        sourceDetail: candidate.sourceDetail,
        tags: {
          confidence: candidate.confidence,
          score: candidate.score,
          badges: candidate.badges,
          trustTier: candidate.trustTier,
        },
      })),
      facets: {} as Record<string, number>,
      sourceSummary: {
        sourceScope: includeDiscovery ? "all" : "places",
        discoveryEnabled: includeDiscovery,
        googlePlaces: placesCandidates.length,
        universalDiscovery: discoveryCandidates.length,
        merged: sorted.length,
        sources,
        savedToNeon: savedCount,
        discoveryAudit: includeDiscovery ? (discoveryResponse?.audit || null) : null,
        ...placesMetadata,
      },
    });
  } catch (error) {
    logger.error({ error }, "Enhanced search error");
    res.status(500).json({ error: error instanceof Error ? error.message : "Enhanced search failed" });
  }
});

export default router;

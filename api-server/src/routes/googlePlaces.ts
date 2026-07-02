import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger";
import {
  searchGoogleHealthcarePlaces,
  type GoogleHealthcarePlace,
} from "../lib/googleHealthcarePlaces";
import { upsertProvider } from "../providerSources/persistence";
import type { ProviderCandidate, TrustTier } from "../providerSources/types";

const router = Router();
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || "";

type NormalizedResult = {
  id: string; lat: number; lng: number; name: string; cat: string; dist: number;
  addr: string; phone: string; website: string; hours: string; op: string;
  source: string; sourceDetail: string; placeId?: string;
};

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radiusMiles = 3958.8;
  const deltaLat = (lat2 - lat1) * Math.PI / 180;
  const deltaLon = (lon2 - lon1) * Math.PI / 180;
  const value = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(deltaLon / 2) ** 2;
  return 2 * radiusMiles * Math.asin(Math.sqrt(value));
}

function classifyPlace(types: string[], name: string): string {
  const normalizedName = name.toLowerCase();
  const normalizedTypes = new Set(types.map(type => type.toLowerCase()));
  if (normalizedName.includes("dental") || normalizedTypes.has("dentist") || normalizedTypes.has("dental_clinic")) return "dentist";
  if (normalizedName.includes("pharma") || normalizedTypes.has("pharmacy") || normalizedTypes.has("drugstore")) return "pharmacy";
  if (normalizedName.includes("hospital") || normalizedTypes.has("hospital") || normalizedTypes.has("general_hospital")) return "hospital";
  if (normalizedName.includes("urgent")) return "urgent";
  if (normalizedName.includes("audiology") || normalizedName.includes("hearing")) return "audiology";
  if (normalizedName.includes("eye") || normalizedName.includes("vision")) return "eye";
  if (normalizedName.includes("lab") || normalizedTypes.has("medical_lab")) return "lab";
  if (normalizedTypes.has("physiotherapist")) return "physio";
  if (normalizedTypes.has("chiropractor")) return "chiropractic";
  return normalizedTypes.has("doctor") ? "doctor" : "clinic";
}

function normalizePlace(place: GoogleHealthcarePlace, lat: number, lng: number, serviceType: string): NormalizedResult | null {
  const placeLat = Number(place.location?.latitude);
  const placeLng = Number(place.location?.longitude);
  if (!place.id || !Number.isFinite(placeLat) || !Number.isFinite(placeLng)) return null;
  const name = place.displayName?.text || "Unnamed healthcare provider";
  return {
    id: place.id,
    lat: placeLat,
    lng: placeLng,
    name,
    cat: classifyPlace(place.types || [], name),
    dist: haversine(lat, lng, placeLat, placeLng),
    addr: place.formattedAddress || "",
    phone: "",
    website: "",
    hours: place.businessStatus === "OPERATIONAL" ? "Open" : "",
    op: place.businessStatus || "",
    source: "Google Places",
    sourceDetail: `Google Places healthcare (${serviceType})`,
    placeId: place.id,
  };
}

async function savePlaceToNeon(place: NormalizedResult, serviceType: string): Promise<void> {
  try {
    const candidate: ProviderCandidate = {
      id: place.placeId || place.id,
      name: place.name,
      address: place.addr,
      city: "",
      state: "",
      postalCode: "",
      phone: "",
      website: "",
      lat: place.lat,
      lng: place.lng,
      coordinateStatus: "imported",
      taxonomy: place.cat,
      source: "Google Places",
      sourceDetail: "Google Places API",
      sourceUrl: place.placeId ? `https://www.google.com/maps/place/?q=place_id=${place.placeId}` : undefined,
      confidence: "medium",
      trustTier: "directory" as TrustTier,
      score: 0,
      badges: [],
      evidence: [],
    };
    await upsertProvider(candidate, serviceType);
  } catch (error) {
    logger.warn({ error, place: place.name }, "Failed to save Google Place to Neon");
  }
}

router.get("/google-places/search", async (req: Request, res: Response) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusMiles = Number(req.query.radiusMiles || 10);
  const serviceType = String(req.query.serviceType || req.query.category || "all");
  const trigger = req.query.trigger;
  const save = req.query.save !== "false";

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: "lat and lng are required" });
    return;
  }

  try {
    const { places, metadata } = await searchGoogleHealthcarePlaces({
      apiKey: GOOGLE_API_KEY,
      lat,
      lng,
      radiusMeters: radiusMiles * 1609.344,
      serviceType,
      trigger,
      queryText: typeof req.query.query === "string" ? req.query.query : undefined,
    });
    if (!GOOGLE_API_KEY) {
      res.status(503).json({ error: "Google Maps API key not configured", ...metadata });
      return;
    }

    const results = places
      .map(place => normalizePlace(place, lat, lng, serviceType))
      .filter((place): place is NormalizedResult => Boolean(place))
      .sort((left, right) => left.dist - right.dist);

    if (save && results.length > 0) {
      void Promise.allSettled(results.map(result => savePlaceToNeon(result, serviceType)));
    }

    const facets = results.reduce<Record<string, number>>((counts, result) => {
      counts[result.cat] = (counts[result.cat] || 0) + 1;
      return counts;
    }, {});

    res.json({
      location: { lat, lng },
      radiusMiles,
      category: serviceType,
      count: results.length,
      rawCount: results.length,
      returnedCount: results.length,
      facets,
      results,
      source: "google_places",
      savedToDatabase: save,
      ...metadata,
    });
  } catch (error) {
    logger.error({ error, lat, lng, serviceType }, "Google Places healthcare search failed");
    res.status(502).json({ error: error instanceof Error ? error.message : "Google Places search failed" });
  }
});

router.post("/google-places/save", async (req: Request, res: Response) => {
  const { results, serviceType } = req.body;
  if (!Array.isArray(results) || results.length === 0) {
    res.status(400).json({ error: "results array is required" });
    return;
  }

  const normalizedServiceType = String(serviceType || "all");
  let saved = 0;
  let failed = 0;
  for (const place of results) {
    try {
      await savePlaceToNeon(place as NormalizedResult, normalizedServiceType);
      saved += 1;
    } catch {
      failed += 1;
    }
  }
  res.json({ saved, failed, total: results.length });
});

export default router;

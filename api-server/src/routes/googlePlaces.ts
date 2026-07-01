import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger";
import { upsertProvider } from "../providerSources/persistence";
import type { ProviderCandidate, TrustTier } from "../providerSources/types";

const router = Router();

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || "";
const PLACES_TIMEOUT_MS = 10000;

const CATEGORY_TO_PLACE_TYPES: Record<string, string[]> = {
  all: ["hospital", "doctor", "pharmacy", "dentist", "health", "clinic"],
  clinical: ["hospital", "doctor", "clinic", "health"],
  occMed: ["hospital", "doctor", "clinic", "health"],
  primaryCare: ["doctor", "hospital", "health"],
  specialists: ["doctor", "hospital", "health"],
  urgentCare: ["hospital", "health", "doctor"],
  dental: ["dentist"],
  dentist: ["dentist"],
  pharmacy: ["pharmacy"],
  vaccinations: ["pharmacy", "hospital", "doctor"],
  drugTest: ["hospital", "doctor", "health"],
  audiometry: ["doctor", "health"],
  vision: ["doctor", "health"],
  eye: ["doctor", "health"],
  lab: ["health", "hospital"],
};

type GooglePlaceResult = {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: { location: { lat: number; lng: number } };
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  business_status?: string;
  icon?: string;
};

type NormalizedResult = {
  id: string;
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
  placeId?: string;
  rating?: number;
};

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function classifyPlace(types: string[], name: string): string {
  const n = name.toLowerCase();
  const t = new Set(types.map(s => s.toLowerCase()));

  if (n.includes("dental") || t.has("dentist")) return "dentist";
  if (n.includes("pharma") || t.has("pharmacy")) return "pharmacy";
  if (n.includes("hospital") || t.has("hospital")) return "hospital";
  if (n.includes("urgent care") || n.includes("urgent")) return "urgent";
  if (n.includes("audiology") || n.includes("audiogram") || n.includes("hearing")) return "audiology";
  if (n.includes("eye") || n.includes("optom") || n.includes("vision")) return "eye";
  if (n.includes("lab") || n.includes("diagnostic")) return "lab";
  if (n.includes("physic") || n.includes("occupational")) return "physical";
  if (n.includes("drug") || n.includes("toxicol")) return "drugscreen";
  if (t.has("doctor") || t.has("health") || n.includes("clinic")) return "doctor";
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

async function savePlaceToNeon(place: NormalizedResult, serviceType: string): Promise<void> {
  try {
    const candidate: ProviderCandidate = {
      id: place.placeId || place.id,
      name: place.name,
      address: place.addr,
      city: "",
      state: "",
      postalCode: "",
      phone: place.phone,
      website: place.website,
      lat: place.lat,
      lng: place.lng,
      coordinateStatus: "imported",
      taxonomy: place.cat,
      source: "Google Places",
      sourceDetail: "Google Places API",
      sourceUrl: place.placeId ? `https://www.google.com/maps/place/?q=place_id=${place.placeId}` : undefined,
      confidence: "medium",
      trustTier: "directory" as TrustTier,
      score: place.rating || 0,
      badges: place.rating ? [`★ ${place.rating}`] : [],
      evidence: [],
    };
    await upsertProvider(candidate, serviceType);
  } catch (err) {
    logger.warn({ err, place: place.name }, "Failed to save Google Place to Neon");
  }
}

router.get("/google-places/search", async (req: Request, res: Response) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusMiles = Number(req.query.radiusMiles || 10);
  const category = String(req.query.category || "all");
  const save = req.query.save !== "false";

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: "lat and lng are required" });
    return;
  }

  if (!GOOGLE_API_KEY) {
    res.status(503).json({ error: "Google Maps API key not configured" });
    return;
  }

  const radiusMeters = Math.min(Math.max(radiusMiles, 0.5), 50) * 1609.34;
  const placeTypes = CATEGORY_TO_PLACE_TYPES[category] || CATEGORY_TO_PLACE_TYPES.all;

  const routeStartedAt = Date.now();
  logger.info({ lat, lng, radiusMiles, category, placeTypes }, "Google Places search started");

  try {
    const allResults: NormalizedResult[] = [];
    const seenPlaceIds = new Set<string>();

    for (const placeType of placeTypes) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${Math.round(radiusMeters)}&type=${placeType}&key=${GOOGLE_API_KEY}`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(PLACES_TIMEOUT_MS) });
        if (!resp.ok) {
          logger.warn({ placeType, status: resp.status }, "Google Places API error");
          continue;
        }
        const data: any = await resp.json();
        const places: GooglePlaceResult[] = data.results || [];

        for (const place of places) {
          if (!place.place_id || seenPlaceIds.has(place.place_id)) continue;
          if (place.business_status === "CLOSED_PERMANENTLY") continue;
          seenPlaceIds.add(place.place_id);

          const pLat = place.geometry.location.lat;
          const pLng = place.geometry.location.lng;
          const dist = haversine(lat, lng, pLat, pLng);
          const cat = classifyPlace(place.types, place.name);

          allResults.push({
            id: place.place_id,
            lat: pLat,
            lng: pLng,
            name: place.name,
            cat,
            dist,
            addr: place.vicinity || "",
            phone: "",
            website: "",
            hours: place.business_status === "OPERATIONAL" ? "Open" : "",
            op: place.business_status || "",
            source: "Google Places",
            sourceDetail: `Google Places (${placeType})`,
            placeId: place.place_id,
            rating: place.rating,
          });
        }
      } catch (err) {
        logger.warn({ placeType, err }, "Google Places type search failed");
      }
    }

    // Fetch details (phone, website) for top 20 results in parallel
    const topForDetails = allResults.slice(0, 20);
    const detailsPromises = topForDetails.map(async (r) => {
      if (!r.placeId) return;
      const details = await fetchPlaceDetails(r.placeId);
      if (details.phone) r.phone = details.phone;
      if (details.website) r.website = details.website;
      if (details.formattedAddress && !r.addr) r.addr = details.formattedAddress;
    });
    await Promise.all(detailsPromises);

    // Dedupe and sort by distance
    const deduped = allResults.filter((r, i, arr) => arr.findIndex(x => x.id === r.id) === i);
    deduped.sort((a, b) => a.dist - b.dist);

    const returnLimit = 200;
    const results = deduped.slice(0, returnLimit);
    const totalDurationMs = Date.now() - routeStartedAt;

    // Save results to Neon database
    if (save && results.length > 0) {
      const savePromises = results.map(r => savePlaceToNeon(r, category));
      Promise.allSettled(savePromises).then((outcomes) => {
        const saved = outcomes.filter(o => o.status === "fulfilled").length;
        logger.info({ saved, total: results.length }, "Google Places results saved to Neon");
      }).catch(() => {});
    }

    const facets = results.reduce<Record<string, number>>((acc, row) => {
      const key = row.cat || "clinic";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    logger.info({
      lat, lng, category, totalDurationMs,
      candidateCount: deduped.length,
      returnedCount: results.length,
    }, "Google Places search completed");

    res.json({
      location: { lat, lng },
      radiusMiles,
      category,
      count: results.length,
      rawCount: deduped.length,
      returnedCount: results.length,
      facets,
      results,
      source: "google_places",
      savedToDatabase: save,
    });
  } catch (err: any) {
    logger.error({ err, lat, lng }, "Google Places search failed");
    res.status(500).json({ error: "Google Places search failed", message: err?.message });
  }
});

// POST route to save arbitrary search results to Neon
router.post("/google-places/save", async (req: Request, res: Response) => {
  const { results, serviceType } = req.body;

  if (!Array.isArray(results) || results.length === 0) {
    res.status(400).json({ error: "results array is required" });
    return;
  }

  if (!GOOGLE_API_KEY) {
    res.status(503).json({ error: "Google Maps API key not configured" });
    return;
  }

  const st = String(serviceType || "all");
  let saved = 0;
  let failed = 0;

  for (const place of results) {
    try {
      const candidate: ProviderCandidate = {
        id: place.placeId || place.id,
        name: place.name,
        address: place.addr || "",
        city: place.city || "",
        state: place.state || "",
        postalCode: "",
        phone: place.phone || "",
        website: place.website || "",
        lat: place.lat,
        lng: place.lng,
        coordinateStatus: "imported",
        taxonomy: place.cat,
        source: "Google Places",
        sourceDetail: "Google Places API",
        sourceUrl: place.placeId ? `https://www.google.com/maps/place/?q=place_id=${place.placeId}` : undefined,
        confidence: "medium",
        trustTier: "directory" as TrustTier,
        score: place.rating || 0,
        badges: [],
        evidence: [],
      };
      await upsertProvider(candidate, st);
      saved++;
    } catch {
      failed++;
    }
  }

  logger.info({ saved, failed, total: results.length, serviceType: st }, "Google Places manual save completed");
  res.json({ saved, failed, total: results.length });
});

export default router;

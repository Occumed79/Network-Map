import { Router, type NextFunction, type Request, type Response } from "express";
import { runUnifiedSearch } from "../providerSources/orchestrator";
import { upsertProvider } from "../providerSources/persistence";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import type { ProviderCandidate } from "../providerSources/types";

const router = Router();

function candidateToClinic(candidate: ProviderCandidate) {
  const query = [candidate.name, candidate.address].filter(Boolean).join(" ").trim();
  const fallbackSearchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query || candidate.name)}`;
  const taxonomy = candidate.taxonomy || candidate.sourceDetail || candidate.source;

  return {
    name: candidate.name,
    address: candidate.address,
    phone: candidate.phone,
    taxonomy,
    isFqhc: taxonomy.toLowerCase().includes("federally qualified") || taxonomy.toLowerCase().includes("fqhc"),
    npiUrl: candidate.sourceUrl || "",
    searchUrl: candidate.website || fallbackSearchUrl,
    website: candidate.website,
    source: candidate.source,
    sourceDetail: candidate.sourceDetail,
    confidence: candidate.confidence,
    trustTier: candidate.trustTier,
    coordinateStatus: candidate.coordinateStatus,
    score: candidate.score,
    badges: candidate.badges,
    lat: candidate.lat,
    lng: candidate.lng,
    distanceMiles: candidate.distanceMiles,
  };
}

/**
 * Price Finder now uses the unified provider-sources orchestrator
 * instead of the old providerSearch.ts route.
 * This ensures all results go through the same dedupe, geocode,
 * coordinateStatus, trustTier, and Neon upsert pipeline.
 */
router.get("/price-finder", async (req: Request, res: Response, next: NextFunction) => {
  const serviceType = String(req.query.serviceType || "physicalExam").trim();

  const city = String(req.query.city || "").trim();
  const state = String(req.query.state || "").trim().toUpperCase();
  const radiusMiles = Number(req.query.radiusMiles || 35);

  if (!city || !state) {
    next();
    return;
  }

  try {
    // Use the unified orchestrator (same as POST /api/provider-sources/search)
    // Pass radiusMiles: 0 because we don't have a real center point —
    // passing a real radius with centerLat/Lng=0 would filter out all US providers.
    const unified = await runUnifiedSearch({
      city,
      state,
      serviceType,
      radiusMiles: 0,
      centerLat: 0,
      centerLng: 0,
    });

    // Upsert results into Neon (non-blocking)
    if (isPersistenceConfigured()) {
      for (const candidate of unified.results) {
        try {
          await upsertProvider(candidate, serviceType);
        } catch {
          // ignore persistence errors
        }
      }
    }

    const clinics = unified.results.map(candidateToClinic);

    res.json({
      location: `${city}, ${state}`,
      serviceType,
      clinicCount: clinics.length,
      clinics,
      networks: [],
      pricingResources: [],
      providerSources: unified.sourceResults,
      audit: unified.audit,
      discoveryNote: "Price Finder uses the unified provider-sources orchestrator with Neon persistence.",
    });
  } catch (error) {
    console.error("unified price-finder error", error);
    res.status(500).json({ error: "Unified provider search failed. Please try again." });
  }
});

export default router;

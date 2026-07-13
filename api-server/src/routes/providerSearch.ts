import { Router, type Request, type Response } from "express";
import { runUnifiedSearch } from "../providerSources/orchestrator";
import { upsertProvider } from "../providerSources/persistence";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";

const router = Router();

/**
 * Legacy response shape retained for callers that still use GET /api/providers/search.
 * Discovery, NPI access, normalization, dedupe, scoring, and geocoding all happen
 * in the authoritative provider-sources orchestrator.
 */
export type ProviderCandidate = {
  name: string;
  address: string;
  phone: string;
  website: string;
  lat?: number;
  lng?: number;
  taxonomy?: string;
  source: string;
  sourceDetail?: string;
  sourceUrl?: string;
  confidence: "high" | "medium" | "low";
  score: number;
  badges: string[];
};

export async function runUnifiedProviderSearch(params: {
  city: string;
  state: string;
  serviceType: string;
  radiusMiles?: number;
}) {
  const city = params.city.trim();
  const state = params.state.trim().toUpperCase();
  const serviceType = params.serviceType.trim() || "physicalExam";
  const requestedRadiusMiles = Number(params.radiusMiles || 35);

  // This compatibility route receives no reliable search-center coordinates.
  // Radius must remain zero when the placeholder center is 0,0; otherwise every
  // U.S. result would be incorrectly filtered against the Gulf of Guinea.
  const unified = await runUnifiedSearch({
    city,
    state,
    serviceType,
    radiusMiles: 0,
    centerLat: 0,
    centerLng: 0,
  });

  if (isPersistenceConfigured()) {
    await Promise.allSettled(
      unified.results.map((candidate) => upsertProvider(candidate, serviceType)),
    );
  }

  const results: ProviderCandidate[] = unified.results.map((candidate) => ({
    name: candidate.name,
    address: candidate.address,
    phone: candidate.phone,
    website: candidate.website,
    lat: candidate.lat,
    lng: candidate.lng,
    taxonomy: candidate.taxonomy,
    source: candidate.source,
    sourceDetail: candidate.sourceDetail,
    sourceUrl: candidate.sourceUrl,
    confidence: candidate.confidence,
    score: candidate.score,
    badges: candidate.badges,
  }));

  return {
    location: `${city}, ${state}`,
    serviceType,
    radiusMiles: requestedRadiusMiles,
    count: results.length,
    results,
    providers: unified.sourceResults.map((source) => ({
      source: source.sourceLabel,
      count: source.count,
      ok: source.ok,
      error: source.error,
    })),
    audit: unified.audit,
    note: "Deprecated compatibility route; provider discovery is handled by the central backend provider-sources pipeline.",
  };
}

router.get("/providers/search", async (req: Request, res: Response) => {
  const city = String(req.query.city || "").trim();
  const state = String(req.query.state || "").trim().toUpperCase();
  const serviceType = String(req.query.serviceType || "").trim() || "physicalExam";
  const radiusMiles = Number(req.query.radiusMiles || 35);

  if (!city || !state) {
    res.status(400).json({ error: "city and state are required" });
    return;
  }

  try {
    const result = await runUnifiedProviderSearch({ city, state, serviceType, radiusMiles });
    res.setHeader("Deprecation", "true");
    res.setHeader("Sunset", "Wed, 31 Dec 2026 23:59:59 GMT");
    res.setHeader("Link", "</api/provider-sources/search>; rel=successor-version");
    res.setHeader("X-Network-Map-Search-Pipeline", "provider-sources");
    res.json(result);
  } catch (error) {
    console.error("[LegacyProviderSearch] Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Provider search failed" });
  }
});

export default router;

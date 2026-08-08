import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger";
import { runUnifiedSearch } from "../providerSources/orchestrator";
import type { ProviderCandidate } from "../providerSources/types";

const router = Router();

type LiveFinderResult = {
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
  provenance: ProviderCandidate["provenance"];
  confidence: ProviderCandidate["confidence"];
};

const clinicalPriorityCats = new Set(["hospital", "clinic", "doctor", "urgent", "lab", "physical", "stress", "audiology"]);
const occMedPriorityCats = new Set(["clinic", "doctor", "urgent", "lab", "physical", "stress", "audiology", "drugscreen"]);

function categoryMatches(categoryValue: string, requested: string): boolean {
  if (!requested || requested === "all") return true;
  if (requested === "clinical") return clinicalPriorityCats.has(categoryValue);
  if (requested === "occMed") return occMedPriorityCats.has(categoryValue);
  if (requested === "pharmacy") return categoryValue === "pharmacy";
  if (requested === "dental" || requested === "dentist") return categoryValue === "dentist";
  if (requested === "eye") return categoryValue === "eye";
  return categoryValue === requested;
}

function toLegacyLiveResult(candidate: ProviderCandidate): LiveFinderResult | null {
  if (candidate.lat === undefined || candidate.lng === undefined) return null;
  const category = candidate.providerCategory || candidate.taxonomy || "clinic";
  return {
    id: candidate.id,
    lat: candidate.lat,
    lng: candidate.lng,
    name: candidate.name,
    cat: category,
    dist: candidate.distanceMiles ?? 0,
    addr: candidate.address,
    phone: candidate.phone,
    website: candidate.website,
    hours: "",
    op: "",
    source: candidate.source,
    sourceDetail: candidate.sourceDetail || candidate.source,
    provenance: candidate.provenance,
    confidence: candidate.confidence,
  };
}

/**
 * Compatibility endpoint for the existing Finder UI. Search execution now goes
 * through the same authoritative provider-sources orchestrator as other search
 * consumers; this route only maps the normalized contract to the legacy card shape.
 */
router.get("/live-finder/search", async (req: Request, res: Response) => {
  const startedAt = Date.now();
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusMiles = Number(req.query.radiusMiles || 10);
  const category = String(req.query.category || "all");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: "lat and lng are required" });
    return;
  }

  try {
    const unified = await runUnifiedSearch({
      city: "",
      state: "",
      serviceType: "liveFinder",
      radiusMiles: Number.isFinite(radiusMiles) ? Math.min(Math.max(radiusMiles, 0.1), 75) : 10,
      centerLat: lat,
      centerLng: lng,
      sourceIds: ["mapinventory", "osm"],
      mode: "fast",
    });
    const allResults = unified.results
      .map(toLegacyLiveResult)
      .filter((row): row is LiveFinderResult => Boolean(row))
      .sort((a, b) => a.dist - b.dist);
    const facets = allResults.reduce<Record<string, number>>((acc, row) => {
      acc[row.cat] = (acc[row.cat] || 0) + 1;
      return acc;
    }, {});
    const filteredResults = allResults.filter((row) => categoryMatches(row.cat, category));
    const returnLimit = 750;
    const results = filteredResults.slice(0, returnLimit);

    logger.info({
      requestPipeline: "provider-sources",
      totalDurationMs: Date.now() - startedAt,
      candidateCount: allResults.length,
      returnedCount: results.length,
      incomplete: unified.incomplete,
      degradedSources: unified.degradedSources,
    }, "Live Finder compatibility response completed");

    res.setHeader("X-Network-Map-Search-Pipeline", "provider-sources");
    res.setHeader("Deprecation", "true");
    res.setHeader("Link", "</api/provider-sources/search>; rel=successor-version");
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
        clinical: allResults.filter((row) => clinicalPriorityCats.has(row.cat)).length,
        occMed: allResults.filter((row) => occMedPriorityCats.has(row.cat)).length,
        pharmacy: allResults.filter((row) => row.cat === "pharmacy").length,
        dental: allResults.filter((row) => row.cat === "dentist").length,
        eye: allResults.filter((row) => row.cat === "eye").length,
      },
      results,
      providers: unified.sourceResults.map((source) => ({
        source: source.sourceLabel,
        ok: source.ok,
        count: source.count,
        error: source.error,
        timedOut: source.timedOut,
        durationMs: source.durationMs,
      })),
      incomplete: unified.incomplete,
      degradedSources: unified.degradedSources,
      audit: unified.audit,
      note: "Compatibility response generated by the authoritative backend provider-search pipeline.",
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, "Live Finder compatibility route failed");
    res.status(500).json({ error: error instanceof Error ? error.message : "Live Finder search failed" });
  }
});

export default router;

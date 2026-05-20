import { Router, type NextFunction, type Request, type Response } from "express";
import { runUnifiedProviderSearch, type ProviderCandidate } from "./providerSearch";

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
    score: candidate.score,
    badges: candidate.badges,
    lat: candidate.lat,
    lng: candidate.lng,
  };
}

router.get("/price-finder", async (req: Request, res: Response, next: NextFunction) => {
  const serviceType = String(req.query.serviceType || "physicalExam").trim();

  // Keep the existing dental-specific route active until the unified search is proven better for dental too.
  if (serviceType === "dental") {
    next();
    return;
  }

  const city = String(req.query.city || "").trim();
  const state = String(req.query.state || "").trim().toUpperCase();
  const radiusMiles = Number(req.query.radiusMiles || 35);

  if (!city || !state) {
    next();
    return;
  }

  try {
    const unified = await runUnifiedProviderSearch({
      city,
      state,
      serviceType,
      radiusMiles: Number.isFinite(radiusMiles) ? radiusMiles : 35,
    });
    const clinics = unified.results.map(candidateToClinic);

    res.json({
      location: unified.location,
      serviceType,
      clinicCount: clinics.length,
      clinics,
      networks: [],
      pricingResources: [],
      providerSources: unified.providers,
      discoveryNote: "Price Finder is using unified provider search: NPI + OpenStreetMap + web hints aggregated in parallel, deduped, scored, and source-labeled.",
    });
  } catch (error) {
    console.error("unified price-finder error", error);
    res.status(500).json({ error: "Unified provider search failed. Please try again." });
  }
});

export default router;

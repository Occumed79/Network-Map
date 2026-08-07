import { Router, type Request, type Response } from "express";
import { geocodeProviders } from "../providerSources/geocode";
import {
  searchNpiCustom,
  type NpiCustomSearchInput,
} from "../providerSources/adapters/npi";

const router = Router();

interface NpiCustomSearchBody extends NpiCustomSearchInput {
  centerLat: number;
  centerLng: number;
}

/**
 * POST /api/provider-sources/npi-custom
 *
 * The browser never calls NPPES directly. This route delegates query construction,
 * pagination, normalization, deduplication, and upstream error handling to the
 * single authoritative backend NPI adapter.
 */
router.post("/provider-sources/npi-custom", async (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<NpiCustomSearchBody>;
    const city = String(body.city || "").trim();
    const state = String(body.state || "").trim().toUpperCase();
    const centerLat = Number(body.centerLat);
    const centerLng = Number(body.centerLng);

    if (!city || !state || !Number.isFinite(centerLat) || !Number.isFinite(centerLng)) {
      res.status(400).json({ error: "Missing required fields: city, state, centerLat, centerLng" });
      return;
    }

    const output = await searchNpiCustom({
      city,
      state,
      limit: body.limit,
      organization_name: String(body.organization_name || "").trim() || undefined,
      first_name: String(body.first_name || "").trim() || undefined,
      last_name: String(body.last_name || "").trim() || undefined,
      taxonomy_description: String(body.taxonomy_description || "").trim() || undefined,
      taxonomy_code: String(body.taxonomy_code || "").trim() || undefined,
      enumeration_type: String(body.enumeration_type || "").trim() || undefined,
    });

    if (output.audit.successfulQueries === 0 && output.audit.errors.length > 0) {
      res.status(502).json({
        error: output.audit.errors.join("; "),
        results: [],
        normalizedCount: 0,
        geocodedCount: 0,
        finalMarkerCount: 0,
        audit: output.audit,
      });
      return;
    }

    const results = await geocodeProviders(output.candidates, centerLat, centerLng);
    const geocodedCount = results.filter((candidate) => candidate.coordinateStatus === "verified_address").length;
    const finalMarkerCount = results.filter((candidate) =>
      candidate.coordinateStatus === "verified_exact"
      || candidate.coordinateStatus === "verified_address"
      || candidate.coordinateStatus === "city_centroid"
    ).length;

    res.setHeader("X-Network-Map-NPI-Pipeline", "central-adapter");
    res.json({
      results,
      normalizedCount: output.audit.normalizedCount,
      geocodedCount,
      finalMarkerCount,
      warning: output.audit.errors.length > 0 ? output.audit.errors.join("; ") : undefined,
      audit: output.audit,
    });
  } catch (error) {
    console.error("[NpiCustomSearch] Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
});

export default router;

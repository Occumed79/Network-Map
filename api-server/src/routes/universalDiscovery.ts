import { Router, type Request, type Response } from "express";
import type { SearchParams } from "../providerSources/types";
import { runUnifiedSearch } from "../providerSources/orchestrator";

const router = Router();

/**
 * POST /api/provider-sources/search
 * Authoritative read-only provider discovery endpoint.
 * Runs adapters, deduplicates, geocodes, and returns the normalized search
 * contract. Search requests must not silently mutate provider inventory;
 * provider writes belong to explicit authenticated upload/write workflows.
 */
router.post("/provider-sources/search", async (req: Request, res: Response) => {
  try {
    const body = req.body as SearchParams;
    const city = String(body.city || "").trim();
    const state = String(body.state || "").trim().toUpperCase();
    const serviceType = String(body.serviceType || "").trim();
    const radiusMiles = Number(body.radiusMiles || 25);
    const centerLat = Number(body.centerLat);
    const centerLng = Number(body.centerLng);

    if (!city || !state || !serviceType || Number.isNaN(centerLat) || Number.isNaN(centerLng)) {
      res.status(400).json({ error: "Missing required fields: city, state, serviceType, centerLat, centerLng" });
      return;
    }

    const response = await runUnifiedSearch({ city, state, serviceType, radiusMiles, centerLat, centerLng });

    res.json({
      ...response,
      persistence: {
        searchRunId: null,
        resultsInserted: 0,
        resultsUpdated: 0,
        persisted: false,
      },
    });
  } catch (e: any) {
    console.error("[UniversalDiscovery] Error:", e);
    res.status(500).json({ error: e.message || "Internal server error" });
  }
});

export default router;

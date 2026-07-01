import { Router, type Request, type Response } from "express";
import type { ProviderCandidate, CoordinateStatus, TrustTier } from "../providerSources/types";
import { geocodeAddress } from "../providerSources/geocode";

const router = Router();

interface NpiCustomSearchBody {
  city: string;
  state: string;
  centerLat: number;
  centerLng: number;
  limit?: number;
  organization_name?: string;
  first_name?: string;
  last_name?: string;
  taxonomy_description?: string;
  taxonomy_code?: string;
  enumeration_type?: string;
}

/**
 * POST /api/provider-sources/npi-custom
 * Custom NPI search with arbitrary parameters.
 * Replaces the frontend's direct NPI API calls.
 */
router.post("/provider-sources/npi-custom", async (req: Request, res: Response) => {
  try {
    const body = req.body as NpiCustomSearchBody;
    const city = String(body.city || "").trim();
    const state = String(body.state || "").trim().toUpperCase();
    const centerLat = Number(body.centerLat);
    const centerLng = Number(body.centerLng);
    const limit = Math.min(Math.max(Number(body.limit) || 200, 1), 500);

    if (!city || !state || Number.isNaN(centerLat) || Number.isNaN(centerLng)) {
      res.status(400).json({ error: "Missing required fields: city, state, centerLat, centerLng" });
      return;
    }

    // Build NPI API query params
    const params = new URLSearchParams({
      version: "2.1",
      city: city,
      state: state,
      limit: String(limit),
    });

    if (body.organization_name) params.set("organization_name", body.organization_name);
    if (body.first_name) params.set("first_name", body.first_name);
    if (body.last_name) params.set("last_name", body.last_name);
    if (body.taxonomy_description) params.set("taxonomy_description", body.taxonomy_description);
    if (body.taxonomy_code) {
      params.set("taxonomy_code", body.taxonomy_code);
    }
    if (body.enumeration_type) params.set("enumeration_type", body.enumeration_type);

    const resp = await fetch(`https://npiregistry.cms.hhs.gov/api/?${params.toString()}`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      res.status(502).json({ error: `NPI Registry returned ${resp.status}` });
      return;
    }

    const data = await resp.json() as { results?: any[]; result_count?: number; Errors?: any[] };

    if (data.Errors && data.Errors.length > 0) {
      res.json({
        results: [],
        normalizedCount: 0,
        geocodedCount: 0,
        finalMarkerCount: 0,
        error: data.Errors.map((e: any) => e.description || e.field || String(e)).join("; "),
      });
      return;
    }

    const rawResults = data.results || [];

    // Normalize results to ProviderCandidate format
    const candidates: ProviderCandidate[] = rawResults.map((r: any) => {
      const basic = r.basic || {};
      const addr = r.addresses?.find((a: any) => a.address_purpose === "LOCATION") || r.addresses?.[0] || {};
      const tax = r.taxonomies?.find((t: any) => t.primary) || r.taxonomies?.[0] || {};
      const isOrg = r.enumeration_type === "NPI-2";
      const name = isOrg
        ? (basic.organization_name || basic.organization_name_2 || "Unknown Organization")
        : [basic.first_name, basic.middle_name, basic.last_name].filter(Boolean).join(" ").trim() || "Unknown Provider";
      const npi = String(r.number || "");

      return {
        id: `npi-${npi}`,
        name,
        address: [addr.address_1, addr.city, addr.state, addr.postal_code?.slice?.(0, 5)].filter(Boolean).join(", "),
        city: addr.city || "",
        state: addr.state || "",
        postalCode: addr.postal_code || "",
        phone: addr.telephone_number || "",
        website: "",
        npi,
        taxonomy: tax.desc || "",
        taxonomyCode: tax.code || "",
        source: "NPI",
        sourceDetail: `NPI ${r.enumeration_type || ""}`.trim(),
        sourceUrl: npi ? `https://npiregistry.cms.hhs.gov/provider-view/${npi}` : "",
        coordinateStatus: "unverified" as CoordinateStatus,
        confidence: "medium" as const,
        trustTier: "registry" as TrustTier,
        score: isOrg ? 35 : 30,
        badges: ["NPI"],
        evidence: [],
        _rawSources: ["NPI"],
        lat: undefined,
        lng: undefined,
      };
    }).filter((c: ProviderCandidate) => c.address && c.city && c.state);

    // Geocode first 8 results (backend handles this instead of frontend)
    const geocodeLimit = 8;
    let geocodedCount = 0;
    for (let i = 0; i < Math.min(candidates.length, geocodeLimit); i++) {
      const c = candidates[i];
      if (c.address && c.city && c.state) {
        const point = await geocodeAddress(`${c.address}`);
        if (point) {
          candidates[i] = { ...c, lat: point.lat, lng: point.lng, coordinateStatus: "geocoded" as CoordinateStatus };
          geocodedCount++;
        }
        // Rate limiting for Nominatim
        await new Promise((r) => setTimeout(r, 1100));
      }
    }

    const finalMarkerCount = candidates.filter((c) => c.coordinateStatus !== "unverified").length;

    res.json({
      results: candidates,
      normalizedCount: candidates.length,
      geocodedCount,
      finalMarkerCount,
    });
  } catch (e: any) {
    console.error("[NpiCustomSearch] Error:", e);
    res.status(500).json({ error: e.message || "Internal server error" });
  }
});

export default router;

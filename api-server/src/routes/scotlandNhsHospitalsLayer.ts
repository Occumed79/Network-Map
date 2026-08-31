import { createHash } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { fetchExternalJson } from "../providerSources/externalSourceRuntime";

const router = Router();
const MAX_PAGE_SIZE = 2000;
const QUERY_URL = "https://services-eu1.arcgis.com/4QkhM5AS8YOlkb6T/ArcGIS/rest/services/NHS_Hospitals/FeatureServer/0/query";

type Bounds = { north: number; south: number; east: number; west: number };
type ArcFeature = { attributes?: Record<string, unknown>; geometry?: { x?: number; y?: number } };
type ArcPayload = { features?: ArcFeature[]; count?: number; error?: { message?: string; details?: string[] } };

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(text(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBounds(req: Request): Bounds | null {
  const useBounds = req.query.useBounds === "true" || req.query.bounds === "true";
  if (!useBounds) return null;
  const north = numberValue(req.query.north);
  const south = numberValue(req.query.south);
  const east = numberValue(req.query.east);
  const west = numberValue(req.query.west);
  if (north === null || south === null || east === null || west === null) return null;
  return { north, south, east, west };
}

function geometryParams(bounds: Bounds | null): URLSearchParams {
  const params = new URLSearchParams({ f: "json" });
  if (!bounds || bounds.west > bounds.east) return params;
  params.set("geometry", `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`);
  params.set("geometryType", "esriGeometryEnvelope");
  params.set("inSR", "4326");
  params.set("spatialRel", "esriSpatialRelIntersects");
  return params;
}

function arcError(payload: ArcPayload): string | null {
  if (!payload.error) return null;
  return [payload.error.message, ...(payload.error.details || [])].filter(Boolean).join(" ") || "ArcGIS query failed";
}

function stableId(row: Record<string, unknown>, lat: number, lng: number): string {
  const native = text(row.FID) || text(row.uprn);
  if (native) return `gb-scotland-nhs-hospital:${native}`;
  const digest = createHash("sha1")
    .update([row.name, row.address, row.postcode, lat, lng].map((value) => String(value ?? "")).join("|"))
    .digest("hex")
    .slice(0, 20);
  return `gb-scotland-nhs-hospital:${digest}`;
}

function normalize(feature: ArcFeature): Record<string, unknown> | null {
  const row = feature.attributes || {};
  const lat = numberValue(feature.geometry?.y);
  const lng = numberValue(feature.geometry?.x);
  if (lat === null || lng === null || lat < 54 || lat > 61.5 || lng < -9 || lng > 0) return null;
  const name = text(row.name);
  if (!name) return null;
  const id = stableId(row, lat, lng);
  const address = text(row.address);
  return {
    id,
    source_id: text(row.FID) || text(row.uprn) || id,
    name,
    address: address || null,
    address_1: address || null,
    city: null,
    admin_area: text(row.local_auth) || null,
    state: text(row.local_auth) || null,
    postal_code: text(row.postcode) || null,
    zip: text(row.postcode) || null,
    country: "Scotland",
    country_code: "GB",
    lat,
    lng,
    phone: null,
    website: null,
    clinic_type: "hospital",
    providerType: "hospital",
    category: "NHS hospital",
    services: ["hospital"],
    categories: ["NHS hospital"],
    types: ["hospital"],
    uprn: row.uprn ?? null,
    local_authority: row.local_auth ?? null,
    local_authority_code: row.la_s_code ?? null,
    source: "gb_scotland_nhs_hospitals",
    data_source: "gb_scotland_nhs_hospitals",
    source_kind: "official_registry_live",
    source_authority: "Public Health Scotland / Improvement Service Spatial Hub",
    trust_tier: "registry",
    confidence_score: 1,
    provider_layer_category: "scotland-nhs-hospitals",
  };
}

router.get("/international-registry-layers/scotland-nhs-hospitals", async (req: Request, res: Response) => {
  const bounds = parseBounds(req);
  const limit = Math.min(Math.max(Number(req.query.limit) || 1000, 1), MAX_PAGE_SIZE);
  const page = Math.max(Number(req.query.page) || 1, 1);

  try {
    const common = geometryParams(bounds);
    common.set("where", "1=1");

    const countParams = new URLSearchParams(common);
    countParams.set("returnCountOnly", "true");
    const countPayload = await fetchExternalJson<ArcPayload>(
      "gb-scotland-nhs-hospitals-count",
      `${QUERY_URL}?${countParams.toString()}`,
      { headers: { accept: "application/json" } },
    );
    const countError = arcError(countPayload);
    if (countError) throw new Error(countError);
    const total = Number(countPayload.count || 0);

    const params = new URLSearchParams(common);
    params.set("outFields", "FID,uprn,name,address,postcode,local_auth,la_s_code");
    params.set("returnGeometry", "true");
    params.set("outSR", "4326");
    params.set("orderByFields", "FID ASC");
    params.set("resultOffset", String((page - 1) * limit));
    params.set("resultRecordCount", String(limit));

    const payload = await fetchExternalJson<ArcPayload>(
      "gb-scotland-nhs-hospitals",
      `${QUERY_URL}?${params.toString()}`,
      { headers: { accept: "application/json" } },
    );
    const error = arcError(payload);
    if (error) throw new Error(error);

    const providers = (payload.features || [])
      .map(normalize)
      .filter((provider): provider is Record<string, unknown> => Boolean(provider));

    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=1800");
    res.json({
      providers,
      count: providers.length,
      loaded: providers.length,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      source: "scotland-nhs-hospitals",
      officialRegistry: true,
      live: true,
      visibleCapped: false,
    });
  } catch (error) {
    const warning = error instanceof Error ? error.message : "Scotland NHS Hospitals request failed";
    console.error("[ScotlandNhsHospitalsLayer] failed:", error);
    res.status(503).json({
      providers: [], count: 0, loaded: 0, total: 0, page, limit, hasMore: false,
      source: "scotland-nhs-hospitals", officialRegistry: true, live: true,
      warning, transientFailure: true, visibleCapped: false,
    });
  }
});

export default router;

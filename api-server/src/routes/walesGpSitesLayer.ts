import { createHash } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { fetchExternalJson } from "../providerSources/externalSourceRuntime";

const router = Router();
const MAX_PAGE_SIZE = 5000;

const MAIN_URL = "https://datamap.gov.wales/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=geonode%3Agpmainsites_ogl&outputFormat=application%2Fjson&srsName=EPSG%3A4326";
const BRANCH_URL = "https://datamap.gov.wales/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=geonode%3Agpbranchsites_ogl&outputFormat=application%2Fjson&srsName=EPSG%3A4326";

type Bounds = { north: number; south: number; east: number; west: number };
type GeoJsonFeature = {
  id?: string | number;
  geometry?: { type?: string; coordinates?: unknown[] };
  properties?: Record<string, unknown>;
};
type GeoJsonCollection = { features?: GeoJsonFeature[] };

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(text(value).replace(",", "."));
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

function inBounds(lat: number, lng: number, bounds: Bounds | null): boolean {
  if (!bounds) return true;
  if (lat < bounds.south || lat > bounds.north) return false;
  return bounds.west <= bounds.east
    ? lng >= bounds.west && lng <= bounds.east
    : lng >= bounds.west || lng <= bounds.east;
}

function stableId(prefix: string, values: unknown[]): string {
  return `${prefix}:${createHash("sha1").update(values.map((value) => String(value ?? "")).join("|")).digest("hex").slice(0, 20)}`;
}

function coordinates(feature: GeoJsonFeature): { lat: number; lng: number } | null {
  const row = feature.properties || {};
  const geometry = Array.isArray(feature.geometry?.coordinates) ? feature.geometry?.coordinates : [];
  const lat = numberValue(row.latitude ?? row.lat) ?? numberValue(geometry?.[1]);
  const lng = numberValue(row.longitude ?? row.long ?? row.lng) ?? numberValue(geometry?.[0]);
  if (lat === null || lng === null || lat < 51 || lat > 54 || lng < -6.5 || lng > -2.5) return null;
  return { lat, lng };
}

function mainSite(feature: GeoJsonFeature): Record<string, unknown> | null {
  const row = feature.properties || {};
  const point = coordinates(feature);
  if (!point) return null;
  const practiceCode = text(row.wcode) || text(row.practicecode);
  const name = text(row.practicename) || text(row.practice_name) || "Unnamed Welsh GP practice";
  const clusterCode = text(row.pcclustercode);
  const clusterName = text(row.pcclustername);
  const healthBoardCode = text(row.lhb_code);
  const healthBoardName = text(row.lhb_name_en) || text(row.lhb_name_cy) || healthBoardCode;
  const nativeId = practiceCode || text(feature.id) || text(row.uprn);
  const id = nativeId
    ? `gb-wales-gp-main:${nativeId}`
    : stableId("gb-wales-gp-main", [name, point.lat, point.lng]);
  return {
    id,
    source_id: nativeId || id,
    name,
    address: null,
    address_1: null,
    city: null,
    admin_area: healthBoardName || null,
    state: healthBoardName || null,
    postal_code: null,
    zip: null,
    country: "Wales",
    country_code: "GB",
    lat: point.lat,
    lng: point.lng,
    phone: null,
    website: null,
    clinic_type: "general_practitioner",
    providerType: "general_practitioner",
    category: "GP main site",
    services: ["general practitioner", "GP main site", clusterName].filter(Boolean),
    categories: ["GP main site"],
    types: ["general_practitioner"],
    practice_code: practiceCode || null,
    cluster_code: clusterCode || null,
    cluster_name: clusterName || null,
    health_board_code: healthBoardCode || null,
    health_board_name: healthBoardName || null,
    uprn: row.uprn ?? null,
    usrn: row.usrn ?? null,
    branch_count: row.noofbranches ?? null,
    site_kind: "main",
    source: "gb_wales_gp_sites",
    data_source: "gb_wales_gp_sites",
    source_kind: "official_registry_live",
    source_authority: "Welsh Government DataMapWales",
    trust_tier: "registry",
    confidence_score: 1,
    provider_layer_category: "wales-gp-main-sites",
  };
}

function branchSite(feature: GeoJsonFeature): Record<string, unknown> | null {
  const row = feature.properties || {};
  const point = coordinates(feature);
  if (!point) return null;
  const practiceCode = text(row.wcode) || text(row.practicecode);
  const name = text(row.practicename) || text(row.practice_name) || "Unnamed Welsh GP branch";
  const mainCode = text(row.mainid) || text(row.mainpracticecode);
  const mainName = text(row.mainpracticename);
  const clusterCode = text(row.mainppclustercode) || text(row.pcclustercode);
  const clusterName = text(row.mainppclustername) || text(row.pcclustername);
  const nativeId = text(feature.id) || text(row.uprn) || practiceCode;
  const id = nativeId
    ? `gb-wales-gp-branch:${nativeId}`
    : stableId("gb-wales-gp-branch", [name, mainCode, point.lat, point.lng]);
  return {
    id,
    source_id: nativeId || id,
    name,
    address: null,
    address_1: null,
    city: null,
    admin_area: null,
    state: null,
    postal_code: null,
    zip: null,
    country: "Wales",
    country_code: "GB",
    lat: point.lat,
    lng: point.lng,
    phone: null,
    website: null,
    clinic_type: "general_practitioner",
    providerType: "general_practitioner",
    category: "GP branch site",
    services: ["general practitioner", "GP branch site", clusterName].filter(Boolean),
    categories: ["GP branch site"],
    types: ["general_practitioner"],
    practice_code: practiceCode || null,
    main_practice_code: mainCode || null,
    main_practice_name: mainName || null,
    cluster_code: clusterCode || null,
    cluster_name: clusterName || null,
    uprn: row.uprn ?? null,
    usrn: row.usrn ?? null,
    site_kind: "branch",
    source: "gb_wales_gp_sites",
    data_source: "gb_wales_gp_sites",
    source_kind: "official_registry_live",
    source_authority: "Welsh Government DataMapWales",
    trust_tier: "registry",
    confidence_score: 1,
    provider_layer_category: "wales-gp-main-sites",
  };
}

async function load(url: string, sourceId: string): Promise<GeoJsonCollection> {
  return await fetchExternalJson<GeoJsonCollection>(
    sourceId,
    url,
    { headers: { accept: "application/geo+json, application/json" } },
    { validate: (value): value is GeoJsonCollection => Boolean(value && typeof value === "object" && Array.isArray((value as GeoJsonCollection).features)) },
  );
}

router.get("/international-registry-layers/wales-gp-main-sites", async (req: Request, res: Response) => {
  const bounds = parseBounds(req);
  const limit = Math.min(Math.max(Number(req.query.limit) || 2000, 1), MAX_PAGE_SIZE);
  const page = Math.max(Number(req.query.page) || 1, 1);
  try {
    const [mainPayload, branchPayload] = await Promise.all([
      load(MAIN_URL, "gb-wales-gp-main-sites"),
      load(BRANCH_URL, "gb-wales-gp-branch-sites"),
    ]);
    const deduped = new Map<string, Record<string, unknown>>();
    for (const provider of (mainPayload.features || []).map(mainSite).filter((value): value is Record<string, unknown> => Boolean(value))) {
      deduped.set(String(provider.id), provider);
    }
    for (const provider of (branchPayload.features || []).map(branchSite).filter((value): value is Record<string, unknown> => Boolean(value))) {
      deduped.set(String(provider.id), provider);
    }
    const matching = [...deduped.values()]
      .filter((provider) => inBounds(Number(provider.lat), Number(provider.lng), bounds))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)) || String(a.id).localeCompare(String(b.id)));
    const offset = (page - 1) * limit;
    const providers = matching.slice(offset, offset + limit);
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=1800");
    res.json({
      providers,
      count: providers.length,
      loaded: providers.length,
      total: matching.length,
      page,
      limit,
      hasMore: page * limit < matching.length,
      source: "wales-gp-main-sites",
      officialRegistry: true,
      sourceAuthority: "Welsh Government DataMapWales",
      includesMainSites: true,
      includesBranchSites: true,
      live: true,
      visibleCapped: false,
    });
  } catch (error) {
    const warning = error instanceof Error ? error.message : "Wales GP sites request failed";
    console.error("[WalesGpSitesLayer] failed:", error);
    res.status(503).json({
      providers: [], count: 0, loaded: 0, total: 0, page, limit, hasMore: false,
      source: "wales-gp-main-sites", warning, transientFailure: true, visibleCapped: false,
    });
  }
});

export default router;

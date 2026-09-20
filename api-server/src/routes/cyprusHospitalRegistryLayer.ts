import { createHash } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { fetchExternalJson } from "../providerSources/externalSourceRuntime";

const router = Router();
const MAX_PAGE_SIZE = 2000;
const RESOURCE_ID = "3f22360a-783c-43ed-87fe-0fca2e91661f";
const API_URL = "https://data.gov.cy/api/action/datastore/search.json";

type Bounds = { north: number; south: number; east: number; west: number };
type CyprusHospitalRow = {
  Hospital?: unknown;
  Address?: unknown;
  Tel?: unknown;
  Info_URL?: unknown;
  latitude?: unknown;
  longitude?: unknown;
};
type DkanPayload = {
  success?: boolean;
  result?: {
    total?: number | string;
    records?: CyprusHospitalRow[];
  };
};

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

function stableId(row: CyprusHospitalRow, lat: number, lng: number): string {
  const digest = createHash("sha1")
    .update([row.Hospital, row.Address, lat, lng].map((value) => String(value ?? "")).join("|"))
    .digest("hex")
    .slice(0, 20);
  return `cy-moh-hospital:${digest}`;
}

function normalize(row: CyprusHospitalRow): Record<string, unknown> | null {
  const lat = numberValue(row.latitude);
  const lng = numberValue(row.longitude);
  if (lat === null || lng === null || lat < 34 || lat > 36 || lng < 31 || lng > 35) return null;
  const name = text(row.Hospital);
  if (!name) return null;
  const id = stableId(row, lat, lng);
  const address = text(row.Address);
  return {
    id,
    source_id: id,
    name,
    address: address || null,
    address_1: address || null,
    city: null,
    admin_area: null,
    state: null,
    postal_code: null,
    zip: null,
    country: "Cyprus",
    country_code: "CY",
    lat,
    lng,
    phone: text(row.Tel) || null,
    website: text(row.Info_URL) || null,
    clinic_type: "hospital",
    providerType: "hospital",
    category: "state hospital",
    services: ["hospital"],
    categories: ["state hospital"],
    types: ["hospital"],
    source: "cy_moh_state_hospitals",
    data_source: "cy_moh_state_hospitals",
    source_kind: "official_registry_live",
    trust_tier: "registry",
    confidence_score: 1,
    provider_layer_category: "cyprus-state-hospitals",
  };
}

async function fetchRows(): Promise<CyprusHospitalRow[]> {
  const params = new URLSearchParams({ resource_id: RESOURCE_ID, limit: "0" });
  const payload = await fetchExternalJson<DkanPayload>(
    "cy-moh-state-hospitals",
    `${API_URL}?${params.toString()}`,
    { headers: { accept: "application/json" } },
    {
      validate: (value): value is DkanPayload => Boolean(
        value && typeof value === "object" &&
        (value as DkanPayload).success === true &&
        Array.isArray((value as DkanPayload).result?.records),
      ),
    },
  );
  return payload.result?.records || [];
}

router.get("/international-registry-layers/cyprus-state-hospitals", async (req: Request, res: Response) => {
  const bounds = parseBounds(req);
  const limit = Math.min(Math.max(Number(req.query.limit) || 1000, 1), MAX_PAGE_SIZE);
  const page = Math.max(Number(req.query.page) || 1, 1);

  try {
    const rows = await fetchRows();
    const matching = rows
      .map(normalize)
      .filter((provider): provider is Record<string, unknown> => Boolean(provider))
      .filter((provider) => inBounds(Number(provider.lat), Number(provider.lng), bounds));
    const offset = (page - 1) * limit;
    const providers = matching.slice(offset, offset + limit);
    const total = matching.length;
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=1800");
    res.json({
      providers,
      count: providers.length,
      loaded: providers.length,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      source: "cyprus-state-hospitals",
      officialRegistry: true,
      live: true,
      visibleCapped: false,
    });
  } catch (error) {
    const warning = error instanceof Error ? error.message : "Cyprus state hospital registry request failed";
    console.error("[CyprusHospitalRegistryLayer] failed:", error);
    res.status(503).json({
      providers: [], count: 0, loaded: 0, total: 0, page, limit, hasMore: false,
      source: "cyprus-state-hospitals", officialRegistry: true, live: true,
      warning, transientFailure: true, visibleCapped: false,
    });
  }
});

export default router;

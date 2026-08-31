import { createHash } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { fetchExternalJson } from "../providerSources/externalSourceRuntime";

const router = Router();
const RESOURCE_ID = "ff94a497-d7d1-44b3-abbb-1b5a19f19db1";
const CKAN_SEARCH_URL = "https://data.gov.hr/ckan/hr/api/3/action/datastore_search";
const CKAN_FETCH_LIMIT = 32000;
const MAX_PAGE_SIZE = 2000;

type Bounds = { north: number; south: number; east: number; west: number };
type CkanPayload = {
  success?: boolean;
  result?: {
    total?: number;
    records?: Record<string, unknown>[];
  };
  error?: unknown;
};

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
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

function croatiaCoordinates(row: Record<string, unknown>): { lat: number; lng: number } | null {
  const x = numberValue(row.M_X);
  const y = numberValue(row.M_Y);
  if (x === null || y === null) return null;

  // The HZZO resource exposes geocoded X/Y values as text. Croatia sits roughly
  // between 13-20E and 42-47N; support either axis order defensively.
  if (x >= 12 && x <= 21 && y >= 41 && y <= 48) return { lat: y, lng: x };
  if (y >= 12 && y <= 21 && x >= 41 && x <= 48) return { lat: x, lng: y };
  return null;
}

function stableId(row: Record<string, unknown>, address: string, lat: number, lng: number): string {
  const sourceId = text(row.GCQueueID) || text(row.PU);
  if (sourceId) return `hr-hzzo-pzz:${sourceId}`;
  const digest = createHash("sha1")
    .update(`${address}|${lat.toFixed(6)}|${lng.toFixed(6)}`)
    .digest("hex")
    .slice(0, 20);
  return `hr-hzzo-pzz:${digest}`;
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> | null {
  const coords = croatiaCoordinates(row);
  if (!coords) return null;

  const street = text(row.M_Street) || text(row.Ulica) || text(row.UlicaOriginal);
  const house = text(row.M_HouseNo) || text(row.Kbr) || text(row.KbrOriginal);
  const city = text(row.M_City) || text(row.Mjesto);
  const postal = text(row.M_PostalNo) || text(row.PostBr);
  const area = text(row.M_Area);
  const addressLine1 = [street, house].filter(Boolean).join(" ");
  const formattedAddress = [addressLine1, postal, city, area, "Croatia"].filter(Boolean).join(", ");
  const id = stableId(row, formattedAddress, coords.lat, coords.lng);
  const displayLocation = addressLine1 || city || postal || "Croatia";

  return {
    id,
    source_id: text(row.GCQueueID) || text(row.PU) || id,
    name: `Primary Care Practice — ${displayLocation}`,
    address: addressLine1 || null,
    address_1: addressLine1 || null,
    city: city || null,
    admin_area: area || null,
    state: area || null,
    postal_code: postal || null,
    zip: postal || null,
    country: "Croatia",
    country_code: "HR",
    lat: coords.lat,
    lng: coords.lng,
    phone: null,
    website: null,
    clinic_type: "general_practitioner",
    providerType: "general_practitioner",
    category: "primary care",
    services: ["primary care"],
    categories: ["primary care"],
    types: ["general_practitioner"],
    hzzo_pu: row.PU ?? null,
    geocode_type: row.M_Type ?? null,
    geocode_probability: row.M_Prob ?? null,
    geocode_method: row.Method ?? null,
    geocode_final: row.Final ?? null,
    source: "hr_hzzo_pzz_ckan",
    data_source: "hr_hzzo_pzz_ckan",
    source_kind: "official_registry_live",
    trust_tier: "registry",
    confidence_score: 0.95,
    provider_layer_category: "croatia-hzzo-primary-care",
  };
}

async function loadAllCroatiaRows(): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    resource_id: RESOURCE_ID,
    limit: String(CKAN_FETCH_LIMIT),
  });
  const payload = await fetchExternalJson<CkanPayload>(
    "hr-hzzo-pzz-ckan",
    `${CKAN_SEARCH_URL}?${params.toString()}`,
    { headers: { accept: "application/json" } },
  );
  if (payload.success !== true || !payload.result || !Array.isArray(payload.result.records)) {
    throw new Error("Croatia HZZO CKAN returned an invalid DataStore payload");
  }
  return payload.result.records;
}

router.get("/international-registry-layers/croatia-hzzo-primary-care", async (req: Request, res: Response) => {
  const bounds = parseBounds(req);
  const limit = Math.min(Math.max(Number(req.query.limit) || 1000, 1), MAX_PAGE_SIZE);
  const page = Math.max(Number(req.query.page) || 1, 1);

  try {
    const rows = await loadAllCroatiaRows();
    const matching = rows
      .map(normalizeRow)
      .filter((provider): provider is Record<string, unknown> => Boolean(provider))
      .filter((provider) => inBounds(Number(provider.lat), Number(provider.lng), bounds));
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
      hasMore: offset + providers.length < matching.length,
      source: "croatia-hzzo-primary-care",
      officialRegistry: true,
      live: true,
      visibleCapped: false,
      resourceId: RESOURCE_ID,
    });
  } catch (error) {
    const warning = error instanceof Error ? error.message : "Croatia HZZO CKAN request failed";
    console.error("[CroatiaHzzoRegistryLayer] request failed:", error);
    res.status(503).json({
      providers: [],
      count: 0,
      loaded: 0,
      total: 0,
      page,
      limit,
      hasMore: false,
      source: "croatia-hzzo-primary-care",
      officialRegistry: true,
      live: true,
      transientFailure: true,
      warning,
      visibleCapped: false,
    });
  }
});

export default router;

import { createHash } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { fetchExternalJson } from "../providerSources/externalSourceRuntime";

const router = Router();
const MAX_PAGE_SIZE = 2000;
const CANADA_MAX_PAGE_SIZE = 1000;
const GERMANY_LOCATIONS_URL = "https://bundes-klinik-atlas.de/fileadmin/json/locations.json";
const CANADA_ODHF_QUERY_URL = "https://services.arcgis.com/wjcPoefzjpzCgffS/ArcGIS/rest/services/Open_Database_of_Healthcare_Facilities_/FeatureServer/0/query";

type Bounds = { north: number; south: number; east: number; west: number };
type InternationalRegistryId = "germany-klinik-atlas" | "canada-odhf";

type GermanyLocation = {
  name?: string;
  street?: string;
  city?: string;
  zip?: string | number;
  phone?: string;
  mail?: string;
  beds_number?: number;
  latitude?: string | number;
  longitude?: string | number;
  link?: string;
};

type ArcGisFeature = { attributes?: Record<string, unknown> };
type ArcGisError = { message?: string; details?: string[] };
type ArcGisFeatureResponse = { features?: ArcGisFeature[]; exceededTransferLimit?: boolean; error?: ArcGisError };
type ArcGisCountResponse = { count?: number; error?: ArcGisError };

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBounds(req: Request): Bounds | null {
  const useBounds = req.query.useBounds === "true" || req.query.bounds === "true";
  if (!useBounds) return null;
  const north = finiteNumber(req.query.north);
  const south = finiteNumber(req.query.south);
  const east = finiteNumber(req.query.east);
  const west = finiteNumber(req.query.west);
  if (north === null || south === null || east === null || west === null) return null;
  return {
    north: Math.min(90, Math.max(-90, north)),
    south: Math.min(90, Math.max(-90, south)),
    east: Math.min(180, Math.max(-180, east)),
    west: Math.min(180, Math.max(-180, west)),
  };
}

function inBounds(lat: number, lng: number, bounds: Bounds | null): boolean {
  if (!bounds) return true;
  if (lat < bounds.south || lat > bounds.north) return false;
  return bounds.west <= bounds.east
    ? lng >= bounds.west && lng <= bounds.east
    : lng >= bounds.west || lng <= bounds.east;
}

function stableId(prefix: string, parts: unknown[]): string {
  const digest = createHash("sha1").update(parts.map((part) => String(part ?? "")).join("|")).digest("hex").slice(0, 20);
  return `${prefix}:${digest}`;
}

function germanyWebsite(link: unknown): string | null {
  const value = String(link || "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `https://bundes-klinik-atlas.de${value}`;
  return `https://bundes-klinik-atlas.de/${value.replace(/^\/+/, "")}`;
}

function normalizeGermany(location: GermanyLocation): Record<string, unknown> | null {
  const lat = finiteNumber(location.latitude);
  const lng = finiteNumber(location.longitude);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const id = stableId("de-klinikatlas", [location.name, location.street, location.zip, lat, lng]);
  return {
    id,
    source_id: id,
    name: String(location.name || "Unnamed German clinic"),
    address: location.street || null,
    address_1: location.street || null,
    city: location.city || null,
    admin_area: null,
    state: null,
    postal_code: location.zip == null ? null : String(location.zip),
    zip: location.zip == null ? null : String(location.zip),
    country: "Germany",
    country_code: "DE",
    lat,
    lng,
    phone: location.phone || null,
    email: location.mail || null,
    website: germanyWebsite(location.link),
    clinic_type: "hospital",
    providerType: "hospital",
    category: "hospital",
    services: ["hospital"],
    categories: ["hospital"],
    types: ["hospital"],
    beds: finiteNumber(location.beds_number),
    source: "de_klinikatlas",
    data_source: "de_klinikatlas",
    source_kind: "official_registry_live",
    trust_tier: "registry",
    confidence_score: 1,
    provider_layer_category: "germany-klinik-atlas",
  };
}

async function loadGermany(bounds: Bounds | null, limit: number, page: number) {
  const locations = await fetchExternalJson<GermanyLocation[]>(
    "de-klinikatlas",
    GERMANY_LOCATIONS_URL,
    { headers: { accept: "application/json" } },
    { validate: (value): value is GermanyLocation[] => Array.isArray(value) },
  );
  const matching = locations
    .map(normalizeGermany)
    .filter((provider): provider is Record<string, unknown> => Boolean(provider))
    .filter((provider) => inBounds(Number(provider.lat), Number(provider.lng), bounds));
  const offset = (page - 1) * limit;
  return { providers: matching.slice(offset, offset + limit), total: matching.length, limit };
}

function arcGisError(payload: ArcGisFeatureResponse | ArcGisCountResponse): string | null {
  if (!payload.error) return null;
  const details = Array.isArray(payload.error.details) ? payload.error.details.filter(Boolean).join(" ") : "";
  return [payload.error.message, details].filter(Boolean).join(" ") || "ArcGIS query failed";
}

function canadaGeometryParams(bounds: Bounds | null): URLSearchParams {
  const params = new URLSearchParams();
  if (!bounds || bounds.west > bounds.east) return params;
  params.set("geometry", `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`);
  params.set("geometryType", "esriGeometryEnvelope");
  params.set("inSR", "4326");
  params.set("spatialRel", "esriSpatialRelIntersects");
  return params;
}

function normalizeCanada(feature: ArcGisFeature): Record<string, unknown> | null {
  const row = feature.attributes || {};
  const lat = finiteNumber(row.latitude);
  const lng = finiteNumber(row.longitude);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const facilityType = String(row.odhf_facility_type || row.source_facility_type || "healthcare facility");
  const typeLower = facilityType.toLowerCase();
  const clinicType = typeLower.includes("hospital")
    ? "hospital"
    : typeLower.includes("ambulatory")
      ? "general_practitioner"
      : typeLower.includes("nursing") || typeLower.includes("residential")
        ? "residential_care"
        : "healthcare_facility";
  const street = String(row.source_format_str_address || [row.unit, row.street_no, row.street_name].filter(Boolean).join(" ") || "").trim() || null;
  const objectId = row.ObjectId2 ?? row.ObjectId ?? row.index_;
  const id = objectId == null
    ? stableId("ca-odhf", [row.facility_name, street, row.city, lat, lng])
    : `ca-odhf:${String(objectId)}`;
  return {
    id,
    source_id: String(row.index_ || objectId || id),
    name: String(row.facility_name || "Unnamed Canadian healthcare facility"),
    address: street,
    address_1: street,
    city: row.city ?? null,
    admin_area: row.province ?? null,
    state: row.province ?? null,
    postal_code: row.postal_code ?? null,
    zip: row.postal_code ?? null,
    country: "Canada",
    country_code: "CA",
    lat,
    lng,
    phone: null,
    website: null,
    clinic_type: clinicType,
    providerType: clinicType,
    category: facilityType,
    services: [facilityType],
    categories: [facilityType],
    types: [clinicType],
    source_provider: row.provider ?? null,
    source_facility_type: row.source_facility_type ?? null,
    source: "ca_odhf",
    data_source: "ca_odhf",
    source_kind: "official_registry_live",
    trust_tier: "registry",
    confidence_score: 1,
    provider_layer_category: "canada-odhf",
  };
}

async function loadCanada(bounds: Bounds | null, requestedLimit: number, page: number) {
  const limit = Math.min(requestedLimit, CANADA_MAX_PAGE_SIZE);
  const common = canadaGeometryParams(bounds);
  common.set("where", "latitude IS NOT NULL AND longitude IS NOT NULL");
  common.set("f", "json");

  const countParams = new URLSearchParams(common);
  countParams.set("returnCountOnly", "true");
  const countPayload = await fetchExternalJson<ArcGisCountResponse>(
    "ca-odhf",
    `${CANADA_ODHF_QUERY_URL}?${countParams.toString()}`,
    { headers: { accept: "application/json" } },
  );
  const countError = arcGisError(countPayload);
  if (countError) throw new Error(countError);

  const dataParams = new URLSearchParams(common);
  dataParams.set("outFields", "ObjectId2,ObjectId,index_,facility_name,source_facility_type,odhf_facility_type,provider,unit,street_no,street_name,postal_code,city,province,source_format_str_address,latitude,longitude");
  dataParams.set("returnGeometry", "false");
  dataParams.set("orderByFields", "ObjectId2 ASC");
  dataParams.set("resultOffset", String((page - 1) * limit));
  dataParams.set("resultRecordCount", String(limit));
  const dataPayload = await fetchExternalJson<ArcGisFeatureResponse>(
    "ca-odhf",
    `${CANADA_ODHF_QUERY_URL}?${dataParams.toString()}`,
    { headers: { accept: "application/json" } },
  );
  const dataError = arcGisError(dataPayload);
  if (dataError) throw new Error(dataError);

  const providers = (dataPayload.features || [])
    .map(normalizeCanada)
    .filter((provider): provider is Record<string, unknown> => Boolean(provider))
    .filter((provider) => inBounds(Number(provider.lat), Number(provider.lng), bounds));
  return { providers, total: Number(countPayload.count || 0), limit };
}

router.get("/international-registry-layers/:source", async (req: Request, res: Response) => {
  const sourceParam = Array.isArray(req.params.source) ? req.params.source[0] : req.params.source;
  const source = String(sourceParam || "") as InternationalRegistryId;
  if (source !== "germany-klinik-atlas" && source !== "canada-odhf") {
    res.status(400).json({
      error: `Unknown international registry source: ${source}`,
      sources: ["germany-klinik-atlas", "canada-odhf"],
    });
    return;
  }

  const bounds = parseBounds(req);
  const requestedLimit = Math.min(Math.max(Number(req.query.limit) || 1000, 1), MAX_PAGE_SIZE);
  const page = Math.max(Number(req.query.page) || 1, 1);

  try {
    const result = source === "germany-klinik-atlas"
      ? await loadGermany(bounds, requestedLimit, page)
      : await loadCanada(bounds, requestedLimit, page);
    const { providers, total, limit } = result;
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json({
      providers,
      count: providers.length,
      loaded: providers.length,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      source,
      officialRegistry: true,
      live: true,
      visibleCapped: false,
    });
  } catch (error) {
    const warning = error instanceof Error ? error.message : "International registry request failed";
    console.error(`[InternationalRegistryLayers] ${source} failed:`, error);
    res.status(503).json({
      providers: [],
      count: 0,
      loaded: 0,
      total: 0,
      page,
      limit: requestedLimit,
      hasMore: false,
      source,
      officialRegistry: true,
      live: true,
      warning,
      transientFailure: true,
      visibleCapped: false,
    });
  }
});

export default router;

import { createHash } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { fetchExternalJson } from "../providerSources/externalSourceRuntime";

const router = Router();
const MAX_PAGE_SIZE = 2000;
const CANADA_ARCGIS_PAGE_SIZE = 1000;
const GERMANY_LOCATIONS_URL = "https://bundes-klinik-atlas.de/fileadmin/json/locations.json";
const CANADA_ODHF_QUERY_URL = "https://services.arcgis.com/wjcPoefzjpzCgffS/ArcGIS/rest/services/Open_Database_of_Healthcare_Facilities_/FeatureServer/0/query";
const AUSTRALIA_HEALTHDIRECT_MAPSERVER = "https://services.ga.gov.au/gis/rest/services/National_HealthDirect_Health_Facilities/MapServer";

type Bounds = { north: number; south: number; east: number; west: number };
type InternationalRegistryId = "germany-klinik-atlas" | "canada-odhf" | "australia-healthdirect";

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

type AustraliaLayer = {
  id: number;
  sourceId: string;
  clinicType: "general_practitioner" | "hospital" | "pharmacy";
  label: string;
};

const AUSTRALIA_LAYERS: readonly AustraliaLayer[] = [
  { id: 0, sourceId: "au-healthdirect-gp", clinicType: "general_practitioner", label: "General Practice" },
  { id: 1, sourceId: "au-healthdirect-hospital", clinicType: "hospital", label: "Hospital" },
  { id: 2, sourceId: "au-healthdirect-pharmacy", clinicType: "pharmacy", label: "Pharmacy" },
] as const;

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

function geometryParams(bounds: Bounds | null): URLSearchParams {
  const params = new URLSearchParams();
  if (!bounds || bounds.west > bounds.east) return params;
  params.set("geometry", `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`);
  params.set("geometryType", "esriGeometryEnvelope");
  params.set("inSR", "4326");
  params.set("spatialRel", "esriSpatialRelIntersects");
  return params;
}

function arcGisError(payload: ArcGisFeatureResponse | ArcGisCountResponse): string | null {
  if (!payload.error) return null;
  const details = Array.isArray(payload.error.details) ? payload.error.details.filter(Boolean).join(" ") : "";
  return [payload.error.message, details].filter(Boolean).join(" ") || "ArcGIS query failed";
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
  return { providers: matching.slice(offset, offset + limit), total: matching.length };
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

async function fetchCanadaChunk(common: URLSearchParams, resultOffset: number, resultRecordCount: number) {
  const params = new URLSearchParams(common);
  params.set("outFields", "ObjectId2,ObjectId,index_,facility_name,source_facility_type,odhf_facility_type,provider,unit,street_no,street_name,postal_code,city,province,source_format_str_address,latitude,longitude");
  params.set("returnGeometry", "false");
  params.set("orderByFields", "ObjectId2 ASC");
  params.set("resultOffset", String(resultOffset));
  params.set("resultRecordCount", String(resultRecordCount));
  const payload = await fetchExternalJson<ArcGisFeatureResponse>(
    "ca-odhf",
    `${CANADA_ODHF_QUERY_URL}?${params.toString()}`,
    { headers: { accept: "application/json" } },
  );
  const error = arcGisError(payload);
  if (error) throw new Error(error);
  return payload.features || [];
}

async function loadCanada(bounds: Bounds | null, limit: number, page: number) {
  const common = geometryParams(bounds);
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

  const baseOffset = (page - 1) * limit;
  const rawFeatures: ArcGisFeature[] = [];
  for (let chunkOffset = 0; chunkOffset < limit; chunkOffset += CANADA_ARCGIS_PAGE_SIZE) {
    const chunkSize = Math.min(CANADA_ARCGIS_PAGE_SIZE, limit - chunkOffset);
    const chunk = await fetchCanadaChunk(common, baseOffset + chunkOffset, chunkSize);
    rawFeatures.push(...chunk);
    if (chunk.length < chunkSize) break;
  }

  const providers = rawFeatures
    .map(normalizeCanada)
    .filter((provider): provider is Record<string, unknown> => Boolean(provider))
    .filter((provider) => inBounds(Number(provider.lat), Number(provider.lng), bounds));
  return { providers, total: Number(countPayload.count || 0) };
}

function normalizeAustralia(feature: ArcGisFeature, layer: AustraliaLayer): Record<string, unknown> | null {
  const row = feature.attributes || {};
  const lat = finiteNumber(row.latitude);
  const lng = finiteNumber(row.longitude);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const sourceId = String(row.nhsd_service_id || row.objectid || "").trim();
  const id = sourceId
    ? `au-healthdirect:${layer.id}:${sourceId}`
    : stableId("au-healthdirect", [layer.id, row.organisation_name, row.address, row.suburb, lat, lng]);
  const serviceType = String(row.nhsd_service_type || layer.label);
  return {
    id,
    source_id: sourceId || id,
    name: String(row.organisation_name || `Unnamed Australian ${layer.label}`),
    address: row.address ?? null,
    address_1: row.address ?? null,
    city: row.suburb ?? null,
    admin_area: row.state ?? null,
    state: row.state ?? null,
    postal_code: row.postcode == null ? null : String(row.postcode),
    zip: row.postcode == null ? null : String(row.postcode),
    country: "Australia",
    country_code: "AU",
    lat,
    lng,
    phone: null,
    website: null,
    clinic_type: layer.clinicType,
    providerType: layer.clinicType,
    category: serviceType,
    services: [serviceType],
    categories: [serviceType],
    types: [layer.clinicType],
    operational_status: row.operationalstatus ?? null,
    source_date: row.ga_source_date ?? null,
    source: "au_healthdirect",
    data_source: "au_healthdirect",
    source_kind: "official_registry_live",
    trust_tier: "registry",
    confidence_score: 1,
    provider_layer_category: "australia-healthdirect",
  };
}

async function australiaLayerCount(layer: AustraliaLayer, bounds: Bounds | null): Promise<number> {
  const params = geometryParams(bounds);
  params.set("where", "latitude IS NOT NULL AND longitude IS NOT NULL");
  params.set("returnCountOnly", "true");
  params.set("f", "json");
  const payload = await fetchExternalJson<ArcGisCountResponse>(
    layer.sourceId,
    `${AUSTRALIA_HEALTHDIRECT_MAPSERVER}/${layer.id}/query?${params.toString()}`,
    { headers: { accept: "application/json" } },
  );
  const error = arcGisError(payload);
  if (error) throw new Error(`${layer.label}: ${error}`);
  return Number(payload.count || 0);
}

async function australiaLayerPage(layer: AustraliaLayer, bounds: Bounds | null, offset: number, limit: number) {
  const params = geometryParams(bounds);
  params.set("where", "latitude IS NOT NULL AND longitude IS NOT NULL");
  params.set("outFields", "objectid,operationalstatus,organisation_name,address,suburb,state,postcode,longitude,latitude,nhsd_service_id,nhsd_service_type,ga_source_date");
  params.set("returnGeometry", "false");
  params.set("orderByFields", "objectid ASC");
  params.set("resultOffset", String(offset));
  params.set("resultRecordCount", String(limit));
  params.set("f", "json");
  const payload = await fetchExternalJson<ArcGisFeatureResponse>(
    layer.sourceId,
    `${AUSTRALIA_HEALTHDIRECT_MAPSERVER}/${layer.id}/query?${params.toString()}`,
    { headers: { accept: "application/json" } },
  );
  const error = arcGisError(payload);
  if (error) throw new Error(`${layer.label}: ${error}`);
  return (payload.features || [])
    .map((feature) => normalizeAustralia(feature, layer))
    .filter((provider): provider is Record<string, unknown> => Boolean(provider))
    .filter((provider) => inBounds(Number(provider.lat), Number(provider.lng), bounds));
}

async function loadAustralia(bounds: Bounds | null, limit: number, page: number) {
  const counts = await Promise.all(AUSTRALIA_LAYERS.map(async (layer) => ({ layer, total: await australiaLayerCount(layer, bounds) })));
  const total = counts.reduce((sum, entry) => sum + entry.total, 0);
  let offset = (page - 1) * limit;
  let remaining = limit;
  const providers: Record<string, unknown>[] = [];

  for (const entry of counts) {
    if (remaining <= 0) break;
    if (offset >= entry.total) {
      offset -= entry.total;
      continue;
    }
    const requested = Math.min(remaining, entry.total - offset);
    providers.push(...await australiaLayerPage(entry.layer, bounds, offset, requested));
    remaining -= requested;
    offset = 0;
  }
  return { providers, total };
}

router.get("/international-registry-layers/:source", async (req: Request, res: Response) => {
  const sourceParam = Array.isArray(req.params.source) ? req.params.source[0] : req.params.source;
  const source = String(sourceParam || "") as InternationalRegistryId;
  const supported: InternationalRegistryId[] = ["germany-klinik-atlas", "canada-odhf", "australia-healthdirect"];
  if (!supported.includes(source)) {
    res.status(400).json({ error: `Unknown international registry source: ${source}`, sources: supported });
    return;
  }

  const bounds = parseBounds(req);
  const limit = Math.min(Math.max(Number(req.query.limit) || 1000, 1), MAX_PAGE_SIZE);
  const page = Math.max(Number(req.query.page) || 1, 1);

  try {
    const result = source === "germany-klinik-atlas"
      ? await loadGermany(bounds, limit, page)
      : source === "canada-odhf"
        ? await loadCanada(bounds, limit, page)
        : await loadAustralia(bounds, limit, page);
    const { providers, total } = result;
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
      limit,
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

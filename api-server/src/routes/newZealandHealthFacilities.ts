import { createHash } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { fetchExternalJson } from "../providerSources/externalSourceRuntime";

const router = Router();
const WEB_MAP_ITEM_ID = "165851167d8244938e0b8af7c0b69ecd";
const WEB_MAP_DATA_URL = `https://www.arcgis.com/sharing/rest/content/items/${WEB_MAP_ITEM_ID}/data?f=json`;
const ITEM_URL = "https://www.arcgis.com/sharing/rest/content/items";
const MAX_PAGE_SIZE = 2000;
const DEFAULT_ARCGIS_CHUNK = 1000;

type Bounds = { north: number; south: number; east: number; west: number };
type ArcGisError = { message?: string; details?: string[] };
type ArcGisFeature = { attributes?: Record<string, unknown>; geometry?: { x?: number; y?: number } };
type ArcGisPayload = { features?: ArcGisFeature[]; count?: number; error?: ArcGisError };
type ArcGisField = { name?: string; alias?: string };
type ArcGisLayerMetadata = {
  name?: string;
  displayField?: string;
  objectIdField?: string;
  maxRecordCount?: number;
  fields?: ArcGisField[];
  layers?: Array<{ id?: number; name?: string }>;
  error?: ArcGisError;
};
type ArcGisItem = { url?: string; title?: string; type?: string; error?: ArcGisError };
type WebMapLayer = {
  id?: string;
  title?: string;
  url?: string;
  itemId?: string;
  layers?: WebMapLayer[];
};
type WebMapData = { operationalLayers?: WebMapLayer[] };
type ResolvedLayer = {
  title: string;
  layerUrl: string;
  metadata: ArcGisLayerMetadata;
  clinicType: string;
  serviceLabel: string;
};

const TARGETS = [
  { match: "enrolling gp", clinicType: "general_practitioner", serviceLabel: "general practice" },
  { match: "pharmac", clinicType: "pharmacy", serviceLabel: "pharmacy" },
  { match: "public hospital", clinicType: "hospital", serviceLabel: "public hospital" },
  { match: "private hospital", clinicType: "hospital", serviceLabel: "private hospital" },
  { match: "rest home", clinicType: "residential_care", serviceLabel: "rest home" },
  { match: "plunket", clinicType: "healthcare_facility", serviceLabel: "maternal and child health" },
] as const;

function finite(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function parseBounds(req: Request): Bounds | null {
  const useBounds = req.query.useBounds === "true" || req.query.bounds === "true";
  if (!useBounds) return null;
  const north = finite(req.query.north);
  const south = finite(req.query.south);
  const east = finite(req.query.east);
  const west = finite(req.query.west);
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

function geometryParams(bounds: Bounds | null): URLSearchParams {
  const params = new URLSearchParams();
  if (!bounds || bounds.west > bounds.east) return params;
  params.set("geometry", `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`);
  params.set("geometryType", "esriGeometryEnvelope");
  params.set("inSR", "4326");
  params.set("spatialRel", "esriSpatialRelIntersects");
  return params;
}

function arcError(value: { error?: ArcGisError }): string | null {
  if (!value.error) return null;
  const details = Array.isArray(value.error.details) ? value.error.details.filter(Boolean).join(" ") : "";
  return [value.error.message, details].filter(Boolean).join(" ") || "ArcGIS request failed";
}

function canonical(value: unknown): string {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function fieldFor(metadata: ArcGisLayerMetadata, candidates: string[]): string | null {
  const candidateSet = candidates.map(canonical);
  for (const field of metadata.fields || []) {
    const values = [canonical(field.name), canonical(field.alias)];
    if (values.some((value) => candidateSet.includes(value))) return text(field.name) || null;
  }
  for (const field of metadata.fields || []) {
    const values = [canonical(field.name), canonical(field.alias)];
    if (values.some((value) => candidateSet.some((candidate) => value.includes(candidate)))) return text(field.name) || null;
  }
  return null;
}

function stableId(prefix: string, values: unknown[]): string {
  return `${prefix}:${createHash("sha1").update(values.map((value) => String(value ?? "")).join("|")).digest("hex").slice(0, 20)}`;
}

function flattenLayers(layers: WebMapLayer[] | undefined): WebMapLayer[] {
  const result: WebMapLayer[] = [];
  for (const layer of layers || []) {
    result.push(layer);
    if (Array.isArray(layer.layers)) result.push(...flattenLayers(layer.layers));
  }
  return result;
}

function targetFor(title: string) {
  const normalized = canonical(title);
  return TARGETS.find((target) => normalized.includes(target.match));
}

async function itemServiceUrl(itemId: string): Promise<string> {
  const item = await fetchExternalJson<ArcGisItem>(
    `nz-health-item-${itemId}`,
    `${ITEM_URL}/${encodeURIComponent(itemId)}?f=json`,
    { headers: { accept: "application/json" } },
  );
  const error = arcError(item);
  if (error) throw new Error(error);
  const url = text(item.url).replace(/\/$/u, "");
  if (!url) throw new Error(`New Zealand ArcGIS item ${itemId} did not expose a service URL`);
  return url;
}

async function concreteLayerUrl(rawUrl: string, title: string): Promise<string> {
  const url = rawUrl.replace(/\/$/u, "");
  if (/\/(?:FeatureServer|MapServer)\/\d+$/iu.test(url)) return url;
  if (!/\/(?:FeatureServer|MapServer)$/iu.test(url)) return url;
  const metadata = await fetchExternalJson<ArcGisLayerMetadata>(
    `nz-health-service-${stableId("svc", [url])}`,
    `${url}?f=json`,
    { headers: { accept: "application/json" } },
  );
  const error = arcError(metadata);
  if (error) throw new Error(error);
  const layers = metadata.layers || [];
  if (!layers.length) throw new Error(`New Zealand service ${title} did not expose feature layers`);
  const wanted = canonical(title);
  const selected = layers.find((layer) => wanted.includes(canonical(layer.name)) || canonical(layer.name).includes(wanted)) || layers[0];
  if (selected.id === undefined || selected.id === null) throw new Error(`New Zealand service ${title} did not expose a layer id`);
  return `${url}/${selected.id}`;
}

async function resolveLayers(): Promise<ResolvedLayer[]> {
  const webMap = await fetchExternalJson<WebMapData>(
    "nz-health-webmap",
    WEB_MAP_DATA_URL,
    { headers: { accept: "application/json" } },
  );
  const candidates = flattenLayers(webMap.operationalLayers).filter((layer) => Boolean(targetFor(text(layer.title))));
  if (!candidates.length) throw new Error("Health NZ web map did not expose the expected facility layers");

  const resolved: ResolvedLayer[] = [];
  for (const candidate of candidates) {
    const title = text(candidate.title);
    const target = targetFor(title);
    if (!target) continue;
    let url = text(candidate.url).replace(/\/$/u, "");
    if (!url && candidate.itemId) url = await itemServiceUrl(candidate.itemId);
    if (!url) continue;
    const layerUrl = await concreteLayerUrl(url, title);
    const metadata = await fetchExternalJson<ArcGisLayerMetadata>(
      `nz-health-metadata-${stableId("layer", [layerUrl])}`,
      `${layerUrl}?f=json`,
      { headers: { accept: "application/json" } },
    );
    const error = arcError(metadata);
    if (error) throw new Error(error);
    resolved.push({
      title,
      layerUrl,
      metadata,
      clinicType: target.clinicType,
      serviceLabel: target.serviceLabel,
    });
  }
  if (!resolved.length) throw new Error("Health NZ facility layers could not be resolved to ArcGIS services");
  return resolved;
}

function normalizer(layer: ResolvedLayer) {
  const m = layer.metadata;
  const objectIdField = m.objectIdField || fieldFor(m, ["objectid", "fid", "id"]);
  const hpiField = fieldFor(m, ["hpi facility id", "hpi facility", "facility id", "facility code", "facilityid"]);
  const nameField = m.displayField || fieldFor(m, ["facility name", "practice name", "pharmacy name", "name", "legal name"]);
  const addressField = fieldFor(m, ["address", "physical address", "street address", "facility address"]);
  const streetField = fieldFor(m, ["street", "street name", "address line 1"]);
  const suburbField = fieldFor(m, ["suburb", "town", "locality", "city"]);
  const regionField = fieldFor(m, ["region", "district", "territorial authority"]);
  const postalField = fieldFor(m, ["postcode", "postal code"]);
  const phoneField = fieldFor(m, ["telephone", "phone", "phone number"]);
  const emailField = fieldFor(m, ["email", "email address"]);
  const websiteField = fieldFor(m, ["website", "url", "web"]);
  const typeField = fieldFor(m, ["facility type", "type", "provider type"]);

  return (feature: ArcGisFeature): Record<string, unknown> | null => {
    const row = feature.attributes || {};
    const lng = finite(feature.geometry?.x);
    const lat = finite(feature.geometry?.y);
    if (lat === null || lng === null || lat < -48 || lat > -33 || lng < 165 || lng > 180) return null;
    const name = nameField ? text(row[nameField]) : "";
    if (!name) return null;
    const hpi = hpiField ? text(row[hpiField]) : "";
    const objectId = objectIdField ? text(row[objectIdField]) : "";
    const sourceId = hpi || `${canonical(layer.title)}:${objectId || stableId("nz", [name, lat, lng])}`;
    const address = (addressField ? text(row[addressField]) : "") || (streetField ? text(row[streetField]) : "");
    const facilityType = (typeField ? text(row[typeField]) : "") || layer.serviceLabel;
    return {
      id: `nz-health:${sourceId}`,
      source_id: sourceId,
      name,
      address: address || null,
      address_1: address || null,
      city: suburbField ? text(row[suburbField]) || null : null,
      admin_area: regionField ? text(row[regionField]) || null : null,
      state: regionField ? text(row[regionField]) || null : null,
      postal_code: postalField ? text(row[postalField]) || null : null,
      zip: postalField ? text(row[postalField]) || null : null,
      country: "New Zealand",
      country_code: "NZ",
      lat,
      lng,
      phone: phoneField ? text(row[phoneField]) || null : null,
      email: emailField ? text(row[emailField]) || null : null,
      website: websiteField ? text(row[websiteField]) || null : null,
      clinic_type: layer.clinicType,
      providerType: layer.clinicType,
      category: facilityType,
      services: [facilityType, layer.serviceLabel],
      categories: [facilityType],
      types: [layer.clinicType],
      hpi_facility_id: hpi || null,
      source_layer: layer.title,
      source: "nz_health_facilities",
      data_source: "nz_health_facilities",
      source_kind: "official_registry_live",
      trust_tier: "registry",
      confidence_score: 1,
      provider_layer_category: "new-zealand-health-facilities",
    };
  };
}

async function layerCount(layer: ResolvedLayer, bounds: Bounds | null): Promise<number> {
  const params = geometryParams(bounds);
  params.set("where", "1=1");
  params.set("returnCountOnly", "true");
  params.set("f", "json");
  const payload = await fetchExternalJson<ArcGisPayload>(
    `nz-health-count-${stableId("layer", [layer.layerUrl])}`,
    `${layer.layerUrl}/query?${params.toString()}`,
    { headers: { accept: "application/json" } },
  );
  const error = arcError(payload);
  if (error) throw new Error(`${layer.title}: ${error}`);
  return Number(payload.count || 0);
}

async function layerPage(layer: ResolvedLayer, bounds: Bounds | null, offset: number, count: number): Promise<Record<string, unknown>[]> {
  const normalize = normalizer(layer);
  const maxRecordCount = Math.max(1, Number(layer.metadata.maxRecordCount || DEFAULT_ARCGIS_CHUNK));
  const providers: Record<string, unknown>[] = [];
  let rawOffset = offset;
  let remaining = count;
  while (remaining > 0) {
    const chunkSize = Math.min(remaining, maxRecordCount, DEFAULT_ARCGIS_CHUNK);
    const params = geometryParams(bounds);
    params.set("where", "1=1");
    params.set("outFields", "*");
    params.set("returnGeometry", "true");
    params.set("outSR", "4326");
    if (layer.metadata.objectIdField) params.set("orderByFields", `${layer.metadata.objectIdField} ASC`);
    params.set("resultOffset", String(rawOffset));
    params.set("resultRecordCount", String(chunkSize));
    params.set("f", "json");
    const payload = await fetchExternalJson<ArcGisPayload>(
      `nz-health-data-${stableId("layer", [layer.layerUrl])}`,
      `${layer.layerUrl}/query?${params.toString()}`,
      { headers: { accept: "application/json" } },
    );
    const error = arcError(payload);
    if (error) throw new Error(`${layer.title}: ${error}`);
    const features = payload.features || [];
    if (!features.length) break;
    providers.push(...features.map(normalize).filter((provider): provider is Record<string, unknown> => Boolean(provider))
      .filter((provider) => inBounds(Number(provider.lat), Number(provider.lng), bounds)));
    rawOffset += features.length;
    remaining -= features.length;
    if (features.length < chunkSize) break;
  }
  return providers;
}

async function loadNewZealand(bounds: Bounds | null, limit: number, page: number) {
  const layers = await resolveLayers();
  const counts = await Promise.all(layers.map(async (layer) => ({ layer, total: await layerCount(layer, bounds) })));
  const total = counts.reduce((sum, entry) => sum + entry.total, 0);
  let logicalOffset = (page - 1) * limit;
  let remaining = Math.min(limit, Math.max(0, total - logicalOffset));
  const providers: Record<string, unknown>[] = [];
  for (const entry of counts) {
    if (remaining <= 0) break;
    if (logicalOffset >= entry.total) {
      logicalOffset -= entry.total;
      continue;
    }
    const requested = Math.min(remaining, entry.total - logicalOffset);
    const rows = await layerPage(entry.layer, bounds, logicalOffset, requested);
    providers.push(...rows);
    remaining -= requested;
    logicalOffset = 0;
  }
  return { providers, total };
}

router.get("/international-registry-layers/new-zealand-health-facilities", async (req: Request, res: Response) => {
  const bounds = parseBounds(req);
  const limit = Math.min(Math.max(Number(req.query.limit) || 1000, 1), MAX_PAGE_SIZE);
  const page = Math.max(Number(req.query.page) || 1, 1);
  try {
    const { providers, total } = await loadNewZealand(bounds, limit, page);
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=1800");
    res.json({
      providers,
      count: providers.length,
      loaded: providers.length,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      source: "new-zealand-health-facilities",
      officialRegistry: true,
      live: true,
      visibleCapped: false,
      webMapItemId: WEB_MAP_ITEM_ID,
    });
  } catch (error) {
    const warning = error instanceof Error ? error.message : "New Zealand Health NZ facility request failed";
    console.error("[NewZealandHealthFacilities] request failed:", error);
    res.status(503).json({
      providers: [], count: 0, loaded: 0, total: 0, page, limit, hasMore: false,
      source: "new-zealand-health-facilities", officialRegistry: true, live: true,
      transientFailure: true, warning, visibleCapped: false,
    });
  }
});

export default router;

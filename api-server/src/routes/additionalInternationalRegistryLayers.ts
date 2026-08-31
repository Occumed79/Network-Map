import { createHash } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { fetchExternalJson } from "../providerSources/externalSourceRuntime";

const router = Router();
const MAX_PAGE_SIZE = 2000;
const CKAN_FETCH_LIMIT = 10000;

const CHILE_RESOURCE_ID = "2c44d782-3365-44e3-aefb-2c8b8363a1bc";
const CHILE_CKAN_URL = "https://datos.gob.cl/ne/api/3/action/datastore_search";
const LATVIA_RESOURCE_ID = "5ea6e4aa-ee21-462a-8590-283483d2b0a4";
const LATVIA_CKAN_URL = "https://data.gov.lv/dati/api/3/action/datastore_search";
const IRELAND_QUERY_URL = "https://services-eu1.arcgis.com/v5dOXTEOb7ZHdNyQ/arcgis/rest/services/Health_Centres/FeatureServer/0/query";

type Bounds = { north: number; south: number; east: number; west: number };
type CkanPayload = { success?: boolean; result?: { total?: number; records?: Record<string, unknown>[] }; error?: unknown };
type ArcGisFeature = { attributes?: Record<string, unknown>; geometry?: { x?: number; y?: number } };
type ArcGisPayload = { features?: ArcGisFeature[]; count?: number; error?: { message?: string; details?: string[] } };

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

function stableId(prefix: string, values: unknown[]): string {
  const hash = createHash("sha1").update(values.map((value) => String(value ?? "")).join("|")).digest("hex").slice(0, 20);
  return `${prefix}:${hash}`;
}

function ckanUrl(base: string, resourceId: string): string {
  const params = new URLSearchParams({ resource_id: resourceId, limit: String(CKAN_FETCH_LIMIT) });
  return `${base}?${params.toString()}`;
}

async function fetchCkan(source: string, base: string, resourceId: string): Promise<Record<string, unknown>[]> {
  const payload = await fetchExternalJson<CkanPayload>(
    source,
    ckanUrl(base, resourceId),
    { headers: { accept: "application/json" } },
  );
  if (payload.success !== true || !payload.result || !Array.isArray(payload.result.records)) {
    throw new Error(`${source} returned an invalid CKAN DataStore payload`);
  }
  return payload.result.records;
}

function chileType(row: Record<string, unknown>): string {
  const label = text(row.TipoEstablecimientoGlosa).toLowerCase();
  if (label.includes("hospital")) return "hospital";
  if (label.includes("laboratorio")) return "lab";
  if (label.includes("imagen") || label.includes("radiolog")) return "imaging";
  if (label.includes("dental") || label.includes("odont")) return "dental";
  return "general_practitioner";
}

function normalizeChile(row: Record<string, unknown>): Record<string, unknown> | null {
  const lat = numberValue(row.Latitud);
  const lng = numberValue(row.Longitud);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const code = text(row.EstablecimientoCodigo) || text(row.EstablecimientoCodigoAntiguo);
  const id = code ? `cl-minsal:${code}` : stableId("cl-minsal", [row.EstablecimientoGlosa, lat, lng]);
  const street = [text(row.TipoViaGlosa), text(row.NombreVia), text(row.Numero)].filter(Boolean).join(" ");
  const facilityType = text(row.TipoEstablecimientoGlosa) || "healthcare establishment";
  const providerType = chileType(row);
  const services = [facilityType];
  if (/^si$/i.test(text(row.TieneServicioUrgencia))) services.push("urgent care");
  if (text(row.TipoUrgencia)) services.push(text(row.TipoUrgencia));
  return {
    id,
    source_id: code || id,
    name: text(row.EstablecimientoGlosa) || "Unnamed Chilean healthcare establishment",
    address: street || null,
    address_1: street || null,
    city: text(row.ComunaGlosa) || null,
    admin_area: text(row.RegionGlosa) || null,
    state: text(row.RegionGlosa) || null,
    postal_code: null,
    zip: null,
    country: "Chile",
    country_code: "CL",
    lat,
    lng,
    phone: text(row.TelefonoMovil_TelefonoFijo) || null,
    website: null,
    clinic_type: providerType,
    providerType,
    category: facilityType,
    services,
    categories: [facilityType],
    types: [providerType],
    operating_status: row.EstadoFuncionamiento ?? null,
    care_level: row.NivelAtencionEstabglosa ?? null,
    administrative_dependency: row.DependenciaAdministrativa ?? null,
    source: "cl_minsal_establishments",
    data_source: "cl_minsal_establishments",
    source_kind: "official_registry_live",
    trust_tier: "registry",
    confidence_score: 1,
    provider_layer_category: "chile-minsal",
  };
}

function normalizeLatvia(row: Record<string, unknown>): Record<string, unknown> | null {
  const lat = numberValue(row.lat);
  const lng = numberValue(row.long);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const sourceId = text(row.IestadesFilialesKods) || text(row.IestadesKods) || text(row.ID);
  const id = sourceId ? `lv-med:${sourceId}` : stableId("lv-med", [row.Nosaukums, row.Adrese, lat, lng]);
  const name = text(row.Nosaukums) || text(row.IestadesNosaukums) || "Unnamed Latvian medical facility";
  const city = text(row.PilsetasNosaukums) || text(row.CiemaNosaukums) || text(row.PagastaNosaukums);
  const type = text(row.IestadesTips) || "healthcare facility";
  return {
    id,
    source_id: sourceId || id,
    name,
    address: text(row.Adrese) || null,
    address_1: text(row.Adrese) || null,
    city: city || null,
    admin_area: text(row.NovadaNosaukums) || null,
    state: text(row.NovadaNosaukums) || null,
    postal_code: null,
    zip: null,
    country: "Latvia",
    country_code: "LV",
    lat,
    lng,
    phone: null,
    website: null,
    clinic_type: "healthcare_facility",
    providerType: "healthcare_facility",
    category: type,
    services: [type],
    categories: [type],
    types: ["healthcare_facility"],
    institution_code: row.IestadesKods ?? null,
    branch_code: row.IestadesFilialesKods ?? null,
    source: "lv_medical_facilities",
    data_source: "lv_medical_facilities",
    source_kind: "official_registry_live",
    trust_tier: "registry",
    confidence_score: 1,
    provider_layer_category: "latvia-medical-facilities",
  };
}

async function loadCkanRegistry(
  sourceName: string,
  base: string,
  resourceId: string,
  normalize: (row: Record<string, unknown>) => Record<string, unknown> | null,
  bounds: Bounds | null,
  limit: number,
  page: number,
) {
  const rows = await fetchCkan(sourceName, base, resourceId);
  const matching = rows
    .map(normalize)
    .filter((provider): provider is Record<string, unknown> => Boolean(provider))
    .filter((provider) => inBounds(Number(provider.lat), Number(provider.lng), bounds));
  const offset = (page - 1) * limit;
  return { providers: matching.slice(offset, offset + limit), total: matching.length };
}

function irelandGeometryParams(bounds: Bounds | null): URLSearchParams {
  const params = new URLSearchParams();
  if (!bounds || bounds.west > bounds.east) return params;
  params.set("geometry", `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`);
  params.set("geometryType", "esriGeometryEnvelope");
  params.set("inSR", "4326");
  params.set("spatialRel", "esriSpatialRelIntersects");
  return params;
}

function arcGisError(payload: ArcGisPayload): string | null {
  if (!payload.error) return null;
  const details = Array.isArray(payload.error.details) ? payload.error.details.filter(Boolean).join(" ") : "";
  return [payload.error.message, details].filter(Boolean).join(" ") || "ArcGIS query failed";
}

function normalizeIreland(feature: ArcGisFeature): Record<string, unknown> | null {
  const row = feature.attributes || {};
  const lng = numberValue(feature.geometry?.x);
  const lat = numberValue(feature.geometry?.y);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const objectId = text(row.OBJECTID);
  const id = objectId ? `ie-hse:${objectId}` : stableId("ie-hse", [row.Service_name, row.Address, lat, lng]);
  return {
    id,
    source_id: objectId || id,
    name: text(row.Service_name) || text(row.Alternative_name) || "Unnamed Irish health centre",
    address: text(row.Address) || null,
    address_1: text(row.Address) || null,
    city: null,
    admin_area: text(row.County) || null,
    state: text(row.County) || null,
    postal_code: null,
    zip: null,
    country: "Ireland",
    country_code: "IE",
    lat,
    lng,
    phone: null,
    website: null,
    clinic_type: "general_practitioner",
    providerType: "general_practitioner",
    category: "health centre",
    services: ["general practice", "nursing", "health centre"],
    categories: ["health centre"],
    types: ["general_practitioner"],
    alternative_name: text(row.Alternative_name) || null,
    source: "ie_hse_health_centres",
    data_source: "ie_hse_health_centres",
    source_kind: "official_registry_live",
    trust_tier: "registry",
    confidence_score: 1,
    provider_layer_category: "ireland-hse-health-centres",
  };
}

async function loadIreland(bounds: Bounds | null, limit: number, page: number) {
  const common = irelandGeometryParams(bounds);
  common.set("where", "1=1");
  common.set("f", "json");

  const countParams = new URLSearchParams(common);
  countParams.set("returnCountOnly", "true");
  const countPayload = await fetchExternalJson<ArcGisPayload>(
    "ie-hse-health-centres",
    `${IRELAND_QUERY_URL}?${countParams.toString()}`,
    { headers: { accept: "application/json" } },
  );
  const countError = arcGisError(countPayload);
  if (countError) throw new Error(countError);

  const params = new URLSearchParams(common);
  params.set("outFields", "OBJECTID,Service_name,Alternative_name,Address,County");
  params.set("returnGeometry", "true");
  params.set("outSR", "4326");
  params.set("orderByFields", "OBJECTID ASC");
  params.set("resultOffset", String((page - 1) * limit));
  params.set("resultRecordCount", String(limit));
  const payload = await fetchExternalJson<ArcGisPayload>(
    "ie-hse-health-centres",
    `${IRELAND_QUERY_URL}?${params.toString()}`,
    { headers: { accept: "application/json" } },
  );
  const error = arcGisError(payload);
  if (error) throw new Error(error);
  const providers = (payload.features || [])
    .map(normalizeIreland)
    .filter((provider): provider is Record<string, unknown> => Boolean(provider));
  return { providers, total: Number(countPayload.count || 0) };
}

function handler(
  source: string,
  loader: (bounds: Bounds | null, limit: number, page: number) => Promise<{ providers: Record<string, unknown>[]; total: number }>,
) {
  router.get(`/international-registry-layers/${source}`, async (req: Request, res: Response) => {
    const bounds = parseBounds(req);
    const limit = Math.min(Math.max(Number(req.query.limit) || 1000, 1), MAX_PAGE_SIZE);
    const page = Math.max(Number(req.query.page) || 1, 1);
    try {
      const { providers, total } = await loader(bounds, limit, page);
      res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=1800");
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
      const warning = error instanceof Error ? error.message : `${source} registry request failed`;
      console.error(`[AdditionalInternationalRegistryLayers] ${source} failed:`, error);
      res.status(503).json({
        providers: [], count: 0, loaded: 0, total: 0, page, limit, hasMore: false,
        source, officialRegistry: true, live: true, transientFailure: true, warning, visibleCapped: false,
      });
    }
  });
}

handler("chile-minsal", (bounds, limit, page) => loadCkanRegistry(
  "cl-minsal-establishments", CHILE_CKAN_URL, CHILE_RESOURCE_ID, normalizeChile, bounds, limit, page,
));
handler("latvia-medical-facilities", (bounds, limit, page) => loadCkanRegistry(
  "lv-medical-facilities", LATVIA_CKAN_URL, LATVIA_RESOURCE_ID, normalizeLatvia, bounds, limit, page,
));
handler("ireland-hse-health-centres", loadIreland);

export default router;

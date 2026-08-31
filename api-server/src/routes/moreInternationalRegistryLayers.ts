import { createHash } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { fetchExternalJson } from "../providerSources/externalSourceRuntime";

const router = Router();
const MAX_PAGE_SIZE = 2000;
const ARCGIS_CHUNK_SIZE = 1000;

const SINGAPORE_DATASET_ID = "d_548c33ea2d99e29ec63a7cc9edcccedc";
const SINGAPORE_POLL_URL = `https://api-open.data.gov.sg/v1/public/api/datasets/${SINGAPORE_DATASET_ID}/poll-download`;
const MEXICO_QUERY_URL = "https://geomaticasig1.semarnat.gob.mx/arcgis/rest/services/Hosted/Establecimientos_de_salud__2024/FeatureServer/1/query";
const TAIWAN_MEDICAL_URL = "https://api.nlsc.gov.tw/other/MarkBufferAnlys/med";

// Taiwan is long and narrow. A ~0.60 degree grid with a 50 km radius covers the
// island while keeping each NLSC request bounded. Calls are cached independently
// by the existing external-source runtime and only tiles intersecting the current
// viewport are requested.
const TAIWAN_BOUNDS = { west: 119.9, east: 122.15, south: 21.8, north: 25.45 } as const;
const TAIWAN_RADIUS_METERS = 50_000;
const TAIWAN_GRID_DEGREES = 0.60;

type Bounds = { north: number; south: number; east: number; west: number };
type GeoJsonGeometry = { type?: string; coordinates?: unknown };
type GeoJsonFeature = { type?: string; properties?: Record<string, unknown>; geometry?: GeoJsonGeometry };
type GeoJsonCollection = { type?: string; features?: GeoJsonFeature[] };
type SingaporePoll = { code?: number; errMsg?: string; data?: { url?: string } };
type ArcGisError = { message?: string; details?: string[] };
type ArcGisFeature = { attributes?: Record<string, unknown>; geometry?: { x?: number; y?: number } };
type ArcGisPayload = { features?: ArcGisFeature[]; count?: number; error?: ArcGisError };
type TaiwanRow = Record<string, unknown>;

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === null || value === undefined) return null;
  const parsed = Number(String(value).trim().replace(",", "."));
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
  const digest = createHash("sha1")
    .update(values.map((value) => String(value ?? "")).join("|"))
    .digest("hex")
    .slice(0, 20);
  return `${prefix}:${digest}`;
}

function paginate(providers: Record<string, unknown>[], limit: number, page: number) {
  const offset = (page - 1) * limit;
  return { providers: providers.slice(offset, offset + limit), total: providers.length };
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

function arcGisError(payload: ArcGisPayload): string | null {
  if (!payload.error) return null;
  const details = Array.isArray(payload.error.details) ? payload.error.details.filter(Boolean).join(" ") : "";
  return [payload.error.message, details].filter(Boolean).join(" ") || "ArcGIS query failed";
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function singaporeDescription(description: unknown): Record<string, string> {
  const html = text(description);
  const values: Record<string, string> = {};
  const cellPattern = /<tr[^>]*>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  for (const match of html.matchAll(cellPattern)) {
    const key = decodeHtml(match[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    const value = decodeHtml(match[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (key) values[key] = value;
  }
  return values;
}

function normalizeSingapore(feature: GeoJsonFeature): Record<string, unknown> | null {
  const coordinates = feature.geometry?.type === "Point" && Array.isArray(feature.geometry.coordinates)
    ? feature.geometry.coordinates
    : null;
  const lng = numberValue(coordinates?.[0]);
  const lat = numberValue(coordinates?.[1]);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const props = feature.properties || {};
  const fields = singaporeDescription(props.Description ?? props.description);
  const code = fields.HCI_CODE || text(props.HCI_CODE);
  const name = fields.HCI_NAME || text(props.HCI_NAME) || text(props.Name) || "Unnamed Singapore clinic";
  const street = fields.STREET_NAME || text(props.STREET_NAME);
  const block = fields.BLK_HSE_NO || text(props.BLK_HSE_NO);
  const building = fields.BUILDING_NAME || text(props.BUILDING_NAME);
  const floor = fields.FLOOR_NO || text(props.FLOOR_NO);
  const unit = fields.UNIT_NO || text(props.UNIT_NO);
  const address = [block, street, building, [floor, unit].filter(Boolean).join("-")].filter(Boolean).join(", ");
  const licenceType = fields.LICENCE_TYPE || text(props.LICENCE_TYPE) || "medical clinic";
  const id = code ? `sg-chas:${code}` : stableId("sg-chas", [name, address, lat, lng]);
  return {
    id,
    source_id: code || id,
    name,
    address: address || null,
    address_1: address || null,
    city: "Singapore",
    admin_area: null,
    state: null,
    postal_code: fields.POSTAL_CD || text(props.POSTAL_CD) || null,
    zip: fields.POSTAL_CD || text(props.POSTAL_CD) || null,
    country: "Singapore",
    country_code: "SG",
    lat,
    lng,
    phone: fields.HCI_TEL || text(props.HCI_TEL) || null,
    website: null,
    clinic_type: "general_practitioner",
    providerType: "general_practitioner",
    category: licenceType,
    services: [licenceType, fields.CLINIC_PROGRAMME_CODE].filter(Boolean),
    categories: [licenceType],
    types: ["general_practitioner"],
    programme_code: fields.CLINIC_PROGRAMME_CODE || null,
    source: "sg_moh_chas",
    data_source: "sg_moh_chas",
    source_kind: "official_registry_live",
    trust_tier: "registry",
    confidence_score: 1,
    provider_layer_category: "singapore-chas",
  };
}

async function loadSingapore(bounds: Bounds | null, limit: number, page: number) {
  const poll = await fetchExternalJson<SingaporePoll>(
    "sg-chas-poll",
    SINGAPORE_POLL_URL,
    { headers: { accept: "application/json" } },
  );
  const downloadUrl = text(poll.data?.url);
  if (poll.code !== 0 || !downloadUrl) throw new Error(poll.errMsg || "Singapore data.gov.sg did not return a CHAS download URL");
  const geojson = await fetchExternalJson<GeoJsonCollection>(
    "sg-chas-geojson",
    downloadUrl,
    { headers: { accept: "application/geo+json,application/json" } },
    { validate: (value): value is GeoJsonCollection => Boolean(value && typeof value === "object" && Array.isArray((value as GeoJsonCollection).features)) },
  );
  const matching = (geojson.features || [])
    .map(normalizeSingapore)
    .filter((provider): provider is Record<string, unknown> => Boolean(provider))
    .filter((provider) => inBounds(Number(provider.lat), Number(provider.lng), bounds));
  return paginate(matching, limit, page);
}

function mexicoType(row: Record<string, unknown>): string {
  const broad = text(row.nombre_tipo_establecimiento).toLowerCase();
  const typology = `${text(row.nombre_de_tipologia)} ${text(row.nombre_de_subtipologia)}`.toLowerCase();
  if (broad.includes("hospital") || typology.includes("hospital")) return "hospital";
  if (/laborator/.test(typology)) return "lab";
  if (/imagen|radiolog|diagn[oó]stic/.test(typology)) return "imaging";
  if (/dental|odont/.test(typology)) return "dental";
  return broad.includes("consulta externa") ? "general_practitioner" : "healthcare_facility";
}

function normalizeMexico(feature: ArcGisFeature): Record<string, unknown> | null {
  const row = feature.attributes || {};
  const lng = numberValue(feature.geometry?.x ?? row.long_num ?? row.longitud);
  const lat = numberValue(feature.geometry?.y ?? row.lat_num ?? row.latitud);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const clues = text(row.clues);
  const objectId = text(row.objectid);
  const id = clues ? `mx-clues:${clues}` : objectId ? `mx-clues:oid:${objectId}` : stableId("mx-clues", [row.nombre_de_la_unidad, lat, lng]);
  const street = [text(row.tipo_de_vialidad), text(row.vialidad), text(row.numero_exterior)].filter(Boolean).join(" ");
  const providerType = mexicoType(row);
  const facilityType = text(row.nombre_tipo_establecimiento) || text(row.nombre_de_tipologia) || "healthcare facility";
  return {
    id,
    source_id: clues || objectId || id,
    name: text(row.nombre_comercial) || text(row.nombre_de_la_unidad) || "Unnamed Mexican healthcare facility",
    parent_organization: text(row.nombre_de_la_institucion) || null,
    address: street || null,
    address_1: street || null,
    city: text(row.localidad) || text(row.municipio) || null,
    admin_area: text(row.entidad) || null,
    state: text(row.entidad) || null,
    postal_code: text(row.codigo_postal) || null,
    zip: text(row.codigo_postal) || null,
    country: "Mexico",
    country_code: "MX",
    lat,
    lng,
    phone: text(row.telefono_1_del_establecimiento) || null,
    website: null,
    clinic_type: providerType,
    providerType,
    category: facilityType,
    services: [facilityType, text(row.nombre_de_tipologia), text(row.nombre_de_subtipologia)].filter(Boolean),
    categories: [facilityType],
    types: [providerType],
    clues: clues || null,
    care_level: row.nivel_atencion ?? null,
    operating_status: row.estatus_de_operacion ?? null,
    source: "mx_clues_2024",
    data_source: "mx_clues_2024",
    source_kind: "official_registry_live",
    trust_tier: "registry",
    confidence_score: 1,
    provider_layer_category: "mexico-clues",
  };
}

async function loadMexico(bounds: Bounds | null, limit: number, page: number) {
  const common = geometryParams(bounds);
  common.set("where", "1=1");
  common.set("f", "json");

  const countParams = new URLSearchParams(common);
  countParams.set("returnCountOnly", "true");
  const countPayload = await fetchExternalJson<ArcGisPayload>(
    "mx-clues-count",
    `${MEXICO_QUERY_URL}?${countParams.toString()}`,
    { headers: { accept: "application/json" } },
  );
  const countError = arcGisError(countPayload);
  if (countError) throw new Error(countError);
  const total = Number(countPayload.count || 0);

  const logicalOffset = (page - 1) * limit;
  const providers: Record<string, unknown>[] = [];
  let rawOffset = logicalOffset;
  let remaining = Math.min(limit, Math.max(0, total - logicalOffset));
  while (remaining > 0) {
    const chunkSize = Math.min(remaining, ARCGIS_CHUNK_SIZE);
    const params = new URLSearchParams(common);
    params.set("outFields", "objectid,clues,nombre_de_la_institucion,entidad,municipio,localidad,nombre_tipo_establecimiento,nombre_de_tipologia,nombre_de_subtipologia,nombre_de_la_unidad,nombre_comercial,tipo_de_vialidad,vialidad,numero_exterior,codigo_postal,estatus_de_operacion,telefono_1_del_establecimiento,nivel_atencion,latitud,longitud,lat_num,long_num");
    params.set("returnGeometry", "true");
    params.set("outSR", "4326");
    params.set("orderByFields", "objectid ASC");
    params.set("resultOffset", String(rawOffset));
    params.set("resultRecordCount", String(chunkSize));
    const payload = await fetchExternalJson<ArcGisPayload>(
      "mx-clues",
      `${MEXICO_QUERY_URL}?${params.toString()}`,
      { headers: { accept: "application/json" } },
    );
    const error = arcGisError(payload);
    if (error) throw new Error(error);
    const features = payload.features || [];
    if (!features.length) throw new Error(`Mexico CLUES returned an empty page before ${total} records were exhausted`);
    providers.push(...features.map(normalizeMexico).filter((provider): provider is Record<string, unknown> => Boolean(provider)));
    rawOffset += features.length;
    remaining -= features.length;
    if (features.length < chunkSize && rawOffset < total) throw new Error("Mexico CLUES returned an incomplete ArcGIS page");
  }
  return { providers, total };
}

function intersectsTaiwan(bounds: Bounds | null): boolean {
  if (!bounds) return true;
  if (bounds.north < TAIWAN_BOUNDS.south || bounds.south > TAIWAN_BOUNDS.north) return false;
  if (bounds.west <= bounds.east) return !(bounds.east < TAIWAN_BOUNDS.west || bounds.west > TAIWAN_BOUNDS.east);
  return true;
}

function taiwanTileCenters(bounds: Bounds | null): Array<[number, number]> {
  if (!intersectsTaiwan(bounds)) return [];
  const west = Math.max(TAIWAN_BOUNDS.west, bounds && bounds.west <= bounds.east ? bounds.west - 0.5 : TAIWAN_BOUNDS.west);
  const east = Math.min(TAIWAN_BOUNDS.east, bounds && bounds.west <= bounds.east ? bounds.east + 0.5 : TAIWAN_BOUNDS.east);
  const south = Math.max(TAIWAN_BOUNDS.south, (bounds?.south ?? TAIWAN_BOUNDS.south) - 0.5);
  const north = Math.min(TAIWAN_BOUNDS.north, (bounds?.north ?? TAIWAN_BOUNDS.north) + 0.5);
  const centers: Array<[number, number]> = [];
  for (let lat = south; lat <= north + TAIWAN_GRID_DEGREES; lat += TAIWAN_GRID_DEGREES) {
    for (let lng = west; lng <= east + TAIWAN_GRID_DEGREES; lng += TAIWAN_GRID_DEGREES) {
      centers.push([Math.min(lng, TAIWAN_BOUNDS.east), Math.min(lat, TAIWAN_BOUNDS.north)]);
    }
  }
  return centers;
}

function taiwanValue(row: TaiwanRow, candidates: string[]): unknown {
  for (const candidate of candidates) {
    if (row[candidate] !== undefined && row[candidate] !== null && text(row[candidate])) return row[candidate];
  }
  const normalized = new Map(Object.entries(row).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gu, ""), value]));
  for (const candidate of candidates) {
    const value = normalized.get(candidate.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gu, ""));
    if (value !== undefined && value !== null && text(value)) return value;
  }
  return null;
}

function normalizeTaiwan(row: TaiwanRow): Record<string, unknown> | null {
  const lng = numberValue(taiwanValue(row, ["lon", "lng", "longitude", "x", "經度", "坐標X"]));
  const lat = numberValue(taiwanValue(row, ["lat", "latitude", "y", "緯度", "坐標Y"]));
  if (lat === null || lng === null || lat < 20 || lat > 27 || lng < 118 || lng > 123) return null;
  const name = text(taiwanValue(row, ["name", "facilityname", "title", "設施名稱", "名稱", "醫療機構名稱"]));
  if (!name) return null;
  const address = text(taiwanValue(row, ["address", "addr", "門牌", "地址"]));
  const sourceId = text(taiwanValue(row, ["id", "uid", "code", "facilityid", "醫事機構代碼"]));
  const id = sourceId ? `tw-nlsc:${sourceId}` : stableId("tw-nlsc", [name, address, lat, lng]);
  return {
    id,
    source_id: sourceId || id,
    name,
    address: address || null,
    address_1: address || null,
    city: null,
    admin_area: null,
    state: null,
    postal_code: null,
    zip: null,
    country: "Taiwan",
    country_code: "TW",
    lat,
    lng,
    phone: text(taiwanValue(row, ["phone", "tel", "telephone", "電話"])) || null,
    website: null,
    clinic_type: "healthcare_facility",
    providerType: "healthcare_facility",
    category: "medical facility",
    services: ["medical facility"],
    categories: ["medical facility"],
    types: ["healthcare_facility"],
    source: "tw_nlsc_medical",
    data_source: "tw_nlsc_medical",
    source_kind: "official_registry_live",
    trust_tier: "registry",
    confidence_score: 1,
    provider_layer_category: "taiwan-nlsc-medical",
  };
}

async function loadTaiwan(bounds: Bounds | null, limit: number, page: number) {
  const centers = taiwanTileCenters(bounds);
  if (!centers.length) return { providers: [], total: 0 };
  const tilePayloads = await Promise.all(centers.map(async ([lng, lat], index) => {
    const url = `${TAIWAN_MEDICAL_URL}/${lng.toFixed(5)}/${lat.toFixed(5)}/${TAIWAN_RADIUS_METERS}`;
    const payload = await fetchExternalJson<unknown>(
      `tw-nlsc-medical-${index % 4}`,
      url,
      { headers: { accept: "application/json" } },
    );
    if (Array.isArray(payload)) return payload as TaiwanRow[];
    if (payload && typeof payload === "object") {
      const object = payload as Record<string, unknown>;
      for (const key of ["data", "features", "result", "results"]) {
        if (Array.isArray(object[key])) return object[key] as TaiwanRow[];
      }
    }
    return [];
  }));
  const unique = new Map<string, Record<string, unknown>>();
  for (const row of tilePayloads.flat()) {
    const provider = normalizeTaiwan(row);
    if (!provider || !inBounds(Number(provider.lat), Number(provider.lng), bounds)) continue;
    unique.set(String(provider.id), provider);
  }
  const matching = [...unique.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)) || String(a.id).localeCompare(String(b.id)));
  return paginate(matching, limit, page);
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
      console.error(`[MoreInternationalRegistryLayers] ${source} failed:`, error);
      res.status(503).json({
        providers: [], count: 0, loaded: 0, total: 0, page, limit, hasMore: false,
        source, officialRegistry: true, live: true, transientFailure: true, warning, visibleCapped: false,
      });
    }
  });
}

handler("singapore-chas", loadSingapore);
handler("mexico-clues", loadMexico);
handler("taiwan-nlsc-medical", loadTaiwan);

export default router;

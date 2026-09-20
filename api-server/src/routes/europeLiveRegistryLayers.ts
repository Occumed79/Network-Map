import { createHash } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { fetchExternalJson } from "../providerSources/externalSourceRuntime";

const router = Router();
const MAX_PAGE_SIZE = 2000;

const WALES_GP_WFS_URL = "https://datamap.gov.wales/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=geonode%3Agpmainsites_ogl&outputFormat=application%2Fjson&srsName=EPSG%3A4326";

const MONTENEGRO_RESOURCES = [
  {
    key: "central",
    url: "https://data.gov.me/dataset/d4ce6420-888a-4ffd-965e-e67cd01a8690/resource/f7578610-4d8b-4158-b519-06972a339aff/download/jzu_centralne_ustanove.json",
  },
  {
    key: "special-hospitals",
    url: "https://data.gov.me/dataset/af4b72d4-4da0-418a-87a1-c3c29cd7d42f/resource/167da4b0-0418-4173-8439-26cb47115684/download/jzu_specijalne_bolnice.json",
  },
  {
    key: "hospitals",
    url: "https://data.gov.me/dataset/b197a452-ac56-4b26-968c-7a7f056ea85f/resource/07d6e400-fa54-4ee3-af5d-9522ae76ab33/download/sve_bolnice_cg_ukljucujuci_kbc.json",
  },
  {
    key: "montefarm-pharmacies",
    url: "https://data.gov.me/dataset/e89e5e90-2ade-48a6-9689-5a4682a31ff2/resource/c818962c-0cdd-47b9-b1a2-e66b0d74bd50/download/apoteke.json",
  },
] as const;

type Bounds = { north: number; south: number; east: number; west: number };
type GeoJsonFeature = {
  id?: string | number;
  geometry?: { type?: string; coordinates?: unknown[] };
  properties?: Record<string, unknown>;
};
type GeoJsonCollection = { features?: GeoJsonFeature[] };

type RegistryResult = { providers: Record<string, unknown>[]; total: number };

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = text(value).replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function validCoordinates(lat: number | null, lng: number | null): lat is number {
  return lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0);
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

function stableId(prefix: string, values: unknown[]): string {
  const digest = createHash("sha1")
    .update(values.map((value) => String(value ?? "")).join("|"))
    .digest("hex")
    .slice(0, 20);
  return `${prefix}:${digest}`;
}

function pageResult(providers: Record<string, unknown>[], limit: number, page: number): RegistryResult {
  const offset = (page - 1) * limit;
  return { providers: providers.slice(offset, offset + limit), total: providers.length };
}

function normalizeWales(feature: GeoJsonFeature): Record<string, unknown> | null {
  const row = feature.properties || {};
  const geometry = feature.geometry?.coordinates || [];
  const lat = finiteNumber(row.latitude) ?? finiteNumber(geometry[1]);
  const lng = finiteNumber(row.longitude) ?? finiteNumber(geometry[0]);
  if (!validCoordinates(lat, lng)) return null;

  const practiceCode = text(row.wcode) || text(row.practicecode) || text(feature.id);
  const name = text(row.practicename) || text(row.practice_name) || "Unnamed Welsh GP practice";
  const id = practiceCode
    ? `gb-wales-gp:${practiceCode}`
    : stableId("gb-wales-gp", [name, lat, lng]);
  const cluster = text(row.pcclustername);
  const healthBoard = text(row.lhb_name_en) || text(row.lhb_name_cy) || text(row.lhb_code);
  const services = ["general practitioner", cluster].filter(Boolean);

  return {
    id,
    source_id: practiceCode || id,
    name,
    address: null,
    address_1: null,
    city: null,
    admin_area: healthBoard || null,
    state: healthBoard || null,
    postal_code: null,
    zip: null,
    country: "Wales",
    country_code: "GB",
    lat,
    lng,
    phone: null,
    website: null,
    clinic_type: "general_practitioner",
    providerType: "general_practitioner",
    category: "GP main site",
    services,
    categories: ["GP main site"],
    types: ["general_practitioner"],
    practice_code: practiceCode || null,
    cluster_code: row.pcclustercode ?? null,
    cluster_name: cluster || null,
    health_board_code: row.lhb_code ?? null,
    health_board_name: healthBoard || null,
    uprn: row.uprn ?? null,
    usrn: row.usrn ?? null,
    branch_count: row.noofbranches ?? null,
    source: "gb_wales_gp_main_sites",
    data_source: "gb_wales_gp_main_sites",
    source_kind: "official_registry_live",
    trust_tier: "registry",
    confidence_score: 1,
    provider_layer_category: "wales-gp-main-sites",
  };
}

async function loadWales(bounds: Bounds | null, limit: number, page: number): Promise<RegistryResult> {
  const payload = await fetchExternalJson<GeoJsonCollection>(
    "gb-wales-gp-main-sites",
    WALES_GP_WFS_URL,
    { headers: { accept: "application/geo+json, application/json" } },
    { validate: (value): value is GeoJsonCollection => Boolean(value && typeof value === "object" && Array.isArray((value as GeoJsonCollection).features)) },
  );
  const matching = (payload.features || [])
    .map(normalizeWales)
    .filter((provider): provider is Record<string, unknown> => Boolean(provider))
    .filter((provider) => inBounds(Number(provider.lat), Number(provider.lng), bounds));
  return pageResult(matching, limit, page);
}

function rowsFromPayload(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"));
  if (!payload || typeof payload !== "object") return [];
  const object = payload as Record<string, unknown>;
  for (const key of ["records", "data", "items", "results", "features"]) {
    const value = object[key];
    if (Array.isArray(value)) {
      return value
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const candidate = entry as Record<string, unknown>;
          if (candidate.properties && typeof candidate.properties === "object") return candidate.properties as Record<string, unknown>;
          return candidate;
        })
        .filter((row): row is Record<string, unknown> => Boolean(row));
    }
  }
  return [];
}

function montenegroType(row: Record<string, unknown>): { primary: string; label: string } {
  const label = text(row.tip) || text(row.category) || text(row.kategorija) || "healthcare facility";
  const haystack = `${label} ${text(row.naziv)} ${text(row.name)}`.toLowerCase();
  if (/(apoteka|pharmacy|montefarm)/u.test(haystack)) return { primary: "pharmacy_vaccination", label };
  if (/(bolnic|hospital|klinick|kliničk)/u.test(haystack)) return { primary: "hospital", label };
  if (/(laborator|lab\b)/u.test(haystack)) return { primary: "lab", label };
  if (/(dental|stomat|zub)/u.test(haystack)) return { primary: "dental", label };
  if (/(radiolog|imaging|snimanj|rendgen|rentgen)/u.test(haystack)) return { primary: "imaging", label };
  if (/(dom zdravlja|ambulant|hitna|emergency|primary|porodič|porodic)/u.test(haystack)) return { primary: "general_practitioner", label };
  return { primary: "healthcare_facility", label };
}

function normalizeMontenegro(row: Record<string, unknown>, resourceKey: string): Record<string, unknown> | null {
  const lat = finiteNumber(row.latitude ?? row.lat ?? row.Latitude ?? row.LAT);
  const lng = finiteNumber(row.longitude ?? row.lng ?? row.lon ?? row.Longitude ?? row.LNG);
  if (!validCoordinates(lat, lng)) return null;

  const name = text(row.naziv) || text(row.name) || text(row.Naziv) || "Unnamed Montenegrin healthcare facility";
  if (/fond za zdravstveno osiguranje/i.test(name)) return null;

  const city = text(row.grad) || text(row.city) || text(row.opstina) || text(row.opština);
  const address = text(row.adresa) || text(row.address);
  const phone = text(row.telefon) || text(row.phone);
  const email = text(row.email);
  const website = text(row.website) || text(row.web) || text(row.sajt);
  const sourceRecordId = text(row.id) || text(row.ID) || text(row.sifra) || text(row.šifra);
  const classification = montenegroType(row);
  const id = sourceRecordId
    ? `me-health:${resourceKey}:${sourceRecordId}`
    : stableId("me-health", [name, city, address, lat, lng]);

  return {
    id,
    source_id: sourceRecordId || id,
    name,
    address: address || null,
    address_1: address || null,
    city: city || null,
    admin_area: null,
    state: null,
    postal_code: text(row.postanski_broj) || text(row.postal_code) || null,
    zip: text(row.postanski_broj) || text(row.postal_code) || null,
    country: "Montenegro",
    country_code: "ME",
    lat,
    lng,
    phone: phone || null,
    email: email || null,
    website: website || null,
    clinic_type: classification.primary,
    providerType: classification.primary,
    category: classification.label,
    services: [classification.label],
    categories: [classification.label],
    types: [classification.primary],
    registry_collection: resourceKey,
    hours: row.hours ?? row.radno_vrijeme ?? null,
    source: "me_ministry_health_facilities",
    data_source: "me_ministry_health_facilities",
    source_kind: "official_registry_live",
    trust_tier: "registry",
    confidence_score: 1,
    provider_layer_category: "montenegro-health-facilities",
  };
}

async function loadMontenegro(bounds: Bounds | null, limit: number, page: number): Promise<RegistryResult> {
  const payloads = await Promise.all(MONTENEGRO_RESOURCES.map(async (resource) => ({
    resource,
    payload: await fetchExternalJson<unknown>(
      `me-health-${resource.key}`,
      resource.url,
      { headers: { accept: "application/json" } },
    ),
  })));

  const deduped = new Map<string, Record<string, unknown>>();
  for (const { resource, payload } of payloads) {
    for (const row of rowsFromPayload(payload)) {
      const provider = normalizeMontenegro(row, resource.key);
      if (!provider) continue;
      const key = `${text(provider.name).toLowerCase()}|${Number(provider.lat).toFixed(5)}|${Number(provider.lng).toFixed(5)}`;
      const previous = deduped.get(key);
      if (!previous) {
        deduped.set(key, provider);
        continue;
      }
      deduped.set(key, {
        ...previous,
        address: previous.address || provider.address,
        address_1: previous.address_1 || provider.address_1,
        city: previous.city || provider.city,
        phone: previous.phone || provider.phone,
        email: previous.email || provider.email,
        website: previous.website || provider.website,
      });
    }
  }

  const matching = [...deduped.values()]
    .filter((provider) => inBounds(Number(provider.lat), Number(provider.lng), bounds))
    .sort((a, b) => text(a.name).localeCompare(text(b.name)));
  return pageResult(matching, limit, page);
}

async function sendRegistry(
  req: Request,
  res: Response,
  source: string,
  loader: (bounds: Bounds | null, limit: number, page: number) => Promise<RegistryResult>,
) {
  const bounds = parseBounds(req);
  const limit = Math.min(Math.max(Number(req.query.limit) || 1000, 1), MAX_PAGE_SIZE);
  const page = Math.max(Number(req.query.page) || 1, 1);

  try {
    const { providers, total } = await loader(bounds, limit, page);
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
    const warning = error instanceof Error ? error.message : `${source} registry request failed`;
    console.error(`[EuropeLiveRegistryLayers] ${source} failed:`, error);
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
}

router.get("/international-registry-layers/wales-gp-main-sites", async (req, res) => {
  await sendRegistry(req, res, "wales-gp-main-sites", loadWales);
});

router.get("/international-registry-layers/montenegro-health-facilities", async (req, res) => {
  await sendRegistry(req, res, "montenegro-health-facilities", loadMontenegro);
});

export default router;

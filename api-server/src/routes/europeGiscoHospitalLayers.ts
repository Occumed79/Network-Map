import { createHash } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { fetchExternalJson } from "../providerSources/externalSourceRuntime";

const router = Router();
const MAX_PAGE_SIZE = 5000;
const GISCO_BASE_URL = "https://gisco-services.ec.europa.eu/pub/healthcare/2023/geojson";
const SPAIN_HOSPITAL_CSV = "https://www.sanidad.gob.es/ciudadanos/centros.do?6578706f7274=1&accion=Consultar&botonHospitales=2&comunidad=&d-4015021-e=1&dependenciaFuncional=&dependenciaTipoCentro=&finalidadAsistencial=&nombreHosp=&provincia=";
const SPAIN_CATALOG_PAGE = "https://www.sanidad.gob.es/ciudadanos/centrosCA.do";

type Bounds = { north: number; south: number; east: number; west: number };
type GeoJsonFeature = {
  id?: string | number;
  geometry?: { type?: string; coordinates?: unknown[] };
  properties?: Record<string, unknown>;
};
type GeoJsonCollection = { type?: string; features?: GeoJsonFeature[] };
type SpainCatalogEntry = {
  code: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  dependency: string;
  purpose: string;
  raw: Record<string, string>;
};
type SpainCatalogIndex = {
  byNamePostal: Map<string, SpainCatalogEntry>;
  byNameCity: Map<string, SpainCatalogEntry>;
  uniqueByName: Map<string, SpainCatalogEntry>;
};

type GiscoCountry = {
  slug: string;
  giscoCode: string;
  isoCode: string;
  name: string;
};

const COUNTRIES: readonly GiscoCountry[] = [
  { slug: "albania", giscoCode: "AL", isoCode: "AL", name: "Albania" },
  { slug: "austria", giscoCode: "AT", isoCode: "AT", name: "Austria" },
  { slug: "belgium", giscoCode: "BE", isoCode: "BE", name: "Belgium" },
  { slug: "bulgaria", giscoCode: "BG", isoCode: "BG", name: "Bulgaria" },
  { slug: "switzerland", giscoCode: "CH", isoCode: "CH", name: "Switzerland" },
  { slug: "denmark", giscoCode: "DK", isoCode: "DK", name: "Denmark" },
  { slug: "estonia", giscoCode: "EE", isoCode: "EE", name: "Estonia" },
  { slug: "greece", giscoCode: "EL", isoCode: "GR", name: "Greece" },
  { slug: "spain", giscoCode: "ES", isoCode: "ES", name: "Spain" },
  { slug: "hungary", giscoCode: "HU", isoCode: "HU", name: "Hungary" },
  { slug: "italy", giscoCode: "IT", isoCode: "IT", name: "Italy" },
  { slug: "luxembourg", giscoCode: "LU", isoCode: "LU", name: "Luxembourg" },
  { slug: "malta", giscoCode: "MT", isoCode: "MT", name: "Malta" },
  { slug: "netherlands", giscoCode: "NL", isoCode: "NL", name: "Netherlands" },
  { slug: "norway", giscoCode: "NO", isoCode: "NO", name: "Norway" },
  { slug: "poland", giscoCode: "PL", isoCode: "PL", name: "Poland" },
  { slug: "portugal", giscoCode: "PT", isoCode: "PT", name: "Portugal" },
  { slug: "romania", giscoCode: "RO", isoCode: "RO", name: "Romania" },
  { slug: "serbia", giscoCode: "RS", isoCode: "RS", name: "Serbia" },
  { slug: "sweden", giscoCode: "SE", isoCode: "SE", name: "Sweden" },
  { slug: "slovenia", giscoCode: "SI", isoCode: "SI", name: "Slovenia" },
  { slug: "slovakia", giscoCode: "SK", isoCode: "SK", name: "Slovakia" },
] as const;

const COUNTRY_BY_SLUG = new Map(COUNTRIES.map((country) => [country.slug, country]));
let spainCatalogCache: { expiresAt: number; value: SpainCatalogIndex } | null = null;

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(text(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function lookupText(value: unknown): string {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/\b(hospital|hosp\.?|clinica|clínica|centro|universitario|universitaria|general|de|del|la|el)\b/giu, " ")
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function headerKey(value: unknown): string {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
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

function stableId(country: GiscoCountry, feature: GeoJsonFeature, lat: number, lng: number): string {
  const row = feature.properties || {};
  const nativeId = text(row.id) || text(feature.id);
  if (nativeId) return `eu-gisco-hospital:${country.giscoCode}:${nativeId}`;
  const digest = createHash("sha1")
    .update([row.hospital_name, row.site_name, row.address, row.city, lat, lng].map((value) => String(value ?? "")).join("|"))
    .digest("hex")
    .slice(0, 20);
  return `eu-gisco-hospital:${country.giscoCode}:${digest}`;
}

function normalize(feature: GeoJsonFeature, country: GiscoCountry): Record<string, unknown> | null {
  const row = feature.properties || {};
  const coordinates = Array.isArray(feature.geometry?.coordinates) ? feature.geometry?.coordinates : [];
  const lat = numberValue(row.lat) ?? numberValue(coordinates?.[1]);
  const lng = numberValue(row.lon) ?? numberValue(row.lng) ?? numberValue(coordinates?.[0]);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) return null;

  const hospitalName = text(row.hospital_name);
  const siteName = text(row.site_name);
  const name = siteName && hospitalName && siteName.toLowerCase() !== hospitalName.toLowerCase()
    ? `${hospitalName} — ${siteName}`
    : hospitalName || siteName || "Unnamed hospital";
  const street = [text(row.street), text(row.house_number)].filter(Boolean).join(" ");
  const address = text(row.address) || street;
  const facilityType = text(row.facility_type) || "hospital";
  const specialties = text(row.list_specs)
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);
  const services = [facilityType, ...specialties].filter(Boolean);
  const id = stableId(country, feature, lat, lng);
  const geoQuality = numberValue(row.geo_qual);

  return {
    id,
    source_id: text(row.id) || text(feature.id) || id,
    name,
    address: address || null,
    address_1: address || null,
    city: text(row.city) || null,
    admin_area: null,
    state: null,
    postal_code: text(row.postcode) || null,
    zip: text(row.postcode) || null,
    country: country.name,
    country_code: country.isoCode,
    lat,
    lng,
    phone: text(row.tel) || null,
    email: text(row.email) || null,
    website: text(row.url) || null,
    clinic_type: "hospital",
    providerType: "hospital",
    category: facilityType,
    services: services.length ? services : ["hospital"],
    categories: [facilityType],
    types: ["hospital"],
    emergency: text(row.emergency) || null,
    public_private: text(row.public_private) || null,
    beds: numberValue(row.cap_beds),
    practitioners: numberValue(row.cap_prac),
    rooms: numberValue(row.cap_rooms),
    specialties,
    reference_date: text(row.ref_date) || null,
    publication_date: text(row.pub_date) || null,
    geolocation_quality: geoQuality,
    comments: text(row.comments) || null,
    source: `eu_gisco_hospitals_${country.giscoCode.toLowerCase()}`,
    data_source: `eu_gisco_hospitals_${country.giscoCode.toLowerCase()}`,
    source_kind: "official_registry_harmonized",
    source_authority: "Eurostat GISCO — Member State official register",
    trust_tier: "registry",
    confidence_score: geoQuality === 4 ? 1 : geoQuality === 1 ? 0.98 : geoQuality === 2 ? 0.92 : geoQuality === 3 ? 0.82 : 0.9,
    provider_layer_category: `gisco-hospitals-${country.slug}`,
  };
}

function detectDelimiter(raw: string): string {
  const line = raw.replace(/^\uFEFF/u, "").split(/\r?\n/u).find((value) => value.trim()) || "";
  return [";", ",", "\t"].sort((a, b) => line.split(b).length - line.split(a).length)[0];
}

function parseDelimited(raw: string): string[][] {
  const delimiter = detectDelimiter(raw);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  raw = raw.replace(/^\uFEFF/u, "");
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (quoted) {
      if (char === '"') {
        if (raw[index + 1] === '"') { field += '"'; index += 1; }
        else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/u, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/u, "")); rows.push(row); }
  return rows;
}

function catalogField(row: Record<string, string>, exact: string[], contains: string[]): string {
  for (const candidate of exact) {
    const value = text(row[headerKey(candidate)]);
    if (value) return value;
  }
  for (const [key, value] of Object.entries(row)) {
    if (contains.some((candidate) => key.includes(candidate)) && text(value)) return text(value);
  }
  return "";
}

function parseSpainCatalog(raw: string): SpainCatalogEntry[] {
  const rows = parseDelimited(raw);
  const headerIndex = rows.slice(0, 20).map((row, index) => {
    const keys = row.map(headerKey);
    const score = ["nombre", "hospital", "provincia", "municipio", "direccion", "codigo"].reduce((sum, signal) => sum + (keys.some((key) => key.includes(signal)) ? 1 : 0), 0);
    return { index, score, populated: keys.filter(Boolean).length };
  }).filter((entry) => entry.populated >= 3).sort((a, b) => b.score - a.score || b.populated - a.populated)[0];
  if (!headerIndex || headerIndex.score < 2) throw new Error("Spain Ministry hospital CSV header could not be identified");
  const headers = rows[headerIndex.index].map((value, index) => headerKey(value) || `column ${index}`);
  return rows.slice(headerIndex.index + 1)
    .filter((row) => row.some((value) => text(value)))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])))
    .map((row) => ({
      code: catalogField(row, ["codigo cnh", "codigo", "cod cnh"], ["codigo", "cod cnh"]),
      name: catalogField(row, ["nombre del hospital", "nombre hospital", "nombre del centro", "nombre"], ["nombre hospital", "nombre centro", "denominacion"]),
      address: catalogField(row, ["direccion", "domicilio"], ["direccion", "domicilio"]),
      city: catalogField(row, ["municipio", "localidad"], ["municipio", "localidad"]),
      province: catalogField(row, ["provincia"], ["provincia"]),
      postalCode: catalogField(row, ["codigo postal", "cp"], ["codigo postal", "postal"]),
      dependency: catalogField(row, ["dependencia funcional", "dependencia"], ["dependencia funcional", "dependencia"]),
      purpose: catalogField(row, ["finalidad asistencial", "finalidad"], ["finalidad asistencial", "finalidad"]),
      raw: row,
    }))
    .filter((entry) => Boolean(entry.name));
}

function catalogKey(name: string, place: string): string {
  return `${lookupText(name)}|${lookupText(place)}`;
}

async function loadSpainCatalog(): Promise<SpainCatalogIndex> {
  if (spainCatalogCache && spainCatalogCache.expiresAt > Date.now()) return spainCatalogCache.value;
  const response = await fetch(SPAIN_HOSPITAL_CSV, {
    headers: {
      accept: "text/csv,*/*",
      referer: SPAIN_CATALOG_PAGE,
      "user-agent": "Occu-Med-Network-Map/1.0 (+https://github.com/Occumed79/Network-Map)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Spain Ministry hospital catalog HTTP ${response.status}`);
  const entries = parseSpainCatalog(await response.text());
  const byNamePostal = new Map<string, SpainCatalogEntry>();
  const byNameCity = new Map<string, SpainCatalogEntry>();
  const counts = new Map<string, number>();
  const candidates = new Map<string, SpainCatalogEntry>();
  for (const entry of entries) {
    const name = lookupText(entry.name);
    if (!name) continue;
    if (entry.postalCode) byNamePostal.set(catalogKey(entry.name, entry.postalCode), entry);
    if (entry.city) byNameCity.set(catalogKey(entry.name, entry.city), entry);
    counts.set(name, (counts.get(name) || 0) + 1);
    candidates.set(name, entry);
  }
  const uniqueByName = new Map<string, SpainCatalogEntry>();
  for (const [name, entry] of candidates) if (counts.get(name) === 1) uniqueByName.set(name, entry);
  const value = { byNamePostal, byNameCity, uniqueByName };
  spainCatalogCache = { expiresAt: Date.now() + 6 * 60 * 60_000, value };
  return value;
}

function findSpainCatalogEntry(provider: Record<string, unknown>, index: SpainCatalogIndex): SpainCatalogEntry | null {
  const names = [text(provider.name), text(provider.name).split(" — ")[0]].filter(Boolean);
  const postal = text(provider.postal_code);
  const city = text(provider.city);
  for (const name of names) {
    if (postal) {
      const match = index.byNamePostal.get(catalogKey(name, postal));
      if (match) return match;
    }
    if (city) {
      const match = index.byNameCity.get(catalogKey(name, city));
      if (match) return match;
    }
  }
  for (const name of names) {
    const match = index.uniqueByName.get(lookupText(name));
    if (match) return match;
  }
  return null;
}

async function enrichSpain(providers: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
  try {
    const index = await loadSpainCatalog();
    return providers.map((provider) => {
      const match = findSpainCatalogEntry(provider, index);
      if (!match) return provider;
      const services = Array.isArray(provider.services) ? provider.services.map(String) : ["hospital"];
      if (match.purpose && !services.includes(match.purpose)) services.push(match.purpose);
      return {
        ...provider,
        address: provider.address || match.address || null,
        address_1: provider.address_1 || match.address || null,
        city: provider.city || match.city || null,
        admin_area: match.province || provider.admin_area || null,
        state: match.province || provider.state || null,
        postal_code: provider.postal_code || match.postalCode || null,
        zip: provider.zip || match.postalCode || null,
        services,
        national_registry_id: match.code || null,
        ministry_catalog_name: match.name,
        ministry_dependency: match.dependency || null,
        ministry_purpose: match.purpose || null,
        ministry_catalog_source: SPAIN_CATALOG_PAGE,
        source_authority: "Spain Ministry of Health National Hospital Catalogue + Eurostat GISCO",
        registry_enriched: true,
      };
    });
  } catch (error) {
    console.warn("[EuropeGiscoHospitalLayers] Spain Ministry enrichment unavailable:", error instanceof Error ? error.message : String(error));
    return providers;
  }
}

async function loadCountry(country: GiscoCountry): Promise<Record<string, unknown>[]> {
  const payload = await fetchExternalJson<GeoJsonCollection>(
    `eu-gisco-hospitals-${country.giscoCode.toLowerCase()}`,
    `${GISCO_BASE_URL}/${country.giscoCode}.geojson`,
    { headers: { accept: "application/geo+json, application/json" } },
    {
      validate: (value): value is GeoJsonCollection => Boolean(
        value && typeof value === "object" && Array.isArray((value as GeoJsonCollection).features),
      ),
    },
  );
  const providers = (payload.features || [])
    .map((feature) => normalize(feature, country))
    .filter((provider): provider is Record<string, unknown> => Boolean(provider));
  return country.slug === "spain" ? enrichSpain(providers) : providers;
}

router.get("/international-registry-layers/gisco-hospitals-:country", async (req: Request, res: Response) => {
  const countryParam = Array.isArray(req.params.country) ? req.params.country[0] : req.params.country;
  const country = COUNTRY_BY_SLUG.get(String(countryParam || "").toLowerCase());
  if (!country) {
    res.status(400).json({
      error: `Unknown GISCO hospital country: ${countryParam || ""}`,
      countries: COUNTRIES.map((entry) => entry.slug),
    });
    return;
  }

  const bounds = parseBounds(req);
  const limit = Math.min(Math.max(Number(req.query.limit) || 2000, 1), MAX_PAGE_SIZE);
  const page = Math.max(Number(req.query.page) || 1, 1);

  try {
    const allProviders = await loadCountry(country);
    const matching = allProviders.filter((provider) => inBounds(Number(provider.lat), Number(provider.lng), bounds));
    const offset = (page - 1) * limit;
    const providers = matching.slice(offset, offset + limit);
    const total = matching.length;
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=21600");
    res.json({
      providers,
      count: providers.length,
      loaded: providers.length,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      source: `gisco-hospitals-${country.slug}`,
      officialRegistry: true,
      harmonizedBy: "Eurostat GISCO",
      ...(country.slug === "spain" ? { enrichedBy: "Spain Ministry of Health National Hospital Catalogue" } : {}),
      live: true,
      visibleCapped: false,
    });
  } catch (error) {
    const warning = error instanceof Error ? error.message : `${country.name} GISCO hospital request failed`;
    console.error(`[EuropeGiscoHospitalLayers] ${country.name} failed:`, error);
    res.status(503).json({
      providers: [], count: 0, loaded: 0, total: 0, page, limit, hasMore: false,
      source: `gisco-hospitals-${country.slug}`,
      officialRegistry: true,
      harmonizedBy: "Eurostat GISCO",
      live: true,
      warning,
      transientFailure: true,
      visibleCapped: false,
    });
  }
});

export default router;

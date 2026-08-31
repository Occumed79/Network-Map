import { createHash } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { fetchExternalJson } from "../providerSources/externalSourceRuntime";

const router = Router();
const MAX_PAGE_SIZE = 5000;
const GISCO_BASE_URL = "https://gisco-services.ec.europa.eu/pub/healthcare/2023/geojson";

type Bounds = { north: number; south: number; east: number; west: number };
type GeoJsonFeature = {
  id?: string | number;
  geometry?: { type?: string; coordinates?: unknown[] };
  properties?: Record<string, unknown>;
};
type GeoJsonCollection = { type?: string; features?: GeoJsonFeature[] };

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
  return (payload.features || [])
    .map((feature) => normalize(feature, country))
    .filter((provider): provider is Record<string, unknown> => Boolean(provider));
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

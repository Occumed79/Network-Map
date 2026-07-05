import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { getPool } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { detectProviderSchema, type ProviderSchema } from "../lib/providerSchema";
import { queryWithStatementTimeout } from "../lib/queryWithStatementTimeout";
import { classifyProvider } from "../lib/providerClassifier";

const router = Router();

type Mode = "records" | "pins" | "density" | "hex" | "facets" | "live" | "compare";
type SourceKind = "stored" | "live" | "saved" | "candidate";
type SpatialEngine = "postgis" | "numeric-fallback";

type ProviderFeature = {
  id: string; source: string; source_kind: SourceKind; name: string; normalized_name: string | null; clinic_type: string;
  services: string[]; categories: string[]; address: string | null; city: string | null; admin_area: string | null; country: string | null;
  postal_code: string | null; lat: number | null; lng: number | null; phone: string | null; website: string | null; source_url: string | null;
  confidence_score: number | null; trust_tier: string; last_seen: string | null; imported_at: string | null; raw_source_data?: unknown;
  status?: string | null; match_reason?: string | null; distance_miles?: number | null;
};

type Bounds = { north: number; south: number; east: number; west: number };
type QueryContext = {
  source?: string; sourceKind?: string; q?: string; country?: string; adminArea?: string; city?: string; postalCode?: string;
  clinicType?: string; service?: string; bounds?: Bounds; lat?: number; lng?: number; radiusMiles?: number;
  includeLive: boolean; includeStored: boolean; includeSaved: boolean; includeCandidates: boolean;
};

type CandidatePayload = Partial<ProviderFeature> & { provider?: Partial<ProviderFeature>; notes?: string; status?: string };

type OverpassElement = { id: number; lat?: number; lon?: number; center?: { lat?: number; lon?: number }; tags?: Record<string, string> };

const SOURCE_LABELS: Record<string, string> = { bluehive: "BlueHive", dentists: "Dentist Dataset", indexed: "indexed", "my-clinics": "My Clinics", saved: "My Clinics" };
const MAX_RECORD_LIMIT = 100;
const MAX_PIN_LIMIT = 5000;
const MAX_LIVE_RADIUS_MILES = 50;
const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const OVERPASS_CACHE_MS = 5 * 60 * 1000;
const liveCache = new Map<string, { expires: number; providers: ProviderFeature[]; warning?: string }>();

let persistenceReady: Promise<{ spatialEngine: SpatialEngine; candidatePersistence: boolean; savedPersistence: boolean }> | null = null;

function asString(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function asBool(value: unknown, fallback: boolean): boolean { if (value === undefined) return fallback; return value === true || value === "true" || value === "1"; }
function asNumber(value: unknown): number | undefined { const n = Number(value); return Number.isFinite(n) ? n : undefined; }
function addParam(params: unknown[], value: unknown): string { params.push(value); return `$${params.length}`; }
function milesToDegrees(miles: number): number { return miles / 69; }
function normalizeName(value: unknown): string { return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function sourceKindFor(label: string | null): SourceKind { return (label || "").toLowerCase() === "my clinics" ? "saved" : "stored"; }
function canonicalSource(source?: string): string | undefined { if (!source || source === "all") return undefined; return source === "myClinics" ? "my-clinics" : source; }
function toTextArray(value: unknown): string[] { return Array.isArray(value) ? value.map(String).filter(Boolean) : typeof value === "string" && value ? [value] : []; }
function nowIso(): string { return new Date().toISOString(); }

function parseQuery(req: Request): QueryContext {
  const source = canonicalSource(asString(req.query.source));
  const sourceKind = asString(req.query.source_kind);
  const north = asNumber(req.query.north), south = asNumber(req.query.south), east = asNumber(req.query.east), west = asNumber(req.query.west);
  return {
    source,
    sourceKind,
    q: asString(req.query.q),
    country: asString(req.query.country),
    adminArea: asString(req.query.admin_area),
    city: asString(req.query.city),
    postalCode: asString(req.query.postal_code),
    clinicType: asString(req.query.clinicType),
    service: asString(req.query.service) || asString(req.query.category),
    bounds: [north, south, east, west].every((v) => v !== undefined) ? { north: north!, south: south!, east: east!, west: west! } : undefined,
    lat: asNumber(req.query.lat),
    lng: asNumber(req.query.lng),
    radiusMiles: asNumber(req.query.radiusMiles),
    includeLive: asBool(req.query.includeLive, false),
    includeStored: asBool(req.query.includeStored, true),
    includeSaved: asBool(req.query.includeSaved, true),
    includeCandidates: asBool(req.query.includeCandidates, true),
  };
}

async function ensureProviderExplorerPersistence(pool: ReturnType<typeof getPool>) {
  if (persistenceReady) return persistenceReady;
  persistenceReady = (async () => {
    let spatialEngine: SpatialEngine = "numeric-fallback";
    try { await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto"); } catch {}
    try { await pool.query("CREATE EXTENSION IF NOT EXISTS postgis"); } catch {}
    try {
      const postgis = await pool.query("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname='postgis') AS ok");
      spatialEngine = postgis.rows[0]?.ok ? "postgis" : "numeric-fallback";
    } catch {}
    await pool.query(`
      CREATE TABLE IF NOT EXISTS provider_candidates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_kind text NOT NULL DEFAULT 'candidate',
        source_label text NOT NULL DEFAULT 'Live discovery',
        name text NOT NULL,
        normalized_name text,
        clinic_type text DEFAULT 'unknown',
        services text[] DEFAULT ARRAY[]::text[],
        categories text[] DEFAULT ARRAY[]::text[],
        address text,
        city text,
        admin_area text,
        country text,
        postal_code text,
        lat double precision,
        lng double precision,
        phone text,
        website text,
        source_url text,
        confidence_score numeric,
        trust_tier text DEFAULT 'lead',
        status text NOT NULL DEFAULT 'candidate',
        notes text,
        raw_source_data jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        saved_at timestamptz,
        dismissed_at timestamptz,
        last_seen timestamptz
      )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_provider_candidates_status ON provider_candidates (status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_provider_candidates_source_kind ON provider_candidates (source_kind)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_provider_candidates_country_admin_city ON provider_candidates (country, admin_area, city)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_provider_candidates_lat_lng ON provider_candidates (lat, lng)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_provider_candidates_normalized_name ON provider_candidates (normalized_name)`);
    if (spatialEngine === "postgis") {
      await pool.query(`ALTER TABLE provider_candidates ADD COLUMN IF NOT EXISTS geog geography(Point,4326)`);
      await pool.query(`UPDATE provider_candidates SET geog = ST_SetSRID(ST_MakePoint(lng, lat),4326)::geography WHERE geog IS NULL AND lat IS NOT NULL AND lng IS NOT NULL`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_provider_candidates_geog ON provider_candidates USING GIST (geog)`);
      try { await pool.query(`CREATE INDEX IF NOT EXISTS idx_provider_locations_geog_expr ON provider_locations USING GIST ((ST_SetSRID(ST_MakePoint(lng, lat),4326)::geography)) WHERE lat IS NOT NULL AND lng IS NOT NULL`); } catch {}
      try { await pool.query(`CREATE INDEX IF NOT EXISTS idx_medical_providers_geog_expr ON medical_providers USING GIST ((ST_SetSRID(ST_MakePoint(lng, lat),4326)::geography)) WHERE lat IS NOT NULL AND lng IS NOT NULL`); } catch {}
    }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS provider_outreach_targets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_candidate_id uuid REFERENCES provider_candidates(id) ON DELETE SET NULL,
        provider_source_id text,
        source_kind text,
        source_label text,
        name text NOT NULL,
        status text NOT NULL DEFAULT 'outreach_target',
        notes text,
        raw_source_data jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_provider_outreach_status ON provider_outreach_targets (status)`);
    return { spatialEngine, candidatePersistence: true, savedPersistence: true };
  })();
  return persistenceReady;
}

function storedExpressions(schema: ProviderSchema) {
  return {
    lat: schema === "normalized" ? "pl.lat" : "mp.lat",
    lng: schema === "normalized" ? "pl.lng" : "mp.lng",
    city: schema === "normalized" ? "pl.city" : "mp.locality",
    admin: schema === "normalized" ? "pl.state" : "mp.administrative_area_level_1",
    postal: schema === "normalized" ? "pl.postal_code" : "mp.postal_code",
    name: schema === "normalized" ? "p.name" : "mp.name",
    source: schema === "normalized" ? "psrc.source_label" : "mp.data_source",
    country: schema === "normalized" ? "psrc.raw_data->>'country'" : "COALESCE(mp.country_code, mp.raw_data->>'country')",
    service: schema === "normalized" ? "COALESCE(svc.services_text, '')" : "COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')",
    geog: schema === "normalized" ? "ST_SetSRID(ST_MakePoint(pl.lng, pl.lat),4326)::geography" : "ST_SetSRID(ST_MakePoint(mp.lng, mp.lat),4326)::geography",
  };
}

function baseSql(schema: ProviderSchema) {
  if (schema === "legacy") return `FROM public.medical_providers mp WHERE`;
  return `FROM providers p INNER JOIN provider_locations pl ON pl.provider_id=p.id LEFT JOIN provider_contacts pc ON pc.provider_id=p.id LEFT JOIN LATERAL (SELECT array_agg(DISTINCT service_type) services, string_agg(DISTINCT COALESCE(service_type,'') || ' ' || COALESCE(taxonomy,''), ' ') services_text FROM provider_services WHERE provider_id=p.id) svc ON true INNER JOIN LATERAL (SELECT source_label, source_url, trust_tier, raw_data, fetched_at, created_at FROM provider_sources WHERE provider_id=p.id ORDER BY CASE WHEN source_label='My Clinics' THEN 0 ELSE 1 END, id ASC LIMIT 1) psrc ON true WHERE`;
}

function selectSql(schema: ProviderSchema) {
  if (schema === "legacy") return `SELECT mp.source_id::text AS id, mp.name, lower(regexp_replace(COALESCE(mp.name,''),'[^a-zA-Z0-9]+',' ','g')) normalized_name, mp.formatted_address AS address, mp.locality AS city, mp.administrative_area_level_1 AS admin_area, COALESCE(mp.country_code, mp.raw_data->>'country','US') AS country, mp.postal_code, mp.lat, mp.lng, mp.phone, mp.website, mp.data_source AS source, CASE WHEN lower(COALESCE(mp.data_source,''))='my clinics' THEN 'saved' ELSE 'stored' END source_kind, mp.source_url, mp.confidence_score, mp.category, mp.types AS services, mp.types AS categories, mp.raw_data AS raw_source_data, mp.created_at AS imported_at, mp.updated_at AS last_seen, 'directory' AS trust_tier, NULL::text status`;
  return `SELECT p.id::text AS id, p.name, lower(regexp_replace(COALESCE(p.name,''),'[^a-zA-Z0-9]+',' ','g')) normalized_name, pl.address, pl.city, pl.state AS admin_area, COALESCE(psrc.raw_data->>'country','US') AS country, pl.postal_code, pl.lat, pl.lng, pc.phone, pc.website, psrc.source_label AS source, CASE WHEN psrc.source_label='My Clinics' THEN 'saved' ELSE 'stored' END source_kind, psrc.source_url, NULL::numeric AS confidence_score, NULL::text AS category, svc.services, svc.services AS categories, psrc.raw_data AS raw_source_data, psrc.created_at AS imported_at, psrc.fetched_at AS last_seen, psrc.trust_tier, NULL::text status`;
}

function addSharedFilters(where: string[], params: unknown[], ctx: QueryContext, expr: {name:string; city:string; admin:string; postal:string; country:string; service:string; lat:string; lng:string; geog?:string}, spatialEngine: SpatialEngine) {
  if (ctx.country) where.push(`LOWER(COALESCE(${expr.country}, 'US')) = LOWER(${addParam(params, ctx.country)})`);
  if (ctx.adminArea) where.push(`LOWER(${expr.admin}) = LOWER(${addParam(params, ctx.adminArea)})`);
  if (ctx.city) where.push(`LOWER(${expr.city}) = LOWER(${addParam(params, ctx.city)})`);
  if (ctx.postalCode) where.push(`${expr.postal} ILIKE ${addParam(params, `${ctx.postalCode}%`)}`);
  if (ctx.service) where.push(`${expr.service} ILIKE ${addParam(params, `%${ctx.service}%`)}`);
  if (ctx.clinicType) where.push(`${expr.service} ILIKE ${addParam(params, `%${ctx.clinicType}%`)}`);
  if (ctx.q) where.push(`(${expr.name} ILIKE ${addParam(params, `%${ctx.q}%`)} OR ${expr.city} ILIKE ${addParam(params, `%${ctx.q}%`)} OR ${expr.service} ILIKE ${addParam(params, `%${ctx.q}%`)})`);
  if (ctx.bounds) {
    where.push(`${expr.lat} BETWEEN ${addParam(params, ctx.bounds.south)} AND ${addParam(params, ctx.bounds.north)}`);
    where.push(ctx.bounds.west <= ctx.bounds.east ? `${expr.lng} BETWEEN ${addParam(params, ctx.bounds.west)} AND ${addParam(params, ctx.bounds.east)}` : `(${expr.lng} >= ${addParam(params, ctx.bounds.west)} OR ${expr.lng} <= ${addParam(params, ctx.bounds.east)})`);
  }
  if (ctx.lat !== undefined && ctx.lng !== undefined && ctx.radiusMiles !== undefined) {
    if (spatialEngine === "postgis" && expr.geog) {
      where.push(`ST_DWithin(${expr.geog}, ST_SetSRID(ST_MakePoint(${addParam(params, ctx.lng)}, ${addParam(params, ctx.lat)}),4326)::geography, ${addParam(params, ctx.radiusMiles * 1609.344)})`);
    } else {
      const d = milesToDegrees(ctx.radiusMiles);
      where.push(`${expr.lat} BETWEEN ${addParam(params, ctx.lat - d)} AND ${addParam(params, ctx.lat + d)}`);
      where.push(`${expr.lng} BETWEEN ${addParam(params, ctx.lng - d)} AND ${addParam(params, ctx.lng + d)}`);
      where.push(`(3959 * acos(least(1, greatest(-1, cos(radians(${addParam(params, ctx.lat)})) * cos(radians(${expr.lat})) * cos(radians(${expr.lng}) - radians(${addParam(params, ctx.lng)})) + sin(radians(${addParam(params, ctx.lat)})) * sin(radians(${expr.lat})))))) <= ${addParam(params, ctx.radiusMiles)}`);
    }
  }
}

export function buildStoredWhereForTest(ctx: QueryContext, schema: ProviderSchema = "legacy", spatialEngine: SpatialEngine = "numeric-fallback") {
  const params: unknown[] = [];
  const where = buildStoredWhere(ctx, schema, params, spatialEngine);
  return { where: where.join(" AND "), params };
}

function buildStoredWhere(ctx: QueryContext, schema: ProviderSchema, params: unknown[], spatialEngine: SpatialEngine) {
  const e = storedExpressions(schema);
  const sourceTextExpr = `LOWER(COALESCE(${e.source}, ''))`;
  const where = [`${e.lat} IS NOT NULL`, `${e.lng} IS NOT NULL`, `${e.lat} BETWEEN -90 AND 90`, `${e.lng} BETWEEN -180 AND 180`, `(${e.lat} <> 0 OR ${e.lng} <> 0)`];
  if (!ctx.includeStored && !ctx.includeSaved) where.push("FALSE");
  if (ctx.source === "live" || ctx.source === "candidates") where.push("FALSE");
  if (ctx.source && ctx.source !== "live" && ctx.source !== "candidates") {
    if (ctx.source === "indexed") where.push(`${sourceTextExpr} NOT IN ('bluehive','dentist dataset','my clinics')`);
    else where.push(`${sourceTextExpr} = LOWER(${addParam(params, SOURCE_LABELS[ctx.source] || ctx.source)})`);
  }
  if (ctx.sourceKind && ctx.sourceKind !== "all") {
    if (ctx.sourceKind === "saved") where.push(`${sourceTextExpr} = 'my clinics'`);
    else if (ctx.sourceKind === "stored") where.push(`${sourceTextExpr} <> 'my clinics'`);
    else where.push("FALSE");
  }
  addSharedFilters(where, params, ctx, { ...e, geog: e.geog }, spatialEngine);
  return where;
}

function buildCandidateWhere(ctx: QueryContext, params: unknown[], spatialEngine: SpatialEngine) {
  const where = [`lat IS NOT NULL`, `lng IS NOT NULL`, `lat BETWEEN -90 AND 90`, `lng BETWEEN -180 AND 180`, `(lat <> 0 OR lng <> 0)`];
  if (ctx.source && !["saved", "candidates", "all"].includes(ctx.source)) where.push("FALSE");
  if (ctx.source === "saved") where.push(`status = 'saved'`);
  if (ctx.source === "candidates") where.push(`status = 'candidate'`);
  if (ctx.sourceKind && ctx.sourceKind !== "all") {
    if (ctx.sourceKind === "saved") where.push(`status = 'saved'`);
    else if (ctx.sourceKind === "candidate") where.push(`status = 'candidate'`);
    else where.push("FALSE");
  }
  if (!ctx.includeSaved) where.push(`status <> 'saved'`);
  if (!ctx.includeCandidates) where.push(`status <> 'candidate'`);
  addSharedFilters(where, params, ctx, { name: "name", city: "city", admin: "admin_area", postal: "postal_code", country: "country", service: "COALESCE(array_to_string(services, ' '), '') || ' ' || COALESCE(array_to_string(categories, ' '), '') || ' ' || COALESCE(clinic_type, '')", lat: "lat", lng: "lng", geog: spatialEngine === "postgis" ? "geog" : undefined }, spatialEngine);
  return where;
}

function normalizeRows(rows: Array<Record<string, any>>): ProviderFeature[] {
  return rows.map((row) => {
    const services = toTextArray(row.services);
    const categories = toTextArray(row.categories?.length ? row.categories : row.services);
    const raw = row.raw_source_data || null;
    const clinicType = row.clinic_type || classifyProvider({ name: row.name, services, taxonomy_description: services.join(" "), raw_source_data: raw });
    const sourceKind = (row.source_kind || sourceKindFor(row.source)) as SourceKind;
    return {
      id: String(row.id), source: row.source || "indexed", source_kind: sourceKind, name: row.name || "Unnamed provider",
      normalized_name: row.normalized_name || normalizeName(row.name), clinic_type: clinicType, services, categories,
      address: row.address || null, city: row.city || null, admin_area: row.admin_area || null, country: row.country || (row.admin_area ? "US" : null), postal_code: row.postal_code || null,
      lat: row.lat == null ? null : Number(row.lat), lng: row.lng == null ? null : Number(row.lng), phone: row.phone || null,
      website: row.website || null, source_url: row.source_url || null, confidence_score: row.confidence_score == null ? null : Number(row.confidence_score),
      trust_tier: row.trust_tier || "lead", last_seen: row.last_seen || null, imported_at: row.imported_at || null, raw_source_data: raw,
      status: row.status || null,
    };
  });
}

function candidateSelectSql() {
  return `SELECT id::text, source_label AS source, source_kind, name, normalized_name, clinic_type, services, categories, address, city, admin_area, country, postal_code, lat, lng, phone, website, source_url, confidence_score, trust_tier, last_seen, created_at AS imported_at, raw_source_data, status FROM provider_candidates`;
}

async function queryStored(pool: ReturnType<typeof getPool>, schema: ProviderSchema, ctx: QueryContext, spatialEngine: SpatialEngine, mode: Mode, page: number, limit: number) {
  if (schema === "none" || (!ctx.includeStored && !ctx.includeSaved)) return { rows: [], total: 0 };
  const params: unknown[] = [];
  const where = buildStoredWhere(ctx, schema, params, spatialEngine).join(" AND ");
  const from = baseSql(schema);
  const count = await queryWithStatementTimeout(pool, `SELECT count(*)::int AS total ${from} ${where}`, params);
  const total = Number(count.rows[0]?.total || 0);
  params.push(limit, (page - 1) * limit);
  const rows = (await queryWithStatementTimeout(pool, `${selectSql(schema)} ${from} ${where} ORDER BY id ASC LIMIT $${params.length - 1} OFFSET $${params.length}`, params)).rows;
  return { rows, total };
}

async function queryCandidates(pool: ReturnType<typeof getPool>, ctx: QueryContext, spatialEngine: SpatialEngine, page: number, limit: number) {
  if (!ctx.includeSaved && !ctx.includeCandidates) return { rows: [], total: 0 };
  const params: unknown[] = [];
  const where = buildCandidateWhere(ctx, params, spatialEngine).join(" AND ");
  const count = await queryWithStatementTimeout(pool, `SELECT count(*)::int AS total FROM provider_candidates WHERE ${where}`, params);
  const total = Number(count.rows[0]?.total || 0);
  params.push(limit, (page - 1) * limit);
  const rows = (await queryWithStatementTimeout(pool, `${candidateSelectSql()} WHERE ${where} ORDER BY updated_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params)).rows;
  return { rows, total };
}

async function queryAggregates(pool: ReturnType<typeof getPool>, schema: ProviderSchema, ctx: QueryContext, spatialEngine: SpatialEngine, mode: "density" | "hex") {
  const precision = mode === "hex" ? 2 : 1;
  if (schema === "none") return { total: 0, cells: [] };
  const params: unknown[] = [];
  const e = storedExpressions(schema);
  const where = buildStoredWhere(ctx, schema, params, spatialEngine).join(" AND ");
  const from = baseSql(schema);
  const totalRows = await queryWithStatementTimeout(pool, `SELECT count(*)::int AS total ${from} ${where}`, params);
  const rows = (await queryWithStatementTimeout(pool, `SELECT round((${e.lat})::numeric, ${precision})::float lat, round((${e.lng})::numeric, ${precision})::float lng, count(*)::int count ${from} ${where} GROUP BY 1,2 ORDER BY count DESC LIMIT 2000`, params)).rows;
  return { total: Number(totalRows.rows[0]?.total || 0), cells: rows, precision };
}

async function queryFacets(pool: ReturnType<typeof getPool>, schema: ProviderSchema, ctx: QueryContext, spatialEngine: SpatialEngine) {
  if (schema === "none") return { total: 0, facets: [] };
  const params: unknown[] = [];
  const where = buildStoredWhere(ctx, schema, params, spatialEngine).join(" AND ");
  const from = baseSql(schema);
  const count = await queryWithStatementTimeout(pool, `SELECT count(*)::int AS total ${from} ${where}`, params);
  const serviceFacetExpr = "unnest(COALESCE(x.services::text[], ARRAY[]::text[]))";
  const facetSql = `SELECT source, source_kind, country, admin_area, city, clinic_type, service, count(*)::int count FROM (SELECT x.source, x.source_kind, x.country, x.admin_area, x.city, 'unknown' clinic_type, NULL::text service FROM (${selectSql(schema)} ${from} ${where}) x UNION ALL SELECT NULL::text source, NULL::text source_kind, NULL::text country, NULL::text admin_area, NULL::text city, NULL::text clinic_type, ${serviceFacetExpr} service FROM (${selectSql(schema)} ${from} ${where}) x) f GROUP BY GROUPING SETS ((source),(source_kind),(country),(admin_area),(city),(clinic_type),(service)) HAVING count(*) > 0`;
  const rows = (await queryWithStatementTimeout(pool, facetSql, params)).rows;
  return { total: Number(count.rows[0]?.total || 0), facets: rows };
}

function overpassTagsFor(ctx: QueryContext) {
  const text = `${ctx.clinicType || ""} ${ctx.service || ""} ${ctx.q || ""}`.toLowerCase();
  if (/dent/i.test(text)) return [`["amenity"="dentist"]`];
  if (/pharmacy|vaccin|travel/i.test(text)) return [`["amenity"="pharmacy"]`];
  if (/hospital/i.test(text)) return [`["amenity"="hospital"]`];
  return [`["amenity"="clinic"]`, `["amenity"="doctors"]`, `["healthcare"]`, `["amenity"="hospital"]`];
}

function overpassQuery(ctx: QueryContext): string | null {
  if (ctx.lat !== undefined && ctx.lng !== undefined && ctx.radiusMiles !== undefined) {
    const radius = Math.min(ctx.radiusMiles, MAX_LIVE_RADIUS_MILES) * 1609.344;
    const selectors = overpassTagsFor(ctx).map(tag => `node${tag}(around:${Math.round(radius)},${ctx.lat},${ctx.lng});way${tag}(around:${Math.round(radius)},${ctx.lat},${ctx.lng});relation${tag}(around:${Math.round(radius)},${ctx.lat},${ctx.lng});`).join("\n");
    return `[out:json][timeout:20];(${selectors});out center tags 100;`;
  }
  if (ctx.bounds) {
    const { south, west, north, east } = ctx.bounds;
    const selectors = overpassTagsFor(ctx).map(tag => `node${tag}(${south},${west},${north},${east});way${tag}(${south},${west},${north},${east});relation${tag}(${south},${west},${north},${east});`).join("\n");
    return `[out:json][timeout:20];(${selectors});out center tags 200;`;
  }
  return null;
}

function normalizeOverpass(elements: OverpassElement[]): ProviderFeature[] {
  return elements.map((el) => {
    const tags = el.tags || {};
    const lat = el.lat ?? el.center?.lat ?? null;
    const lng = el.lon ?? el.center?.lon ?? null;
    const services = [tags.amenity, tags.healthcare, tags.speciality, tags["healthcare:speciality"]].filter(Boolean) as string[];
    const raw = { osm_id: el.id, tags };
    return {
      id: `osm-${el.id}`, source: "OSM/Overpass", source_kind: "live", name: tags.name || tags.operator || "Unnamed live provider",
      normalized_name: normalizeName(tags.name || tags.operator), clinic_type: classifyProvider({ name: tags.name, services, raw_source_data: raw }), services, categories: services,
      address: [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ") || null, city: tags["addr:city"] || null, admin_area: tags["addr:state"] || null, country: tags["addr:country"] || null, postal_code: tags["addr:postcode"] || null,
      lat, lng, phone: tags.phone || tags["contact:phone"] || null, website: tags.website || tags["contact:website"] || null, source_url: `https://www.openstreetmap.org/${el.lat ? "node" : "way"}/${el.id}`,
      confidence_score: null, trust_tier: "live-not-stored", last_seen: nowIso(), imported_at: null, raw_source_data: raw,
    };
  }).filter(p => p.lat != null && p.lng != null);
}

async function fetchLiveProviders(ctx: QueryContext) {
  const query = overpassQuery(ctx);
  if (!query) return { providers: [] as ProviderFeature[], warning: "Live discovery requires map bounds or lat/lng/radius." };
  const key = JSON.stringify({ q: ctx.q, clinicType: ctx.clinicType, service: ctx.service, bounds: ctx.bounds, lat: ctx.lat, lng: ctx.lng, radiusMiles: ctx.radiusMiles });
  const cached = liveCache.get(key);
  if (cached && cached.expires > Date.now()) return cached;
  try {
    const resp = await fetch(OVERPASS_ENDPOINT, { method: "POST", body: query, headers: { "content-type": "text/plain" }, signal: AbortSignal.timeout(22000) });
    if (!resp.ok) throw new Error(`Overpass HTTP ${resp.status}`);
    const data = await resp.json() as { elements?: OverpassElement[] };
    const providers = normalizeOverpass(data.elements || []);
    const result = { providers, expires: Date.now() + OVERPASS_CACHE_MS };
    liveCache.set(key, result);
    return result;
  } catch (e) {
    return { providers: [] as ProviderFeature[], warning: e instanceof Error ? e.message : "Live discovery failed" };
  }
}

function distanceMiles(a: ProviderFeature, b: ProviderFeature) {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return Infinity;
  const r = 3959;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

async function handleCompare(req: Request, res: Response, schema: ProviderSchema, spatialEngine: SpatialEngine) {
  const ctx = parseQuery(req);
  const pool = getPool();
  const stored = normalizeRows((await queryStored(pool, schema, { ...ctx, includeLive: false, includeStored: true, includeSaved: true, includeCandidates: false }, spatialEngine, "records", 1, 1000)).rows);
  const live = (await fetchLiveProviders(ctx)).providers;
  const matched = new Set<string>();
  const liveOnly: ProviderFeature[] = [];
  for (const l of live) {
    const match = stored.find(s => normalizeName(s.name) === normalizeName(l.name) || distanceMiles(s, l) <= 0.25);
    if (match) { matched.add(match.id); l.match_reason = normalizeName(match.name) === normalizeName(l.name) ? "name" : "distance<=0.25mi"; l.distance_miles = distanceMiles(match, l); }
    else liveOnly.push({ ...l, match_reason: "live-only" });
  }
  const storedOnly = stored.filter(s => !matched.has(s.id)).map(s => ({ ...s, match_reason: "stored-only" }));
  res.json({ mode: "compare", stored_count: stored.length, live_count: live.length, matched_count: matched.size, live_only_count: liveOnly.length, stored_only_count: storedOnly.length, live_only: liveOnly, stored_only: storedOnly });
}

function requirePersistence(res: Response) {
  if (!isPersistenceConfigured()) { res.status(503).json({ error: "Provider Explorer persistence requires DATABASE_URL." }); return false; }
  return true;
}

function candidateFromPayload(body: CandidatePayload) {
  const provider = body.provider || body;
  const name = provider.name || "Unnamed provider";
  const services = toTextArray(provider.services);
  const categories = toTextArray(provider.categories?.length ? provider.categories : provider.services);
  const clinicType = provider.clinic_type || classifyProvider({ name, services, raw_source_data: provider.raw_source_data });
  return { id: randomUUID(), source_kind: "candidate", source_label: provider.source || "Live discovery", name, normalized_name: normalizeName(name), clinic_type: clinicType, services, categories, address: provider.address || null, city: provider.city || null, admin_area: provider.admin_area || null, country: provider.country || null, postal_code: provider.postal_code || null, lat: provider.lat ?? null, lng: provider.lng ?? null, phone: provider.phone || null, website: provider.website || null, source_url: provider.source_url || null, confidence_score: provider.confidence_score ?? null, trust_tier: provider.trust_tier || "lead", status: body.status || "candidate", notes: body.notes || null, raw_source_data: provider.raw_source_data || provider };
}

async function saveCandidate(req: Request, res: Response) {
  if (!requirePersistence(res)) return;
  const pool = getPool();
  const persistence = await ensureProviderExplorerPersistence(pool);
  const c = candidateFromPayload(req.body || {});
  const row = (await pool.query(`INSERT INTO provider_candidates (id, source_kind, source_label, name, normalized_name, clinic_type, services, categories, address, city, admin_area, country, postal_code, lat, lng, phone, website, source_url, confidence_score, trust_tier, status, notes, raw_source_data, last_seen, geog) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,now(),${persistence.spatialEngine === "postgis" ? "ST_SetSRID(ST_MakePoint($15,$14),4326)::geography" : "NULL"}) RETURNING *`, [c.id, c.source_kind, c.source_label, c.name, c.normalized_name, c.clinic_type, c.services, c.categories, c.address, c.city, c.admin_area, c.country, c.postal_code, c.lat, c.lng, c.phone, c.website, c.source_url, c.confidence_score, c.trust_tier, c.status, c.notes, JSON.stringify(c.raw_source_data)])).rows[0];
  res.json({ ok: true, provider: normalizeRows([row])[0] });
}

async function updateCandidateStatus(req: Request, res: Response, status: string) {
  if (!requirePersistence(res)) return;
  const id = asString(req.body?.id) || asString(req.body?.provider?.id) || asString(req.query.id);
  if (!id) { res.status(400).json({ error: "Candidate id is required." }); return; }
  const row = (await getPool().query(`UPDATE provider_candidates SET status=$2, source_kind=CASE WHEN $2='saved' THEN 'saved' ELSE source_kind END, source_label=CASE WHEN $2='saved' THEN 'My Clinics' ELSE source_label END, saved_at=CASE WHEN $2='saved' THEN now() ELSE saved_at END, dismissed_at=CASE WHEN $2='dismissed' THEN now() ELSE dismissed_at END, updated_at=now() WHERE id=$1 RETURNING *`, [id, status])).rows[0];
  if (!row) { res.status(404).json({ error: "Candidate not found." }); return; }
  res.json({ ok: true, provider: normalizeRows([row])[0] });
}

async function outreachTarget(req: Request, res: Response) {
  if (!requirePersistence(res)) return;
  const provider = req.body?.provider || req.body || {};
  const row = (await getPool().query(`INSERT INTO provider_outreach_targets (provider_candidate_id, provider_source_id, source_kind, source_label, name, status, notes, raw_source_data) VALUES ($1,$2,$3,$4,$5,'outreach_target',$6,$7) RETURNING *`, [asString(provider.id)?.startsWith("osm-") ? null : provider.id || null, provider.id || null, provider.source_kind || null, provider.source || null, provider.name || "Unnamed provider", req.body?.notes || null, JSON.stringify(provider.raw_source_data || provider)])).rows[0];
  res.json({ ok: true, outreach: row });
}

async function handle(req: Request, res: Response, forcedMode?: Mode) {
  const mode = forcedMode || (asString(req.query.mode) as Mode) || "records";
  if (!isPersistenceConfigured()) { res.json({ providers: [], records: [], cells: [], facets: [], total: 0, count: 0, page: 1, limit: 0, hasMore: false, mode, status: { persistenceConfigured: false, spatialEngine: "numeric-fallback", candidatePersistence: false, savedPersistence: false } }); return; }
  const pool = getPool();
  const persistence = await ensureProviderExplorerPersistence(pool);
  const schema = await detectProviderSchema(pool);
  if (mode === "status") { res.json({ persistenceConfigured: true, schema, spatialEngine: persistence.spatialEngine, liveAdapters: ["osm-overpass"], candidatePersistence: true, savedProviderPersistence: true }); return; }
  if (schema === "none" && mode !== "live") { res.json({ providers: [], total: 0, count: 0, note: "No provider table available", status: { schema, ...persistence } }); return; }
  if (mode === "compare") { await handleCompare(req, res, schema, persistence.spatialEngine); return; }
  const ctx = parseQuery(req);
  if (mode === "live") { const live = await fetchLiveProviders(ctx); res.json({ mode, providers: live.providers, records: live.providers, total: live.providers.length, count: live.providers.length, warning: live.warning }); return; }
  if (mode === "facets") { const facets = await queryFacets(pool, schema, ctx, persistence.spatialEngine); res.json({ ...facets, status: persistence }); return; }
  if (mode === "density" || mode === "hex") { const data = await queryAggregates(pool, schema, ctx, persistence.spatialEngine, mode); res.json({ mode, ...data, count: data.cells.length, status: persistence }); return; }
  const page = Math.max(1, Number(req.query.page) || 1);
  const maxLimit = mode === "pins" ? MAX_PIN_LIMIT : MAX_RECORD_LIMIT;
  const limit = Math.min(Math.max(1, Number(req.query.limit) || (mode === "pins" ? 1000 : 25)), maxLimit);
  const stored = await queryStored(pool, schema, ctx, persistence.spatialEngine, mode, page, limit);
  const candidates = await queryCandidates(pool, ctx, persistence.spatialEngine, page, limit);
  let providers = normalizeRows([...stored.rows, ...candidates.rows]);
  let warning: string | undefined;
  if (ctx.includeLive) { const live = await fetchLiveProviders(ctx); providers = [...providers, ...live.providers]; warning = live.warning; }
  const total = stored.total + candidates.total + (ctx.includeLive ? providers.filter(p=>p.source_kind === "live").length : 0);
  res.json({ mode, providers, records: providers, total, count: providers.length, page, limit, hasMore: page * limit < total, visibleCount: providers.length, warning, status: persistence });
}

function routeHandler(forcedMode?: Mode) { return (req: Request, res: Response) => { void handle(req, res, forcedMode).catch((e) => res.status(200).json({ providers: [], records: [], cells: [], facets: [], total: 0, count: 0, page: 1, limit: 0, hasMore: false, mode: forcedMode || req.query.mode || "records", error: e?.message || "Provider explorer failed" })); }; }
function postHandler(fn: (req: Request, res: Response) => Promise<void>) { return (req: Request, res: Response) => { void fn(req, res).catch((e) => res.status(500).json({ error: e?.message || "Provider explorer write failed" })); }; }

router.get("/provider-explorer", routeHandler());
router.get("/provider-explorer/map", routeHandler("pins"));
router.get("/provider-explorer/density", routeHandler("density"));
router.get("/provider-explorer/hex", routeHandler("hex"));
router.get("/provider-explorer/facets", routeHandler("facets"));
router.get("/provider-explorer/live", routeHandler("live"));
router.get("/provider-explorer/compare", routeHandler("compare"));
router.get("/provider-explorer/status", routeHandler("status" as Mode));
router.post("/provider-explorer/save-candidate", postHandler(saveCandidate));
router.post("/provider-explorer/save-to-my-clinics", postHandler(async (req, res) => updateCandidateStatus(req, res, "saved")));
router.post("/provider-explorer/dismiss-candidate", postHandler(async (req, res) => updateCandidateStatus(req, res, "dismissed")));
router.post("/provider-explorer/outreach-target", postHandler(outreachTarget));
router.patch("/provider-explorer/provider-status", postHandler(async (req, res) => updateCandidateStatus(req, res, asString(req.body?.status) || "candidate")));
export default router;

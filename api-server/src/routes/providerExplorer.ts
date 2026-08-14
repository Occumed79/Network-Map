import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { getPool, getProviderDatabaseProjects, type ProviderDatabaseProject } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { detectProviderSchema, type ProviderSchema } from "../lib/providerSchema";
import { queryWithStatementTimeout } from "../lib/queryWithStatementTimeout";
import { classifyProvider } from "../lib/providerClassifier";
import { parseOptionalNumber } from "../lib/providerCoordinates";

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

function asString(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function asBool(value: unknown, fallback: boolean): boolean { if (value === undefined) return fallback; return value === true || value === "true" || value === "1"; }
function asNumber(value: unknown): number | undefined { return parseOptionalNumber(value) ?? undefined; }
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
  try {
    const result = await pool.query(`
      SELECT
        to_regclass('public.provider_candidates') IS NOT NULL AS candidates_ready,
        to_regclass('public.provider_outreach_targets') IS NOT NULL AS outreach_ready
    `);
    const candidatesReady = Boolean(result.rows[0]?.candidates_ready);
    const outreachReady = Boolean(result.rows[0]?.outreach_ready);
    return {
      spatialEngine: "numeric-fallback" as SpatialEngine,
      candidatePersistence: candidatesReady,
      savedPersistence: candidatesReady && outreachReady,
    };
  } catch {
    return {
      spatialEngine: "numeric-fallback" as SpatialEngine,
      candidatePersistence: false,
      savedPersistence: false,
    };
  }
}

function storedExpressions(schema: ProviderSchema) {
  return {
    lat: schema === "canonical" ? "pmv.lat" : schema === "normalized" ? "pl.lat" : "mp.lat",
    lng: schema === "canonical" ? "pmv.lng" : schema === "normalized" ? "pl.lng" : "mp.lng",
    city: schema === "canonical" ? "pmv.city" : schema === "normalized" ? "pl.city" : "mp.locality",
    admin: schema === "canonical" ? "pmv.admin_area" : schema === "normalized" ? "pl.state" : "mp.administrative_area_level_1",
    postal: schema === "canonical" ? "pmv.postal_code" : schema === "normalized" ? "pl.postal_code" : "mp.postal_code",
    name: schema === "canonical" ? "pmv.name" : schema === "normalized" ? "p.name" : "mp.name",
    source: schema === "canonical" ? "pmv.source_key" : schema === "normalized" ? "psrc.source_label" : "mp.data_source",
    country: schema === "canonical" ? "pmv.country" : schema === "normalized" ? "psrc.raw_data->>'country'" : "COALESCE(mp.country_code, mp.raw_data->>'country')",
    service: schema === "canonical" ? "COALESCE(array_to_string(pmv.services, ' '), '')" : schema === "normalized" ? "COALESCE(svc.services_text, '')" : "COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')",
    geog: schema === "canonical" ? "ST_SetSRID(ST_MakePoint(pmv.lng, pmv.lat),4326)::geography" : schema === "normalized" ? "ST_SetSRID(ST_MakePoint(pl.lng, pl.lat),4326)::geography" : "ST_SetSRID(ST_MakePoint(mp.lng, mp.lat),4326)::geography",
  };
}

function baseSql(schema: ProviderSchema) {
  if (schema === "canonical") return `FROM public.provider_master_map_view pmv WHERE`;
  if (schema === "legacy") return `FROM public.medical_providers mp WHERE`;
  return `FROM providers p INNER JOIN provider_locations pl ON pl.provider_id=p.id LEFT JOIN provider_contacts pc ON pc.provider_id=p.id LEFT JOIN LATERAL (SELECT array_agg(DISTINCT service_type) services, string_agg(DISTINCT COALESCE(service_type,'') || ' ' || COALESCE(taxonomy,''), ' ') services_text FROM provider_services WHERE provider_id=p.id) svc ON true INNER JOIN LATERAL (SELECT source_label, source_url, trust_tier, raw_data, fetched_at, created_at FROM provider_sources WHERE provider_id=p.id ORDER BY CASE WHEN source_label='My Clinics' THEN 0 ELSE 1 END, id ASC LIMIT 1) psrc ON true WHERE`;
}

function selectSql(schema: ProviderSchema) {
  if (schema === "canonical") {
    return `SELECT pmv.id, pmv.name, pmv.normalized_name, pmv.address, pmv.city, pmv.admin_area, pmv.country, pmv.postal_code, pmv.lat, pmv.lng, pmv.phone, pmv.website, pmv.source_key AS source, pmv.source_kind, NULL::text AS source_url, pmv.confidence_score, pmv.clinic_type AS category, pmv.services, pmv.categories, NULL::jsonb AS raw_source_data, pmv.created_at AS imported_at, pmv.last_seen_at AS last_seen, CASE WHEN pmv.confidence_score >= 0.85 THEN 'verified' WHEN pmv.confidence_score >= 0.70 THEN 'registry' WHEN pmv.confidence_score >= 0.50 THEN 'directory' ELSE 'lead' END AS trust_tier, NULL::text status`;
  }
  if (schema === "legacy") {
    return `SELECT COALESCE(NULLIF(mp.source_id, ''), 'legacy:' || mp.id::text) AS id, mp.name, lower(regexp_replace(COALESCE(mp.name,''),'[^a-zA-Z0-9]+',' ','g')) normalized_name, mp.formatted_address AS address, mp.locality AS city, mp.administrative_area_level_1 AS admin_area, COALESCE(mp.country_code, mp.raw_data->>'country','US') AS country, mp.postal_code, mp.lat, mp.lng, mp.phone, mp.website, mp.data_source AS source, CASE WHEN lower(COALESCE(mp.data_source,''))='my clinics' THEN 'saved' ELSE 'stored' END source_kind, COALESCE(mp.raw_data->>'source_url', mp.raw_data->>'url', mp.website)::text AS source_url, mp.confidence_score, mp.category, mp.types AS services, mp.types AS categories, mp.raw_data AS raw_source_data, COALESCE(mp.scraped_at, mp.updated_at) AS imported_at, mp.updated_at AS last_seen, CASE WHEN mp.confidence_score >= 0.85 THEN 'verified' WHEN mp.confidence_score >= 0.70 THEN 'registry' WHEN mp.confidence_score >= 0.50 THEN 'directory' ELSE 'lead' END AS trust_tier, NULL::text status`;
  }
  return `SELECT p.id::text AS id, p.name, lower(regexp_replace(COALESCE(p.name,''),'[^a-zA-Z0-9]+',' ','g')) normalized_name, pl.address, pl.city, pl.state AS admin_area, COALESCE(psrc.raw_data->>'country', psrc.raw_data->>'country_code') AS country, pl.postal_code, pl.lat, pl.lng, pc.phone, pc.website, psrc.source_label AS source, CASE WHEN psrc.source_label='My Clinics' THEN 'saved' ELSE 'stored' END source_kind, psrc.source_url, NULL::numeric AS confidence_score, NULL::text AS category, svc.services, svc.services AS categories, psrc.raw_data AS raw_source_data, psrc.created_at AS imported_at, psrc.fetched_at AS last_seen, psrc.trust_tier, NULL::text status`;
}

export function legacyProviderSelectForTest(): string { return selectSql("legacy"); }

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
  else if (!ctx.includeStored) where.push(schema === "canonical" ? "pmv.source_kind = 'saved'" : `${sourceTextExpr} = 'my clinics'`);
  else if (!ctx.includeSaved) where.push(schema === "canonical" ? "pmv.source_kind = 'stored'" : `${sourceTextExpr} <> 'my clinics'`);
  if (ctx.source === "live" || ctx.source === "candidates") where.push("FALSE");
  if (ctx.source && ctx.source !== "live" && ctx.source !== "candidates") {
    if (ctx.source === "indexed") {
      where.push(schema === "canonical"
        ? `${sourceTextExpr} NOT IN ('bluehive','dentist_dataset','my_clinics_upload')`
        : `${sourceTextExpr} NOT IN ('bluehive','dentist dataset','my clinics')`);
    } else {
      const sourceLabel = schema === "canonical"
        ? ({ bluehive: "bluehive", dentists: "dentist_dataset", "my-clinics": "my_clinics_upload" }[ctx.source] || ctx.source)
        : SOURCE_LABELS[ctx.source] || ctx.source;
      where.push(`${sourceTextExpr} = LOWER(${addParam(params, sourceLabel)})`);
    }
  }
  if (ctx.sourceKind && ctx.sourceKind !== "all") {
    if (ctx.sourceKind === "saved") where.push(schema === "canonical" ? "pmv.source_kind = 'saved'" : `${sourceTextExpr} = 'my clinics'`);
    else if (ctx.sourceKind === "stored") where.push(schema === "canonical" ? "pmv.source_kind = 'stored'" : `${sourceTextExpr} <> 'my clinics'`);
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
    const categories = toTextArray(row.categories?.length ? row.categories : row.category || row.services);
    const raw = row.raw_source_data || null;
    const clinicType = row.clinic_type || classifyProvider({ name: row.name, category: row.category, services, raw_source_data: raw });
    return {
      id: String(row.id || randomUUID()), source: row.source || row.source_label || "indexed", source_kind: row.source_kind || sourceKindFor(row.source),
      name: row.name || "Unnamed provider", normalized_name: row.normalized_name || normalizeName(row.name), clinic_type: clinicType,
      services, categories, address: row.address || null, city: row.city || null, admin_area: row.admin_area || null,
      country: row.country || null, postal_code: row.postal_code || null,
      lat: row.lat == null ? null : Number(row.lat), lng: row.lng == null ? null : Number(row.lng), phone: row.phone || null,
      website: row.website || null, source_url: row.source_url || null, confidence_score: row.confidence_score == null ? null : Number(row.confidence_score),
      trust_tier: row.trust_tier || "lead", last_seen: row.last_seen || null, imported_at: row.imported_at || null, raw_source_data: raw,
      status: row.status || null,
    };
  });
}

async function queryStored(pool: ReturnType<typeof getPool>, schema: ProviderSchema, ctx: QueryContext, mode: Mode, spatialEngine: SpatialEngine, page = 1, limit = 25, queryOffset?: number) {
  if (schema === "none") return { providers: [] as ProviderFeature[], total: 0 };
  const params: unknown[] = [];
  const where = buildStoredWhere(ctx, schema, params, spatialEngine).join(" AND ");
  const from = baseSql(schema);
  const total = Number((await queryWithStatementTimeout(pool, `SELECT count(*)::int AS total ${from} ${where}`, params)).rows[0]?.total || 0);
  if (mode === "density" || mode === "hex") return { providers: [] as ProviderFeature[], total };
  const offset = queryOffset ?? (page - 1) * limit;
  params.push(limit, offset);
  const rows = (await queryWithStatementTimeout(pool, `${selectSql(schema)} ${from} ${where} ORDER BY id ASC LIMIT $${params.length - 1} OFFSET $${params.length}`, params)).rows;
  return { providers: normalizeRows(rows), total };
}

type StoredProjectProbe = {
  project: ProviderDatabaseProject;
  schema: Exclude<ProviderSchema, "none">;
  spatialEngine: SpatialEngine;
  total: number;
};

async function queryStoredAcrossProviderProjects(
  projects: ProviderDatabaseProject[],
  ctx: QueryContext,
  mode: Mode,
  page: number,
  limit: number,
): Promise<{ providers: ProviderFeature[]; total: number; warnings: string[]; databaseProjects: string[] }> {
  const warnings: string[] = [];
  const probeResults = await Promise.all(projects.map(async (project) => {
    try {
      const setup = await ensureProviderExplorerPersistence(project.pool);
      const schema = await detectProviderSchema(project.pool);
      if (schema === "none") throw new Error("provider schema is not initialized");
      const result = await queryStored(project.pool, schema, ctx, "density", setup.spatialEngine, 1, 1);
      return { project, schema, spatialEngine: setup.spatialEngine, total: result.total } satisfies StoredProjectProbe;
    } catch (error) {
      warnings.push(`${project.id} is temporarily unavailable: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }));
  const probes: StoredProjectProbe[] = probeResults.flatMap((result) => result ? [result] : []);
  if (!probes.length) throw new Error(warnings.join(" ") || "No provider database project is available.");

  const total = probes.reduce((sum, probe) => sum + probe.total, 0);
  let offset = (page - 1) * limit;
  let remaining = limit;
  const groups: ProviderFeature[][] = [];
  for (const probe of probes) {
    if (remaining <= 0) break;
    if (offset >= probe.total) {
      offset -= probe.total;
      continue;
    }
    const requested = Math.min(remaining, probe.total - offset);
    try {
      const result = await queryStored(
        probe.project.pool,
        probe.schema,
        ctx,
        mode,
        probe.spatialEngine,
        1,
        requested,
        offset,
      );
      groups.push(result.providers);
    } catch (error) {
      warnings.push(`${probe.project.id} could not return provider records: ${error instanceof Error ? error.message : String(error)}`);
    }
    remaining -= requested;
    offset = 0;
  }

  const unique = new Map<string, ProviderFeature>();
  for (const provider of groups.flat()) {
    const key = provider.id || `${normalizeName(provider.name)}|${provider.lat}|${provider.lng}`;
    if (!unique.has(key)) unique.set(key, provider);
  }
  return {
    providers: [...unique.values()],
    total,
    warnings,
    databaseProjects: probes.map((probe) => probe.project.id),
  };
}

async function queryCandidates(pool: ReturnType<typeof getPool>, ctx: QueryContext, spatialEngine: SpatialEngine, page = 1, limit = 25) {
  const params: unknown[] = [];
  const where = buildCandidateWhere(ctx, params, spatialEngine).join(" AND ");
  const total = Number((await queryWithStatementTimeout(pool, `SELECT count(*)::int AS total FROM provider_candidates WHERE ${where}`, params)).rows[0]?.total || 0);
  const offset = (page - 1) * limit;
  params.push(limit, offset);
  const rows = (await queryWithStatementTimeout(pool, `SELECT id::text, source_label AS source, source_kind, name, normalized_name, clinic_type, services, categories, address, city, admin_area, country, postal_code, lat, lng, phone, website, source_url, confidence_score, trust_tier, raw_source_data, created_at AS imported_at, last_seen, status FROM provider_candidates WHERE ${where} ORDER BY updated_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params)).rows;
  return { providers: normalizeRows(rows), total };
}

function hasLiveScope(ctx: QueryContext): boolean { return Boolean(ctx.bounds || (ctx.lat !== undefined && ctx.lng !== undefined && ctx.radiusMiles !== undefined)); }
export function buildLiveCacheKeyForTest(ctx: Pick<QueryContext, "bounds" | "lat" | "lng" | "radiusMiles" | "clinicType" | "service" | "q">): string {
  return JSON.stringify({ b: ctx.bounds, lat: ctx.lat, lng: ctx.lng, r: ctx.radiusMiles, c: ctx.clinicType, s: ctx.service, q: ctx.q?.toLowerCase() });
}
function overpassQuery(ctx: QueryContext): string {
  const terms = ctx.clinicType || ctx.service || "clinic";
  const amenity = terms.toLowerCase().includes("pharmacy") ? `[amenity=pharmacy]` : terms.toLowerCase().includes("dental") ? `[amenity=dentist]` : `[amenity~"clinic|doctors|hospital|dentist|pharmacy"]`;
  if (ctx.bounds) return `[out:json][timeout:15];(node${amenity}(${ctx.bounds.south},${ctx.bounds.west},${ctx.bounds.north},${ctx.bounds.east});way${amenity}(${ctx.bounds.south},${ctx.bounds.west},${ctx.bounds.north},${ctx.bounds.east});relation${amenity}(${ctx.bounds.south},${ctx.bounds.west},${ctx.bounds.north},${ctx.bounds.east}););out center tags 80;`;
  const radius = Math.min(Math.max(ctx.radiusMiles || 10, 1), MAX_LIVE_RADIUS_MILES) * 1609.344;
  return `[out:json][timeout:15];(node${amenity}(around:${radius},${ctx.lat},${ctx.lng});way${amenity}(around:${radius},${ctx.lat},${ctx.lng});relation${amenity}(around:${radius},${ctx.lat},${ctx.lng}););out center tags 80;`;
}
function elementToProvider(el: OverpassElement): ProviderFeature | null {
  const tags = el.tags || {}; const lat = el.lat ?? el.center?.lat; const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) return null;
  const services = [tags.healthcare, tags.amenity, tags["healthcare:speciality"], tags.speciality].filter(Boolean) as string[];
  const name = tags.name || tags.operator || "Unnamed live provider";
  const address = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ") || null;
  const raw = { osm_id: el.id, tags };
  return { id: `osm-${el.id}`, source: "OpenStreetMap / Overpass", source_kind: "live", name, normalized_name: normalizeName(name), clinic_type: classifyProvider({ name, services, raw_source_data: raw }), services, categories: services, address, city: tags["addr:city"] || null, admin_area: tags["addr:state"] || tags["addr:province"] || null, country: tags["addr:country"] || null, postal_code: tags["addr:postcode"] || null, lat, lng, phone: tags.phone || tags["contact:phone"] || null, website: tags.website || tags["contact:website"] || null, source_url: `https://www.openstreetmap.org/${"lat" in el ? "node" : "way"}/${el.id}`, confidence_score: null, trust_tier: "live-not-stored", last_seen: nowIso(), imported_at: null, raw_source_data: raw, status: "live" };
}
async function fetchLiveProviders(ctx: QueryContext) {
  if (!hasLiveScope(ctx)) return { providers: [] as ProviderFeature[], warning: "Live discovery requires map bounds or radius." };
  const key = buildLiveCacheKeyForTest(ctx);
  const cached = liveCache.get(key); if (cached && cached.expires > Date.now()) return cached;
  try {
    const resp = await fetch(OVERPASS_ENDPOINT, { method: "POST", body: overpassQuery(ctx), headers: { "content-type": "text/plain" }, signal: AbortSignal.timeout(18000) });
    if (!resp.ok) throw new Error(`Overpass HTTP ${resp.status}`);
    const data = await resp.json() as { elements?: OverpassElement[] };
    let providers = (data.elements || []).map(elementToProvider).filter((p): p is ProviderFeature => Boolean(p));
    if (ctx.q) providers = providers.filter((p) => `${p.name} ${p.services.join(" ")} ${p.city || ""}`.toLowerCase().includes(ctx.q!.toLowerCase()));
    const result = { providers: providers.slice(0, 500), warning: undefined };
    liveCache.set(key, { ...result, expires: Date.now() + OVERPASS_CACHE_MS });
    return result;
  } catch (e) {
    return { providers: [] as ProviderFeature[], warning: e instanceof Error ? `Live discovery unavailable: ${e.message}` : "Live discovery unavailable" };
  }
}
function distanceMiles(a: ProviderFeature, b: ProviderFeature): number { if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return Infinity; const R=3959; const dLat=(b.lat-a.lat)*Math.PI/180; const dLng=(b.lng-a.lng)*Math.PI/180; const s=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2; return 2*R*Math.asin(Math.sqrt(s)); }

async function handleRecords(req: Request, res: Response, forcedMode?: Mode) {
  const mode = forcedMode || (asString(req.query.mode) as Mode) || "records";
  const ctx = parseQuery(req);
  if (!isPersistenceConfigured()) {
    if (mode === "live") { const live = await fetchLiveProviders(ctx); res.json({ mode, providers: live.providers, records: live.providers, total: live.providers.length, count: live.providers.length, warning: live.warning, status: { persistenceConfigured: false, schema: "none", spatialEngine: "numeric-fallback", liveAdapters: ["osm-overpass"] } }); return; }
    if (mode === "compare") { const live = await fetchLiveProviders(ctx); res.json({ mode, stored_count: 0, live_count: live.providers.length, matched_count: 0, live_only_count: live.providers.length, stored_only_count: 0, live_only: live.providers.map((p) => ({ ...p, match_reason: "live_only" })), stored_only: [], warning: live.warning, status: { persistenceConfigured: false, schema: "none", spatialEngine: "numeric-fallback", liveAdapters: ["osm-overpass"] } }); return; }
    res.json({ providers: [], records: [], cells: [], facets: [], total: 0, count: 0, page: 1, limit: 0, hasMore: false, mode, status: { persistenceConfigured: false, spatialEngine: "numeric-fallback" } }); return;
  }
  const providerProjects = getProviderDatabaseProjects();
  const pool = providerProjects[0].pool; const setup = await ensureProviderExplorerPersistence(pool); const schema = await detectProviderSchema(pool);
  if (mode === "live") { const live = await fetchLiveProviders(ctx); res.json({ mode, providers: live.providers, records: live.providers, total: live.providers.length, count: live.providers.length, warning: live.warning, status: { persistenceConfigured: true, schema, ...setup } }); return; }
  if (mode === "compare") { const stored = providerProjects.length > 1 ? await queryStoredAcrossProviderProjects(providerProjects, ctx, "pins", 1, 1000) : { ...(await queryStored(pool, schema, ctx, "pins", setup.spatialEngine, 1, 1000)), warnings: [] as string[], databaseProjects: ["provider-project-1"] }; const live = await fetchLiveProviders(ctx); const matched = new Set<string>(); const liveOnly: ProviderFeature[] = []; for (const lp of live.providers) { const match = stored.providers.find((sp) => normalizeName(sp.name) === normalizeName(lp.name) || distanceMiles(sp, lp) <= 0.25); if (match) { matched.add(match.id); lp.match_reason = normalizeName(match.name) === normalizeName(lp.name) ? "normalized_name" : "distance_0.25mi"; lp.distance_miles = distanceMiles(match, lp); } else liveOnly.push({ ...lp, match_reason: "live_only" }); } const storedOnly = stored.providers.filter((p) => !matched.has(p.id)).map((p) => ({ ...p, match_reason: "stored_only" })); res.json({ mode, stored_count: stored.total, live_count: live.providers.length, matched_count: matched.size, live_only_count: liveOnly.length, stored_only_count: storedOnly.length, live_only: liveOnly, stored_only: storedOnly, warning: [live.warning, ...stored.warnings].filter(Boolean).join(" ") || undefined, partial: stored.warnings.length > 0, databaseProjects: stored.databaseProjects, status: { persistenceConfigured: true, schema, ...setup } }); return; }
  if (mode === "facets") {
    const warnings: string[] = [];
    const results = await Promise.all(providerProjects.map(async (project) => {
      try {
        const projectSetup = await ensureProviderExplorerPersistence(project.pool);
        const projectSchema = await detectProviderSchema(project.pool);
        if (projectSchema === "none") throw new Error("provider schema is not initialized");
        const params: unknown[] = [];
        const where = buildStoredWhere(ctx, projectSchema, params, projectSetup.spatialEngine).join(" AND ");
        const from = baseSql(projectSchema);
        return (await queryWithStatementTimeout(project.pool, `SELECT source, source_kind, country, admin_area, city, clinic_type, service, count(*)::int count FROM (SELECT x.source, x.source_kind, x.country, x.admin_area, x.city, 'unknown' clinic_type, NULL::text service FROM (${selectSql(projectSchema)} ${from} ${where}) x UNION ALL SELECT NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, unnest(COALESCE(x.services::text[], ARRAY[]::text[])) FROM (${selectSql(projectSchema)} ${from} ${where}) x) f GROUP BY GROUPING SETS ((source),(source_kind),(country),(admin_area),(city),(clinic_type),(service)) HAVING count(*) > 0`, params)).rows;
      } catch (error) {
        warnings.push(`${project.id} is temporarily unavailable: ${error instanceof Error ? error.message : String(error)}`);
        return [];
      }
    }));
    const merged = new Map<string, Record<string, unknown>>();
    for (const row of results.flat()) {
      const dimensions = ["source", "source_kind", "country", "admin_area", "city", "clinic_type", "service"];
      const key = dimensions.map((field) => String(row[field] ?? "")).join("\u001f");
      const existing = merged.get(key);
      if (existing) existing.count = Number(existing.count || 0) + Number(row.count || 0);
      else merged.set(key, { ...row, count: Number(row.count || 0) });
    }
    const rows = [...merged.values()];
    res.json({ mode, total: rows.reduce((m, row) => Math.max(m, Number(row.count) || 0), 0), facets: rows, warning: warnings.join(" ") || undefined, warnings, partial: warnings.length > 0, databaseProjects: providerProjects.map((project) => project.id), status: { persistenceConfigured: true, schema, ...setup } }); return;
  }
  if (mode === "density" || mode === "hex") {
    const precision = Math.max(1, Math.min(10, Number(req.query.precision) || (mode === "hex" ? 2 : 1)));
    const warnings: string[] = [];
    const results = await Promise.all(providerProjects.map(async (project) => {
      try {
        const projectSetup = await ensureProviderExplorerPersistence(project.pool);
        const projectSchema = await detectProviderSchema(project.pool);
        if (projectSchema === "none") throw new Error("provider schema is not initialized");
        const params: unknown[] = [];
        const e = storedExpressions(projectSchema);
        const where = buildStoredWhere(ctx, projectSchema, params, projectSetup.spatialEngine).join(" AND ");
        const from = baseSql(projectSchema);
        const cells = (await queryWithStatementTimeout(project.pool, `SELECT round((${e.lat})::numeric, ${precision})::float lat, round((${e.lng})::numeric, ${precision})::float lng, count(*)::int count ${from} ${where} GROUP BY 1,2 ORDER BY count DESC LIMIT 2000`, params)).rows;
        const total = Number((await queryWithStatementTimeout(project.pool, `SELECT count(*)::int total ${from} ${where}`, params)).rows[0]?.total || 0);
        return { cells, total };
      } catch (error) {
        warnings.push(`${project.id} is temporarily unavailable: ${error instanceof Error ? error.message : String(error)}`);
        return { cells: [], total: 0 };
      }
    }));
    const merged = new Map<string, { lat: number; lng: number; count: number }>();
    for (const cell of results.flatMap((result) => result.cells)) {
      const lat = Number(cell.lat); const lng = Number(cell.lng); const key = `${lat}|${lng}`;
      const existing = merged.get(key);
      if (existing) existing.count += Number(cell.count || 0);
      else merged.set(key, { lat, lng, count: Number(cell.count || 0) });
    }
    const cells = [...merged.values()].sort((a, b) => b.count - a.count).slice(0, 2000);
    const total = results.reduce((sum, result) => sum + result.total, 0);
    res.json({ mode, total, cells, count: cells.length, precision, warning: warnings.join(" ") || undefined, warnings, partial: warnings.length > 0, databaseProjects: providerProjects.map((project) => project.id), status: { persistenceConfigured: true, schema, ...setup } }); return;
  }
  const page = Math.max(1, Number(req.query.page) || 1); const maxLimit = mode === "pins" ? MAX_PIN_LIMIT : MAX_RECORD_LIMIT; const limit = Math.min(Math.max(1, Number(req.query.limit) || (mode === "pins" ? 1000 : 25)), maxLimit);
  const stored = providerProjects.length > 1
    ? await queryStoredAcrossProviderProjects(providerProjects, ctx, mode, page, limit)
    : { ...(await queryStored(pool, schema, ctx, mode, setup.spatialEngine, page, limit)), warnings: [] as string[], databaseProjects: ["provider-project-1"] };
  const cand = setup.candidatePersistence
    ? await queryCandidates(pool, ctx, setup.spatialEngine, page, limit)
    : { providers: [] as ProviderFeature[], total: 0 };
  const live = ctx.includeLive || ctx.source === "live" || ctx.sourceKind === "live" ? await fetchLiveProviders(ctx) : { providers: [] as ProviderFeature[], warning: undefined };
  const providers = [...stored.providers, ...cand.providers, ...live.providers].slice(0, limit); const total = stored.total + cand.total + live.providers.length;
  const warnings = [live.warning, ...stored.warnings].filter((warning): warning is string => Boolean(warning));
  res.json({ mode, providers, records: providers, total, count: providers.length, page, limit, hasMore: page * limit < total, visibleCount: providers.length, warning: warnings.join(" ") || undefined, warnings, partial: stored.warnings.length > 0, databaseProjects: stored.databaseProjects, status: { persistenceConfigured: true, schema, ...setup } });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUuid(value: unknown): value is string { return typeof value === "string" && UUID_RE.test(value); }

async function insertProviderCandidate(pool: ReturnType<typeof getPool>, setup: Awaited<ReturnType<typeof ensureProviderExplorerPersistence>>, payload: CandidatePayload, status: "candidate" | "saved") {
  const name = asString(payload.name); if (!name) throw new Error("name is required");
  const services = toTextArray(payload.services); const categories = toTextArray(payload.categories); const raw = payload.raw_source_data || payload.raw_source_data === null ? payload.raw_source_data : payload;
  const sourceKind = status === "saved" ? "saved" : "candidate"; const sourceLabel = status === "saved" ? "My Clinics" : (payload.source || (payload as any).source_label || "Live discovery");
  const values = [sourceKind, sourceLabel, name, normalizeName(name), payload.clinic_type || classifyProvider({ name, services, service_categories: categories, raw_source_data: raw }), services, categories, payload.address || null, payload.city || null, payload.admin_area || null, payload.country || null, payload.postal_code || null, payload.lat ?? null, payload.lng ?? null, payload.phone || null, payload.website || null, payload.source_url || null, payload.confidence_score ?? null, payload.trust_tier || sourceKind, status, payload.notes || null, JSON.stringify(raw || {})];
  const geogColumn = setup.spatialEngine === "postgis" ? ", geog" : "";
  const geogValue = setup.spatialEngine === "postgis" ? ", CASE WHEN $13::double precision IS NOT NULL AND $14::double precision IS NOT NULL THEN ST_SetSRID(ST_MakePoint($14,$13),4326)::geography ELSE NULL END" : "";
  return (await pool.query(`INSERT INTO provider_candidates (source_kind, source_label, name, normalized_name, clinic_type, services, categories, address, city, admin_area, country, postal_code, lat, lng, phone, website, source_url, confidence_score, trust_tier, status, notes, raw_source_data, last_seen, saved_at${geogColumn}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, now(), CASE WHEN $20='saved' THEN now() ELSE NULL END${geogValue}) RETURNING *`, values)).rows[0];
}

async function saveCandidate(req: Request, res: Response) {
  if (!isPersistenceConfigured()) { res.status(503).json({ error: "Candidate persistence requires DATABASE_URL." }); return; }
  const pool = getPool(); const setup = await ensureProviderExplorerPersistence(pool); const payload = ((req.body?.provider || req.body) ?? {}) as CandidatePayload;
  if (!setup.candidatePersistence) { res.status(503).json({ error: "Provider Explorer persistence migration is not applied." }); return; }
  const row = await insertProviderCandidate(pool, setup, payload, "candidate");
  res.status(201).json({ provider: normalizeRows([row])[0], candidate: row });
}
async function updateCandidateStatus(req: Request, res: Response, status: string) {
  if (!isPersistenceConfigured()) { res.status(503).json({ error: "Candidate persistence requires DATABASE_URL." }); return; }
  const pool = getPool(); const setup = await ensureProviderExplorerPersistence(pool); const id = asString(req.body?.id || req.body?.candidateId || req.query.id); const payload = ((req.body?.provider || req.body) ?? {}) as CandidatePayload;
  if (!setup.candidatePersistence) { res.status(503).json({ error: "Provider Explorer persistence migration is not applied." }); return; }
  if (!id && status !== "saved") { res.status(400).json({ error: "id is required" }); return; }
  let row = null;
  if (isUuid(id)) row = (await pool.query(`UPDATE provider_candidates SET status=$2, source_kind=CASE WHEN $2='saved' THEN 'saved' ELSE 'candidate' END, source_label=CASE WHEN $2='saved' THEN 'My Clinics' ELSE source_label END, saved_at=CASE WHEN $2='saved' THEN now() ELSE saved_at END, dismissed_at=CASE WHEN $2='dismissed' THEN now() ELSE dismissed_at END, notes=COALESCE($3, notes), updated_at=now() WHERE id=$1 RETURNING *`, [id, status, req.body?.notes || null])).rows[0];
  if (!row && status === "saved" && asString(payload.name)) {
    row = await insertProviderCandidate(pool, setup, payload, "saved");
    res.status(201).json({ provider: normalizeRows([row])[0], candidate: row, persistedFromPayload: true }); return;
  }
  if (!row && status === "dismissed") { res.json({ persisted: false, dismissed: false, message: "Provider was not a persisted candidate; nothing to dismiss." }); return; }
  if (!row) { res.status(404).json({ error: "candidate not found" }); return; }
  res.json({ provider: normalizeRows([row])[0], candidate: row });
}
async function outreachTarget(req: Request, res: Response) {
  if (!isPersistenceConfigured()) { res.status(503).json({ error: "Outreach persistence requires DATABASE_URL." }); return; }
  const pool = getPool(); const setup = await ensureProviderExplorerPersistence(pool); const payload = req.body?.provider || req.body || {}; const name = asString(payload.name); if (!name) { res.status(400).json({ error: "name is required" }); return; }
  if (!setup.savedPersistence) { res.status(503).json({ error: "Provider Explorer outreach persistence migration is not applied." }); return; }
  const providerSourceId = asString(payload.id) || null; const sourceKind = asString(payload.source_kind) || null; const sourceLabel = asString(payload.source || payload.source_label) || null; const candidateId = isUuid(payload.candidateId) ? payload.candidateId : isUuid(payload.id) ? payload.id : null;
  const existing = (await pool.query(`SELECT * FROM provider_outreach_targets WHERE (provider_source_id IS NOT DISTINCT FROM $1 OR lower(name)=lower($2)) AND source_kind IS NOT DISTINCT FROM $3 AND source_label IS NOT DISTINCT FROM $4 ORDER BY updated_at DESC LIMIT 1`, [providerSourceId, name, sourceKind, sourceLabel])).rows[0];
  if (existing) { const row = (await pool.query(`UPDATE provider_outreach_targets SET status='outreach_target', notes=COALESCE($2, notes), raw_source_data=COALESCE($3, raw_source_data), updated_at=now() WHERE id=$1 RETURNING *`, [existing.id, req.body?.notes || payload.notes || null, JSON.stringify(payload.raw_source_data || payload)])).rows[0]; res.json({ outreach_target: row, deduped: true }); return; }
  const row = (await pool.query(`INSERT INTO provider_outreach_targets (provider_candidate_id, provider_source_id, source_kind, source_label, name, status, notes, raw_source_data) VALUES ($1,$2,$3,$4,$5,'outreach_target',$6,$7) RETURNING *`, [candidateId, providerSourceId, sourceKind, sourceLabel, name, req.body?.notes || payload.notes || null, JSON.stringify(payload.raw_source_data || payload)])).rows[0];
  res.status(201).json({ outreach_target: row, deduped: false });
}
async function status(req: Request, res: Response) {
  if (!isPersistenceConfigured()) { res.json({ persistenceConfigured: false, schema: "none", spatialEngine: "numeric-fallback", liveAdapters: ["osm-overpass"], candidatePersistence: false, savedPersistence: false }); return; }
  const pool = getPool(); const setup = await ensureProviderExplorerPersistence(pool); const schema = await detectProviderSchema(pool); res.json({ persistenceConfigured: true, schema, ...setup, liveAdapters: ["osm-overpass"] });
}
function routeHandler(forcedMode?: Mode) { return (req: Request, res: Response) => { void handleRecords(req, res, forcedMode).catch((e) => res.status(200).json({ providers: [], records: [], cells: [], facets: [], total: 0, count: 0, page: 1, limit: 0, hasMore: false, mode: forcedMode || req.query.mode || "records", error: "Provider explorer request failed" })); }; }
function postHandler(fn: (req: Request, res: Response) => Promise<void>) { return (req: Request, res: Response) => { void fn(req, res).catch((e) => res.status(500).json({ error: e?.message || "Provider explorer write failed" })); }; }

router.get("/provider-explorer", routeHandler());
router.get("/provider-explorer/map", routeHandler("pins"));
router.get("/provider-explorer/density", routeHandler("density"));
router.get("/provider-explorer/hex", routeHandler("hex"));
router.get("/provider-explorer/facets", routeHandler("facets"));
router.get("/provider-explorer/live", routeHandler("live"));
router.get("/provider-explorer/compare", routeHandler("compare"));
router.get("/provider-explorer/status", postHandler(status));
router.post("/provider-explorer/save-candidate", postHandler(saveCandidate));
router.post("/provider-explorer/save-to-my-clinics", postHandler((req, res) => updateCandidateStatus(req, res, "saved")));
router.post("/provider-explorer/dismiss-candidate", postHandler((req, res) => updateCandidateStatus(req, res, "dismissed")));
router.post("/provider-explorer/outreach-target", postHandler(outreachTarget));
router.patch("/provider-explorer/provider-status", postHandler(async (req, res) => updateCandidateStatus(req, res, asString(req.body?.status) || "candidate")));
export default router;

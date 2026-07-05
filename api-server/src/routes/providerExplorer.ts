import { Router, type Request, type Response } from "express";
import { getPool } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { detectProviderSchema } from "../lib/providerSchema";
import { queryWithStatementTimeout } from "../lib/queryWithStatementTimeout";
import { classifyProvider } from "../lib/providerClassifier";

const router = Router();

type Mode = "records" | "pins" | "density" | "hex" | "facets";
const SOURCE_LABELS: Record<string, string> = { bluehive: "BlueHive", dentists: "Dentist Dataset", indexed: "indexed", "my-clinics": "My Clinics", saved: "My Clinics" };
const MAX_RECORD_LIMIT = 100;
const MAX_PIN_LIMIT = 5000;

function asString(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function asNumber(value: unknown): number | undefined { const n = Number(value); return Number.isFinite(n) ? n : undefined; }
function addParam(params: unknown[], value: unknown): string { params.push(value); return `$${params.length}`; }
function milesToDegrees(miles: number): number { return miles / 69; }

function canonicalSource(source?: string): string | undefined {
  if (!source || source === "all") return undefined;
  if (source === "myClinics") return "my-clinics";
  return source;
}

function sourceKindFor(label: string | null): "stored" | "saved" | "candidate" {
  if ((label || "").toLowerCase() === "my clinics") return "saved";
  return "stored";
}

function normalizeRows(rows: Array<Record<string, any>>) {
  return rows.map((row) => {
    const services = Array.isArray(row.services) ? row.services.filter(Boolean) : [];
    const raw = row.raw_source_data || null;
    const clinicType = row.clinic_type || classifyProvider({ name: row.name, services, taxonomy_description: services.join(" "), raw_source_data: raw });
    const sourceKind = row.source_kind || sourceKindFor(row.source);
    return {
      id: String(row.id), source: row.source || "indexed", source_kind: sourceKind, name: row.name || "Unnamed provider",
      clinic_type: clinicType, services, categories: services, address: row.address || null, city: row.city || null,
      admin_area: row.admin_area || null, country: row.country || (row.admin_area ? "US" : null), postal_code: row.postal_code || null,
      lat: row.lat == null ? null : Number(row.lat), lng: row.lng == null ? null : Number(row.lng), phone: row.phone || null,
      website: row.website || null, source_url: row.source_url || null, confidence_score: row.confidence_score == null ? null : Number(row.confidence_score),
      trust_tier: row.trust_tier || "lead", last_seen: row.last_seen || null, imported_at: row.imported_at || null, raw_source_data: raw,
    };
  });
}

function buildWhere(req: Request, schema: "normalized" | "legacy", params: unknown[]) {
  const q = asString(req.query.q); const source = canonicalSource(asString(req.query.source)); const sourceKind = asString(req.query.source_kind);
  const country = asString(req.query.country); const adminArea = asString(req.query.admin_area); const city = asString(req.query.city);
  const postalCode = asString(req.query.postal_code); const clinicType = asString(req.query.clinicType); const service = asString(req.query.service) || asString(req.query.category);
  const north = asNumber(req.query.north), south = asNumber(req.query.south), east = asNumber(req.query.east), west = asNumber(req.query.west);
  const lat = asNumber(req.query.lat), lng = asNumber(req.query.lng), radiusMiles = asNumber(req.query.radiusMiles);
  const latExpr = schema === "normalized" ? "pl.lat" : "mp.lat"; const lngExpr = schema === "normalized" ? "pl.lng" : "mp.lng";
  const cityExpr = schema === "normalized" ? "pl.city" : "mp.locality"; const adminExpr = schema === "normalized" ? "pl.state" : "mp.administrative_area_level_1";
  const postalExpr = schema === "normalized" ? "pl.postal_code" : "mp.postal_code"; const nameExpr = schema === "normalized" ? "p.name" : "mp.name";
  const sourceExpr = schema === "normalized" ? "psrc.source_label" : "mp.data_source";
  const sourceTextExpr = `LOWER(COALESCE(${sourceExpr}, ''))`;
  const countryExpr = schema === "normalized" ? "psrc.raw_data->>'country'" : "COALESCE(mp.country_code, mp.raw_data->>'country')";
  const serviceExpr = schema === "normalized" ? "COALESCE(svc.services_text, '')" : "COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')";
  const where = [`${latExpr} IS NOT NULL`, `${lngExpr} IS NOT NULL`, `${latExpr} BETWEEN -90 AND 90`, `${lngExpr} BETWEEN -180 AND 180`, `(${latExpr} <> 0 OR ${lngExpr} <> 0)`];
  if (source === "live" || source === "candidates") where.push("FALSE");
  if (source && source !== "live" && source !== "candidates") {
    if (source === "indexed") where.push(`${sourceTextExpr} NOT IN ('bluehive','dentist dataset','my clinics')`);
    else where.push(`${sourceTextExpr} = LOWER(${addParam(params, SOURCE_LABELS[source] || source)})`);
  }
  if (sourceKind && sourceKind !== "all") {
    if (sourceKind === "saved") where.push(`${sourceTextExpr} = 'my clinics'`);
    else if (sourceKind === "stored") where.push(`${sourceTextExpr} <> 'my clinics'`);
    else where.push("FALSE");
  }
  if (country) where.push(`LOWER(COALESCE(${countryExpr}, 'US')) = LOWER(${addParam(params, country)})`);
  if (adminArea) where.push(`LOWER(${adminExpr}) = LOWER(${addParam(params, adminArea)})`);
  if (city) where.push(`LOWER(${cityExpr}) = LOWER(${addParam(params, city)})`);
  if (postalCode) where.push(`${postalExpr} ILIKE ${addParam(params, `${postalCode}%`)}`);
  if (service) where.push(`${serviceExpr} ILIKE ${addParam(params, `%${service}%`)}`);
  if (clinicType) where.push(`${serviceExpr} ILIKE ${addParam(params, `%${clinicType}%`)}`);
  if (q) where.push(`(${nameExpr} ILIKE ${addParam(params, `%${q}%`)} OR ${cityExpr} ILIKE ${addParam(params, `%${q}%`)} OR ${serviceExpr} ILIKE ${addParam(params, `%${q}%`)})`);
  if ([north, south, east, west].every((v) => v !== undefined)) { where.push(`${latExpr} BETWEEN ${addParam(params, south)} AND ${addParam(params, north)}`); where.push(west! <= east! ? `${lngExpr} BETWEEN ${addParam(params, west)} AND ${addParam(params, east)}` : `(${lngExpr} >= ${addParam(params, west)} OR ${lngExpr} <= ${addParam(params, east)})`); }
  if (lat !== undefined && lng !== undefined && radiusMiles !== undefined) { const d = milesToDegrees(radiusMiles); where.push(`${latExpr} BETWEEN ${addParam(params, lat - d)} AND ${addParam(params, lat + d)}`); where.push(`${lngExpr} BETWEEN ${addParam(params, lng - d)} AND ${addParam(params, lng + d)}`); where.push(`(3959 * acos(least(1, greatest(-1, cos(radians(${addParam(params, lat)})) * cos(radians(${latExpr})) * cos(radians(${lngExpr}) - radians(${addParam(params, lng)})) + sin(radians(${addParam(params, lat)})) * sin(radians(${latExpr})))))) <= ${addParam(params, radiusMiles)}`); }
  return where;
}

function baseSql(schema: "normalized" | "legacy") {
  if (schema === "legacy") return `FROM public.medical_providers mp WHERE`;
  return `FROM providers p INNER JOIN provider_locations pl ON pl.provider_id=p.id LEFT JOIN provider_contacts pc ON pc.provider_id=p.id LEFT JOIN LATERAL (SELECT array_agg(DISTINCT service_type) services, string_agg(DISTINCT COALESCE(service_type,'') || ' ' || COALESCE(taxonomy,''), ' ') services_text FROM provider_services WHERE provider_id=p.id) svc ON true INNER JOIN LATERAL (SELECT source_label, source_url, trust_tier, raw_data, fetched_at, created_at FROM provider_sources WHERE provider_id=p.id ORDER BY CASE WHEN source_label='My Clinics' THEN 0 ELSE 1 END, id ASC LIMIT 1) psrc ON true WHERE`;
}

function selectSql(schema: "normalized" | "legacy") {
  if (schema === "legacy") return `SELECT mp.source_id AS id, mp.name, mp.formatted_address AS address, mp.locality AS city, mp.administrative_area_level_1 AS admin_area, COALESCE(mp.country_code, mp.raw_data->>'country','US') AS country, mp.postal_code, mp.lat, mp.lng, mp.phone, mp.website, mp.data_source AS source, mp.source_type, mp.source_url, mp.confidence_score, mp.category, mp.types AS services, mp.raw_data AS raw_source_data, mp.created_at AS imported_at, mp.updated_at AS last_seen, 'directory' AS trust_tier`;
  return `SELECT p.id, p.name, pl.address, pl.city, pl.state AS admin_area, COALESCE(psrc.raw_data->>'country','US') AS country, pl.postal_code, pl.lat, pl.lng, pc.phone, pc.website, psrc.source_label AS source, psrc.source_url, NULL::numeric AS confidence_score, svc.services, psrc.raw_data AS raw_source_data, psrc.created_at AS imported_at, psrc.fetched_at AS last_seen, psrc.trust_tier`;
}

async function handle(req: Request, res: Response, forcedMode?: Mode) {
  if (!isPersistenceConfigured()) { res.json({ providers: [], total: 0, count: 0, page: 1, limit: 0, hasMore: false, mode: forcedMode || req.query.mode || "records" }); return; }
  const pool = getPool(); const schema = await detectProviderSchema(pool);
  if (schema === "none") { res.json({ providers: [], total: 0, count: 0, note: "No provider table available" }); return; }
  const mode = forcedMode || (asString(req.query.mode) as Mode) || "records"; const params: unknown[] = []; const where = buildWhere(req, schema, params).join(" AND "); const from = baseSql(schema);
  const count = await queryWithStatementTimeout(pool, `SELECT count(*)::int AS total ${from} ${where}`, params);
  const total = Number(count.rows[0]?.total || 0);
  if (mode === "facets") {
    const serviceFacetExpr = "unnest(COALESCE(x.services::text[], ARRAY[]::text[]))";
    const facetSql = `
      SELECT source, source_kind, country, admin_area, city, clinic_type, service, count(*)::int count
      FROM (
        SELECT x.source, CASE WHEN x.source='My Clinics' THEN 'saved' ELSE 'stored' END source_kind,
          x.country, x.admin_area, x.city, 'unknown' clinic_type, NULL::text service
        FROM (${selectSql(schema)} ${from} ${where}) x
        UNION ALL
        SELECT NULL::text source, NULL::text source_kind, NULL::text country, NULL::text admin_area, NULL::text city,
          NULL::text clinic_type, ${serviceFacetExpr} service
        FROM (${selectSql(schema)} ${from} ${where}) x
      ) f
      GROUP BY GROUPING SETS ((source),(source_kind),(country),(admin_area),(city),(clinic_type),(service))
      HAVING count(*) > 0`;
    const rows = (await queryWithStatementTimeout(pool, facetSql, params)).rows;
    res.json({ total, facets: rows });
    return;
  }
  if (mode === "density" || mode === "hex") { const precision = Math.max(1, Math.min(10, Number(req.query.precision) || (mode === "hex" ? 2 : 1))); const latExpr = schema === "normalized" ? "pl.lat" : "mp.lat"; const lngExpr = schema === "normalized" ? "pl.lng" : "mp.lng"; const rows = (await queryWithStatementTimeout(pool, `SELECT round((${latExpr})::numeric, ${precision})::float lat, round((${lngExpr})::numeric, ${precision})::float lng, count(*)::int count ${from} ${where} GROUP BY 1,2 ORDER BY count DESC LIMIT 2000`, params)).rows; res.json({ mode, total, cells: rows, count: rows.length, precision }); return; }
  const page = Math.max(1, Number(req.query.page) || 1); const maxLimit = mode === "pins" ? MAX_PIN_LIMIT : MAX_RECORD_LIMIT; const limit = Math.min(Math.max(1, Number(req.query.limit) || (mode === "pins" ? 1000 : 25)), maxLimit); const offset = (page - 1) * limit;
  params.push(limit, offset); const rows = (await queryWithStatementTimeout(pool, `${selectSql(schema)} ${from} ${where} ORDER BY id ASC LIMIT $${params.length - 1} OFFSET $${params.length}`, params)).rows;
  const providers = normalizeRows(rows); res.json({ mode, providers, records: providers, total, count: providers.length, page, limit, hasMore: offset + providers.length < total, visibleCount: providers.length, sourceNote: "Live adapters are intentionally not persisted; save/candidate writes require explicit action." });
}

function routeHandler(forcedMode?: Mode) {
  return (req: Request, res: Response) => {
    void handle(req, res, forcedMode).catch((e) => {
      res.status(200).json({
        providers: [],
        records: [],
        cells: [],
        facets: [],
        total: 0,
        count: 0,
        page: 1,
        limit: 0,
        hasMore: false,
        mode: forcedMode || req.query.mode || "records",
        error: e?.message || "Provider explorer failed",
      });
    });
  };
}

router.get("/provider-explorer", routeHandler());
router.get("/provider-explorer/map", routeHandler("pins"));
router.get("/provider-explorer/density", routeHandler("density"));
router.get("/provider-explorer/hex", routeHandler("hex"));
router.get("/provider-explorer/facets", routeHandler("facets"));
router.post("/provider-explorer/save-candidate", (_req: Request, res: Response) => res.status(501).json({ error: "Safe save-candidate workflow is scaffolded only; no provider data was written." }));
export default router;

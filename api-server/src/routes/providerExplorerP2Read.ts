import { Router, type NextFunction, type Request, type Response } from "express";
import { getPool } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { queryWithStatementTimeout } from "../lib/queryWithStatementTimeout";
import { parseOptionalNumber } from "../lib/providerCoordinates";

const router = Router();
const MAX_RECORD_LIMIT = 100;
const MAX_PIN_LIMIT = 5000;

const SOURCE_LABELS: Record<string, string> = {
  bluehive: "BlueHive",
  dentists: "Dentist Dataset",
  indexed: "indexed",
  "my-clinics": "My Clinics",
  saved: "My Clinics",
};

type Bounds = { north: number; south: number; east: number; west: number };
type QueryMode = "records" | "pins";

type QueryContext = {
  mode: QueryMode;
  page: number;
  limit: number;
  bounds: Bounds | null;
  source?: string;
  sourceKind?: string;
  q?: string;
  country?: string;
  adminArea?: string;
  city?: string;
  service?: string;
  includeStored: boolean;
  includeSaved: boolean;
  includeCandidates: boolean;
};

type ProviderRow = Record<string, unknown> & { id?: string | null };

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === true || value === "true" || value === "1";
}

function asNumber(value: unknown): number | undefined {
  return parseOptionalNumber(value) ?? undefined;
}

function addParam(params: unknown[], value: unknown): string {
  params.push(value);
  return `$${params.length}`;
}

function parseBounds(req: Request): Bounds | null {
  const north = asNumber(req.query.north);
  const south = asNumber(req.query.south);
  const east = asNumber(req.query.east);
  const west = asNumber(req.query.west);
  if ([north, south, east, west].some((value) => value === undefined)) return null;
  return { north: north!, south: south!, east: east!, west: west! };
}

function parseContext(req: Request, mode: QueryMode): QueryContext {
  const maxLimit = mode === "pins" ? MAX_PIN_LIMIT : MAX_RECORD_LIMIT;
  const requestedLimit = Number(req.query.limit) || (mode === "pins" ? 1000 : 25);
  return {
    mode,
    page: Math.max(1, Number(req.query.page) || 1),
    limit: Math.min(Math.max(1, requestedLimit), maxLimit),
    bounds: parseBounds(req),
    source: asString(req.query.source),
    sourceKind: asString(req.query.source_kind),
    q: asString(req.query.q),
    country: asString(req.query.country),
    adminArea: asString(req.query.admin_area),
    city: asString(req.query.city),
    service: asString(req.query.service) || asString(req.query.category),
    includeStored: asBool(req.query.includeStored, true),
    includeSaved: asBool(req.query.includeSaved, true),
    includeCandidates: asBool(req.query.includeCandidates, false),
  };
}

export function p2LegacyProviderSelectForTest(): string {
  return `SELECT
    COALESCE(NULLIF(mp.source_id, ''), 'legacy:' || mp.id::text) AS id,
    mp.name,
    lower(regexp_replace(COALESCE(mp.name,''),'[^a-zA-Z0-9]+',' ','g')) AS normalized_name,
    mp.formatted_address AS address,
    mp.locality AS city,
    mp.administrative_area_level_1 AS admin_area,
    COALESCE(mp.country_code, mp.raw_data->>'country', 'US') AS country,
    mp.postal_code,
    mp.lat,
    mp.lng,
    mp.phone,
    mp.website,
    mp.data_source AS source,
    CASE WHEN lower(COALESCE(mp.data_source,''))='my clinics' THEN 'saved' ELSE 'stored' END AS source_kind,
    COALESCE(mp.raw_data->>'source_url', mp.raw_data->>'url', mp.website)::text AS source_url,
    mp.confidence_score,
    mp.category,
    mp.types AS services,
    mp.types AS categories,
    mp.raw_data AS raw_source_data,
    COALESCE(mp.scraped_at, mp.updated_at) AS imported_at,
    mp.updated_at AS last_seen,
    CASE
      WHEN mp.confidence_score >= 0.85 THEN 'verified'
      WHEN mp.confidence_score >= 0.70 THEN 'registry'
      WHEN mp.confidence_score >= 0.50 THEN 'directory'
      ELSE 'lead'
    END AS trust_tier,
    NULL::text AS status
  FROM public.medical_providers mp`;
}

function buildLegacyWhere(ctx: QueryContext, params: unknown[]): string {
  const sourceExpr = "lower(COALESCE(mp.data_source,''))";
  const conditions = [
    "mp.lat IS NOT NULL",
    "mp.lng IS NOT NULL",
    "mp.lat BETWEEN -90 AND 90",
    "mp.lng BETWEEN -180 AND 180",
    "(mp.lat <> 0 OR mp.lng <> 0)",
    "NULLIF(btrim(mp.name), '') IS NOT NULL",
    "lower(btrim(mp.name)) NOT IN ('nan','null','none','n/a','na','unnamed','unnamed clinic')",
  ];

  if (!ctx.includeStored && !ctx.includeSaved) conditions.push("FALSE");

  if (ctx.source && ctx.source !== "all") {
    if (ctx.source === "live" || ctx.source === "candidates") conditions.push("FALSE");
    else if (ctx.source === "indexed") conditions.push(`${sourceExpr} NOT IN ('bluehive','dentist dataset','my clinics')`);
    else conditions.push(`${sourceExpr} = lower(${addParam(params, SOURCE_LABELS[ctx.source] || ctx.source)})`);
  }

  if (ctx.sourceKind && ctx.sourceKind !== "all") {
    if (ctx.sourceKind === "saved") conditions.push(`${sourceExpr} = 'my clinics'`);
    else if (ctx.sourceKind === "stored") conditions.push(`${sourceExpr} <> 'my clinics'`);
    else conditions.push("FALSE");
  } else {
    if (!ctx.includeStored) conditions.push(`${sourceExpr} = 'my clinics'`);
    if (!ctx.includeSaved) conditions.push(`${sourceExpr} <> 'my clinics'`);
  }

  if (ctx.bounds) {
    conditions.push(`mp.lat BETWEEN ${addParam(params, ctx.bounds.south)} AND ${addParam(params, ctx.bounds.north)}`);
    conditions.push(
      ctx.bounds.west <= ctx.bounds.east
        ? `mp.lng BETWEEN ${addParam(params, ctx.bounds.west)} AND ${addParam(params, ctx.bounds.east)}`
        : `(mp.lng >= ${addParam(params, ctx.bounds.west)} OR mp.lng <= ${addParam(params, ctx.bounds.east)})`,
    );
  }
  if (ctx.country) conditions.push(`lower(COALESCE(mp.country_code, mp.raw_data->>'country', 'US')) = lower(${addParam(params, ctx.country)})`);
  if (ctx.adminArea) conditions.push(`lower(COALESCE(mp.administrative_area_level_1,'')) = lower(${addParam(params, ctx.adminArea)})`);
  if (ctx.city) conditions.push(`lower(COALESCE(mp.locality,'')) = lower(${addParam(params, ctx.city)})`);
  if (ctx.service) conditions.push(`(COALESCE(mp.category,'') || ' ' || COALESCE(array_to_string(mp.types,' '),'')) ILIKE ${addParam(params, `%${ctx.service}%`)}`);
  if (ctx.q) {
    const pattern = `%${ctx.q}%`;
    conditions.push(`(
      mp.name ILIKE ${addParam(params, pattern)}
      OR COALESCE(mp.locality,'') ILIKE ${addParam(params, pattern)}
      OR COALESCE(mp.administrative_area_level_1,'') ILIKE ${addParam(params, pattern)}
      OR (COALESCE(mp.category,'') || ' ' || COALESCE(array_to_string(mp.types,' '),'')) ILIKE ${addParam(params, pattern)}
    )`);
  }
  return conditions.join(" AND ");
}

function buildCandidateWhere(ctx: QueryContext, params: unknown[]): string {
  const conditions = [
    "pc.lat IS NOT NULL",
    "pc.lng IS NOT NULL",
    "pc.lat BETWEEN -90 AND 90",
    "pc.lng BETWEEN -180 AND 180",
    "(pc.lat <> 0 OR pc.lng <> 0)",
    "NULLIF(btrim(pc.name), '') IS NOT NULL",
  ];

  const wantsSaved = ctx.includeSaved && (!ctx.sourceKind || ctx.sourceKind === "all" || ctx.sourceKind === "saved")
    && (!ctx.source || ["all", "saved", "my-clinics"].includes(ctx.source));
  const wantsCandidates = ctx.includeCandidates && (!ctx.sourceKind || ctx.sourceKind === "all" || ctx.sourceKind === "candidate")
    && (!ctx.source || ["all", "candidates"].includes(ctx.source));

  if (wantsSaved && wantsCandidates) conditions.push("pc.status IN ('saved','candidate')");
  else if (wantsSaved) conditions.push("pc.status = 'saved'");
  else if (wantsCandidates) conditions.push("pc.status = 'candidate'");
  else conditions.push("FALSE");

  if (ctx.bounds) {
    conditions.push(`pc.lat BETWEEN ${addParam(params, ctx.bounds.south)} AND ${addParam(params, ctx.bounds.north)}`);
    conditions.push(
      ctx.bounds.west <= ctx.bounds.east
        ? `pc.lng BETWEEN ${addParam(params, ctx.bounds.west)} AND ${addParam(params, ctx.bounds.east)}`
        : `(pc.lng >= ${addParam(params, ctx.bounds.west)} OR pc.lng <= ${addParam(params, ctx.bounds.east)})`,
    );
  }
  if (ctx.country) conditions.push(`lower(COALESCE(pc.country,'US')) = lower(${addParam(params, ctx.country)})`);
  if (ctx.adminArea) conditions.push(`lower(COALESCE(pc.admin_area,'')) = lower(${addParam(params, ctx.adminArea)})`);
  if (ctx.city) conditions.push(`lower(COALESCE(pc.city,'')) = lower(${addParam(params, ctx.city)})`);
  if (ctx.service) conditions.push(`(COALESCE(pc.clinic_type,'') || ' ' || COALESCE(array_to_string(pc.services,' '),'') || ' ' || COALESCE(array_to_string(pc.categories,' '),'')) ILIKE ${addParam(params, `%${ctx.service}%`)}`);
  if (ctx.q) {
    const pattern = `%${ctx.q}%`;
    conditions.push(`(
      pc.name ILIKE ${addParam(params, pattern)}
      OR COALESCE(pc.city,'') ILIKE ${addParam(params, pattern)}
      OR COALESCE(pc.admin_area,'') ILIKE ${addParam(params, pattern)}
      OR (COALESCE(pc.clinic_type,'') || ' ' || COALESCE(array_to_string(pc.services,' '),'') || ' ' || COALESCE(array_to_string(pc.categories,' '),'')) ILIKE ${addParam(params, pattern)}
    )`);
  }
  return conditions.join(" AND ");
}

async function relationExists(pool: ReturnType<typeof getPool>, relation: string): Promise<boolean> {
  const result = await pool.query("SELECT to_regclass($1) IS NOT NULL AS ok", [`public.${relation}`]);
  return result.rows[0]?.ok === true;
}

function normalizeRows(rows: ProviderRow[]): ProviderRow[] {
  return rows.map((row) => ({
    ...row,
    id: String(row.id || ""),
    lat: row.lat == null ? null : Number(row.lat),
    lng: row.lng == null ? null : Number(row.lng),
    confidence_score: row.confidence_score == null ? null : Number(row.confidence_score),
  }));
}

function uniqueRows(rows: ProviderRow[]): ProviderRow[] {
  const seen = new Set<string>();
  const result: ProviderRow[] = [];
  for (const row of rows) {
    const id = String(row.id || "");
    const key = id || `${row.source || ""}|${row.name || ""}|${row.lat || ""}|${row.lng || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }
  return result;
}

async function handleP2Read(req: Request, res: Response, mode: QueryMode): Promise<void> {
  if (!isPersistenceConfigured()) {
    res.json({ mode, providers: [], records: [], total: 0, count: 0, page: 1, limit: 0, hasMore: false, status: { persistenceConfigured: false } });
    return;
  }

  const ctx = parseContext(req, mode);
  const pool = getPool();
  const offset = (ctx.page - 1) * ctx.limit;

  const storedParams: unknown[] = [];
  const storedWhere = buildLegacyWhere(ctx, storedParams);
  const storedTotalResult = await queryWithStatementTimeout(
    pool,
    `SELECT count(*)::int AS total FROM public.medical_providers mp WHERE ${storedWhere}`,
    storedParams,
  );
  const storedTotal = Number(storedTotalResult.rows[0]?.total || 0);
  const storedDataParams = [...storedParams, ctx.limit, offset];
  const storedRows = (await queryWithStatementTimeout(
    pool,
    `${p2LegacyProviderSelectForTest()} WHERE ${storedWhere} ORDER BY mp.id ASC LIMIT $${storedDataParams.length - 1} OFFSET $${storedDataParams.length}`,
    storedDataParams,
  )).rows as ProviderRow[];

  let candidateTotal = 0;
  let candidateRows: ProviderRow[] = [];
  if (await relationExists(pool, "provider_candidates")) {
    const candidateParams: unknown[] = [];
    const candidateWhere = buildCandidateWhere(ctx, candidateParams);
    candidateTotal = Number((await queryWithStatementTimeout(
      pool,
      `SELECT count(*)::int AS total FROM public.provider_candidates pc WHERE ${candidateWhere}`,
      candidateParams,
    )).rows[0]?.total || 0);
    const candidateDataParams = [...candidateParams, ctx.limit, offset];
    candidateRows = (await queryWithStatementTimeout(
      pool,
      `SELECT
        pc.id::text AS id,
        pc.source_label AS source,
        pc.source_kind,
        pc.name,
        pc.normalized_name,
        pc.clinic_type,
        pc.services,
        pc.categories,
        pc.address,
        pc.city,
        pc.admin_area,
        pc.country,
        pc.postal_code,
        pc.lat,
        pc.lng,
        pc.phone,
        pc.website,
        pc.source_url,
        pc.confidence_score,
        pc.trust_tier,
        pc.raw_source_data,
        pc.created_at AS imported_at,
        pc.last_seen,
        pc.status
      FROM public.provider_candidates pc
      WHERE ${candidateWhere}
      ORDER BY pc.updated_at DESC
      LIMIT $${candidateDataParams.length - 1} OFFSET $${candidateDataParams.length}`,
      candidateDataParams,
    )).rows as ProviderRow[];
  }

  const providers = uniqueRows(normalizeRows([...storedRows, ...candidateRows])).slice(0, ctx.limit);
  const total = storedTotal + candidateTotal;
  res.setHeader("X-Network-Map-P2-Read", "legacy-schema-compat");
  res.json({
    mode,
    providers,
    records: providers,
    total,
    count: providers.length,
    page: ctx.page,
    limit: ctx.limit,
    hasMore: ctx.page * ctx.limit < total,
    visibleCount: providers.length,
    visibleCapped: false,
    status: { persistenceConfigured: true, schema: "legacy", compatibilityRoute: true },
  });
}

function p2Only(mode: QueryMode) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.query.p2 !== "1") {
      next();
      return;
    }
    void handleP2Read(req, res, mode).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[ProviderExplorerP2Read] request failed", { mode, path: req.path, message });
      res.status(200).json({
        mode,
        providers: [],
        records: [],
        total: 0,
        count: 0,
        page: 1,
        limit: 0,
        hasMore: false,
        visibleCapped: false,
        error: "Provider explorer record query failed",
        detail: message,
      });
    });
  };
}

router.get("/provider-explorer", p2Only("records"));
router.get("/provider-explorer/map", p2Only("pins"));

export default router;

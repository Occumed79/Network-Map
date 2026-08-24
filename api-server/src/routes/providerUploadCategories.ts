import { Router, type Request, type Response } from "express";
import { getPool } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { parseOptionalNumber } from "../lib/providerCoordinates";
import { queryWithStatementTimeout } from "../lib/queryWithStatementTimeout";

const router = Router();
const MAX_PAGE_SIZE = 5000;
const DEFAULT_UPLOAD_SOURCE_KEY = "my_clinics_upload";

type Bounds = { north: number; south: number; east: number; west: number };

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function asBounds(req: Request): Bounds | null {
  const useBounds = req.query.useBounds === "true" || req.query.bounds === "true";
  if (!useBounds) return null;
  const north = parseOptionalNumber(req.query.north);
  const south = parseOptionalNumber(req.query.south);
  const east = parseOptionalNumber(req.query.east);
  const west = parseOptionalNumber(req.query.west);
  if (north === null || south === null || east === null || west === null) return null;
  return { north, south, east, west };
}

async function uploadedSourceExists(sourceKey: string): Promise<boolean> {
  const { rows } = await queryWithStatementTimeout(
    getPool(),
    `SELECT EXISTS (
       SELECT 1
       FROM public.provider_source_catalog
       WHERE source_key = $1
         AND active = true
         AND source_kind = 'user_upload'
         AND source_key <> $2
     ) AS ok`,
    [sourceKey, DEFAULT_UPLOAD_SOURCE_KEY],
  );
  return rows[0]?.ok === true;
}

function buildWhere(sourceKey: string, bounds: Bounds | null, params: unknown[]): string {
  params.push(sourceKey);
  const conditions = [
    "lower(COALESCE(pmv.source_key, '')) = lower($1)",
    "pmv.lat IS NOT NULL",
    "pmv.lng IS NOT NULL",
    "pmv.lat BETWEEN -90 AND 90",
    "pmv.lng BETWEEN -180 AND 180",
    "(pmv.lat <> 0 OR pmv.lng <> 0)",
  ];

  if (bounds) {
    params.push(bounds.south, bounds.north);
    conditions.push(`pmv.lat BETWEEN $${params.length - 1} AND $${params.length}`);
    if (bounds.west <= bounds.east) {
      params.push(bounds.west, bounds.east);
      conditions.push(`pmv.lng BETWEEN $${params.length - 1} AND $${params.length}`);
    } else {
      params.push(bounds.west, bounds.east);
      conditions.push(`(pmv.lng >= $${params.length - 1} OR pmv.lng <= $${params.length})`);
    }
  }

  return conditions.join(" AND ");
}

function toProvider(row: Record<string, unknown>): Record<string, unknown> {
  const type = String(row.primary_provider_type || "unknown");
  const tags = Array.isArray(row.capability_tags) ? row.capability_tags.map(String) : [type];
  return {
    id: String(row.master_key || row.id || ""),
    source_id: String(row.master_key || row.id || ""),
    name: String(row.name || "Unnamed provider"),
    address: row.address ?? null,
    address_1: row.address ?? null,
    city: row.city ?? null,
    admin_area: row.admin_area ?? null,
    state: row.admin_area ?? null,
    postal_code: row.postal_code ?? null,
    zip: row.postal_code ?? null,
    lat: Number(row.lat),
    lng: Number(row.lng),
    phone: row.phone ?? null,
    website: row.website ?? null,
    clinic_type: type,
    providerType: type,
    category: type,
    services: tags,
    categories: tags,
    types: tags,
    source: String(row.source_key || "uploaded"),
    data_source: String(row.source_key || "uploaded"),
    source_kind: String(row.source_kind || "stored"),
    confidence_score: row.quality_score == null ? null : Number(row.quality_score),
  };
}

router.get("/provider-upload-categories", async (_req: Request, res: Response) => {
  try {
    if (!isPersistenceConfigured()) {
      res.json({ categories: [], count: 0 });
      return;
    }

    const { rows } = await queryWithStatementTimeout(
      getPool(),
      `SELECT
         catalog.source_key,
         catalog.display_name,
         catalog.source_kind,
         count(pmv.id)::int AS total
       FROM public.provider_source_catalog catalog
       LEFT JOIN public.provider_master_map_view pmv
         ON lower(COALESCE(pmv.source_key, '')) = lower(catalog.source_key)
       WHERE catalog.active = true
         AND catalog.source_kind = 'user_upload'
         AND catalog.source_key <> $1
       GROUP BY catalog.source_key, catalog.display_name, catalog.source_kind
       ORDER BY lower(catalog.display_name), catalog.source_key`,
      [DEFAULT_UPLOAD_SOURCE_KEY],
    );

    const categories = rows.map((row) => ({
      id: `uploaded-source-${row.source_key}`,
      label: text(row.display_name) || text(row.source_key) || "Uploaded dataset",
      sourceKey: text(row.source_key),
      total: Number(row.total || 0),
    }));
    res.json({ categories, count: categories.length });
  } catch (error) {
    console.error("[ProviderUploadCategories] catalog query failed:", error);
    res.status(503).json({
      categories: [],
      count: 0,
      error: error instanceof Error ? error.message : "Uploaded dataset catalog query failed",
      transientFailure: true,
    });
  }
});

router.get("/provider-upload-categories/:sourceKey", async (req: Request, res: Response) => {
  const rawSourceKey = req.params.sourceKey;
  const sourceKey = Array.isArray(rawSourceKey) ? text(rawSourceKey[0]) : text(rawSourceKey);
  if (!sourceKey || sourceKey.length > 120) {
    res.status(400).json({ error: "A valid uploaded dataset source key is required." });
    return;
  }

  try {
    if (!isPersistenceConfigured()) {
      res.json({ providers: [], count: 0, loaded: 0, total: 0, page: 1, limit: 0, hasMore: false, sourceKey, visibleCapped: false });
      return;
    }
    if (!(await uploadedSourceExists(sourceKey))) {
      res.status(404).json({ error: "Uploaded dataset category was not found.", sourceKey });
      return;
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 2000, 1), MAX_PAGE_SIZE);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const bounds = asBounds(req);

    const countParams: unknown[] = [];
    const countWhere = buildWhere(sourceKey, bounds, countParams);
    const countResult = await queryWithStatementTimeout(
      getPool(),
      `SELECT count(*)::int AS total
       FROM public.provider_master_map_view pmv
       WHERE ${countWhere}`,
      countParams,
    );
    const total = Number(countResult.rows[0]?.total || 0);

    const rowParams: unknown[] = [];
    const rowWhere = buildWhere(sourceKey, bounds, rowParams);
    rowParams.push(limit, (page - 1) * limit);
    const limitParam = `$${rowParams.length - 1}`;
    const offsetParam = `$${rowParams.length}`;
    const { rows } = await queryWithStatementTimeout(
      getPool(),
      `SELECT
         pmv.id,
         pmv.master_key,
         pmv.name,
         pmv.address,
         pmv.city,
         pmv.admin_area,
         pmv.postal_code,
         pmv.lat,
         pmv.lng,
         pmv.phone,
         pmv.website,
         pmv.primary_provider_type,
         pmv.capability_tags,
         pmv.source_key,
         pmv.source_kind,
         pmv.quality_score
       FROM public.provider_master_map_view pmv
       WHERE ${rowWhere}
       ORDER BY pmv.name ASC, pmv.id ASC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      rowParams,
    );

    const providers = rows.map((row) => toProvider(row));
    res.json({
      providers,
      count: providers.length,
      loaded: providers.length,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      sourceKey,
      visibleCapped: false,
    });
  } catch (error) {
    console.error(`[ProviderUploadCategories] ${sourceKey} query failed:`, error);
    res.status(503).json({
      providers: [],
      count: 0,
      loaded: 0,
      total: 0,
      sourceKey,
      error: error instanceof Error ? error.message : "Uploaded dataset layer query failed",
      transientFailure: true,
      visibleCapped: false,
    });
  }
});

export default router;

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
    `EXISTS (
       SELECT 1
       FROM public.provider_master_sources pms
       WHERE pms.master_provider_id = pm.id
         AND pms.source_key = $1
     )`,
    "pm.active = true",
    "pm.lat IS NOT NULL",
    "pm.lng IS NOT NULL",
    "pm.lat BETWEEN -90 AND 90",
    "pm.lng BETWEEN -180 AND 180",
    "(pm.lat <> 0 OR pm.lng <> 0)",
  ];

  if (bounds) {
    params.push(bounds.south, bounds.north);
    conditions.push(`pm.lat BETWEEN $${params.length - 1} AND $${params.length}`);
    if (bounds.west <= bounds.east) {
      params.push(bounds.west, bounds.east);
      conditions.push(`pm.lng BETWEEN $${params.length - 1} AND $${params.length}`);
    } else {
      params.push(bounds.west, bounds.east);
      conditions.push(`(pm.lng >= $${params.length - 1} OR pm.lng <= $${params.length})`);
    }
  }

  return conditions.join(" AND ");
}

function toProvider(row: Record<string, unknown>, sourceKey: string): Record<string, unknown> {
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
    source: sourceKey,
    data_source: sourceKey,
    source_kind: "stored",
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
         count(DISTINCT pm.id)::int AS total
       FROM public.provider_source_catalog catalog
       LEFT JOIN public.provider_master_sources pms
         ON pms.source_key = catalog.source_key
       LEFT JOIN public.provider_master pm
         ON pm.id = pms.master_provider_id
        AND pm.active = true
        AND pm.lat IS NOT NULL
        AND pm.lng IS NOT NULL
        AND pm.lat BETWEEN -90 AND 90
        AND pm.lng BETWEEN -180 AND 180
        AND (pm.lat <> 0 OR pm.lng <> 0)
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
  if (!sourceKey || sourceKey.length > 120 || !/^user_upload_[a-z0-9_]+$/.test(sourceKey)) {
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
       FROM public.provider_master pm
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
         pm.id,
         pm.master_key,
         pm.name,
         pm.formatted_address AS address,
         pm.city,
         pm.state_region AS admin_area,
         pm.postal_code,
         pm.lat,
         pm.lng,
         pm.phone,
         pm.website,
         pm.primary_provider_type,
         pm.capability_tags,
         pm.quality_score
       FROM public.provider_master pm
       WHERE ${rowWhere}
       ORDER BY pm.name ASC, pm.id ASC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      rowParams,
    );

    const providers = rows.map((row) => toProvider(row, sourceKey));
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

/**
 * NACCHO Local Health Department layer — Issue #37
 *
 * Serves Local Health Department (LHD) records from the NACCHO directory.
 * These are external directory records, NOT confirmed medical service providers.
 *
 * All records are labelled with source attribution:
 *   source = "NACCHO Local Health Department Directory"
 *   trust_tier = "directory"
 *   source_kind = "stored"
 *
 * Phone numbers are returned as stored (public domain). No scraping or
 * obfuscation-bypass is performed.
 *
 * Coverage: all U.S. states and DC.
 */

import { Router, type Request, type Response } from "express";
import { getPool } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { queryWithStatementTimeout } from "../lib/queryWithStatementTimeout";

const router = Router();

type Bounds = { north: number; south: number; east: number; west: number };

function asFinite(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function addParam(params: (string | number)[], value: string | number): string {
  params.push(value);
  return `$${params.length}`;
}

const TABLE_NAME = "naccho_lhd";
const MAX_LIMIT = 2000;

/** Ensure the NACCHO table exists; idempotent. */
async function ensureTable(pool: ReturnType<typeof getPool>): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      lhd_id text UNIQUE,
      name text NOT NULL,
      agency_type text,
      address text,
      city text,
      state_code varchar(2) NOT NULL,
      postal_code text,
      lat double precision,
      lng double precision,
      phone text,
      website text,
      source_url text,
      public_health_services text[] DEFAULT ARRAY[]::text[],
      raw_data jsonb DEFAULT '{}'::jsonb,
      imported_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_naccho_lhd_state ON ${TABLE_NAME} (state_code)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_naccho_lhd_lat_lng ON ${TABLE_NAME} (lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_naccho_lhd_lhd_id ON ${TABLE_NAME} (lhd_id) WHERE lhd_id IS NOT NULL`);
}

let tableReady: Promise<void> | null = null;
function getTableReady(pool: ReturnType<typeof getPool>): Promise<void> {
  if (!tableReady) tableReady = ensureTable(pool).catch(() => { tableReady = null; });
  return tableReady;
}

/** Map a raw DB row to the ProviderFeature-compatible shape. */
function toFeature(row: Record<string, unknown>) {
  return {
    id: `naccho:${String(row.id || row.lhd_id || "")}`,
    name: String(row.name || "Local Health Department"),
    normalized_name: String(row.name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
    clinic_type: "local_health_department",
    services: Array.isArray(row.public_health_services) ? row.public_health_services : [],
    categories: ["public_health", "local_health_department"],
    address: row.address as string | null ?? null,
    city: row.city as string | null ?? null,
    admin_area: row.state_code as string | null ?? null,
    country: "US",
    postal_code: row.postal_code as string | null ?? null,
    lat: row.lat == null ? null : Number(row.lat),
    lng: row.lng == null ? null : Number(row.lng),
    // Phone is returned as stored — public directory data only
    phone: row.phone as string | null ?? null,
    website: row.website as string | null ?? null,
    source_url: (row.source_url as string | null) ??
      "https://www.naccho.org/membership/lhd-directory",
    source: "NACCHO Local Health Department Directory",
    source_kind: "stored" as const,
    trust_tier: "directory" as const,
    confidence_score: 0.55,
    last_seen: row.updated_at as string | null ?? null,
    imported_at: row.imported_at as string | null ?? null,
    // Attribution tag so consumers know this is an external directory record
    external_directory: true,
    not_confirmed_provider: true,
    raw_source_data: row.raw_data ?? null,
  };
}

/**
 * GET /api/naccho-lhd
 *
 * Query parameters:
 *   state       — two-letter state code filter (optional)
 *   north/south/east/west — bounding box (optional; requires useBounds=true)
 *   useBounds   — must be "true" for bounds to take effect
 *   q           — free-text name search
 *   limit       — max 2000, default 500
 *   page        — 1-based
 */
router.get("/naccho-lhd", async (req: Request, res: Response) => {
  try {
    if (!isPersistenceConfigured()) {
      res.json({
        providers: [],
        total: 0,
        count: 0,
        source: "NACCHO Local Health Department Directory",
        warning: "Database not configured",
        externalDirectory: true,
      });
      return;
    }

    const pool = getPool();
    await getTableReady(pool);

    const params: (string | number)[] = [];
    const conditions: string[] = ["lat IS NOT NULL", "lng IS NOT NULL"];

    const state = typeof req.query.state === "string" ? req.query.state.trim().toUpperCase() : null;
    if (state && /^[A-Z]{2}$/.test(state)) {
      conditions.push(`state_code = ${addParam(params, state)}`);
    }

    const q = typeof req.query.q === "string" ? req.query.q.trim() : null;
    if (q) {
      conditions.push(`(name ILIKE ${addParam(params, `%${q}%`)} OR city ILIKE ${addParam(params, `%${q}%`)} OR array_to_string(public_health_services, ' ') ILIKE ${addParam(params, `%${q}%`)})`);
    }

    const useBounds = req.query.useBounds === "true" || req.query.bounds === "true";
    const north = asFinite(req.query.north);
    const south = asFinite(req.query.south);
    const east = asFinite(req.query.east);
    const west = asFinite(req.query.west);
    if (useBounds && north !== null && south !== null && east !== null && west !== null) {
      conditions.push(`lat BETWEEN ${addParam(params, south)} AND ${addParam(params, north)}`);
      conditions.push(
        west <= east
          ? `lng BETWEEN ${addParam(params, west)} AND ${addParam(params, east)}`
          : `(lng >= ${addParam(params, west)} OR lng <= ${addParam(params, east)})`,
      );
    }

    const where = conditions.join(" AND ");
    const limit = Math.min(Math.max(Number(req.query.limit) || 500, 1), MAX_LIMIT);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;

    const totalResult = await queryWithStatementTimeout(
      pool,
      `SELECT count(*)::int AS total FROM ${TABLE_NAME} WHERE ${where}`,
      params,
    );
    const total = Number(totalResult.rows[0]?.total || 0);

    const dataParams = [...params, limit, offset];
    const { rows } = await queryWithStatementTimeout(
      pool,
      `SELECT id, lhd_id, name, agency_type, address, city, state_code, postal_code, lat, lng,
              phone, website, source_url, public_health_services, raw_data, imported_at, updated_at
       FROM ${TABLE_NAME}
       WHERE ${where}
       ORDER BY state_code, name ASC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams,
    );

    const providers = rows.map(toFeature);

    res.json({
      providers,
      total,
      count: providers.length,
      page,
      limit,
      hasMore: page * limit < total,
      source: "NACCHO Local Health Department Directory",
      externalDirectory: true,
      attribution: "Data sourced from the NACCHO Local Health Department (LHD) Directory. Records are public-health agencies, not confirmed occupational or clinical service providers.",
    });
  } catch (error) {
    const warning = error instanceof Error ? error.message : "NACCHO LHD query failed";
    console.error("[NACCHO LHD] Query failed:", error);
    res.status(503).json({
      providers: [],
      total: 0,
      count: 0,
      source: "NACCHO Local Health Department Directory",
      warning,
      transientFailure: true,
    });
  }
});

/**
 * GET /api/naccho-lhd/status
 *
 * Returns schema status and record count.
 */
router.get("/naccho-lhd/status", async (_req: Request, res: Response) => {
  try {
    if (!isPersistenceConfigured()) {
      res.json({ configured: false, count: 0 });
      return;
    }
    const pool = getPool();
    await getTableReady(pool);
    const { rows } = await queryWithStatementTimeout(pool, `SELECT count(*)::int AS count FROM ${TABLE_NAME}`, []);
    res.json({ configured: true, count: Number(rows[0]?.count || 0) });
  } catch {
    res.json({ configured: false, count: 0, error: "Status check failed" });
  }
});

/**
 * POST /api/naccho-lhd/upsert
 *
 * Bulk upsert LHD records. Used by the import script, not the browser.
 * Body: { records: Array<NacchoLhdRecord> }
 */
router.post("/naccho-lhd/upsert", async (req: Request, res: Response) => {
  try {
    if (!isPersistenceConfigured()) {
      res.status(503).json({ error: "Database not configured" });
      return;
    }
    const pool = getPool();
    await getTableReady(pool);

    const records: Array<Record<string, unknown>> = Array.isArray(req.body?.records) ? req.body.records : [];
    if (!records.length) {
      res.status(400).json({ error: "No records provided" });
      return;
    }

    let upserted = 0;
    for (const rec of records) {
      const name = String(rec.name || "").trim();
      if (!name) continue;
      const stateCode = String(rec.state_code || rec.state || "").trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(stateCode)) continue;

      await pool.query(
        `INSERT INTO ${TABLE_NAME}
           (lhd_id, name, agency_type, address, city, state_code, postal_code, lat, lng,
            phone, website, source_url, public_health_services, raw_data, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now())
         ON CONFLICT (lhd_id) WHERE lhd_id IS NOT NULL
         DO UPDATE SET
           name=EXCLUDED.name, agency_type=EXCLUDED.agency_type, address=EXCLUDED.address,
           city=EXCLUDED.city, postal_code=EXCLUDED.postal_code, lat=EXCLUDED.lat, lng=EXCLUDED.lng,
           phone=EXCLUDED.phone, website=EXCLUDED.website, source_url=EXCLUDED.source_url,
           public_health_services=EXCLUDED.public_health_services, raw_data=EXCLUDED.raw_data,
           updated_at=now()`,
        [
          String(rec.lhd_id || "").trim() || null,
          name,
          String(rec.agency_type || "").trim() || null,
          String(rec.address || "").trim() || null,
          String(rec.city || "").trim() || null,
          stateCode,
          String(rec.postal_code || "").trim() || null,
          rec.lat == null ? null : Number(rec.lat),
          rec.lng == null ? null : Number(rec.lng),
          // Only store publicly available, non-obfuscated phone numbers
          typeof rec.phone === "string" && /^\+?[\d\s\-().]{7,20}$/.test(rec.phone.trim()) ? rec.phone.trim() : null,
          String(rec.website || "").trim() || null,
          String(rec.source_url || "").trim() || null,
          Array.isArray(rec.public_health_services) ? rec.public_health_services.map(String) : [],
          JSON.stringify(rec.raw_data || {}),
        ],
      );
      upserted += 1;
    }

    res.json({ upserted, total: records.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upsert failed";
    console.error("[NACCHO LHD] Upsert failed:", error);
    res.status(500).json({ error: message });
  }
});

export default router;

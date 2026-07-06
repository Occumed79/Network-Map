import { Router, type Request, type Response } from "express";
import { getPool } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { detectProviderSchema } from "../lib/providerSchema";
import { queryWithStatementTimeout } from "../lib/queryWithStatementTimeout";

const router = Router();

function normalizeTrustTier(confidenceScore: number | null): "verified" | "registry" | "directory" | "lead" {
  if (confidenceScore !== null && confidenceScore >= 0.85) return "verified";
  if (confidenceScore !== null && confidenceScore >= 0.7) return "registry";
  if (confidenceScore !== null && confidenceScore >= 0.5) return "directory";
  return "lead";
}

function asFiniteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function addParam(params: Array<string | number>, value: string | number): string {
  params.push(value);
  return `$${params.length}`;
}

/**
 * GET /api/provider-layers/:source
 * Fetch provider-map layers from Neon.
 *
 * Important behavior:
 * - Layer toggles default to loading the full source dataset, not a 1,000-row page.
 * - Bounds are ignored unless `useBounds=true` or `bounds=true` is explicitly passed.
 * - `total` is the real matching database count; `count`/`loaded` is the returned row count.
 *
 * Supported sources: bluehive, dentists, indexed, my-clinics
 */
router.get("/provider-layers/:source", async (req: Request, res: Response) => {
  const source = req.params.source as string;
  try {
    const validSources: Record<string, string> = {
      bluehive: "BlueHive",
      dentists: "Dentist Dataset",
      indexed: "indexed",
      "my-clinics": "My Clinics",
    };

    const dataSource = validSources[source];
    if (!dataSource) {
      res.status(400).json({ error: `Invalid source. Use: ${Object.keys(validSources).join(", ")}` });
      return;
    }

    if (!isPersistenceConfigured()) {
      res.json({ providers: [], count: 0, loaded: 0, total: 0, source, all: true });
      return;
    }

    // For map layer toggles, "on" means load the full selected provider source.
    // Pagination is only honored when the caller explicitly opts out with all=false.
    const all = req.query.all === "false" ? false : true;
    const limit = Math.max(Number(req.query.limit) || 500, 1);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;
    const north = asFiniteNumber(req.query.north);
    const south = asFiniteNumber(req.query.south);
    const east = asFiniteNumber(req.query.east);
    const west = asFiniteNumber(req.query.west);
    const useBounds = req.query.useBounds === "true" || req.query.bounds === "true";
    const hasBounds = useBounds && north !== null && south !== null && east !== null && west !== null;
    const pool = getPool();
    const schema = await detectProviderSchema(pool);

    if (schema === "none") {
      console.warn(`[ProviderLayers] ${source}: no provider table available`);
      res.json({ providers: [], count: 0, loaded: 0, total: 0, source, note: "No provider table available", all });
      return;
    }

    if (schema === "legacy") {
      console.info(`[ProviderLayers] ${source}: using legacy medical_providers fallback`);
      const params: Array<string | number> = [];
      const conditions = [
        "lat IS NOT NULL",
        "lng IS NOT NULL",
        "lat BETWEEN -90 AND 90",
        "lng BETWEEN -180 AND 180",
        "(lat <> 0 OR lng <> 0)",
      ];
      let sourceCondition = "LOWER(COALESCE(data_source, '')) NOT IN ('bluehive', 'dentist dataset', 'my clinics')";
      if (source !== "indexed") {
        sourceCondition = `LOWER(COALESCE(data_source, '')) = ${addParam(params, dataSource.toLowerCase())}`;
      }
      conditions.push(sourceCondition);
      if (hasBounds) {
        conditions.push(`lat BETWEEN ${addParam(params, south!)} AND ${addParam(params, north!)}`);
        conditions.push(west! <= east!
          ? `lng BETWEEN ${addParam(params, west!)} AND ${addParam(params, east!)}`
          : `(lng >= ${addParam(params, west!)} OR lng <= ${addParam(params, east!)})`);
      }
      const whereSql = conditions.join(" AND ");
      const countResult = await queryWithStatementTimeout(pool, `
        SELECT count(*)::int AS total
        FROM public.medical_providers
        WHERE ${whereSql}
      `, params);
      const total = Number(countResult.rows[0]?.total || 0);

      const dataParams = [...params];
      const limitClause = all ? "" : `LIMIT ${addParam(dataParams, limit)} OFFSET ${addParam(dataParams, offset)}`;
      const { rows } = await queryWithStatementTimeout(pool, `
        SELECT name, formatted_address, locality, administrative_area_level_1,
               postal_code, lat, lng, phone, website, source_id, data_source,
               source_type, confidence_score, category, types
        FROM public.medical_providers
        WHERE ${whereSql}
        ORDER BY id ASC
        ${limitClause}
      `, dataParams);
      const providers = rows.map((row: Record<string, unknown>) => ({
        clinic_name: row.name as string,
        name: row.name as string,
        address_1: row.formatted_address as string | null,
        city: row.locality as string | null,
        state: row.administrative_area_level_1 as string | null,
        zip: row.postal_code as string | null,
        phone: row.phone as string | null,
        website: row.website as string | null,
        lat: row.lat as number,
        lng: row.lng as number,
        npi: null,
        source_url: null,
        source_id: row.source_id as string | null,
        source_type: row.source_type as string | null,
        data_source: row.data_source as string,
        trust_tier: normalizeTrustTier(row.confidence_score as number | null),
        taxonomy_description: row.category as string | null,
        category: row.category as string | null,
        types: Array.isArray(row.types) ? row.types : [],
        services: Array.isArray(row.types) ? (row.types as string[]).join(", ") : null,
      }));
      res.json({
        providers,
        count: providers.length,
        loaded: providers.length,
        total,
        source,
        page: all ? 1 : page,
        limit: all ? providers.length : limit,
        hasMore: all ? false : offset + providers.length < total,
        all,
      });
      return;
    }

    console.info(`[ProviderLayers] ${source}: using normalized providers schema`);

    const params: Array<string | number> = [];
    const boundsConditions: string[] = [];
    if (hasBounds) {
      boundsConditions.push(`pl.lat BETWEEN ${addParam(params, south!)} AND ${addParam(params, north!)}`);
      boundsConditions.push(west! <= east!
        ? `pl.lng BETWEEN ${addParam(params, west!)} AND ${addParam(params, east!)}`
        : `(pl.lng >= ${addParam(params, west!)} OR pl.lng <= ${addParam(params, east!)})`);
    }

    const sourcePredicate = source === "indexed"
      ? "psrc.source_label NOT IN ('BlueHive', 'Dentist Dataset', 'My Clinics')"
      : `psrc.source_label = ${addParam(params, dataSource)}`;

    const providerSourceJoin = `
      INNER JOIN LATERAL (
        SELECT source_label, source_url, trust_tier
        FROM provider_sources psrc
        WHERE psrc.provider_id = p.id
          AND ${sourcePredicate}
        ORDER BY id ASC
        LIMIT 1
      ) psrc ON true
    `;
    const whereSql = `
      pl.lat IS NOT NULL
      AND pl.lng IS NOT NULL
      AND pl.lat BETWEEN -90 AND 90
      AND pl.lng BETWEEN -180 AND 180
      AND (pl.lat <> 0 OR pl.lng <> 0)
      ${boundsConditions.length ? `AND ${boundsConditions.join(" AND ")}` : ""}
    `;

    const countResult = await queryWithStatementTimeout(pool, `
      SELECT count(*)::int AS total
      FROM providers p
      INNER JOIN provider_locations pl ON pl.provider_id = p.id
      ${providerSourceJoin}
      WHERE ${whereSql}
    `, params);
    const total = Number(countResult.rows[0]?.total || 0);

    const dataParams = [...params];
    const limitClause = all ? "" : `LIMIT ${addParam(dataParams, limit)} OFFSET ${addParam(dataParams, offset)}`;
    const { rows } = await queryWithStatementTimeout(pool, `
      SELECT
        p.name,
        p.npi,
        pl.address,
        pl.city,
        pl.state,
        pl.postal_code,
        pl.lat,
        pl.lng,
        pc.phone,
        pc.website,
        psrc.source_label,
        psrc.source_url,
        psrc.trust_tier
      FROM providers p
      INNER JOIN provider_locations pl ON pl.provider_id = p.id
      LEFT JOIN provider_contacts pc ON pc.provider_id = p.id
      ${providerSourceJoin}
      WHERE ${whereSql}
      ORDER BY p.id ASC
      ${limitClause}
    `, dataParams);

    const providers = rows.map((row: Record<string, unknown>) => ({
      clinic_name: row.name as string,
      name: row.name as string,
      address_1: row.address as string | null,
      city: row.city as string | null,
      state: row.state as string | null,
      zip: row.postal_code as string | null,
      phone: row.phone as string | null,
      website: row.website as string | null,
      lat: row.lat as number,
      lng: row.lng as number,
      npi: row.npi as string | null,
      source_url: row.source_url as string | null,
      data_source: row.source_label as string,
      trust_tier: row.trust_tier as string,
    }));

    res.json({
      providers,
      count: providers.length,
      loaded: providers.length,
      total,
      source,
      page: all ? 1 : page,
      limit: all ? providers.length : limit,
      hasMore: all ? false : offset + providers.length < total,
      all,
    });
  } catch (e: any) {
    const message = e?.message || "Provider layer query failed";
    console.error(`[ProviderLayers] ${source} query failed:`, e);
    res.status(200).json({ providers: [], count: 0, loaded: 0, total: 0, error: message, source });
  }
});

export default router;

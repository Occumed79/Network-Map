import { Router, type Request, type Response } from "express";
import { getPool } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { detectProviderSchema } from "../lib/providerSchema";
import { queryWithStatementTimeout } from "../lib/queryWithStatementTimeout";
import { parseOptionalNumber } from "../lib/providerCoordinates";

const router = Router();
const SOURCE_KEY_MY_CLINICS = "my_clinics_upload";

type LayerProvider = Record<string, unknown> & {
  name?: string;
  clinic_name?: string;
  lat?: number;
  lng?: number;
  source_id?: string | null;
};

function normalizeTrustTier(confidenceScore: number | null): "verified" | "registry" | "directory" | "lead" {
  if (confidenceScore !== null && confidenceScore >= 0.85) return "verified";
  if (confidenceScore !== null && confidenceScore >= 0.7) return "registry";
  if (confidenceScore !== null && confidenceScore >= 0.5) return "directory";
  return "lead";
}

function asFiniteNumber(value: unknown): number | null {
  return parseOptionalNumber(value);
}

function providerIdentity(provider: LayerProvider): string {
  const name = String(provider.name || provider.clinic_name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const lat = Number(provider.lat);
  const lng = Number(provider.lng);
  if (name && Number.isFinite(lat) && Number.isFinite(lng)) return `${name}|${lat.toFixed(5)}|${lng.toFixed(5)}`;
  return String(provider.source_id || `${name}|${provider.city || ""}|${provider.state || ""}`);
}

export function mergeMyClinicsLayerProviders(...groups: LayerProvider[][]): LayerProvider[] {
  const merged = new Map<string, LayerProvider>();
  for (const provider of groups.flat()) {
    const key = providerIdentity(provider);
    if (!merged.has(key)) merged.set(key, provider);
  }
  return [...merged.values()].sort((a, b) => String(a.name || a.clinic_name || "").localeCompare(String(b.name || b.clinic_name || "")));
}

async function loadSavedCandidateProviders(
  pool: ReturnType<typeof getPool>,
  bounds: { north: number; south: number; east: number; west: number } | null,
  clinicType: string,
): Promise<LayerProvider[]> {
  const candidatesExist = (await pool.query("SELECT to_regclass('public.provider_candidates') IS NOT NULL AS ok")).rows[0]?.ok;
  if (!candidatesExist) return [];

  const params: Array<string | number> = [];
  const conditions = ["status = 'saved'", "lat IS NOT NULL", "lng IS NOT NULL", "lat BETWEEN -90 AND 90", "lng BETWEEN -180 AND 180", "(lat <> 0 OR lng <> 0)"];
  if (bounds) {
    conditions.push(`lat BETWEEN ${addParam(params, bounds.south)} AND ${addParam(params, bounds.north)}`);
    conditions.push(bounds.west <= bounds.east ? `lng BETWEEN ${addParam(params, bounds.west)} AND ${addParam(params, bounds.east)}` : `(lng >= ${addParam(params, bounds.west)} OR lng <= ${addParam(params, bounds.east)})`);
  }
  if (clinicType) {
    const placeholder = addParam(params, clinicType);
    conditions.push(`(clinic_type = ${placeholder} OR array_to_string(services, ',') ILIKE '%' || ${placeholder} || '%' OR array_to_string(categories, ',') ILIKE '%' || ${placeholder} || '%')`);
  }

  const { rows } = await queryWithStatementTimeout(pool, `
    SELECT id::text, name, address, city, admin_area, postal_code, lat, lng, phone, website,
           source_url, trust_tier, confidence_score, clinic_type, services, categories
    FROM public.provider_candidates
    WHERE ${conditions.join(" AND ")}
    ORDER BY name ASC
  `, params);

  return rows.map((row: Record<string, unknown>) => {
    const services = Array.isArray(row.services) ? row.services : [];
    const categories = Array.isArray(row.categories) ? row.categories : [];
    const types = [...new Set([...services, ...categories].map(String))];
    return {
      clinic_name: row.name as string, name: row.name as string, address_1: row.address as string | null, city: row.city as string | null,
      state: row.admin_area as string | null, zip: row.postal_code as string | null, phone: row.phone as string | null, website: row.website as string | null,
      lat: Number(row.lat), lng: Number(row.lng), npi: null, source_url: row.source_url as string | null, source_id: `candidate:${String(row.id)}`,
      source_type: "saved_candidate", data_source: "My Clinics", source: "provider_candidates", trust_tier: (row.trust_tier || "saved") as string,
      confidence_score: row.confidence_score == null ? null : Number(row.confidence_score), category: (row.clinic_type || "unknown") as string,
      clinic_type: (row.clinic_type || "unknown") as string, providerType: (row.clinic_type || "unknown") as string,
      taxonomy_description: (row.clinic_type || "unknown") as string, services: types.join(", "), types,
    };
  });
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
    const clinicType = typeof req.query.clinic_type === "string" ? req.query.clinic_type : typeof req.query.provider_type === "string" ? req.query.provider_type : "";
    const savedCandidateProviders = source === "my-clinics"
      ? await loadSavedCandidateProviders(pool, hasBounds ? { north: north!, south: south!, east: east!, west: west! } : null, clinicType)
      : [];

    if (source === "my-clinics") {
      const viewExists = (await pool.query("SELECT to_regclass('public.provider_master_map_view') IS NOT NULL AS ok")).rows[0]?.ok;
      if (viewExists) {
        const params: Array<string | number> = [SOURCE_KEY_MY_CLINICS];
        const conditions = ["COALESCE(to_jsonb(mv)->>'source_key', to_jsonb(mv)->>'primary_source_key', '') = $1", "NULLIF(to_jsonb(mv)->>'lat','') IS NOT NULL", "NULLIF(to_jsonb(mv)->>'lng','') IS NOT NULL"];
        if (hasBounds) {
          params.push(south, north); conditions.push(`(to_jsonb(mv)->>'lat')::double precision BETWEEN $${params.length - 1} AND $${params.length}`);
          params.push(west, east); conditions.push(west <= east ? `(to_jsonb(mv)->>'lng')::double precision BETWEEN $${params.length - 1} AND $${params.length}` : `((to_jsonb(mv)->>'lng')::double precision >= $${params.length - 1} OR (to_jsonb(mv)->>'lng')::double precision <= $${params.length})`);
        }
        if (clinicType) { params.push(clinicType); conditions.push(`(COALESCE(to_jsonb(mv)->>'primary_provider_type','') = $${params.length} OR COALESCE(to_jsonb(mv)->>'capability_tags','') ILIKE '%' || $${params.length} || '%')`); }
        const { rows } = await queryWithStatementTimeout(pool, `
          SELECT to_jsonb(mv) AS row_data
          FROM provider_master_map_view mv
          WHERE ${conditions.join(" AND ")}
          ORDER BY COALESCE(to_jsonb(mv)->>'name', to_jsonb(mv)->>'clinic_name', '') ASC
        `, params);
        const storedProviders = rows.map((row: { row_data: Record<string, unknown> }) => {
          const data = row.row_data || {};
          const name = String(data.name || data.clinic_name || "Unnamed");
          const providerType = String(data.primary_provider_type || data.clinic_type || "unknown");
          const tags = Array.isArray(data.capability_tags) ? data.capability_tags : providerType ? [providerType] : [];
          return {
            clinic_name: name, name, address_1: (data.address || data.address_1 || null) as string | null, city: (data.city || null) as string | null, state: (data.admin_area || data.state || null) as string | null, zip: (data.postal_code || data.zip || null) as string | null, phone: (data.phone || null) as string | null, website: (data.website || null) as string | null, lat: Number(data.lat), lng: Number(data.lng), npi: (data.npi || null) as string | null, source_url: (data.source_url || null) as string | null, source_id: (data.master_key || data.id || null) as string | null, source_type: "user_upload", data_source: "My Clinics", source: "my_clinics_upload", trust_tier: (data.trust_tier || "uploaded") as string, confidence_score: data.quality_score == null ? null : Number(data.quality_score), category: providerType, clinic_type: providerType, providerType, taxonomy_description: providerType, services: tags.join(", "), types: tags,
          };
        });
        const combined = mergeMyClinicsLayerProviders(storedProviders, savedCandidateProviders);
        const providers = all ? combined : combined.slice(offset, offset + limit);
        res.json({ providers, count: providers.length, loaded: providers.length, total: combined.length, source, page: all ? 1 : page, limit: all ? providers.length : limit, hasMore: all ? false : offset + providers.length < combined.length, all, source_key: SOURCE_KEY_MY_CLINICS });
        return;
      }
    }

    const schema = await detectProviderSchema(pool);

    if (schema === "none") {
      if (source === "my-clinics" && savedCandidateProviders.length) {
        const providers = all ? savedCandidateProviders : savedCandidateProviders.slice(offset, offset + limit);
        res.json({ providers, count: providers.length, loaded: providers.length, total: savedCandidateProviders.length, source, page: all ? 1 : page, limit: all ? providers.length : limit, hasMore: all ? false : offset + providers.length < savedCandidateProviders.length, all });
        return;
      }
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
      const combineSavedCandidates = source === "my-clinics";
      const limitClause = all || combineSavedCandidates ? "" : `LIMIT ${addParam(dataParams, limit)} OFFSET ${addParam(dataParams, offset)}`;
      const { rows } = await queryWithStatementTimeout(pool, `
        SELECT name, formatted_address, locality, administrative_area_level_1,
               postal_code, lat, lng, phone, website, source_id, data_source,
               source_type, confidence_score, category, types
        FROM public.medical_providers
        WHERE ${whereSql}
        ORDER BY id ASC
        ${limitClause}
      `, dataParams);
      const storedProviders = rows.map((row: Record<string, unknown>) => ({
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
      const combined = combineSavedCandidates ? mergeMyClinicsLayerProviders(storedProviders, savedCandidateProviders) : storedProviders;
      const providers = !all && combineSavedCandidates ? combined.slice(offset, offset + limit) : combined;
      const responseTotal = combineSavedCandidates ? combined.length : total;
      res.json({
        providers,
        count: providers.length,
        loaded: providers.length,
        total: responseTotal,
        source,
        page: all ? 1 : page,
        limit: all ? providers.length : limit,
        hasMore: all ? false : offset + providers.length < responseTotal,
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
    const combineSavedCandidates = source === "my-clinics";
    const limitClause = all || combineSavedCandidates ? "" : `LIMIT ${addParam(dataParams, limit)} OFFSET ${addParam(dataParams, offset)}`;
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

    const storedProviders = rows.map((row: Record<string, unknown>) => ({
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

    const combined = combineSavedCandidates ? mergeMyClinicsLayerProviders(storedProviders, savedCandidateProviders) : storedProviders;
    const providers = !all && combineSavedCandidates ? combined.slice(offset, offset + limit) : combined;
    const responseTotal = combineSavedCandidates ? combined.length : total;
    res.json({
      providers,
      count: providers.length,
      loaded: providers.length,
      total: responseTotal,
      source,
      page: all ? 1 : page,
      limit: all ? providers.length : limit,
      hasMore: all ? false : offset + providers.length < responseTotal,
      all,
    });
  } catch (e: any) {
    const message = e?.message || "Provider layer query failed";
    console.error(`[ProviderLayers] ${source} query failed:`, e);
    res.status(200).json({ providers: [], count: 0, loaded: 0, total: 0, error: message, source });
  }
});

export default router;

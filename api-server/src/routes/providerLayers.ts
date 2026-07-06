import { Router, type Request, type Response } from "express";
import { getPool } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { detectProviderSchema } from "../lib/providerSchema";
import { queryWithStatementTimeout } from "../lib/queryWithStatementTimeout";

const router = Router();
const SOURCE_KEY_MY_CLINICS = "my_clinics_upload";

function normalizeTrustTier(confidenceScore: number | null): "verified" | "registry" | "directory" | "lead" {
  if (confidenceScore !== null && confidenceScore >= 0.85) return "verified";
  if (confidenceScore !== null && confidenceScore >= 0.7) return "registry";
  if (confidenceScore !== null && confidenceScore >= 0.5) return "directory";
  return "lead";
}

/**
 * GET /api/provider-layers/:source
 * Fetch a bounded page of providers from a specific data source for map display.
 * Supported sources: bluehive, dentists, indexed, my-clinics
 * Queries normalized provider tables (providers, provider_locations, provider_contacts, provider_sources).
 * Returns providers with lat/lng coordinates only.
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
      res.json({ providers: [], count: 0, total: 0, source });
      return;
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 500, 1), 1000);
    const page = Math.min(Math.max(Number(req.query.page) || 1, 1), 1000);
    const offset = (page - 1) * limit;
    const north = Number(req.query.north);
    const south = Number(req.query.south);
    const east = Number(req.query.east);
    const west = Number(req.query.west);
    const hasBounds = [north, south, east, west].every(Number.isFinite);
    const pool = getPool();

    if (source === "my-clinics") {
      const viewExists = (await pool.query("SELECT to_regclass('public.provider_master_map_view') IS NOT NULL AS ok")).rows[0]?.ok;
      if (viewExists) {
        const params: Array<string | number> = [SOURCE_KEY_MY_CLINICS, limit, offset];
        const conditions = ["COALESCE(to_jsonb(mv)->>'source_key', to_jsonb(mv)->>'primary_source_key', '') = $1", "NULLIF(to_jsonb(mv)->>'lat','') IS NOT NULL", "NULLIF(to_jsonb(mv)->>'lng','') IS NOT NULL"];
        if (hasBounds) {
          params.push(south, north); conditions.push(`(to_jsonb(mv)->>'lat')::double precision BETWEEN $${params.length - 1} AND $${params.length}`);
          params.push(west, east); conditions.push(west <= east ? `(to_jsonb(mv)->>'lng')::double precision BETWEEN $${params.length - 1} AND $${params.length}` : `((to_jsonb(mv)->>'lng')::double precision >= $${params.length - 1} OR (to_jsonb(mv)->>'lng')::double precision <= $${params.length})`);
        }
        const clinicType = typeof req.query.clinic_type === "string" ? req.query.clinic_type : typeof req.query.provider_type === "string" ? req.query.provider_type : "";
        if (clinicType) { params.push(clinicType); conditions.push(`(COALESCE(to_jsonb(mv)->>'primary_provider_type','') = $${params.length} OR COALESCE(to_jsonb(mv)->>'capability_tags','') ILIKE '%' || $${params.length} || '%')`); }
        const { rows } = await queryWithStatementTimeout(pool, `
          SELECT to_jsonb(mv) AS row_data
          FROM provider_master_map_view mv
          WHERE ${conditions.join(" AND ")}
          ORDER BY COALESCE(to_jsonb(mv)->>'name', to_jsonb(mv)->>'clinic_name', '') ASC
          LIMIT $2 OFFSET $3
        `, params);
        const providers = rows.map((row: { row_data: Record<string, unknown> }) => {
          const data = row.row_data || {};
          const name = String(data.name || data.clinic_name || "Unnamed");
          const providerType = String(data.primary_provider_type || data.clinic_type || "unknown");
          const tags = Array.isArray(data.capability_tags) ? data.capability_tags : providerType ? [providerType] : [];
          return {
            clinic_name: name, name, address_1: (data.address || data.address_1 || null) as string | null, city: (data.city || null) as string | null, state: (data.admin_area || data.state || null) as string | null, zip: (data.postal_code || data.zip || null) as string | null, phone: (data.phone || null) as string | null, website: (data.website || null) as string | null, lat: Number(data.lat), lng: Number(data.lng), npi: (data.npi || null) as string | null, source_url: (data.source_url || null) as string | null, source_id: (data.master_key || data.id || null) as string | null, source_type: "user_upload", data_source: "My Clinics", source: "my_clinics_upload", trust_tier: (data.trust_tier || "uploaded") as string, confidence_score: data.quality_score == null ? null : Number(data.quality_score), category: providerType, clinic_type: providerType, providerType, taxonomy_description: providerType, services: tags.join(", "), types: tags,
          };
        });
        res.json({ providers, count: providers.length, total: providers.length, source, page, limit, hasMore: providers.length === limit, source_key: SOURCE_KEY_MY_CLINICS });
        return;
      }
    }

    const schema = await detectProviderSchema(pool);

    if (schema === "none") {
      console.warn(`[ProviderLayers] ${source}: no provider table available`);
      res.json({ providers: [], count: 0, total: 0, source, note: "No provider table available" });
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
        params.push(dataSource.toLowerCase());
        sourceCondition = `LOWER(COALESCE(data_source, '')) = $${params.length}`;
      }
      conditions.push(sourceCondition);
      if (hasBounds) {
        params.push(south, north);
        conditions.push(`lat BETWEEN $${params.length - 1} AND $${params.length}`);
        params.push(west, east);
        conditions.push(west <= east
          ? `lng BETWEEN $${params.length - 1} AND $${params.length}`
          : `(lng >= $${params.length - 1} OR lng <= $${params.length})`);
      }
      params.push(limit, offset);
      const { rows } = await queryWithStatementTimeout(pool, `
        SELECT name, formatted_address, locality, administrative_area_level_1,
               postal_code, lat, lng, phone, website, source_id, data_source,
               source_type, confidence_score, category, types
        FROM public.medical_providers
        WHERE ${conditions.join(" AND ")}
        ORDER BY id ASC
        LIMIT $${params.length - 1}
        OFFSET $${params.length}
      `, params);
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
        services: Array.isArray(row.types) ? (row.types as string[]).join(", ") : null,
      }));
      res.json({ providers, count: providers.length, total: providers.length, source, page, limit, hasMore: providers.length === limit });
      return;
    }

    console.info(`[ProviderLayers] ${source}: using normalized providers schema`);

    let query: string;
    let params: Array<string | number>;
    const normalizedBounds: string[] = [];
    if (hasBounds) {
      normalizedBounds.push("pl.lat BETWEEN $2 AND $3");
      normalizedBounds.push(west <= east ? "pl.lng BETWEEN $4 AND $5" : "(pl.lng >= $4 OR pl.lng <= $5)");
    }

    if (source === "indexed") {
      params = hasBounds ? [limit, south, north, west, east, offset] : [limit, offset];
      const offsetIndex = hasBounds ? 6 : 2;
      query = `
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
        INNER JOIN LATERAL (
          SELECT source_label, source_url, trust_tier
          FROM provider_sources
          WHERE provider_id = p.id
            AND source_label NOT IN ('BlueHive', 'Dentist Dataset', 'My Clinics')
          ORDER BY id ASC
          LIMIT 1
        ) psrc ON true
        WHERE pl.lat IS NOT NULL
          AND pl.lng IS NOT NULL
          AND pl.lat BETWEEN -90 AND 90
          AND pl.lng BETWEEN -180 AND 180
          AND (pl.lat <> 0 OR pl.lng <> 0)
          ${normalizedBounds.length ? `AND ${normalizedBounds.join(" AND ")}` : ""}
        ORDER BY p.id ASC
        LIMIT $1
        OFFSET $${offsetIndex}
      `;
    } else {
      params = hasBounds ? [dataSource, south, north, west, east, limit, offset] : [dataSource, limit, offset];
      const limitIndex = hasBounds ? 6 : 2;
      const offsetIndex = hasBounds ? 7 : 3;
      query = `
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
        INNER JOIN LATERAL (
          SELECT source_label, source_url, trust_tier
          FROM provider_sources
          WHERE provider_id = p.id AND source_label = $1
          ORDER BY id ASC
          LIMIT 1
        ) psrc ON true
        WHERE pl.lat IS NOT NULL
          AND pl.lng IS NOT NULL
          AND pl.lat BETWEEN -90 AND 90
          AND pl.lng BETWEEN -180 AND 180
          AND (pl.lat <> 0 OR pl.lng <> 0)
          ${normalizedBounds.length ? `AND ${normalizedBounds.join(" AND ")}` : ""}
        ORDER BY p.id ASC
        LIMIT $${limitIndex}
        OFFSET $${offsetIndex}
      `;
    }

    const { rows } = await queryWithStatementTimeout(pool, query, params);

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

    res.json({ providers, count: providers.length, total: providers.length, source, page, limit, hasMore: providers.length === limit });
  } catch (e: any) {
    const message = e?.message || "Provider layer query failed";
    console.error(`[ProviderLayers] ${source} query failed:`, e);
    res.status(200).json({ providers: [], count: 0, total: 0, error: message, source });
  }
});

export default router;

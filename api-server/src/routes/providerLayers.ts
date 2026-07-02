import { Router, type Request, type Response } from "express";
import { getPool } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { detectProviderSchema } from "../lib/providerSchema";

const router = Router();

function normalizeTrustTier(confidenceScore: number | null): "verified" | "registry" | "directory" | "lead" {
  if (confidenceScore !== null && confidenceScore >= 0.85) return "verified";
  if (confidenceScore !== null && confidenceScore >= 0.7) return "registry";
  if (confidenceScore !== null && confidenceScore >= 0.5) return "directory";
  return "lead";
}

/**
 * GET /api/provider-layers/:source
 * Fetch all providers from a specific data source for map display.
 * Supported sources: bluehive, dentists, indexed, my-clinics
 * Queries normalized provider tables (providers, provider_locations, provider_contacts, provider_sources).
 * Returns providers with lat/lng coordinates only.
 */
router.get("/provider-layers/:source", async (req: Request, res: Response) => {
  try {
    const source = req.params.source as string;
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
      res.json({ providers: [], total: 0 });
      return;
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 50000, 1), 200000);
    const pool = getPool();
    const schema = await detectProviderSchema(pool);

    if (schema === "none") {
      console.warn(`[ProviderLayers] ${source}: no provider table available`);
      res.json({ providers: [], total: 0, source: dataSource, note: "No provider table available" });
      return;
    }

    if (schema === "legacy") {
      console.info(`[ProviderLayers] ${source}: using legacy medical_providers fallback`);
      const params: Array<string | number> = [limit];
      let sourceCondition = "LOWER(COALESCE(data_source, '')) NOT IN ('bluehive', 'dentist dataset', 'my clinics')";
      if (source !== "indexed") {
        params.unshift(dataSource.toLowerCase());
        sourceCondition = "LOWER(COALESCE(data_source, '')) = $1";
      }
      const { rows } = await pool.query(`
        SELECT name, formatted_address, locality, administrative_area_level_1,
               postal_code, lat, lng, phone, website, source_id, data_source,
               source_type, confidence_score, category, types, raw_data
        FROM public.medical_providers
        WHERE ${sourceCondition}
          AND lat IS NOT NULL
          AND lng IS NOT NULL
        ORDER BY name ASC
        LIMIT $${params.length}
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
        raw_data: row.raw_data as Record<string, unknown> | null,
        data_source: row.data_source as string,
        trust_tier: normalizeTrustTier(row.confidence_score as number | null),
        taxonomy_description: row.category as string | null,
        services: Array.isArray(row.types) ? (row.types as string[]).join(", ") : null,
      }));
      res.json({ providers, total: providers.length, source: dataSource });
      return;
    }

    console.info(`[ProviderLayers] ${source}: using normalized providers schema`);

    let query: string;
    let params: Array<string | number>;

    if (source === "indexed") {
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
        LEFT JOIN provider_sources psrc ON psrc.provider_id = p.id
        WHERE psrc.source_label NOT IN ('BlueHive', 'Dentist Dataset')
          AND pl.lat IS NOT NULL
          AND pl.lng IS NOT NULL
        ORDER BY p.name ASC
        LIMIT $1
      `;
      params = [limit];
    } else {
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
        LEFT JOIN provider_sources psrc ON psrc.provider_id = p.id
        WHERE psrc.source_label = $1
          AND pl.lat IS NOT NULL
          AND pl.lng IS NOT NULL
        ORDER BY p.name ASC
        LIMIT $2
      `;
      params = [dataSource, limit];
    }

    const { rows } = await pool.query(query, params);

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

    res.json({ providers, total: providers.length, source: dataSource });
  } catch (e: any) {
    console.error("[ProviderLayers] Error:", e);
    res.status(500).json({ error: e.message || "Internal server error" });
  }
});

export default router;

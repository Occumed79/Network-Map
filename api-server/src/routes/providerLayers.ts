import { Router, type Request, type Response } from "express";
import { getPool } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";

const router = Router();

/**
 * GET /api/provider-layers/:source
 * Fetch all providers from a specific data source for map display.
 * Supported sources: bluehive, dentists, indexed
 * "indexed" returns all providers NOT in BlueHive or Dentist Dataset.
 * Returns providers with lat/lng coordinates only.
 */
router.get("/provider-layers/:source", async (req: Request, res: Response) => {
  try {
    const source = req.params.source as string;
    const validSources: Record<string, string> = {
      bluehive: "BlueHive",
      dentists: "Dentist Dataset",
      indexed: "indexed",
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

    let query: string;
    let params: Array<string | number>;

    if (source === "indexed") {
      query = `
        SELECT
          name,
          formatted_address,
          lat,
          lng,
          category,
          phone,
          website,
          locality,
          administrative_area_level_1,
          postal_code,
          data_source,
          source_id,
          raw_data
        FROM public.medical_providers
        WHERE data_source NOT IN ('BlueHive', 'Dentist Dataset')
          AND lat IS NOT NULL
          AND lng IS NOT NULL
        ORDER BY name ASC
        LIMIT $1
      `;
      params = [limit];
    } else {
      query = `
        SELECT
          name,
          formatted_address,
          lat,
          lng,
          category,
          phone,
          website,
          locality,
          administrative_area_level_1,
          postal_code,
          data_source,
          source_id,
          raw_data
        FROM public.medical_providers
        WHERE data_source = $1
          AND lat IS NOT NULL
          AND lng IS NOT NULL
        ORDER BY name ASC
        LIMIT $2
      `;
      params = [dataSource, limit];
    }

    const { rows } = await getPool().query(query, params);

    const providers = rows.map((row: Record<string, unknown>) => {
      let rawData: Record<string, unknown> = {};
      try {
        rawData = typeof row.raw_data === "string" ? JSON.parse(row.raw_data) : (row.raw_data as Record<string, unknown>) || {};
      } catch {
        // keep empty
      }

      return {
        clinic_name: row.name as string,
        name: row.name as string,
        address_1: rawData.address_1 || rawData.address || row.formatted_address || null,
        city: row.locality as string | null,
        state: row.administrative_area_level_1 as string | null,
        zip: row.postal_code as string | null,
        phone: row.phone as string | null,
        website: row.website as string | null,
        lat: row.lat as number,
        lng: row.lng as number,
        npi: rawData.npi || null,
        source_url: rawData.source_url || null,
        taxonomy_description: rawData.taxonomy_description || row.category || null,
        services: rawData.services || null,
        data_source: row.data_source as string,
        source_id: row.source_id as string,
      };
    });

    res.json({ providers, total: providers.length, source: dataSource });
  } catch (e: any) {
    console.error("[ProviderLayers] Error:", e);
    res.status(500).json({ error: e.message || "Internal server error" });
  }
});

export default router;

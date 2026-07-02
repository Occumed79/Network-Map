import { Router, type Request, type Response } from "express";
import { getPool } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";

const router = Router();

const SOURCE_LABELS: Record<string, string> = {
  bluehive: "BlueHive",
  dentists: "Dentist Dataset",
  indexed: "Indexed Providers",
  "my-clinics": "My Clinics",
};

router.get("/provider-layers/:source", async (req: Request, res: Response) => {
  const source = req.params.source as string;
  const sourceLabel = SOURCE_LABELS[source];
  if (!sourceLabel) {
    res.status(400).json({ error: `Invalid source. Use: ${Object.keys(SOURCE_LABELS).join(", ")}` });
    return;
  }

  if (!isPersistenceConfigured()) {
    res.json({ providers: [], total: 0, source: sourceLabel, note: "Database not configured" });
    return;
  }

  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50000, 1), 200000);
    const params: Array<string | number> = [limit];
    let sourceCondition = "LOWER(COALESCE(data_source, '')) NOT IN ('bluehive', 'dentist dataset', 'my clinics')";

    if (source !== "indexed") {
      params.unshift(sourceLabel.toLowerCase());
      sourceCondition = "LOWER(COALESCE(data_source, '')) = $1";
    }

    const limitIndex = params.length;
    const { rows } = await getPool().query(`
      SELECT
        id, name, formatted_address, locality, administrative_area_level_1,
        postal_code, lat, lng, phone, website, source_id, data_source,
        source_type, confidence_score, category, types, raw_data
      FROM public.medical_providers
      WHERE ${sourceCondition}
        AND lat IS NOT NULL
        AND lng IS NOT NULL
      ORDER BY name ASC
      LIMIT $${limitIndex}
    `, params);

    const providers = rows.map((row: Record<string, unknown>) => ({
      id: row.id,
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
      source_id: row.source_id as string | null,
      source_type: row.source_type as string | null,
      raw_data: row.raw_data as Record<string, unknown> | null,
      data_source: row.data_source as string | null,
      trust_tier: row.confidence_score,
      taxonomy_description: row.category as string | null,
      services: Array.isArray(row.types) ? (row.types as string[]).join(", ") : null,
    }));

    res.json({ providers, total: providers.length, source: sourceLabel });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error(`[ProviderLayers] ${source} failed:`, error);
    res.status(500).json({ error: message, source: sourceLabel });
  }
});

export default router;

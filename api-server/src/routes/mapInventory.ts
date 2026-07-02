import { Router, type Request, type Response } from "express";
import { getPool } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";

const router = Router();

type TrustTier = "verified" | "registry" | "directory" | "lead";

const SERVICE_TERMS: Record<string, string[]> = {
  primaryCare: ["primary care", "family medicine", "general practice", "general practitioner", "internal medicine", "doctor", "physician", "ffd", "fitness for duty"],
  specialist: ["specialist", "specialty", "cardiology", "pulmonary", "neurology", "orthopedic", "radiology", "audiology", "dentist"],
  specialists: ["specialist", "specialty", "cardiology", "pulmonary", "neurology", "orthopedic", "radiology", "audiology", "dentist"],
  urgentCare: ["urgent care", "walk-in", "immediate care", "clinic"],
  dental: ["dental", "dentist", "dd 2813", "dd2813"],
  pharmacy: ["pharmacy", "rx", "drugstore"],
  vaccinations: ["vaccination", "vaccine", "immunization", "shot clinic", "travel vaccine"],
  occMed: ["occupational", "occupational health", "occupational medicine", "workplace health", "industrial medicine", "occ med"],
  drugTest: ["drug test", "drug screen", "mro", "toxicology", "collection", "urine", "laboratory", "lab"],
  audiometry: ["audiology", "audiometry", "hearing", "audiogram"],
  vision: ["vision", "eye", "optometry", "optometrist", "ophthalmology"],
  urgent: ["urgent care", "walk-in", "immediate care"],
  occupational: ["occupational", "occupational health", "occupational medicine"],
  dentist: ["dentist", "dental"],
  radiology: ["radiology", "imaging", "x-ray", "xray", "mammogram", "ultrasound"],
  pulmonary: ["pulmonary", "pft", "spirometry", "respiratory"],
  lab: ["laboratory", "lab", "phlebotomy", "diagnostic", "drug screen"],
  physio: ["physical therapy", "physiotherapy", "rehab"],
  chiropractic: ["chiropractic", "chiropractor"],
  audiology: ["audiology", "audiometry", "hearing"],
  behavioral: ["behavioral", "mental health", "psychology", "psychiatry"],
};

function trustTierFor(score: number | null): TrustTier {
  if (score !== null && score >= 0.85) return "verified";
  if (score !== null && score >= 0.7) return "registry";
  if (score !== null && score >= 0.5) return "directory";
  return "lead";
}

router.get("/map-inventory", async (req: Request, res: Response) => {
  const north = Number(req.query.north);
  const south = Number(req.query.south);
  const east = Number(req.query.east);
  const west = Number(req.query.west);
  const serviceType = typeof req.query.serviceType === "string" ? req.query.serviceType : "";
  const requestedTrustTier = typeof req.query.trustTier === "string" ? req.query.trustTier : "";
  const limit = Math.min(Math.max(Number(req.query.limit) || 500, 1), 2500);

  if (![north, south, east, west].every(Number.isFinite)) {
    res.status(400).json({ error: "Missing required bounds: north, south, east, west" });
    return;
  }

  if (!isPersistenceConfigured()) {
    res.json({ providers: [], total: 0, serviceType: serviceType || null, note: "Database not configured" });
    return;
  }

  try {
    const params: Array<number | string> = [south, north, west, east];
    const conditions = [
      "lat BETWEEN $1 AND $2",
      west <= east ? "lng BETWEEN $3 AND $4" : "(lng >= $3 OR lng <= $4)",
      "lat IS NOT NULL",
      "lng IS NOT NULL",
    ];
    const terms = SERVICE_TERMS[serviceType] || (serviceType ? [serviceType] : []);

    if (terms.length > 0) {
      const searchText = "LOWER(CONCAT_WS(' ', name, category, source_type, data_source, array_to_string(types, ' '), raw_data::text))";
      const clauses = terms.map((term) => {
        params.push(`%${term.toLowerCase()}%`);
        return `${searchText} LIKE $${params.length}`;
      });
      conditions.push(`(${clauses.join(" OR ")})`);
    }

    params.push(limit);
    const { rows } = await getPool().query(`
      SELECT id, name, category, formatted_address, locality,
             administrative_area_level_1, postal_code, lat, lng, phone,
             website, data_source, source_id, source_type, confidence_score, types
      FROM public.medical_providers
      WHERE ${conditions.join(" AND ")}
      ORDER BY name ASC
      LIMIT $${params.length}
    `, params);

    const providers = rows
      .map((row: Record<string, unknown>) => {
        const trustTier = trustTierFor(row.confidence_score as number | null);
        return {
          id: row.id as number,
          npi: null,
          name: row.name as string,
          providerType: row.category as string | null,
          address: row.formatted_address as string | null,
          city: row.locality as string | null,
          state: row.administrative_area_level_1 as string | null,
          postalCode: row.postal_code as string | null,
          lat: row.lat as number,
          lng: row.lng as number,
          coordinateStatus: "imported",
          phone: row.phone as string | null,
          fax: null,
          website: row.website as string | null,
          services: Array.isArray(row.types) ? row.types as string[] : serviceType ? [serviceType] : [],
          trustTier,
          sources: row.data_source ? [{
            sourceId: (row.source_id as string) || String(row.id),
            sourceLabel: row.data_source as string,
            trustTier,
          }] : [],
        };
      })
      .filter((provider) => !requestedTrustTier || provider.trustTier === requestedTrustTier);

    res.json({ providers, total: providers.length, serviceType: serviceType || null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error(`[MapInventory] ${serviceType || "all"} failed:`, error);
    res.status(500).json({ error: message, serviceType: serviceType || null });
  }
});

export default router;

import { Router, type Request, type Response } from "express";
import { getPool } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";

const router = Router();

type TrustTier = "verified" | "registry" | "directory" | "lead";

type MedicalProviderRow = {
  id: number;
  place_id: string;
  name: string;
  formatted_address: string | null;
  lat: number;
  lng: number;
  category: string | null;
  phone: string | null;
  website: string | null;
  country_code: string | null;
  locality: string | null;
  administrative_area_level_1: string | null;
  postal_code: string | null;
  data_source: string | null;
  source_id: string | null;
  source_type: string | null;
  confidence_score: number | null;
};

const SERVICE_TERMS: Record<string, string[]> = {
  primaryCare: ["primary care", "family medicine", "general practice", "general practitioner", "internal medicine", "doctor", "physician", "ffd", "fitness for duty"],
  specialist: ["specialist", "specialty", "cardiology", "pulmonary", "neurology", "orthopedic", "radiology", "audiology", "dentist"],
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

function normalizeTrustTier(confidenceScore: number | null): TrustTier {
  if (confidenceScore !== null && confidenceScore >= 0.85) return "verified";
  if (confidenceScore !== null && confidenceScore >= 0.7) return "registry";
  if (confidenceScore !== null && confidenceScore >= 0.5) return "directory";
  return "lead";
}

function providerType(row: MedicalProviderRow): string {
  return row.category || row.source_type || row.data_source || "medical_provider";
}

function sourceLabel(row: MedicalProviderRow): string {
  return row.data_source || row.source_type || "medical_providers";
}

function serviceTerms(serviceType: string | undefined): string[] {
  if (!serviceType) return [];
  const clean = serviceType.trim();
  if (!clean) return [];
  const mapped = SERVICE_TERMS[clean] || [];
  return Array.from(new Set([clean, ...mapped].map((term) => term.toLowerCase().trim()).filter(Boolean)));
}

function addServicePresenceCondition(
  conditions: string[],
  params: Array<number | string>,
  serviceType: string | undefined,
) {
  const terms = serviceTerms(serviceType);
  if (!terms.length) return;

  const clauses = terms.map((term) => {
    params.push(`%${term}%`);
    const index = params.length;
    return `(
      LOWER(COALESCE(category, '')) LIKE $${index}
      OR LOWER(COALESCE(source_type, '')) LIKE $${index}
      OR LOWER(COALESCE(data_source, '')) LIKE $${index}
      OR LOWER(COALESCE(name, '')) LIKE $${index}
      OR LOWER(COALESCE(formatted_address, '')) LIKE $${index}
      OR LOWER(COALESCE(types::text, '')) LIKE $${index}
      OR LOWER(COALESCE(raw_data::text, '')) LIKE $${index}
    )`;
  });

  conditions.push(`(${clauses.join(" OR ")})`);
}

/**
 * GET /api/map-inventory
 * Fetch indexed providers from the existing medical_providers table by map viewport bounds.
 * Query params: north, south, east, west (required), serviceType (optional), trustTier (optional)
 */
router.get("/map-inventory", async (req: Request, res: Response) => {
  try {
    const north = Number(req.query.north);
    const south = Number(req.query.south);
    const east = Number(req.query.east);
    const west = Number(req.query.west);
    const serviceType = req.query.serviceType as string | undefined;
    const trustTier = req.query.trustTier as TrustTier | undefined;
    const limit = Math.min(Math.max(Number(req.query.limit) || 500, 1), 2500);

    if (!Number.isFinite(north) || !Number.isFinite(south) || !Number.isFinite(east) || !Number.isFinite(west)) {
      res.status(400).json({ error: "Missing required bounds: north, south, east, west" });
      return;
    }

    if (!isPersistenceConfigured()) {
      res.json({ providers: [], total: 0, note: "Database not configured — no indexed providers available" });
      return;
    }

    const params: Array<number | string> = [south, north];
    const conditions = [
      "lat BETWEEN $1 AND $2",
      "lat IS NOT NULL",
      "lng IS NOT NULL",
    ];

    if (west <= east) {
      params.push(west, east);
      conditions.push(`lng BETWEEN $${params.length - 1} AND $${params.length}`);
    } else {
      params.push(west, east);
      conditions.push(`(lng >= $${params.length - 1} OR lng <= $${params.length})`);
    }

    addServicePresenceCondition(conditions, params, serviceType);

    params.push(limit);
    const limitIndex = params.length;

    const query = `
      SELECT
        id,
        place_id,
        name,
        formatted_address,
        lat,
        lng,
        category,
        phone,
        website,
        country_code,
        locality,
        administrative_area_level_1,
        postal_code,
        data_source,
        source_id,
        source_type,
        confidence_score
      FROM public.medical_providers
      WHERE ${conditions.join(" AND ")}
      ORDER BY confidence_score DESC NULLS LAST, name ASC
      LIMIT $${limitIndex}
    `;

    const { rows } = await getPool().query<MedicalProviderRow>(query, params);
    const filteredRows = trustTier
      ? rows.filter((row) => normalizeTrustTier(row.confidence_score) === trustTier)
      : rows;

    const providers = filteredRows.map((row) => {
      const bestTrust = normalizeTrustTier(row.confidence_score);
      const type = providerType(row);

      return {
        id: row.id,
        npi: null,
        name: row.name,
        providerType: type,
        address: row.formatted_address,
        city: row.locality,
        state: row.administrative_area_level_1,
        postalCode: row.postal_code,
        lat: row.lat,
        lng: row.lng,
        coordinateStatus: "verified",
        phone: row.phone,
        fax: null,
        website: row.website,
        services: row.category ? [row.category] : serviceType ? [serviceType] : [],
        trustTier: bestTrust,
        sources: [
          {
            sourceId: row.source_id || row.place_id,
            sourceLabel: sourceLabel(row),
            trustTier: bestTrust,
          },
        ],
      };
    });

    res.json({ providers, total: providers.length, serviceType: serviceType || null });
  } catch (e: any) {
    console.error("[MapInventory] Error:", e);
    res.status(500).json({ error: e.message || "Internal server error" });
  }
});

export default router;

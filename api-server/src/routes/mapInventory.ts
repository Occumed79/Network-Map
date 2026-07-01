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

function normalizeTrustTier(confidenceScore: number | null): TrustTier {
  if (confidenceScore !== null && confidenceScore >= 0.85) return "verified";
  if (confidenceScore !== null && confidenceScore >= 0.7) return "registry";
  if (confidenceScore !== null && confidenceScore >= 0.5) return "directory";
  return "lead";
}

function serviceTerms(serviceType: string | undefined): string[] {
  if (!serviceType) return [];
  const clean = serviceType.trim();
  if (!clean) return [];
  const mapped = SERVICE_TERMS[clean] || [];
  return Array.from(new Set([clean, ...mapped].map((term) => term.toLowerCase().trim()).filter(Boolean)));
}

/**
 * GET /api/map-inventory
 * Fetch indexed providers from normalized provider tables by map viewport bounds.
 * Queries: providers + provider_locations + provider_contacts + provider_services + provider_sources
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

    const pool = getPool();
    const params: Array<number | string> = [south, north];
    const conditions = [
      "pl.lat BETWEEN $1 AND $2",
      "pl.lat IS NOT NULL",
      "pl.lng IS NOT NULL",
    ];

    if (west <= east) {
      params.push(west, east);
      conditions.push(`pl.lng BETWEEN $${params.length - 1} AND $${params.length}`);
    } else {
      params.push(west, east);
      conditions.push(`(pl.lng >= $${params.length - 1} OR pl.lng <= $${params.length})`);
    }

    // Add service type filter via JOIN with provider_services
    let serviceJoin = "";
    if (serviceType) {
      const terms = serviceTerms(serviceType);
      if (terms.length > 0) {
        serviceJoin = "LEFT JOIN provider_services ps ON ps.provider_id = p.id";
        const clauses = terms.map((term) => {
          params.push(`%${term}%`);
          const index = params.length;
          return `LOWER(COALESCE(ps.service_type, '')) LIKE $${index} OR LOWER(COALESCE(ps.taxonomy, '')) LIKE $${index}`;
        });
        conditions.push(`(${clauses.join(" OR ")})`);
      }
    }

    // Add trust tier filter via JOIN with provider_sources
    let trustJoin = "";
    if (trustTier) {
      trustJoin = "LEFT JOIN provider_sources psrc ON psrc.provider_id = p.id";
      conditions.push(`psrc.trust_tier = '${trustTier}'`);
    }

    params.push(limit);
    const limitIndex = params.length;

    const query = `
      SELECT DISTINCT
        p.id,
        p.npi,
        p.name,
        p.provider_type,
        pl.address,
        pl.city,
        pl.state,
        pl.postal_code,
        pl.lat,
        pl.lng,
        pl.coordinate_status,
        pc.phone,
        pc.fax,
        pc.website,
        psrc.source_label,
        psrc.trust_tier,
        psrc.source_url
      FROM providers p
      INNER JOIN provider_locations pl ON pl.provider_id = p.id
      LEFT JOIN provider_contacts pc ON pc.provider_id = p.id
      ${serviceJoin}
      ${trustJoin}
      LEFT JOIN provider_sources psrc ON psrc.provider_id = p.id
      WHERE ${conditions.join(" AND ")}
      ORDER BY p.name ASC
      LIMIT $${limitIndex}
    `;

    const { rows } = await pool.query(query, params);

    const providers = rows.map((row: Record<string, unknown>) => ({
      id: row.id as number,
      npi: row.npi as string | null,
      name: row.name as string,
      providerType: row.provider_type as string,
      address: row.address as string | null,
      city: row.city as string | null,
      state: row.state as string | null,
      postalCode: row.postal_code as string | null,
      lat: row.lat as number,
      lng: row.lng as number,
      coordinateStatus: (row.coordinate_status as string) || "imported",
      phone: row.phone as string | null,
      fax: row.fax as string | null,
      website: row.website as string | null,
      services: serviceType ? [serviceType] : [],
      trustTier: (row.trust_tier as TrustTier) || "lead",
      sources: row.source_label ? [{
        sourceId: row.source_url as string || row.source_label as string,
        sourceLabel: row.source_label as string,
        trustTier: (row.trust_tier as TrustTier) || "lead",
      }] : [],
    }));

    res.json({ providers, total: providers.length, serviceType: serviceType || null });
  } catch (e: any) {
    console.error("[MapInventory] Error:", e);
    res.status(500).json({ error: e.message || "Internal server error" });
  }
});

export default router;

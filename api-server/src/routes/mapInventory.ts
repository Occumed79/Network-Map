import { Router, type Request, type Response } from "express";
import { getPool } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { detectProviderSchema } from "../lib/providerSchema";
import { queryWithStatementTimeout } from "../lib/queryWithStatementTimeout";

const router = Router();

type TrustTier = "verified" | "registry" | "directory" | "lead";

const SERVICE_TERMS: Record<string, string[]> = {
  primaryCare: ["physicalexam", "physical exam", "primary care", "clinic", "doctor", "family medicine", "general practice", "general practitioner", "internal medicine", "physician", "ffd", "fitness for duty"],
  specialists: ["specialists", "specialist", "specialty", "doctor", "hospital", "cardiology", "pulmonary", "neurology", "orthopedic", "radiology", "audiology"],
  specialist: ["specialist", "specialty", "doctor", "hospital", "cardiology", "pulmonary", "neurology", "orthopedic", "radiology", "audiology"],
  urgentCare: ["urgentcare", "urgent care", "urgent", "walk-in", "immediate care", "clinic"],
  dental: ["dental", "dentist", "dd 2813", "dd2813"],
  pharmacy: ["pharmacy", "rx", "drugstore"],
  vaccinations: ["vaccinations", "vaccination", "vaccine", "immunization", "pharmacy", "clinic", "shot clinic", "travel vaccine"],
  occMed: ["occmed", "occupational", "occupational health", "occupational medicine", "clinic", "workplace health", "industrial medicine", "occ med"],
  drugTest: ["drugtest", "drug test", "drugscreen", "drug screen", "medical_lab", "medical lab", "mro", "toxicology", "collection", "urine", "laboratory", "lab"],
  audiometry: ["audiometry", "audiology", "hearing", "audiogram"],
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
    const limit = Math.min(Math.max(Number(req.query.limit) || 250, 1), 1000);

    if (!Number.isFinite(north) || !Number.isFinite(south) || !Number.isFinite(east) || !Number.isFinite(west)) {
      res.status(400).json({ error: "Missing required bounds: north, south, east, west" });
      return;
    }

    if (!isPersistenceConfigured()) {
      res.json({ providers: [], count: 0, total: 0, note: "Database not configured — no indexed providers available" });
      return;
    }

    const pool = getPool();
    const schema = await detectProviderSchema(pool);
    if (schema === "none") {
      console.warn("[MapInventory] no provider table available");
      res.json({ providers: [], count: 0, total: 0, serviceType: serviceType || null, note: "No provider table available" });
      return;
    }

    if (schema === "legacy") {
      console.info("[MapInventory] using legacy medical_providers fallback");
      const params: Array<number | string> = [south, north];
      const conditions = ["lat BETWEEN $1 AND $2", "lat IS NOT NULL", "lng IS NOT NULL"];

      if (west <= east) {
        params.push(west, east);
        conditions.push(`lng BETWEEN $${params.length - 1} AND $${params.length}`);
      } else {
        params.push(west, east);
        conditions.push(`(lng >= $${params.length - 1} OR lng <= $${params.length})`);
      }

      const terms = serviceTerms(serviceType);
      if (terms.length > 0) {
        const searchText = "LOWER(CONCAT_WS(' ', name, category, source_type, data_source, array_to_string(types, ' ')))";
        const clauses = terms.map((term) => {
          params.push(`%${term}%`);
          return `${searchText} LIKE $${params.length}`;
        });
        conditions.push(`(${clauses.join(" OR ")})`);
      }

      params.push(limit);
      const { rows } = await queryWithStatementTimeout(pool, `
        SELECT id, name, category, formatted_address, locality,
               administrative_area_level_1, postal_code, lat, lng, phone,
               website, data_source, source_id, confidence_score, types
        FROM public.medical_providers
        WHERE ${conditions.join(" AND ")}
        ORDER BY id ASC
        LIMIT $${params.length}
      `, params);

      const providers = rows.map((row: Record<string, unknown>) => {
        const rowTrustTier = normalizeTrustTier(row.confidence_score as number | null);
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
          trustTier: rowTrustTier,
          sources: row.data_source ? [{
            sourceId: (row.source_id as string) || String(row.id),
            sourceLabel: row.data_source as string,
            trustTier: rowTrustTier,
          }] : [],
        };
      }).filter((provider) => !trustTier || provider.trustTier === trustTier);

      res.json({ providers, count: providers.length, total: providers.length, serviceType: serviceType || null, limit });
      return;
    }

    console.info("[MapInventory] using normalized providers schema");
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

    // Filter through EXISTS so service rows do not multiply provider results.
    if (serviceType) {
      const terms = serviceTerms(serviceType);
      if (terms.length > 0) {
        const clauses = terms.map((term) => {
          params.push(`%${term}%`);
          const index = params.length;
          return `LOWER(COALESCE(ps.service_type, '')) LIKE $${index} OR LOWER(COALESCE(ps.taxonomy, '')) LIKE $${index}`;
        });
        conditions.push(`EXISTS (
          SELECT 1 FROM provider_services ps
          WHERE ps.provider_id = p.id AND (${clauses.join(" OR ")})
        )`);
      }
    }

    if (trustTier) {
      params.push(trustTier);
      conditions.push(`EXISTS (
        SELECT 1 FROM provider_sources psrc_filter
        WHERE psrc_filter.provider_id = p.id AND psrc_filter.trust_tier = $${params.length}
      )`);
    }

    params.push(limit);
    const limitIndex = params.length;

    const query = `
      SELECT
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
      LEFT JOIN LATERAL (
        SELECT source_label, trust_tier, source_url
        FROM provider_sources
        WHERE provider_id = p.id
        ORDER BY id ASC
        LIMIT 1
      ) psrc ON true
      WHERE ${conditions.join(" AND ")}
      ORDER BY p.id ASC
      LIMIT $${limitIndex}
    `;

    const { rows } = await queryWithStatementTimeout(pool, query, params);

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

    res.json({ providers, count: providers.length, total: providers.length, serviceType: serviceType || null, limit });
  } catch (e: any) {
    const message = e?.message || "Map inventory query failed";
    console.error("[MapInventory] query failed:", e);
    res.status(200).json({ providers: [], count: 0, total: 0, error: message });
  }
});

export default router;

import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { getPool } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { detectProviderSchema } from "../lib/providerSchema";
import { queryWithStatementTimeout } from "../lib/queryWithStatementTimeout";
import { clampFeatureLimit } from "../providerSources/mapFeatureBudget";
import { coordinateStatusFromLegacy } from "../providerSources/integrity";

const router = Router();
type TrustTier = "verified" | "registry" | "directory" | "lead";

const SERVICE_TERMS: Record<string, string[]> = {
  primaryCare: ["physical exam", "primary care", "clinic", "doctor", "family medicine", "general practice", "internal medicine", "physician"],
  specialists: ["specialist", "doctor", "hospital", "cardiology", "pulmonary", "neurology", "orthopedic", "radiology", "audiology"],
  urgentCare: ["urgent care", "walk-in", "immediate care", "clinic"],
  dental: ["dental", "dentist", "dd 2813", "dd2813"],
  pharmacy: ["pharmacy", "rx", "drugstore"],
  vaccinations: ["vaccination", "vaccine", "immunization", "pharmacy", "clinic", "travel vaccine"],
  occMed: ["occupational", "occupational health", "occupational medicine", "workplace health", "industrial medicine"],
  drugTest: ["drug test", "drug screen", "medical lab", "mro", "toxicology", "collection", "laboratory", "lab"],
  audiometry: ["audiometry", "audiology", "hearing", "audiogram"],
  vision: ["vision", "eye", "optometry", "optometrist", "ophthalmology"],
  radiology: ["radiology", "imaging", "x-ray", "xray", "mammogram", "ultrasound"],
  pulmonary: ["pulmonary", "pft", "spirometry", "respiratory"],
  lab: ["laboratory", "lab", "phlebotomy", "diagnostic", "drug screen"],
  physio: ["physical therapy", "physiotherapy", "rehab"],
  chiropractic: ["chiropractic", "chiropractor"],
  behavioral: ["behavioral", "mental health", "psychology", "psychiatry"],
};

function normalizeTrustTier(confidenceScore: number | null): TrustTier {
  if (confidenceScore !== null && confidenceScore >= 0.85) return "verified";
  if (confidenceScore !== null && confidenceScore >= 0.7) return "registry";
  if (confidenceScore !== null && confidenceScore >= 0.5) return "directory";
  return "lead";
}

function serviceTerms(serviceType: string | undefined): string[] {
  const clean = String(serviceType || "").trim();
  if (!clean) return [];
  return Array.from(new Set([clean, ...(SERVICE_TERMS[clean] || [])].map((term) => term.toLowerCase().trim()).filter(Boolean)));
}

function boundsFromRequest(req: Request) {
  const north = Number(req.query.north);
  const south = Number(req.query.south);
  const east = Number(req.query.east);
  const west = Number(req.query.west);
  if (![north, south, east, west].every(Number.isFinite)) return null;
  return { north, south, east, west };
}

router.get("/map-inventory", async (req: Request, res: Response) => {
  const startedAt = Date.now();
  const requestGeneration = String(req.query.generation || req.get("x-map-generation") || randomUUID());
  const bounds = boundsFromRequest(req);
  if (!bounds) return void res.status(400).json({ error: "Missing required bounds: north, south, east, west", generation: requestGeneration });

  const serviceType = req.query.serviceType as string | undefined;
  const trustTier = req.query.trustTier as TrustTier | undefined;
  const zoom = Number(req.query.zoom ?? 10);
  const budget = clampFeatureLimit(Number(req.query.limit), zoom);
  const { north, south, east, west } = bounds;

  try {
    if (!isPersistenceConfigured()) return void res.json({ providers: [], count: 0, total: 0, generation: requestGeneration, budget, note: "Database not configured" });
    const pool = getPool();
    const schema = await detectProviderSchema(pool);
    if (schema === "none") return void res.json({ providers: [], count: 0, total: 0, generation: requestGeneration, budget, note: "No provider table available" });

    if (schema === "legacy") {
      const params: Array<number | string> = [south, north];
      const conditions = ["lat BETWEEN $1 AND $2", "lat IS NOT NULL", "lng IS NOT NULL"];
      if (west <= east) {
        params.push(west, east); conditions.push(`lng BETWEEN $${params.length - 1} AND $${params.length}`);
      } else {
        params.push(west, east); conditions.push(`(lng >= $${params.length - 1} OR lng <= $${params.length})`);
      }
      const terms = serviceTerms(serviceType);
      if (terms.length) {
        const searchText = "LOWER(CONCAT_WS(' ', name, category, source_type, data_source, array_to_string(types, ' ')))";
        const clauses = terms.map((term) => { params.push(`%${term}%`); return `${searchText} LIKE $${params.length}`; });
        conditions.push(`(${clauses.join(" OR ")})`);
      }
      params.push(budget.limit);
      const { rows } = await queryWithStatementTimeout(pool, `
        SELECT id,name,category,formatted_address,locality,administrative_area_level_1,postal_code,lat,lng,phone,website,data_source,source_id,confidence_score,types
        FROM public.medical_providers WHERE ${conditions.join(" AND ")} ORDER BY id ASC LIMIT $${params.length}
      `, params);
      const providers = rows.map((row: Record<string, unknown>) => {
        const rowTrustTier = normalizeTrustTier(row.confidence_score as number | null);
        return {
          id: row.id as number,
          featureId: `legacy:${row.id}`,
          npi: null,
          name: row.name as string,
          providerType: row.category as string | null,
          address: row.formatted_address as string | null,
          city: row.locality as string | null,
          state: row.administrative_area_level_1 as string | null,
          postalCode: row.postal_code as string | null,
          lat: row.lat as number,
          lng: row.lng as number,
          coordinateStatus: "unverified",
          coordinateSource: "legacy-map-inventory",
          phone: budget.detail === "minimal" ? null : row.phone as string | null,
          fax: null,
          website: budget.detail === "full" ? row.website as string | null : null,
          services: Array.isArray(row.types) ? row.types as string[] : serviceType ? [serviceType] : [],
          trustTier: rowTrustTier,
          sources: row.data_source ? [{ sourceId: (row.source_id as string) || String(row.id), sourceLabel: row.data_source as string, trustTier: rowTrustTier }] : [],
        };
      }).filter((provider) => !trustTier || provider.trustTier === trustTier);
      return void res.json({ providers, count: providers.length, total: providers.length, serviceType: serviceType || null, generation: requestGeneration, budget, durationMs: Date.now() - startedAt });
    }

    const params: Array<number | string> = [south, north];
    const conditions = ["pl.lat BETWEEN $1 AND $2", "pl.lat IS NOT NULL", "pl.lng IS NOT NULL", "COALESCE(p.quarantine_status,'accepted')='accepted'", "COALESCE(pl.coordinate_status,'unverified') <> 'invalid'"];
    if (west <= east) {
      params.push(west, east); conditions.push(`pl.lng BETWEEN $${params.length - 1} AND $${params.length}`);
    } else {
      params.push(west, east); conditions.push(`(pl.lng >= $${params.length - 1} OR pl.lng <= $${params.length})`);
    }
    const terms = serviceTerms(serviceType);
    if (terms.length) {
      const clauses = terms.map((term) => { params.push(`%${term}%`); const i = params.length; return `LOWER(COALESCE(ps.service_type,'')) LIKE $${i} OR LOWER(COALESCE(ps.taxonomy,'')) LIKE $${i}`; });
      conditions.push(`EXISTS (SELECT 1 FROM provider_services ps WHERE ps.provider_id=p.id AND (${clauses.join(" OR ")}))`);
    }
    if (trustTier) {
      params.push(trustTier);
      conditions.push(`EXISTS (SELECT 1 FROM provider_sources psrc_filter WHERE psrc_filter.provider_id=p.id AND psrc_filter.trust_tier=$${params.length})`);
    }
    params.push(budget.limit);
    const { rows } = await queryWithStatementTimeout(pool, `
      SELECT p.id,p.npi,p.name,p.provider_type,pl.address,pl.city,pl.state,pl.postal_code,pl.lat,pl.lng,pl.coordinate_status,pl.coordinate_source,
             pc.phone,pc.fax,pc.website,psrc.source_label,psrc.trust_tier,psrc.source_url
      FROM providers p
      INNER JOIN provider_locations pl ON pl.provider_id=p.id
      LEFT JOIN provider_contacts pc ON pc.provider_id=p.id
      LEFT JOIN LATERAL (SELECT source_label,trust_tier,source_url FROM provider_sources WHERE provider_id=p.id ORDER BY id ASC LIMIT 1) psrc ON true
      WHERE ${conditions.join(" AND ")} ORDER BY p.id ASC LIMIT $${params.length}
    `, params);
    const providers = rows.map((row: Record<string, unknown>) => ({
      id: row.id as number,
      featureId: `provider:${row.id}`,
      npi: row.npi as string | null,
      name: row.name as string,
      providerType: row.provider_type as string,
      address: row.address as string | null,
      city: row.city as string | null,
      state: row.state as string | null,
      postalCode: row.postal_code as string | null,
      lat: row.lat as number,
      lng: row.lng as number,
      coordinateStatus: coordinateStatusFromLegacy(row.coordinate_status, true),
      coordinateSource: row.coordinate_source as string | null,
      phone: budget.detail === "minimal" ? null : row.phone as string | null,
      fax: budget.detail === "full" ? row.fax as string | null : null,
      website: budget.detail === "full" ? row.website as string | null : null,
      services: serviceType ? [serviceType] : [],
      trustTier: (row.trust_tier as TrustTier) || "lead",
      sources: row.source_label ? [{ sourceId: row.source_url as string || row.source_label as string, sourceLabel: row.source_label as string, trustTier: (row.trust_tier as TrustTier) || "lead" }] : [],
    }));
    res.setHeader("X-Map-Generation", requestGeneration);
    res.json({ providers, count: providers.length, total: providers.length, serviceType: serviceType || null, generation: requestGeneration, budget, durationMs: Date.now() - startedAt });
  } catch (error) {
    console.error("[MapInventory] query failed", error);
    res.status(503).json({ providers: [], count: 0, total: 0, generation: requestGeneration, budget, error: error instanceof Error ? error.message : "Map inventory query failed" });
  }
});

export default router;

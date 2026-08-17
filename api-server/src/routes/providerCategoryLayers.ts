import { Router, type Request, type Response } from "express";
import { getProviderDatabaseProjects, type ProviderDatabaseProject } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { queryWithStatementTimeout } from "../lib/queryWithStatementTimeout";
import { parseOptionalNumber } from "../lib/providerCoordinates";

const router = Router();
const MAX_PAGE_SIZE = 5000;

type ProviderProjectFamily = ProviderDatabaseProject["family"] | "all";
type Bounds = { north: number; south: number; east: number; west: number };
type CategoryDefinition = {
  family: ProviderProjectFamily;
  typeKeys?: string[];
  capabilityPatterns?: string[];
  sourceKeys?: string[];
};

const CATEGORY_DEFINITIONS: Record<string, CategoryDefinition> = {
  "urgent-cares": {
    family: "all",
    typeKeys: ["urgent_care"],
    capabilityPatterns: ["urgent care", "walk-in", "walk in"],
  },
  "occupational-health-clinics": {
    family: "all",
    typeKeys: ["occupational_health_clinic"],
    capabilityPatterns: ["occupational", "occ med", "employee health", "workers comp", "fit-for-duty", "fit for duty"],
  },
  dentists: {
    family: "all",
    typeKeys: ["dental"],
    capabilityPatterns: ["dental", "dentist", "dd 2813"],
  },
  "blue-hive": {
    family: "primary",
    sourceKeys: ["bluehive"],
  },
  "faa-examiners": {
    family: "all",
    typeKeys: ["faa_provider"],
    capabilityPatterns: ["faa", "aviation medical", "aerospace medicine"],
  },
  "dot-examiners": {
    family: "all",
    typeKeys: ["dot_provider"],
    capabilityPatterns: ["dot exam", "dot medical", "fmcsa", "cdl medical"],
  },
  labs: {
    family: "all",
    typeKeys: ["lab"],
    capabilityPatterns: ["laboratory", "lab", "toxicology", "specimen collection", "drug screen", "phlebotomy"],
  },
  imaging: {
    family: "all",
    typeKeys: ["imaging"],
    capabilityPatterns: ["imaging", "radiology", "x-ray", "xray", "mri", "ct scan", "ultrasound"],
  },
  audiology: {
    family: "all",
    capabilityPatterns: ["audiology", "audiogram", "audiometry", "hearing"],
  },
  "general-practitioners": {
    family: "all",
    typeKeys: ["general_practitioner"],
    capabilityPatterns: ["general practitioner", "general practice", "primary care", "family medicine", "internal medicine"],
  },
  pharmacy: {
    family: "all",
    typeKeys: ["pharmacy_vaccination"],
    capabilityPatterns: ["pharmacy", "vaccination", "immunization", "travel medicine"],
  },
  "international-providers": {
    family: "healthsites",
  },
  "usa-embassy-recommended": {
    family: "usa-embassy",
  },
  "uploaded-clinics": {
    family: "primary",
    sourceKeys: ["my_clinics_upload"],
  },
};

function addParam(params: unknown[], value: unknown): string {
  params.push(value);
  return `$${params.length}`;
}

function asBounds(req: Request): Bounds | null {
  const useBounds = req.query.useBounds === "true" || req.query.bounds === "true";
  if (!useBounds) return null;
  const north = parseOptionalNumber(req.query.north);
  const south = parseOptionalNumber(req.query.south);
  const east = parseOptionalNumber(req.query.east);
  const west = parseOptionalNumber(req.query.west);
  if (north === null || south === null || east === null || west === null) return null;
  return { north, south, east, west };
}

function matchingProjects(definition: CategoryDefinition): ProviderDatabaseProject[] {
  const projects = getProviderDatabaseProjects();
  if (definition.family === "all") return projects;
  return projects.filter((project) => project.family === definition.family);
}

async function canonicalViewAvailable(project: ProviderDatabaseProject): Promise<boolean> {
  const { rows } = await queryWithStatementTimeout(
    project.pool,
    "SELECT to_regclass('public.provider_master_map_view') IS NOT NULL AS ok",
    [],
  );
  return rows[0]?.ok === true;
}

function categoryWhere(definition: CategoryDefinition, bounds: Bounds | null, params: unknown[]): string {
  const conditions = [
    "pmv.lat IS NOT NULL",
    "pmv.lng IS NOT NULL",
    "pmv.lat BETWEEN -90 AND 90",
    "pmv.lng BETWEEN -180 AND 180",
    "(pmv.lat <> 0 OR pmv.lng <> 0)",
  ];

  if (definition.sourceKeys?.length) {
    const placeholder = addParam(params, definition.sourceKeys.map((value) => value.toLowerCase()));
    conditions.push(`lower(COALESCE(pmv.source_key, '')) = ANY(${placeholder}::text[])`);
  }

  const typePredicates: string[] = [];
  if (definition.typeKeys?.length) {
    const placeholder = addParam(params, definition.typeKeys.map((value) => value.toLowerCase()));
    typePredicates.push(`lower(COALESCE(pmv.primary_provider_type, '')) = ANY(${placeholder}::text[])`);
  }
  if (definition.capabilityPatterns?.length) {
    const placeholder = addParam(params, definition.capabilityPatterns.map((value) => `%${value.toLowerCase()}%`));
    typePredicates.push(`lower(array_to_string(COALESCE(pmv.capability_tags, ARRAY[]::text[]), ' ')) LIKE ANY(${placeholder}::text[])`);
  }
  if (typePredicates.length) conditions.push(`(${typePredicates.join(" OR ")})`);

  if (bounds) {
    conditions.push(`pmv.lat BETWEEN ${addParam(params, bounds.south)} AND ${addParam(params, bounds.north)}`);
    conditions.push(
      bounds.west <= bounds.east
        ? `pmv.lng BETWEEN ${addParam(params, bounds.west)} AND ${addParam(params, bounds.east)}`
        : `(pmv.lng >= ${addParam(params, bounds.west)} OR pmv.lng <= ${addParam(params, bounds.east)})`,
    );
  }

  return conditions.join(" AND ");
}

async function countProject(project: ProviderDatabaseProject, definition: CategoryDefinition, bounds: Bounds | null): Promise<number> {
  const params: unknown[] = [];
  const where = categoryWhere(definition, bounds, params);
  const { rows } = await queryWithStatementTimeout(
    project.pool,
    `SELECT count(*)::int AS total FROM public.provider_master_map_view pmv WHERE ${where}`,
    params,
  );
  return Number(rows[0]?.total || 0);
}

async function loadProjectPage(
  project: ProviderDatabaseProject,
  definition: CategoryDefinition,
  bounds: Bounds | null,
  limit: number,
  offset: number,
): Promise<Record<string, unknown>[]> {
  const params: unknown[] = [];
  const where = categoryWhere(definition, bounds, params);
  const limitParam = addParam(params, limit);
  const offsetParam = addParam(params, offset);
  const { rows } = await queryWithStatementTimeout(project.pool, `
    SELECT
      pmv.id,
      pmv.master_key,
      pmv.name,
      pmv.address,
      pmv.city,
      pmv.admin_area,
      pmv.postal_code,
      pmv.lat,
      pmv.lng,
      pmv.phone,
      pmv.website,
      pmv.primary_provider_type,
      pmv.capability_tags,
      pmv.source_key,
      pmv.source_kind,
      pmv.quality_score
    FROM public.provider_master_map_view pmv
    WHERE ${where}
    ORDER BY pmv.name ASC, pmv.id ASC
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `, params);
  return rows;
}

function toProvider(row: Record<string, unknown>, category: string): Record<string, unknown> {
  const type = String(row.primary_provider_type || "unknown");
  const tags = Array.isArray(row.capability_tags) ? row.capability_tags.map(String) : [type];
  return {
    id: String(row.master_key || row.id || ""),
    source_id: String(row.master_key || row.id || ""),
    name: String(row.name || "Unnamed provider"),
    address: row.address ?? null,
    address_1: row.address ?? null,
    city: row.city ?? null,
    admin_area: row.admin_area ?? null,
    state: row.admin_area ?? null,
    postal_code: row.postal_code ?? null,
    zip: row.postal_code ?? null,
    lat: Number(row.lat),
    lng: Number(row.lng),
    phone: row.phone ?? null,
    website: row.website ?? null,
    clinic_type: type,
    providerType: type,
    category: type,
    services: tags,
    categories: tags,
    types: tags,
    source: String(row.source_key || "indexed"),
    data_source: String(row.source_key || "indexed"),
    source_kind: String(row.source_kind || "stored"),
    trust_tier: Number(row.quality_score || 0) >= 0.85 ? "verified" : Number(row.quality_score || 0) >= 0.7 ? "registry" : "directory",
    confidence_score: row.quality_score == null ? null : Number(row.quality_score),
    provider_layer_category: category,
  };
}

router.get("/provider-category-layers/:category", async (req: Request, res: Response) => {
  const rawCategory = req.params.category;
  const category = Array.isArray(rawCategory) ? rawCategory[0] || "" : rawCategory || "";
  const definition = CATEGORY_DEFINITIONS[category];
  if (!definition) {
    res.status(400).json({ error: `Unknown provider category: ${category}`, categories: Object.keys(CATEGORY_DEFINITIONS) });
    return;
  }

  try {
    if (!isPersistenceConfigured()) {
      res.json({ providers: [], count: 0, loaded: 0, total: 0, page: 1, limit: 0, hasMore: false, category, visibleCapped: false });
      return;
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 2000, 1), MAX_PAGE_SIZE);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const bounds = asBounds(req);
    const warnings: string[] = [];

    const probes = (
      await Promise.all(matchingProjects(definition).map(async (project) => {
        try {
          if (!(await canonicalViewAvailable(project))) throw new Error("canonical provider view is unavailable");
          return { project, total: await countProject(project, definition, bounds) };
        } catch (error) {
          warnings.push(`${project.id}: ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      }))
    ).filter((probe): probe is { project: ProviderDatabaseProject; total: number } => Boolean(probe));

    const total = probes.reduce((sum, probe) => sum + probe.total, 0);
    let offset = (page - 1) * limit;
    let remaining = limit;
    const rows: Record<string, unknown>[] = [];

    for (const probe of probes) {
      if (remaining <= 0) break;
      if (offset >= probe.total) {
        offset -= probe.total;
        continue;
      }
      const requested = Math.min(remaining, probe.total - offset);
      try {
        rows.push(...await loadProjectPage(probe.project, definition, bounds, requested, offset));
      } catch (error) {
        warnings.push(`${probe.project.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
      remaining -= requested;
      offset = 0;
    }

    const providers = rows.map((row) => toProvider(row, category));
    res.json({
      providers,
      count: providers.length,
      loaded: providers.length,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      category,
      databaseProjects: probes.map((probe) => probe.project.id),
      partial: warnings.length > 0,
      ...(warnings.length ? { warnings, warning: warnings.join(" ") } : {}),
      visibleCapped: false,
    });
  } catch (error) {
    const warning = error instanceof Error ? error.message : "Provider category layer query failed";
    console.error(`[ProviderCategoryLayers] ${category} query failed:`, error);
    res.status(503).json({
      providers: [],
      count: 0,
      loaded: 0,
      total: 0,
      category,
      warning,
      transientFailure: true,
      visibleCapped: false,
    });
  }
});

export default router;

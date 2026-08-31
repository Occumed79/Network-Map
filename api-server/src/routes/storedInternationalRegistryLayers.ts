import { Router, type Request, type Response } from "express";
import { getProviderDatabaseProjects, type ProviderDatabaseProject } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { parseOptionalNumber } from "../lib/providerCoordinates";
import { queryWithStatementTimeout } from "../lib/queryWithStatementTimeout";

const router = Router();
const MAX_PAGE_SIZE = 5000;

type Bounds = { north: number; south: number; east: number; west: number };
type StoredRegistryDefinition = { sourceKey: string; countryCode: string };

const REGISTRIES: Record<string, StoredRegistryDefinition> = {
  "brazil-cnes": { sourceKey: "br_cnes", countryCode: "BR" },
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

async function canonicalViewAvailable(project: ProviderDatabaseProject): Promise<boolean> {
  const { rows } = await queryWithStatementTimeout(
    project.pool,
    "SELECT to_regclass('public.provider_master_map_view') IS NOT NULL AS ok",
    [],
  );
  return rows[0]?.ok === true;
}

function registryWhere(definition: StoredRegistryDefinition, bounds: Bounds | null, params: unknown[]): string {
  const conditions = [
    "pmv.lat IS NOT NULL",
    "pmv.lng IS NOT NULL",
    "pmv.lat BETWEEN -90 AND 90",
    "pmv.lng BETWEEN -180 AND 180",
    "(pmv.lat <> 0 OR pmv.lng <> 0)",
    `lower(COALESCE(pmv.source_key, '')) = ${addParam(params, definition.sourceKey.toLowerCase())}`,
    `upper(COALESCE(pmv.country_code, '')) = ${addParam(params, definition.countryCode.toUpperCase())}`,
  ];

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

async function countProject(project: ProviderDatabaseProject, definition: StoredRegistryDefinition, bounds: Bounds | null): Promise<number> {
  const params: unknown[] = [];
  const where = registryWhere(definition, bounds, params);
  const { rows } = await queryWithStatementTimeout(
    project.pool,
    `SELECT count(*)::int AS total FROM public.provider_master_map_view pmv WHERE ${where}`,
    params,
  );
  return Number(rows[0]?.total || 0);
}

async function loadProjectPage(
  project: ProviderDatabaseProject,
  definition: StoredRegistryDefinition,
  bounds: Bounds | null,
  limit: number,
  offset: number,
): Promise<Record<string, unknown>[]> {
  const params: unknown[] = [];
  const where = registryWhere(definition, bounds, params);
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
      pmv.country_code,
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

function toProvider(row: Record<string, unknown>, source: string): Record<string, unknown> {
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
    country: "Brazil",
    country_code: row.country_code ?? "BR",
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
    source: String(row.source_key || "br_cnes"),
    data_source: String(row.source_key || "br_cnes"),
    source_kind: String(row.source_kind || "government_registry"),
    trust_tier: "registry",
    confidence_score: row.quality_score == null ? null : Number(row.quality_score),
    provider_layer_category: source,
  };
}

router.get("/stored-international-registry-layers/:source", async (req: Request, res: Response) => {
  const sourceParam = Array.isArray(req.params.source) ? req.params.source[0] : req.params.source;
  const source = String(sourceParam || "");
  const definition = REGISTRIES[source];
  if (!definition) {
    res.status(400).json({ error: `Unknown stored international registry source: ${source}`, sources: Object.keys(REGISTRIES) });
    return;
  }

  try {
    if (!isPersistenceConfigured()) {
      res.json({ providers: [], count: 0, loaded: 0, total: 0, page: 1, limit: 0, hasMore: false, source, visibleCapped: false });
      return;
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 2000, 1), MAX_PAGE_SIZE);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const bounds = asBounds(req);
    const warnings: string[] = [];

    const probes = (
      await Promise.all(getProviderDatabaseProjects().map(async (project) => {
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
      rows.push(...await loadProjectPage(probe.project, definition, bounds, requested, offset));
      remaining -= requested;
      offset = 0;
    }

    const providers = rows.map((row) => toProvider(row, source));
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json({
      providers,
      count: providers.length,
      loaded: providers.length,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      source,
      databaseProjects: probes.map((probe) => probe.project.id),
      officialRegistry: true,
      synchronized: true,
      live: false,
      partial: warnings.length > 0,
      ...(warnings.length ? { warnings, warning: warnings.join(" ") } : {}),
      visibleCapped: false,
    });
  } catch (error) {
    const warning = error instanceof Error ? error.message : "Stored international registry query failed";
    console.error(`[StoredInternationalRegistryLayers] ${source} failed:`, error);
    res.status(503).json({
      providers: [], count: 0, loaded: 0, total: 0, source,
      warning, transientFailure: true, visibleCapped: false,
    });
  }
});

export default router;

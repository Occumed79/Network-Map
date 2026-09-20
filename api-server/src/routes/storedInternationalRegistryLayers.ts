import { Router, type Request, type Response } from "express";
import {
  getRegistryDatabaseProject,
  type RegistryDatabaseId,
  type RegistryDatabaseProject,
} from "@workspace/db";
import { parseOptionalNumber } from "../lib/providerCoordinates";
import { queryWithStatementTimeout } from "../lib/queryWithStatementTimeout";

const router = Router();
const MAX_PAGE_SIZE = 5000;

type Bounds = { north: number; south: number; east: number; west: number };
type StoredRegistryDefinition = {
  sourceKey: string;
  countryCode: string;
  countryName: string;
};

const REGISTRIES: Record<RegistryDatabaseId, StoredRegistryDefinition> = {
  "germany-klinik-atlas": { sourceKey: "de_klinikatlas", countryCode: "DE", countryName: "Germany" },
  "canada-odhf": { sourceKey: "ca_odhf", countryCode: "CA", countryName: "Canada" },
  "australia-healthdirect": { sourceKey: "au_healthdirect", countryCode: "AU", countryName: "Australia" },
  "croatia-hzzo-primary-care": { sourceKey: "hr_hzzo_pzz_ckan", countryCode: "HR", countryName: "Croatia" },
  "chile-minsal": { sourceKey: "cl_minsal_establishments", countryCode: "CL", countryName: "Chile" },
  "colombia-reps": { sourceKey: "co_reps_sispro", countryCode: "CO", countryName: "Colombia" },
  "ireland-hse-health-centres": { sourceKey: "ie_hse_health_centres", countryCode: "IE", countryName: "Ireland" },
  "latvia-medical-facilities": { sourceKey: "lv_medical_facilities", countryCode: "LV", countryName: "Latvia" },
  "lithuania-vaspvt": { sourceKey: "lt_vaspvt_licensed_facilities", countryCode: "LT", countryName: "Lithuania" },
  "singapore-chas": { sourceKey: "sg_moh_chas", countryCode: "SG", countryName: "Singapore" },
  "mexico-clues": { sourceKey: "mx_clues_2024", countryCode: "MX", countryName: "Mexico" },
  "taiwan-nlsc-medical": { sourceKey: "tw_nlsc_medical", countryCode: "TW", countryName: "Taiwan" },
  "new-zealand-health-facilities": { sourceKey: "nz_health_facilities", countryCode: "NZ", countryName: "New Zealand" },
  "brazil-cnes": { sourceKey: "br_cnes", countryCode: "BR", countryName: "Brazil" },
  "czechia-nrpzs": { sourceKey: "cz_nrpzs", countryCode: "CZ", countryName: "Czechia" },
  "argentina-refes": { sourceKey: "ar_refes", countryCode: "AR", countryName: "Argentina" },
  "finland-ptv-healthcare": { sourceKey: "fi_ptv_healthcare", countryCode: "FI", countryName: "Finland" },
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

async function registryTableAvailable(project: RegistryDatabaseProject): Promise<boolean> {
  const { rows } = await queryWithStatementTimeout(
    project.pool,
    "SELECT to_regclass('public.official_registry_providers') IS NOT NULL AS ok",
    [],
  );
  return rows[0]?.ok === true;
}

function registryWhere(definition: StoredRegistryDefinition, bounds: Bounds | null, params: unknown[]): string {
  const conditions = [
    "p.lat BETWEEN -90 AND 90",
    "p.lng BETWEEN -180 AND 180",
    "(p.lat <> 0 OR p.lng <> 0)",
    `upper(p.country_code) = ${addParam(params, definition.countryCode)}`,
  ];
  if (bounds) {
    conditions.push(`p.lat BETWEEN ${addParam(params, bounds.south)} AND ${addParam(params, bounds.north)}`);
    conditions.push(bounds.west <= bounds.east
      ? `p.lng BETWEEN ${addParam(params, bounds.west)} AND ${addParam(params, bounds.east)}`
      : `(p.lng >= ${addParam(params, bounds.west)} OR p.lng <= ${addParam(params, bounds.east)})`);
  }
  return conditions.join(" AND ");
}

function toProvider(row: Record<string, unknown>, source: string, definition: StoredRegistryDefinition) {
  const type = String(row.primary_provider_type || "unknown");
  const tags = Array.isArray(row.capability_tags) ? row.capability_tags.map(String) : [type];
  return {
    id: String(row.master_key || row.source_record_id || ""),
    source_id: String(row.source_record_id || row.master_key || ""),
    name: String(row.name || "Unnamed provider"),
    address: row.formatted_address ?? row.address_line1 ?? null,
    address_1: row.address_line1 ?? row.formatted_address ?? null,
    city: row.city ?? null,
    admin_area: row.state_region ?? null,
    state: row.state_region ?? null,
    postal_code: row.postal_code ?? null,
    zip: row.postal_code ?? null,
    country: definition.countryName,
    country_code: row.country_code ?? definition.countryCode,
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
    source: definition.sourceKey,
    data_source: definition.sourceKey,
    source_kind: "government_registry",
    trust_tier: "registry",
    confidence_score: row.quality_score == null ? null : Number(row.quality_score),
    provider_layer_category: source,
  };
}

router.get("/stored-international-registry-layers/:source", async (req: Request, res: Response) => {
  const source = String(Array.isArray(req.params.source) ? req.params.source[0] : req.params.source || "") as RegistryDatabaseId;
  const definition = REGISTRIES[source];
  if (!definition) {
    res.status(400).json({ error: `Unknown stored international registry source: ${source}`, sources: Object.keys(REGISTRIES) });
    return;
  }

  const project = getRegistryDatabaseProject(source);
  if (!project) {
    res.json({
      providers: [], count: 0, loaded: 0, total: 0, nationalTotal: null,
      page: 1, limit: 0, hasMore: false, source, visibleCapped: false,
      registryState: "not_synchronized", synchronized: false,
      warning: `${source} dedicated registry database is not configured.`,
    });
    return;
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 2000, 1), MAX_PAGE_SIZE);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const bounds = asBounds(req);

  try {
    if (!(await registryTableAvailable(project))) {
      res.json({
        providers: [], count: 0, loaded: 0, total: 0, nationalTotal: null,
        page, limit, hasMore: false, source, visibleCapped: false,
        registryState: "not_synchronized", synchronized: false,
        warning: "Official registry data has not been synchronized into this country database.",
      });
      return;
    }

    const nationalParams: unknown[] = [definition.countryCode];
    const nationalResult = await queryWithStatementTimeout(project.pool, `
      SELECT count(*)::int AS total
      FROM public.official_registry_providers p
      WHERE upper(p.country_code) = $1
        AND p.lat BETWEEN -90 AND 90 AND p.lng BETWEEN -180 AND 180
        AND (p.lat <> 0 OR p.lng <> 0)
    `, nationalParams);
    const nationalTotal = Number(nationalResult.rows[0]?.total || 0);

    const params: unknown[] = [];
    const where = registryWhere(definition, bounds, params);
    const countResult = await queryWithStatementTimeout(
      project.pool,
      `SELECT count(*)::int AS total FROM public.official_registry_providers p WHERE ${where}`,
      params,
    );
    const total = Number(countResult.rows[0]?.total || 0);
    const limitParam = addParam(params, limit);
    const offsetParam = addParam(params, (page - 1) * limit);
    const pageResult = await queryWithStatementTimeout(project.pool, `
      SELECT source_record_id, source_url, name, address_line1, formatted_address,
        city, state_region, postal_code, country_code, lat, lng, phone, website,
        primary_provider_type, capability_tags, quality_score, master_key
      FROM public.official_registry_providers p
      WHERE ${where}
      ORDER BY p.name ASC, p.source_record_id ASC
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `, params);

    const providers = pageResult.rows.map((row) => toProvider(row, source, definition));
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json({
      providers,
      count: providers.length,
      loaded: providers.length,
      total,
      nationalTotal,
      page,
      limit,
      hasMore: page * limit < total,
      source,
      databaseProject: project.id,
      officialRegistry: true,
      synchronized: nationalTotal > 0,
      registryState: nationalTotal > 0 ? "ready" : "not_synchronized",
      resultScope: bounds ? "viewport" : "national",
      live: false,
      partial: false,
      visibleCapped: false,
    });
  } catch (error) {
    const warning = error instanceof Error ? error.message : "Stored international registry query failed";
    console.error(`[StoredInternationalRegistryLayers] ${source} failed:`, error);
    res.status(503).json({
      providers: [], count: 0, loaded: 0, total: 0, source,
      warning, transientFailure: true, registryState: "source_failed", visibleCapped: false,
    });
  }
});

export default router;

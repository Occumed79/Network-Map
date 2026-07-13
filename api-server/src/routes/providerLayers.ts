import { Router, type Request, type Response } from "express";
import { getPool } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { detectProviderSchema } from "../lib/providerSchema";
import { queryWithStatementTimeout } from "../lib/queryWithStatementTimeout";
import { parseOptionalNumber } from "../lib/providerCoordinates";
import { legacyMapEligibilitySql } from "../lib/providerDataQuality";

const router = Router();
const SOURCE_KEY_MY_CLINICS = "my_clinics_upload";
const MAX_PAGE_SIZE = 5000;

const SOURCE_CONFIG: Record<string, { legacyLabel: string; canonicalKey: string }> = {
  bluehive: { legacyLabel: "BlueHive", canonicalKey: "bluehive" },
  dentists: { legacyLabel: "Dentist Dataset", canonicalKey: "dentist_dataset" },
  indexed: { legacyLabel: "indexed", canonicalKey: "indexed" },
  "my-clinics": { legacyLabel: "My Clinics", canonicalKey: SOURCE_KEY_MY_CLINICS },
};

const EXPLICIT_LAYER_SOURCE_KEYS = ["bluehive", "dentist_dataset", SOURCE_KEY_MY_CLINICS];
const EXPLICIT_LAYER_LEGACY_LABELS = ["bluehive", "dentist dataset", "my clinics"];

type LayerProvider = Record<string, unknown> & {
  name?: string;
  clinic_name?: string;
  lat?: number;
  lng?: number;
  source_id?: string | null;
};

type Bounds = { north: number; south: number; east: number; west: number };

function normalizeTrustTier(confidenceScore: number | null): "verified" | "registry" | "directory" | "lead" {
  if (confidenceScore !== null && confidenceScore >= 0.85) return "verified";
  if (confidenceScore !== null && confidenceScore >= 0.7) return "registry";
  if (confidenceScore !== null && confidenceScore >= 0.5) return "directory";
  return "lead";
}

function asFiniteNumber(value: unknown): number | null {
  return parseOptionalNumber(value);
}

function addParam(params: Array<string | number>, value: string | number): string {
  params.push(value);
  return `$${params.length}`;
}

function providerIdentity(provider: LayerProvider): string {
  const name = String(provider.name || provider.clinic_name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const lat = Number(provider.lat);
  const lng = Number(provider.lng);
  if (name && Number.isFinite(lat) && Number.isFinite(lng)) {
    return `${name}|${lat.toFixed(5)}|${lng.toFixed(5)}`;
  }
  return String(provider.source_id || `${name}|${provider.city || ""}|${provider.state || ""}`);
}

export function mergeMyClinicsLayerProviders(...groups: LayerProvider[][]): LayerProvider[] {
  const merged = new Map<string, LayerProvider>();
  for (const provider of groups.flat()) {
    const key = providerIdentity(provider);
    if (!merged.has(key)) merged.set(key, provider);
  }
  return [...merged.values()].sort((a, b) =>
    String(a.name || a.clinic_name || "").localeCompare(String(b.name || b.clinic_name || "")),
  );
}

async function relationExists(pool: ReturnType<typeof getPool>, relation: string): Promise<boolean> {
  const { rows } = await pool.query("SELECT to_regclass($1) IS NOT NULL AS ok", [`public.${relation}`]);
  return rows[0]?.ok === true;
}

async function canonicalReadsEnabled(pool: ReturnType<typeof getPool>): Promise<boolean> {
  const required = await pool.query(`
    SELECT
      to_regclass('public.provider_master_map_view') IS NOT NULL AS has_view,
      to_regclass('public.provider_schema_state') IS NOT NULL AS has_state
  `);
  if (!required.rows[0]?.has_view || !required.rows[0]?.has_state) return false;
  const state = await pool.query(`
    SELECT canonical_read_enabled
    FROM public.provider_schema_state
    WHERE id = 1
  `);
  return state.rows[0]?.canonical_read_enabled === true;
}

async function loadSavedCandidateProviders(
  pool: ReturnType<typeof getPool>,
  bounds: Bounds | null,
  clinicType: string,
): Promise<LayerProvider[]> {
  if (!(await relationExists(pool, "provider_candidates"))) return [];

  const params: Array<string | number> = [];
  const conditions = [
    "status = 'saved'",
    "lat IS NOT NULL",
    "lng IS NOT NULL",
    "lat BETWEEN -90 AND 90",
    "lng BETWEEN -180 AND 180",
    "(lat <> 0 OR lng <> 0)",
    "NULLIF(btrim(name), '') IS NOT NULL",
    "lower(btrim(name)) NOT IN ('nan','null','none','n/a','na','unnamed','unnamed clinic')",
  ];
  if (bounds) {
    conditions.push(`lat BETWEEN ${addParam(params, bounds.south)} AND ${addParam(params, bounds.north)}`);
    conditions.push(
      bounds.west <= bounds.east
        ? `lng BETWEEN ${addParam(params, bounds.west)} AND ${addParam(params, bounds.east)}`
        : `(lng >= ${addParam(params, bounds.west)} OR lng <= ${addParam(params, bounds.east)})`,
    );
  }
  if (clinicType) {
    const placeholder = addParam(params, clinicType);
    conditions.push(`(
      clinic_type = ${placeholder}
      OR array_to_string(services, ',') ILIKE '%' || ${placeholder} || '%'
      OR array_to_string(categories, ',') ILIKE '%' || ${placeholder} || '%'
    )`);
  }

  const { rows } = await queryWithStatementTimeout(pool, `
    SELECT id::text, name, address, city, admin_area, postal_code, lat, lng, phone, website,
           source_url, trust_tier, confidence_score, clinic_type, services, categories
    FROM public.provider_candidates
    WHERE ${conditions.join(" AND ")}
    ORDER BY name ASC
  `, params);

  return rows.map((row: Record<string, unknown>) => {
    const services = Array.isArray(row.services) ? row.services : [];
    const categories = Array.isArray(row.categories) ? row.categories : [];
    const types = [...new Set([...services, ...categories].map(String))];
    return {
      clinic_name: row.name as string,
      name: row.name as string,
      address_1: row.address as string | null,
      city: row.city as string | null,
      state: row.admin_area as string | null,
      zip: row.postal_code as string | null,
      phone: row.phone as string | null,
      website: row.website as string | null,
      lat: Number(row.lat),
      lng: Number(row.lng),
      npi: null,
      source_url: row.source_url as string | null,
      source_id: `candidate:${String(row.id)}`,
      source_type: "saved_candidate",
      data_source: "My Clinics",
      source: "provider_candidates",
      trust_tier: (row.trust_tier || "saved") as string,
      confidence_score: row.confidence_score == null ? null : Number(row.confidence_score),
      category: (row.clinic_type || "unknown") as string,
      clinic_type: (row.clinic_type || "unknown") as string,
      providerType: (row.clinic_type || "unknown") as string,
      taxonomy_description: (row.clinic_type || "unknown") as string,
      services: types.join(", "),
      types,
    };
  });
}

function paginate<T>(rows: T[], all: boolean, page: number, limit: number): T[] {
  if (all) return rows;
  const offset = (page - 1) * limit;
  return rows.slice(offset, offset + limit);
}

function sendLayerResponse(
  res: Response,
  input: {
    providers: LayerProvider[];
    total: number;
    source: string;
    page: number;
    limit: number;
    all: boolean;
    storage: string;
  },
): void {
  const { providers, total, source, page, limit, all, storage } = input;
  res.json({
    providers,
    count: providers.length,
    loaded: providers.length,
    total,
    source,
    page: all ? 1 : page,
    limit: all ? providers.length : limit,
    hasMore: all ? false : (page - 1) * limit + providers.length < total,
    all,
    storage,
    visibleCapped: false,
  });
}

async function loadCanonicalLayer(
  pool: ReturnType<typeof getPool>,
  source: string,
  bounds: Bounds | null,
  clinicType: string,
  page: number,
  limit: number,
  all: boolean,
  savedCandidates: LayerProvider[],
): Promise<{ providers: LayerProvider[]; total: number }> {
  const config = SOURCE_CONFIG[source];
  const params: Array<string | number> = [];
  const conditions: string[] = [];

  if (source === "indexed") {
    const placeholders = EXPLICIT_LAYER_SOURCE_KEYS.map((key) => addParam(params, key));
    conditions.push(`COALESCE(pmv.source_key, '') NOT IN (${placeholders.join(",")})`);
  } else {
    conditions.push(`pmv.source_key = ${addParam(params, config.canonicalKey)}`);
  }

  if (bounds) {
    conditions.push(`pmv.lat BETWEEN ${addParam(params, bounds.south)} AND ${addParam(params, bounds.north)}`);
    conditions.push(
      bounds.west <= bounds.east
        ? `pmv.lng BETWEEN ${addParam(params, bounds.west)} AND ${addParam(params, bounds.east)}`
        : `(pmv.lng >= ${addParam(params, bounds.west)} OR pmv.lng <= ${addParam(params, bounds.east)})`,
    );
  }
  if (clinicType) {
    const placeholder = addParam(params, clinicType);
    conditions.push(`(
      COALESCE(pmv.primary_provider_type, '') = ${placeholder}
      OR array_to_string(COALESCE(pmv.capability_tags, ARRAY[]::text[]), ',') ILIKE '%' || ${placeholder} || '%'
    )`);
  }

  const whereSql = conditions.length ? conditions.join(" AND ") : "TRUE";
  const countResult = await queryWithStatementTimeout(pool, `
    SELECT count(*)::int AS total
    FROM public.provider_master_map_view pmv
    WHERE ${whereSql}
  `, params);
  const storedTotal = Number(countResult.rows[0]?.total || 0);

  const dataParams = [...params];
  const combineSavedCandidates = source === "my-clinics";
  const limitClause = all || combineSavedCandidates
    ? ""
    : `LIMIT ${addParam(dataParams, limit)} OFFSET ${addParam(dataParams, (page - 1) * limit)}`;

  const { rows } = await queryWithStatementTimeout(pool, `
    SELECT *
    FROM public.provider_master_map_view pmv
    WHERE ${whereSql}
    ORDER BY pmv.name ASC, pmv.id ASC
    ${limitClause}
  `, dataParams);

  const storedProviders: LayerProvider[] = rows.map((row: Record<string, unknown>) => {
    const providerType = String(row.primary_provider_type || row.clinic_type || "unknown");
    const tags = Array.isArray(row.capability_tags)
      ? row.capability_tags.map(String)
      : Array.isArray(row.services)
        ? row.services.map(String)
        : [providerType];
    return {
      clinic_name: String(row.name || ""),
      name: String(row.name || ""),
      address_1: (row.address || row.address_1 || null) as string | null,
      city: (row.city || null) as string | null,
      state: (row.admin_area || row.state || null) as string | null,
      zip: (row.postal_code || row.zip || null) as string | null,
      phone: (row.phone || null) as string | null,
      website: (row.website || null) as string | null,
      lat: Number(row.lat),
      lng: Number(row.lng),
      npi: (row.npi || null) as string | null,
      source_url: null,
      source_id: String(row.master_key || row.id || ""),
      source_type: row.source_kind === "saved" ? "user_upload" : "canonical",
      data_source: String(row.source_key || row.source || "canonical"),
      source: String(row.source_key || row.source || "canonical"),
      trust_tier: row.source_kind === "saved" ? "verified" : normalizeTrustTier(row.quality_score == null ? null : Number(row.quality_score)),
      confidence_score: row.quality_score == null ? null : Number(row.quality_score),
      category: providerType,
      clinic_type: providerType,
      providerType,
      taxonomy_description: providerType,
      services: tags.join(", "),
      types: tags,
    };
  });

  if (!combineSavedCandidates) return { providers: storedProviders, total: storedTotal };
  const combined = mergeMyClinicsLayerProviders(storedProviders, savedCandidates);
  return { providers: paginate(combined, all, page, limit), total: combined.length };
}

async function loadLegacyLayer(
  pool: ReturnType<typeof getPool>,
  source: string,
  bounds: Bounds | null,
  page: number,
  limit: number,
  all: boolean,
  savedCandidates: LayerProvider[],
): Promise<{ providers: LayerProvider[]; total: number }> {
  const config = SOURCE_CONFIG[source];
  const eligibleViewExists = await relationExists(pool, "provider_map_eligible");
  const relation = eligibleViewExists ? "public.provider_map_eligible" : "public.medical_providers";
  const params: Array<string | number> = [];
  const conditions: string[] = eligibleViewExists ? [] : [legacyMapEligibilitySql("mp")];

  if (source === "indexed") {
    const placeholders = EXPLICIT_LAYER_LEGACY_LABELS.map((label) => addParam(params, label));
    conditions.push(`lower(COALESCE(mp.data_source, '')) NOT IN (${placeholders.join(",")})`);
  } else {
    conditions.push(`lower(COALESCE(mp.data_source, '')) = ${addParam(params, config.legacyLabel.toLowerCase())}`);
  }

  if (bounds) {
    conditions.push(`mp.lat BETWEEN ${addParam(params, bounds.south)} AND ${addParam(params, bounds.north)}`);
    conditions.push(
      bounds.west <= bounds.east
        ? `mp.lng BETWEEN ${addParam(params, bounds.west)} AND ${addParam(params, bounds.east)}`
        : `(mp.lng >= ${addParam(params, bounds.west)} OR mp.lng <= ${addParam(params, bounds.east)})`,
    );
  }

  const whereSql = conditions.length ? conditions.join(" AND ") : "TRUE";
  const countResult = await queryWithStatementTimeout(pool, `
    SELECT count(*)::int AS total
    FROM ${relation} mp
    WHERE ${whereSql}
  `, params);
  const storedTotal = Number(countResult.rows[0]?.total || 0);

  const combineSavedCandidates = source === "my-clinics";
  const dataParams = [...params];
  const limitClause = all || combineSavedCandidates
    ? ""
    : `LIMIT ${addParam(dataParams, limit)} OFFSET ${addParam(dataParams, (page - 1) * limit)}`;

  const { rows } = await queryWithStatementTimeout(pool, `
    SELECT mp.id, mp.name, mp.formatted_address, mp.locality, mp.administrative_area_level_1,
           mp.postal_code, mp.lat, mp.lng, mp.phone, mp.website, mp.source_id, mp.data_source,
           mp.source_type, mp.confidence_score, mp.category, mp.types
    FROM ${relation} mp
    WHERE ${whereSql}
    ORDER BY mp.id ASC
    ${limitClause}
  `, dataParams);

  const storedProviders: LayerProvider[] = rows.map((row: Record<string, unknown>) => ({
    clinic_name: row.name as string,
    name: row.name as string,
    address_1: row.formatted_address as string | null,
    city: row.locality as string | null,
    state: row.administrative_area_level_1 as string | null,
    zip: row.postal_code as string | null,
    phone: row.phone as string | null,
    website: row.website as string | null,
    lat: Number(row.lat),
    lng: Number(row.lng),
    npi: null,
    source_url: null,
    source_id: (row.source_id || `legacy:${String(row.id)}`) as string,
    source_type: row.source_type as string | null,
    data_source: row.data_source as string,
    trust_tier: normalizeTrustTier(row.confidence_score == null ? null : Number(row.confidence_score)),
    confidence_score: row.confidence_score == null ? null : Number(row.confidence_score),
    taxonomy_description: row.category as string | null,
    category: row.category as string | null,
    types: Array.isArray(row.types) ? row.types : [],
    services: Array.isArray(row.types) ? (row.types as string[]).join(", ") : null,
  }));

  if (!combineSavedCandidates) return { providers: storedProviders, total: storedTotal };
  const combined = mergeMyClinicsLayerProviders(storedProviders, savedCandidates);
  return { providers: paginate(combined, all, page, limit), total: combined.length };
}

async function loadNormalizedLayer(
  pool: ReturnType<typeof getPool>,
  source: string,
  bounds: Bounds | null,
  page: number,
  limit: number,
  all: boolean,
  savedCandidates: LayerProvider[],
): Promise<{ providers: LayerProvider[]; total: number }> {
  const config = SOURCE_CONFIG[source];
  const params: Array<string | number> = [];
  const boundsConditions: string[] = [];
  if (bounds) {
    boundsConditions.push(`pl.lat BETWEEN ${addParam(params, bounds.south)} AND ${addParam(params, bounds.north)}`);
    boundsConditions.push(
      bounds.west <= bounds.east
        ? `pl.lng BETWEEN ${addParam(params, bounds.west)} AND ${addParam(params, bounds.east)}`
        : `(pl.lng >= ${addParam(params, bounds.west)} OR pl.lng <= ${addParam(params, bounds.east)})`,
    );
  }

  const sourcePredicate = source === "indexed"
    ? "lower(psrc.source_label) NOT IN ('bluehive', 'dentist dataset', 'my clinics')"
    : `psrc.source_label = ${addParam(params, config.legacyLabel)}`;

  const providerSourceJoin = `
    INNER JOIN LATERAL (
      SELECT source_label, source_url, trust_tier
      FROM provider_sources psrc
      WHERE psrc.provider_id = p.id
        AND ${sourcePredicate}
      ORDER BY id ASC
      LIMIT 1
    ) psrc ON true
  `;
  const whereSql = `
    pl.lat IS NOT NULL
    AND pl.lng IS NOT NULL
    AND pl.lat BETWEEN -90 AND 90
    AND pl.lng BETWEEN -180 AND 180
    AND (pl.lat <> 0 OR pl.lng <> 0)
    AND NULLIF(btrim(p.name), '') IS NOT NULL
    AND lower(btrim(p.name)) NOT IN ('nan','null','none','n/a','na','unnamed','unnamed clinic')
    ${boundsConditions.length ? `AND ${boundsConditions.join(" AND ")}` : ""}
  `;

  const countResult = await queryWithStatementTimeout(pool, `
    SELECT count(*)::int AS total
    FROM providers p
    INNER JOIN provider_locations pl ON pl.provider_id = p.id
    ${providerSourceJoin}
    WHERE ${whereSql}
  `, params);
  const storedTotal = Number(countResult.rows[0]?.total || 0);

  const combineSavedCandidates = source === "my-clinics";
  const dataParams = [...params];
  const limitClause = all || combineSavedCandidates
    ? ""
    : `LIMIT ${addParam(dataParams, limit)} OFFSET ${addParam(dataParams, (page - 1) * limit)}`;

  const { rows } = await queryWithStatementTimeout(pool, `
    SELECT p.name, p.npi, pl.address, pl.city, pl.state, pl.postal_code, pl.lat, pl.lng,
           pc.phone, pc.website, psrc.source_label, psrc.source_url, psrc.trust_tier
    FROM providers p
    INNER JOIN provider_locations pl ON pl.provider_id = p.id
    LEFT JOIN provider_contacts pc ON pc.provider_id = p.id
    ${providerSourceJoin}
    WHERE ${whereSql}
    ORDER BY p.id ASC
    ${limitClause}
  `, dataParams);

  const storedProviders: LayerProvider[] = rows.map((row: Record<string, unknown>) => ({
    clinic_name: row.name as string,
    name: row.name as string,
    address_1: row.address as string | null,
    city: row.city as string | null,
    state: row.state as string | null,
    zip: row.postal_code as string | null,
    phone: row.phone as string | null,
    website: row.website as string | null,
    lat: Number(row.lat),
    lng: Number(row.lng),
    npi: row.npi as string | null,
    source_url: row.source_url as string | null,
    data_source: row.source_label as string,
    trust_tier: row.trust_tier as string,
  }));

  if (!combineSavedCandidates) return { providers: storedProviders, total: storedTotal };
  const combined = mergeMyClinicsLayerProviders(storedProviders, savedCandidates);
  return { providers: paginate(combined, all, page, limit), total: combined.length };
}

/**
 * GET /api/provider-layers/:source
 *
 * Database pages are transport batches only. The browser runtime requests every
 * page for the active viewport and combines them before rendering.
 */
router.get("/provider-layers/:source", async (req: Request, res: Response) => {
  const source = req.params.source as string;
  try {
    const config = SOURCE_CONFIG[source];
    if (!config) {
      res.status(400).json({ error: `Invalid source. Use: ${Object.keys(SOURCE_CONFIG).join(", ")}` });
      return;
    }

    if (!isPersistenceConfigured()) {
      sendLayerResponse(res, { providers: [], total: 0, source, page: 1, limit: 0, all: false, storage: "none" });
      return;
    }

    const all = req.query.all === "true";
    const limit = Math.min(Math.max(Number(req.query.limit) || 2000, 1), MAX_PAGE_SIZE);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const north = asFiniteNumber(req.query.north);
    const south = asFiniteNumber(req.query.south);
    const east = asFiniteNumber(req.query.east);
    const west = asFiniteNumber(req.query.west);
    const useBounds = req.query.useBounds === "true" || req.query.bounds === "true";
    const bounds = useBounds && north !== null && south !== null && east !== null && west !== null
      ? { north, south, east, west }
      : null;
    const clinicType = typeof req.query.clinic_type === "string"
      ? req.query.clinic_type
      : typeof req.query.provider_type === "string"
        ? req.query.provider_type
        : "";

    const pool = getPool();
    const savedCandidates = source === "my-clinics"
      ? await loadSavedCandidateProviders(pool, bounds, clinicType)
      : [];

    if (await canonicalReadsEnabled(pool)) {
      const result = await loadCanonicalLayer(pool, source, bounds, clinicType, page, limit, all, savedCandidates);
      sendLayerResponse(res, { ...result, source, page, limit, all, storage: "provider_master" });
      return;
    }

    const schema = await detectProviderSchema(pool);
    if (schema === "legacy") {
      const result = await loadLegacyLayer(pool, source, bounds, page, limit, all, savedCandidates);
      sendLayerResponse(res, { ...result, source, page, limit, all, storage: "medical_providers" });
      return;
    }

    if (schema === "normalized") {
      const result = await loadNormalizedLayer(pool, source, bounds, page, limit, all, savedCandidates);
      sendLayerResponse(res, { ...result, source, page, limit, all, storage: "providers" });
      return;
    }

    if (source === "my-clinics" && savedCandidates.length) {
      const providers = paginate(savedCandidates, all, page, limit);
      sendLayerResponse(res, { providers, total: savedCandidates.length, source, page, limit, all, storage: "provider_candidates" });
      return;
    }

    sendLayerResponse(res, { providers: [], total: 0, source, page, limit, all, storage: "none" });
  } catch (error) {
    const warning = error instanceof Error ? error.message : "Provider layer query failed";
    console.error(`[ProviderLayers] ${source} query failed:`, error);
    res.status(503).json({
      providers: [],
      count: 0,
      loaded: 0,
      total: 0,
      source,
      warning,
      transientFailure: true,
      visibleCapped: false,
    });
  }
});

export default router;

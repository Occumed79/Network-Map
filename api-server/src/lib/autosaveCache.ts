/**
 * Autosave live-discovery cache.
 *
 * Architecture:
 *   AUTO_SAVE_DATABASE          — search-cache index (autosave_search_cache)
 *   AUTO_SAVE_DATABASE_2        — provider record shard A (autosave_providers)
 *   AUTO_SAVE_DATABASE_3        — provider record shard B (autosave_providers)
 *
 * NO connection strings are hardcoded or exposed to the frontend.
 * All three DBs are read from env vars at runtime.
 *
 * Google Places policy: results with source='google' are NEVER written to
 * autosave_providers as durable provider records.  The cache stores only
 * persistable sources (OSM, NPI, FMCSA, Map Inventory, Clinic Imports, etc.).
 */

import crypto from "node:crypto";
import { createStandalonePool } from "@workspace/db";
import { logger } from "./logger";
import type { ProviderCandidate } from "../providerSources/types";

// ─── Environment ──────────────────────────────────────────────────────────────

const CACHE_DB_URL = process.env.AUTO_SAVE_DATABASE;
const SHARD_A_URL = process.env.AUTO_SAVE_DATABASE_2;
const SHARD_B_URL = process.env.AUTO_SAVE_DATABASE_3;
const TTL_HOURS = Number(process.env.AUTO_SAVE_CACHE_TTL_HOURS) || 168;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AutosaveLookupParams {
  sourceMode: string;
  serviceCategory: string;
  centerLat: number;
  centerLng: number;
  radiusMiles: number;
  queryText?: string;
}

export interface AutosaveCacheHit {
  cacheHit: true;
  cachedAt: string;
  externalCallAvoided: true;
  providers: ProviderCandidate[];
  searchKey: string;
}

export interface AutosaveCacheMiss {
  cacheHit: false;
  searchKey: string;
}

export type AutosaveLookupResult = AutosaveCacheHit | AutosaveCacheMiss;

// ─── Source safety ────────────────────────────────────────────────────────────

/** Google-derived provider content is not eligible for durable autosave storage. */
export function isPersistableSource(source: string): boolean {
  const normalized = source.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return !normalized.includes("google");
}

// ─── Search key ──────────────────────────────────────────────────────────────

/**
 * Deterministic cache key from search inputs.
 * Rounds coords to 3dp (~110m grid) so nearby identical searches share a key.
 * Does NOT include timestamps.
 */
export function buildSearchKey(params: AutosaveLookupParams): string {
  const lat = Math.round(params.centerLat * 1000) / 1000;
  const lng = Math.round(params.centerLng * 1000) / 1000;
  const radius = Math.round(params.radiusMiles);
  const mode = (params.sourceMode || "liveFinder").toLowerCase().trim();
  const category = (params.serviceCategory || "all").toLowerCase().trim();
  const query = (params.queryText || "").toLowerCase().trim();
  const raw = `${mode}|${category}|${query}|${lat}|${lng}|${radius}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 40);
}

// ─── Provider key + shard assignment ────────────────────────────────────────

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Generates a stable provider_key with priority:
 * 1. stable source + source_id
 * 2. normalized website domain + phone
 * 3. normalized name + address
 * 4. normalized name + coordinate bucket (~100m)
 */
export function buildProviderKey(candidate: ProviderCandidate): string {
  const source = (candidate.source || "unknown").toLowerCase();

  // Priority 1: source + stable external id
  if (candidate.npi) return `npi:${candidate.npi.replace(/\s+/g, "")}`;
  const idFields = candidate.provenance?.map((p) => p.sourceRecordId).filter(Boolean);
  if (idFields?.length) {
    const stableId = idFields[0]!.replace(/\s+/g, "");
    return `${source}:${stableId}`;
  }

  // Priority 2: domain + phone
  if (candidate.website && candidate.phone) {
    try {
      const domain = new URL(candidate.website).hostname.replace(/^www\./, "");
      const phone = candidate.phone.replace(/\D/g, "");
      if (domain && phone) return `web:${domain}:${phone}`;
    } catch { /* ignore malformed URLs */ }
  }

  // Priority 3: normalized name + address
  const nn = normalizeName(candidate.name);
  const addr = (candidate.address || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (nn && addr) {
    const raw = `name+addr:${nn}|${addr}`;
    return "na:" + crypto.createHash("sha256").update(raw).digest("hex").slice(0, 24);
  }

  // Priority 4: normalized name + coordinate bucket
  if (candidate.lat !== undefined && candidate.lng !== undefined) {
    const latBucket = Math.round(candidate.lat * 1000);
    const lngBucket = Math.round(candidate.lng * 1000);
    const raw = `name+coord:${nn}|${latBucket}|${lngBucket}`;
    return "nc:" + crypto.createHash("sha256").update(raw).digest("hex").slice(0, 24);
  }

  // Fallback: hash of full candidate id
  return "id:" + crypto.createHash("sha256").update(String(candidate.id)).digest("hex").slice(0, 24);
}

/**
 * Shard assignment: deterministic from provider_key so the same provider
 * always lands in the same shard across searches.
 */
export function shardForKey(providerKey: string): "shard_a" | "shard_b" {
  const byte = Buffer.from(providerKey.slice(-8), "hex")[0] ?? providerKey.charCodeAt(providerKey.length - 1) ?? 0;
  return byte % 2 === 0 ? "shard_a" : "shard_b";
}

// ─── Database connections ─────────────────────────────────────────────────────

type DbClient = ReturnType<typeof createStandalonePool>;

let _cacheDb: DbClient | null = null;
let _shardA: DbClient | null = null;
let _shardB: DbClient | null = null;

function ensureConnections(): void {
  if (!_cacheDb && CACHE_DB_URL) {
    _cacheDb = createStandalonePool(CACHE_DB_URL, "network-map-autosave-index", 2);
  }
  if (!_shardA && SHARD_A_URL) {
    _shardA = createStandalonePool(SHARD_A_URL, "network-map-autosave-shard-a", 2);
  }
  if (!_shardB && SHARD_B_URL) {
    _shardB = createStandalonePool(SHARD_B_URL, "network-map-autosave-shard-b", 2);
  }
}

function shardClient(shard: "shard_a" | "shard_b"): DbClient | null {
  return shard === "shard_a" ? _shardA : _shardB;
}

/** True when all three autosave DBs are configured. */
export function isAutosaveConfigured(): boolean {
  return Boolean(CACHE_DB_URL && SHARD_A_URL && SHARD_B_URL);
}

// ─── Cache lookup ─────────────────────────────────────────────────────────────

export async function lookupCache(params: AutosaveLookupParams): Promise<AutosaveLookupResult> {
  const searchKey = buildSearchKey(params);
  if (!isAutosaveConfigured()) return { cacheHit: false, searchKey };

  try {
    ensureConnections();
    if (!_cacheDb || !_shardA || !_shardB) return { cacheHit: false, searchKey };

    const { rows } = await _cacheDb.query(
      `SELECT result_refs, last_seen_at FROM autosave_search_cache
       WHERE search_key = $1 AND expires_at > now()
       LIMIT 1`,
      [searchKey],
    );
    if (!rows.length) return { cacheHit: false, searchKey };

    const row = rows[0];
    const refs: Array<{ provider_key: string; shard: "shard_a" | "shard_b" }> = Array.isArray(row.result_refs) ? row.result_refs as typeof refs : [];
    if (!refs.length) return { cacheHit: false, searchKey };

    // Retrieve providers from shards
    const providers: ProviderCandidate[] = [];
    const byShardA = refs.filter((r) => r.shard === "shard_a").map((r) => r.provider_key);
    const byShardB = refs.filter((r) => r.shard === "shard_b").map((r) => r.provider_key);

    const loadFromShard = async (client: DbClient | null, keys: string[]) => {
      if (!client || !keys.length) return;
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(",");
      const { rows: provRows } = await client.query(
        `SELECT * FROM autosave_providers WHERE provider_key IN (${placeholders})`,
        keys,
      );
      for (const r of provRows) {
        providers.push(rowToCandidate(r));
      }
    };

    await Promise.all([
      loadFromShard(_shardA, byShardA),
      loadFromShard(_shardB, byShardB),
    ]);

    // A partial or empty shard read must never suppress the authoritative live
    // search. Treat it as a miss and let the normal pipeline repair the cache.
    if (providers.length !== refs.length) {
      logger.warn({ searchKey, expected: refs.length, loaded: providers.length }, "autosaveCache: incomplete cache read; falling back to live search");
      return { cacheHit: false, searchKey };
    }

    // Update hit counters (best-effort, non-blocking)
    _cacheDb.query(
      `UPDATE autosave_search_cache
       SET cache_hits = cache_hits + 1,
           external_calls_avoided = external_calls_avoided + 1,
           last_seen_at = now()
       WHERE search_key = $1`,
      [searchKey],
    ).catch((err: unknown) => logger.warn({ err }, "autosaveCache: failed to update hit counters"));

    return {
      cacheHit: true,
      cachedAt: String(row.last_seen_at ?? new Date().toISOString()),
      externalCallAvoided: true,
      providers,
      searchKey,
    };
  } catch (err) {
    logger.warn({ err, searchKey }, "autosaveCache: cache lookup failed; falling back to live search");
    return { cacheHit: false, searchKey };
  }
}

// ─── Write results ────────────────────────────────────────────────────────────

export async function writeCache(
  searchKey: string,
  params: AutosaveLookupParams,
  candidates: ProviderCandidate[],
): Promise<void> {
  if (!isAutosaveConfigured()) return;

  try {
    ensureConnections();

    // Filter out non-persistable sources (especially Google-derived content)
    // and de-duplicate before writing so each provider key appears once.
    const uniquePersistable = new Map<string, ProviderCandidate>();
    for (const candidate of candidates) {
      if (!isPersistableSource(candidate.source)) continue;
      uniquePersistable.set(buildProviderKey(candidate), candidate);
    }

    const refs: Array<{ provider_key: string; shard: "shard_a" | "shard_b" }> = [];

    await Promise.all(
      [...uniquePersistable.entries()].map(async ([providerKey, candidate]) => {
        const shard = shardForKey(providerKey);
        const client = shardClient(shard);
        if (!client) return;

        try {
          const nn = normalizeName(candidate.name);
          await client.query(
            `INSERT INTO autosave_providers
               (provider_key, source, source_id, name, normalized_name, clinic_type,
                services, categories, address, city, admin_area, country, postal_code,
                lat, lng, phone, website, source_url, confidence_score, raw_source_data,
                first_seen_at, last_seen_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,now(),now(),now())
             ON CONFLICT (provider_key) DO UPDATE SET
               source       = EXCLUDED.source,
               source_id    = COALESCE(EXCLUDED.source_id, autosave_providers.source_id),
               name         = EXCLUDED.name,
               normalized_name = EXCLUDED.normalized_name,
               clinic_type  = EXCLUDED.clinic_type,
               services     = EXCLUDED.services,
               address      = COALESCE(EXCLUDED.address, autosave_providers.address),
               city         = COALESCE(EXCLUDED.city, autosave_providers.city),
               admin_area   = COALESCE(EXCLUDED.admin_area, autosave_providers.admin_area),
               country      = COALESCE(EXCLUDED.country, autosave_providers.country),
               postal_code  = COALESCE(EXCLUDED.postal_code, autosave_providers.postal_code),
               source_url   = COALESCE(EXCLUDED.source_url, autosave_providers.source_url),
               last_seen_at = now(),
               updated_at   = now(),
               lat          = COALESCE(EXCLUDED.lat, autosave_providers.lat),
               lng          = COALESCE(EXCLUDED.lng, autosave_providers.lng),
               phone        = COALESCE(EXCLUDED.phone, autosave_providers.phone),
               website      = COALESCE(EXCLUDED.website, autosave_providers.website),
               confidence_score = GREATEST(EXCLUDED.confidence_score, autosave_providers.confidence_score)`,
            [
              providerKey,
              candidate.source,
              candidate.npi || candidate.provenance?.[0]?.sourceRecordId || null,
              candidate.name,
              nn,
              candidate.providerCategory || "unknown",
              candidate.services || [],
              [],
              candidate.address || null,
              candidate.city || null,
              candidate.state || null,
              candidate.country || null,
              candidate.postalCode || null,
              candidate.lat ?? null,
              candidate.lng ?? null,
              candidate.phone || null,
              candidate.website || null,
              candidate.sourceUrl || null,
              candidate.score ?? null,
              { matchReason: candidate.matchReason, source: candidate.source },
            ],
          );
          refs.push({ provider_key: providerKey, shard });
        } catch (err) {
          logger.warn({ err, providerKey }, "autosaveCache: failed to upsert provider; skipping");
        }
      }),
    );

    // Never create a fresh "empty hit" from a search whose only results were
    // non-persistable (for example Google Places), or whose provider writes all
    // failed. That would hide valid live results on the next request.
    if (!refs.length) return;

    if (!_cacheDb) return;

    // Upsert the search cache entry
    const expiresAt = new Date(Date.now() + TTL_HOURS * 3600 * 1000).toISOString();
    await _cacheDb.query(
      `INSERT INTO autosave_search_cache
         (search_key, source_mode, service_category, query_text,
          center_lat, center_lng, radius_miles, normalized_request,
          result_refs, result_count, first_seen_at, last_seen_at, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now(),$11)
       ON CONFLICT (search_key) DO UPDATE SET
         last_seen_at  = now(),
         expires_at    = EXCLUDED.expires_at,
         result_refs   = EXCLUDED.result_refs,
         result_count  = EXCLUDED.result_count`,
      [
        searchKey,
        params.sourceMode,
        params.serviceCategory,
        params.queryText || "",
        params.centerLat,
        params.centerLng,
        params.radiusMiles,
        params as unknown as object,
        JSON.stringify(refs),
        refs.length,
        expiresAt,
      ],
    );
  } catch (err) {
    logger.warn({ err, searchKey }, "autosaveCache: failed to write cache; results still returned to client");
  }
}

// ─── Row → ProviderCandidate ─────────────────────────────────────────────────

function rowToCandidate(row: Record<string, unknown>): ProviderCandidate {
  const parsedScore = Number(row.confidence_score);
  const score = Number.isFinite(parsedScore) ? parsedScore : 50;
  return {
    id: String(row.provider_key ?? ""),
    name: String(row.name ?? ""),
    address: String(row.address ?? ""),
    city: String(row.city ?? ""),
    state: String(row.admin_area ?? ""),
    postalCode: String(row.postal_code ?? ""),
    country: row.country ? String(row.country) : undefined,
    phone: String(row.phone ?? ""),
    website: String(row.website ?? ""),
    lat: typeof row.lat === "number" ? row.lat : undefined,
    lng: typeof row.lng === "number" ? row.lng : undefined,
    coordinateStatus: (row.lat != null && row.lng != null) ? "verified_address" : "unverified",
    providerCategory: String(row.clinic_type ?? "unknown"),
    services: Array.isArray(row.services) ? (row.services as string[]) : [],
    source: String(row.source ?? "autosave"),
    sourceUrl: row.source_url ? String(row.source_url) : undefined,
    confidence: score >= 70 ? "high" : score >= 40 ? "medium" : "low",
    trustTier: "directory",
    score,
    badges: ["Autosave"],
    evidence: [],
    lastSeenAt: row.last_seen_at ? String(row.last_seen_at) : undefined,
    _rawSources: ["autosave"],
  };
}

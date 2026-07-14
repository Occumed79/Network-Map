/**
 * Backend-only RapidAPI client.
 *
 * Rules:
 * - The RapidAPI key is NEVER sent to the browser.
 * - Products that have not been verified against a real endpoint are disabled.
 * - Each adapter declares its own request/response shape and maps it to the
 *   shared canonical types.
 * - Quota and health state are tracked per-product in memory.
 */

// ── Canonical types ──────────────────────────────────────────────────────────

export interface RapidApiLocation {
  lat: number;
  lng: number;
  address?: string | null;
  city?: string | null;
  adminArea?: string | null;
  postalCode?: string | null;
  country?: string | null;
  displayName?: string | null;
}

export interface RapidApiProviderResult {
  id?: string | null;
  name: string;
  address?: string | null;
  city?: string | null;
  adminArea?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  website?: string | null;
  lat?: number | null;
  lng?: number | null;
  sourceUrl?: string | null;
  confidence: number;
  evidence: string[];
  distanceMiles?: number | null;
}

export interface RapidApiRouteResult {
  distanceMiles: number;
  durationMinutes: number;
  polyline?: Array<[number, number]> | null;
}

// ── Product registry ─────────────────────────────────────────────────────────

interface ProductConfig {
  /** Human-readable label for logs/status */
  label: string;
  /** Whether this product has been verified against a real endpoint */
  enabled: boolean;
  /** Env var whose presence activates this product */
  envKey: string;
}

const PRODUCT_REGISTRY: Record<string, ProductConfig> = {
  providerSearch: {
    label: "Provider Search",
    enabled: true,
    envKey: "RAPIDAPI_PROVIDER_SEARCH_HOST",
  },
  geocoding: {
    label: "Geocoding",
    enabled: false, // Not yet verified
    envKey: "RAPIDAPI_GEOCODING_HOST",
  },
  routing: {
    label: "Routing / Directions",
    enabled: false, // Not yet verified
    envKey: "RAPIDAPI_ROUTING_HOST",
  },
  locationDetails: {
    label: "Location Details",
    enabled: false, // Not yet verified
    envKey: "RAPIDAPI_LOCATION_HOST",
  },
};

// ── Health tracking ──────────────────────────────────────────────────────────

interface ProductHealth {
  successCount: number;
  failureCount: number;
  lastFailureAt: number | null;
  lastSuccessAt: number | null;
  consecutiveFailures: number;
}

const productHealth = new Map<string, ProductHealth>();

function getHealth(productId: string): ProductHealth {
  if (!productHealth.has(productId)) {
    productHealth.set(productId, {
      successCount: 0,
      failureCount: 0,
      lastFailureAt: null,
      lastSuccessAt: null,
      consecutiveFailures: 0,
    });
  }
  return productHealth.get(productId)!;
}

function recordSuccess(productId: string): void {
  const h = getHealth(productId);
  h.successCount += 1;
  h.lastSuccessAt = Date.now();
  h.consecutiveFailures = 0;
}

function recordFailure(productId: string): void {
  const h = getHealth(productId);
  h.failureCount += 1;
  h.lastFailureAt = Date.now();
  h.consecutiveFailures += 1;
}

/** A product is circuit-broken after 5 consecutive failures for 5 minutes. */
function isCircuitBroken(productId: string): boolean {
  const h = getHealth(productId);
  if (h.consecutiveFailures < 5) return false;
  const breakUntil = (h.lastFailureAt ?? 0) + 5 * 60 * 1000;
  return Date.now() < breakUntil;
}

// ── Quota tracking ───────────────────────────────────────────────────────────

interface QuotaWindow {
  count: number;
  windowStart: number;
}

const quotaWindows = new Map<string, QuotaWindow>();
const QUOTA_WINDOW_MS = 60 * 1000; // 1-minute rolling window
const QUOTA_LIMIT_PER_MINUTE = Number(process.env.RAPIDAPI_QUOTA_PER_MINUTE || 60);

function checkQuota(productId: string): boolean {
  const now = Date.now();
  let window = quotaWindows.get(productId);
  if (!window || now - window.windowStart > QUOTA_WINDOW_MS) {
    window = { count: 0, windowStart: now };
    quotaWindows.set(productId, window);
  }
  if (window.count >= QUOTA_LIMIT_PER_MINUTE) return false;
  window.count += 1;
  return true;
}

// ── Core helpers ─────────────────────────────────────────────────────────────

function apiKey(): string | null {
  return process.env.RAPIDAPI_KEY?.trim() || null;
}

function isProductAvailable(productId: string): { ok: boolean; reason?: string } {
  const config = PRODUCT_REGISTRY[productId];
  if (!config) return { ok: false, reason: `Unknown product: ${productId}` };
  if (!config.enabled) return { ok: false, reason: `Product ${config.label} is disabled (not yet verified)` };
  if (!apiKey()) return { ok: false, reason: "RAPIDAPI_KEY is not configured" };
  if (!process.env[config.envKey]?.trim()) {
    return { ok: false, reason: `${config.envKey} is not configured` };
  }
  if (isCircuitBroken(productId)) {
    return { ok: false, reason: `Product ${config.label} is temporarily circuit-broken after repeated failures` };
  }
  if (!checkQuota(productId)) {
    return { ok: false, reason: `Product ${config.label} has exceeded per-minute quota` };
  }
  return { ok: true };
}

function firstString(...values: unknown[]): string {
  for (const v of values) {
    const s = typeof v === "string" ? v.trim() : "";
    if (s) return s;
  }
  return "";
}

function asNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function extractArray(payload: unknown): Array<Record<string, unknown>> {
  if (!payload || typeof payload !== "object") return [];
  const rec = payload as Record<string, unknown>;
  for (const key of ["providers", "results", "items", "data", "businesses", "places"]) {
    const v = rec[key];
    if (Array.isArray(v)) return v.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
  }
  if (Array.isArray(payload)) return payload.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
  return [];
}

async function rapidApiFetch(
  url: string,
  body: Record<string, unknown>,
  productId: string,
): Promise<{ ok: boolean; payload?: unknown; error?: string }> {
  const key = apiKey();
  const host = process.env[PRODUCT_REGISTRY[productId]?.envKey ?? ""]?.trim();
  if (!key || !host) return { ok: false, error: "Missing credentials" };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": key,
        "X-RapidAPI-Host": host,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(Number(process.env.RAPIDAPI_TIMEOUT_MS || 8000)),
    });
    if (!resp.ok) {
      recordFailure(productId);
      return { ok: false, error: `HTTP ${resp.status}` };
    }
    recordSuccess(productId);
    return { ok: true, payload: await resp.json() };
  } catch (err) {
    recordFailure(productId);
    return { ok: false, error: String(err) };
  }
}

// ── Provider Search adapter ───────────────────────────────────────────────────

export interface ProviderSearchParams {
  location: string;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
  serviceKeywords?: string[];
  city?: string;
  adminArea?: string;
  country?: string;
  limit?: number;
}

function mapProviderItem(
  item: Record<string, unknown>,
  fallback: ProviderSearchParams,
): RapidApiProviderResult | null {
  const name = firstString(item.name, item.title, item.business_name, item.providerName, item.placeName);
  if (!name) return null;
  const address = firstString(item.address, item.formatted_address, item.fullAddress, item.streetAddress, item.vicinity);
  const lat = asNumber(item.lat ?? item.latitude ?? (item.location as Record<string, unknown> | undefined)?.lat);
  const lng = asNumber(item.lng ?? item.lon ?? item.longitude ?? (item.location as Record<string, unknown> | undefined)?.lng);
  const confidence = asNumber(item.confidence) ?? (address || item.phone || item.website ? 65 : 45);
  const evidence = [
    firstString(item.snippet, item.description, item.category, item.type),
    address ? `Address: ${address}` : "",
    item.phone ? `Phone: ${firstString(item.phone)}` : "",
    item.website ? `Website: ${firstString(item.website)}` : "",
  ].filter(Boolean);
  return {
    id: firstString(item.id, item.place_id, item.providerId) || null,
    name,
    address: address || null,
    city: firstString(item.city, fallback.city) || null,
    adminArea: firstString(item.state, item.adminArea, item.admin_area, fallback.adminArea) || null,
    postalCode: firstString(item.postalCode, item.postal_code, item.zip, item.zipCode) || null,
    country: firstString(item.country, item.countryCode, fallback.country) || null,
    phone: firstString(item.phone, item.phoneNumber, item.telephone) || null,
    website: firstString(item.website, item.url, item.websiteUrl) || null,
    lat,
    lng,
    sourceUrl: firstString(item.sourceUrl, item.source_url, item.url) || null,
    confidence,
    evidence: evidence.length ? evidence : [`RapidAPI result: ${name}`],
    distanceMiles: asNumber(item.distanceMiles ?? item.distance_miles ?? item.distance),
  };
}

export async function searchProviders(
  params: ProviderSearchParams,
): Promise<{ providers: RapidApiProviderResult[]; debug: { succeeded?: string; failed: string[] } }> {
  const availability = isProductAvailable("providerSearch");
  if (!availability.ok) {
    return { providers: [], debug: { failed: [availability.reason!] } };
  }

  const host = process.env.RAPIDAPI_PROVIDER_SEARCH_HOST!.trim();
  const explicitUrl = process.env.RAPIDAPI_PROVIDER_SEARCH_URL?.trim();
  const path = process.env.RAPIDAPI_PROVIDER_SEARCH_PATH?.trim() || "/search";
  const url = explicitUrl || `https://${host}${path.startsWith("/") ? path : `/${path}`}`;

  const result = await rapidApiFetch(
    url,
    {
      query: params.serviceKeywords?.join(" ") || "provider",
      location: params.location,
      lat: params.lat,
      lng: params.lng,
      radiusMiles: params.radiusMiles,
      city: params.city,
      state: params.adminArea,
      limit: params.limit ?? 20,
    },
    "providerSearch",
  );

  if (!result.ok) {
    return { providers: [], debug: { failed: [`Provider search failed: ${result.error}`] } };
  }

  const providers = extractArray(result.payload)
    .map((item) => mapProviderItem(item, params))
    .filter((p): p is RapidApiProviderResult => Boolean(p))
    .slice(0, params.limit ?? 20);

  return { providers, debug: { succeeded: host, failed: [] } };
}

// ── Health/status export ─────────────────────────────────────────────────────

export function getRapidApiStatus(): Record<string, {
  label: string;
  enabled: boolean;
  configured: boolean;
  circuitBroken: boolean;
  health: ProductHealth;
}> {
  return Object.fromEntries(
    Object.entries(PRODUCT_REGISTRY).map(([id, config]) => [
      id,
      {
        label: config.label,
        enabled: config.enabled,
        configured: Boolean(apiKey() && process.env[config.envKey]?.trim()),
        circuitBroken: isCircuitBroken(id),
        health: getHealth(id),
      },
    ]),
  );
}

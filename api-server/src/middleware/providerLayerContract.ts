import type { RequestHandler } from "express";

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 2000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 60;

type CachedLayerResponse = {
  storedAt: number;
  body: Record<string, unknown>;
};

const responseCache = new Map<string, CachedLayerResponse>();
const latestBySource = new Map<string, CachedLayerResponse>();

function text(value: unknown): string {
  if (Array.isArray(value)) return value.length ? String(value[0]) : "";
  return value == null ? "" : String(value);
}

function clampLimit(value: unknown): string {
  const parsed = Number(text(value));
  if (!Number.isFinite(parsed) || parsed <= 0) return String(DEFAULT_LIMIT);
  return String(Math.min(Math.max(Math.trunc(parsed), 1), MAX_LIMIT));
}

function hasCompleteBounds(query: Record<string, unknown>): boolean {
  return ["north", "south", "east", "west"].every((key) => {
    const value = Number(text(query[key]));
    return Number.isFinite(value);
  });
}

function normalizedQuery(query: Record<string, unknown>): Record<string, unknown> {
  const next = { ...query };
  if (next.all === undefined) next.all = "false";
  next.limit = clampLimit(next.limit);
  if (next.page === undefined) next.page = "1";
  if (next.useBounds === undefined && next.bounds === undefined && hasCompleteBounds(next)) {
    next.useBounds = "true";
  }
  return next;
}

function sortedQueryString(query: Record<string, unknown>): string {
  return Object.entries(query)
    .map(([key, value]) => [key, text(value)] as const)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function cacheKey(pathname: string, query: Record<string, unknown>): string {
  return `${pathname}?${sortedQueryString(query)}`;
}

function sourceFromPath(pathname: string): string {
  return pathname.split("/").filter(Boolean).at(-1) || "unknown";
}

function pruneCache(): void {
  const now = Date.now();
  for (const [key, value] of responseCache.entries()) {
    if (now - value.storedAt > CACHE_TTL_MS) responseCache.delete(key);
  }
  while (responseCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    responseCache.delete(oldestKey);
  }
}

function asObject(body: unknown): Record<string, unknown> | null {
  return body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : null;
}

export const stabilizeProviderLayerRequests: RequestHandler = (req, res, next) => {
  if (req.method !== "GET" || !req.path.startsWith("/provider-layers/")) {
    next();
    return;
  }

  const query = normalizedQuery(req.query as Record<string, unknown>);
  Object.defineProperty(req, "query", {
    configurable: true,
    enumerable: true,
    value: query,
  });

  const key = cacheKey(req.path, query);
  const source = sourceFromPath(req.path);
  const originalJson = res.json.bind(res);

  res.setHeader("Cache-Control", "private, max-age=15, stale-if-error=300");

  res.json = ((body: unknown) => {
    pruneCache();
    const objectBody = asObject(body);
    const error = objectBody && typeof objectBody.error === "string"
      ? objectBody.error
      : "";

    if (error) {
      const cached = responseCache.get(key) || latestBySource.get(source);
      if (cached && Date.now() - cached.storedAt <= CACHE_TTL_MS) {
        return originalJson({
          ...cached.body,
          warning: error,
          stale: true,
          servedFrom: "provider-layer-cache",
        });
      }

      return originalJson({
        providers: [],
        count: 0,
        loaded: 0,
        total: 0,
        source,
        warning: error,
        transientFailure: true,
        all: false,
      });
    }

    if (objectBody && Array.isArray(objectBody.providers)) {
      const safeBody = {
        ...objectBody,
        requestScope: {
          all: text(query.all) === "true",
          boundsApplied: text(query.useBounds) === "true" || text(query.bounds) === "true",
          limit: Number(text(query.limit)) || DEFAULT_LIMIT,
          page: Number(text(query.page)) || 1,
        },
      };
      const cached = { storedAt: Date.now(), body: safeBody };
      responseCache.set(key, cached);
      latestBySource.set(source, cached);
      return originalJson(safeBody);
    }

    return originalJson(body);
  }) as typeof res.json;

  next();
};

export const providerLayerContractInternals = {
  clampLimit,
  hasCompleteBounds,
  normalizedQuery,
};

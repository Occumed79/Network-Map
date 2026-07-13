type CachedResponse = {
  body: string;
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  storedAt: number;
  source: string;
  loaded: number;
  total: number;
  viewport: Viewport | null;
  filterKey: string;
};

type Viewport = {
  centerLat: number;
  centerLng: number;
  latSpan: number;
  lngSpan: number;
};

const CACHE_FRESH_MS = 45_000;
const CACHE_STALE_MS = 5 * 60_000;
const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 2000;
const cacheByRequest = new Map<string, CachedResponse>();
const latestBySource = new Map<string, CachedResponse>();
const inFlight = new Map<string, Promise<CachedResponse | null>>();
const nativeFetch = window.fetch.bind(window);

function asUrl(input: RequestInfo | URL): URL | null {
  try {
    if (input instanceof Request) return new URL(input.url, window.location.origin);
    return new URL(input.toString(), window.location.origin);
  } catch {
    return null;
  }
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  return String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
}

function clampLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(parsed), 1), MAX_LIMIT);
}

function normalizeProviderLayerUrl(url: URL): URL {
  const next = new URL(url.toString());
  if (!next.searchParams.has("all")) next.searchParams.set("all", "false");
  next.searchParams.set("limit", String(clampLimit(next.searchParams.get("limit"))));
  if (!next.searchParams.has("page")) next.searchParams.set("page", "1");
  const hasBounds = ["north", "south", "east", "west"].every((key) => {
    const value = Number(next.searchParams.get(key));
    return Number.isFinite(value);
  });
  if (hasBounds && !next.searchParams.has("useBounds") && !next.searchParams.has("bounds")) {
    next.searchParams.set("useBounds", "true");
  }
  next.searchParams.sort();
  return next;
}

function viewportFromUrl(url: URL): Viewport | null {
  const north = Number(url.searchParams.get("north"));
  const south = Number(url.searchParams.get("south"));
  const east = Number(url.searchParams.get("east"));
  const west = Number(url.searchParams.get("west"));
  if (![north, south, east, west].every(Number.isFinite)) return null;
  const lngSpan = west <= east ? east - west : (180 - west) + (east + 180);
  const centerLng = west <= east
    ? (west + east) / 2
    : ((((west + lngSpan / 2) + 180) % 360) - 180);
  return {
    centerLat: (north + south) / 2,
    centerLng,
    latSpan: Math.max(Math.abs(north - south), 0.0001),
    lngSpan: Math.max(Math.abs(lngSpan), 0.0001),
  };
}

function sourceFromUrl(url: URL): string {
  return url.pathname.split("/").filter(Boolean).at(-1) || "unknown";
}

function filterKey(url: URL): string {
  const ignored = new Set(["north", "south", "east", "west", "useBounds", "bounds"]);
  return Array.from(url.searchParams.entries())
    .filter(([key]) => !ignored.has(key))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function materiallySameViewport(previous: Viewport | null, next: Viewport | null): boolean {
  if (!previous || !next) return previous === next;
  const latShift = Math.abs(previous.centerLat - next.centerLat);
  const lngShift = Math.abs(previous.centerLng - next.centerLng);
  const latScale = next.latSpan / previous.latSpan;
  const lngScale = next.lngSpan / previous.lngSpan;
  return (
    latShift <= Math.max(0.05, previous.latSpan * 0.2) &&
    lngShift <= Math.max(0.05, previous.lngSpan * 0.2) &&
    latScale >= 0.75 && latScale <= 1.33 &&
    lngScale >= 0.75 && lngScale <= 1.33
  );
}

function responseFromCache(entry: CachedResponse, stale = false): Response {
  const headers = new Headers(entry.headers);
  headers.set("X-Network-Map-Cache", stale ? "stale" : "hit");
  return new Response(entry.body, {
    status: entry.status,
    statusText: entry.statusText,
    headers,
  });
}

function dispatchStatus(entry: CachedResponse, fromCache: boolean, stale = false): void {
  window.dispatchEvent(new CustomEvent("network-map:provider-layer-status", {
    detail: {
      source: entry.source,
      loaded: entry.loaded,
      total: entry.total,
      fromCache,
      stale,
      timestamp: Date.now(),
    },
  }));
}

async function captureResponse(
  response: Response,
  source: string,
  viewport: Viewport | null,
  currentFilterKey: string,
): Promise<CachedResponse | null> {
  if (!response.ok) return null;
  const clone = response.clone();
  const body = await clone.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = body ? JSON.parse(body) as Record<string, unknown> : {};
  } catch {
    return null;
  }
  if (payload.transientFailure || payload.error) return null;
  const loaded = Number(payload.loaded ?? payload.count ?? 0) || 0;
  const total = Number(payload.total ?? loaded) || loaded;
  return {
    body,
    status: response.status,
    statusText: response.statusText,
    headers: Array.from(response.headers.entries()),
    storedAt: Date.now(),
    source,
    loaded,
    total,
    viewport,
    filterKey: currentFilterKey,
  };
}

window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const originalUrl = asUrl(input);
  const method = requestMethod(input, init);
  if (
    !originalUrl ||
    method !== "GET" ||
    originalUrl.origin !== window.location.origin ||
    !originalUrl.pathname.startsWith("/api/provider-layers/")
  ) {
    return nativeFetch(input, init);
  }

  const url = normalizeProviderLayerUrl(originalUrl);
  const source = sourceFromUrl(url);
  const viewport = viewportFromUrl(url);
  const currentFilterKey = filterKey(url);
  const requestKey = url.toString();
  const now = Date.now();
  const exact = cacheByRequest.get(requestKey);

  if (exact && now - exact.storedAt <= CACHE_FRESH_MS) {
    dispatchStatus(exact, true);
    return responseFromCache(exact);
  }

  const latest = latestBySource.get(source);
  if (
    latest &&
    latest.filterKey === currentFilterKey &&
    now - latest.storedAt <= CACHE_FRESH_MS &&
    materiallySameViewport(latest.viewport, viewport)
  ) {
    dispatchStatus(latest, true);
    return responseFromCache(latest);
  }

  const existingRequest = inFlight.get(requestKey);
  if (existingRequest) {
    const shared = await existingRequest;
    if (shared) {
      dispatchStatus(shared, true);
      return responseFromCache(shared);
    }
  }

  const request = (async () => {
    try {
      const response = await nativeFetch(url.toString(), init);
      const captured = await captureResponse(response, source, viewport, currentFilterKey);
      if (captured) {
        cacheByRequest.set(requestKey, captured);
        latestBySource.set(source, captured);
        dispatchStatus(captured, false);
      }
      return captured;
    } catch {
      return null;
    }
  })();

  inFlight.set(requestKey, request);
  const captured = await request.finally(() => inFlight.delete(requestKey));
  if (captured) return responseFromCache(captured);

  if (latest && now - latest.storedAt <= CACHE_STALE_MS) {
    dispatchStatus(latest, true, true);
    return responseFromCache(latest, true);
  }

  return nativeFetch(url.toString(), init);
}) as typeof window.fetch;

export {};

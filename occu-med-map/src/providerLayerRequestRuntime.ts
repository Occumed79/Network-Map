type ProviderCoordinate = { lat: number; lng: number };

type Viewport = {
  centerLat: number;
  centerLng: number;
  latSpan: number;
  lngSpan: number;
  north: number;
  south: number;
  east: number;
  west: number;
};

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
  coordinates: ProviderCoordinate[];
  pagesLoaded: number;
};

type CaptureResult = { entry: CachedResponse | null; warning: string };

const EXACT_CACHE_MS = 45_000;
const MATERIAL_VIEWPORT_REUSE_MS = 5 * 60_000;
const STALE_FALLBACK_MS = 15 * 60_000;
const MAX_CACHE_ENTRIES = 80;
const MAX_CONCURRENT_SOURCE_LOADS = 2;
// These values are database page sizes only. Every page for the active
// viewport is combined before App.tsx receives the response.
const DEFAULT_PAGE_SIZE = 2000;
const MAX_PAGE_SIZE = 5000;

const cacheByRequest = new Map<string, CachedResponse>();
const latestBySource = new Map<string, CachedResponse>();
const inFlight = new Map<string, Promise<CaptureResult>>();
const networkWaiters: Array<() => void> = [];
const nativeFetch = window.fetch.bind(window);
let activeNetworkLoads = 0;

function asUrl(input: RequestInfo | URL): URL | null {
  try {
    return input instanceof Request
      ? new URL(input.url, window.location.origin)
      : new URL(input.toString(), window.location.origin);
  } catch {
    return null;
  }
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  return String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
}

function pageSize(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PAGE_SIZE;
  // Respect a valid caller-supplied page size. This is not a visible-record cap
  // because fetchAllProviderPages continues until all matching rows are loaded.
  return Math.min(Math.max(Math.trunc(parsed), 1), MAX_PAGE_SIZE);
}

function normalizeProviderLayerUrl(url: URL): URL {
  const next = new URL(url.toString());
  next.searchParams.set("all", "false");
  next.searchParams.set("limit", String(pageSize(next.searchParams.get("limit"))));
  next.searchParams.set("page", "1");
  const hasBounds = ["north", "south", "east", "west"].every((key) =>
    Number.isFinite(Number(next.searchParams.get(key))),
  );
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
    north,
    south,
    east,
    west,
  };
}

function sourceFromUrl(url: URL): string {
  return url.pathname.split("/").filter(Boolean).at(-1) || "unknown";
}

function filterKey(url: URL): string {
  const ignored = new Set(["north", "south", "east", "west", "useBounds", "bounds", "page"]);
  return Array.from(url.searchParams.entries())
    .filter(([key]) => !ignored.has(key))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function materiallySameViewport(previous: Viewport | null, next: Viewport | null): boolean {
  if (!previous || !next) return previous === next;
  const latShift = Math.abs(previous.centerLat - next.centerLat);
  const rawLngShift = Math.abs(previous.centerLng - next.centerLng);
  const lngShift = Math.min(rawLngShift, 360 - rawLngShift);
  const latScale = next.latSpan / previous.latSpan;
  const lngScale = next.lngSpan / previous.lngSpan;
  return (
    latShift <= Math.max(0.05, previous.latSpan * 0.2) &&
    lngShift <= Math.max(0.05, previous.lngSpan * 0.2) &&
    latScale >= 0.75 && latScale <= 1.33 &&
    lngScale >= 0.75 && lngScale <= 1.33
  );
}

function longitudeInViewport(lng: number, viewport: Viewport): boolean {
  return viewport.west <= viewport.east
    ? lng >= viewport.west && lng <= viewport.east
    : lng >= viewport.west || lng <= viewport.east;
}

function countRenderable(coordinates: ProviderCoordinate[], viewport: Viewport | null): number {
  if (!viewport) return coordinates.length;
  return coordinates.filter(({ lat, lng }) =>
    lat >= viewport.south &&
    lat <= viewport.north &&
    longitudeInViewport(lng, viewport),
  ).length;
}

function responseFromCache(entry: CachedResponse, stale = false): Response {
  const headers = new Headers(entry.headers);
  headers.set("X-Network-Map-Cache", stale ? "stale" : "hit");
  headers.set("X-Network-Map-Visible-Cap", "none");
  return new Response(entry.body, {
    status: entry.status,
    statusText: entry.statusText,
    headers,
  });
}

function dispatchStatus(
  entry: CachedResponse,
  fromCache: boolean,
  stale = false,
  requestedViewport: Viewport | null = entry.viewport,
  warning = "",
): void {
  window.dispatchEvent(new CustomEvent("network-map:provider-layer-status", {
    detail: {
      source: entry.source,
      loaded: entry.loaded,
      total: entry.total,
      rendered: countRenderable(entry.coordinates, requestedViewport),
      successfullyLoaded: true,
      transientFailure: false,
      fromCache,
      stale,
      warning,
      pagesLoaded: entry.pagesLoaded,
      visibleCapped: false,
      timestamp: Date.now(),
    },
  }));
}

function dispatchFailure(source: string, warning: string): void {
  window.dispatchEvent(new CustomEvent("network-map:provider-layer-status", {
    detail: {
      source,
      loaded: 0,
      total: 0,
      rendered: 0,
      successfullyLoaded: false,
      transientFailure: true,
      fromCache: false,
      stale: false,
      warning,
      pagesLoaded: 0,
      visibleCapped: false,
      timestamp: Date.now(),
    },
  }));
}

function transientFailureResponse(source: string, warning: string): Response {
  return new Response(JSON.stringify({
    providers: [],
    count: 0,
    loaded: 0,
    total: 0,
    source,
    all: false,
    hasMore: false,
    warning,
    transientFailure: true,
    visibleCapped: false,
  }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "X-Network-Map-Transient-Failure": "true",
      "X-Network-Map-Visible-Cap": "none",
    },
  });
}

function asPayload(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function providerCoordinates(payload: Record<string, unknown>): ProviderCoordinate[] {
  if (!Array.isArray(payload.providers)) return [];
  const coordinates: ProviderCoordinate[] = [];
  for (const provider of payload.providers) {
    if (!provider || typeof provider !== "object") continue;
    const row = provider as Record<string, unknown>;
    const lat = Number(row.lat);
    const lng = Number(row.lng);
    if (
      Number.isFinite(lat) && Number.isFinite(lng) &&
      lat >= -90 && lat <= 90 &&
      lng >= -180 && lng <= 180 &&
      (lat !== 0 || lng !== 0)
    ) coordinates.push({ lat, lng });
  }
  return coordinates;
}

async function withNetworkSlot<T>(task: () => Promise<T>): Promise<T> {
  if (activeNetworkLoads >= MAX_CONCURRENT_SOURCE_LOADS) {
    await new Promise<void>((resolve) => networkWaiters.push(resolve));
  }
  activeNetworkLoads += 1;
  try {
    return await task();
  } finally {
    activeNetworkLoads = Math.max(0, activeNetworkLoads - 1);
    networkWaiters.shift()?.();
  }
}

function pruneCaches(): void {
  const oldestAllowed = Date.now() - STALE_FALLBACK_MS;
  for (const [key, entry] of cacheByRequest.entries()) {
    if (entry.storedAt < oldestAllowed) cacheByRequest.delete(key);
  }
  while (cacheByRequest.size > MAX_CACHE_ENTRIES) {
    const oldest = [...cacheByRequest.entries()]
      .sort((left, right) => left[1].storedAt - right[1].storedAt)[0]?.[0];
    if (!oldest) break;
    cacheByRequest.delete(oldest);
  }
}

async function fetchAllProviderPages(url: URL, init?: RequestInit): Promise<Response> {
  const firstResponse = await nativeFetch(url.toString(), init);
  if (!firstResponse.ok) return firstResponse;

  const firstPayload = asPayload(await firstResponse.clone().json().catch(() => null));
  if (!firstPayload || !Array.isArray(firstPayload.providers)) return firstResponse;
  if (firstPayload.transientFailure || firstPayload.error) return firstResponse;

  const providers: unknown[] = [...firstPayload.providers];
  const total = Math.max(Number(firstPayload.total ?? providers.length) || providers.length, providers.length);
  const limit = Math.max(Number(url.searchParams.get("limit")) || DEFAULT_PAGE_SIZE, 1);
  let page = 1;
  let hasMore = Boolean(firstPayload.hasMore) || providers.length < total;

  while (hasMore && providers.length < total) {
    page += 1;
    const pageUrl = new URL(url.toString());
    pageUrl.searchParams.set("page", String(page));
    const pageResponse = await nativeFetch(pageUrl.toString(), init);
    if (!pageResponse.ok) {
      throw new Error(`Provider layer page ${page} failed with HTTP ${pageResponse.status}`);
    }
    const pagePayload = asPayload(await pageResponse.json().catch(() => null));
    if (!pagePayload || pagePayload.transientFailure || pagePayload.error) {
      throw new Error(String(pagePayload?.warning || pagePayload?.error || `Provider layer page ${page} failed`));
    }
    const pageProviders = Array.isArray(pagePayload.providers) ? pagePayload.providers : [];
    if (pageProviders.length === 0) break;
    providers.push(...pageProviders);
    hasMore = Boolean(pagePayload.hasMore) || providers.length < total;

    // The guard is derived from the database-reported total. It prevents a
    // malformed endpoint from repeating pages forever without capping valid rows.
    const expectedPages = Math.ceil(total / limit);
    if (page > expectedPages + 1) break;
  }

  const mergedPayload = {
    ...firstPayload,
    providers,
    count: providers.length,
    loaded: providers.length,
    total,
    page: 1,
    limit,
    hasMore: providers.length < total,
    autoPaginated: true,
    pagesLoaded: page,
    visibleCapped: false,
  };
  const headers = new Headers(firstResponse.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("X-Network-Map-Pages", String(page));
  headers.set("X-Network-Map-Visible-Cap", "none");
  return new Response(JSON.stringify(mergedPayload), {
    status: firstResponse.status,
    statusText: firstResponse.statusText,
    headers,
  });
}

async function captureResponse(
  response: Response,
  source: string,
  viewport: Viewport | null,
  currentFilterKey: string,
): Promise<CaptureResult> {
  if (!response.ok) {
    return { entry: null, warning: `Provider layer request failed with HTTP ${response.status}` };
  }
  const body = await response.clone().text();
  let payload: Record<string, unknown>;
  try {
    payload = body ? JSON.parse(body) as Record<string, unknown> : {};
  } catch {
    return { entry: null, warning: "Provider layer returned invalid JSON" };
  }
  if (payload.transientFailure || payload.error) {
    return {
      entry: null,
      warning: String(payload.warning || payload.error || "Provider layer temporarily unavailable"),
    };
  }
  const loaded = Number(payload.loaded ?? payload.count ?? 0) || 0;
  const total = Number(payload.total ?? loaded) || loaded;
  return {
    warning: "",
    entry: {
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
      coordinates: providerCoordinates(payload),
      pagesLoaded: Number(payload.pagesLoaded ?? 1) || 1,
    },
  };
}

window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const originalUrl = asUrl(input);
  const method = requestMethod(input, init);
  if (
    !originalUrl || method !== "GET" ||
    originalUrl.origin !== window.location.origin ||
    !originalUrl.pathname.startsWith("/api/provider-layers/")
  ) return nativeFetch(input, init);

  const url = normalizeProviderLayerUrl(originalUrl);
  const source = sourceFromUrl(url);
  const viewport = viewportFromUrl(url);
  const currentFilterKey = filterKey(url);
  const requestKey = url.toString();
  const now = Date.now();
  pruneCaches();

  const exact = cacheByRequest.get(requestKey);
  if (exact && now - exact.storedAt <= EXACT_CACHE_MS) {
    dispatchStatus(exact, true, false, viewport);
    return responseFromCache(exact);
  }

  const latest = latestBySource.get(source);
  if (
    latest && latest.filterKey === currentFilterKey &&
    now - latest.storedAt <= MATERIAL_VIEWPORT_REUSE_MS &&
    materiallySameViewport(latest.viewport, viewport)
  ) {
    dispatchStatus(latest, true, false, viewport);
    return responseFromCache(latest);
  }

  const existingRequest = inFlight.get(requestKey);
  if (existingRequest) {
    const shared = await existingRequest;
    if (shared.entry) {
      dispatchStatus(shared.entry, true, false, viewport);
      return responseFromCache(shared.entry);
    }
    if (latest && now - latest.storedAt <= STALE_FALLBACK_MS) {
      dispatchStatus(latest, true, true, viewport, shared.warning);
      return responseFromCache(latest, true);
    }
    const warning = shared.warning || "Provider layer temporarily unavailable";
    dispatchFailure(source, warning);
    return transientFailureResponse(source, warning);
  }

  const request = withNetworkSlot(async () => {
    try {
      return await captureResponse(
        await fetchAllProviderPages(url, init),
        source,
        viewport,
        currentFilterKey,
      );
    } catch (error) {
      return {
        entry: null,
        warning: error instanceof Error ? error.message : "Provider layer request failed",
      };
    }
  });

  inFlight.set(requestKey, request);
  const result = await request.finally(() => inFlight.delete(requestKey));
  if (result.entry) {
    cacheByRequest.set(requestKey, result.entry);
    latestBySource.set(source, result.entry);
    dispatchStatus(result.entry, false, false, viewport);
    return responseFromCache(result.entry);
  }

  if (latest && now - latest.storedAt <= STALE_FALLBACK_MS) {
    dispatchStatus(latest, true, true, viewport, result.warning);
    return responseFromCache(latest, true);
  }

  const warning = result.warning || "Provider layer temporarily unavailable";
  dispatchFailure(source, warning);
  // Return a valid temporary payload so App.tsx preserves the user's enabled
  // toggle and retries later instead of switching the source off.
  return transientFailureResponse(source, warning);
}) as typeof window.fetch;

export {};

import L from "leaflet";

const PATCH_FLAG = "__occumedProviderExplorerLayerStabilityPatched";
const AGGREGATE_CLASSES = [
  "provider-density-field",
  "provider-hex-field",
  "provider-dot-density-point",
];
const AGGREGATE_ENDPOINTS = [
  "/api/provider-explorer/density",
  "/api/provider-explorer/hex",
];

type StableLayerGroup = L.LayerGroup & {
  __occumedAggregateGroup?: boolean;
  __occumedPendingAggregateClear?: boolean;
  __occumedAggregateClearTimer?: number | null;
};

type PatchedLayerGroupPrototype = typeof L.LayerGroup.prototype & {
  [PATCH_FLAG]?: boolean;
};

const aggregateGroups = new Set<StableLayerGroup>();
let aggregateRequestsInFlight = 0;
let forceImmediateClearUntil = 0;

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function isAggregateRequest(input: RequestInfo | URL): boolean {
  try {
    const pathname = new URL(requestUrl(input), window.location.href).pathname;
    return AGGREGATE_ENDPOINTS.some((endpoint) => pathname === endpoint || pathname.endsWith(endpoint));
  } catch {
    return false;
  }
}

function layerClassName(layer: unknown): string {
  const options = (layer as { options?: { className?: unknown } } | null)?.options;
  return typeof options?.className === "string" ? options.className : "";
}

function isAggregateLayer(layer: unknown): boolean {
  const className = layerClassName(layer);
  return AGGREGATE_CLASSES.some((name) => className.split(/\s+/).includes(name));
}

function hasLayers(group: StableLayerGroup): boolean {
  return typeof group.getLayers === "function" && group.getLayers().length > 0;
}

function clearTimer(group: StableLayerGroup): void {
  if (group.__occumedAggregateClearTimer !== null && group.__occumedAggregateClearTimer !== undefined) {
    window.clearTimeout(group.__occumedAggregateClearTimer);
  }
  group.__occumedAggregateClearTimer = null;
}

function installProviderExplorerLayerStability(): void {
  const prototype = L.LayerGroup.prototype as PatchedLayerGroupPrototype;
  if (prototype[PATCH_FLAG]) return;

  const originalAddLayer = prototype.addLayer;
  const originalClearLayers = prototype.clearLayers;
  const originalFetch = window.fetch.bind(window);

  function flushGroup(group: StableLayerGroup): void {
    if (!group.__occumedPendingAggregateClear) return;
    clearTimer(group);
    group.__occumedPendingAggregateClear = false;
    originalClearLayers.call(group);
  }

  function schedulePendingCheck(group: StableLayerGroup, delay = 180): void {
    clearTimer(group);
    group.__occumedAggregateClearTimer = window.setTimeout(() => {
      group.__occumedAggregateClearTimer = null;
      if (!group.__occumedPendingAggregateClear) return;
      if (aggregateRequestsInFlight > 0) {
        schedulePendingCheck(group, 240);
        return;
      }
      flushGroup(group);
    }, delay);
  }

  function flushAllPending(): void {
    aggregateGroups.forEach((group) => flushGroup(group));
  }

  prototype.addLayer = function patchedAddLayer(this: StableLayerGroup, layer: L.Layer): StableLayerGroup {
    if (isAggregateLayer(layer)) {
      this.__occumedAggregateGroup = true;
      aggregateGroups.add(this);
      // Replace the prior aggregate layer only when the first replacement cell
      // is ready. This keeps the Mapbox mirror from receiving a transient empty
      // collection while a density/hex request is still loading.
      flushGroup(this);
    }
    return originalAddLayer.call(this, layer) as StableLayerGroup;
  };

  prototype.clearLayers = function patchedClearLayers(this: StableLayerGroup): StableLayerGroup {
    const forceImmediate = Date.now() < forceImmediateClearUntil;
    if (!this.__occumedAggregateGroup || !hasLayers(this) || forceImmediate) {
      clearTimer(this);
      this.__occumedPendingAggregateClear = false;
      return originalClearLayers.call(this) as StableLayerGroup;
    }

    if (!this.__occumedPendingAggregateClear) {
      this.__occumedPendingAggregateClear = true;
      schedulePendingCheck(this);
    }
    return this;
  };

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (!isAggregateRequest(input)) return originalFetch(input, init);

    aggregateRequestsInFlight += 1;
    return originalFetch(input, init).finally(() => {
      // Keep the request marked active briefly after headers arrive so response
      // parsing and Leaflet drawing can complete before a fallback clear runs.
      window.setTimeout(() => {
        aggregateRequestsInFlight = Math.max(0, aggregateRequestsInFlight - 1);
        if (aggregateRequestsInFlight === 0) {
          aggregateGroups.forEach((group) => {
            if (group.__occumedPendingAggregateClear) schedulePendingCheck(group, 320);
          });
        }
      }, 900);
    });
  }) as typeof window.fetch;

  document.addEventListener("click", (event) => {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>("button");
    if (!button) return;
    const text = (button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (text.includes("8px points") || text.includes("clear filters")) {
      forceImmediateClearUntil = Date.now() + 700;
      flushAllPending();
    }
  }, true);

  prototype[PATCH_FLAG] = true;
}

installProviderExplorerLayerStability();

export {};

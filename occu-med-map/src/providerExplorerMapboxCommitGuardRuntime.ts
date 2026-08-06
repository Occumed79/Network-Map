import mapboxgl from "mapbox-gl";

const PATCH_FLAG = "__occumedProviderExplorerMapboxCommitGuardPatched";
const WRAPPED_FLAG = "__occumedProviderExplorerMapboxSourceWrapped";
const EVENT_NAME = "occumed:provider-explorer-stability";
const NETWORK_SOURCE_ID = "network-overlays";
const RELEASE_GRACE_MS = 240;

type RuntimeSnapshot = {
  requestId: number;
  requestActive: boolean;
  commitDepth: number;
  lastCompletedRequestId: number;
};

type StabilityEventDetail = {
  phase?: string;
};

type GuardedSource = mapboxgl.GeoJSONSource & {
  [WRAPPED_FLAG]?: boolean;
};

type SourceState = {
  map: mapboxgl.Map;
  source: GuardedSource;
  originalSetData: mapboxgl.GeoJSONSource["setData"];
  pendingData: string | GeoJSON.GeoJSON | null;
  releaseTimer: number | null;
  lastAppliedFeatureCount: number;
};

declare global {
  interface Window {
    __OCCUMED_PROVIDER_EXPLORER_STABILITY__?: RuntimeSnapshot;
  }
}

const sourceStates = new Set<SourceState>();
const stateBySource = new WeakMap<GuardedSource, SourceState>();

function runtimeState(): RuntimeSnapshot | undefined {
  return window.__OCCUMED_PROVIDER_EXPLORER_STABILITY__;
}

function featureCount(data: string | GeoJSON.GeoJSON): number | null {
  if (typeof data === "string") return null;
  if (data.type === "FeatureCollection") return data.features.length;
  if (data.type === "Feature") return 1;
  return null;
}

function shouldHold(state: SourceState, data: string | GeoJSON.GeoJSON): boolean {
  const runtime = runtimeState();
  if ((runtime?.commitDepth || 0) > 0) return true;

  const nextCount = featureCount(data);
  return Boolean(
    runtime?.requestActive
    && nextCount === 0
    && state.lastAppliedFeatureCount > 0,
  );
}

function clearReleaseTimer(state: SourceState): void {
  if (state.releaseTimer !== null) window.clearTimeout(state.releaseTimer);
  state.releaseTimer = null;
}

function applyData(state: SourceState, data: string | GeoJSON.GeoJSON): mapboxgl.GeoJSONSource {
  clearReleaseTimer(state);
  state.pendingData = null;
  const count = featureCount(data);
  if (count !== null) state.lastAppliedFeatureCount = count;
  return state.originalSetData(data);
}

function discardUnsafeEmptyPending(state: SourceState): void {
  if (state.pendingData && featureCount(state.pendingData) === 0 && state.lastAppliedFeatureCount > 0) {
    clearReleaseTimer(state);
    state.pendingData = null;
  }
}

function flushPending(state: SourceState): void {
  state.releaseTimer = null;
  const pending = state.pendingData;
  if (!pending) return;

  const runtime = runtimeState();
  if ((runtime?.commitDepth || 0) > 0 || runtime?.requestActive) {
    scheduleFlush(state, RELEASE_GRACE_MS);
    return;
  }

  applyData(state, pending);
}

function scheduleFlush(state: SourceState, delay = RELEASE_GRACE_MS): void {
  clearReleaseTimer(state);
  state.releaseTimer = window.setTimeout(() => flushPending(state), delay);
}

function detachState(state: SourceState): void {
  clearReleaseTimer(state);
  state.pendingData = null;
  sourceStates.delete(state);
  stateBySource.delete(state.source);
}

function wrapNetworkSource(map: mapboxgl.Map): void {
  const source = map.getSource(NETWORK_SOURCE_ID) as GuardedSource | undefined;
  if (!source || source[WRAPPED_FLAG]) return;

  const state: SourceState = {
    map,
    source,
    originalSetData: source.setData.bind(source),
    pendingData: null,
    releaseTimer: null,
    lastAppliedFeatureCount: 0,
  };

  source.setData = ((data: string | GeoJSON.GeoJSON) => {
    if (shouldHold(state, data)) {
      state.pendingData = data;
      scheduleFlush(state);
      return source;
    }
    return applyData(state, data);
  }) as mapboxgl.GeoJSONSource["setData"];

  source[WRAPPED_FLAG] = true;
  sourceStates.add(state);
  stateBySource.set(source, state);
}

function installGuard(): void {
  const prototype = mapboxgl.Map.prototype as any;
  if (prototype[PATCH_FLAG]) return;

  const originalAddSource = prototype.addSource as (
    this: mapboxgl.Map,
    id: string,
    source: mapboxgl.AnySourceData,
  ) => mapboxgl.Map;
  const originalRemoveSource = prototype.removeSource as (
    this: mapboxgl.Map,
    id: string,
  ) => mapboxgl.Map;
  const originalRemove = prototype.remove as (this: mapboxgl.Map) => void;

  prototype.addSource = function guardedAddSource(
    this: mapboxgl.Map,
    id: string,
    source: mapboxgl.AnySourceData,
  ): mapboxgl.Map {
    const result = originalAddSource.call(this, id, source);
    if (id === NETWORK_SOURCE_ID) wrapNetworkSource(this);
    return result;
  };

  prototype.removeSource = function guardedRemoveSource(this: mapboxgl.Map, id: string): mapboxgl.Map {
    if (id === NETWORK_SOURCE_ID) {
      const source = this.getSource(id) as GuardedSource | undefined;
      const state = source ? stateBySource.get(source) : undefined;
      if (state) detachState(state);
    }
    return originalRemoveSource.call(this, id);
  };

  prototype.remove = function guardedRemove(this: mapboxgl.Map): void {
    sourceStates.forEach((state) => {
      if (state.map === this) detachState(state);
    });
    originalRemove.call(this);
  };

  document.addEventListener(EVENT_NAME, (event) => {
    const phase = (event as CustomEvent<StabilityEventDetail>).detail?.phase || "";
    sourceStates.forEach((state) => {
      if (phase === "request-error" || phase === "request-cancelled") {
        // A failed refresh must leave the last known-good Mapbox frame intact.
        discardUnsafeEmptyPending(state);
        return;
      }
      if (state.pendingData) scheduleFlush(state);
    });
  });

  prototype[PATCH_FLAG] = true;
}

installGuard();

export {};

import L from "leaflet";
import { registerLeafletMapInitializer } from "./leafletMapLifecycleRuntime";
import mapboxgl from "mapbox-gl";

const NETWORK_SOURCE_ID = "network-overlays";
const MAX_MIRRORED_FEATURES = 75_000;
const SYNC_DEBOUNCE_MS = 90;
const EMPTY_RELEASE_GRACE_MS = 360;
const MAP_PATCH_FLAG = "__occumedUnifiedOverlayControllerMapPatched";
const SOURCE_PATCH_FLAG = "__occumedUnifiedOverlayControllerSourcePatched";
const STABILITY_EVENT = "occumed:provider-explorer-stability";

type StabilitySnapshot = {
  requestId?: number;
  requestActive?: boolean;
  commitDepth?: number;
};

type OverlayControllerStats = {
  featureCount: number;
  revision: number;
  appliedRevision: number;
  capped: boolean;
  trackedMapCount: number;
  externalWritesSuppressed: number;
  pending: boolean;
};

type GuardedSource = mapboxgl.GeoJSONSource & {
  [SOURCE_PATCH_FLAG]?: boolean;
};

type SourceState = {
  source: GuardedSource;
  originalSetData: mapboxgl.GeoJSONSource["setData"];
  externalWritesSuppressed: number;
  lastAppliedRevision: number;
};

type MapBinding = {
  onStyleLoad: () => void;
  onWebglLost: (event: Event) => void;
  onWebglRestored: () => void;
  canvas: HTMLCanvasElement;
};

declare global {
  interface Window {
    __NETWORK_MAP_OVERLAY_SYNC__?: {
      sync: () => void;
      getStats: () => OverlayControllerStats;
    };
  }
}

let canonicalMap: L.Map | null = null;
let syncTimer: number | null = null;
let emptyReleaseTimer: number | null = null;
let revision = 0;
let appliedRevision = -1;
let pendingSync = false;
let lastCollection: GeoJSON.FeatureCollection = emptyFeatureCollection();
let lastCollectionCapped = false;
let lastReason = "startup";

const trackedMaps = new Set<mapboxgl.Map>();
const sourceStates = new Map<mapboxgl.Map, SourceState>();
const mapBindings = new Map<mapboxgl.Map, MapBinding>();

function stabilitySnapshot(): StabilitySnapshot {
  return ((window as any).__OCCUMED_PROVIDER_EXPLORER_STABILITY__ || {}) as StabilitySnapshot;
}

function runtimeBusy(): boolean {
  const snapshot = stabilitySnapshot();
  return Boolean(snapshot.requestActive || Number(snapshot.commitDepth || 0) > 0);
}

function emit(phase: string, detail: Record<string, unknown> = {}): void {
  window.dispatchEvent(new CustomEvent("network-map:overlay-sync", {
    detail: {
      phase,
      revision,
      appliedRevision,
      featureCount: lastCollection.features.length,
      capped: lastCollectionCapped,
      reason: lastReason,
      ...detail,
    },
  }));
}

function emptyFeatureCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function clearTimer(timer: number | null): void {
  if (timer !== null) window.clearTimeout(timer);
}

function markDirty(reason: string, delay = SYNC_DEBOUNCE_MS): void {
  revision += 1;
  lastReason = reason;
  pendingSync = true;
  clearTimer(emptyReleaseTimer);
  emptyReleaseTimer = null;

  if (document.hidden || runtimeBusy()) return;
  scheduleSync(delay);
}

function scheduleSync(delay = SYNC_DEBOUNCE_MS): void {
  clearTimer(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    runSync(false);
  }, delay);
}

function runSync(forceEmpty: boolean): void {
  if (!canonicalMap) return;
  if (document.hidden || runtimeBusy()) {
    pendingSync = true;
    return;
  }

  let next: { collection: GeoJSON.FeatureCollection; capped: boolean };
  try {
    next = buildCollection(canonicalMap);
  } catch (error) {
    pendingSync = false;
    emit("build-error", { error: error instanceof Error ? error.message : String(error) });
    return;
  }

  if (!forceEmpty && next.collection.features.length === 0 && lastCollection.features.length > 0) {
    const candidateRevision = revision;
    clearTimer(emptyReleaseTimer);
    emptyReleaseTimer = window.setTimeout(() => {
      emptyReleaseTimer = null;
      if (candidateRevision !== revision) {
        scheduleSync(0);
        return;
      }
      runSync(true);
    }, EMPTY_RELEASE_GRACE_MS);
    emit("empty-frame-held", { candidateRevision });
    return;
  }

  lastCollection = next.collection;
  lastCollectionCapped = next.capped;
  appliedRevision = revision;
  pendingSync = false;
  applyLatestCollection();
  emit("applied", { trackedMapCount: trackedMaps.size });
}

function buildCollection(map: L.Map): { collection: GeoJSON.FeatureCollection; capped: boolean } {
  const features: GeoJSON.Feature[] = [];
  const seen = new Set<number>();
  let capped = false;

  const visit = (layer: any): void => {
    if (!layer || capped) return;
    if (
      layer instanceof L.TileLayer
      || layer instanceof L.GridLayer
      || layer instanceof L.ImageOverlay
      || layer instanceof L.Popup
      || layer instanceof L.Tooltip
    ) return;

    if (layer instanceof L.LayerGroup) {
      layer.eachLayer((child: L.Layer) => visit(child));
      return;
    }

    const id = Number(layer._leaflet_id || 0);
    if (id && seen.has(id)) return;
    if (id) seen.add(id);

    const feature = leafletToGeoJsonFeature(layer);
    if (!feature) return;
    features.push(feature);
    if (features.length >= MAX_MIRRORED_FEATURES) capped = true;
  };

  map.eachLayer((layer: L.Layer) => visit(layer));
  return {
    collection: { type: "FeatureCollection", features },
    capped,
  };
}

function leafletToGeoJsonFeature(layer: any): GeoJSON.Feature | null {
  const options = layer.options || {};
  const properties = {
    popupHtml: popupHtmlFor(layer),
    fillColor: String(options.fillColor || options.color || "#0e7490"),
    fillOpacity: clampNumber(options.fillOpacity, 0.9),
    lineColor: String(options.color || "#ffffff"),
    lineOpacity: clampNumber(options.opacity, 0.95),
    lineWidth: Math.max(0.5, Number(options.weight || 1)),
    pointRadius: Math.max(4, Number(options.radius || 4) * 1.15),
  };

  if (layer instanceof L.Circle) {
    const center = layer.getLatLng();
    return geoJsonFeature(
      { type: "Polygon", coordinates: [geodesicRing(center.lat, center.lng, layer.getRadius())] },
      properties,
    );
  }

  if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
    const center = layer.getLatLng();
    return geoJsonFeature({ type: "Point", coordinates: [center.lng, center.lat] }, properties);
  }

  if (layer instanceof L.Polygon) {
    const rings: number[][][] = [];
    collectCoordinatePaths(layer.getLatLngs(), rings);
    return rings.length
      ? geoJsonFeature({ type: "Polygon", coordinates: rings }, properties)
      : null;
  }

  if (layer instanceof L.Polyline) {
    const paths: number[][][] = [];
    collectCoordinatePaths(layer.getLatLngs(), paths);
    if (!paths.length) return null;
    const geometry = paths.length === 1
      ? { type: "LineString", coordinates: paths[0] }
      : { type: "MultiLineString", coordinates: paths };
    return geoJsonFeature(geometry as GeoJSON.Geometry, properties);
  }

  return null;
}

function geoJsonFeature(
  geometry: GeoJSON.Geometry,
  properties: GeoJSON.GeoJsonProperties,
): GeoJSON.Feature {
  return { type: "Feature", geometry, properties };
}

function popupHtmlFor(layer: any): string {
  const popup = typeof layer.getPopup === "function" ? layer.getPopup() : null;
  const tooltip = typeof layer.getTooltip === "function" ? layer.getTooltip() : null;
  const raw = popup?.getContent?.() || tooltip?.getContent?.();
  if (typeof raw === "string") return raw;
  if (raw instanceof HTMLElement) return raw.outerHTML;
  return "";
}

function collectCoordinatePaths(value: any, output: number[][][]): void {
  if (!Array.isArray(value) || value.length === 0) return;
  if (typeof value[0]?.lat === "number" && typeof value[0]?.lng === "number") {
    output.push(value.map((point: L.LatLng) => [point.lng, point.lat]));
    return;
  }
  value.forEach((child: any) => collectCoordinatePaths(child, output));
}

function geodesicRing(lat: number, lng: number, radiusMeters: number): number[][] {
  const earthRadius = 6_378_137;
  const angularDistance = Math.max(1, radiusMeters) / earthRadius;
  const latitude = lat * Math.PI / 180;
  const longitude = lng * Math.PI / 180;
  const ring: number[][] = [];

  for (let index = 0; index <= 72; index += 1) {
    const bearing = index / 72 * Math.PI * 2;
    const destinationLat = Math.asin(
      Math.sin(latitude) * Math.cos(angularDistance)
      + Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const destinationLng = longitude + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
      Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(destinationLat),
    );
    ring.push([destinationLng * 180 / Math.PI, destinationLat * 180 / Math.PI]);
  }

  return ring;
}

function clampNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

function bindCanonicalMap(map: L.Map): void {
  canonicalMap = map;
  const refresh = () => markDirty("leaflet-layer-change");
  map.on("layeradd layerremove overlayadd overlayremove", refresh);
  map.once("unload", () => {
    map.off("layeradd layerremove overlayadd overlayremove", refresh);
    if (canonicalMap === map) canonicalMap = null;
    clearTimer(syncTimer);
    clearTimer(emptyReleaseTimer);
    syncTimer = null;
    emptyReleaseTimer = null;
  });
  markDirty("canonical-map-ready", 0);
}

function wrapNetworkSource(instance: mapboxgl.Map): SourceState | null {
  const source = instance.getSource(NETWORK_SOURCE_ID) as GuardedSource | undefined;
  if (!source || typeof source.setData !== "function") return null;

  const existing = sourceStates.get(instance);
  if (existing?.source === source) return existing;

  const state: SourceState = {
    source,
    originalSetData: source.setData.bind(source),
    externalWritesSuppressed: 0,
    lastAppliedRevision: -1,
  };

  source.setData = ((_data: string | GeoJSON.GeoJSON) => {
    state.externalWritesSuppressed += 1;
    return source;
  }) as mapboxgl.GeoJSONSource["setData"];
  source[SOURCE_PATCH_FLAG] = true;
  sourceStates.set(instance, state);
  return state;
}

function ensureOverlayLayers(instance: mapboxgl.Map): void {
  if (!instance.isStyleLoaded()) return;

  if (!instance.getSource(NETWORK_SOURCE_ID)) {
    instance.addSource(NETWORK_SOURCE_ID, {
      type: "geojson",
      data: emptyFeatureCollection(),
    });
  }

  if (!instance.getLayer("network-fills")) {
    instance.addLayer({
      id: "network-fills",
      type: "fill",
      source: NETWORK_SOURCE_ID,
      filter: ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false] as any,
      paint: {
        "fill-color": ["coalesce", ["get", "fillColor"], "#0e7490"],
        "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.2],
        "fill-outline-color": ["coalesce", ["get", "lineColor"], "#ffffff"],
      },
    });
  }

  if (!instance.getLayer("network-lines")) {
    instance.addLayer({
      id: "network-lines",
      type: "line",
      source: NETWORK_SOURCE_ID,
      filter: ["match", ["geometry-type"], ["LineString", "MultiLineString"], true, false] as any,
      paint: {
        "line-color": ["coalesce", ["get", "lineColor"], "#67e8f9"],
        "line-opacity": ["coalesce", ["get", "lineOpacity"], 0.9],
        "line-width": ["coalesce", ["get", "lineWidth"], 2],
      },
    });
  }

  if (!instance.getLayer("network-points")) {
    instance.addLayer({
      id: "network-points",
      type: "circle",
      source: NETWORK_SOURCE_ID,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-radius": ["coalesce", ["get", "pointRadius"], 5],
        "circle-color": ["coalesce", ["get", "fillColor"], "#0e7490"],
        "circle-opacity": ["coalesce", ["get", "fillOpacity"], 0.9],
        "circle-stroke-color": ["coalesce", ["get", "lineColor"], "#ffffff"],
        "circle-stroke-width": ["coalesce", ["get", "lineWidth"], 1],
      },
    });
  }

  wrapNetworkSource(instance);
}

function applyCollectionToMap(instance: mapboxgl.Map): void {
  if (!instance.isStyleLoaded()) return;
  ensureOverlayLayers(instance);
  const state = wrapNetworkSource(instance);
  if (!state || state.lastAppliedRevision === appliedRevision) return;
  state.originalSetData(lastCollection);
  state.lastAppliedRevision = appliedRevision;
}

function applyLatestCollection(): void {
  trackedMaps.forEach((instance) => {
    try {
      applyCollectionToMap(instance);
    } catch (error) {
      emit("map-apply-error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

function trackMap(instance: mapboxgl.Map): void {
  if (trackedMaps.has(instance)) return;
  trackedMaps.add(instance);

  const onStyleLoad = () => {
    window.queueMicrotask(() => {
      try {
        ensureOverlayLayers(instance);
        const state = sourceStates.get(instance);
        if (state) state.lastAppliedRevision = -1;
        applyCollectionToMap(instance);
      } catch (error) {
        emit("style-recovery-error", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  };

  const canvas = instance.getCanvas();
  const onWebglLost = (event: Event) => {
    event.preventDefault();
    emit("webgl-context-lost");
  };
  const onWebglRestored = () => {
    const state = sourceStates.get(instance);
    if (state) state.lastAppliedRevision = -1;
    applyCollectionToMap(instance);
    emit("webgl-context-restored");
  };

  instance.on("style.load", onStyleLoad);
  canvas.addEventListener("webglcontextlost", onWebglLost);
  canvas.addEventListener("webglcontextrestored", onWebglRestored);
  mapBindings.set(instance, { onStyleLoad, onWebglLost, onWebglRestored, canvas });
}

function untrackMap(instance: mapboxgl.Map): void {
  const binding = mapBindings.get(instance);
  if (binding) {
    instance.off("style.load", binding.onStyleLoad);
    binding.canvas.removeEventListener("webglcontextlost", binding.onWebglLost);
    binding.canvas.removeEventListener("webglcontextrestored", binding.onWebglRestored);
  }
  mapBindings.delete(instance);
  sourceStates.delete(instance);
  trackedMaps.delete(instance);
}

function installMapboxOwnership(): void {
  const prototype = mapboxgl.Map.prototype as any;
  if (prototype[MAP_PATCH_FLAG]) return;

  const originalAddSource = prototype.addSource as (
    this: mapboxgl.Map,
    id: string,
    source: mapboxgl.AnySourceData,
  ) => mapboxgl.Map;
  const originalRemoveSource = prototype.removeSource as (
    this: mapboxgl.Map,
    id: string,
  ) => mapboxgl.Map;
  const originalRemove = prototype.remove as (this: mapboxgl.Map, ...args: any[]) => any;

  prototype.addSource = function controlledAddSource(
    this: mapboxgl.Map,
    id: string,
    source: mapboxgl.AnySourceData,
  ): mapboxgl.Map {
    const result = originalAddSource.call(this, id, source);
    if (id === NETWORK_SOURCE_ID) {
      trackMap(this);
      wrapNetworkSource(this);
      window.queueMicrotask(() => {
        ensureOverlayLayers(this);
        applyCollectionToMap(this);
      });
    }
    return result;
  };

  prototype.removeSource = function controlledRemoveSource(
    this: mapboxgl.Map,
    id: string,
  ): mapboxgl.Map {
    if (id === NETWORK_SOURCE_ID) sourceStates.delete(this);
    return originalRemoveSource.call(this, id);
  };

  prototype.remove = function controlledRemove(this: mapboxgl.Map, ...args: any[]): any {
    untrackMap(this);
    return originalRemove.apply(this, args);
  };

  prototype[MAP_PATCH_FLAG] = true;
}

function onStabilityEvent(event: Event): void {
  const phase = String((event as CustomEvent<{ phase?: string }>).detail?.phase || "");
  if (phase === "commit-end") {
    markDirty("provider-explorer-commit", 0);
    return;
  }
  if (!runtimeBusy() && pendingSync) scheduleSync(SYNC_DEBOUNCE_MS);
}

function onVisibilityChange(): void {
  if (document.hidden) {
    clearTimer(syncTimer);
    syncTimer = null;
    pendingSync = pendingSync || revision !== appliedRevision;
    return;
  }

  if (pendingSync || revision !== appliedRevision) scheduleSync(0);
  trackedMaps.forEach((instance) => {
    try {
      instance.resize();
      applyCollectionToMap(instance);
    } catch {}
  });
}

function totalExternalWritesSuppressed(): number {
  let count = 0;
  sourceStates.forEach((state) => { count += state.externalWritesSuppressed; });
  return count;
}

registerLeafletMapInitializer({
  id: "overlay-synchronization",
  priority: 30,
  initialize: bindCanonicalMap,
});
installMapboxOwnership();
document.addEventListener(STABILITY_EVENT, onStabilityEvent);
document.addEventListener("visibilitychange", onVisibilityChange);

window.__NETWORK_MAP_OVERLAY_SYNC__ = {
  sync: () => markDirty("manual-sync", 0),
  getStats: () => ({
    featureCount: lastCollection.features.length,
    revision,
    appliedRevision,
    capped: lastCollectionCapped,
    trackedMapCount: trackedMaps.size,
    externalWritesSuppressed: totalExternalWritesSuppressed(),
    pending: pendingSync,
  }),
};

export {};

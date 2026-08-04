import L from "leaflet";
import mapboxgl from "mapbox-gl";

const NETWORK_SOURCE_ID = "network-overlays";
const MAX_COMPLETE_FEATURES = 75_000;
const MAP_PATCH_FLAG = "__occumedCompletePinMirrorMapPatched";
const SOURCE_PATCH_FLAG = "__occumedCompletePinMirrorSourcePatched";

const trackedMaps = new Set<mapboxgl.Map>();
let canonicalMap: L.Map | null = null;
let rebuildTimer: number | null = null;
let periodicTimer: number | null = null;
let latestCollection: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function clampNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

function popupHtmlFor(layer: any): string {
  const popup = typeof layer.getPopup === "function" ? layer.getPopup() : null;
  const tooltip = typeof layer.getTooltip === "function" ? layer.getTooltip() : null;
  const raw = popup?.getContent?.() || tooltip?.getContent?.();
  if (typeof raw === "string") return raw;
  if (raw instanceof HTMLElement) return raw.outerHTML;
  return "";
}

function geoJsonFeature(
  geometry: GeoJSON.Geometry,
  properties: GeoJSON.GeoJsonProperties,
): GeoJSON.Feature {
  return { type: "Feature", geometry, properties };
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

function isDecorativeDensityLayer(layer: any): boolean {
  const className = String(layer?.options?.className || "");
  return className.split(/\s+/).includes("provider-density-field");
}

function leafletToGeoJsonFeature(layer: any): GeoJSON.Feature | null {
  if (isDecorativeDensityLayer(layer)) return null;

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

function collectRenderableLayers(map: L.Map): any[] {
  const result: any[] = [];
  const seen = new Set<number>();

  const visit = (layer: any) => {
    if (!layer || isDecorativeDensityLayer(layer)) return;
    if (
      layer instanceof L.TileLayer
      || layer instanceof L.GridLayer
      || layer instanceof L.ImageOverlay
      || layer instanceof L.Popup
      || layer instanceof L.Tooltip
    ) return;

    if (layer instanceof L.LayerGroup) {
      layer.eachLayer((child: any) => visit(child));
      return;
    }

    const id = Number(layer._leaflet_id || 0);
    if (id && seen.has(id)) return;
    if (id) seen.add(id);
    result.push(layer);
  };

  map.eachLayer((layer: L.Layer) => visit(layer));
  return result;
}

function buildCompleteCollection(): GeoJSON.FeatureCollection {
  if (!canonicalMap) return { type: "FeatureCollection", features: [] };

  const features: GeoJSON.Feature[] = [];
  for (const layer of collectRenderableLayers(canonicalMap)) {
    const feature = leafletToGeoJsonFeature(layer);
    if (feature) features.push(feature);
    if (features.length >= MAX_COMPLETE_FEATURES) {
      console.warn(`Visible map mirror reached ${MAX_COMPLETE_FEATURES.toLocaleString()} features.`);
      break;
    }
  }

  return { type: "FeatureCollection", features };
}

function featureCount(data: unknown): number {
  if (!data || typeof data !== "object") return -1;
  const features = (data as GeoJSON.FeatureCollection).features;
  return Array.isArray(features) ? features.length : -1;
}

function patchNetworkSource(source: mapboxgl.GeoJSONSource | undefined): void {
  const target = source as (mapboxgl.GeoJSONSource & Record<string, unknown>) | undefined;
  if (!target || target[SOURCE_PATCH_FLAG] || typeof target.setData !== "function") return;

  const originalSetData = target.setData.bind(target);
  target.setData = ((data: string | GeoJSON.GeoJSON) => {
    const incomingCount = featureCount(data);
    const completeCount = latestCollection.features.length;
    const nextData = completeCount > incomingCount ? latestCollection : data;
    return originalSetData(nextData);
  }) as typeof target.setData;
  target[SOURCE_PATCH_FLAG] = true;
}

function pushLatestCollection(): void {
  for (const instance of trackedMaps) {
    const source = instance.getSource(NETWORK_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    patchNetworkSource(source);
    source?.setData(latestCollection);
  }
}

function rebuildCompleteCollection(): void {
  latestCollection = buildCompleteCollection();
  pushLatestCollection();
  window.dispatchEvent(new CustomEvent("network-map:complete-pin-mirror", {
    detail: { mirrored: latestCollection.features.length, capped: latestCollection.features.length >= MAX_COMPLETE_FEATURES },
  }));
}

function scheduleRebuild(delay = 45): void {
  if (rebuildTimer !== null) window.clearTimeout(rebuildTimer);
  rebuildTimer = window.setTimeout(() => {
    rebuildTimer = null;
    rebuildCompleteCollection();
  }, delay);
}

function bindCanonicalMap(map: L.Map): void {
  canonicalMap = map;
  const refresh = () => scheduleRebuild();
  map.on("layeradd layerremove overlayadd overlayremove moveend zoomend", refresh);
  map.once("unload", () => {
    map.off("layeradd layerremove overlayadd overlayremove moveend zoomend", refresh);
    if (canonicalMap === map) canonicalMap = null;
  });
  scheduleRebuild(0);
}

function patchLeafletMapFactory(): void {
  const originalMapFactory = L.map.bind(L);
  (L as any).map = (element: string | HTMLElement, options?: L.MapOptions) => {
    const map = originalMapFactory(element, options);
    bindCanonicalMap(map);
    return map;
  };
}

function patchMapboxSources(): void {
  const prototype = mapboxgl.Map.prototype as any;
  if (prototype[MAP_PATCH_FLAG]) return;

  const originalAddSource = prototype.addSource;
  prototype.addSource = function patchedAddSource(this: mapboxgl.Map, id: string, source: any): mapboxgl.Map {
    const result = originalAddSource.call(this, id, source);
    trackedMaps.add(this);
    if (id === NETWORK_SOURCE_ID) {
      patchNetworkSource(this.getSource(id) as mapboxgl.GeoJSONSource | undefined);
      scheduleRebuild(0);
    }
    return result;
  };

  const originalRemove = prototype.remove;
  prototype.remove = function patchedRemove(this: mapboxgl.Map, ...args: any[]): any {
    trackedMaps.delete(this);
    return originalRemove.apply(this, args);
  };

  prototype[MAP_PATCH_FLAG] = true;
}

function startPeriodicReconciliation(): void {
  if (periodicTimer !== null) return;
  periodicTimer = window.setInterval(() => {
    if (!canonicalMap) return;
    rebuildCompleteCollection();
  }, 2_500);
}

patchLeafletMapFactory();
patchMapboxSources();
startPeriodicReconciliation();

export {};

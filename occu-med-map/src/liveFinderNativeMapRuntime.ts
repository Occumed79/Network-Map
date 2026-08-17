import mapboxgl from "mapbox-gl";
import { getTrackedMapboxMaps, registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";

export type NativeLivePoint = {
  id: string;
  lat: number;
  lng: number;
  color: string;
  popupHtml: string;
  radius?: number;
};

type Center = { lat: number; lng: number };
type Channel = "drop" | "reference" | "search" | "results";

type NativeOverlaySnapshot = {
  channel: Channel;
  featureCount: number;
  geometryTypes: string[];
};

type NativeOverlayDiagnosticsGlobal = typeof globalThis & {
  __NETWORK_MAP_LIVE_FINDER_NATIVE__?: {
    getSnapshot: (channel: Channel) => NativeOverlaySnapshot;
  };
};

const IDS = {
  drop: { source: "radius-extractor-native", fill: "radius-extractor-native-fill", line: "radius-extractor-native-line", center: "radius-extractor-native-center" },
  reference: { source: "reference-radius-native", fill: "reference-radius-native-fill", line: "reference-radius-native-line", center: "reference-radius-native-center" },
  search: { source: "live-finder-search-native", fill: "live-finder-search-native-fill", line: "live-finder-search-native-line", center: "live-finder-search-native-center" },
  results: { source: "live-finder-results-native", layer: "live-finder-results-native" },
} as const;

const empty = (): GeoJSON.FeatureCollection => ({ type: "FeatureCollection", features: [] });
const collections: Record<Channel, GeoJSON.FeatureCollection> = {
  drop: empty(),
  reference: empty(),
  search: empty(),
  results: empty(),
};
const resultPoints = new Map<string, NativeLivePoint>();
let onResultSelect: ((id: string) => void) | null = null;

function getNativeOverlaySnapshot(channel: Channel): NativeOverlaySnapshot {
  const features = collections[channel].features;
  return {
    channel,
    featureCount: features.length,
    geometryTypes: features.map((feature) => feature.geometry.type),
  };
}

(globalThis as NativeOverlayDiagnosticsGlobal).__NETWORK_MAP_LIVE_FINDER_NATIVE__ = {
  getSnapshot: getNativeOverlaySnapshot,
};

function activeMap(): mapboxgl.Map | null {
  const mode = window.__NETWORK_MAP_GLOBE__?.getMode?.();
  const maps = getTrackedMapboxMaps();
  return maps.find((map) => mode === "3d"
    ? Boolean(map.getContainer().closest(".mapbox-globe-host"))
    : Boolean(map.getContainer().closest(".mapbox-2d-host"))) || maps[0] || null;
}

function circlePolygon(center: Center, radiusMeters: number): GeoJSON.Polygon {
  const earthRadius = 6_378_137;
  const angular = Math.max(1, radiusMeters) / earthRadius;
  const phi1 = center.lat * Math.PI / 180;
  const lambda1 = center.lng * Math.PI / 180;
  const ring: number[][] = [];
  for (let index = 0; index <= 96; index += 1) {
    const bearing = index / 96 * Math.PI * 2;
    const phi2 = Math.asin(
      Math.sin(phi1) * Math.cos(angular)
      + Math.cos(phi1) * Math.sin(angular) * Math.cos(bearing),
    );
    const lambda2 = lambda1 + Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(phi1),
      Math.cos(angular) - Math.sin(phi1) * Math.sin(phi2),
    );
    ring.push([lambda2 * 180 / Math.PI, phi2 * 180 / Math.PI]);
  }
  return { type: "Polygon", coordinates: [ring] };
}

function sourceData(map: mapboxgl.Map, sourceId: string, collection: GeoJSON.FeatureCollection): void {
  const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
  if (source) {
    source.setData(collection);
    return;
  }
  map.addSource(sourceId, { type: "geojson", data: collection, generateId: true });
}

function ensureAreaLayers(
  map: mapboxgl.Map,
  ids: { source: string; fill: string; line: string; center: string },
  collection: GeoJSON.FeatureCollection,
): void {
  sourceData(map, ids.source, collection);
  if (!map.getLayer(ids.fill)) {
    map.addLayer({
      id: ids.fill,
      type: "fill",
      source: ids.source,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": ["coalesce", ["get", "color"], "#22d3ee"],
        "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.06],
      },
    });
  }
  if (!map.getLayer(ids.line)) {
    map.addLayer({
      id: ids.line,
      type: "line",
      source: ids.source,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#22d3ee"],
        "line-opacity": ["coalesce", ["get", "lineOpacity"], 0.8],
        "line-width": ["coalesce", ["get", "lineWidth"], 2],
        "line-dasharray": [2, 1.2],
      },
    });
  }
  if (!map.getLayer(ids.center)) {
    map.addLayer({
      id: ids.center,
      type: "circle",
      source: ids.source,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-radius": ["coalesce", ["get", "radius"], 7],
        "circle-color": ["coalesce", ["get", "color"], "#22d3ee"],
        "circle-stroke-width": 2.5,
        "circle-stroke-color": "#ffffff",
      },
    });
  }
}

function ensureLayers(map: mapboxgl.Map): void {
  if (!map.isStyleLoaded()) return;
  ensureAreaLayers(map, IDS.drop, collections.drop);
  ensureAreaLayers(map, IDS.reference, collections.reference);
  ensureAreaLayers(map, IDS.search, collections.search);
  sourceData(map, IDS.results.source, collections.results);
  if (!map.getLayer(IDS.results.layer)) {
    map.addLayer({
      id: IDS.results.layer,
      type: "circle",
      source: IDS.results.source,
      paint: {
        "circle-radius": ["coalesce", ["get", "radius"], 4],
        "circle-color": ["coalesce", ["get", "color"], "#22d3ee"],
        "circle-opacity": 0.94,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
      },
    });
  }
}

function update(channel: Channel): void {
  for (const map of getTrackedMapboxMaps()) {
    if (!map.isStyleLoaded()) continue;
    try {
      ensureLayers(map);
      const sourceId = IDS[channel].source;
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined)?.setData(collections[channel]);
    } catch (error) {
      console.warn(`Native ${channel} overlay update failed`, error);
    }
  }
}

function areaCollection(center: Center | null, radiusMiles: number, color: string, fillOpacity: number, lineOpacity: number, lineWidth: number): GeoJSON.FeatureCollection {
  if (!center) return empty();
  const radiusMeters = Math.max(0.1, radiusMiles) * 1609.34;
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: circlePolygon(center, radiusMeters),
        properties: { color, fillOpacity, lineOpacity, lineWidth },
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [center.lng, center.lat] },
        properties: { color, radius: 7 },
      },
    ],
  };
}

export function setRadiusExtractorOverlay(center: Center | null, radiusMiles: number): void {
  collections.drop = areaCollection(center, radiusMiles, "#ef4444", 0.1, 0.95, 2);
  update("drop");
}

export function setReferenceRadiusOverlay(center: Center | null, visible: boolean): void {
  collections.reference = visible ? areaCollection(center, 70, "#00d4ff", 0.07, 1, 3) : empty();
  update("reference");
}

export function setLiveFinderSearchOverlay(center: Center | null, radiusMiles: number): void {
  collections.search = areaCollection(center, radiusMiles, "#22d3ee", 0.03, 0.45, 1.5);
  update("search");
}

export function clearLiveFinderSearchOverlay(): void {
  collections.search = empty();
  update("search");
}

export function renderNativeLivePoints(points: NativeLivePoint[], select?: (id: string) => void): number {
  resultPoints.clear();
  onResultSelect = select || null;
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  for (const point of points.slice(0, 750)) {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) continue;
    resultPoints.set(point.id, point);
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [point.lng, point.lat] },
      properties: {
        id: point.id,
        color: point.color,
        radius: point.radius ?? 4,
        popupHtml: point.popupHtml,
      },
    });
  }
  collections.results = { type: "FeatureCollection", features };
  update("results");
  return features.length;
}

export function clearNativeLivePoints(): void {
  resultPoints.clear();
  collections.results = empty();
  update("results");
}

function openPoint(map: mapboxgl.Map, point: NativeLivePoint): void {
  new mapboxgl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "300px", className: "live-marker-popup" })
    .setLngLat([point.lng, point.lat])
    .setHTML(point.popupHtml)
    .addTo(map);
}

export function flyToNativeLivePoint(id: string, lat: number, lng: number): void {
  const map = activeMap();
  if (!map) return;
  map.flyTo({ center: [lng, lat], zoom: 17, duration: 800 });
  const point = resultPoints.get(id);
  if (point) window.setTimeout(() => openPoint(map, point), 850);
}

function featureAt(map: mapboxgl.Map, point: mapboxgl.PointLike): mapboxgl.MapboxGeoJSONFeature | null {
  if (!map.getLayer(IDS.results.layer)) return null;
  const p = point as mapboxgl.Point;
  const box: [[number, number], [number, number]] = [[p.x - 9, p.y - 9], [p.x + 9, p.y + 9]];
  try {
    return map.queryRenderedFeatures(box, { layers: [IDS.results.layer] })[0] || null;
  } catch {
    return null;
  }
}

registerMapboxMapInitializer({
  id: "live-finder-native-map",
  priority: 13,
  initialize: (map) => {
    const apply = () => ensureLayers(map);
    const click = (event: mapboxgl.MapMouseEvent) => {
      const feature = featureAt(map, event.point);
      if (!feature) return;
      const id = String(feature.properties?.id || "");
      const point = resultPoints.get(id);
      if (!point) return;
      if (event.originalEvent && typeof event.originalEvent === "object") {
        (event.originalEvent as unknown as Record<string, unknown>).__networkMapCompatHandled = true;
      }
      openPoint(map, point);
      onResultSelect?.(id);
    };
    map.on("style.load", apply);
    map.on("click", click);
    if (map.isStyleLoaded()) queueMicrotask(apply);
    return () => {
      map.off("style.load", apply);
      map.off("click", click);
    };
  },
});

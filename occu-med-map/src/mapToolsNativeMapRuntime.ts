import mapboxgl from "mapbox-gl";
import { getActiveMapboxMap, getTrackedMapboxMaps, registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";

export type NativeMapToolsPoint = { lat: number; lng: number; label?: string };

type Channel = "origin" | "route" | "zones" | "density" | "planner";

const IDS = {
  origin: { source: "map-tools-native-origin", point: "map-tools-native-origin" },
  route: { source: "map-tools-native-route", line: "map-tools-native-route-line", point: "map-tools-native-route-end" },
  zones: { source: "map-tools-native-zones", fill: "map-tools-native-zones-fill", line: "map-tools-native-zones-line" },
  density: { source: "map-tools-native-density", heatmap: "map-tools-native-density-heatmap" },
  planner: { source: "map-tools-native-planner", line: "map-tools-native-planner-line", point: "map-tools-native-planner-points", label: "map-tools-native-planner-labels" },
} as const;

const empty = (): GeoJSON.FeatureCollection => ({ type: "FeatureCollection", features: [] });
const collections: Record<Channel, GeoJSON.FeatureCollection> = {
  origin: empty(),
  route: empty(),
  zones: empty(),
  density: empty(),
  planner: empty(),
};

function validPoint(point: NativeMapToolsPoint | null | undefined): point is NativeMapToolsPoint {
  return Boolean(point)
    && Number.isFinite(point!.lat)
    && Number.isFinite(point!.lng)
    && point!.lat >= -90 && point!.lat <= 90
    && point!.lng >= -180 && point!.lng <= 180;
}

function sourceData(map: mapboxgl.Map, sourceId: string, collection: GeoJSON.FeatureCollection): void {
  const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
  if (source) source.setData(collection);
  else map.addSource(sourceId, { type: "geojson", data: collection, generateId: true });
}

function ensureLayers(map: mapboxgl.Map): void {
  if (!map.isStyleLoaded()) return;
  sourceData(map, IDS.origin.source, collections.origin);
  sourceData(map, IDS.route.source, collections.route);
  sourceData(map, IDS.zones.source, collections.zones);
  sourceData(map, IDS.density.source, collections.density);
  sourceData(map, IDS.planner.source, collections.planner);

  if (!map.getLayer(IDS.zones.fill)) {
    map.addLayer({
      id: IDS.zones.fill,
      type: "fill",
      source: IDS.zones.source,
      paint: {
        "fill-color": ["coalesce", ["get", "color"], "#14b8a6"],
        "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.10],
      },
    });
  }
  if (!map.getLayer(IDS.zones.line)) {
    map.addLayer({
      id: IDS.zones.line,
      type: "line",
      source: IDS.zones.source,
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#0f766e"],
        "line-width": 1.4,
        "line-opacity": 0.5,
      },
    });
  }
  if (!map.getLayer(IDS.density.heatmap)) {
    map.addLayer({
      id: IDS.density.heatmap,
      type: "heatmap",
      source: IDS.density.source,
      maxzoom: 16,
      paint: {
        "heatmap-weight": 1,
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 1, 0.45, 8, 0.8, 14, 1.1],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 1, 10, 7, 22, 13, 42, 16, 56],
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.10, 8, 0.20, 14, 0.15, 16, 0],
        "heatmap-color": [
          "interpolate", ["linear"], ["heatmap-density"],
          0, "rgba(14,165,233,0)",
          0.25, "rgba(14,165,233,0.12)",
          0.55, "rgba(14,165,233,0.26)",
          0.8, "rgba(34,211,238,0.38)",
          1, "rgba(103,232,249,0.52)",
        ],
      },
    });
  }
  if (!map.getLayer(IDS.route.line)) {
    map.addLayer({
      id: IDS.route.line,
      type: "line",
      source: IDS.route.source,
      filter: ["==", ["get", "role"], "route"],
      paint: { "line-color": "#2563eb", "line-width": 5, "line-opacity": 0.9 },
    });
  }
  if (!map.getLayer(IDS.planner.line)) {
    map.addLayer({
      id: IDS.planner.line,
      type: "line",
      source: IDS.planner.source,
      filter: ["==", ["get", "role"], "route"],
      paint: { "line-color": "#2563eb", "line-width": 6, "line-opacity": 0.92 },
    });
  }
  if (!map.getLayer(IDS.origin.point)) {
    map.addLayer({
      id: IDS.origin.point,
      type: "circle",
      source: IDS.origin.source,
      paint: {
        "circle-radius": 8,
        "circle-color": "#22d3ee",
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff",
        "circle-blur": 0.08,
      },
    });
  }
  if (!map.getLayer(IDS.route.point)) {
    map.addLayer({
      id: IDS.route.point,
      type: "circle",
      source: IDS.route.source,
      filter: ["==", ["get", "role"], "destination"],
      paint: {
        "circle-radius": 6,
        "circle-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#1e3a8a",
      },
    });
  }
  if (!map.getLayer(IDS.planner.point)) {
    map.addLayer({
      id: IDS.planner.point,
      type: "circle",
      source: IDS.planner.source,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-radius": 9,
        "circle-color": ["case", ["==", ["get", "kind"], "from"], "#16a34a", "#dc2626"],
        "circle-stroke-width": 2.5,
        "circle-stroke-color": "#ffffff",
      },
    });
  }
  if (!map.getLayer(IDS.planner.label)) {
    map.addLayer({
      id: IDS.planner.label,
      type: "symbol",
      source: IDS.planner.source,
      filter: ["==", ["geometry-type"], "Point"],
      layout: {
        "text-field": ["get", "markerLabel"],
        "text-size": 10,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: { "text-color": "#ffffff" },
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
      console.warn(`Map Tools native ${channel} update failed`, error);
    }
  }
}

function setCollection(channel: Channel, features: GeoJSON.Feature[]): void {
  collections[channel] = { type: "FeatureCollection", features };
  update(channel);
}

function pointFeature(point: NativeMapToolsPoint, properties: Record<string, unknown> = {}): GeoJSON.Feature<GeoJSON.Point> {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [point.lng, point.lat] },
    properties,
  };
}

function routeLine(coordinates: Array<[number, number]>): GeoJSON.Feature<GeoJSON.LineString> | null {
  const normalized = coordinates
    .map(([lat, lng]) => [Number(lng), Number(lat)] as [number, number])
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
  if (normalized.length < 2) return null;
  return { type: "Feature", geometry: { type: "LineString", coordinates: normalized }, properties: { role: "route" } };
}

export function setMapToolsOrigin(point: NativeMapToolsPoint | null): void {
  setCollection("origin", validPoint(point) ? [pointFeature(point, { label: point.label || "Selected origin" })] : []);
}

export function setMapToolsRoute(coordinates: Array<[number, number]>, destination?: NativeMapToolsPoint | null): void {
  const features: GeoJSON.Feature[] = [];
  const line = routeLine(coordinates);
  if (line) features.push(line);
  if (validPoint(destination)) features.push(pointFeature(destination, { role: "destination" }));
  setCollection("route", features);
}

export function clearMapToolsRoute(): void {
  setCollection("route", []);
}

export function setMapToolsZones(data: GeoJSON.FeatureCollection | null): void {
  if (!data || !Array.isArray(data.features)) return setCollection("zones", []);
  const contours = [15, 30, 45, 60];
  const features = data.features.map((feature) => {
    const contour = Number((feature.properties as any)?.contour || 15);
    const rank = Math.max(0, contours.indexOf(contour));
    return {
      ...feature,
      properties: {
        ...(feature.properties || {}),
        color: "#14b8a6",
        fillOpacity: Math.max(0.05, 0.19 - rank * 0.04),
      },
    } as GeoJSON.Feature;
  });
  setCollection("zones", features);
}

export function clearMapToolsZones(): void {
  setCollection("zones", []);
}

export function setMapToolsDensity(points: NativeMapToolsPoint[]): void {
  setCollection("density", points.filter(validPoint).slice(0, 1000).map((point) => pointFeature(point)));
}

export function clearMapToolsDensity(): void {
  setCollection("density", []);
}

export function setRoutePlannerOverlay(
  from: NativeMapToolsPoint | null,
  to: NativeMapToolsPoint | null,
  coordinates: Array<[number, number]> = [],
): void {
  const features: GeoJSON.Feature[] = [];
  const line = routeLine(coordinates);
  if (line) features.push(line);
  if (validPoint(from)) features.push(pointFeature(from, { role: "endpoint", kind: "from", markerLabel: "A" }));
  if (validPoint(to)) features.push(pointFeature(to, { role: "endpoint", kind: "to", markerLabel: "B" }));
  setCollection("planner", features);
}

export function clearRoutePlannerOverlay(): void {
  setCollection("planner", []);
}

export function fitActiveMapToRoute(coordinates: Array<[number, number]>, padding = 38): void {
  const map = getActiveMapboxMap();
  if (!map) return;
  const bounds = new mapboxgl.LngLatBounds();
  coordinates.forEach(([lat, lng]) => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) bounds.extend([lng, lat]);
  });
  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding, duration: 700 });
}

function visitCoordinates(value: unknown, bounds: mapboxgl.LngLatBounds): void {
  if (!Array.isArray(value)) return;
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
    const lng = Number(value[0]);
    const lat = Number(value[1]);
    if (Number.isFinite(lng) && Number.isFinite(lat)) bounds.extend([lng, lat]);
    return;
  }
  value.forEach((child) => visitCoordinates(child, bounds));
}

export function fitActiveMapToGeoJSON(data: GeoJSON.FeatureCollection | null, padding = 30): void {
  const map = getActiveMapboxMap();
  if (!map || !data) return;
  const bounds = new mapboxgl.LngLatBounds();
  data.features.forEach((feature) => visitCoordinates((feature.geometry as any)?.coordinates, bounds));
  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding, duration: 700 });
}

registerMapboxMapInitializer({
  id: "map-tools-native-overlays",
  priority: 14,
  initialize: (map) => {
    const apply = () => ensureLayers(map);
    map.on("style.load", apply);
    if (map.isStyleLoaded()) queueMicrotask(apply);
    return () => map.off("style.load", apply);
  },
});

import mapboxgl from "mapbox-gl";
import { getTrackedMapboxMaps, registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";

export type NativeSavedRadius = {
  id: number | string;
  lat: number;
  lng: number;
  radiusMiles: number;
  color: string;
  label?: string;
};

export type NativeLiveMarker = {
  id: number | string;
  lat: number;
  lng: number;
  color: string;
  popupHtml: string;
  tooltip?: string;
  glow?: boolean;
};

type Channel = "fixed" | "drop" | "saved" | "liveCenter" | "liveResults";

const IDS = {
  fixed: {
    source: "network-native-fixed-radius",
    fill: "network-native-fixed-radius-fill",
    line: "network-native-fixed-radius-line",
    label: "network-native-fixed-radius-label",
  },
  drop: {
    source: "network-native-drop-radius",
    fill: "network-native-drop-radius-fill",
    line: "network-native-drop-radius-line",
    point: "network-native-drop-radius-point",
  },
  saved: {
    source: "network-native-saved-radii",
    fill: "network-native-saved-radii-fill",
    line: "network-native-saved-radii-line",
    point: "network-native-saved-radii-point",
    label: "network-native-saved-radii-label",
  },
  liveCenter: {
    source: "network-native-live-center",
    fill: "network-native-live-center-fill",
    line: "network-native-live-center-line",
    point: "network-native-live-center-point",
  },
  liveResults: {
    source: "network-native-live-results",
    point: "network-native-live-results-point",
  },
} as const;

const EARTH_RADIUS_METERS = 6_371_008.8;
const empty = (): GeoJSON.FeatureCollection => ({ type: "FeatureCollection", features: [] });
const collections: Record<Channel, GeoJSON.FeatureCollection> = {
  fixed: empty(),
  drop: empty(),
  saved: empty(),
  liveCenter: empty(),
  liveResults: empty(),
};

let liveSelect: ((id: string) => void) | null = null;
let hoverPopupByMap = new WeakMap<mapboxgl.Map, mapboxgl.Popup>();

function validCoordinate(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function circlePolygon(lat: number, lng: number, radiusMeters: number, steps = 96): GeoJSON.Polygon {
  const angularDistance = Math.max(1, radiusMeters) / EARTH_RADIUS_METERS;
  const lat1 = lat * Math.PI / 180;
  const lng1 = lng * Math.PI / 180;
  const ring: [number, number][] = [];

  for (let index = 0; index <= steps; index += 1) {
    const bearing = (index / steps) * Math.PI * 2;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularDistance)
      + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const lng2 = lng1 + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );
    let normalizedLng = lng2 * 180 / Math.PI;
    while (normalizedLng > 180) normalizedLng -= 360;
    while (normalizedLng < -180) normalizedLng += 360;
    ring.push([normalizedLng, lat2 * 180 / Math.PI]);
  }

  return { type: "Polygon", coordinates: [ring] };
}

function areaFeature(
  lat: number,
  lng: number,
  radiusMiles: number,
  color: string,
  options: { fillOpacity: number; lineOpacity: number; lineWidth: number; popupHtml?: string; id?: string },
): GeoJSON.Feature<GeoJSON.Polygon> {
  return {
    type: "Feature",
    id: options.id,
    geometry: circlePolygon(lat, lng, Math.max(radiusMiles, 0.1) * 1609.34),
    properties: {
      role: "area",
      color,
      fillOpacity: options.fillOpacity,
      lineOpacity: options.lineOpacity,
      lineWidth: options.lineWidth,
      popupHtml: options.popupHtml || "",
    },
  };
}

function pointFeature(
  lat: number,
  lng: number,
  properties: Record<string, string | number | boolean>,
  id?: string,
): GeoJSON.Feature<GeoJSON.Point> {
  return {
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties,
  };
}

function sourceData(map: mapboxgl.Map, id: string, collection: GeoJSON.FeatureCollection): void {
  const source = map.getSource(id) as mapboxgl.GeoJSONSource | undefined;
  if (source) {
    source.setData(collection);
    return;
  }
  map.addSource(id, { type: "geojson", data: collection, generateId: true });
}

function addAreaLayers(
  map: mapboxgl.Map,
  ids: { source: string; fill: string; line: string },
  dashed = true,
): void {
  if (!map.getLayer(ids.fill)) {
    map.addLayer({
      id: ids.fill,
      type: "fill",
      source: ids.source,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": ["coalesce", ["get", "color"], "#00d4ff"],
        "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.07],
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
        "line-color": ["coalesce", ["get", "color"], "#00d4ff"],
        "line-opacity": ["coalesce", ["get", "lineOpacity"], 0.92],
        "line-width": ["coalesce", ["get", "lineWidth"], 2],
        ...(dashed ? { "line-dasharray": [3, 2] as [number, number] } : {}),
      },
    });
  }
}

function addCenterPointLayer(map: mapboxgl.Map, id: string, source: string, radius = 6): void {
  if (map.getLayer(id)) return;
  map.addLayer({
    id,
    type: "circle",
    source,
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-radius": ["coalesce", ["get", "radius"], radius],
      "circle-color": ["coalesce", ["get", "color"], "#22d3ee"],
      "circle-opacity": ["coalesce", ["get", "opacity"], 1],
      "circle-stroke-width": ["coalesce", ["get", "strokeWidth"], 2.5],
      "circle-stroke-color": ["coalesce", ["get", "strokeColor"], "#ffffff"],
      "circle-stroke-opacity": 1,
      "circle-blur": ["case", ["boolean", ["get", "glow"], false], 0.1, 0],
    },
  });
}

function addLabelLayer(map: mapboxgl.Map, id: string, source: string): void {
  if (map.getLayer(id)) return;
  map.addLayer({
    id,
    type: "symbol",
    source,
    filter: ["all", ["==", ["geometry-type"], "Point"], ["has", "label"]],
    layout: {
      "text-field": ["get", "label"],
      "text-size": ["coalesce", ["get", "textSize"], 11],
      "text-offset": [0, -1.7],
      "text-anchor": "bottom",
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": ["coalesce", ["get", "color"], "#00d4ff"],
      "text-halo-color": "rgba(4,10,24,0.92)",
      "text-halo-width": 2,
      "text-halo-blur": 0.6,
    },
  });
}

function ensureLayers(map: mapboxgl.Map): void {
  if (!map.getStyle()) return;

  sourceData(map, IDS.fixed.source, collections.fixed);
  sourceData(map, IDS.drop.source, collections.drop);
  sourceData(map, IDS.saved.source, collections.saved);
  sourceData(map, IDS.liveCenter.source, collections.liveCenter);
  sourceData(map, IDS.liveResults.source, collections.liveResults);

  addAreaLayers(map, IDS.fixed);
  addLabelLayer(map, IDS.fixed.label, IDS.fixed.source);

  addAreaLayers(map, IDS.drop, false);
  addCenterPointLayer(map, IDS.drop.point, IDS.drop.source, 7);

  addAreaLayers(map, IDS.saved);
  addCenterPointLayer(map, IDS.saved.point, IDS.saved.source, 6);
  addLabelLayer(map, IDS.saved.label, IDS.saved.source);

  addAreaLayers(map, IDS.liveCenter);
  addCenterPointLayer(map, IDS.liveCenter.point, IDS.liveCenter.source, 7);

  addCenterPointLayer(map, IDS.liveResults.point, IDS.liveResults.source, 4);
}

function updateMaps(channel?: Channel): void {
  for (const map of getTrackedMapboxMaps()) {
    if (!map.getStyle()) continue;
    try {
      ensureLayers(map);
      if (!channel) continue;
      const id = IDS[channel].source;
      (map.getSource(id) as mapboxgl.GeoJSONSource | undefined)?.setData(collections[channel]);
    } catch (error) {
      console.warn("Native radius/live source update failed", error);
    }
  }
}

function activeMap(): mapboxgl.Map | null {
  const mode = window.__NETWORK_MAP_GLOBE__?.getMode?.();
  const maps = getTrackedMapboxMaps();
  return maps.find((map) => mode === "3d"
    ? Boolean(map.getContainer().closest(".mapbox-globe-host"))
    : Boolean(map.getContainer().closest(".mapbox-2d-host"))) || maps[0] || null;
}

function setCollection(channel: Channel, features: GeoJSON.Feature[]): void {
  collections[channel] = { type: "FeatureCollection", features };
  updateMaps(channel);
}

export function clearFixedRadiusNative(): void {
  setCollection("fixed", []);
}

export function renderFixedRadiusNative(lat: number, lng: number, radiusMiles = 70, label = "70mi radius"): void {
  if (!validCoordinate(lat, lng)) return clearFixedRadiusNative();
  setCollection("fixed", [
    areaFeature(lat, lng, radiusMiles, "#00d4ff", { fillOpacity: 0.07, lineOpacity: 1, lineWidth: 3, id: "fixed-area" }),
    pointFeature(lat, lng, { role: "label", label, color: "#00d4ff", textSize: 10 }, "fixed-label"),
  ]);
}

export function clearDropRadiusNative(): void {
  setCollection("drop", []);
}

export function renderDropRadiusNative(lat: number, lng: number, radiusMiles: number): void {
  if (!validCoordinate(lat, lng)) return clearDropRadiusNative();
  setCollection("drop", [
    areaFeature(lat, lng, radiusMiles, "#ef4444", { fillOpacity: 0.1, lineOpacity: 0.95, lineWidth: 2, id: "drop-area" }),
    pointFeature(lat, lng, {
      role: "center",
      color: "#ef4444",
      radius: 7,
      strokeWidth: 2,
      strokeColor: "#ffffff",
      opacity: 1,
      glow: true,
    }, "drop-center"),
  ]);
}

export function renderSavedRadiiNative(radii: NativeSavedRadius[], glow: boolean): void {
  const features: GeoJSON.Feature[] = [];
  radii.slice(0, 24).forEach((radius, index) => {
    if (!validCoordinate(radius.lat, radius.lng)) return;
    const id = String(radius.id ?? index);
    const label = radius.label || `Marker ${index + 1}`;
    const popupHtml = `<div class="pi"><div class="pt">${label}</div><div class="ps">${radius.radiusMiles} mi radius</div><div class="pg"><div><div class="psl">Lat</div><div class="psv">${radius.lat.toFixed(4)}</div></div><div><div class="psl">Lng</div><div class="psv">${radius.lng.toFixed(4)}</div></div></div></div>`;
    features.push(areaFeature(radius.lat, radius.lng, radius.radiusMiles, radius.color, {
      fillOpacity: 0.07,
      lineOpacity: 0.92,
      lineWidth: 2.5,
      id: `saved-area-${id}`,
    }));
    features.push(pointFeature(radius.lat, radius.lng, {
      role: "center",
      color: radius.color,
      radius: 6,
      strokeWidth: 2,
      strokeColor: "#ffffff",
      opacity: 1,
      glow,
      label,
      textSize: 9,
      popupHtml,
      radiusId: id,
    }, `saved-center-${id}`));
  });
  setCollection("saved", features);
}

export function clearLiveCenterNative(): void {
  setCollection("liveCenter", []);
}

export function renderLiveCenterNative(lat: number, lng: number, radiusMiles: number): void {
  if (!validCoordinate(lat, lng)) return clearLiveCenterNative();
  setCollection("liveCenter", [
    areaFeature(lat, lng, radiusMiles, "#22d3ee", { fillOpacity: 0.03, lineOpacity: 0.45, lineWidth: 1.5, id: "live-area" }),
    pointFeature(lat, lng, {
      role: "center",
      color: "#06b6d4",
      radius: 7,
      strokeWidth: 2.5,
      strokeColor: "#ffffff",
      opacity: 1,
      glow: true,
    }, "live-center"),
  ]);
}

export function clearLiveResultsNative(): void {
  liveSelect = null;
  setCollection("liveResults", []);
}

export function renderLiveResultsNative(markers: NativeLiveMarker[], onSelect?: (id: string) => void): number {
  liveSelect = onSelect || null;
  const features = markers.slice(0, 750).flatMap((marker) => {
    if (!validCoordinate(marker.lat, marker.lng)) return [];
    return [pointFeature(marker.lat, marker.lng, {
      role: "live-result",
      providerId: String(marker.id),
      color: marker.color,
      radius: 4,
      strokeWidth: 1,
      strokeColor: "#ffffff",
      opacity: 0.98,
      glow: Boolean(marker.glow),
      popupHtml: marker.popupHtml,
      tooltip: marker.tooltip || "",
    }, `live-result-${String(marker.id)}`)];
  });
  setCollection("liveResults", features);
  return features.length;
}

function popupForFeature(map: mapboxgl.Map, feature: mapboxgl.MapboxGeoJSONFeature | GeoJSON.Feature): mapboxgl.Popup | null {
  const geometry = feature.geometry;
  if (geometry.type !== "Point") return null;
  const properties = (feature.properties || {}) as Record<string, unknown>;
  const html = String(properties.popupHtml || "").trim();
  if (!html) return null;
  const coordinates = geometry.coordinates as [number, number];
  return new mapboxgl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "320px", className: "live-marker-popup" })
    .setLngLat(coordinates)
    .setHTML(html)
    .addTo(map);
}

function liveHit(map: mapboxgl.Map, point: mapboxgl.Point): mapboxgl.MapboxGeoJSONFeature | null {
  if (!map.getLayer(IDS.liveResults.point)) return null;
  const box: [[number, number], [number, number]] = [[point.x - 10, point.y - 10], [point.x + 10, point.y + 10]];
  try {
    return map.queryRenderedFeatures(box, { layers: [IDS.liveResults.point] })
      .sort((left, right) => {
        const lp = left.geometry.type === "Point" ? map.project(left.geometry.coordinates as [number, number]) : point;
        const rp = right.geometry.type === "Point" ? map.project(right.geometry.coordinates as [number, number]) : point;
        return Math.hypot(lp.x - point.x, lp.y - point.y) - Math.hypot(rp.x - point.x, rp.y - point.y);
      })[0] || null;
  } catch {
    return null;
  }
}

function savedHit(map: mapboxgl.Map, point: mapboxgl.Point): mapboxgl.MapboxGeoJSONFeature | null {
  if (!map.getLayer(IDS.saved.point)) return null;
  const box: [[number, number], [number, number]] = [[point.x - 8, point.y - 8], [point.x + 8, point.y + 8]];
  try {
    return map.queryRenderedFeatures(box, { layers: [IDS.saved.point] })
      .find((feature) => String(feature.properties?.popupHtml || "").trim()) || null;
  } catch {
    return null;
  }
}

export function focusLiveResultNative(lat: number, lng: number, id: number | string): void {
  const map = activeMap();
  if (!map || !validCoordinate(lat, lng)) return;
  map.flyTo({ center: [lng, lat], zoom: 17, duration: 800, essential: true });
  liveSelect?.(String(id));
  const feature = collections.liveResults.features.find((row) => String(row.properties?.providerId || "") === String(id));
  if (!feature) return;
  window.setTimeout(() => {
    const current = activeMap();
    if (!current) return;
    popupForFeature(current, feature);
  }, 850);
}

registerMapboxMapInitializer({
  id: "native-radius-live-overlays",
  priority: 13,
  initialize: (map) => {
    const apply = () => ensureLayers(map);
    const click = (event: mapboxgl.MapMouseEvent) => {
      const live = liveHit(map, event.point);
      if (live) {
        if (event.originalEvent && typeof event.originalEvent === "object") {
          (event.originalEvent as Record<string, unknown>).__networkMapCompatHandled = true;
        }
        const id = String(live.properties?.providerId || "");
        liveSelect?.(id);
        popupForFeature(map, live);
        return;
      }
      const saved = savedHit(map, event.point);
      if (saved) popupForFeature(map, saved);
    };
    const mouseMove = (event: mapboxgl.MapMouseEvent) => {
      const hit = liveHit(map, event.point);
      map.getCanvas().style.cursor = hit ? "pointer" : "";
      const tooltip = String(hit?.properties?.tooltip || "").trim();
      const existing = hoverPopupByMap.get(map);
      if (!tooltip || !hit || hit.geometry.type !== "Point") {
        existing?.remove();
        hoverPopupByMap.delete(map);
        return;
      }
      const coordinates = hit.geometry.coordinates as [number, number];
      const popup = existing || new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 10, maxWidth: "220px" });
      popup.setLngLat(coordinates).setText(tooltip).addTo(map);
      hoverPopupByMap.set(map, popup);
    };
    const mouseLeave = () => {
      map.getCanvas().style.cursor = "";
      hoverPopupByMap.get(map)?.remove();
      hoverPopupByMap.delete(map);
    };

    map.on("style.load", apply);
    map.on("click", click);
    map.on("mousemove", mouseMove);
    map.on("mouseout", mouseLeave);
    if (map.isStyleLoaded()) queueMicrotask(apply);

    return () => {
      map.off("style.load", apply);
      map.off("click", click);
      map.off("mousemove", mouseMove);
      map.off("mouseout", mouseLeave);
      hoverPopupByMap.get(map)?.remove();
      hoverPopupByMap.delete(map);
    };
  },
});

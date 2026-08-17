import mapboxgl from "mapbox-gl";
import { getTrackedMapboxMaps, registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";

type Channel = "states" | "population" | "cities" | "timezones" | "saved" | "address";
export type SavedRadiusOverlay = { id: number; lat: number; lng: number; radiusMiles: number; color: string; label: string };
export type AddressPinOverlay = { lat: number; lng: number; color: string; popupHtml: string; tooltipHtml?: string };

const CHANNELS: Channel[] = ["states", "population", "cities", "timezones", "saved", "address"];
const collections: Record<Channel, GeoJSON.FeatureCollection> = {
  states: { type: "FeatureCollection", features: [] },
  population: { type: "FeatureCollection", features: [] },
  cities: { type: "FeatureCollection", features: [] },
  timezones: { type: "FeatureCollection", features: [] },
  saved: { type: "FeatureCollection", features: [] },
  address: { type: "FeatureCollection", features: [] },
};

const ids = (channel: Channel) => ({
  source: `us-diagnostics-native-${channel}`,
  fill: `us-diagnostics-native-${channel}-fill`,
  line: `us-diagnostics-native-${channel}-line`,
  point: `us-diagnostics-native-${channel}-point`,
  label: `us-diagnostics-native-${channel}-label`,
});

function sourceData(map: mapboxgl.Map, channel: Channel): void {
  const id = ids(channel).source;
  const source = map.getSource(id) as mapboxgl.GeoJSONSource | undefined;
  if (source) source.setData(collections[channel]);
  else map.addSource(id, { type: "geojson", data: collections[channel], generateId: true });
}

function ensureChannel(map: mapboxgl.Map, channel: Channel): void {
  if (!map.isStyleLoaded()) return;
  const channelIds = ids(channel);
  sourceData(map, channel);

  if (!map.getLayer(channelIds.fill)) {
    map.addLayer({
      id: channelIds.fill,
      type: "fill",
      source: channelIds.source,
      filter: ["all", ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]], ["!=", ["get", "hidden"], true]],
      paint: {
        "fill-color": ["coalesce", ["get", "fillColor"], "#0a1830"],
        "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.2],
      },
    });
  }
  if (!map.getLayer(channelIds.line)) {
    map.addLayer({
      id: channelIds.line,
      type: "line",
      source: channelIds.source,
      filter: ["all", ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]], ["!=", ["get", "hidden"], true]],
      paint: {
        "line-color": ["coalesce", ["get", "lineColor"], "#60a5fa"],
        "line-opacity": ["coalesce", ["get", "lineOpacity"], 0.55],
        "line-width": ["coalesce", ["get", "lineWidth"], 1],
      },
    });
  }
  if (!map.getLayer(channelIds.point)) {
    map.addLayer({
      id: channelIds.point,
      type: "circle",
      source: channelIds.source,
      filter: ["all", ["==", ["geometry-type"], "Point"], ["!=", ["get", "kind"], "label"], ["!=", ["get", "hidden"], true]],
      paint: {
        "circle-radius": ["coalesce", ["get", "radius"], 5],
        "circle-color": ["coalesce", ["get", "color"], "#22d3ee"],
        "circle-opacity": ["coalesce", ["get", "opacity"], 0.94],
        "circle-stroke-width": ["coalesce", ["get", "strokeWidth"], 1.5],
        "circle-stroke-color": ["coalesce", ["get", "strokeColor"], "#ffffff"],
        "circle-blur": ["coalesce", ["get", "blur"], 0],
      },
    });
  }
  if (!map.getLayer(channelIds.label)) {
    map.addLayer({
      id: channelIds.label,
      type: "symbol",
      source: channelIds.source,
      filter: ["all", ["==", ["geometry-type"], "Point"], ["==", ["get", "kind"], "label"], ["!=", ["get", "hidden"], true]],
      layout: {
        "text-field": ["coalesce", ["get", "label"], ""],
        "text-size": ["coalesce", ["get", "labelSize"], 10],
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": ["coalesce", ["get", "labelColor"], "#8aa4c4"],
        "text-halo-color": "rgba(0,0,0,0.82)",
        "text-halo-width": 1.5,
        "text-halo-blur": 0.6,
      },
    });
  }
}

function update(channel: Channel): void {
  for (const map of getTrackedMapboxMaps()) {
    if (!map.isStyleLoaded()) continue;
    try {
      ensureChannel(map, channel);
      (map.getSource(ids(channel).source) as mapboxgl.GeoJSONSource | undefined)?.setData(collections[channel]);
    } catch (error) {
      console.warn(`Native U.S. diagnostics ${channel} update failed`, error);
    }
  }
}

export function setNativeDiagnosticCollection(channel: Exclude<Channel, "saved" | "address">, collection: GeoJSON.FeatureCollection): void {
  collections[channel] = collection;
  update(channel);
}

export function clearNativeDiagnosticChannel(channel: Channel): void {
  collections[channel] = { type: "FeatureCollection", features: [] };
  update(channel);
}

function geodesicCircle(lat: number, lng: number, radiusMeters: number): GeoJSON.Polygon {
  const earthRadius = 6_378_137;
  const angular = Math.max(1, radiusMeters) / earthRadius;
  const phi1 = lat * Math.PI / 180;
  const lambda1 = lng * Math.PI / 180;
  const ring: number[][] = [];
  for (let index = 0; index <= 96; index += 1) {
    const bearing = index / 96 * Math.PI * 2;
    const phi2 = Math.asin(Math.sin(phi1) * Math.cos(angular) + Math.cos(phi1) * Math.sin(angular) * Math.cos(bearing));
    const lambda2 = lambda1 + Math.atan2(Math.sin(bearing) * Math.sin(angular) * Math.cos(phi1), Math.cos(angular) - Math.sin(phi1) * Math.sin(phi2));
    ring.push([lambda2 * 180 / Math.PI, phi2 * 180 / Math.PI]);
  }
  return { type: "Polygon", coordinates: [ring] };
}

export function renderSavedRadiusOverlays(rows: SavedRadiusOverlay[], glow: boolean): void {
  const features: GeoJSON.Feature[] = [];
  rows.forEach((row, index) => {
    features.push({
      type: "Feature",
      geometry: geodesicCircle(row.lat, row.lng, Math.max(row.radiusMiles, 0.1) * 1609.34),
      properties: {
        fillColor: row.color,
        fillOpacity: 0.07,
        lineColor: row.color,
        lineOpacity: 0.92,
        lineWidth: 2.5,
      },
    });
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [row.lng, row.lat] },
      properties: {
        color: row.color,
        radius: 6,
        strokeWidth: 2,
        strokeColor: "#ffffff",
        blur: glow ? 0.18 : 0,
        popupHtml: `<div class="pi"><div class="pt">${row.label || "Marker"}</div><div class="ps">${row.radiusMiles} mi radius</div><div class="pg"><div><div class="psl">Lat</div><div class="psv">${row.lat.toFixed(4)}</div></div><div><div class="psl">Lng</div><div class="psv">${row.lng.toFixed(4)}</div></div></div></div>`,
      },
    });
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [row.lng, row.lat] },
      properties: {
        kind: "label",
        label: row.label || `Marker ${index + 1}`,
        labelColor: row.color,
        labelSize: 9,
      },
    });
  });
  collections.saved = { type: "FeatureCollection", features };
  update("saved");
}

export function setNativeAddressPin(pin: AddressPinOverlay | null): void {
  collections.address = pin ? {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: { type: "Point", coordinates: [pin.lng, pin.lat] },
      properties: {
        color: pin.color,
        radius: 7,
        strokeWidth: 2.5,
        strokeColor: "#ffffff",
        blur: 0.2,
        popupHtml: pin.popupHtml,
        tooltipHtml: pin.tooltipHtml || "",
      },
    }],
  } : { type: "FeatureCollection", features: [] };
  update("address");
}

export function activeNativeMap(): mapboxgl.Map | null {
  const mode = window.__NETWORK_MAP_GLOBE__?.getMode?.();
  const maps = getTrackedMapboxMaps();
  return maps.find((map) => mode === "3d"
    ? Boolean(map.getContainer().closest(".mapbox-globe-host"))
    : Boolean(map.getContainer().closest(".mapbox-2d-host"))) || maps[0] || null;
}

export function flyNativeMap(lat: number, lng: number, zoom: number, durationMs = 800): void {
  activeNativeMap()?.flyTo({ center: [lng, lat], zoom, duration: durationMs });
}

export function openNativeMapPopup(lat: number, lng: number, html: string, maxWidth = "340px"): void {
  const map = activeNativeMap();
  if (!map) return;
  new mapboxgl.Popup({ closeButton: true, maxWidth }).setLngLat([lng, lat]).setHTML(html).addTo(map);
}

function interactiveLayers(map: mapboxgl.Map): string[] {
  return CHANNELS.flatMap((channel) => {
    const channelIds = ids(channel);
    return [channelIds.fill, channelIds.point].filter((id) => Boolean(map.getLayer(id)));
  });
}

function nearestFeature(map: mapboxgl.Map, point: mapboxgl.Point): mapboxgl.MapboxGeoJSONFeature | null {
  const layers = interactiveLayers(map);
  if (!layers.length) return null;
  const box: [[number, number], [number, number]] = [[point.x - 8, point.y - 8], [point.x + 8, point.y + 8]];
  try {
    return map.queryRenderedFeatures(box, { layers })
      .find((feature) => String(feature.properties?.popupHtml || feature.properties?.tooltipHtml || "").trim()) || null;
  } catch {
    return null;
  }
}

registerMapboxMapInitializer({
  id: "us-diagnostics-native-map",
  priority: 14,
  initialize: (map) => {
    let hoverPopup: mapboxgl.Popup | null = null;
    const apply = () => CHANNELS.forEach((channel) => ensureChannel(map, channel));
    const click = (event: mapboxgl.MapMouseEvent) => {
      const feature = nearestFeature(map, event.point);
      const html = String(feature?.properties?.popupHtml || "");
      if (!feature || !html) return;
      if (event.originalEvent && typeof event.originalEvent === "object") {
        (event.originalEvent as unknown as Record<string, unknown>).__networkMapCompatHandled = true;
      }
      new mapboxgl.Popup({ closeButton: true, maxWidth: "340px" }).setLngLat(event.lngLat).setHTML(html).addTo(map);
    };
    const move = (event: mapboxgl.MapMouseEvent) => {
      const feature = nearestFeature(map, event.point);
      const html = String(feature?.properties?.tooltipHtml || "");
      map.getCanvas().style.cursor = feature ? "pointer" : "";
      if (!html) {
        hoverPopup?.remove();
        hoverPopup = null;
        return;
      }
      if (!hoverPopup) hoverPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, maxWidth: "300px", offset: 12 });
      hoverPopup.setLngLat(event.lngLat).setHTML(html).addTo(map);
    };
    const leave = () => {
      map.getCanvas().style.cursor = "";
      hoverPopup?.remove();
      hoverPopup = null;
    };
    map.on("style.load", apply);
    map.on("click", click);
    map.on("mousemove", move);
    map.getCanvas().addEventListener("mouseleave", leave);
    if (map.isStyleLoaded()) queueMicrotask(apply);
    return () => {
      map.off("style.load", apply);
      map.off("click", click);
      map.off("mousemove", move);
      map.getCanvas().removeEventListener("mouseleave", leave);
      hoverPopup?.remove();
    };
  },
});

import mapboxgl from "mapbox-gl";
import type { ProviderFeature } from "./DatasetBrowser";
import { getTrackedMapboxMaps, registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";

export type ProviderExplorerDensityCell = { lat: number; lng: number; count: number };

type ProviderRenderOptions = {
  fit?: boolean;
  popupHtml: (provider: ProviderFeature) => string;
  color: (provider: ProviderFeature) => string;
  onAction?: (provider: ProviderFeature) => void;
};

type Channel = "pins" | "aggregate" | "dots" | "live" | "gaps";

type ProviderExplorerHit = {
  coordinates: [number, number];
  popupHtml: string;
  channel: string;
  providerId: string;
  distance: number;
};

type ProviderExplorerSnapshotFeature = {
  geometryType: string;
  coordinates: [number, number] | null;
  popupHtml: string;
  providerId: string;
};

type ProviderExplorerSnapshot = {
  channel: Channel;
  featureCount: number;
  geometryTypes: string[];
  features: ProviderExplorerSnapshotFeature[];
};

type ProviderExplorerDiagnosticsGlobal = typeof globalThis & {
  __NETWORK_MAP_PROVIDER_EXPLORER_NATIVE__?: {
    getSnapshot: (channel: Channel) => ProviderExplorerSnapshot;
  };
};

const IDS = {
  pins: { source: "provider-explorer-native-pins", layer: "provider-explorer-native-pins" },
  aggregate: {
    source: "provider-explorer-native-aggregate",
    circle: "provider-explorer-native-density",
    fill: "provider-explorer-native-hex-fill",
    line: "provider-explorer-native-hex-line",
  },
  dots: { source: "provider-explorer-native-dot-density", layer: "provider-explorer-native-dot-density" },
  live: { source: "provider-explorer-native-live", layer: "provider-explorer-native-live" },
  gaps: { source: "provider-explorer-native-gaps", layer: "provider-explorer-native-gaps" },
} as const;

const empty = (): GeoJSON.FeatureCollection => ({ type: "FeatureCollection", features: [] });
const collections: Record<Channel, GeoJSON.FeatureCollection> = {
  pins: empty(),
  aggregate: empty(),
  dots: empty(),
  live: empty(),
  gaps: empty(),
};

function getProviderExplorerSnapshot(channel: Channel): ProviderExplorerSnapshot {
  const features = collections[channel].features;
  return {
    channel,
    featureCount: features.length,
    geometryTypes: features.map((feature) => feature.geometry.type),
    features: features.map((feature) => ({
      geometryType: feature.geometry.type,
      coordinates: feature.geometry.type === "Point"
        ? [feature.geometry.coordinates[0], feature.geometry.coordinates[1]] as [number, number]
        : null,
      popupHtml: String(feature.properties?.popupHtml ?? ""),
      providerId: String(feature.properties?.providerId ?? ""),
    })),
  };
}

(globalThis as ProviderExplorerDiagnosticsGlobal).__NETWORK_MAP_PROVIDER_EXPLORER_NATIVE__ = {
  getSnapshot: getProviderExplorerSnapshot,
};

let liveAction: ((provider: ProviderFeature) => void) | null = null;
const liveProviders = new Map<string, ProviderFeature>();

function sourceData(map: mapboxgl.Map, id: string, collection: GeoJSON.FeatureCollection): void {
  const source = map.getSource(id) as mapboxgl.GeoJSONSource | undefined;
  if (source) {
    source.setData(collection);
    return;
  }
  map.addSource(id, { type: "geojson", data: collection, generateId: true });
}

function addPointLayer(map: mapboxgl.Map, id: string, source: string, radius = 4): void {
  if (map.getLayer(id)) return;
  map.addLayer({
    id,
    type: "circle",
    source,
    paint: {
      "circle-radius": ["coalesce", ["get", "radius"], radius],
      "circle-color": ["coalesce", ["get", "color"], "#0891b2"],
      "circle-opacity": ["coalesce", ["get", "opacity"], 0.92],
      "circle-stroke-width": ["coalesce", ["get", "strokeWidth"], 1],
      "circle-stroke-color": ["coalesce", ["get", "strokeColor"], "#ffffff"],
      "circle-stroke-opacity": ["coalesce", ["get", "strokeOpacity"], 0.95],
    },
  });
}

function ensureLayers(map: mapboxgl.Map): void {
  if (!map.isStyleLoaded()) return;
  sourceData(map, IDS.pins.source, collections.pins);
  sourceData(map, IDS.aggregate.source, collections.aggregate);
  sourceData(map, IDS.dots.source, collections.dots);
  sourceData(map, IDS.live.source, collections.live);
  sourceData(map, IDS.gaps.source, collections.gaps);

  addPointLayer(map, IDS.pins.layer, IDS.pins.source, 4);
  addPointLayer(map, IDS.dots.layer, IDS.dots.source, 2.25);
  addPointLayer(map, IDS.live.layer, IDS.live.source, 4);
  addPointLayer(map, IDS.gaps.layer, IDS.gaps.source, 4);

  if (!map.getLayer(IDS.aggregate.circle)) {
    map.addLayer({
      id: IDS.aggregate.circle,
      type: "circle",
      source: IDS.aggregate.source,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-radius": ["coalesce", ["get", "radius"], 12],
        "circle-color": ["coalesce", ["get", "color"], "#0891b2"],
        "circle-opacity": ["coalesce", ["get", "opacity"], 0.24],
        "circle-stroke-width": 0,
      },
    });
  }
  if (!map.getLayer(IDS.aggregate.fill)) {
    map.addLayer({
      id: IDS.aggregate.fill,
      type: "fill",
      source: IDS.aggregate.source,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": ["coalesce", ["get", "color"], "#7c3aed"],
        "fill-opacity": ["coalesce", ["get", "opacity"], 0.18],
      },
    });
  }
  if (!map.getLayer(IDS.aggregate.line)) {
    map.addLayer({
      id: IDS.aggregate.line,
      type: "line",
      source: IDS.aggregate.source,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#7c3aed"],
        "line-opacity": 0.42,
        "line-width": 1.25,
      },
    });
  }
}

function updateMaps(channel?: Channel): void {
  for (const map of getTrackedMapboxMaps()) {
    if (!map.isStyleLoaded()) continue;
    try {
      ensureLayers(map);
      if (channel) {
        const id = channel === "aggregate" ? IDS.aggregate.source : IDS[channel].source;
        (map.getSource(id) as mapboxgl.GeoJSONSource | undefined)?.setData(collections[channel]);
      }
      map.triggerRepaint();
    } catch (error) {
      console.warn("Provider Explorer native source update failed", error);
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

function providerFeature(provider: ProviderFeature, options: ProviderRenderOptions, channel: Channel): GeoJSON.Feature<GeoJSON.Point> | null {
  if (typeof provider.lat !== "number" || typeof provider.lng !== "number") return null;
  if (!Number.isFinite(provider.lat) || !Number.isFinite(provider.lng)) return null;
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [provider.lng, provider.lat] },
    properties: {
      providerId: String(provider.id || ""),
      channel,
      color: options.color(provider),
      radius: 4,
      opacity: channel === "gaps" ? 0.9 : 0.92,
      strokeWidth: 1,
      strokeColor: "#ffffff",
      strokeOpacity: 0.95,
      popupHtml: options.popupHtml(provider),
      interactive: true,
    },
  };
}

function fitProviders(providers: ProviderFeature[]): void {
  const map = activeMap();
  if (!map) return;
  const valid = providers.filter((provider) => typeof provider.lat === "number" && typeof provider.lng === "number") as Array<ProviderFeature & { lat: number; lng: number }>;
  if (!valid.length) return;
  const bounds = valid.reduce(
    (next, provider) => next.extend([provider.lng, provider.lat]),
    new mapboxgl.LngLatBounds([valid[0].lng, valid[0].lat], [valid[0].lng, valid[0].lat]),
  );
  map.fitBounds(bounds, { padding: 28, maxZoom: 11, duration: 0 });
}

export function renderProviderExplorerPins(providers: ProviderFeature[], options: ProviderRenderOptions): number {
  const drawable = providers.slice(0, 1000).map((provider) => providerFeature(provider, options, "pins")).filter(Boolean) as GeoJSON.Feature[];
  collections.pins = { type: "FeatureCollection", features: drawable };
  updateMaps("pins");
  if (options.fit) fitProviders(providers);
  return drawable.length;
}

function hexPolygon(map: mapboxgl.Map, cell: ProviderExplorerDensityCell, pixelRadius: number): GeoJSON.Polygon {
  const center = map.project([cell.lng, cell.lat]);
  const ring: number[][] = [];
  for (let index = 0; index <= 6; index += 1) {
    const angle = (Math.PI / 3) * (index % 6) - Math.PI / 6;
    const point = map.unproject([center.x + Math.cos(angle) * pixelRadius, center.y + Math.sin(angle) * pixelRadius]);
    ring.push([point.lng, point.lat]);
  }
  return { type: "Polygon", coordinates: [ring] };
}

export function renderProviderExplorerDensity(cells: ProviderExplorerDensityCell[], mode: "density" | "hex"): number {
  const map = activeMap();
  if (!map) return 0;
  const max = Math.max(1, ...cells.map((cell) => Number(cell.count) || 0));
  const features: GeoJSON.Feature[] = cells.map((cell) => {
    const count = Number(cell.count) || 0;
    const intensity = Math.max(0.18, Math.log(count + 1) / Math.log(max + 1));
    const color = mode === "hex" ? "#7c3aed" : "#0891b2";
    const radius = 10 + intensity * (mode === "hex" ? 24 : 38);
    return {
      type: "Feature",
      geometry: mode === "hex" ? hexPolygon(map, cell, radius) : { type: "Point", coordinates: [cell.lng, cell.lat] },
      properties: {
        count,
        color,
        radius,
        opacity: Math.min(mode === "hex" ? 0.3 : 0.36, (mode === "hex" ? 0.07 : 0.08) + intensity * (mode === "hex" ? 0.2 : 0.24)),
      },
    } as GeoJSON.Feature;
  });
  collections.aggregate = { type: "FeatureCollection", features };
  collections.dots = empty();
  updateMaps("aggregate");
  updateMaps("dots");
  return features.length;
}

export function renderProviderExplorerDotDensity(cells: ProviderExplorerDensityCell[]): number {
  const map = activeMap();
  if (!map) return 0;
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  cells.forEach((cell, cellIndex) => {
    const count = Math.max(1, Number(cell.count) || 1);
    const dotCount = Math.min(14, Math.max(1, Math.ceil(Math.log2(count + 1))));
    const center = map.project([cell.lng, cell.lat]);
    for (let index = 0; index < dotCount; index += 1) {
      const angle = cellIndex * 0.73 + index * 2.399963;
      const distance = 3 + Math.sqrt(index + 1) * 4;
      const point = map.unproject([center.x + Math.cos(angle) * distance, center.y + Math.sin(angle) * distance]);
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [point.lng, point.lat] },
        properties: { color: "#087f9a", radius: 2.25, opacity: 0.54, strokeWidth: 0 },
      });
    }
  });
  collections.dots = { type: "FeatureCollection", features };
  collections.aggregate = empty();
  updateMaps("dots");
  updateMaps("aggregate");
  return features.length;
}

export function renderProviderExplorerLive(providers: ProviderFeature[], options: ProviderRenderOptions): number {
  liveProviders.clear();
  providers.forEach((provider) => liveProviders.set(String(provider.id || ""), provider));
  liveAction = options.onAction || null;
  const features = providers.slice(0, 1000).map((provider) => providerFeature(provider, options, "live")).filter(Boolean) as GeoJSON.Feature[];
  collections.live = { type: "FeatureCollection", features };
  updateMaps("live");
  return features.length;
}

export function renderProviderExplorerGaps(providers: ProviderFeature[], options: ProviderRenderOptions): number {
  const features = providers.slice(0, 500).map((provider) => providerFeature(provider, options, "gaps")).filter(Boolean) as GeoJSON.Feature[];
  collections.gaps = { type: "FeatureCollection", features };
  updateMaps("gaps");
  return features.length;
}

export function clearProviderExplorerNative(channels: Channel[] = ["pins", "aggregate", "dots", "live", "gaps"]): void {
  for (const channel of channels) collections[channel] = empty();
  updateMaps();
  for (const channel of channels) {
    const id = channel === "aggregate" ? IDS.aggregate.source : IDS[channel].source;
    for (const map of getTrackedMapboxMaps()) {
      (map.getSource(id) as mapboxgl.GeoJSONSource | undefined)?.setData(collections[channel]);
      map.triggerRepaint();
    }
  }
}

function markHandled(originalEvent: unknown): void {
  if (originalEvent && typeof originalEvent === "object") {
    (originalEvent as Record<string, unknown>).__networkMapCompatHandled = true;
  }
}

function renderedPopupHit(map: mapboxgl.Map, point: mapboxgl.PointLike): ProviderExplorerHit | null {
  const layers = [IDS.pins.layer, IDS.live.layer, IDS.gaps.layer].filter((id) => Boolean(map.getLayer(id)));
  if (!layers.length) return null;
  const p = point as mapboxgl.Point;
  const box: [[number, number], [number, number]] = [[p.x - 12, p.y - 12], [p.x + 12, p.y + 12]];
  try {
    const feature = map.queryRenderedFeatures(box, { layers })
      .filter((candidate) => candidate.geometry.type === "Point" && String(candidate.properties?.popupHtml || "").trim())
      .sort((a, b) => {
        const pa = a.geometry.type === "Point" ? map.project(a.geometry.coordinates as [number, number]) : p;
        const pb = b.geometry.type === "Point" ? map.project(b.geometry.coordinates as [number, number]) : p;
        return Math.hypot(pa.x - p.x, pa.y - p.y) - Math.hypot(pb.x - p.x, pb.y - p.y);
      })[0];
    if (!feature || feature.geometry.type !== "Point") return null;
    const coordinates = feature.geometry.coordinates as [number, number];
    const projected = map.project(coordinates);
    return {
      coordinates,
      popupHtml: String(feature.properties?.popupHtml || ""),
      channel: String(feature.properties?.channel || ""),
      providerId: String(feature.properties?.providerId || ""),
      distance: Math.hypot(projected.x - p.x, projected.y - p.y),
    };
  } catch {
    return null;
  }
}

function collectionPopupHit(map: mapboxgl.Map, point: mapboxgl.PointLike, maxDistance = 16): ProviderExplorerHit | null {
  const p = point as mapboxgl.Point;
  let nearest: ProviderExplorerHit | null = null;
  for (const channel of ["pins", "live", "gaps"] as const) {
    const channelIds = IDS[channel];
    if (!map.getLayer(channelIds.layer) || !map.getSource(channelIds.source)) continue;
    for (const feature of collections[channel].features) {
      if (feature.geometry.type !== "Point") continue;
      const popupHtml = String(feature.properties?.popupHtml || "").trim();
      if (!popupHtml) continue;
      const coordinates = feature.geometry.coordinates as [number, number];
      const projected = map.project(coordinates);
      const distance = Math.hypot(projected.x - p.x, projected.y - p.y);
      if (distance > maxDistance || (nearest && nearest.distance <= distance)) continue;
      nearest = {
        coordinates,
        popupHtml,
        channel: String(feature.properties?.channel || channel),
        providerId: String(feature.properties?.providerId || ""),
        distance,
      };
    }
  }
  return nearest;
}

function popupHit(map: mapboxgl.Map, point: mapboxgl.PointLike): ProviderExplorerHit | null {
  return renderedPopupHit(map, point) || collectionPopupHit(map, point);
}

registerMapboxMapInitializer({
  id: "provider-explorer-native-map",
  priority: 12,
  initialize: (map) => {
    const apply = () => ensureLayers(map);
    const click = (event: mapboxgl.MapMouseEvent) => {
      const feature = popupHit(map, event.point);
      if (!feature) return;
      markHandled(event.originalEvent);
      const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "380px" })
        .setLngLat(feature.coordinates)
        .setHTML(feature.popupHtml)
        .addTo(map);
      if (feature.channel === "live" && liveAction) {
        const provider = liveProviders.get(feature.providerId);
        const button = popup.getElement()?.querySelector<HTMLButtonElement>(".provider-popup-save");
        if (provider && button) button.addEventListener("click", (domEvent) => {
          domEvent.preventDefault();
          liveAction?.(provider);
          popup.remove();
        }, { once: true });
      }
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

import mapboxgl from "mapbox-gl";
import { getTrackedMapboxMaps, registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";

export type ProviderDatasetChannel = "bluehive" | "dentists" | "inventory" | "indexed" | "my-clinics" | "naccho" | "uploaded";

type DatasetRenderOptions<T> = {
  baseColor: string;
  glow?: boolean;
  getColor?: (provider: T) => string;
  buildPopup: (provider: T) => string;
};

type ChannelState = {
  collection: GeoJSON.FeatureCollection<GeoJSON.Point>;
  baseColor: string;
  glow: boolean;
};

type DatasetHit = {
  coordinates: [number, number];
  popupHtml: string;
  distance: number;
};

type ProviderDatasetSnapshotFeature = {
  coordinates: [number, number];
  popupHtml: string;
  providerId: string;
};

type ProviderDatasetSnapshot = {
  channel: ProviderDatasetChannel;
  featureCount: number;
  features: ProviderDatasetSnapshotFeature[];
};

type ProviderDatasetDiagnosticsGlobal = typeof globalThis & {
  __NETWORK_MAP_PROVIDER_DATASET_NATIVE__?: {
    getSnapshot: (channel: ProviderDatasetChannel) => ProviderDatasetSnapshot;
  };
};

const CHANNELS: ProviderDatasetChannel[] = ["bluehive", "dentists", "inventory", "indexed", "my-clinics", "naccho", "uploaded"];
const states = new Map<ProviderDatasetChannel, ChannelState>();
for (const channel of CHANNELS) {
  states.set(channel, {
    collection: { type: "FeatureCollection", features: [] },
    baseColor: "#0891b2",
    glow: false,
  });
}

function safeId(channel: ProviderDatasetChannel): string {
  return channel.replace(/[^a-z0-9-]/gi, "-");
}

function ids(channel: ProviderDatasetChannel) {
  const slug = safeId(channel);
  return {
    source: `provider-dataset-native-${slug}`,
    heatmap: `provider-dataset-native-${slug}-heatmap`,
    points: `provider-dataset-native-${slug}-points`,
  };
}

function finite(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function coordinates(provider: any): [number, number] | null {
  const lat = finite(provider?.lat ?? provider?.latitude);
  const lng = finite(provider?.lng ?? provider?.lon ?? provider?.longitude);
  if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lng, lat];
}

function parseHex(hex: string): [number, number, number] {
  const cleaned = String(hex || "").trim().replace(/^#/, "");
  const normalized = cleaned.length === 3
    ? cleaned.split("").map((char) => char + char).join("")
    : cleaned.padEnd(6, "0").slice(0, 6);
  const value = Number.parseInt(normalized, 16);
  if (!Number.isFinite(value)) return [8, 145, 178];
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function heatmapColor(baseColor: string): mapboxgl.Expression {
  const [r, g, b] = parseHex(baseColor);
  return [
    "interpolate", ["linear"], ["heatmap-density"],
    0, "rgba(0,0,0,0)",
    0.18, `rgba(${r},${g},${b},0.08)`,
    0.48, `rgba(${r},${g},${b},0.2)`,
    0.75, `rgba(${r},${g},${b},0.34)`,
    1, `rgba(${r},${g},${b},0.5)`,
  ] as mapboxgl.Expression;
}

function ensureChannel(map: mapboxgl.Map, channel: ProviderDatasetChannel): void {
  if (!map.isStyleLoaded()) return;
  const state = states.get(channel)!;
  const channelIds = ids(channel);
  const existing = map.getSource(channelIds.source) as mapboxgl.GeoJSONSource | undefined;
  if (existing) existing.setData(state.collection);
  else map.addSource(channelIds.source, { type: "geojson", data: state.collection, generateId: true });

  if (!map.getLayer(channelIds.heatmap)) {
    map.addLayer({
      id: channelIds.heatmap,
      type: "heatmap",
      source: channelIds.source,
      maxzoom: 13,
      paint: {
        "heatmap-weight": 1,
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 1, 0.45, 8, 0.85, 13, 1.15],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 1, 8, 6, 18, 10, 28, 13, 42],
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.12, 8, 0.22, 12, 0.16, 13, 0],
        "heatmap-color": heatmapColor(state.baseColor),
      },
    });
  } else {
    map.setPaintProperty(channelIds.heatmap, "heatmap-color", heatmapColor(state.baseColor));
  }

  if (!map.getLayer(channelIds.points)) {
    map.addLayer({
      id: channelIds.points,
      type: "circle",
      source: channelIds.source,
      paint: {
        "circle-radius": ["case", ["boolean", ["get", "glow"], false], 4.5, 4],
        "circle-color": ["coalesce", ["get", "color"], state.baseColor],
        "circle-opacity": 0.92,
        "circle-stroke-width": 1,
        "circle-stroke-color": "rgba(255,255,255,0.94)",
        "circle-stroke-opacity": 0.96,
        "circle-blur": ["case", ["boolean", ["get", "glow"], false], 0.18, 0],
      },
    });
  }
}

function updateChannel(channel: ProviderDatasetChannel): void {
  const state = states.get(channel)!;
  const channelIds = ids(channel);
  for (const map of getTrackedMapboxMaps()) {
    if (!map.isStyleLoaded()) continue;
    try {
      ensureChannel(map, channel);
      (map.getSource(channelIds.source) as mapboxgl.GeoJSONSource | undefined)?.setData(state.collection);
      map.triggerRepaint();
    } catch (error) {
      console.warn(`Provider dataset ${channel} update failed`, error);
    }
  }
}

function getProviderDatasetSnapshot(channel: ProviderDatasetChannel): ProviderDatasetSnapshot {
  const state = states.get(channel);
  const features = state?.collection.features ?? [];
  return {
    channel,
    featureCount: features.length,
    features: features.map((feature) => ({
      coordinates: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]] as [number, number],
      popupHtml: String(feature.properties?.popupHtml ?? ""),
      providerId: String(feature.properties?.providerId ?? ""),
    })),
  };
}

(globalThis as ProviderDatasetDiagnosticsGlobal).__NETWORK_MAP_PROVIDER_DATASET_NATIVE__ = {
  getSnapshot: getProviderDatasetSnapshot,
};

export function renderProviderDataset<T>(
  channel: ProviderDatasetChannel,
  providers: T[],
  options: DatasetRenderOptions<T>,
): number {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index] as any;
    const point = coordinates(provider);
    if (!point) continue;
    const color = options.getColor?.(providers[index]) || options.baseColor;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: point },
      properties: {
        providerId: String(provider?.id ?? provider?.source_id ?? provider?.npi ?? index),
        channel,
        color,
        glow: Boolean(options.glow),
        popupHtml: options.buildPopup(providers[index]),
      },
    });
  }
  states.set(channel, {
    collection: { type: "FeatureCollection", features },
    baseColor: options.baseColor,
    glow: Boolean(options.glow),
  });
  updateChannel(channel);
  return features.length;
}

export function clearProviderDataset(channel: ProviderDatasetChannel): void {
  const previous = states.get(channel)!;
  states.set(channel, {
    ...previous,
    collection: { type: "FeatureCollection", features: [] },
  });
  updateChannel(channel);
}

function markHandled(originalEvent: unknown): void {
  if (originalEvent && typeof originalEvent === "object") {
    (originalEvent as unknown as Record<string, unknown>).__networkMapCompatHandled = true;
  }
}

function renderedHit(map: mapboxgl.Map, point: mapboxgl.Point): DatasetHit | null {
  const layers = CHANNELS.map((channel) => ids(channel).points).filter((layer) => Boolean(map.getLayer(layer)));
  if (!layers.length) return null;
  const box: [[number, number], [number, number]] = [[point.x - 12, point.y - 12], [point.x + 12, point.y + 12]];
  try {
    const feature = map.queryRenderedFeatures(box, { layers })
      .filter((candidate) => candidate.geometry.type === "Point" && String(candidate.properties?.popupHtml || "").trim())
      .sort((left, right) => {
        const leftPoint = map.project(left.geometry.type === "Point" ? left.geometry.coordinates as [number, number] : map.unproject(point));
        const rightPoint = map.project(right.geometry.type === "Point" ? right.geometry.coordinates as [number, number] : map.unproject(point));
        return Math.hypot(leftPoint.x - point.x, leftPoint.y - point.y) - Math.hypot(rightPoint.x - point.x, rightPoint.y - point.y);
      })[0];
    if (!feature || feature.geometry.type !== "Point") return null;
    const projected = map.project(feature.geometry.coordinates as [number, number]);
    return {
      coordinates: feature.geometry.coordinates as [number, number],
      popupHtml: String(feature.properties?.popupHtml || ""),
      distance: Math.hypot(projected.x - point.x, projected.y - point.y),
    };
  } catch {
    return null;
  }
}

function stateHit(map: mapboxgl.Map, point: mapboxgl.Point, maxDistance = 16): DatasetHit | null {
  let nearest: DatasetHit | null = null;
  for (const channel of CHANNELS) {
    const channelIds = ids(channel);
    if (!map.getLayer(channelIds.points) || !map.getSource(channelIds.source)) continue;
    const state = states.get(channel);
    if (!state) continue;
    for (const feature of state.collection.features) {
      if (feature.geometry.type !== "Point") continue;
      const popupHtml = String(feature.properties?.popupHtml || "").trim();
      if (!popupHtml) continue;
      const coordinates = feature.geometry.coordinates as [number, number];
      const projected = map.project(coordinates);
      const distance = Math.hypot(projected.x - point.x, projected.y - point.y);
      if (distance > maxDistance || (nearest && nearest.distance <= distance)) continue;
      nearest = { coordinates, popupHtml, distance };
    }
  }
  return nearest;
}

function hit(map: mapboxgl.Map, point: mapboxgl.Point): DatasetHit | null {
  return renderedHit(map, point) || stateHit(map, point);
}

registerMapboxMapInitializer({
  id: "provider-dataset-native-map",
  priority: 11,
  initialize: (map) => {
    const apply = () => CHANNELS.forEach((channel) => ensureChannel(map, channel));
    const click = (event: mapboxgl.MapMouseEvent) => {
      const feature = hit(map, event.point);
      if (!feature) return;
      markHandled(event.originalEvent);
      new mapboxgl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "320px" })
        .setLngLat(feature.coordinates)
        .setHTML(feature.popupHtml)
        .addTo(map);
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

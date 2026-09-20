import mapboxgl from "mapbox-gl";

export type ProviderPointLayerDefinition = {
  sourceId: string;
  layerId: string;
  defaultColor?: string;
  defaultRadius?: number;
  paint?: Record<string, unknown>;
};

export type ProviderPointFeatureInput = {
  id: string;
  lat: number;
  lng: number;
  popupHtml?: string;
  color?: string;
  radius?: number;
  opacity?: number;
  strokeWidth?: number;
  strokeColor?: string;
  strokeOpacity?: number;
  channel?: string;
  sourceKey?: string;
  sourceKind?: string;
  providerType?: string;
  properties?: Record<string, unknown>;
};

export function buildProviderPointFeature(
  input: ProviderPointFeatureInput,
): GeoJSON.Feature<GeoJSON.Point> | null {
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: {
      providerId: String(input.id || ""),
      popupHtml: String(input.popupHtml || ""),
      color: input.color,
      radius: input.radius,
      opacity: input.opacity,
      strokeWidth: input.strokeWidth,
      strokeColor: input.strokeColor,
      strokeOpacity: input.strokeOpacity,
      channel: input.channel,
      sourceKey: input.sourceKey,
      sourceKind: input.sourceKind,
      providerType: input.providerType,
      interactive: true,
      ...(input.properties || {}),
    },
  };
}

export function providerPointCollection(
  inputs: ProviderPointFeatureInput[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: inputs.map(buildProviderPointFeature).filter(Boolean) as GeoJSON.Feature<GeoJSON.Point>[],
  };
}

export function upsertProviderPointSource(
  map: mapboxgl.Map,
  sourceId: string,
  collection: GeoJSON.FeatureCollection,
): mapboxgl.GeoJSONSource {
  const existing = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
  if (existing) {
    existing.setData(collection);
    return existing;
  }
  map.addSource(sourceId, {
    type: "geojson",
    data: collection,
    generateId: true,
  });
  return map.getSource(sourceId) as mapboxgl.GeoJSONSource;
}

export function ensureProviderPointLayer(
  map: mapboxgl.Map,
  definition: ProviderPointLayerDefinition,
  collection: GeoJSON.FeatureCollection,
): void {
  upsertProviderPointSource(map, definition.sourceId, collection);
  if (map.getLayer(definition.layerId)) return;

  const defaultColor = definition.defaultColor || "#0891b2";
  const defaultRadius = definition.defaultRadius ?? 4;
  const paint = definition.paint || {
    "circle-radius": ["coalesce", ["get", "radius"], defaultRadius],
    "circle-color": ["coalesce", ["get", "color"], defaultColor],
    "circle-opacity": ["coalesce", ["get", "opacity"], 0.92],
    "circle-stroke-width": ["coalesce", ["get", "strokeWidth"], 1],
    "circle-stroke-color": ["coalesce", ["get", "strokeColor"], "#ffffff"],
    "circle-stroke-opacity": ["coalesce", ["get", "strokeOpacity"], 0.95],
  };

  map.addLayer({
    id: definition.layerId,
    type: "circle",
    source: definition.sourceId,
    paint: paint as mapboxgl.CircleLayer["paint"],
  });
}

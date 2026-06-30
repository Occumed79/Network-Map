export type MapRendererMode = "leaflet" | "maplibre";

export type GeoJsonFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: Record<string, unknown>;
};

export type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

export type MapRendererAdapter = {
  mode: MapRendererMode;
  setCenter: (lat: number, lng: number, zoom?: number) => void;
  setBasemap: (styleId: string) => void;
  setProviderSource: (features: GeoJsonFeatureCollection) => void;
  setRouteLine: (feature: GeoJsonFeature | null) => void;
  setServiceZones: (featureCollection: GeoJsonFeatureCollection | null) => void;
  setDensityVisible: (enabled: boolean) => void;
  destroy: () => void;
};

export const MAP_RENDERER_ENV_KEY = "VITE_MAP_RENDERER";

export function requestedRendererMode(): MapRendererMode {
  return import.meta.env.VITE_MAP_RENDERER === "maplibre" ? "maplibre" : "leaflet";
}

export function providerPointFeature(input: {
  id: string | number;
  name: string;
  lat: number;
  lng: number;
  category?: string;
  source?: string;
  confidence?: string;
}): GeoJsonFeature {
  return {
    type: "Feature",
    properties: {
      id: String(input.id),
      name: input.name,
      category: input.category || "clinic",
      source: input.source || "unknown",
      confidence: input.confidence || "unknown",
    },
    geometry: {
      type: "Point",
      coordinates: [input.lng, input.lat],
    },
  };
}

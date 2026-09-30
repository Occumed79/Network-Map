import mapboxgl from "mapbox-gl";
import { listenForEtaRoute } from "./etaRouteEvents";
import type { EtaProviderRanking } from "./providerEtaTypes";
import { ensureLuminousRouteLayers, installRouteHover, startRoutePulse, travelAlongRoute, type RouteLayerIds } from "../../routePresentationRuntime";

const SOURCE_ID = "drive-time-eta-route";
const LINE_LAYER_ID = "drive-time-eta-route-line";
const ROUTE_LAYERS: RouteLayerIds = {
  source: SOURCE_ID,
  outer: "drive-time-eta-route-glow",
  body: LINE_LAYER_ID,
  core: "drive-time-eta-route-core",
  pulse: "drive-time-eta-route-pulse",
};
const END_LAYER_ID = "drive-time-eta-route-end";

function emptyCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function routeCollection(row: EtaProviderRanking): GeoJSON.FeatureCollection {
  const coordinates = row.routeCoordinates
    .map(([lat, lng]) => [Number(lng), Number(lat)] as [number, number])
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
  if (coordinates.length < 2) return emptyCollection();
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "LineString", coordinates },
        properties: { role: "route" },
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [row.lng, row.lat] },
        properties: { role: "destination" },
      },
    ],
  };
}

function ensureLayers(map: mapboxgl.Map, collection: GeoJSON.FeatureCollection): void {
  if (!map.getStyle()) return;
  const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  if (source) source.setData(collection);
  else map.addSource(SOURCE_ID, { type: "geojson", data: collection, generateId: true, lineMetrics: true });

  ensureLuminousRouteLayers(map, ROUTE_LAYERS);
  if (!map.getLayer(END_LAYER_ID)) {
    map.addLayer({
      id: END_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      filter: ["==", ["get", "role"], "destination"],
      paint: {
        "circle-radius": 6,
        "circle-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#4c1d95",
      },
    });
  }
}

export function installNativeEtaRouteLayer(map: mapboxgl.Map): () => void {
  let latest = emptyCollection();
  let interactionCleanup: (() => void) | null = null;
  let pulseCleanup: (() => void) | null = null;

  const apply = () => {
    ensureLayers(map, latest);
    interactionCleanup ||= installRouteHover(map, ROUTE_LAYERS);
    pulseCleanup ||= startRoutePulse(map, ROUTE_LAYERS);
  };
  const draw = (row: EtaProviderRanking): void => {
    latest = routeCollection(row);
    if (latest.features.length === 0) return;
    ensureLayers(map, latest);
    const line = latest.features.find((feature) => feature.geometry.type === "LineString");
    if (!line || line.geometry.type !== "LineString") return;
    const coordinates = line.geometry.coordinates as Array<[number, number]>;
    const bounds = new mapboxgl.LngLatBounds();
    coordinates.forEach((coordinate) => bounds.extend(coordinate));
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 38, duration: 700 });
    requestAnimationFrame(() => travelAlongRoute(map, coordinates));
  };

  map.on("style.load", apply);
  if (map.isStyleLoaded()) queueMicrotask(apply);
  const unsubscribe = listenForEtaRoute(draw);

  return () => {
    unsubscribe();
    map.off("style.load", apply);
    interactionCleanup?.();
    pulseCleanup?.();
  };
}

import mapboxgl from "mapbox-gl";
import { listenForEtaRoute } from "./etaRouteEvents";
import type { EtaProviderRanking } from "./providerEtaTypes";

const SOURCE_ID = "drive-time-eta-route";
const LINE_LAYER_ID = "drive-time-eta-route-line";
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
  else map.addSource(SOURCE_ID, { type: "geojson", data: collection });

  if (!map.getLayer(LINE_LAYER_ID)) {
    map.addLayer({
      id: LINE_LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      filter: ["==", ["get", "role"], "route"],
      paint: {
        "line-color": "#7c3aed",
        "line-width": 5,
        "line-opacity": 0.88,
      },
    });
  }
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

  const apply = () => ensureLayers(map, latest);
  const draw = (row: EtaProviderRanking): void => {
    latest = routeCollection(row);
    if (latest.features.length === 0) return;
    ensureLayers(map, latest);
    const line = latest.features.find((feature) => feature.geometry.type === "LineString");
    if (!line || line.geometry.type !== "LineString") return;
    const bounds = new mapboxgl.LngLatBounds();
    line.geometry.coordinates.forEach((coordinate) => bounds.extend(coordinate as [number, number]));
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 38, duration: 700 });
  };

  map.on("style.load", apply);
  if (map.isStyleLoaded()) queueMicrotask(apply);
  const unsubscribe = listenForEtaRoute(draw);

  return () => {
    unsubscribe();
    map.off("style.load", apply);
  };
}

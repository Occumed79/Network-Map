import MapScene from "../../mapSceneRuntime";
import { listenForEtaRoute } from "./etaRouteEvents";
import type { EtaProviderRanking } from "./providerEtaTypes";

export function installMapSceneEtaRouteLayer(map: MapScene.Map): () => void {
  let routeLayer: MapScene.LayerGroup | null = null;

  function clear(): void {
    if (!routeLayer) return;
    map.removeLayer(routeLayer);
    routeLayer = null;
  }

  function draw(row: EtaProviderRanking): void {
    if (row.routeCoordinates.length < 2) return;
    clear();
    const line = MapScene.polyline(row.routeCoordinates, {
      color: "#7c3aed",
      weight: 5,
      opacity: 0.88,
    });
    const end = MapScene.circleMarker([row.lat, row.lng], {
      radius: 6,
      color: "#4c1d95",
      fillColor: "#ffffff",
      fillOpacity: 1,
      weight: 2,
    });
    routeLayer = MapScene.layerGroup([line, end]).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [38, 38] });
  }

  const unsubscribe = listenForEtaRoute(draw);
  return () => {
    unsubscribe();
    clear();
  };
}

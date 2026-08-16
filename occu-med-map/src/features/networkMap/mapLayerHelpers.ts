import MapScene from "../../mapSceneRuntime";
import { createTileLayer, type TileProviderKey } from '../../lib/mapServices';

export function replaceBaseTileLayer(params: {
  map: MapScene.Map;
  currentLayer?: MapScene.TileLayer | null;
  providerKey: TileProviderKey;
}): MapScene.TileLayer {
  const { map, currentLayer, providerKey } = params;
  if (currentLayer) {
    try {
      map.removeLayer(currentLayer);
    } catch {}
  }
  const nextLayer = createTileLayer(providerKey);
  nextLayer.addTo(map);
  return nextLayer;
}

export function clearLayerGroup(layer?: MapScene.LayerGroup | null): void {
  if (!layer) return;
  try {
    layer.clearLayers();
  } catch {}
}

export function safeRemoveLayer(map: MapScene.Map | null | undefined, layer?: MapScene.Layer | null): void {
  if (!map || !layer) return;
  try {
    map.removeLayer(layer);
  } catch {}
}

export function fitMarkers(map: MapScene.Map, points: Array<[number, number]>, fallbackZoom = 10): void {
  if (!points.length) return;
  if (points.length === 1) {
    map.flyTo(points[0], fallbackZoom, { duration: 0.8 });
    return;
  }
  map.fitBounds(MapScene.latLngBounds(points), { padding: [30, 30] });
}

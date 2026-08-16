import MapScene from "./mapSceneRuntime";

/**
 * Network Map interaction defaults.
 *
 * The scene runtime's stock wheel sensitivity is aggressive on high-resolution mouse
 * wheels and Mac trackpads. Requiring more wheel movement per zoom level keeps
 * zooming controlled and prevents the map from racing through multiple tile
 * levels from a small gesture.
 */
const mapDefaults: MapScene.MapOptions = {
  minZoom: 2,
  maxZoom: 17,
  wheelPxPerZoomLevel: 180,
  wheelDebounceTime: 40,
  zoomDelta: 1,
  zoomSnap: 1,
  bounceAtZoomLimits: false,
};

/**
 * Do not request replacement tiles for every intermediate animation frame.
 * The prior runtime waited for the zoom to settle, then loads the final tile level.
 * A smaller off-screen buffer also avoids retaining/requesting excess tiles.
 */
const gridLayerDefaults: MapScene.GridLayerOptions = {
  updateWhenZooming: false,
  updateInterval: 350,
  keepBuffer: 1,
};

(MapScene.Map as any).mergeOptions(mapDefaults);
(MapScene.GridLayer as any).mergeOptions(gridLayerDefaults);

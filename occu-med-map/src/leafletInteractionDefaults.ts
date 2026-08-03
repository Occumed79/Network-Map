import L from "leaflet";

/**
 * Network Map interaction defaults.
 *
 * Leaflet's stock wheel sensitivity is aggressive on high-resolution mouse
 * wheels and Mac trackpads. Requiring more wheel movement per zoom level keeps
 * zooming controlled and prevents the map from racing through multiple tile
 * levels from a small gesture.
 */
const mapDefaults: L.MapOptions = {
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
 * Leaflet waits for the zoom to settle, then loads the final tile level.
 * A smaller off-screen buffer also avoids retaining/requesting excess tiles.
 */
const gridLayerDefaults: L.GridLayerOptions = {
  updateWhenZooming: false,
  updateInterval: 350,
  keepBuffer: 1,
};

(L.Map as any).mergeOptions(mapDefaults);
(L.GridLayer as any).mergeOptions(gridLayerDefaults);

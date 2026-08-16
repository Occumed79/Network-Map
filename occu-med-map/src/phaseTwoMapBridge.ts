import mapboxgl from "mapbox-gl";
import { registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";

export type PhaseTwoMapSnapshot = {
  zoom: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
};

declare global {
  interface Window {
    __occumedPhaseTwoMap?: mapboxgl.Map;
  }
}

function snapshot(map: mapboxgl.Map): PhaseTwoMapSnapshot {
  const bounds = map.getBounds();
  return {
    zoom: map.getZoom(),
    bounds: {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    },
  };
}

function emitMapState(map: mapboxgl.Map, eventName: string): void {
  window.dispatchEvent(new CustomEvent(eventName, { detail: snapshot(map) }));
}

registerMapboxMapInitializer({
  id: "phase-two-map-bridge",
  priority: 16,
  initialize: (map) => {
    window.__occumedPhaseTwoMap = map;
    emitMapState(map, "occumed:p2-map-ready");
    const emitChange = () => {
      window.__occumedPhaseTwoMap = map;
      emitMapState(map, "occumed:p2-map-change");
    };
    map.on("moveend", emitChange);
    map.on("zoomend", emitChange);
    map.on("resize", emitChange);
    return () => {
      map.off("moveend", emitChange);
      map.off("zoomend", emitChange);
      map.off("resize", emitChange);
      if (window.__occumedPhaseTwoMap === map) delete window.__occumedPhaseTwoMap;
    };
  },
});

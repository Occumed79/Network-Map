import L from 'leaflet';
import { registerLeafletMapInitializer } from './leafletMapLifecycleRuntime';

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
    __occumedPhaseTwoMap?: L.Map;
  }
}

const INSTALL_KEY = '__occumedPhaseTwoMapBridgeInstalled';
const REGISTERED_KEY = '__occumedPhaseTwoMapBridgeRegistered';
const leafletRuntime = L as typeof L & Record<string, unknown>;

function snapshot(map: L.Map): PhaseTwoMapSnapshot {
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

function emitMapState(map: L.Map, eventName: string): void {
  window.dispatchEvent(new CustomEvent(eventName, { detail: snapshot(map) }));
}

function registerMap(map: L.Map): void {
  const registeredMap = map as L.Map & Record<string, unknown>;
  if (registeredMap[REGISTERED_KEY]) return;
  registeredMap[REGISTERED_KEY] = true;

  window.__occumedPhaseTwoMap = map;
  emitMapState(map, 'occumed:p2-map-ready');
  const emitChange = () => emitMapState(map, 'occumed:p2-map-change');
  map.on('moveend zoomend resize', emitChange);
  map.once('unload', () => {
    map.off('moveend zoomend resize', emitChange);
    if (window.__occumedPhaseTwoMap === map) delete window.__occumedPhaseTwoMap;
  });
}

export function installPhaseTwoMapBridge(): void {
  if (leafletRuntime[INSTALL_KEY]) return;
  leafletRuntime[INSTALL_KEY] = true;
  registerLeafletMapInitializer({
    id: 'phase-two-map-bridge',
    priority: 0,
    initialize: registerMap,
  });
}

installPhaseTwoMapBridge();

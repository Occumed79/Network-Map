import L from "leaflet";
import { installLeafletEtaRouteLayer } from "./leafletEtaRouteLayer";

const originalMap = L.map.bind(L);
let installed = false;

function nativeDriveTimeEnabled(): boolean {
  return import.meta.env.VITE_NATIVE_DRIVE_TIME === "true";
}

function installOnMap(map: L.Map): void {
  installLeafletEtaRouteLayer(map);
}

export function installNativeDriveTimeRuntime(): void {
  if (installed || !nativeDriveTimeEnabled()) return;
  installed = true;
  (L as any).map = (...args: Parameters<typeof L.map>) => {
    const map = originalMap(...args);
    window.setTimeout(() => installOnMap(map), 0);
    return map;
  };
}

installNativeDriveTimeRuntime();

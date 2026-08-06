import L from "leaflet";
import { registerLeafletMapInitializer } from "../../leafletMapLifecycleRuntime";
import { installLeafletEtaRouteLayer } from "./leafletEtaRouteLayer";

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
  registerLeafletMapInitializer({
    id: "native-drive-time",
    priority: 60,
    initialize: (map) => { window.setTimeout(() => installOnMap(map), 0); },
  });
}

installNativeDriveTimeRuntime();

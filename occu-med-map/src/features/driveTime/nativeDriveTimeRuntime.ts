import MapScene from "../../mapSceneRuntime";
import { registerMapSceneInitializer } from "../../mapSceneLifecycleRuntime";
import { installMapSceneEtaRouteLayer } from "./mapSceneEtaRouteLayer";

let installed = false;

function nativeDriveTimeEnabled(): boolean {
  return import.meta.env.VITE_NATIVE_DRIVE_TIME === "true";
}

function installOnMap(map: MapScene.Map): void {
  installMapSceneEtaRouteLayer(map);
}

export function installNativeDriveTimeRuntime(): void {
  if (installed || !nativeDriveTimeEnabled()) return;
  installed = true;
  registerMapSceneInitializer({
    id: "native-drive-time",
    priority: 60,
    initialize: (map) => { window.setTimeout(() => installOnMap(map), 0); },
  });
}

installNativeDriveTimeRuntime();

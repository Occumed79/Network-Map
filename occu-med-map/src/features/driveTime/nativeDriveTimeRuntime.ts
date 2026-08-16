import MapScene from "../../mapSceneRuntime";
import { subscribeSceneRoots } from "../../mapSceneRuntime";
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
  subscribeSceneRoots((map) => {
    window.setTimeout(() => installOnMap(map), 0);
  });
}

installNativeDriveTimeRuntime();

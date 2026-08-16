import { registerMapboxMapInitializer } from "../../mapboxMapLifecycleRuntime";
import { installNativeEtaRouteLayer } from "./mapSceneEtaRouteLayer";

let installed = false;

function nativeDriveTimeEnabled(): boolean {
  return import.meta.env.VITE_NATIVE_DRIVE_TIME === "true";
}

export function installNativeDriveTimeRuntime(): void {
  if (installed || !nativeDriveTimeEnabled()) return;
  installed = true;
  registerMapboxMapInitializer({
    id: "native-drive-time-route",
    priority: 18,
    initialize: (map) => installNativeEtaRouteLayer(map),
  });
}

installNativeDriveTimeRuntime();

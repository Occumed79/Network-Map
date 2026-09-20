import { registerMapboxMapInitializer } from "../../mapboxMapLifecycleRuntime";
import { installNativeEtaRouteLayer } from "./mapboxEtaRouteLayer";

let installed = false;

export function installNativeDriveTimeRuntime(): void {
  if (installed) return;
  installed = true;
  registerMapboxMapInitializer({
    id: "native-drive-time-route",
    priority: 18,
    initialize: (map) => installNativeEtaRouteLayer(map),
  });
}

installNativeDriveTimeRuntime();

import { registerMapboxSourceDataMiddleware } from "./mapboxSourcePipelineRuntime";
import { registerRuntimeOwner, subscribeToSharedDomObserver } from "./runtimeControllerRegistry";

function featureIsDensityBlob(feature: any): boolean {
  if (!feature || feature.geometry?.type !== "Point") return false;
  const properties = feature.properties || {};
  const popup = String(properties.popupHtml || "").toLowerCase();
  const radius = Number(properties.pointRadius || 0);
  const opacity = Number(properties.fillOpacity ?? 1);

  return popup.includes("matching providers")
    || popup.includes("density view")
    || popup.includes("aggregated cells")
    || popup.includes("density dots")
    || (radius >= 11 && opacity <= 0.62);
}

function filterDensityFeatures(data: any): any {
  if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features)) return data;
  const features = data.features.filter((feature: any) => !featureIsDensityBlob(feature));
  return features.length === data.features.length ? data : { ...data, features };
}

function removeFinishedLoadingPanels(): void {
  document.querySelectorAll<HTMLElement>(".dual-engine-map-shell").forEach((shell) => {
    const status = shell.querySelector<HTMLElement>(".map-dimension-status")?.textContent?.toLowerCase() || "";
    const mapbox2dHost = shell.querySelector<HTMLElement>(".mapbox-2d-host");
    const mapboxHost = shell.querySelector<HTMLElement>(".mapbox-globe-host");

    const mapbox2dReady = shell.classList.contains("visible-engine-ready")
      || mapbox2dHost?.classList.contains("ready")
      || status.includes("mapbox 2d active")
      || Boolean(mapbox2dHost?.querySelector(".mapboxgl-map canvas"));

    if (mapbox2dHost && mapbox2dReady) {
      mapbox2dHost.classList.add("engine-render-ready");
      mapbox2dHost.querySelectorAll<HTMLElement>(":scope > .dual-engine-loading").forEach((node) => node.remove());
    }

    const mapboxReady = mapboxHost?.classList.contains("ready")
      || status.includes("mapbox 3d globe active")
      || Boolean(mapboxHost?.querySelector(".mapboxgl-map canvas"));

    if (mapboxHost && mapboxReady) {
      mapboxHost.classList.add("engine-render-ready");
      mapboxHost.querySelectorAll<HTMLElement>(":scope > .dual-engine-loading").forEach((node) => node.remove());
    }
  });
}

function cleanupFinishedTransition(): void {
  if (!document.querySelector(".dual-engine-vortex.active")) delete document.documentElement.dataset.mapTransitionTarget;
}

function reconcileMapEngineUi(): void {
  removeFinishedLoadingPanels();
  cleanupFinishedTransition();
}

function installMapEngineFinalFixes(): void {
  if (!registerRuntimeOwner("map-engine-final-fixes", "Map engine transition/loading cleanup and density source filtering")) return;

  registerMapboxSourceDataMiddleware({
    id: "network-overlay-density-filter",
    sourceId: "network-overlays",
    priority: 20,
    transform: (_context, data) => filterDensityFeatures(data),
  });

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLButtonElement>(".map-dimension-toggle button[data-map-mode]");
    if (!button || button.disabled) return;

    const requestedMode = button.dataset.mapMode === "3d" ? "3d" : "2d";
    const isAlreadyActive = button.classList.contains("active") || button.getAttribute("aria-pressed") === "true";
    if (!isAlreadyActive) {
      document.documentElement.dataset.mapTransitionTarget = requestedMode;
    }
  }, true);

  subscribeToSharedDomObserver("map-engine-final-fixes", (mutations) => {
    if (!mutations.some((mutation) => {
      const target = mutation.target instanceof Element ? mutation.target : null;
      return Boolean(target?.closest(".dual-engine-map-shell, .dual-engine-vortex, .mapbox-2d-host, .mapbox-globe-host, .map-dimension-status"));
    })) return;
    reconcileMapEngineUi();
  });

  reconcileMapEngineUi();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", installMapEngineFinalFixes, { once: true });
} else {
  installMapEngineFinalFixes();
}

export {};

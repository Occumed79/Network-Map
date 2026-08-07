import { registerRuntimeOwner, subscribeToSharedDomObserver } from "./runtimeControllerRegistry";

function removeCompletedLoadingPanels(): void {
  document.querySelectorAll<HTMLElement>(".mapbox-2d-host, .mapbox-globe-host").forEach((host) => {
    const status = host
      .closest<HTMLElement>(".dual-engine-map-shell")
      ?.querySelector<HTMLElement>(".map-dimension-status")
      ?.textContent
      ?.toLowerCase() || "";

    const engineReady = host.classList.contains("ready")
      || (host.classList.contains("mapbox-2d-host") && status.includes("mapbox 2d active"))
      || (host.classList.contains("mapbox-globe-host") && status.includes("mapbox 3d globe active"));

    if (!engineReady) return;
    host.querySelectorAll<HTMLElement>(":scope > .dual-engine-loading").forEach((loading) => loading.remove());
  });
}

function initialize(): void {
  if (!registerRuntimeOwner("map-engine-loading-cleanup", "Map engine loading-state cleanup")) return;
  removeCompletedLoadingPanels();
  subscribeToSharedDomObserver("map-engine-loading-cleanup", (mutations) => {
    if (!mutations.some((mutation) => {
      const target = mutation.target instanceof Element ? mutation.target : null;
      return Boolean(target?.closest(".dual-engine-map-shell, .mapbox-2d-host, .mapbox-globe-host, .map-dimension-status"));
    })) return;
    removeCompletedLoadingPanels();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
  initialize();
}

export {};

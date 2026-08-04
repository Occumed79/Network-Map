import { runWithoutObserverFeedback } from "./settledMutationObserver";

function removeCompletedLoadingPanels(): void {
  document.querySelectorAll<HTMLElement>(".arcgis-map-host, .mapbox-globe-host").forEach((host) => {
    const status = host
      .closest<HTMLElement>(".dual-engine-map-shell")
      ?.querySelector<HTMLElement>(".map-dimension-status")
      ?.textContent
      ?.toLowerCase() || "";

    const engineReady = host.classList.contains("ready")
      || (host.classList.contains("arcgis-map-host") && status.includes("arcgis 2d active"))
      || (host.classList.contains("mapbox-globe-host") && status.includes("mapbox 3d globe active"));

    if (!engineReady) return;
    host.querySelectorAll<HTMLElement>(":scope > .dual-engine-loading").forEach((loading) => loading.remove());
  });
}

function initialize(): void {
  removeCompletedLoadingPanels();

  const options: MutationObserverInit = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "data-state"],
  };
  const observer = new MutationObserver(() => {
    runWithoutObserverFeedback(observer, document.documentElement, options, removeCompletedLoadingPanels);
  });
  observer.observe(document.documentElement, options);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
  initialize();
}

export {};

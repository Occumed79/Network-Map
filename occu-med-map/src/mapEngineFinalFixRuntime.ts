import { runWithoutObserverFeedback } from "./settledMutationObserver";

const MAPBOX_PATCH_FLAG = "__networkMapDensityFilterPatched";
const SOURCE_PATCH_FLAG = "__networkMapDensitySourcePatched";
const MAPBOX_SCRIPT_PATCH_FLAG = "networkMapDensityPatchBound";

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

function patchNetworkOverlaySource(map: any, sourceId: string): void {
  const source = map?.getSource?.(sourceId);
  if (!source || source[SOURCE_PATCH_FLAG] || typeof source.setData !== "function") return;

  const originalSetData = source.setData.bind(source);
  source.setData = (data: any) => originalSetData(filterDensityFeatures(data));
  source[SOURCE_PATCH_FLAG] = true;
}

function patchMapboxDensityMirroring(): void {
  const MapCtor = (window as any).mapboxgl?.Map;
  const prototype = MapCtor?.prototype;
  if (!prototype || prototype[MAPBOX_PATCH_FLAG]) return;

  const originalAddSource = prototype.addSource;
  if (typeof originalAddSource !== "function") return;

  prototype.addSource = function patchedAddSource(id: string, source: any): any {
    const result = originalAddSource.call(this, id, source);
    if (id === "network-overlays") patchNetworkOverlaySource(this, id);
    return result;
  };

  prototype[MAPBOX_PATCH_FLAG] = true;
}

function bindMapboxScriptPatch(): void {
  const script = document.getElementById("network-map-mapbox-gl-sdk") as HTMLScriptElement | null;
  if (!script || script.dataset[MAPBOX_SCRIPT_PATCH_FLAG] === "true") return;
  script.dataset[MAPBOX_SCRIPT_PATCH_FLAG] = "true";
  script.addEventListener("load", patchMapboxDensityMirroring, { once: true });
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

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const button = target?.closest<HTMLButtonElement>(".map-dimension-toggle button[data-map-mode]");
  if (!button || button.disabled) return;

  patchMapboxDensityMirroring();
  const requestedMode = button.dataset.mapMode === "3d" ? "3d" : "2d";
  const isAlreadyActive = button.classList.contains("active") || button.getAttribute("aria-pressed") === "true";
  if (!isAlreadyActive) {
    document.documentElement.dataset.mapTransitionTarget = requestedMode;
  }
}, true);

const observerOptions: MutationObserverInit = {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ["class", "data-state", "aria-hidden"],
};

const observer = new MutationObserver(() => runWithoutObserverFeedback(
  observer,
  document.documentElement,
  observerOptions,
  () => {
    bindMapboxScriptPatch();
    patchMapboxDensityMirroring();
    removeFinishedLoadingPanels();
    cleanupFinishedTransition();
  },
));

function initialize(): void {
  bindMapboxScriptPatch();
  patchMapboxDensityMirroring();
  removeFinishedLoadingPanels();
  cleanupFinishedTransition();
  observer.observe(document.documentElement, observerOptions);
}

bindMapboxScriptPatch();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
  initialize();
}

export {};

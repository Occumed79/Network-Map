import { TRANSITION_SOUND_DATA_URI } from "./transitionSoundData";

const MAPBOX_PATCH_FLAG = "__networkMapDensityFilterPatched";
const SOURCE_PATCH_FLAG = "__networkMapDensitySourcePatched";
const MAPBOX_SCRIPT_PATCH_FLAG = "networkMapDensityPatchBound";

const transitionAudio = new Audio(TRANSITION_SOUND_DATA_URI);
transitionAudio.preload = "auto";
transitionAudio.volume = 0.72;
let soundStartedAt = 0;
let soundPlaying = false;

function startTransitionSound(): void {
  try {
    transitionAudio.pause();
    transitionAudio.currentTime = 0;
    soundStartedAt = Date.now();
    soundPlaying = true;
    void transitionAudio.play().catch(() => {
      soundPlaying = false;
    });
  } catch {
    soundPlaying = false;
  }
}

function stopTransitionSound(): void {
  if (!soundPlaying) return;
  soundPlaying = false;
  try {
    transitionAudio.pause();
    transitionAudio.currentTime = 0;
  } catch {
    // Audio cleanup is best-effort.
  }
}

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
    const arcgisHost = shell.querySelector<HTMLElement>(".arcgis-map-host");
    const mapboxHost = shell.querySelector<HTMLElement>(".mapbox-globe-host");

    const arcgisReady = shell.classList.contains("visible-engine-ready")
      || arcgisHost?.classList.contains("ready")
      || status.includes("arcgis 2d active")
      || Boolean(arcgisHost?.querySelector(".esri-view-root, .esri-view"));

    if (arcgisHost && arcgisReady) {
      arcgisHost.classList.add("engine-render-ready");
      arcgisHost.querySelectorAll<HTMLElement>(":scope > .dual-engine-loading").forEach((node) => node.remove());
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

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const button = target?.closest<HTMLButtonElement>(".map-dimension-toggle button[data-map-mode]");
  if (!button || button.disabled) return;

  patchMapboxDensityMirroring();
  const requestedMode = button.dataset.mapMode === "3d" ? "3d" : "2d";
  const isAlreadyActive = button.classList.contains("active") || button.getAttribute("aria-pressed") === "true";
  if (!isAlreadyActive) {
    startTransitionSound();
    document.documentElement.dataset.mapTransitionTarget = requestedMode;
  }
}, true);

const observer = new MutationObserver(() => {
  bindMapboxScriptPatch();
  patchMapboxDensityMirroring();
  removeFinishedLoadingPanels();
});

function initialize(): void {
  bindMapboxScriptPatch();
  patchMapboxDensityMirroring();
  removeFinishedLoadingPanels();
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
    attributeFilter: ["class", "data-state", "aria-hidden"],
  });

  window.setInterval(() => {
    bindMapboxScriptPatch();
    patchMapboxDensityMirroring();
    removeFinishedLoadingPanels();

    if (!soundPlaying || Date.now() - soundStartedAt < 350) return;
    const overlay = document.querySelector<HTMLElement>(".dual-engine-vortex");
    if (!overlay?.classList.contains("active")) {
      stopTransitionSound();
      delete document.documentElement.dataset.mapTransitionTarget;
    }
  }, 120);
}

bindMapboxScriptPatch();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
  initialize();
}

window.addEventListener("pagehide", stopTransitionSound);
window.addEventListener("beforeunload", stopTransitionSound);

export {};

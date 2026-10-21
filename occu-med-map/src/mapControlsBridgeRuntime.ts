import mapboxgl from "mapbox-gl";
import { registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";
import { registerRuntimeOwner, subscribeToSharedDomObserver } from "./runtimeControllerRegistry";

export type BasemapStyle = "dark-v11" | "streets-v12" | "light-v11" | "outdoors-v12" | "satellite-streets-v12";

const MAPBOX_STYLE_BY_LABEL: Record<string, BasemapStyle> = {
  dark: "dark-v11",
  streets: "streets-v12",
  light: "light-v11",
  terrain: "outdoors-v12",
  satellite: "satellite-streets-v12",
};

const LABEL_BY_STYLE: Record<BasemapStyle, string> = {
  "dark-v11": "Dark",
  "streets-v12": "Streets",
  "light-v11": "Light",
  "outdoors-v12": "Terrain",
  "satellite-streets-v12": "Satellite",
};

const trackedMaps = new Set<mapboxgl.Map>();
let selectedStyle: BasemapStyle = "streets-v12";
let userSelectedStyle = false;
let scanTimer: number | null = null;

function registerMap(instance: mapboxgl.Map): () => void {
  trackedMaps.add(instance);
  // A map created after a basemap choice (the globe is built on first use)
  // starts on the same basemap as the map the user already styled.
  if (userSelectedStyle) void switchStyle(instance, selectedStyle);
  return () => { trackedMaps.delete(instance); };
}

function mapStyleUri(style: BasemapStyle): string {
  return `mapbox://styles/mapbox/${style}`;
}

function isGlobeMap(instance: mapboxgl.Map): boolean {
  return Boolean(instance.getContainer().closest(".mapbox-globe-host"));
}

function configureProjection(instance: mapboxgl.Map, globe: boolean): void {
  try {
    instance.setProjection(globe ? "globe" : "mercator");
  } catch {
    // The selected style remains usable even if projection configuration fails.
  }

  if (!globe) return;
  try {
    instance.setFog({
      color: "rgb(185, 214, 235)",
      "high-color": "rgb(36, 92, 223)",
      "horizon-blend": 0.08,
      "space-color": "rgb(3, 7, 18)",
      "star-intensity": 0.38,
    });
  } catch {
    // Fog is decorative and should never prevent a basemap change.
  }
}

function finishStyleChange(instance: mapboxgl.Map, globe: boolean): void {
  configureProjection(instance, globe);
}
// Basemap progress belongs on the Map Tools panel's own status line, not on
// the status lines of other sections (coverage, geographic focus).
function setPanelStatus(text: string): void {
  document.querySelectorAll<HTMLElement>(".occumed-map-tools-panel > .occumed-mapbox-status").forEach((status) => {
    status.textContent = text;
  });
}

// A full style rebuild ({ diff: false }) is required: Mapbox's diffing
// setStyle path drops every runtime-added source and layer without firing
// style.load, so overlay owners never restore them (and this wait would only
// end on its timeout).
function switchStyle(instance: mapboxgl.Map, style: BasemapStyle): Promise<void> {
  return new Promise<void>((resolve) => {
    const globe = isGlobeMap(instance);
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      instance.off("style.load", finish);
      finishStyleChange(instance, globe);
      resolve();
    };

    try {
      instance.once("style.load", finish);
      // The typings mark the font options required, but Mapbox merges them
      // with the map's current values; passing them would reset them.
      instance.setStyle(mapStyleUri(style), { diff: false } as Parameters<mapboxgl.Map["setStyle"]>[1]);
      window.setTimeout(finish, 8_000);
    } catch (error) {
      console.error(`Unable to switch to the ${LABEL_BY_STYLE[style]} basemap`, error);
      finish();
    }
  });
}

function markStyleButtons(): void {
  document.querySelectorAll<HTMLButtonElement>(".occumed-map-tools-panel .occumed-mapbox-actions button").forEach((button) => {
    const style = MAPBOX_STYLE_BY_LABEL[(button.textContent || "").trim().toLowerCase()];
    if (!style) return;
    button.dataset.mapboxStyle = style;
    button.classList.toggle("active", style === selectedStyle);
    button.setAttribute("aria-pressed", String(style === selectedStyle));
  });
}

export async function applyBasemapStyle(style: BasemapStyle): Promise<void> {
  selectedStyle = style;
  userSelectedStyle = true;
  markStyleButtons();
  const label = LABEL_BY_STYLE[style];
  setPanelStatus(`Switching to ${label} map…`);

  const instances = Array.from(trackedMaps);
  if (!instances.length) {
    setPanelStatus(`${label} selected. The map is still initializing.`);
    return;
  }

  await Promise.allSettled(instances.map((instance) => switchStyle(instance, style)));

  setPanelStatus(`${label} map active.`);
}

function prepareMapToolsPanel(): void {
  const shell = document.querySelector<HTMLElement>(".dual-engine-map-shell");
  const workspaceReady = document.documentElement.dataset.occumedWorkspaceReady === "true";

  document.querySelectorAll<HTMLElement>(".occumed-map-tools-panel").forEach((panel) => {
    const sidebarOwned = workspaceReady
      || panel.dataset.sidebarDocked === "true"
      || Boolean(panel.closest(".occumed-sidebar-workspace-host"));

    // The sidebar workspace controller is the final owner once it is ready.
    // Before that point only, keep the control visible in the map shell while
    // React and the sidebar initialize. Never pull a docked panel back out.
    if (!sidebarOwned && shell && panel.parentElement !== shell) shell.appendChild(panel);

    panel.dataset.mapToolsVisible = "true";
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", "Map tools and basemap styles");
  });

  markStyleButtons();
}

function scheduleScan(delay = 0): void {
  if (scanTimer !== null) window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(() => {
    scanTimer = null;
    prepareMapToolsPanel();
  }, delay);
}

function installMapControlsBridge(): void {
  if (!registerRuntimeOwner("map-controls-bridge", "Mapbox basemap controls and Map Tools bridge")) return;

  registerMapboxMapInitializer({
    id: "map-controls-bridge",
    priority: 10,
    initialize: registerMap,
  });
  subscribeToSharedDomObserver("map-controls-bridge", (mutations) => {
    if (!mutations.some((mutation) => {
      const target = mutation.target instanceof Element ? mutation.target : null;
      return Boolean(target?.closest(".occumed-map-tools-panel, .dual-engine-map-shell, .sidebar, .occumed-sidebar-workspace-host"));
    })) return;
    scheduleScan(20);
  });
  scheduleScan();
  window.setTimeout(() => scheduleScan(), 250);
  window.setTimeout(() => scheduleScan(), 1_000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", installMapControlsBridge, { once: true });
} else {
  installMapControlsBridge();
}

export {};

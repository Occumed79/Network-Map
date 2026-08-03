import L from "leaflet";

type MapMode = "2d" | "3d";
type GlobeBridge = {
  getMode: () => MapMode;
  setMode: (mode: MapMode) => Promise<void>;
  sync: () => void;
};

declare global {
  interface Window {
    __NETWORK_MAP_GLOBE__?: GlobeBridge;
  }
}

const ARCGIS_WORLD_TOPO = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";
const BRIDGE_PATCH_FLAG = "networkMapArcgisLeaflet2dPatched";
const previousTileLayer = L.tileLayer.bind(L);
let visibleMode: MapMode = "2d";
let resizeQueued = false;

function isLegacyBaseTemplate(template: unknown): template is string {
  if (typeof template !== "string") return false;
  return template.includes("tile.openstreetmap.org")
    || template.includes("api.mapbox.com/styles")
    || template.includes("basemaps.cartocdn.com");
}

// The canonical Leaflet map already owns all real map data and interactions.
// Render it with the public ArcGIS World Topographic tile service instead of
// creating a second ArcGIS MapView that can stall on SDK/basemap credentials.
(L as any).tileLayer = (template: string, options: L.TileLayerOptions = {}) => {
  if (!isLegacyBaseTemplate(template)) return previousTileLayer(template, options);

  return new L.TileLayer(ARCGIS_WORLD_TOPO, {
    ...options,
    maxZoom: Math.min(Number(options.maxZoom ?? 19), 19),
    maxNativeZoom: 19,
    updateWhenZooming: false,
    updateWhenIdle: true,
    keepBuffer: 1,
    crossOrigin: true,
    attribution: "Tiles © Esri — Source: Esri, HERE, Garmin, FAO, NOAA, USGS, OpenStreetMap contributors",
  });
};

function setText(node: HTMLElement | null, value: string): void {
  if (node && node.textContent !== value) node.textContent = value;
}

function setAttribute(node: Element | null, name: string, value: string): void {
  if (node && node.getAttribute(name) !== value) node.setAttribute(name, value);
}

function queueResize(): void {
  if (resizeQueued) return;
  resizeQueued = true;
  window.requestAnimationFrame(() => {
    resizeQueued = false;
    window.dispatchEvent(new Event("resize"));
  });
}

function updateButtons(shell: HTMLElement, mode: MapMode): void {
  shell.querySelectorAll<HTMLButtonElement>(".map-dimension-toggle button[data-map-mode]").forEach((button) => {
    const active = button.dataset.mapMode === mode;
    if (button.classList.contains("active") !== active) button.classList.toggle("active", active);
    setAttribute(button, "aria-pressed", String(active));
  });
}

function showLeafletArcgis2d(shell: HTMLElement): void {
  shell.classList.add("arcgis-leaflet-2d", "visible-engine-ready");
  shell.classList.remove("mapbox-globe-active", "arcgis-globe-active", "mapbox-globe-preparing");

  const arcgisHost = shell.querySelector<HTMLElement>(".arcgis-map-host");
  const mapboxHost = shell.querySelector<HTMLElement>(".mapbox-globe-host");
  const status = shell.querySelector<HTMLElement>(".map-dimension-status");

  arcgisHost?.classList.add("ready", "engine-render-ready");
  arcgisHost?.querySelectorAll<HTMLElement>(".dual-engine-loading").forEach((node) => node.remove());
  setAttribute(arcgisHost, "aria-hidden", "true");
  setAttribute(mapboxHost, "aria-hidden", "true");

  setText(status, "ArcGIS 2D active");
  if (status && status.dataset.state !== "normal") status.dataset.state = "normal";
  updateButtons(shell, "2d");
  queueResize();
}

function showMapbox3d(shell: HTMLElement): void {
  shell.classList.add("mapbox-globe-active");
  const mapboxHost = shell.querySelector<HTMLElement>(".mapbox-globe-host");
  setAttribute(mapboxHost, "aria-hidden", "false");
  updateButtons(shell, "3d");
}

function shells(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(".dual-engine-map-shell"));
}

function applyVisibleMode(): void {
  for (const shell of shells()) {
    if (visibleMode === "2d") showLeafletArcgis2d(shell);
    else showMapbox3d(shell);
  }
}

function patchBridge(): void {
  const bridge = window.__NETWORK_MAP_GLOBE__ as (GlobeBridge & Record<string, unknown>) | undefined;
  if (!bridge || bridge[BRIDGE_PATCH_FLAG]) return;

  const originalSetMode = bridge.setMode.bind(bridge);
  const originalSync = bridge.sync.bind(bridge);

  bridge.getMode = () => visibleMode;
  bridge.setMode = async (nextMode: MapMode) => {
    if (nextMode === "2d") {
      visibleMode = "2d";
      applyVisibleMode();
      originalSync();
      return;
    }

    visibleMode = "3d";
    try {
      await originalSetMode("3d");
      applyVisibleMode();
    } catch (error) {
      visibleMode = "2d";
      applyVisibleMode();
      throw error;
    }
  };
  bridge.sync = originalSync;
  bridge[BRIDGE_PATCH_FLAG] = true;
}

function initialize(): void {
  patchBridge();
  applyVisibleMode();

  const observer = new MutationObserver(() => {
    patchBridge();
    applyVisibleMode();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "data-state", "aria-hidden"],
    characterData: true,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
  initialize();
}

export {};

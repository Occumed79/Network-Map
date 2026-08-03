import L from "leaflet";

type MapMode = "2d" | "3d";
type GlobeBridge = { getMode: () => MapMode; setMode: (mode: MapMode) => Promise<void>; sync: () => void };
declare global { interface Window { __NETWORK_MAP_GLOBE__?: GlobeBridge } }

const TOPO = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";
const PATCHED = "networkMapArcgisLeaflet2dPatched";
const originalTileLayer = L.tileLayer.bind(L);
let mode: MapMode = "2d";
let attempts = 0;
let resizePending = false;

function baseTemplate(url: unknown): url is string {
  return typeof url === "string" && (url.includes("tile.openstreetmap.org") || url.includes("api.mapbox.com/styles") || url.includes("basemaps.cartocdn.com"));
}

(L as any).tileLayer = (url: string, options: L.TileLayerOptions = {}) => baseTemplate(url)
  ? new L.TileLayer(TOPO, { ...options, maxZoom: Math.min(Number(options.maxZoom ?? 19), 19), maxNativeZoom: 19, updateWhenZooming: false, updateWhenIdle: true, keepBuffer: 1, crossOrigin: true, attribution: "Tiles © Esri — Source: Esri, HERE, Garmin, FAO, NOAA, USGS, OpenStreetMap contributors" })
  : originalTileLayer(url, options);

function attr(node: Element | null, name: string, value: string): void {
  if (node && node.getAttribute(name) !== value) node.setAttribute(name, value);
}

function resizeOnce(): void {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => { resizePending = false; window.dispatchEvent(new Event("resize")); });
}

function render(shell: HTMLElement, next: MapMode): void {
  const was2d = shell.classList.contains("arcgis-leaflet-2d") && !shell.classList.contains("mapbox-globe-active");
  shell.classList.add("arcgis-leaflet-2d", "visible-engine-ready");
  shell.classList.toggle("mapbox-globe-active", next === "3d");
  shell.classList.remove("arcgis-globe-active", "mapbox-globe-preparing");

  const arcgis = shell.querySelector<HTMLElement>(".arcgis-map-host");
  const mapbox = shell.querySelector<HTMLElement>(".mapbox-globe-host");
  const status = shell.querySelector<HTMLElement>(".map-dimension-status");
  arcgis?.querySelectorAll<HTMLElement>(".dual-engine-loading").forEach(node => node.remove());
  attr(arcgis, "aria-hidden", "true");
  attr(mapbox, "aria-hidden", next === "3d" ? "false" : "true");

  if (next === "2d" && status?.textContent !== "ArcGIS 2D active") status.textContent = "ArcGIS 2D active";
  shell.querySelectorAll<HTMLButtonElement>(".map-dimension-toggle button[data-map-mode]").forEach(button => {
    const active = button.dataset.mapMode === next;
    if (button.classList.contains("active") !== active) button.classList.toggle("active", active);
    attr(button, "aria-pressed", String(active));
  });
  if (next === "2d" && !was2d) resizeOnce();
}

function apply(): boolean {
  const shells = Array.from(document.querySelectorAll<HTMLElement>(".dual-engine-map-shell"));
  shells.forEach(shell => render(shell, mode));
  return shells.length > 0;
}

function patch(): boolean {
  const bridge = window.__NETWORK_MAP_GLOBE__ as (GlobeBridge & Record<string, unknown>) | undefined;
  if (!bridge) return false;
  if (bridge[PATCHED]) return true;
  const setMode = bridge.setMode.bind(bridge);
  const sync = bridge.sync.bind(bridge);
  bridge.getMode = () => mode;
  bridge.setMode = async next => {
    if (next === "2d") { mode = "2d"; apply(); sync(); return; }
    mode = "3d";
    try { await setMode("3d"); apply(); }
    catch (error) { mode = "2d"; apply(); throw error; }
  };
  bridge[PATCHED] = true;
  return true;
}

function boot(): void {
  attempts += 1;
  if (patch() && apply()) return;
  if (attempts < 120) window.setTimeout(boot, 50);
  else console.error("Network Map map shell did not mount within 6 seconds");
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
else boot();

export {};

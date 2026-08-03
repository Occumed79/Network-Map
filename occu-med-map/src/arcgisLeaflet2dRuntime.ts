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

const PATCH_FLAG = "networkMapStableLeaflet2dPatched";
let visibleMode: MapMode = "2d";
let attempts = 0;
let resizeQueued = false;

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

function applyMode(shell: HTMLElement, mode: MapMode): void {
  const wasLeafletVisible = shell.classList.contains("arcgis-leaflet-2d")
    && !shell.classList.contains("mapbox-globe-active");

  shell.classList.add("arcgis-leaflet-2d", "visible-engine-ready");
  shell.classList.toggle("mapbox-globe-active", mode === "3d");
  shell.classList.remove("arcgis-globe-active", "mapbox-globe-preparing");

  const arcgisHost = shell.querySelector<HTMLElement>(".arcgis-map-host");
  const mapboxHost = shell.querySelector<HTMLElement>(".mapbox-globe-host");
  const status = shell.querySelector<HTMLElement>(".map-dimension-status");

  arcgisHost?.querySelectorAll<HTMLElement>(".dual-engine-loading").forEach((node) => node.remove());
  setAttribute(arcgisHost, "aria-hidden", "true");
  setAttribute(mapboxHost, "aria-hidden", mode === "3d" ? "false" : "true");

  if (status) {
    const message = mode === "3d" ? "Mapbox 3D globe active" : "2D map active";
    if (status.textContent !== message) status.textContent = message;
    if (status.dataset.state !== "normal") status.dataset.state = "normal";
  }

  shell.querySelectorAll<HTMLButtonElement>(".map-dimension-toggle button[data-map-mode]").forEach((button) => {
    const active = button.dataset.mapMode === mode;
    if (button.classList.contains("active") !== active) button.classList.toggle("active", active);
    setAttribute(button, "aria-pressed", String(active));
  });

  if (mode === "2d" && !wasLeafletVisible) queueResize();
}

function applyVisibleMode(): boolean {
  const shells = Array.from(document.querySelectorAll<HTMLElement>(".dual-engine-map-shell"));
  shells.forEach((shell) => applyMode(shell, visibleMode));
  return shells.length > 0;
}

function patchBridge(): boolean {
  const bridge = window.__NETWORK_MAP_GLOBE__ as (GlobeBridge & Record<string, unknown>) | undefined;
  if (!bridge) return false;
  if (bridge[PATCH_FLAG]) return true;

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

  bridge[PATCH_FLAG] = true;
  return true;
}

function boot(): void {
  attempts += 1;
  const bridgeReady = patchBridge();
  const shellReady = applyVisibleMode();
  if (bridgeReady && shellReady) return;
  if (attempts < 100) window.setTimeout(boot, 100);
}

boot();

export {};

import { registerMapboxMap, unregisterMapboxMap } from "./mapboxMapLifecycleRuntime";
import { findCompatPopupHit, wasCompatibilityClickHandled } from "./mapboxCompatInteractionRuntime";
import mapboxgl from "mapbox-gl";

type MapMode = "2d" | "3d";
type InitialCamera = { center?: [number, number]; zoom?: number };
type SharedCamera = { lng: number; lat: number; zoom2d: number };

declare global {
  interface Window {
    __NETWORK_MAP_GLOBE__?: {
      getMode: () => MapMode;
      setMode: (mode: MapMode) => Promise<void>;
      sync: () => void;
    };
  }
}

// Keep the bundled Mapbox GL instance available to optional hardening runtimes.
// Both visible surfaces use this exact package instance.
(window as any).mapboxgl = mapboxgl;

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "";
const MAPBOX_2D_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN_2 || "";
const MAP_LOAD_TIMEOUT_MS = 30_000;

let currentMode: MapMode = "2d";
let mapContainer: HTMLElement | null = null;
let mapWrap: HTMLElement | null = null;
let mapbox2dHost: HTMLDivElement | null = null;
let mapboxGlobeHost: HTMLDivElement | null = null;
let toggleControl: HTMLDivElement | null = null;
let statusNode: HTMLSpanElement | null = null;

let mapbox2dViewPromise: Promise<void> | null = null;
let mapboxGlobeViewPromise: Promise<void> | null = null;
let mapbox2dMap: mapboxgl.Map | null = null;
let mapboxGlobeMap: mapboxgl.Map | null = null;
let mapResizeObserver: ResizeObserver | null = null;
let mapResizeFrame = 0;
let initialized = false;
let sharedCamera: SharedCamera = { lng: 0, lat: 20, zoom2d: 2 };

export async function initializeDualMapEngines(container: HTMLElement, initial: InitialCamera = {}): Promise<void> {
  if (initialized) return;
  initialized = true;
  mapContainer = container;
  const center = initial.center || [0, 20];
  sharedCamera = {
    lng: Number(center[0]) || 0,
    lat: Number(center[1]) || 0,
    zoom2d: Number.isFinite(Number(initial.zoom)) ? Number(initial.zoom) : 2,
  };

  mapWrap = container.parentElement;
  if (!mapWrap) {
    initialized = false;
    throw new Error("Mapbox map wrapper did not initialize");
  }
  if (mapWrap.classList.contains("dual-engine-map-shell")) return;

  mapWrap.classList.add("dual-engine-map-shell");
  container.classList.add("map-scene-layer-host");

  mapbox2dHost = document.createElement("div");
  mapbox2dHost.className = "mapbox-2d-host";
  mapbox2dHost.setAttribute("aria-label", "Mapbox two-dimensional map");
  mapbox2dHost.innerHTML = loadingMarkup("Starting Mapbox 2D map", "Loading the Mapbox streets basemap…");

  mapboxGlobeHost = document.createElement("div");
  mapboxGlobeHost.className = "mapbox-globe-host";
  mapboxGlobeHost.setAttribute("aria-hidden", "true");
  mapboxGlobeHost.setAttribute("aria-label", "Mapbox three-dimensional globe");
  mapboxGlobeHost.innerHTML = loadingMarkup("Starting Mapbox 3D globe", "Building the globe, atmosphere, and network layers…");

  toggleControl = document.createElement("div");
  toggleControl.className = "map-dimension-toggle";
  toggleControl.setAttribute("role", "group");
  toggleControl.setAttribute("aria-label", "Map dimension");
  toggleControl.innerHTML = `
    <button type="button" class="active" data-map-mode="2d" aria-pressed="true" title="Use the Mapbox 2D map">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/></svg>
      <span><strong>2D Map</strong><small>Mapbox</small></span>
    </button>
    <button type="button" data-map-mode="3d" aria-pressed="false" title="Open the Mapbox 3D globe">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4.5 6 4.5 9S15 18 12 21c-3-3-4.5-6-4.5-9S9 6 12 3Z"/></svg>
      <span><strong>3D Globe</strong><small>Mapbox</small></span>
    </button>
    <span class="map-dimension-status" aria-live="polite">Loading Mapbox 2D…</span>
  `;
  statusNode = toggleControl.querySelector(".map-dimension-status");

  mapWrap.append(mapbox2dHost, mapboxGlobeHost, toggleControl);
  observeMapSize();

  try {
    await ensureMapbox2d();
    mapWrap.classList.add("visible-engine-ready");
    setStatus("Mapbox 2D active");
    emitCameraState(mapbox2dMap, "2d");
  } catch (error) {
    console.error("Mapbox 2D map failed", error);
    showMapbox2dError(error);
    setStatus(`Mapbox 2D unavailable · ${errorMessage(error)}`, "error");
  }
}

function showMapbox2dError(error: unknown): void {
  if (!mapbox2dHost) return;
  mapbox2dHost.classList.remove("ready", "engine-render-ready");
  mapbox2dHost.innerHTML = `<div class="mapbox-load-error" role="status"><strong>Mapbox 2D map unavailable</strong><small>${escapeHtml(errorMessage(error))}</small><button type="button">Retry Mapbox</button></div>`;
  mapbox2dHost.querySelector("button")?.addEventListener("click", () => {
    if (!mapbox2dHost) return;
    mapbox2dHost.innerHTML = loadingMarkup("Starting Mapbox 2D map", "Loading the Mapbox streets basemap…");
    setStatus("Retrying Mapbox 2D…", "loading");
    void ensureMapbox2d().then(() => {
      setStatus("Mapbox 2D active");
      emitCameraState(mapbox2dMap, "2d");
    }).catch((nextError) => {
      showMapbox2dError(nextError);
      setStatus(`Mapbox 2D unavailable · ${errorMessage(nextError)}`, "error");
    });
  }, { once: true });
}

function escapeHtml(value: string): string {
  const node = document.createElement("span");
  node.textContent = value;
  return node.innerHTML;
}

function observeMapSize(): void {
  mapResizeObserver?.disconnect();
  if (!mapWrap || typeof ResizeObserver === "undefined") return;
  mapResizeObserver = new ResizeObserver((entries) => {
    const size = entries[0]?.contentRect;
    if (!size || size.width <= 0 || size.height <= 0) return;
    window.cancelAnimationFrame(mapResizeFrame);
    mapResizeFrame = window.requestAnimationFrame(() => {
      if (currentMode === "2d") mapbox2dMap?.resize();
      else mapboxGlobeMap?.resize();
    });
  });
  mapResizeObserver.observe(mapWrap);
}

function loadingMarkup(title: string, detail: string): string {
  return `
    <div class="dual-engine-loading" role="status">
      <span class="dual-engine-spinner" aria-hidden="true"></span>
      <strong>${title}</strong>
      <small>${detail}</small>
    </div>
  `;
}

function setStatus(message: string, state: "normal" | "loading" | "error" = "normal"): void {
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.dataset.state = state;
}

function updateToggle(): void {
  toggleControl?.querySelectorAll<HTMLButtonElement>("button[data-map-mode]").forEach((button) => {
    const selected = button.dataset.mapMode === currentMode;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

async function setMode(nextMode: MapMode): Promise<void> {
  if (!mapWrap || !mapbox2dHost || !mapboxGlobeHost) return;
  if (nextMode === currentMode && (nextMode === "2d" ? mapbox2dMap : mapboxGlobeMap)) return;

  captureCamera(currentMode === "2d" ? mapbox2dMap : mapboxGlobeMap, currentMode);

  if (nextMode === "3d") {
    setStatus("Loading Mapbox 3D…", "loading");
    mapWrap.classList.add("mapbox-globe-active", "mapbox-globe-loading");
    mapbox2dHost.setAttribute("aria-hidden", "true");
    mapboxGlobeHost.setAttribute("aria-hidden", "false");

    try {
      await nextPaint();
      await ensureMapboxGlobe();
      currentMode = "3d";
      mapWrap.classList.remove("mapbox-globe-loading");
      updateToggle();
      mapboxGlobeMap?.resize();
      applySharedCamera(mapboxGlobeMap, "3d", false);
      setStatus("Mapbox 3D globe active");
      return;
    } catch (error) {
      mapWrap.classList.remove("mapbox-globe-active", "mapbox-globe-loading");
      mapbox2dHost.setAttribute("aria-hidden", "false");
      mapboxGlobeHost.setAttribute("aria-hidden", "true");
      currentMode = "2d";
      updateToggle();
      setStatus(`Mapbox 3D unavailable · ${errorMessage(error)}`, "error");
      throw error;
    }
  }

  setStatus("Loading Mapbox 2D…", "loading");
  await ensureMapbox2d();
  currentMode = "2d";
  mapWrap.classList.remove("mapbox-globe-active", "mapbox-globe-loading");
  mapbox2dHost.setAttribute("aria-hidden", "false");
  mapboxGlobeHost.setAttribute("aria-hidden", "true");
  updateToggle();
  mapbox2dMap?.resize();
  applySharedCamera(mapbox2dMap, "2d", false);
  setStatus("Mapbox 2D active");
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });
}

async function ensureMapbox2d(): Promise<void> {
  if (mapbox2dMap) return;
  if (mapbox2dViewPromise) return mapbox2dViewPromise;
  mapbox2dViewPromise = createMapboxMap("2d");
  try {
    await mapbox2dViewPromise;
  } catch (error) {
    destroyMapbox2dView();
    mapbox2dViewPromise = null;
    throw error;
  }
}

async function ensureMapboxGlobe(): Promise<void> {
  if (mapboxGlobeMap) return;
  if (mapboxGlobeViewPromise) return mapboxGlobeViewPromise;
  mapboxGlobeViewPromise = createMapboxMap("3d");
  try {
    await mapboxGlobeViewPromise;
  } catch (error) {
    destroyMapboxGlobeView();
    mapboxGlobeViewPromise = null;
    throw error;
  }
}

async function createMapboxMap(mode: MapMode): Promise<void> {
  const is2d = mode === "2d";
  const token = is2d ? MAPBOX_2D_TOKEN : MAPBOX_TOKEN;
  const host = is2d ? mapbox2dHost : mapboxGlobeHost;
  if (!token) throw new Error(is2d ? "VITE_MAPBOX_TOKEN_2 is not configured" : "VITE_MAPBOX_TOKEN is not configured");
  if (!host) throw new Error("Mapbox map host did not initialize");

  const instance = new mapboxgl.Map({
    container: host,
    accessToken: token,
    style: is2d ? "mapbox://styles/mapbox/streets-v12" : "mapbox://styles/mapbox/standard",
    projection: is2d ? "mercator" : "globe",
    center: [sharedCamera.lng, sharedCamera.lat],
    zoom: is2d ? sharedCamera.zoom2d : globeZoomFromMapZoom(sharedCamera.zoom2d),
    pitch: is2d ? 0 : 24,
    bearing: is2d ? 0 : -12,
    minZoom: is2d ? 1 : 0.55,
    maxZoom: 17,
    antialias: true,
    attributionControl: true,
    renderWorldCopies: false,
    dragRotate: !is2d,
    pitchWithRotate: !is2d,
  });
  registerMapboxMap(instance, { mode });

  if (is2d) mapbox2dMap = instance;
  else mapboxGlobeMap = instance;

  instance.addControl(new mapboxgl.NavigationControl({ visualizePitch: !is2d }), "top-left");
  instance.scrollZoom.setWheelZoomRate(1 / 600);
  instance.scrollZoom.setZoomRate(1 / 180);

  if (!is2d) instance.on("style.load", () => configureGlobe(instance));

  await waitForMapReady(instance, is2d ? "Mapbox 2D map" : "Mapbox 3D globe");

  if (!is2d) configureGlobe(instance);
  installMapboxInteractions(instance, mode);
  host.classList.add("ready", "engine-render-ready");
  host.querySelectorAll<HTMLElement>(":scope > .dual-engine-loading").forEach((node) => node.remove());

  instance.on("moveend", () => {
    if (currentMode !== mode) return;
    captureCamera(instance, mode);
    emitCameraState(instance, mode);
  });
}

function configureGlobe(instance: mapboxgl.Map): void {
  try {
    instance.setProjection("globe");
  } catch (error) {
    console.warn("Mapbox globe projection could not be applied", error);
  }

  try {
    instance.setFog({
      color: "rgb(185, 214, 235)",
      "high-color": "rgb(36, 92, 223)",
      "horizon-blend": 0.08,
      "space-color": "rgb(3, 7, 18)",
      "star-intensity": 0.38,
    });
  } catch (error) {
    console.warn("Mapbox globe atmosphere could not be applied", error);
  }
}

function waitForMapReady(instance: mapboxgl.Map, label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => finish(new Error(`${label} timed out`)), MAP_LOAD_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timeout);
      instance.off("load", onReady);
      instance.off("style.load", onReady);
      instance.off("error", onError);
    };

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };

    const onReady = () => finish();
    const onError = (event: mapboxgl.ErrorEvent) => {
      if (instance.isStyleLoaded()) return;
      finish(new Error(event?.error?.message || `${label} failed to load`));
    };

    instance.on("load", onReady);
    instance.on("style.load", onReady);
    instance.on("error", onError);
    if (instance.loaded() || instance.isStyleLoaded()) queueMicrotask(onReady);
  });
}

function installMapboxInteractions(instance: mapboxgl.Map, mode: MapMode): void {
  instance.on("click", (event) => {
    if (currentMode !== mode) return;
    const layers = ["network-points", "network-lines", "network-fills"].filter((id) => Boolean(instance.getLayer(id)));
    const features = layers.length ? instance.queryRenderedFeatures(event.point, { layers }) : [];
    const html = String(features[0]?.properties?.popupHtml || "");
    if (html) {
      new mapboxgl.Popup({ closeButton: true }).setLngLat(event.lngLat).setHTML(html).addTo(instance);
      return;
    }

    const compatibilityPopupHit = findCompatPopupHit(instance, event.point, event.lngLat);
    if (compatibilityPopupHit || wasCompatibilityClickHandled(event.originalEvent)) return;

    const overlayHit = instance.queryRenderedFeatures(event.point).some((feature) => {
      const layerId = String(feature.layer?.id || "");
      const properties = feature.properties || {};
      const compatibilityFeature = properties.__compatLayerId !== undefined
        && properties.__compatLayerId !== null
        && properties.__interactive !== false;
      return compatibilityFeature || layerId === "provider-location-search-dots";
    });
    if (overlayHit) return;

    const detail = { lat: event.lngLat.lat, lng: event.lngLat.lng, originalEvent: event.originalEvent, mode };
    window.dispatchEvent(new CustomEvent("network-map:native-click", { detail }));
    window.dispatchEvent(new CustomEvent("network-map:scene-click", { detail }));
  });

  instance.on("dblclick", (event) => {
    if (currentMode !== mode) return;
    event.preventDefault();
    const detail = { lat: event.lngLat.lat, lng: event.lngLat.lng, originalEvent: event.originalEvent, mode };
    window.dispatchEvent(new CustomEvent("network-map:native-dblclick", { detail }));
    window.dispatchEvent(new CustomEvent("network-map:scene-dblclick", { detail }));
  });
}

function globeZoomFromMapZoom(zoom: number): number {
  const safeZoom = Number.isFinite(zoom) ? zoom : 2;
  return Math.max(0.75, safeZoom - (safeZoom <= 4 ? 0.75 : 0.35));
}

function mapZoomFromGlobe(zoom: number): number {
  const safeZoom = Number.isFinite(zoom) ? zoom : 1.25;
  return safeZoom + (safeZoom <= 3.25 ? 0.75 : 0.35);
}

function captureCamera(instance: mapboxgl.Map | null, mode: MapMode): void {
  if (!instance) return;
  const center = instance.getCenter();
  const rawZoom = Number(instance.getZoom());
  sharedCamera = {
    lng: center.lng,
    lat: center.lat,
    zoom2d: Math.max(1, Math.min(17, mode === "3d" ? mapZoomFromGlobe(rawZoom) : rawZoom)),
  };
}

function applySharedCamera(instance: mapboxgl.Map | null, mode: MapMode, animate: boolean): void {
  if (!instance) return;
  const camera: mapboxgl.CameraOptions & mapboxgl.AnimationOptions = {
    center: [sharedCamera.lng, sharedCamera.lat],
    zoom: mode === "2d" ? sharedCamera.zoom2d : globeZoomFromMapZoom(sharedCamera.zoom2d),
    pitch: mode === "3d" ? 24 : 0,
    bearing: mode === "3d" ? -12 : 0,
  };
  if (animate) instance.easeTo({ ...camera, duration: 650 });
  else instance.jumpTo(camera);
  emitCameraState(instance, mode);
}

function emitCameraState(instance: mapboxgl.Map | null, mode: MapMode): void {
  if (!instance) return;
  const center = instance.getCenter();
  const zoom2d = mode === "3d" ? mapZoomFromGlobe(Number(instance.getZoom())) : Number(instance.getZoom());
  window.dispatchEvent(new CustomEvent("network-map:native-camera", {
    detail: { lat: center.lat, lng: center.lng, zoom: zoom2d, mode },
  }));
}

function syncActiveCamera(): void {
  const instance = currentMode === "2d" ? mapbox2dMap : mapboxGlobeMap;
  captureCamera(instance, currentMode);
  emitCameraState(instance, currentMode);
  instance?.resize();
}

function destroyMapbox2dView(): void {
  const instance = mapbox2dMap;
  mapbox2dMap = null;
  mapbox2dViewPromise = null;
  if (instance) {
    unregisterMapboxMap(instance);
    instance.remove();
  }
  mapbox2dHost?.classList.remove("ready", "engine-render-ready");
}

function destroyMapboxGlobeView(): void {
  const instance = mapboxGlobeMap;
  mapboxGlobeMap = null;
  mapboxGlobeViewPromise = null;
  if (instance) {
    unregisterMapboxMap(instance);
    instance.remove();
  }
  mapboxGlobeHost?.classList.remove("ready", "engine-render-ready");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export function cleanupDualMapEngines(): void {
  window.cancelAnimationFrame(mapResizeFrame);
  mapResizeObserver?.disconnect();
  mapResizeObserver = null;
  destroyMapbox2dView();
  destroyMapboxGlobeView();
  toggleControl?.remove();
  mapbox2dHost?.remove();
  mapboxGlobeHost?.remove();
  mapContainer?.classList.remove("map-scene-layer-host");
  mapWrap?.classList.remove("dual-engine-map-shell", "visible-engine-ready", "mapbox-globe-active", "mapbox-globe-loading");
  mapContainer = null;
  mapWrap = null;
  mapbox2dHost = null;
  mapboxGlobeHost = null;
  toggleControl = null;
  statusNode = null;
  currentMode = "2d";
  initialized = false;
}

window.__NETWORK_MAP_GLOBE__ = {
  getMode: () => currentMode,
  setMode,
  sync: syncActiveCamera,
};

window.addEventListener("beforeunload", cleanupDualMapEngines);

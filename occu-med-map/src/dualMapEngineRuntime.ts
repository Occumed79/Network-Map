import L from "leaflet";

type MapMode = "2d" | "3d";
declare global {
  interface Window {
    mapboxgl?: any;
    __NETWORK_MAP_GLOBE__?: {
      getMode: () => MapMode;
      setMode: (mode: MapMode) => Promise<void>;
      sync: () => void;
    };
  }
}

const MAPBOX_VERSION = "3.25.0";
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "";
const MAPBOX_2D_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN_2 || "";
const MAX_MIRRORED_FEATURES = 12_000;

let canonicalMap: L.Map | null = null;
let currentMode: MapMode = "2d";
let mapWrap: HTMLElement | null = null;
let mapbox2dHost: HTMLDivElement | null = null;
let mapboxHost: HTMLDivElement | null = null;
let toggleControl: HTMLDivElement | null = null;
let statusNode: HTMLSpanElement | null = null;

let mapboxLoaderPromise: Promise<void> | null = null;
let mapbox2dViewPromise: Promise<void> | null = null;
let mapboxViewPromise: Promise<void> | null = null;

let mapbox2dMap: any = null;
let mapboxMap: any = null;
let syncTimer: number | null = null;
let periodicTimer: number | null = null;
let lastEngineDrivenLeafletMove = 0;
let mapResizeObserver: ResizeObserver | null = null;
let mapResizeFrame = 0;

const originalMapFactory = L.map.bind(L);
(L as any).map = (element: string | HTMLElement, options?: L.MapOptions) => {
  const map = originalMapFactory(element, options);
  canonicalMap = map;
  map.whenReady(() => {
    void initializeDualEngines(map);
  });
  return map;
};

async function initializeDualEngines(map: L.Map): Promise<void> {
  const mapContainer = map.getContainer();
  mapWrap = mapContainer.parentElement;
  if (!mapWrap || mapWrap.classList.contains("dual-engine-map-shell")) return;

  mapWrap.classList.add("dual-engine-map-shell");
  mapContainer.classList.add("canonical-leaflet-controller");

  mapbox2dHost = document.createElement("div");
  mapbox2dHost.className = "mapbox-2d-host";
  mapbox2dHost.setAttribute("aria-label", "Mapbox two-dimensional map");
  mapbox2dHost.innerHTML = loadingMarkup("Starting Mapbox 2D map", "Loading the Mapbox streets basemap…");

  mapboxHost = document.createElement("div");
  mapboxHost.className = "mapbox-globe-host";
  mapboxHost.setAttribute("aria-hidden", "true");
  mapboxHost.innerHTML = loadingMarkup("Starting Mapbox 3D globe", "Building atmosphere and network layers…");

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

  mapWrap.append(mapbox2dHost, mapboxHost, toggleControl);
  map.on("layeradd layerremove overlayadd overlayremove", queueOverlaySync);
  map.on("moveend zoomend", onCanonicalViewChanged);
  map.once("unload", cleanupDualEngines);
  observeMapSize();

  try {
    await ensureMapbox2d();
    mapWrap.classList.add("visible-engine-ready");
    syncAllOverlays();
    setStatus("Mapbox 2D active");
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
      mapbox2dHost?.classList.add("ready", "engine-render-ready");
      syncAllOverlays();
      setStatus("Mapbox 2D active");
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
      if (currentMode === "2d") mapbox2dMap?.resize?.();
      else mapboxMap?.resize?.();
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
  if (!canonicalMap || !mapWrap || !mapbox2dHost || !mapboxHost) return;

  if (nextMode === "3d") {
    setStatus("Loading Mapbox 3D…", "loading");
    await ensureMapboxGlobe();
    currentMode = "3d";
    mapWrap.classList.add("mapbox-globe-active");
    mapbox2dHost.setAttribute("aria-hidden", "true");
    mapboxHost.setAttribute("aria-hidden", "false");
    updateToggle();
    mapboxMap?.resize?.();
    syncMapboxCameraFromLeaflet(false);
    syncAllOverlays();
    startPeriodicSync();
    setStatus("Mapbox 3D globe active");
    return;
  }

  setStatus("Loading Mapbox 2D…", "loading");
  stopPeriodicSync();
  await ensureMapbox2d();
  currentMode = "2d";
  mapWrap.classList.remove("mapbox-globe-active");
  mapbox2dHost.setAttribute("aria-hidden", "false");
  mapboxHost.setAttribute("aria-hidden", "true");
  updateToggle();
  mapbox2dMap?.resize?.();
  syncMapbox2dCameraFromLeaflet(false);
  syncAllOverlays();
  setStatus("Mapbox 2D active");
}

async function ensureMapbox2d(): Promise<void> {
  if (mapbox2dMap) return;
  if (mapbox2dViewPromise) return mapbox2dViewPromise;
  mapbox2dViewPromise = createMapboxMap("2d");
  try {
    await mapbox2dViewPromise;
  } catch (error) {
    mapbox2dMap?.remove?.();
    mapbox2dMap = null;
    mapbox2dViewPromise = null;
    throw error;
  }
}

async function createMapboxMap(mode: MapMode): Promise<void> {
  const is2d = mode === "2d";
  const token = is2d ? MAPBOX_2D_TOKEN : MAPBOX_TOKEN;
  const host = is2d ? mapbox2dHost : mapboxHost;
  if (!token) throw new Error(is2d ? "VITE_MAPBOX_TOKEN_2 is not configured" : "VITE_MAPBOX_TOKEN is not configured");
  await loadMapboxSdk();
  if (!window.mapboxgl || !host || !canonicalMap) throw new Error("Mapbox GL JS did not initialize");
  window.mapboxgl.accessToken = token;
  const center = canonicalMap.getCenter();
  const instance = new window.mapboxgl.Map({
    container: host,
    accessToken: token,
    style: is2d ? "mapbox://styles/mapbox/streets-v12" : "mapbox://styles/mapbox/standard",
    projection: is2d ? "mercator" : "globe",
    center: [center.lng, center.lat],
    zoom: is2d ? canonicalMap.getZoom() : Math.max(1.2, canonicalMap.getZoom()),
    minZoom: 1,
    maxZoom: 17,
    antialias: true,
    attributionControl: true,
    renderWorldCopies: false,
  });
  if (is2d) mapbox2dMap = instance;
  else mapboxMap = instance;
  instance.addControl(new window.mapboxgl.NavigationControl({ visualizePitch: !is2d }), "top-left");
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(`Mapbox ${is2d ? "2D map" : "globe"} timed out`)), 25_000);
    instance.once("load", () => { window.clearTimeout(timeout); resolve(); });
    instance.once("error", (event: any) => {
      if (!instance.loaded?.()) { window.clearTimeout(timeout); reject(event?.error || new Error("Mapbox failed to load")); }
    });
  });
  installMapboxOverlayLayers(instance);
  host.classList.add("ready", "engine-render-ready");
  if (!is2d) instance.setFog?.({ color: "rgb(185, 214, 235)", "high-color": "rgb(36, 92, 223)", "horizon-blend": 0.08, "space-color": "rgb(3, 7, 18)", "star-intensity": 0.32 });
  instance.on("moveend", () => {
    if (currentMode === mode) syncLeafletCameraFromMapbox(instance);
  });
  installMapboxInteractions(instance, mode);
}

function installMapboxInteractions(instance: any, mode: MapMode): void {
  instance.on("click", (event: any) => {
    if (currentMode !== mode || !canonicalMap) return;
    const layers = ["network-points", "network-lines", "network-fills"].filter((id) => Boolean(instance.getLayer(id)));
    const features = layers.length ? instance.queryRenderedFeatures(event.point, { layers }) : [];
    const html = String(features[0]?.properties?.popupHtml || "");
    if (html) new window.mapboxgl!.Popup({ closeButton: true }).setLngLat(event.lngLat).setHTML(html).addTo(instance);
    else canonicalMap.fire("click", { latlng: L.latLng(event.lngLat.lat, event.lngLat.lng), originalEvent: event.originalEvent });
  });
  instance.on("dblclick", (event: any) => {
    if (currentMode !== mode || !canonicalMap) return;
    event.preventDefault?.();
    canonicalMap.fire("dblclick", { latlng: L.latLng(event.lngLat.lat, event.lngLat.lng), originalEvent: event.originalEvent });
  });
}

async function ensureMapboxGlobe(): Promise<void> {
  if (mapboxMap) return;
  if (mapboxViewPromise) return mapboxViewPromise;
  mapboxViewPromise = createMapboxMap("3d");
  try {
    await mapboxViewPromise;
  } catch (error) {
    destroyMapboxView();
    mapboxViewPromise = null;
    throw error;
  }
}

function loadMapboxSdk(): Promise<void> {
  if (window.mapboxgl) return Promise.resolve();
  if (mapboxLoaderPromise) return mapboxLoaderPromise;

  const cssId = "network-map-mapbox-gl-css";
  if (!document.getElementById(cssId)) {
    const link = document.createElement("link");
    link.id = cssId;
    link.rel = "stylesheet";
    link.href = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_VERSION}/mapbox-gl.css`;
    document.head.appendChild(link);
  }

  mapboxLoaderPromise = loadClassicScript(
    "network-map-mapbox-gl-sdk",
    `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_VERSION}/mapbox-gl.js`,
    () => Boolean(window.mapboxgl),
    "Mapbox GL JS",
  ).catch((error) => {
    mapboxLoaderPromise = null;
    throw error;
  });
  return mapboxLoaderPromise;
}

function loadScriptModule(id: string, src: string, ready: () => boolean, label: string): Promise<void> {
  if (ready()) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (script && script.type !== "module") {
      script.remove();
      script = null;
    }
    const target = script || document.createElement("script");
    if (!script) {
      target.id = id;
      target.type = "module";
      target.src = src;
      target.crossOrigin = "anonymous";
      document.head.appendChild(target);
    }
    waitForGlobal(target, ready, label, resolve, reject);
  });
}

function loadClassicScript(id: string, src: string, ready: () => boolean, label: string): Promise<void> {
  if (ready()) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const target = (document.getElementById(id) as HTMLScriptElement | null) || document.createElement("script");
    if (!target.id) {
      target.id = id;
      target.src = src;
      target.async = true;
      target.crossOrigin = "anonymous";
      document.head.appendChild(target);
    }
    waitForGlobal(target, ready, label, resolve, reject);
  });
}

function waitForGlobal(
  script: HTMLScriptElement,
  ready: () => boolean,
  label: string,
  resolve: () => void,
  reject: (reason?: unknown) => void,
): void {
  const deadline = Date.now() + 30_000;
  let settled = false;
  const finish = () => {
    if (settled) return;
    if (ready()) {
      settled = true;
      resolve();
      return;
    }
    if (Date.now() >= deadline) {
      settled = true;
      reject(new Error(`${label} timed out`));
      return;
    }
    window.setTimeout(finish, 60);
  };
  script.addEventListener("error", () => {
    if (settled) return;
    settled = true;
    reject(new Error(`${label} request failed`));
  }, { once: true });
  finish();
}

function installMapboxOverlayLayers(targetMap: any): void {
  if (!targetMap || targetMap.getSource("network-overlays")) return;
  targetMap.addSource("network-overlays", {
    type: "geojson",
    data: emptyFeatureCollection(),
  });
  targetMap.addLayer({
    id: "network-fills",
    type: "fill",
    source: "network-overlays",
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: {
      "fill-color": ["coalesce", ["get", "fillColor"], "#0e7490"],
      "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.2],
      "fill-outline-color": ["coalesce", ["get", "lineColor"], "#ffffff"],
    },
  });
  targetMap.addLayer({
    id: "network-lines",
    type: "line",
    source: "network-overlays",
    filter: ["==", ["geometry-type"], "LineString"],
    paint: {
      "line-color": ["coalesce", ["get", "lineColor"], "#67e8f9"],
      "line-opacity": ["coalesce", ["get", "lineOpacity"], 0.9],
      "line-width": ["coalesce", ["get", "lineWidth"], 2],
    },
  });
  targetMap.addLayer({
    id: "network-points",
    type: "circle",
    source: "network-overlays",
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-radius": ["coalesce", ["get", "pointRadius"], 5],
      "circle-color": ["coalesce", ["get", "fillColor"], "#0e7490"],
      "circle-opacity": ["coalesce", ["get", "fillOpacity"], 0.9],
      "circle-stroke-color": ["coalesce", ["get", "lineColor"], "#ffffff"],
      "circle-stroke-width": ["coalesce", ["get", "lineWidth"], 1],
    },
  });
}

function queueOverlaySync(): void {
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    syncAllOverlays();
  }, 140);
}

function startPeriodicSync(): void {
  stopPeriodicSync();
  periodicTimer = window.setInterval(syncAllOverlays, 1_800);
}

function stopPeriodicSync(): void {
  if (periodicTimer !== null) {
    window.clearInterval(periodicTimer);
    periodicTimer = null;
  }
}

function syncAllOverlays(): void {
  if (!canonicalMap) return;
  const features: any[] = [];
  for (const layer of collectRenderableLayers(canonicalMap)) {
    const feature = leafletToGeoJsonFeature(layer);
    if (feature) features.push(feature);
    if (features.length >= MAX_MIRRORED_FEATURES) break;
  }
  for (const instance of [mapbox2dMap, mapboxMap]) {
    instance?.getSource?.("network-overlays")?.setData({ type: "FeatureCollection", features });
  }
}

function collectRenderableLayers(map: L.Map): any[] {
  const result: any[] = [];
  const seen = new Set<number>();
  const visit = (layer: any) => {
    if (!layer) return;
    if (
      layer instanceof L.TileLayer ||
      layer instanceof L.GridLayer ||
      layer instanceof L.ImageOverlay ||
      layer instanceof L.Popup ||
      layer instanceof L.Tooltip
    ) return;
    if (layer instanceof L.LayerGroup) {
      layer.eachLayer((child: any) => visit(child));
      return;
    }
    const id = Number(layer._leaflet_id || 0);
    if (id && seen.has(id)) return;
    if (id) seen.add(id);
    result.push(layer);
  };
  map.eachLayer((layer: L.Layer) => visit(layer));
  return result;
}

function leafletToGeoJsonFeature(layer: any): any | null {
  const options = layer.options || {};
  const properties = {
    popupHtml: popupHtmlFor(layer),
    fillColor: String(options.fillColor || options.color || "#0e7490"),
    fillOpacity: clampNumber(options.fillOpacity, 0.9),
    lineColor: String(options.color || "#ffffff"),
    lineOpacity: clampNumber(options.opacity, 0.95),
    lineWidth: Math.max(0.5, Number(options.weight || 1)),
    pointRadius: Math.max(4, Number(options.radius || 4) * 1.15),
  };

  if (layer instanceof L.Circle) {
    const center = layer.getLatLng();
    return geoJsonFeature({ type: "Polygon", coordinates: [geodesicRing(center.lat, center.lng, layer.getRadius())] }, properties);
  }
  if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
    const center = layer.getLatLng();
    return geoJsonFeature({ type: "Point", coordinates: [center.lng, center.lat] }, properties);
  }
  if (layer instanceof L.Polygon) {
    const rings: number[][][] = [];
    collectCoordinatePaths(layer.getLatLngs(), rings);
    return rings.length ? geoJsonFeature({ type: "Polygon", coordinates: rings }, properties) : null;
  }
  if (layer instanceof L.Polyline) {
    const paths: number[][][] = [];
    collectCoordinatePaths(layer.getLatLngs(), paths);
    if (!paths.length) return null;
    const geometry = paths.length === 1
      ? { type: "LineString", coordinates: paths[0] }
      : { type: "MultiLineString", coordinates: paths };
    return geoJsonFeature(geometry, properties);
  }
  return null;
}

function geoJsonFeature(geometry: Record<string, unknown>, properties: Record<string, unknown>): Record<string, unknown> {
  return { type: "Feature", geometry, properties };
}

function emptyFeatureCollection(): Record<string, unknown> {
  return { type: "FeatureCollection", features: [] };
}

function popupHtmlFor(layer: any): string {
  const popup = typeof layer.getPopup === "function" ? layer.getPopup() : null;
  const tooltip = typeof layer.getTooltip === "function" ? layer.getTooltip() : null;
  const raw = popup?.getContent?.() || tooltip?.getContent?.();
  if (typeof raw === "string") return raw;
  if (raw instanceof HTMLElement) return raw.outerHTML;
  return "";
}

function collectCoordinatePaths(value: any, output: number[][][]): void {
  if (!Array.isArray(value) || value.length === 0) return;
  if (typeof value[0]?.lat === "number" && typeof value[0]?.lng === "number") {
    output.push(value.map((point: L.LatLng) => [point.lng, point.lat]));
    return;
  }
  value.forEach((child: any) => collectCoordinatePaths(child, output));
}

function geodesicRing(lat: number, lng: number, radiusMeters: number): number[][] {
  const earthRadius = 6_378_137;
  const angularDistance = Math.max(1, radiusMeters) / earthRadius;
  const latitude = lat * Math.PI / 180;
  const longitude = lng * Math.PI / 180;
  const ring: number[][] = [];
  for (let index = 0; index <= 72; index += 1) {
    const bearing = index / 72 * Math.PI * 2;
    const destinationLat = Math.asin(
      Math.sin(latitude) * Math.cos(angularDistance) +
      Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const destinationLng = longitude + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
      Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(destinationLat),
    );
    ring.push([destinationLng * 180 / Math.PI, destinationLat * 180 / Math.PI]);
  }
  return ring;
}

function rgbaArray(value: unknown, opacity = 1): number[] {
  const alpha = Math.round(Math.max(0, Math.min(1, Number.isFinite(opacity) ? opacity : 1)) * 255);
  if (typeof value !== "string") return [14, 116, 144, alpha];
  const hex = value.trim().replace("#", "");
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return [
      parseInt(hex[0] + hex[0], 16),
      parseInt(hex[1] + hex[1], 16),
      parseInt(hex[2] + hex[2], 16),
      alpha,
    ];
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
      alpha,
    ];
  }
  return [14, 116, 144, alpha];
}

function clampNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

function onCanonicalViewChanged(): void {
  queueOverlaySync();
  if (Date.now() - lastEngineDrivenLeafletMove < 450) return;
  if (currentMode === "2d") syncMapbox2dCameraFromLeaflet(false);
  else syncMapboxCameraFromLeaflet(false);
}

function syncMapbox2dCameraFromLeaflet(animate: boolean): void {
  syncMapboxCamera(mapbox2dMap, animate, "2d");
}

function syncMapboxCameraFromLeaflet(animate: boolean): void {
  syncMapboxCamera(mapboxMap, animate, "3d");
}

function syncMapboxCamera(instance: any, animate: boolean, mode: MapMode): void {
  if (!instance || !canonicalMap || currentMode !== mode) return;
  const center = canonicalMap.getCenter();
  const camera = { center: [center.lng, center.lat], zoom: Math.max(1, canonicalMap.getZoom()) };
  if (animate) instance.easeTo({ ...camera, duration: 600 });
  else instance.jumpTo(camera);
}

function syncLeafletCameraFromMapbox(instance: any): void {
  if (!instance || !canonicalMap) return;
  const center = instance.getCenter();
  const zoom = Math.max(2, Math.min(17, Math.round(Number(instance.getZoom()))));
  lastEngineDrivenLeafletMove = Date.now();
  canonicalMap.setView([center.lat, center.lng], zoom, { animate: false });
}

function destroyMapbox2dView(): void {
  mapbox2dMap?.remove?.();
  mapbox2dMap = null;
  mapbox2dHost?.classList.remove("ready");
}

function destroyMapboxView(): void {
  mapboxMap?.remove?.();
  mapboxMap = null;
  mapboxHost?.classList.remove("ready");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

function cleanupDualEngines(): void {
  stopPeriodicSync();
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  window.cancelAnimationFrame(mapResizeFrame);
  mapResizeObserver?.disconnect();
  mapResizeObserver = null;
  destroyMapbox2dView();
  destroyMapboxView();
  mapWrap = null;
  mapbox2dHost = null;
  mapboxHost = null;
  toggleControl = null;
  statusNode = null;
  canonicalMap = null;
}

window.__NETWORK_MAP_GLOBE__ = {
  getMode: () => currentMode,
  setMode,
  sync: queueOverlaySync,
};

window.addEventListener("beforeunload", () => {
  cleanupDualEngines();
});

export {};

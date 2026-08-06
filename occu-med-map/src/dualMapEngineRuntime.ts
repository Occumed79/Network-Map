import L from "leaflet";
import { registerLeafletMapInitializer } from "./leafletMapLifecycleRuntime";
import { registerMapboxMap, unregisterMapboxMap } from "./mapboxMapLifecycleRuntime";
import mapboxgl from "mapbox-gl";

type MapMode = "2d" | "3d";

declare global {
  interface Window {
    __NETWORK_MAP_GLOBE__?: {
      getMode: () => MapMode;
      setMode: (mode: MapMode) => Promise<void>;
      sync: () => void;
    };
  }
}

// Keep the bundled Mapbox GL instance available to the existing optional
// hardening runtimes. This prevents a second CDN copy of Mapbox from loading.
(window as any).mapboxgl = mapboxgl;

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "";
const MAPBOX_2D_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN_2 || "";
const MAX_MIRRORED_FEATURES = 12_000;
const MAP_LOAD_TIMEOUT_MS = 30_000;

let canonicalMap: L.Map | null = null;
let currentMode: MapMode = "2d";
let mapWrap: HTMLElement | null = null;
let mapbox2dHost: HTMLDivElement | null = null;
let mapboxGlobeHost: HTMLDivElement | null = null;
let toggleControl: HTMLDivElement | null = null;
let statusNode: HTMLSpanElement | null = null;

let mapbox2dViewPromise: Promise<void> | null = null;
let mapboxGlobeViewPromise: Promise<void> | null = null;
let mapbox2dMap: mapboxgl.Map | null = null;
let mapboxGlobeMap: mapboxgl.Map | null = null;
let syncTimer: number | null = null;
let periodicTimer: number | null = null;
let lastEngineDrivenLeafletMove = 0;
let mapResizeObserver: ResizeObserver | null = null;
let mapResizeFrame = 0;

registerLeafletMapInitializer({
  id: "dual-map-engine",
  priority: 10,
  initialize: (map) => {
    canonicalMap = map;
    map.whenReady(() => { void initializeDualEngines(map); });
  },
});

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
  if (!canonicalMap || !mapWrap || !mapbox2dHost || !mapboxGlobeHost) return;
  if (nextMode === currentMode && (nextMode === "2d" ? mapbox2dMap : mapboxGlobeMap)) return;

  if (nextMode === "3d") {
    setStatus("Loading Mapbox 3D…", "loading");

    // Make the globe host measurable before Mapbox creates its canvas. Creating
    // a WebGL map inside a hidden container can leave a zero-sized canvas.
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
      syncMapboxCameraFromLeaflet(false, "3d");
      syncAllOverlays();
      startPeriodicSync();
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
  stopPeriodicSync();
  await ensureMapbox2d();
  currentMode = "2d";
  mapWrap.classList.remove("mapbox-globe-active", "mapbox-globe-loading");
  mapbox2dHost.setAttribute("aria-hidden", "false");
  mapboxGlobeHost.setAttribute("aria-hidden", "true");
  updateToggle();
  mapbox2dMap?.resize();
  syncMapboxCameraFromLeaflet(false, "2d");
  syncAllOverlays();
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
  if (!host || !canonicalMap) throw new Error("Mapbox map host did not initialize");

  const center = canonicalMap.getCenter();
  const leafletZoom = canonicalMap.getZoom();
  const instance = new mapboxgl.Map({
    container: host,
    accessToken: token,
    style: is2d ? "mapbox://styles/mapbox/streets-v12" : "mapbox://styles/mapbox/standard",
    projection: is2d ? "mercator" : "globe",
    center: [center.lng, center.lat],
    zoom: is2d ? leafletZoom : globeZoomFromLeaflet(leafletZoom),
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

  if (!is2d) {
    instance.on("style.load", () => configureGlobe(instance));
  }

  await waitForMapReady(instance, is2d ? "Mapbox 2D map" : "Mapbox 3D globe");

  if (!is2d) configureGlobe(instance);
  installMapboxOverlayLayers(instance);
  installMapboxInteractions(instance, mode);
  host.classList.add("ready", "engine-render-ready");
  host.querySelectorAll<HTMLElement>(":scope > .dual-engine-loading").forEach((node) => node.remove());

  instance.on("moveend", () => {
    if (currentMode === mode) syncLeafletCameraFromMapbox(instance, mode);
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
    if (currentMode !== mode || !canonicalMap) return;
    const layers = ["network-points", "network-lines", "network-fills"].filter((id) => Boolean(instance.getLayer(id)));
    const features = layers.length ? instance.queryRenderedFeatures(event.point, { layers }) : [];
    const html = String(features[0]?.properties?.popupHtml || "");
    if (html) {
      new mapboxgl.Popup({ closeButton: true }).setLngLat(event.lngLat).setHTML(html).addTo(instance);
      return;
    }
    canonicalMap.fire("click", {
      latlng: L.latLng(event.lngLat.lat, event.lngLat.lng),
      originalEvent: event.originalEvent,
    });
  });

  instance.on("dblclick", (event) => {
    if (currentMode !== mode || !canonicalMap) return;
    event.preventDefault();
    canonicalMap.fire("dblclick", {
      latlng: L.latLng(event.lngLat.lat, event.lngLat.lng),
      originalEvent: event.originalEvent,
    });
  });
}

function installMapboxOverlayLayers(targetMap: mapboxgl.Map): void {
  if (targetMap.getSource("network-overlays")) return;
  targetMap.addSource("network-overlays", {
    type: "geojson",
    data: emptyFeatureCollection() as GeoJSON.FeatureCollection,
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
  const features: GeoJSON.Feature[] = [];
  for (const layer of collectRenderableLayers(canonicalMap)) {
    const feature = leafletToGeoJsonFeature(layer);
    if (feature) features.push(feature as GeoJSON.Feature);
    if (features.length >= MAX_MIRRORED_FEATURES) break;
  }

  const collection: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };
  for (const instance of [mapbox2dMap, mapboxGlobeMap]) {
    const source = instance?.getSource("network-overlays") as mapboxgl.GeoJSONSource | undefined;
    source?.setData(collection);
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

function leafletToGeoJsonFeature(layer: any): GeoJSON.Feature | null {
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
    return geoJsonFeature(geometry as GeoJSON.Geometry, properties);
  }
  return null;
}

function geoJsonFeature(geometry: GeoJSON.Geometry, properties: GeoJSON.GeoJsonProperties): GeoJSON.Feature {
  return { type: "Feature", geometry, properties };
}

function emptyFeatureCollection(): GeoJSON.FeatureCollection {
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

function clampNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

function onCanonicalViewChanged(): void {
  queueOverlaySync();
  if (Date.now() - lastEngineDrivenLeafletMove < 450) return;
  syncMapboxCameraFromLeaflet(false, currentMode);
}

function globeZoomFromLeaflet(zoom: number): number {
  const safeZoom = Number.isFinite(zoom) ? zoom : 2;
  return Math.max(0.75, safeZoom - (safeZoom <= 4 ? 0.75 : 0.35));
}

function leafletZoomFromGlobe(zoom: number): number {
  const safeZoom = Number.isFinite(zoom) ? zoom : 1.25;
  return safeZoom + (safeZoom <= 3.25 ? 0.75 : 0.35);
}

function syncMapboxCameraFromLeaflet(animate: boolean, mode: MapMode): void {
  const instance = mode === "2d" ? mapbox2dMap : mapboxGlobeMap;
  if (!instance || !canonicalMap || currentMode !== mode) return;
  const center = canonicalMap.getCenter();
  const camera: mapboxgl.CameraOptions & mapboxgl.AnimationOptions = {
    center: [center.lng, center.lat],
    zoom: mode === "2d" ? canonicalMap.getZoom() : globeZoomFromLeaflet(canonicalMap.getZoom()),
  };
  if (mode === "3d") {
    camera.pitch = 24;
    camera.bearing = -12;
  } else {
    camera.pitch = 0;
    camera.bearing = 0;
  }
  if (animate) instance.easeTo({ ...camera, duration: 650 });
  else instance.jumpTo(camera);
}

function syncLeafletCameraFromMapbox(instance: mapboxgl.Map, mode: MapMode): void {
  if (!canonicalMap) return;
  const center = instance.getCenter();
  const rawZoom = Number(instance.getZoom());
  const zoom = mode === "3d" ? leafletZoomFromGlobe(rawZoom) : rawZoom;
  lastEngineDrivenLeafletMove = Date.now();
  canonicalMap.setView([center.lat, center.lng], Math.max(2, Math.min(17, Math.round(zoom))), { animate: false });
}

function destroyMapbox2dView(): void {
  const instance = mapbox2dMap;
  mapbox2dMap = null;
  if (instance) {
    unregisterMapboxMap(instance);
    instance.remove();
  }
  mapbox2dHost?.classList.remove("ready", "engine-render-ready");
}

function destroyMapboxGlobeView(): void {
  const instance = mapboxGlobeMap;
  mapboxGlobeMap = null;
  if (instance) {
    unregisterMapboxMap(instance);
    instance.remove();
  }
  mapboxGlobeHost?.classList.remove("ready", "engine-render-ready");
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
  destroyMapboxGlobeView();
  mapWrap = null;
  mapbox2dHost = null;
  mapboxGlobeHost = null;
  toggleControl = null;
  statusNode = null;
  canonicalMap = null;
}

window.__NETWORK_MAP_GLOBE__ = {
  getMode: () => currentMode,
  setMode,
  sync: queueOverlaySync,
};

window.addEventListener("beforeunload", cleanupDualEngines);

export {};

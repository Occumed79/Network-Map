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
const MAX_MIRRORED_FEATURES = 12_000;

let canonicalMap: L.Map | null = null;
let currentMode: MapMode = "2d";
let mapWrap: HTMLElement | null = null;
let arcgisHost: HTMLDivElement | null = null;
let mapboxHost: HTMLDivElement | null = null;
let toggleControl: HTMLDivElement | null = null;
let statusNode: HTMLSpanElement | null = null;

let mapboxLoaderPromise: Promise<void> | null = null;
let mapboxViewPromise: Promise<void> | null = null;

let mapboxMap: any = null;
let syncTimer: number | null = null;
let periodicTimer: number | null = null;
let lastEngineDrivenLeafletMove = 0;

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

  mapWrap.classList.add("dual-engine-map-shell", "arcgis-leaflet-2d");
  mapContainer.classList.add("canonical-leaflet-controller");
  restoreLeafletInteraction(map);

  arcgisHost = document.createElement("div");
  arcgisHost.className = "arcgis-map-host";
  arcgisHost.setAttribute("aria-label", "ArcGIS two-dimensional map");
  arcgisHost.innerHTML = loadingMarkup("Starting ArcGIS 2D map", "Loading the ArcGIS topographic basemap…");

  // Keep this historical class because the luminous transition readiness check
  // looks for it. It now contains the Mapbox globe rather than ArcGIS SceneView.
  mapboxHost = document.createElement("div");
  mapboxHost.className = "arcgis-globe-host mapbox-globe-host";
  mapboxHost.setAttribute("aria-hidden", "true");
  mapboxHost.innerHTML = loadingMarkup("Starting Mapbox 3D globe", "Building atmosphere and network layers…");

  toggleControl = document.createElement("div");
  toggleControl.className = "map-dimension-toggle";
  toggleControl.setAttribute("role", "group");
  toggleControl.setAttribute("aria-label", "Map engine");
  toggleControl.innerHTML = `
    <button type="button" class="active" data-map-mode="2d" aria-pressed="true" title="Use the ArcGIS 2D map">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/></svg>
      <span><strong>2D Map</strong><small>ArcGIS</small></span>
    </button>
    <button type="button" data-map-mode="3d" aria-pressed="false" title="Open the Mapbox 3D globe">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4.5 6 4.5 9S15 18 12 21c-3-3-4.5-6-4.5-9S9 6 12 3Z"/></svg>
      <span><strong>3D Globe</strong><small>Mapbox</small></span>
    </button>
    <span class="map-dimension-status" aria-live="polite">Loading ArcGIS 2D…</span>
  `;
  statusNode = toggleControl.querySelector(".map-dimension-status");

  mapWrap.append(arcgisHost, mapboxHost, toggleControl);
  map.on("layeradd layerremove overlayadd overlayremove", queueOverlaySync);
  map.on("moveend zoomend", onCanonicalViewChanged);
  startPeriodicSync();

  // ArcGIS's raster topographic service is rendered by the existing Leaflet
  // controller. This avoids the ArcGIS SDK's WebGL2 requirement while keeping
  // the real ArcGIS basemap and every existing Leaflet overlay/tool intact.
  arcgisHost.innerHTML = "";
  arcgisHost.classList.add("ready", "engine-render-ready");
  arcgisHost.setAttribute("aria-hidden", "true");
  arcgisHost.hidden = true;
  mapWrap.classList.add("visible-engine-ready", "leaflet-fallback-visible");
  invalidateLeafletLayout(map);
  syncAllOverlays();
  setStatus("ArcGIS 2D active");
}

function restoreLeafletInteraction(map: L.Map): void {
  const container = map.getContainer();
  container.removeAttribute("inert");
  container.style.pointerEvents = "auto";
  map.dragging.enable();
  map.scrollWheelZoom.enable();
  map.touchZoom.enable();
  map.boxZoom.enable();
  map.keyboard.enable();
}

function invalidateLeafletLayout(map: L.Map): void {
  const refresh = () => {
    restoreLeafletInteraction(map);
    map.invalidateSize({ animate: false, pan: false });
  };
  window.requestAnimationFrame(refresh);
  window.setTimeout(refresh, 120);
  window.setTimeout(refresh, 500);
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
  if (!canonicalMap || !mapWrap || !arcgisHost || !mapboxHost) return;

  if (nextMode === "3d") {
    setStatus("Loading Mapbox 3D…", "loading");
    await ensureMapboxGlobe();
    currentMode = "3d";
    mapWrap.classList.remove("leaflet-fallback-visible");
    mapWrap.classList.add("arcgis-globe-active", "mapbox-globe-active");
    arcgisHost.setAttribute("aria-hidden", "true");
    mapboxHost.setAttribute("aria-hidden", "false");
    updateToggle();
    mapboxMap?.resize?.();
    syncMapboxCameraFromLeaflet(false);
    syncAllOverlays();
    setStatus("Mapbox 3D globe active");
    return;
  }

  setStatus("Returning to ArcGIS 2D…", "loading");
  currentMode = "2d";
  mapWrap.classList.remove("arcgis-globe-active", "mapbox-globe-active");
  mapWrap.classList.add("visible-engine-ready", "leaflet-fallback-visible");
  arcgisHost.setAttribute("aria-hidden", "true");
  arcgisHost.hidden = true;
  mapboxHost.setAttribute("aria-hidden", "true");
  updateToggle();
  invalidateLeafletLayout(canonicalMap);
  syncAllOverlays();
  setStatus("ArcGIS 2D active");
}

async function ensureMapboxGlobe(): Promise<void> {
  if (mapboxMap) return;
  if (mapboxViewPromise) return mapboxViewPromise;

  mapboxViewPromise = (async () => {
    if (!MAPBOX_TOKEN) throw new Error("VITE_MAPBOX_TOKEN is not configured");
    await loadMapboxSdk();
    if (!window.mapboxgl || !mapboxHost || !canonicalMap) throw new Error("Mapbox GL JS did not initialize");

    window.mapboxgl.accessToken = MAPBOX_TOKEN;
    const center = canonicalMap.getCenter();
    mapboxMap = new window.mapboxgl.Map({
      container: mapboxHost,
      style: "mapbox://styles/mapbox/standard",
      projection: "globe",
      center: [center.lng, center.lat],
      zoom: Math.max(1.2, canonicalMap.getZoom()),
      minZoom: 1,
      maxZoom: 17,
      antialias: true,
      attributionControl: true,
      renderWorldCopies: false,
      refreshExpiredTiles: false,
    });

    mapboxMap.addControl(new window.mapboxgl.NavigationControl({ visualizePitch: true }), "top-left");
    mapboxMap.scrollZoom?.setWheelZoomRate?.(1 / 600);
    mapboxMap.scrollZoom?.setZoomRate?.(1 / 180);

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Mapbox globe timed out")), 25_000);
      mapboxMap.once("load", () => {
        window.clearTimeout(timeout);
        resolve();
      });
      mapboxMap.once("error", (event: any) => {
        const message = event?.error?.message;
        if (!mapboxMap?.loaded?.()) {
          window.clearTimeout(timeout);
          reject(new Error(message || "Mapbox globe failed to load"));
        }
      });
    });

    mapboxMap.setFog?.({
      color: "rgb(185, 214, 235)",
      "high-color": "rgb(36, 92, 223)",
      "horizon-blend": 0.08,
      "space-color": "rgb(3, 7, 18)",
      "star-intensity": 0.32,
    });
    installMapboxOverlayLayers();
    mapboxHost.classList.add("ready");

    mapboxMap.on("moveend", () => {
      if (currentMode === "3d") syncLeafletCameraFromMapbox();
    });
    mapboxMap.on("click", (event: any) => {
      if (currentMode !== "3d" || !canonicalMap) return;
      const features = mapboxMap.queryRenderedFeatures(event.point, {
        layers: ["network-points", "network-lines", "network-fills"].filter((id) => Boolean(mapboxMap.getLayer(id))),
      });
      if (features.length) {
        const html = String(features[0]?.properties?.popupHtml || "");
        if (html) new window.mapboxgl!.Popup({ closeButton: true }).setLngLat(event.lngLat).setHTML(html).addTo(mapboxMap);
        return;
      }
      canonicalMap.fire("click", {
        latlng: L.latLng(event.lngLat.lat, event.lngLat.lng),
        originalEvent: event.originalEvent,
      });
    });
    mapboxMap.on("dblclick", (event: any) => {
      if (currentMode !== "3d" || !canonicalMap) return;
      event.preventDefault?.();
      canonicalMap.fire("dblclick", {
        latlng: L.latLng(event.lngLat.lat, event.lngLat.lng),
        originalEvent: event.originalEvent,
      });
    });
  })();

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

function installMapboxOverlayLayers(): void {
  if (!mapboxMap || mapboxMap.getSource("network-overlays")) return;
  mapboxMap.addSource("network-overlays", {
    type: "geojson",
    data: emptyFeatureCollection(),
  });
  mapboxMap.addLayer({
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
  mapboxMap.addLayer({
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
  mapboxMap.addLayer({
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
  const layers = collectRenderableLayers(canonicalMap);

  if (mapboxMap?.getSource?.("network-overlays")) {
    const features: any[] = [];
    for (const layer of layers) {
      const feature = leafletToGeoJsonFeature(layer);
      if (feature) features.push(feature);
      if (features.length >= MAX_MIRRORED_FEATURES) break;
    }
    mapboxMap.getSource("network-overlays").setData({ type: "FeatureCollection", features });
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

function clampNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

function onCanonicalViewChanged(): void {
  queueOverlaySync();
  if (Date.now() - lastEngineDrivenLeafletMove < 450) return;
  if (currentMode === "3d") syncMapboxCameraFromLeaflet(false);
}

function syncMapboxCameraFromLeaflet(animate: boolean): void {
  if (!mapboxMap || !canonicalMap || currentMode !== "3d") return;
  const center = canonicalMap.getCenter();
  const camera = { center: [center.lng, center.lat], zoom: Math.max(1, canonicalMap.getZoom()) };
  if (animate) mapboxMap.easeTo({ ...camera, duration: 600 });
  else mapboxMap.jumpTo(camera);
}

function syncLeafletCameraFromMapbox(): void {
  if (!mapboxMap || !canonicalMap) return;
  const center = mapboxMap.getCenter();
  const zoom = Math.max(2, Math.min(17, Math.round(Number(mapboxMap.getZoom()))));
  lastEngineDrivenLeafletMove = Date.now();
  canonicalMap.setView([center.lat, center.lng], zoom, { animate: false });
}

function destroyMapboxView(): void {
  mapboxMap?.remove?.();
  mapboxMap = null;
  mapboxHost?.classList.remove("ready");
}

window.__NETWORK_MAP_GLOBE__ = {
  getMode: () => currentMode,
  setMode,
  sync: queueOverlaySync,
};

window.addEventListener("beforeunload", () => {
  stopPeriodicSync();
  destroyMapboxView();
});

export {};

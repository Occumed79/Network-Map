import L from "leaflet";

type MapMode = "2d" | "3d";
type ArcgisImportApi = { import: (modules: string[]) => Promise<any[]> };
type MapboxGlApi = {
  accessToken: string;
  Map: new (options: Record<string, unknown>) => any;
  NavigationControl: new (options?: Record<string, unknown>) => any;
  Popup: new (options?: Record<string, unknown>) => any;
};

declare global {
  interface Window {
    $arcgis?: ArcgisImportApi;
    mapboxgl?: MapboxGlApi;
    __NETWORK_MAP_GLOBE__?: {
      getMode: () => MapMode;
      setMode: (mode: MapMode) => Promise<void>;
      sync: () => void;
    };
  }
}

const ARCGIS_VERSION = "5.1";
const MAPBOX_VERSION = "3.25.0";
const ATLAS_WEBMAP_ID = "7378ae8b471940cb9f9d114b67cd09b8";
const ARCGIS_KEY = String(import.meta.env.VITE_ARCGIS_API_KEY || "").trim();
const MAPBOX_TOKEN = String(import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "").trim();
const MAX_FEATURES = 12_000;

let canonicalMap: L.Map | null = null;
let currentMode: MapMode = "2d";
let mapWrap: HTMLElement | null = null;
let arcgisHost: HTMLDivElement | null = null;
let mapboxHost: HTMLDivElement | null = null;
let control: HTMLDivElement | null = null;
let statusNode: HTMLSpanElement | null = null;

let arcgisLoaderPromise: Promise<void> | null = null;
let mapboxLoaderPromise: Promise<void> | null = null;
let arcgisReadyPromise: Promise<void> | null = null;
let mapboxReadyPromise: Promise<void> | null = null;

let arcgisView: any = null;
let arcgisGraphics: any = null;
let ArcgisGraphic: any = null;
let arcgisStationaryHandle: { remove?: () => void } | null = null;
let arcgisClickHandle: { remove?: () => void } | null = null;
let arcgisDoubleClickHandle: { remove?: () => void } | null = null;
let mapboxMap: any = null;
let syncTimer: number | null = null;
let periodicTimer: number | null = null;
let lastEngineMove = 0;

const originalMapFactory = L.map.bind(L);

(L as any).map = (element: string | HTMLElement, options?: L.MapOptions) => {
  const map = originalMapFactory(element, options);
  canonicalMap = map;
  map.whenReady(() => void initialize(map));
  return map;
};

async function initialize(map: L.Map): Promise<void> {
  const container = map.getContainer();
  mapWrap = container.parentElement;
  if (!mapWrap || mapWrap.classList.contains("dual-engine-map-shell")) return;

  mapWrap.classList.add("dual-engine-map-shell");
  container.classList.add("canonical-leaflet-controller");

  arcgisHost = document.createElement("div");
  arcgisHost.className = "arcgis-map-host";
  arcgisHost.setAttribute("aria-label", "ArcGIS Atlas two-dimensional map");
  arcgisHost.innerHTML = loadingMarkup("Starting ArcGIS 2D map", "Loading the exact Service Map Atlas WebMap…");

  mapboxHost = document.createElement("div");
  mapboxHost.className = "arcgis-globe-host mapbox-globe-host";
  mapboxHost.setAttribute("aria-hidden", "true");
  mapboxHost.innerHTML = loadingMarkup("Starting Mapbox 3D globe", "Building atmosphere and active network layers…");

  control = document.createElement("div");
  control.className = "map-dimension-toggle";
  control.setAttribute("role", "group");
  control.setAttribute("aria-label", "Map engine");
  control.innerHTML = `
    <button type="button" class="active" data-map-mode="2d" aria-pressed="true" title="Use the ArcGIS Atlas 2D map">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/></svg>
      <span><strong>2D Map</strong><small>ArcGIS</small></span>
    </button>
    <button type="button" data-map-mode="3d" aria-pressed="false" title="Open the Mapbox 3D globe">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4.5 6 4.5 9S15 18 12 21c-3-3-4.5-6-4.5-9S9 6 12 3Z"/></svg>
      <span><strong>3D Globe</strong><small>Mapbox</small></span>
    </button>
    <span class="map-dimension-status" aria-live="polite">Loading ArcGIS 2D…</span>
  `;
  statusNode = control.querySelector(".map-dimension-status");

  control.addEventListener("click", (event) => {
    if (event.defaultPrevented) return;
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLButtonElement>("button[data-map-mode]");
    if (!button) return;
    const nextMode: MapMode = button.dataset.mapMode === "3d" ? "3d" : "2d";
    void setMode(nextMode);
  });

  mapWrap.append(arcgisHost, mapboxHost, control);
  map.on("layeradd layerremove overlayadd overlayremove", queueSync);
  map.on("moveend zoomend", onCanonicalViewChanged);
  startPeriodicSync();

  try {
    await ensureArcgis2d();
    mapWrap.classList.add("visible-engine-ready");
    mapWrap.classList.remove("leaflet-fallback-visible");
    suspendCanonicalBaseTiles();
    syncAllOverlays();
    setStatus("ArcGIS 2D active");
  } catch (error) {
    console.error("ArcGIS Atlas 2D map failed", error);
    mapWrap.classList.add("leaflet-fallback-visible");
    setStatus(`ArcGIS 2D unavailable · ${errorMessage(error)}`, "error");
  }
}

function loadingMarkup(title: string, detail: string): string {
  return `<div class="dual-engine-loading" role="status"><span class="dual-engine-spinner" aria-hidden="true"></span><strong>${title}</strong><small>${detail}</small></div>`;
}

function setStatus(message: string, state: "normal" | "loading" | "error" = "normal"): void {
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.dataset.state = state;
}

function updateToggle(): void {
  control?.querySelectorAll<HTMLButtonElement>("button[data-map-mode]").forEach((button) => {
    const active = button.dataset.mapMode === currentMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

async function setMode(nextMode: MapMode): Promise<void> {
  if (!canonicalMap || !mapWrap || !arcgisHost || !mapboxHost) return;

  if (nextMode === "3d") {
    setStatus("Loading Mapbox 3D…", "loading");
    await ensureMapbox3d();
    currentMode = "3d";
    mapWrap.classList.add("mapbox-globe-active", "arcgis-globe-active");
    arcgisHost.setAttribute("aria-hidden", "true");
    mapboxHost.setAttribute("aria-hidden", "false");
    mapboxMap?.resize?.();
    syncMapboxFromLeaflet(false);
    syncAllOverlays();
    updateToggle();
    setStatus("Mapbox 3D globe active");
    return;
  }

  setStatus("Loading ArcGIS 2D…", "loading");
  await ensureArcgis2d();
  currentMode = "2d";
  mapWrap.classList.remove("mapbox-globe-active", "arcgis-globe-active");
  arcgisHost.setAttribute("aria-hidden", "false");
  mapboxHost.setAttribute("aria-hidden", "true");
  arcgisView?.resize?.();
  await syncArcgisFromLeaflet(false);
  syncAllOverlays();
  updateToggle();
  setStatus("ArcGIS 2D active");
}

async function ensureArcgis2d(): Promise<void> {
  if (arcgisView) return;
  if (arcgisReadyPromise) return arcgisReadyPromise;

  arcgisReadyPromise = (async () => {
    await loadArcgisSdk();
    if (!window.$arcgis || !arcgisHost || !canonicalMap) throw new Error("ArcGIS SDK did not initialize");

    const [esriConfig, WebMap, MapView, GraphicsLayer, Graphic, reactiveUtils] = await window.$arcgis.import([
      "@arcgis/core/config.js",
      "@arcgis/core/WebMap.js",
      "@arcgis/core/views/MapView.js",
      "@arcgis/core/layers/GraphicsLayer.js",
      "@arcgis/core/Graphic.js",
      "@arcgis/core/core/reactiveUtils.js",
    ]);

    if (ARCGIS_KEY) esriConfig.apiKey = ARCGIS_KEY;
    const atlasMap = new WebMap({ portalItem: { id: ATLAS_WEBMAP_ID } });
    await atlasMap.load();

    ArcgisGraphic = Graphic;
    arcgisGraphics = new GraphicsLayer({ title: "Occu-Med active network overlays", listMode: "hide" });
    atlasMap.add(arcgisGraphics);

    const center = canonicalMap.getCenter();
    arcgisView = new MapView({
      container: arcgisHost,
      map: atlasMap,
      center: [center.lng, center.lat],
      zoom: clampZoom(canonicalMap.getZoom()),
      constraints: {
        minZoom: 2,
        maxZoom: 18,
        rotationEnabled: false,
        snapToZoom: false,
      },
      popup: { dockEnabled: false },
    });

    await arcgisView.when();
    arcgisView.ui.components = ["zoom", "attribution"];
    try { arcgisView.qualityProfile = "high"; } catch { /* unsupported */ }
    arcgisHost.classList.add("ready", "engine-render-ready");

    arcgisStationaryHandle = reactiveUtils.watch(
      () => arcgisView.stationary,
      (stationary: boolean) => {
        if (stationary && currentMode === "2d") syncLeafletFromArcgis();
      },
    );

    arcgisClickHandle = arcgisView.on("click", async (event: any) => {
      if (currentMode !== "2d" || !canonicalMap || !event.mapPoint) return;
      const hit = await arcgisView.hitTest(event).catch(() => null);
      const overlayHit = Boolean(hit?.results?.some((result: any) => result?.graphic?.layer === arcgisGraphics));
      if (overlayHit) return;
      canonicalMap.fire("click", {
        latlng: L.latLng(event.mapPoint.latitude, event.mapPoint.longitude),
        originalEvent: event.native,
      });
    });

    arcgisDoubleClickHandle = arcgisView.on("double-click", (event: any) => {
      if (currentMode !== "2d" || !canonicalMap || !event.mapPoint) return;
      event.stopPropagation?.();
      canonicalMap.fire("dblclick", {
        latlng: L.latLng(event.mapPoint.latitude, event.mapPoint.longitude),
        originalEvent: event.native,
      });
    });
  })();

  try {
    await arcgisReadyPromise;
  } catch (error) {
    destroyArcgis();
    arcgisReadyPromise = null;
    throw error;
  }
}

async function ensureMapbox3d(): Promise<void> {
  if (mapboxMap) return;
  if (mapboxReadyPromise) return mapboxReadyPromise;

  mapboxReadyPromise = (async () => {
    if (!MAPBOX_TOKEN) throw new Error("VITE_MAPBOX_TOKEN is not configured");
    await loadMapboxSdk();
    if (!window.mapboxgl || !mapboxHost || !canonicalMap) throw new Error("Mapbox GL JS did not initialize");

    mapboxHost.style.visibility = "visible";
    mapboxHost.style.opacity = "0";
    mapboxHost.style.pointerEvents = "none";

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
      const timeout = window.setTimeout(() => reject(new Error("Mapbox globe timed out")), 30_000);
      const finish = () => {
        window.clearTimeout(timeout);
        resolve();
      };
      mapboxMap.once("style.load", finish);
      mapboxMap.once("load", finish);
      mapboxMap.once("error", (event: any) => {
        if (!mapboxMap?.isStyleLoaded?.()) {
          window.clearTimeout(timeout);
          reject(new Error(event?.error?.message || "Mapbox globe failed to load"));
        }
      });
    });

    mapboxMap.setFog?.({
      color: "rgb(185, 214, 235)",
      "high-color": "rgb(36, 92, 223)",
      "horizon-blend": 0.08,
      "space-color": "rgb(3, 7, 18)",
      "star-intensity": 0.34,
    });
    installMapboxLayers();
    mapboxHost.classList.add("ready", "engine-render-ready");
    mapboxHost.style.visibility = "";
    mapboxHost.style.opacity = "";
    mapboxHost.style.pointerEvents = "";

    mapboxMap.on("moveend", () => {
      if (currentMode === "3d") syncLeafletFromMapbox();
    });
    mapboxMap.on("click", (event: any) => {
      if (currentMode !== "3d" || !canonicalMap) return;
      const layers = ["network-points", "network-lines", "network-fills"].filter((id) => Boolean(mapboxMap.getLayer(id)));
      const features = mapboxMap.queryRenderedFeatures(event.point, { layers });
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
  })();

  try {
    await mapboxReadyPromise;
  } catch (error) {
    if (mapboxHost) {
      mapboxHost.style.visibility = "";
      mapboxHost.style.opacity = "";
      mapboxHost.style.pointerEvents = "";
    }
    destroyMapbox();
    mapboxReadyPromise = null;
    throw error;
  }
}

function loadArcgisSdk(): Promise<void> {
  if (window.$arcgis) return Promise.resolve();
  if (arcgisLoaderPromise) return arcgisLoaderPromise;

  const cssId = "network-map-arcgis-light-theme";
  if (!document.getElementById(cssId)) {
    const link = document.createElement("link");
    link.id = cssId;
    link.rel = "stylesheet";
    link.href = `https://js.arcgis.com/${ARCGIS_VERSION}/esri/themes/light/main.css`;
    document.head.appendChild(link);
  }

  arcgisLoaderPromise = loadScript(
    "network-map-arcgis-sdk",
    `https://js.arcgis.com/${ARCGIS_VERSION}/`,
    true,
    () => Boolean(window.$arcgis),
    "ArcGIS SDK",
  ).catch((error) => {
    arcgisLoaderPromise = null;
    throw error;
  });
  return arcgisLoaderPromise;
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

  mapboxLoaderPromise = loadScript(
    "network-map-mapbox-gl-sdk",
    `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_VERSION}/mapbox-gl.js`,
    false,
    () => Boolean(window.mapboxgl),
    "Mapbox GL JS",
  ).catch((error) => {
    mapboxLoaderPromise = null;
    throw error;
  });
  return mapboxLoaderPromise;
}

function loadScript(id: string, src: string, module: boolean, ready: () => boolean, label: string): Promise<void> {
  if (ready()) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (script && module && script.type !== "module") {
      script.remove();
      script = null;
    }
    const target = script || document.createElement("script");
    if (!script) {
      target.id = id;
      if (module) target.type = "module";
      else target.async = true;
      target.src = src;
      target.crossOrigin = "anonymous";
      document.head.appendChild(target);
    }

    const deadline = Date.now() + 30_000;
    let settled = false;
    const check = () => {
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
      window.setTimeout(check, 60);
    };
    target.addEventListener("error", () => {
      if (settled) return;
      settled = true;
      reject(new Error(`${label} request failed`));
    }, { once: true });
    check();
  });
}

function suspendCanonicalBaseTiles(): void {
  if (!canonicalMap) return;
  const removable: L.Layer[] = [];
  canonicalMap.eachLayer((layer: any) => {
    const url = String(layer?._url || "");
    if (!(layer instanceof L.TileLayer) && !(layer instanceof L.GridLayer)) return;
    if (
      url.includes("tile.openstreetmap.org") ||
      url.includes("api.mapbox.com") ||
      url.includes("arcgisonline.com") ||
      url.includes("basemaps.cartocdn.com")
    ) removable.push(layer);
  });
  removable.forEach((layer) => canonicalMap?.removeLayer(layer));
}

function installMapboxLayers(): void {
  if (!mapboxMap || mapboxMap.getSource("network-overlays")) return;
  mapboxMap.addSource("network-overlays", { type: "geojson", data: emptyCollection() });
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

function queueSync(): void {
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    syncAllOverlays();
  }, 160);
}

function startPeriodicSync(): void {
  stopPeriodicSync();
  periodicTimer = window.setInterval(syncAllOverlays, 2_000);
}

function stopPeriodicSync(): void {
  if (periodicTimer !== null) {
    window.clearInterval(periodicTimer);
    periodicTimer = null;
  }
}

function syncAllOverlays(): void {
  if (!canonicalMap) return;
  const layers = collectLayers(canonicalMap);

  if (arcgisGraphics && ArcgisGraphic) {
    const graphics: any[] = [];
    for (const layer of layers) {
      const graphic = toArcgisGraphic(layer);
      if (graphic) graphics.push(graphic);
      if (graphics.length >= MAX_FEATURES) break;
    }
    arcgisGraphics.removeAll();
    if (graphics.length) arcgisGraphics.addMany(graphics);
  }

  const source = mapboxMap?.getSource?.("network-overlays");
  if (source) {
    const features: any[] = [];
    for (const layer of layers) {
      const feature = toGeoJsonFeature(layer);
      if (feature) features.push(feature);
      if (features.length >= MAX_FEATURES) break;
    }
    source.setData({ type: "FeatureCollection", features });
  }
}

function collectLayers(map: L.Map): any[] {
  const output: any[] = [];
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
    if (isSuppressedDensity(layer)) return;
    const id = Number(layer._leaflet_id || 0);
    if (id && seen.has(id)) return;
    if (id) seen.add(id);
    output.push(layer);
  };
  map.eachLayer((layer: L.Layer) => visit(layer));
  return output;
}

function isSuppressedDensity(layer: any): boolean {
  if (document.body.dataset.providerDensityUserEnabled === "true") return false;
  if (layer instanceof L.CircleMarker) return Number(layer.options?.radius || 0) >= 12;
  const pane = String(layer.options?.pane || "").toLowerCase();
  const className = String(layer.options?.className || "").toLowerCase();
  return pane.includes("density") || className.includes("density") || className.includes("provider-field");
}

function toArcgisGraphic(layer: any): any | null {
  if (!ArcgisGraphic) return null;
  const popupTemplate = popupTemplateFor(layer);
  const attributes = { leafletLayerId: String(layer._leaflet_id || "") };

  if (layer instanceof L.Circle) {
    const center = layer.getLatLng();
    return new ArcgisGraphic({
      geometry: { type: "polygon", rings: [geodesicRing(center.lat, center.lng, layer.getRadius())], spatialReference: { wkid: 4326 } },
      symbol: polygonSymbol(layer.options),
      popupTemplate,
      attributes,
    });
  }
  if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
    const center = layer.getLatLng();
    const options = layer.options || {};
    return new ArcgisGraphic({
      geometry: { type: "point", longitude: center.lng, latitude: center.lat },
      symbol: {
        type: "simple-marker",
        style: "circle",
        size: layer instanceof L.CircleMarker ? Math.max(7, Number(options.radius || 4) * 2) : 11,
        color: rgba(options.fillColor || options.color || "#0e7490", Number(options.fillOpacity ?? 0.9)),
        outline: { color: rgba(options.color || "#ffffff", Number(options.opacity ?? 0.95)), width: Math.max(0.5, Number(options.weight || 1)) },
      },
      popupTemplate,
      attributes,
    });
  }
  if (layer instanceof L.Polygon) {
    const rings: number[][][] = [];
    collectPaths(layer.getLatLngs(), rings);
    if (!rings.length) return null;
    return new ArcgisGraphic({
      geometry: { type: "polygon", rings, spatialReference: { wkid: 4326 } },
      symbol: polygonSymbol(layer.options),
      popupTemplate,
      attributes,
    });
  }
  if (layer instanceof L.Polyline) {
    const paths: number[][][] = [];
    collectPaths(layer.getLatLngs(), paths);
    if (!paths.length) return null;
    return new ArcgisGraphic({
      geometry: { type: "polyline", paths, spatialReference: { wkid: 4326 } },
      symbol: { type: "simple-line", color: rgba(layer.options?.color || "#67e8f9", Number(layer.options?.opacity ?? 0.9)), width: Math.max(1, Number(layer.options?.weight || 2)) },
      popupTemplate,
      attributes,
    });
  }
  return null;
}

function toGeoJsonFeature(layer: any): any | null {
  const options = layer.options || {};
  const properties = {
    popupHtml: popupHtmlFor(layer),
    fillColor: String(options.fillColor || options.color || "#0e7490"),
    fillOpacity: bounded(options.fillOpacity, 0.9),
    lineColor: String(options.color || "#ffffff"),
    lineOpacity: bounded(options.opacity, 0.95),
    lineWidth: Math.max(0.5, Number(options.weight || 1)),
    pointRadius: Math.max(4, Number(options.radius || 4) * 1.15),
  };

  if (layer instanceof L.Circle) {
    const center = layer.getLatLng();
    return feature({ type: "Polygon", coordinates: [geodesicRing(center.lat, center.lng, layer.getRadius())] }, properties);
  }
  if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
    const center = layer.getLatLng();
    return feature({ type: "Point", coordinates: [center.lng, center.lat] }, properties);
  }
  if (layer instanceof L.Polygon) {
    const rings: number[][][] = [];
    collectPaths(layer.getLatLngs(), rings);
    return rings.length ? feature({ type: "Polygon", coordinates: rings }, properties) : null;
  }
  if (layer instanceof L.Polyline) {
    const paths: number[][][] = [];
    collectPaths(layer.getLatLngs(), paths);
    if (!paths.length) return null;
    return feature(paths.length === 1
      ? { type: "LineString", coordinates: paths[0] }
      : { type: "MultiLineString", coordinates: paths }, properties);
  }
  return null;
}

function feature(geometry: Record<string, unknown>, properties: Record<string, unknown>): Record<string, unknown> {
  return { type: "Feature", geometry, properties };
}

function emptyCollection(): Record<string, unknown> {
  return { type: "FeatureCollection", features: [] };
}

function polygonSymbol(options: any): Record<string, unknown> {
  return {
    type: "simple-fill",
    color: rgba(options?.fillColor || options?.color || "#0e7490", Number(options?.fillOpacity ?? 0.18)),
    outline: { color: rgba(options?.color || "#67e8f9", Number(options?.opacity ?? 0.85)), width: Math.max(0.75, Number(options?.weight || 1.5)) },
  };
}

function popupTemplateFor(layer: any): Record<string, unknown> | undefined {
  const content = popupHtmlFor(layer);
  if (!content) return undefined;
  const node = document.createElement("div");
  node.innerHTML = content;
  const title = (node.textContent || "Occu-Med network detail").replace(/\s+/g, " ").trim().slice(0, 90);
  return { title: title || "Occu-Med network detail", content };
}

function popupHtmlFor(layer: any): string {
  const popup = typeof layer.getPopup === "function" ? layer.getPopup() : null;
  const tooltip = typeof layer.getTooltip === "function" ? layer.getTooltip() : null;
  const raw = popup?.getContent?.() || tooltip?.getContent?.();
  if (typeof raw === "string") return raw;
  if (raw instanceof HTMLElement) return raw.outerHTML;
  return "";
}

function collectPaths(value: any, output: number[][][]): void {
  if (!Array.isArray(value) || value.length === 0) return;
  if (typeof value[0]?.lat === "number" && typeof value[0]?.lng === "number") {
    output.push(value.map((point: L.LatLng) => [point.lng, point.lat]));
    return;
  }
  value.forEach((child: any) => collectPaths(child, output));
}

function geodesicRing(lat: number, lng: number, radiusMeters: number): number[][] {
  const earth = 6_378_137;
  const distance = Math.max(1, radiusMeters) / earth;
  const latitude = lat * Math.PI / 180;
  const longitude = lng * Math.PI / 180;
  const ring: number[][] = [];
  for (let index = 0; index <= 72; index += 1) {
    const bearing = index / 72 * Math.PI * 2;
    const destinationLat = Math.asin(
      Math.sin(latitude) * Math.cos(distance) + Math.cos(latitude) * Math.sin(distance) * Math.cos(bearing),
    );
    const destinationLng = longitude + Math.atan2(
      Math.sin(bearing) * Math.sin(distance) * Math.cos(latitude),
      Math.cos(distance) - Math.sin(latitude) * Math.sin(destinationLat),
    );
    ring.push([destinationLng * 180 / Math.PI, destinationLat * 180 / Math.PI]);
  }
  return ring;
}

function rgba(value: unknown, opacity = 1): number[] {
  const alpha = Math.round(Math.max(0, Math.min(1, Number.isFinite(opacity) ? opacity : 1)) * 255);
  if (typeof value !== "string") return [14, 116, 144, alpha];
  const hex = value.trim().replace("#", "");
  if (/^[0-9a-f]{3}$/i.test(hex)) return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16), alpha];
  if (/^[0-9a-f]{6}$/i.test(hex)) return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), alpha];
  return [14, 116, 144, alpha];
}

function bounded(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

function clampZoom(value: number): number {
  return Math.max(2, Math.min(18, value));
}

function onCanonicalViewChanged(): void {
  queueSync();
  if (Date.now() - lastEngineMove < 450) return;
  if (currentMode === "2d") void syncArcgisFromLeaflet(false);
  else syncMapboxFromLeaflet(false);
}

async function syncArcgisFromLeaflet(animate: boolean): Promise<void> {
  if (!arcgisView || !canonicalMap || currentMode !== "2d") return;
  const center = canonicalMap.getCenter();
  await arcgisView.goTo({ center: [center.lng, center.lat], zoom: clampZoom(canonicalMap.getZoom()) }, { animate, duration: animate ? 500 : 0 }).catch(() => undefined);
}

function syncMapboxFromLeaflet(animate: boolean): void {
  if (!mapboxMap || !canonicalMap || currentMode !== "3d") return;
  const center = canonicalMap.getCenter();
  const camera = { center: [center.lng, center.lat], zoom: Math.max(1, canonicalMap.getZoom()) };
  if (animate) mapboxMap.easeTo({ ...camera, duration: 600 });
  else mapboxMap.jumpTo(camera);
}

function syncLeafletFromArcgis(): void {
  if (!arcgisView || !canonicalMap || !arcgisView.center) return;
  const latitude = Number(arcgisView.center.latitude);
  const longitude = Number(arcgisView.center.longitude);
  const zoom = Math.max(2, Math.min(17, Math.round(Number(arcgisView.zoom ?? canonicalMap.getZoom()))));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
  lastEngineMove = Date.now();
  canonicalMap.setView([latitude, longitude], zoom, { animate: false });
}

function syncLeafletFromMapbox(): void {
  if (!mapboxMap || !canonicalMap) return;
  const center = mapboxMap.getCenter();
  const zoom = Math.max(2, Math.min(17, Math.round(Number(mapboxMap.getZoom()))));
  lastEngineMove = Date.now();
  canonicalMap.setView([center.lat, center.lng], zoom, { animate: false });
}

function destroyArcgis(): void {
  arcgisStationaryHandle?.remove?.();
  arcgisClickHandle?.remove?.();
  arcgisDoubleClickHandle?.remove?.();
  arcgisStationaryHandle = null;
  arcgisClickHandle = null;
  arcgisDoubleClickHandle = null;
  arcgisView?.destroy?.();
  arcgisView = null;
  arcgisGraphics = null;
  ArcgisGraphic = null;
  arcgisHost?.classList.remove("ready", "engine-render-ready");
}

function destroyMapbox(): void {
  mapboxMap?.remove?.();
  mapboxMap = null;
  mapboxHost?.classList.remove("ready", "engine-render-ready");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

window.__NETWORK_MAP_GLOBE__ = {
  getMode: () => currentMode,
  setMode,
  sync: queueSync,
};

window.addEventListener("beforeunload", () => {
  stopPeriodicSync();
  destroyArcgis();
  destroyMapbox();
});

export {};

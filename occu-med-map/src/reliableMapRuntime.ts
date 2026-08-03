import L from "leaflet";

type MapMode = "2d" | "3d";
type ArcgisImportApi = { import: (modules: string[]) => Promise<any[]> };

declare global {
  interface Window {
    $arcgis?: ArcgisImportApi;
    __NETWORK_MAP_ARCGIS_SDK_READY__?: Promise<void>;
    __NETWORK_MAP_GLOBE__?: {
      getMode: () => MapMode;
      setMode: (mode: MapMode) => Promise<void>;
      sync: () => void;
    };
  }
}

const ARCGIS_VERSION = "5.1";
const ARCGIS_SCRIPT_ID = "network-map-arcgis-sdk";
const MAX_GRAPHICS = 12_000;
const apiKey = import.meta.env.VITE_ARCGIS_API_KEY || "";

let capturedMap: L.Map | null = null;
let mode: MapMode = "2d";
let sceneView: any = null;
let graphicsLayer: any = null;
let GraphicCtor: any = null;
let scenePromise: Promise<void> | null = null;
let sdkPromise: Promise<void> | null = null;
let syncTimer: number | null = null;
let periodicTimer: number | null = null;
let stationaryHandle: { remove?: () => void } | null = null;
let clickHandle: { remove?: () => void } | null = null;
let doubleClickHandle: { remove?: () => void } | null = null;
let densityExplicitlyEnabled = false;
let lastSceneDrivenMove = 0;

// Capture the same Leaflet map that the existing runtime creates.
const previousMapFactory = L.map.bind(L);
(L as any).map = (element: string | HTMLElement, options?: L.MapOptions) => {
  const map = previousMapFactory(element, options);
  capturedMap = map;
  map.whenReady(() => {
    map.on("layeradd layerremove overlayadd overlayremove", queueGraphicSync);
    map.on("moveend zoomend", onLeafletViewChanged);
  });
  return map;
};

// Provider density must never load merely because the application mounted.
// A capture-phase click runs before React's button handler, so an explicit
// visualization choice enables the real request in time for that same click.
document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const visualizationButton = target?.closest<HTMLButtonElement>(".provider-visualization-grid button");
  if (visualizationButton) densityExplicitlyEnabled = true;
}, true);

const nativeFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  let url: URL | null = null;
  try {
    const raw = input instanceof Request ? input.url : input.toString();
    url = new URL(raw, window.location.origin);
  } catch {
    url = null;
  }

  if (
    !densityExplicitlyEnabled &&
    url?.origin === window.location.origin &&
    /^\/api\/provider-explorer\/(density|hex)$/.test(url.pathname)
  ) {
    return Promise.resolve(new Response(JSON.stringify({
      cells: [],
      total: 0,
      manualActivationRequired: true,
    }), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "X-Network-Map-Density": "manual-only",
      },
    }));
  }

  return nativeFetch(input, init);
}) as typeof window.fetch;

function mapElements(): {
  wrap: HTMLElement | null;
  host: HTMLElement | null;
  control: HTMLElement | null;
  status: HTMLElement | null;
} {
  const wrap = capturedMap?.getContainer().parentElement || document.querySelector<HTMLElement>(".map-wrap");
  return {
    wrap,
    host: wrap?.querySelector<HTMLElement>(".arcgis-globe-host") || null,
    control: wrap?.querySelector<HTMLElement>(".map-dimension-toggle") || null,
    status: wrap?.querySelector<HTMLElement>(".map-dimension-status") || null,
  };
}

function setStatus(message: string, state: "normal" | "loading" | "error" = "normal"): void {
  const { status } = mapElements();
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}

function updateButtons(): void {
  const { control } = mapElements();
  control?.querySelectorAll<HTMLButtonElement>("button[data-map-mode]").forEach((button) => {
    const active = button.dataset.mapMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    button.disabled = false;
  });
}

async function waitForMapUi(): Promise<void> {
  const deadline = Date.now() + 4_000;
  while (Date.now() < deadline) {
    const { host, wrap } = mapElements();
    if (capturedMap && host && wrap) return;
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
  throw new Error("Map globe container was not created");
}

async function loadArcgisSdk(): Promise<void> {
  if (window.$arcgis) return;

  if (window.__NETWORK_MAP_ARCGIS_SDK_READY__) {
    try {
      await window.__NETWORK_MAP_ARCGIS_SDK_READY__;
      if (window.$arcgis) return;
    } catch {
      window.__NETWORK_MAP_ARCGIS_SDK_READY__ = undefined;
    }
  }

  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    let script = document.getElementById(ARCGIS_SCRIPT_ID) as HTMLScriptElement | null;
    if (script && script.type !== "module") {
      script.remove();
      script = null;
    }

    const target = script || document.createElement("script");
    let settled = false;
    const deadline = Date.now() + 30_000;

    const finish = () => {
      if (settled) return;
      if (window.$arcgis) {
        settled = true;
        resolve();
        return;
      }
      if (Date.now() >= deadline) {
        settled = true;
        target.remove();
        reject(new Error("ArcGIS SDK timed out before exposing $arcgis"));
        return;
      }
      window.setTimeout(finish, 50);
    };

    target.addEventListener("error", () => {
      if (settled) return;
      settled = true;
      target.remove();
      reject(new Error("ArcGIS SDK request failed"));
    }, { once: true });

    if (!script) {
      target.id = ARCGIS_SCRIPT_ID;
      target.type = "module";
      target.src = `https://js.arcgis.com/${ARCGIS_VERSION}/`;
      target.crossOrigin = "anonymous";
      document.head.appendChild(target);
    }

    finish();
  }).catch((error) => {
    sdkPromise = null;
    window.__NETWORK_MAP_ARCGIS_SDK_READY__ = undefined;
    throw error;
  });

  window.__NETWORK_MAP_ARCGIS_SDK_READY__ = sdkPromise;
  return sdkPromise;
}

async function ensureScene(): Promise<void> {
  if (sceneView) return;
  if (scenePromise) return scenePromise;

  scenePromise = (async () => {
    await waitForMapUi();
    await loadArcgisSdk();
    if (!window.$arcgis || !capturedMap) throw new Error("ArcGIS module loader is unavailable");

    const [
      esriConfig,
      ArcGISMap,
      SceneView,
      GraphicsLayer,
      Graphic,
      reactiveUtils,
      Basemap,
      WebTileLayer,
    ] = await window.$arcgis.import([
      "@arcgis/core/config.js",
      "@arcgis/core/Map.js",
      "@arcgis/core/views/SceneView.js",
      "@arcgis/core/layers/GraphicsLayer.js",
      "@arcgis/core/Graphic.js",
      "@arcgis/core/core/reactiveUtils.js",
      "@arcgis/core/Basemap.js",
      "@arcgis/core/layers/WebTileLayer.js",
    ]);

    if (apiKey) esriConfig.apiKey = apiKey;

    GraphicCtor = Graphic;
    graphicsLayer = new GraphicsLayer({
      title: "Occu-Med network overlays",
      elevationInfo: { mode: "relative-to-ground", offset: 28 },
      listMode: "hide",
    });

    const sceneMapOptions: Record<string, unknown> = { layers: [graphicsLayer] };
    if (apiKey) {
      sceneMapOptions.basemap = "arcgis/navigation-night";
      sceneMapOptions.ground = "world-elevation";
    } else {
      const osmLayer = new WebTileLayer({
        urlTemplate: "https://tile.openstreetmap.org/{level}/{col}/{row}.png",
        copyright: "OpenStreetMap contributors",
      });
      sceneMapOptions.basemap = new Basemap({
        baseLayers: [osmLayer],
        title: "OpenStreetMap",
        id: "network-map-osm-fallback",
      });
    }

    const sceneMap = new ArcGISMap(sceneMapOptions);
    const center = capturedMap.getCenter();
    const { host } = mapElements();
    if (!host) throw new Error("3D globe host is missing");

    sceneView = new SceneView({
      container: host,
      map: sceneMap,
      center: [center.lng, center.lat],
      zoom: capturedMap.getZoom(),
      viewingMode: "global",
      qualityProfile: window.matchMedia("(max-width: 768px)").matches ? "medium" : "high",
      popup: { dockEnabled: false },
      environment: {
        atmosphereEnabled: true,
        starsEnabled: true,
        lighting: {
          directShadowsEnabled: true,
          ambientOcclusionEnabled: true,
        },
      },
    });

    await sceneView.when();
    sceneView.ui.components = ["zoom", "compass"];
    host.classList.add("ready");

    stationaryHandle = reactiveUtils.watch(
      () => sceneView.stationary,
      (stationary: boolean) => {
        if (stationary && mode === "3d") syncLeafletFromScene();
      },
    );

    clickHandle = sceneView.on("click", async (event: any) => {
      if (mode !== "3d" || !capturedMap || !event.mapPoint) return;
      const hit = await sceneView.hitTest(event).catch(() => null);
      const hitGraphic = Boolean(hit?.results?.some((result: any) => result?.graphic?.layer === graphicsLayer));
      if (hitGraphic) return;
      capturedMap.fire("click", {
        latlng: L.latLng(event.mapPoint.latitude, event.mapPoint.longitude),
        originalEvent: event.native,
      });
    });

    doubleClickHandle = sceneView.on("double-click", (event: any) => {
      if (mode !== "3d" || !capturedMap || !event.mapPoint) return;
      event.stopPropagation?.();
      capturedMap.fire("dblclick", {
        latlng: L.latLng(event.mapPoint.latitude, event.mapPoint.longitude),
        originalEvent: event.native,
      });
    });
  })();

  try {
    await scenePromise;
  } catch (error) {
    destroyScene();
    scenePromise = null;
    throw error;
  }
}

function destroyScene(): void {
  stationaryHandle?.remove?.();
  clickHandle?.remove?.();
  doubleClickHandle?.remove?.();
  stationaryHandle = null;
  clickHandle = null;
  doubleClickHandle = null;
  sceneView?.destroy?.();
  sceneView = null;
  graphicsLayer = null;
  GraphicCtor = null;
  mapElements().host?.classList.remove("ready");
}

async function setMode(nextMode: MapMode): Promise<void> {
  await waitForMapUi();
  if (!capturedMap) return;

  const { wrap, host } = mapElements();
  if (!wrap || !host) return;

  if (nextMode === "2d") {
    mode = "2d";
    stopPeriodicSync();
    syncLeafletFromScene();
    wrap.classList.remove("arcgis-globe-active");
    host.setAttribute("aria-hidden", "true");
    capturedMap.invalidateSize();
    updateButtons();
    setStatus("2D map active");
    return;
  }

  mode = "3d";
  wrap.classList.add("arcgis-globe-active");
  host.setAttribute("aria-hidden", "false");
  updateButtons();
  setStatus("Loading ArcGIS 3D…", "loading");

  try {
    await ensureScene();
    syncGraphicsNow();
    await syncSceneFromLeaflet(true);
    startPeriodicSync();
    setStatus(apiKey ? "ArcGIS 3D active" : "ArcGIS 3D active · public basemap");
  } catch (error) {
    console.error("Reliable ArcGIS globe failed", error);
    mode = "2d";
    stopPeriodicSync();
    wrap.classList.remove("arcgis-globe-active");
    host.setAttribute("aria-hidden", "true");
    capturedMap.invalidateSize();
    updateButtons();
    const message = error instanceof Error ? error.message : "unknown error";
    setStatus(`3D unavailable · ${message}`, "error");
  }
}

function queueGraphicSync(): void {
  if (mode !== "3d" || !sceneView) return;
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    syncGraphicsNow();
  }, 150);
}

function startPeriodicSync(): void {
  stopPeriodicSync();
  periodicTimer = window.setInterval(syncGraphicsNow, 1_800);
}

function stopPeriodicSync(): void {
  if (periodicTimer !== null) {
    window.clearInterval(periodicTimer);
    periodicTimer = null;
  }
}

function syncGraphicsNow(): void {
  if (mode !== "3d" || !capturedMap || !graphicsLayer || !GraphicCtor) return;
  const graphics: any[] = [];

  capturedMap.eachLayer((layer: any) => {
    if (graphics.length >= MAX_GRAPHICS) return;
    graphics.push(...leafletGraphics(layer).slice(0, MAX_GRAPHICS - graphics.length));
  });

  graphicsLayer.removeAll();
  if (graphics.length) graphicsLayer.addMany(graphics);
}

function leafletGraphics(layer: any): any[] {
  if (
    layer instanceof L.TileLayer ||
    layer instanceof L.GridLayer ||
    layer instanceof L.ImageOverlay ||
    layer instanceof L.LayerGroup ||
    layer instanceof L.Popup ||
    layer instanceof L.Tooltip
  ) return [];

  const attributes = { leafletLayerId: String(layer._leaflet_id || "") };
  const popupTemplate = popupFor(layer);

  if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
    const point = layer.getLatLng();
    const options = layer.options || {};
    return [new GraphicCtor({
      geometry: { type: "point", longitude: point.lng, latitude: point.lat },
      symbol: {
        type: "simple-marker",
        style: "circle",
        size: layer instanceof L.CircleMarker ? Math.max(7, Number(options.radius || 4) * 2.25) : 11,
        color: colorArray(options.fillColor || options.color || "#67e8f9", Number(options.fillOpacity ?? 0.9)),
        outline: {
          color: colorArray(options.color || "#ffffff", Number(options.opacity ?? 0.96)),
          width: Math.max(0.5, Number(options.weight || 1)),
        },
      },
      attributes,
      popupTemplate,
    })];
  }

  if (layer instanceof L.Circle) {
    const center = layer.getLatLng();
    return [new GraphicCtor({
      geometry: {
        type: "polygon",
        rings: [geodesicRing(center.lat, center.lng, layer.getRadius())],
        spatialReference: { wkid: 4326 },
      },
      symbol: polygonSymbol(layer.options),
      attributes,
      popupTemplate,
    })];
  }

  if (layer instanceof L.Polygon) {
    const rings: number[][][] = [];
    collectPaths(layer.getLatLngs(), rings);
    if (!rings.length) return [];
    return [new GraphicCtor({
      geometry: { type: "polygon", rings, spatialReference: { wkid: 4326 } },
      symbol: polygonSymbol(layer.options),
      attributes,
      popupTemplate,
    })];
  }

  if (layer instanceof L.Polyline) {
    const paths: number[][][] = [];
    collectPaths(layer.getLatLngs(), paths);
    if (!paths.length) return [];
    return [new GraphicCtor({
      geometry: { type: "polyline", paths, spatialReference: { wkid: 4326 } },
      symbol: {
        type: "simple-line",
        color: colorArray(layer.options?.color || "#67e8f9", Number(layer.options?.opacity ?? 0.9)),
        width: Math.max(1, Number(layer.options?.weight || 2)),
      },
      attributes,
      popupTemplate,
    })];
  }

  return [];
}

function polygonSymbol(options: any): any {
  return {
    type: "simple-fill",
    color: colorArray(options?.fillColor || options?.color || "#38bdf8", Number(options?.fillOpacity ?? 0.16)),
    outline: {
      color: colorArray(options?.color || "#7dd3fc", Number(options?.opacity ?? 0.85)),
      width: Math.max(0.75, Number(options?.weight || 1.5)),
    },
  };
}

function popupFor(layer: any): any | undefined {
  const popup = typeof layer.getPopup === "function" ? layer.getPopup() : null;
  const tooltip = typeof layer.getTooltip === "function" ? layer.getTooltip() : null;
  const raw = popup?.getContent?.() || tooltip?.getContent?.();
  const content = typeof raw === "string" ? raw : raw instanceof HTMLElement ? raw.outerHTML : "";
  if (!content) return undefined;
  const div = document.createElement("div");
  div.innerHTML = content;
  const title = (div.textContent || "Occu-Med network detail").replace(/\s+/g, " ").trim().slice(0, 90);
  return { title: title || "Occu-Med network detail", content };
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

function colorArray(value: unknown, opacity = 1): number[] {
  const alpha = Math.round(Math.max(0, Math.min(1, Number.isFinite(opacity) ? opacity : 1)) * 255);
  if (typeof value !== "string") return [103, 232, 249, alpha];
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
  return [103, 232, 249, alpha];
}

async function syncSceneFromLeaflet(tilt = false): Promise<void> {
  if (!sceneView || !capturedMap || mode !== "3d") return;
  const center = capturedMap.getCenter();
  await sceneView.goTo({
    center: [center.lng, center.lat],
    zoom: capturedMap.getZoom(),
    tilt: tilt ? 34 : sceneView.camera?.tilt,
  }, { animate: true, duration: 650 }).catch(() => undefined);
}

function syncLeafletFromScene(): void {
  if (!sceneView || !capturedMap || !sceneView.center) return;
  const latitude = Number(sceneView.center.latitude);
  const longitude = Number(sceneView.center.longitude);
  const zoom = Math.max(2, Math.min(17, Math.round(Number(sceneView.zoom || capturedMap.getZoom()))));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
  lastSceneDrivenMove = Date.now();
  capturedMap.setView([latitude, longitude], zoom, { animate: false });
}

function onLeafletViewChanged(): void {
  queueGraphicSync();
  if (mode !== "3d" || !sceneView || Date.now() - lastSceneDrivenMove < 500) return;
  void syncSceneFromLeaflet(false);
}

// Stop both older click handlers before they can invoke the key-dependent path.
document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const button = target?.closest<HTMLButtonElement>(".map-dimension-toggle button[data-map-mode]");
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const nextMode: MapMode = button.dataset.mapMode === "3d" ? "3d" : "2d";
  void setMode(nextMode);
}, true);

window.__NETWORK_MAP_GLOBE__ = {
  getMode: () => mode,
  setMode,
  sync: queueGraphicSync,
};

window.addEventListener("beforeunload", () => {
  stopPeriodicSync();
  destroyScene();
});

export {};

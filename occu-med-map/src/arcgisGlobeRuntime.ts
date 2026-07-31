import L from "leaflet";

type MapMode = "2d" | "3d";

type ArcgisImportApi = {
  import: (modules: string[]) => Promise<any[]>;
};

declare global {
  interface Window {
    $arcgis?: ArcgisImportApi;
    __NETWORK_MAP_GLOBE__?: {
      getMode: () => MapMode;
      setMode: (mode: MapMode) => Promise<void>;
      sync: () => void;
    };
  }
}

const ARCGIS_VERSION = "5.1";
const ARCGIS_SCRIPT_ID = "network-map-arcgis-sdk";
const ARCGIS_STYLE_ID = "network-map-arcgis-theme";
const MAX_MIRRORED_GRAPHICS = 12000;
const apiKey = import.meta.env.VITE_ARCGIS_API_KEY || "";

let capturedMap: L.Map | null = null;
let mode: MapMode = "2d";
let host: HTMLDivElement | null = null;
let control: HTMLDivElement | null = null;
let statusNode: HTMLSpanElement | null = null;
let sceneView: any = null;
let graphicsLayer: any = null;
let GraphicCtor: any = null;
let sceneReadyPromise: Promise<void> | null = null;
let syncTimer: number | null = null;
let periodicSyncTimer: number | null = null;
let sceneWatchHandle: { remove?: () => void } | null = null;
let sceneClickHandle: { remove?: () => void } | null = null;
let sceneDoubleClickHandle: { remove?: () => void } | null = null;
let lastSceneDrivenLeafletMove = 0;
let latestGraphicCount = 0;

const originalMapFactory = L.map.bind(L);

function installMapCapture(): void {
  (L as any).map = (element: string | HTMLElement, options?: L.MapOptions) => {
    const map = originalMapFactory(element, options);
    captureMap(map);
    return map;
  };
}

function captureMap(map: L.Map): void {
  capturedMap = map;
  map.whenReady(() => {
    installUi(map);
    map.on("layeradd layerremove overlayadd overlayremove", queueGraphicSync);
    map.on("moveend zoomend", onLeafletViewChanged);
  });
}

function installUi(map: L.Map): void {
  const mapContainer = map.getContainer();
  const mapWrap = mapContainer.parentElement;
  if (!mapWrap || mapWrap.querySelector(".map-dimension-toggle")) return;

  mapWrap.classList.add("map-dimension-switch-enabled");

  host = document.createElement("div");
  host.className = "arcgis-globe-host";
  host.setAttribute("aria-hidden", "true");
  host.innerHTML = `
    <div class="arcgis-globe-loading" role="status">
      <span class="arcgis-globe-spinner" aria-hidden="true"></span>
      <strong>Starting ArcGIS 3D globe</strong>
      <small>Synchronizing the active network layers…</small>
    </div>
  `;

  control = document.createElement("div");
  control.className = "map-dimension-toggle";
  control.setAttribute("role", "group");
  control.setAttribute("aria-label", "Map dimension");
  control.innerHTML = `
    <button type="button" class="active" data-map-mode="2d" aria-pressed="true" title="Use the current Mapbox flat map">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/></svg>
      <span><strong>2D</strong><small>Mapbox</small></span>
    </button>
    <button type="button" data-map-mode="3d" aria-pressed="false" title="Use the ArcGIS 3D globe">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4.5 6 4.5 9S15 18 12 21c-3-3-4.5-6-4.5-9S9 6 12 3Z"/></svg>
      <span><strong>3D</strong><small>ArcGIS</small></span>
    </button>
    <span class="map-dimension-status" aria-live="polite">Mapbox 2D active</span>
  `;

  statusNode = control.querySelector(".map-dimension-status");
  control.querySelectorAll<HTMLButtonElement>("button[data-map-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextMode = button.dataset.mapMode === "3d" ? "3d" : "2d";
      void setMode(nextMode);
    });
  });

  mapWrap.append(host, control);
}

function setStatus(message: string, state: "normal" | "loading" | "error" = "normal"): void {
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.dataset.state = state;
}

function updateToggleState(): void {
  if (!control) return;
  control.querySelectorAll<HTMLButtonElement>("button[data-map-mode]").forEach((button) => {
    const selected = button.dataset.mapMode === mode;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

async function setMode(nextMode: MapMode): Promise<void> {
  if (!capturedMap || !host) return;
  if (nextMode === mode && (nextMode === "2d" || sceneView)) return;

  mode = nextMode;
  updateToggleState();
  const mapWrap = capturedMap.getContainer().parentElement;

  if (mode === "3d") {
    mapWrap?.classList.add("arcgis-globe-active");
    host.setAttribute("aria-hidden", "false");
    setStatus("Loading ArcGIS 3D…", "loading");
    try {
      await ensureScene();
      syncGraphicsNow();
      await syncSceneToLeafletView(true);
      startPeriodicSync();
      setStatus(`ArcGIS 3D · ${latestGraphicCount.toLocaleString()} active items`);
    } catch (error) {
      console.error("ArcGIS globe failed to initialize", error);
      mode = "2d";
      updateToggleState();
      mapWrap?.classList.remove("arcgis-globe-active");
      host.setAttribute("aria-hidden", "true");
      setStatus("ArcGIS 3D unavailable", "error");
      capturedMap.invalidateSize();
    }
    return;
  }

  stopPeriodicSync();
  syncLeafletToSceneView();
  mapWrap?.classList.remove("arcgis-globe-active");
  host.setAttribute("aria-hidden", "true");
  capturedMap.invalidateSize();
  setStatus("Mapbox 2D active");
}

async function ensureScene(): Promise<void> {
  if (sceneView) return;
  if (sceneReadyPromise) return sceneReadyPromise;

  sceneReadyPromise = (async () => {
    if (!apiKey) throw new Error("VITE_ARCGIS_API_KEY is not configured");
    await loadArcgisSdk();
    if (!window.$arcgis || !host || !capturedMap) throw new Error("ArcGIS SDK did not load");

    const [esriConfig, ArcGISMap, SceneView, GraphicsLayer, Graphic, reactiveUtils] = await window.$arcgis.import([
      "@arcgis/core/config.js",
      "@arcgis/core/Map.js",
      "@arcgis/core/views/SceneView.js",
      "@arcgis/core/layers/GraphicsLayer.js",
      "@arcgis/core/Graphic.js",
      "@arcgis/core/core/reactiveUtils.js",
    ]);

    esriConfig.apiKey = apiKey;
    GraphicCtor = Graphic;
    graphicsLayer = new GraphicsLayer({
      title: "Occu-Med Network Map overlays",
      elevationInfo: { mode: "relative-to-ground", offset: 28 },
      listMode: "hide",
    });

    const sceneMap = new ArcGISMap({
      basemap: "arcgis/navigation-night",
      ground: "world-elevation",
      layers: [graphicsLayer],
    });

    const center = capturedMap.getCenter();
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
    sceneView.ui.components = ["zoom", "compass", "attribution"];
    host.classList.add("ready");

    sceneWatchHandle = reactiveUtils.watch(
      () => sceneView.stationary,
      (stationary: boolean) => {
        if (stationary && mode === "3d") syncLeafletToSceneView();
      },
    );

    sceneClickHandle = sceneView.on("click", async (event: any) => {
      if (mode !== "3d" || !capturedMap) return;
      const hit = await sceneView.hitTest(event).catch(() => null);
      const hitNetworkGraphic = Boolean(hit?.results?.some((result: any) => result?.graphic?.layer === graphicsLayer));
      if (hitNetworkGraphic || !event.mapPoint) return;
      capturedMap.fire("click", {
        latlng: L.latLng(event.mapPoint.latitude, event.mapPoint.longitude),
        originalEvent: event.native,
      });
    });

    sceneDoubleClickHandle = sceneView.on("double-click", (event: any) => {
      if (mode !== "3d" || !capturedMap || !event.mapPoint) return;
      event.stopPropagation?.();
      capturedMap.fire("dblclick", {
        latlng: L.latLng(event.mapPoint.latitude, event.mapPoint.longitude),
        originalEvent: event.native,
      });
    });
  })();

  try {
    await sceneReadyPromise;
  } catch (error) {
    sceneReadyPromise = null;
    throw error;
  }
}

function loadArcgisSdk(): Promise<void> {
  const existingStyle = document.getElementById(ARCGIS_STYLE_ID);
  if (!existingStyle) {
    const link = document.createElement("link");
    link.id = ARCGIS_STYLE_ID;
    link.rel = "stylesheet";
    link.href = `https://js.arcgis.com/${ARCGIS_VERSION}/esri/themes/dark/main.css`;
    document.head.appendChild(link);
  }

  if (window.$arcgis) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(ARCGIS_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existingScript || document.createElement("script");

    const onLoad = () => window.$arcgis ? resolve() : reject(new Error("ArcGIS global loader is missing"));
    const onError = () => reject(new Error("ArcGIS SDK request failed"));

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });

    if (!existingScript) {
      script.id = ARCGIS_SCRIPT_ID;
      script.src = `https://js.arcgis.com/${ARCGIS_VERSION}/`;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

function queueGraphicSync(): void {
  if (mode !== "3d" || !sceneView) return;
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    syncGraphicsNow();
  }, 120);
}

function startPeriodicSync(): void {
  stopPeriodicSync();
  periodicSyncTimer = window.setInterval(syncGraphicsNow, 1600);
}

function stopPeriodicSync(): void {
  if (periodicSyncTimer !== null) {
    window.clearInterval(periodicSyncTimer);
    periodicSyncTimer = null;
  }
}

function syncGraphicsNow(): void {
  if (mode !== "3d" || !capturedMap || !graphicsLayer || !GraphicCtor) return;

  const graphics: any[] = [];
  capturedMap.eachLayer((layer: any) => {
    if (graphics.length >= MAX_MIRRORED_GRAPHICS) return;
    const converted = leafletLayerToGraphics(layer);
    for (const graphic of converted) {
      if (graphics.length >= MAX_MIRRORED_GRAPHICS) break;
      graphics.push(graphic);
    }
  });

  graphicsLayer.removeAll();
  if (graphics.length) graphicsLayer.addMany(graphics);
  latestGraphicCount = graphics.length;
  if (mode === "3d") setStatus(`ArcGIS 3D · ${latestGraphicCount.toLocaleString()} active items`);
}

function leafletLayerToGraphics(layer: any): any[] {
  if (
    layer instanceof L.TileLayer ||
    layer instanceof L.GridLayer ||
    layer instanceof L.ImageOverlay ||
    layer instanceof L.LayerGroup ||
    layer instanceof L.Popup ||
    layer instanceof L.Tooltip
  ) return [];

  const popupTemplate = popupTemplateFor(layer);
  const attributes = { leafletLayerId: String(layer._leaflet_id || "") };

  if (layer instanceof L.Circle) {
    const center = layer.getLatLng();
    const rings = [buildGeodesicRing(center.lat, center.lng, layer.getRadius())];
    return [new GraphicCtor({
      geometry: { type: "polygon", rings, spatialReference: { wkid: 4326 } },
      symbol: polygonSymbol(layer.options),
      popupTemplate,
      attributes,
    })];
  }

  if (layer instanceof L.CircleMarker) {
    const center = layer.getLatLng();
    return [new GraphicCtor({
      geometry: { type: "point", longitude: center.lng, latitude: center.lat },
      symbol: pointSymbol(layer.options, Math.max(7, Number(layer.options.radius || 4) * 2.25)),
      popupTemplate,
      attributes,
    })];
  }

  if (layer instanceof L.Marker) {
    const center = layer.getLatLng();
    const iconHtml = String(layer.options?.icon?.options?.html || "");
    const iconColor = extractInlineBackground(iconHtml) || layer.options?.color || "#67e8f9";
    return [new GraphicCtor({
      geometry: { type: "point", longitude: center.lng, latitude: center.lat },
      symbol: pointSymbol({ ...layer.options, fillColor: iconColor, color: "#ffffff" }, 11),
      popupTemplate,
      attributes,
    })];
  }

  if (layer instanceof L.Polygon) {
    const rings: number[][][] = [];
    collectLatLngPaths(layer.getLatLngs(), rings);
    if (!rings.length) return [];
    return [new GraphicCtor({
      geometry: { type: "polygon", rings, spatialReference: { wkid: 4326 } },
      symbol: polygonSymbol(layer.options),
      popupTemplate,
      attributes,
    })];
  }

  if (layer instanceof L.Polyline) {
    const paths: number[][][] = [];
    collectLatLngPaths(layer.getLatLngs(), paths);
    if (!paths.length) return [];
    return [new GraphicCtor({
      geometry: { type: "polyline", paths, spatialReference: { wkid: 4326 } },
      symbol: {
        type: "simple-line",
        color: colorArray(layer.options?.color || "#67e8f9", numberOr(layer.options?.opacity, 0.9)),
        width: Math.max(1, numberOr(layer.options?.weight, 2)),
      },
      popupTemplate,
      attributes,
    })];
  }

  return [];
}

function pointSymbol(options: any, size: number): any {
  return {
    type: "simple-marker",
    style: "circle",
    size,
    color: colorArray(options?.fillColor || options?.color || "#67e8f9", numberOr(options?.fillOpacity, 0.9)),
    outline: {
      color: colorArray(options?.color || "#ffffff", numberOr(options?.opacity, 0.96)),
      width: Math.max(0.5, numberOr(options?.weight, 1)),
    },
  };
}

function polygonSymbol(options: any): any {
  return {
    type: "simple-fill",
    color: colorArray(options?.fillColor || options?.color || "#38bdf8", numberOr(options?.fillOpacity, 0.16)),
    outline: {
      color: colorArray(options?.color || "#7dd3fc", numberOr(options?.opacity, 0.85)),
      width: Math.max(0.75, numberOr(options?.weight, 1.5)),
    },
  };
}

function popupTemplateFor(layer: any): any | undefined {
  const popup = typeof layer.getPopup === "function" ? layer.getPopup() : null;
  const tooltip = typeof layer.getTooltip === "function" ? layer.getTooltip() : null;
  const popupContent = readLeafletContent(popup?.getContent?.());
  const tooltipContent = readLeafletContent(tooltip?.getContent?.());
  const content = popupContent || tooltipContent;
  if (!content) return undefined;

  const plainText = stripHtml(content);
  return {
    title: plainText.slice(0, 90) || "Occu-Med network detail",
    content,
  };
}

function readLeafletContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (content instanceof HTMLElement) return content.outerHTML;
  return "";
}

function stripHtml(value: string): string {
  const div = document.createElement("div");
  div.innerHTML = value;
  return (div.textContent || "").replace(/\s+/g, " ").trim();
}

function collectLatLngPaths(value: any, output: number[][][]): void {
  if (!Array.isArray(value) || value.length === 0) return;
  if (value[0] && typeof value[0].lat === "number" && typeof value[0].lng === "number") {
    output.push(value.map((point: L.LatLng) => [point.lng, point.lat]));
    return;
  }
  value.forEach((child: any) => collectLatLngPaths(child, output));
}

function buildGeodesicRing(lat: number, lng: number, radiusMeters: number): number[][] {
  const earthRadius = 6378137;
  const angularDistance = Math.max(1, radiusMeters) / earthRadius;
  const latitude = lat * Math.PI / 180;
  const longitude = lng * Math.PI / 180;
  const ring: number[][] = [];

  for (let index = 0; index <= 72; index += 1) {
    const bearing = (index / 72) * Math.PI * 2;
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

function extractInlineBackground(html: string): string | null {
  const match = html.match(/background(?:-color)?\s*:\s*([^;"']+)/i);
  return match?.[1]?.trim() || null;
}

function colorArray(value: unknown, opacity = 1): number[] {
  const fallback = [103, 232, 249, Math.round(clamp(opacity, 0, 1) * 255)];
  if (typeof value !== "string") return fallback;
  const color = value.trim();

  const rgba = color.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d*(?:\.\d+)?))?\s*\)$/i);
  if (rgba) {
    const alpha = rgba[4] === undefined || rgba[4] === "" ? 1 : Number(rgba[4]);
    return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), Math.round(clamp(alpha * opacity, 0, 1) * 255)];
  }

  const hex = color.replace("#", "");
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return [
      parseInt(hex[0] + hex[0], 16),
      parseInt(hex[1] + hex[1], 16),
      parseInt(hex[2] + hex[2], 16),
      Math.round(clamp(opacity, 0, 1) * 255),
    ];
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
      Math.round(clamp(opacity, 0, 1) * 255),
    ];
  }

  return fallback;
}

function numberOr(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

async function syncSceneToLeafletView(tiltOnArrival = false): Promise<void> {
  if (!sceneView || !capturedMap || mode !== "3d") return;
  const center = capturedMap.getCenter();
  await sceneView.goTo({
    center: [center.lng, center.lat],
    zoom: capturedMap.getZoom(),
    tilt: tiltOnArrival ? 34 : sceneView.camera?.tilt,
  }, { animate: true, duration: 650 }).catch(() => undefined);
}

function syncLeafletToSceneView(): void {
  if (!sceneView || !capturedMap || mode !== "3d" || !sceneView.center) return;
  const latitude = Number(sceneView.center.latitude);
  const longitude = Number(sceneView.center.longitude);
  const zoom = Math.max(2, Math.min(19, Math.round(numberOr(sceneView.zoom, capturedMap.getZoom()))));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

  const current = capturedMap.getCenter();
  if (Math.abs(current.lat - latitude) < 0.0001 && Math.abs(current.lng - longitude) < 0.0001 && capturedMap.getZoom() === zoom) return;

  lastSceneDrivenLeafletMove = Date.now();
  capturedMap.setView([latitude, longitude], zoom, { animate: false });
}

function onLeafletViewChanged(): void {
  queueGraphicSync();
  if (mode !== "3d" || !sceneView) return;
  if (Date.now() - lastSceneDrivenLeafletMove < 500) return;
  void syncSceneToLeafletView(false);
}

window.__NETWORK_MAP_GLOBE__ = {
  getMode: () => mode,
  setMode,
  sync: queueGraphicSync,
};

window.addEventListener("beforeunload", () => {
  stopPeriodicSync();
  sceneWatchHandle?.remove?.();
  sceneClickHandle?.remove?.();
  sceneDoubleClickHandle?.remove?.();
  sceneView?.destroy?.();
});

installMapCapture();

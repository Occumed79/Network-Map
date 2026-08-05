import mapboxgl from "mapbox-gl";

const DATA_URL = "/api/healthsites/flatgeobuf";
const FLATGEOBUF_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/flatgeobuf@4.4.0/dist/flatgeobuf-geojson.min.js";
const SOURCE_ID = "healthsites-flat-dots";
const LAYER_ID = "healthsites-flat-dots-layer";
const PATCH_FLAG = "__occumedHealthsitesFlatDotsPatched";
const PANEL_FLAG = "healthsitesFlatDotsReady";
const MINIMUM_QUERY_ZOOM = 4.5;
const MAX_VISIBLE_DOTS = 75_000;

type Rect = { minX: number; minY: number; maxX: number; maxY: number };
type PointFeature = GeoJSON.Feature<GeoJSON.Point, GeoJSON.GeoJsonProperties>;
type PointCollection = GeoJSON.FeatureCollection<GeoJSON.Point, GeoJSON.GeoJsonProperties>;
type FlatGeobufApi = {
  deserialize: (
    input: string,
    rect?: Rect,
    headerMetaFn?: ((metadata: unknown) => void) | undefined,
    nocache?: boolean,
    headers?: HeadersInit,
  ) => AsyncIterable<GeoJSON.Feature>;
};

declare global {
  interface Window {
    flatgeobuf?: FlatGeobufApi;
  }
}

const trackedMaps = new Set<mapboxgl.Map>();
const clickBoundMaps = new WeakSet<mapboxgl.Map>();
let enabled = false;
let latestCollection: PointCollection = { type: "FeatureCollection", features: [] };
let flatGeobufPromise: Promise<FlatGeobufApi> | null = null;
let refreshTimer: number | null = null;
let scanTimer: number | null = null;
let requestGeneration = 0;
let observer: MutationObserver | null = null;

function emptyCollection(): PointCollection {
  return { type: "FeatureCollection", features: [] };
}

function setStatus(message: string): void {
  document.querySelectorAll<HTMLElement>(".occumed-healthsites-status").forEach((node) => {
    node.textContent = message;
  });
}

function syncToggleButtons(): void {
  document.querySelectorAll<HTMLButtonElement>(".occumed-healthsites-toggle").forEach((button) => {
    button.classList.toggle("active", enabled);
    button.setAttribute("aria-pressed", String(enabled));
    button.textContent = enabled ? "Healthsites dots: On" : "Healthsites dots: Off";
  });
}

function loadFlatGeobuf(): Promise<FlatGeobufApi> {
  if (window.flatgeobuf?.deserialize) return Promise.resolve(window.flatgeobuf);
  if (flatGeobufPromise) return flatGeobufPromise;

  flatGeobufPromise = new Promise<FlatGeobufApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${FLATGEOBUF_SCRIPT_URL}"]`);
    const script = existing || document.createElement("script");

    const finish = () => {
      if (window.flatgeobuf?.deserialize) resolve(window.flatgeobuf);
      else reject(new Error("FlatGeobuf browser library did not initialize."));
    };

    if (existing) {
      if (window.flatgeobuf?.deserialize) finish();
      else {
        existing.addEventListener("load", finish, { once: true });
        existing.addEventListener("error", () => reject(new Error("FlatGeobuf browser library failed to load.")), { once: true });
      }
      return;
    }

    script.src = FLATGEOBUF_SCRIPT_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => reject(new Error("FlatGeobuf browser library failed to load.")), { once: true });
    document.head.appendChild(script);
  });

  return flatGeobufPromise;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function firstProperty(properties: GeoJSON.GeoJsonProperties, names: string[]): string {
  if (!properties) return "";
  for (const name of names) {
    const value = properties[name];
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return "";
}

function popupHtml(properties: GeoJSON.GeoJsonProperties): string {
  const name = firstProperty(properties, ["name", "facility_name", "name_en", "operator", "uuid"]) || "Healthsite facility";
  const type = firstProperty(properties, ["amenity", "healthcare", "facility_type", "type"]);
  const address = firstProperty(properties, ["addr_full", "address", "addr_street", "street"]);
  const city = firstProperty(properties, ["addr_city", "city", "town", "village"]);
  const country = firstProperty(properties, ["country", "country_name", "iso3", "iso2"]);
  const website = firstProperty(properties, ["website", "url"]);
  const phone = firstProperty(properties, ["phone", "contact_number"]);

  const rows = [
    type && ["Type", type],
    address && ["Address", address],
    city && ["City", city],
    country && ["Country", country],
    phone && ["Phone", phone],
  ].filter(Boolean) as string[][];

  const websiteRow = website
    ? `<div class="healthsites-popup-row"><span>Website</span><a href="${escapeHtml(website)}" target="_blank" rel="noreferrer">Open site</a></div>`
    : "";

  return `<div class="healthsites-popup">
    <div class="healthsites-popup-title">${escapeHtml(name)}</div>
    ${rows.map(([label, value]) => `<div class="healthsites-popup-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
    ${websiteRow}
    <div class="healthsites-popup-credit">Healthsites.io · individual facility record</div>
  </div>`;
}

function bindDotInteractions(map: mapboxgl.Map): void {
  if (clickBoundMaps.has(map)) return;
  clickBoundMaps.add(map);

  map.on("mouseenter", LAYER_ID, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", LAYER_ID, () => {
    map.getCanvas().style.cursor = "";
  });
  map.on("click", LAYER_ID, (event) => {
    const feature = event.features?.[0];
    if (!feature || feature.geometry.type !== "Point") return;
    const coordinates = feature.geometry.coordinates.slice() as [number, number];
    while (Math.abs(event.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += event.lngLat.lng > coordinates[0] ? 360 : -360;
    }
    new mapboxgl.Popup({ closeButton: true, maxWidth: "340px" })
      .setLngLat(coordinates)
      .setHTML(popupHtml(feature.properties || {}))
      .addTo(map);
  });
}

function ensureMapLayer(map: mapboxgl.Map): void {
  if (!map.isStyleLoaded()) return;

  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: latestCollection,
      cluster: false,
      generateId: true,
    });
  }

  if (!map.getLayer(LAYER_ID)) {
    map.addLayer({
      id: LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      minzoom: 0,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4.5, 2.3, 8, 3.4, 13, 5.2],
        "circle-color": "#8fd8e8",
        "circle-opacity": 0.92,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 4.5, 0.35, 12, 1],
        "circle-stroke-opacity": 0.82,
      },
    });
  }

  bindDotInteractions(map);
}

function pushCollection(collection: PointCollection): void {
  latestCollection = collection;
  for (const map of trackedMaps) {
    ensureMapLayer(map);
    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    source?.setData(collection);
  }
}

function visibleMap(): mapboxgl.Map | null {
  const mode = (window as any).__NETWORK_MAP_GLOBE__?.getMode?.();
  const maps = Array.from(trackedMaps);
  const preferred = maps.find((map) => {
    const container = map.getContainer();
    const isGlobe = Boolean(container.closest(".mapbox-globe-host"));
    const modeMatches = mode === "3d" ? isGlobe : mode === "2d" ? !isGlobe : true;
    const rect = container.getBoundingClientRect();
    const style = window.getComputedStyle(container);
    return modeMatches && rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  });
  return preferred || maps.find((map) => map.loaded()) || maps[0] || null;
}

function wrapLongitude(value: number): number {
  return ((value + 180) % 360 + 360) % 360 - 180;
}

function queryRectangles(map: mapboxgl.Map): Rect[] {
  const bounds = map.getBounds();
  if (!bounds) return [];
  const rawWest = bounds.getWest();
  const rawEast = bounds.getEast();
  const south = Math.max(-85.051129, bounds.getSouth());
  const north = Math.min(85.051129, bounds.getNorth());

  if (rawEast - rawWest >= 359.999) {
    return [{ minX: -180, minY: south, maxX: 180, maxY: north }];
  }

  const west = wrapLongitude(rawWest);
  const east = wrapLongitude(rawEast);
  if (west <= east) return [{ minX: west, minY: south, maxX: east, maxY: north }];
  return [
    { minX: west, minY: south, maxX: 180, maxY: north },
    { minX: -180, minY: south, maxX: east, maxY: north },
  ];
}

function featureKey(feature: PointFeature): string {
  const coordinates = feature.geometry.coordinates;
  const properties = feature.properties || {};
  const stableId = firstProperty(properties, ["uuid", "id", "osm_id", "healthsites_id"]);
  if (stableId) return stableId;
  const name = firstProperty(properties, ["name", "facility_name", "operator"]);
  return `${coordinates[0].toFixed(6)}:${coordinates[1].toFixed(6)}:${name}`;
}

async function fetchVisibleDots(map: mapboxgl.Map, generation: number): Promise<void> {
  const api = await loadFlatGeobuf();
  const features: PointFeature[] = [];
  const seen = new Set<string>();
  let capped = false;

  for (const rect of queryRectangles(map)) {
    const iterator = api.deserialize(DATA_URL, rect, undefined, false, { Accept: "application/octet-stream" });
    for await (const rawFeature of iterator) {
      if (generation !== requestGeneration || !enabled) return;
      if (rawFeature.geometry?.type !== "Point") continue;
      const feature = rawFeature as PointFeature;
      const key = featureKey(feature);
      if (seen.has(key)) continue;
      seen.add(key);
      features.push(feature);
      if (features.length >= MAX_VISIBLE_DOTS) {
        capped = true;
        break;
      }
    }
    if (capped) break;
  }

  if (generation !== requestGeneration || !enabled) return;
  pushCollection({ type: "FeatureCollection", features });
  setStatus(
    capped
      ? `${features.length.toLocaleString()} individual dots shown. Zoom closer to reveal all facilities in this area.`
      : `${features.length.toLocaleString()} individual Healthsites dots visible.`,
  );
}

function refreshVisibleDots(): void {
  if (!enabled) return;
  const map = visibleMap();
  if (!map) {
    setStatus("Map is still initializing.");
    return;
  }

  if (map.getZoom() < MINIMUM_QUERY_ZOOM) {
    requestGeneration += 1;
    pushCollection(emptyCollection());
    setStatus("Zoom closer to display individual Healthsites dots.");
    return;
  }

  const generation = ++requestGeneration;
  setStatus("Loading individual Healthsites dots for this view…");
  void fetchVisibleDots(map, generation).catch((error) => {
    if (generation !== requestGeneration || !enabled) return;
    console.error("Healthsites dots could not be loaded", error);
    pushCollection(emptyCollection());
    setStatus("Healthsites dots are temporarily unavailable.");
  });
}

function scheduleRefresh(delay = 320): void {
  if (refreshTimer !== null) window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null;
    refreshVisibleDots();
  }, delay);
}

function registerMap(map: mapboxgl.Map, originalOn: (...args: any[]) => mapboxgl.Map): void {
  if (trackedMaps.has(map)) return;
  trackedMaps.add(map);

  originalOn.call(map, "load", () => {
    ensureMapLayer(map);
    if (enabled) scheduleRefresh(0);
  });
  originalOn.call(map, "style.load", () => {
    ensureMapLayer(map);
    pushCollection(latestCollection);
  });
  originalOn.call(map, "moveend", () => scheduleRefresh());
  originalOn.call(map, "zoomend", () => scheduleRefresh());

  if (map.loaded()) {
    ensureMapLayer(map);
    if (enabled) scheduleRefresh(0);
  }
}

function patchMapboxRegistration(): void {
  const prototype = mapboxgl.Map.prototype as any;
  if (prototype[PATCH_FLAG]) return;

  const originalOn = prototype.on;
  prototype.on = function patchedOn(this: mapboxgl.Map, ...args: any[]): mapboxgl.Map {
    registerMap(this, originalOn);
    return originalOn.apply(this, args);
  };

  const originalRemove = prototype.remove;
  prototype.remove = function patchedRemove(this: mapboxgl.Map, ...args: any[]): unknown {
    trackedMaps.delete(this);
    return originalRemove.apply(this, args);
  };

  prototype[PATCH_FLAG] = true;
}

function toggleHealthsites(): void {
  enabled = !enabled;
  syncToggleButtons();
  requestGeneration += 1;

  if (!enabled) {
    pushCollection(emptyCollection());
    setStatus("Healthsites is off. No data is loaded until you turn it on.");
    return;
  }

  for (const map of trackedMaps) ensureMapLayer(map);
  scheduleRefresh(0);
}

function installPanel(panel: HTMLElement): void {
  if (panel.dataset[PANEL_FLAG] === "true") return;

  const section = document.createElement("div");
  section.className = "occumed-map-tools-section occumed-healthsites-section";

  const title = document.createElement("div");
  title.className = "occumed-map-tools-section-title";
  title.textContent = "Healthsites";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "occumed-healthsites-toggle";
  toggle.addEventListener("click", toggleHealthsites);

  const status = document.createElement("div");
  status.className = "occumed-healthsites-status";
  status.textContent = "Healthsites is off. No data is loaded until you turn it on.";

  const credit = document.createElement("div");
  credit.className = "occumed-healthsites-credit";
  credit.textContent = "Individual facility dots · no clustering · Healthsites.io";

  section.append(title, toggle, status, credit);
  panel.appendChild(section);
  panel.dataset[PANEL_FLAG] = "true";
  syncToggleButtons();
}

function scanForPanels(): void {
  document.querySelectorAll<HTMLElement>(".occumed-map-tools-panel").forEach(installPanel);
}

function scheduleScan(delay = 0): void {
  if (scanTimer !== null) window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(() => {
    scanTimer = null;
    scanForPanels();
  }, delay);
}

function startObserver(): void {
  if (observer || !document.body) return;
  observer = new MutationObserver(() => scheduleScan(40));
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleScan(0);
  window.setTimeout(() => scheduleScan(0), 500);
}

patchMapboxRegistration();
window.addEventListener("network-map:mode-changed", () => scheduleRefresh(80));
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startObserver, { once: true });
else startObserver();

export {};

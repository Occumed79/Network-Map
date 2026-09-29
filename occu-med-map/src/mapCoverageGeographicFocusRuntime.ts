import mapboxgl from "mapbox-gl";
import { getActiveMapboxMap, getTrackedMapboxMaps, registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";
import { registerMapToolsSection } from "./mapToolsPanelRegistry";
import { registerRuntimeOwner } from "./runtimeControllerRegistry";

const RADIUS_OPTIONS = [0, 10, 25, 40, 50, 75, 100] as const;
const COVERAGE_SOURCE_ID = "map-tools-provider-coverage-radius";
const COVERAGE_FILL_ID = "map-tools-provider-coverage-radius-fill";
const COVERAGE_LINE_ID = "map-tools-provider-coverage-radius-line";
const BOUNDARY_SOURCE_ID = "map-tools-geographic-focus";
const BOUNDARY_FILL_ID = "map-tools-geographic-focus-fill";
const BOUNDARY_LINE_ID = "map-tools-geographic-focus-line";
const TIGERWEB_BASE = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer";

const BOUNDARY_LAYERS = {
  state: [{ layer: 80, label: "State" }],
  county: [{ layer: 82, label: "County" }],
  city: [
    { layer: 28, label: "City" },
    { layer: 30, label: "Census-designated place" },
  ],
} as const;

const STATE_ABBREVIATIONS = Object.fromEntries(
  "01:AL|02:AK|04:AZ|05:AR|06:CA|08:CO|09:CT|10:DE|11:DC|12:FL|13:GA|15:HI|16:ID|17:IL|18:IN|19:IA|20:KS|21:KY|22:LA|23:ME|24:MD|25:MA|26:MI|27:MN|28:MS|29:MO|30:MT|31:NE|32:NV|33:NH|34:NJ|35:NM|36:NY|37:NC|38:ND|39:OH|40:OK|41:OR|42:PA|44:RI|45:SC|46:SD|47:TN|48:TX|49:UT|50:VT|51:VA|53:WA|54:WV|55:WI|56:WY|60:AS|66:GU|69:MP|72:PR|78:VI"
    .split("|")
    .map((pair) => pair.split(":")),
) as Record<string, string>;

type BoundaryKind = keyof typeof BOUNDARY_LAYERS;
type ProviderSelection = { key: string; name: string; lat: number; lng: number };
type BoundarySelection = { key: string; label: string; feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> };
type BoundarySearchResult = BoundarySelection & { kind: BoundaryKind };
type CoverageView = {
  root: HTMLElement;
  selectButton: HTMLButtonElement;
  clearButton: HTMLButtonElement;
  status: HTMLElement;
  radiusButtons: Map<number, HTMLButtonElement>;
};
type BoundaryView = {
  root: HTMLElement;
  kind: HTMLSelectElement;
  input: HTMLInputElement;
  results: HTMLElement;
  selected: HTMLElement;
  status: HTMLElement;
};

const selectedProviders = new Map<string, ProviderSelection>();
const selectedBoundaries = new Map<string, BoundarySelection>();
const coverageViews = new Set<CoverageView>();
const boundaryViews = new Set<BoundaryView>();
let radiusMiles = 0;
let selectingProviders = false;

function emptyCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function providerLayerIds(map: mapboxgl.Map): string[] {
  const fixed = new Set([
    "provider-explorer-native-pins",
    "provider-explorer-native-live",
    "provider-explorer-native-gaps",
    "live-finder-results-native",
    "provider-location-search-dots",
  ]);
  return (map.getStyle()?.layers || [])
    .map((layer) => layer.id)
    .filter((id) => fixed.has(id) || (id.startsWith("provider-dataset-native-") && id.endsWith("-points")))
    .filter((id) => Boolean(map.getLayer(id)));
}

function stripHtml(value: unknown): string {
  const node = document.createElement("div");
  node.innerHTML = String(value || "");
  return (node.textContent || "").replace(/\s+/g, " ").trim();
}

function circleFeature(provider: ProviderSelection, miles: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const earthRadiusMiles = 3958.7613;
  const angularDistance = miles / earthRadiusMiles;
  const lat1 = provider.lat * Math.PI / 180;
  const lng1 = provider.lng * Math.PI / 180;
  const coordinates: Array<[number, number]> = [];

  for (let index = 0; index <= 96; index += 1) {
    const bearing = (index / 96) * Math.PI * 2;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularDistance)
      + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const lng2 = lng1 + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );
    const lng = ((lng2 * 180 / Math.PI + 540) % 360) - 180;
    coordinates.push([lng, lat2 * 180 / Math.PI]);
  }

  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [coordinates] },
    properties: { key: provider.key, name: provider.name, miles },
  };
}

function coverageCollection(): GeoJSON.FeatureCollection {
  if (radiusMiles === 0) return emptyCollection();
  return {
    type: "FeatureCollection",
    features: [...selectedProviders.values()].map((provider) => circleFeature(provider, radiusMiles)),
  };
}

function boundaryCollection(): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [...selectedBoundaries.values()].map((item) => item.feature),
  };
}

function setSourceData(map: mapboxgl.Map, sourceId: string, data: GeoJSON.FeatureCollection): void {
  const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
  if (source) source.setData(data);
  else map.addSource(sourceId, { type: "geojson", data });
}

function ensureOverlayLayers(map: mapboxgl.Map): void {
  if (!map.isStyleLoaded()) return;
  setSourceData(map, COVERAGE_SOURCE_ID, coverageCollection());
  setSourceData(map, BOUNDARY_SOURCE_ID, boundaryCollection());

  if (!map.getLayer(BOUNDARY_FILL_ID)) {
    map.addLayer({
      id: BOUNDARY_FILL_ID,
      type: "fill",
      source: BOUNDARY_SOURCE_ID,
      paint: { "fill-color": "#f59e0b", "fill-opacity": 0.035 },
    });
  }
  if (!map.getLayer(BOUNDARY_LINE_ID)) {
    map.addLayer({
      id: BOUNDARY_LINE_ID,
      type: "line",
      source: BOUNDARY_SOURCE_ID,
      paint: {
        "line-color": "#f59e0b",
        "line-width": 2.1,
        "line-opacity": 0.85,
        "line-dasharray": [4, 3],
      },
    });
  }
  if (!map.getLayer(COVERAGE_FILL_ID)) {
    map.addLayer({
      id: COVERAGE_FILL_ID,
      type: "fill",
      source: COVERAGE_SOURCE_ID,
      paint: { "fill-color": "#38bdf8", "fill-opacity": 0.045 },
    });
  }
  if (!map.getLayer(COVERAGE_LINE_ID)) {
    map.addLayer({
      id: COVERAGE_LINE_ID,
      type: "line",
      source: COVERAGE_SOURCE_ID,
      paint: { "line-color": "#0ea5e9", "line-width": 2, "line-opacity": 0.9 },
    });
  }
}

function refreshOverlays(): void {
  for (const map of getTrackedMapboxMaps()) {
    if (!map.isStyleLoaded()) continue;
    try {
      ensureOverlayLayers(map);
      (map.getSource(COVERAGE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined)?.setData(coverageCollection());
      (map.getSource(BOUNDARY_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined)?.setData(boundaryCollection());
    } catch (error) {
      console.warn("Map coverage/geographic focus overlay update failed", error);
    }
  }
}

function providerAtClick(map: mapboxgl.Map, event: mapboxgl.MapMouseEvent): ProviderSelection | null {
  const layers = providerLayerIds(map);
  if (!layers.length) return null;
  const hitBox: [[number, number], [number, number]] = [
    [event.point.x - 12, event.point.y - 12],
    [event.point.x + 12, event.point.y + 12],
  ];
  const feature = map.queryRenderedFeatures(hitBox, { layers })
    .filter((candidate) => candidate.geometry?.type === "Point")
    .sort((left, right) => {
      const leftPoint = left.geometry.type === "Point"
        ? map.project(left.geometry.coordinates as [number, number])
        : event.point;
      const rightPoint = right.geometry.type === "Point"
        ? map.project(right.geometry.coordinates as [number, number])
        : event.point;
      return Math.hypot(leftPoint.x - event.point.x, leftPoint.y - event.point.y)
        - Math.hypot(rightPoint.x - event.point.x, rightPoint.y - event.point.y);
    })[0];
  if (!feature || feature.geometry.type !== "Point") return null;

  const lng = Number(feature.geometry.coordinates[0]);
  const lat = Number(feature.geometry.coordinates[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const properties = feature.properties || {};
  const providerId = String(properties.providerId || properties.id || properties.sourceId || `${lat.toFixed(6)},${lng.toFixed(6)}`);
  const key = `${feature.layer?.id || feature.source || "provider"}:${providerId}`;
  const name = stripHtml(properties.name || properties.label || properties.popupHtml || "Provider").slice(0, 80) || "Provider";
  return { key, name, lat, lng };
}

function toggleProvider(provider: ProviderSelection): void {
  if (selectedProviders.has(provider.key)) selectedProviders.delete(provider.key);
  else selectedProviders.set(provider.key, provider);
  refreshOverlays();
  refreshCoverageViews();
}

function bindMap(map: mapboxgl.Map): () => void {
  const apply = () => {
    try { ensureOverlayLayers(map); } catch (error) { console.warn("Map coverage/geographic focus layer setup failed", error); }
  };
  const onClick = (event: mapboxgl.MapMouseEvent) => {
    if (!selectingProviders || radiusMiles === 0) return;
    const provider = providerAtClick(map, event);
    if (provider) toggleProvider(provider);
  };

  map.on("load", apply);
  map.on("style.load", apply);
  map.on("click", onClick);
  if (map.isStyleLoaded()) queueMicrotask(apply);

  return () => {
    map.off("load", apply);
    map.off("style.load", apply);
    map.off("click", onClick);
  };
}

function actionButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function section(titleText: string, sectionId: string): HTMLElement {
  const root = document.createElement("div");
  root.className = "occumed-map-tools-section";
  root.dataset.mapToolsSection = sectionId;
  const title = document.createElement("div");
  title.className = "occumed-map-tools-section-title";
  title.textContent = titleText;
  root.appendChild(title);
  return root;
}

function refreshCoverageViews(): void {
  for (const view of coverageViews) {
    view.selectButton.classList.toggle("active", selectingProviders);
    view.selectButton.setAttribute("aria-pressed", String(selectingProviders));
    view.selectButton.disabled = radiusMiles === 0;
    view.clearButton.disabled = selectedProviders.size === 0;
    for (const [miles, button] of view.radiusButtons) {
      const active = radiusMiles === miles;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    view.status.textContent = radiusMiles === 0
      ? `${selectedProviders.size} pin${selectedProviders.size === 1 ? "" : "s"} selected · rings off`
      : `${selectedProviders.size} pin${selectedProviders.size === 1 ? "" : "s"} selected · ${radiusMiles} mi rings${selectingProviders ? " · select pins on map" : ""}`;
  }
}

function setRadius(miles: number): void {
  radiusMiles = miles;
  selectingProviders = miles > 0;
  refreshOverlays();
  refreshCoverageViews();
}

function mountCoverageRadius(panel: HTMLElement): () => void {
  const root = section("Coverage Radius", "provider-coverage-radius");
  const radiusActions = document.createElement("div");
  radiusActions.className = "occumed-mapbox-actions";
  const radiusButtons = new Map<number, HTMLButtonElement>();
  for (const miles of RADIUS_OPTIONS) {
    const button = actionButton(miles === 0 ? "Off" : `${miles} mi`, () => setRadius(miles));
    radiusButtons.set(miles, button);
    radiusActions.appendChild(button);
  }

  const selectionActions = document.createElement("div");
  selectionActions.className = "occumed-mapbox-actions";
  const selectButton = actionButton("Select pins", () => {
    if (radiusMiles === 0) return;
    selectingProviders = !selectingProviders;
    refreshCoverageViews();
  });
  const clearButton = actionButton("Clear pins", () => {
    selectedProviders.clear();
    refreshOverlays();
    refreshCoverageViews();
  });
  selectionActions.append(selectButton, clearButton);

  const status = document.createElement("div");
  status.className = "occumed-mapbox-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  root.append(radiusActions, selectionActions, status);
  panel.appendChild(root);

  const view = { root, selectButton, clearButton, status, radiusButtons };
  coverageViews.add(view);
  refreshCoverageViews();
  return () => {
    coverageViews.delete(view);
    root.remove();
  };
}

function boundaryLabel(feature: GeoJSON.Feature, fallback: string): string {
  const properties = feature.properties || {};
  const name = String(properties.NAME || properties.BASENAME || "").trim();
  const stateFips = String(properties.STATE || "").padStart(2, "0");
  const state = String(properties.STUSAB || STATE_ABBREVIATIONS[stateFips] || "").trim();
  return [name || fallback, state].filter(Boolean).join(", ");
}

function boundaryKey(feature: GeoJSON.Feature, kind: BoundaryKind, layer: number, label: string): string {
  const properties = feature.properties || {};
  return `${kind}:${layer}:${String(properties.GEOID || properties.OBJECTID || label)}`;
}

async function queryBoundaryLayer(kind: BoundaryKind, config: { layer: number; label: string }, query: string): Promise<BoundarySearchResult[]> {
  const safeQuery = query.replace(/[%_']/g, " ").replace(/\s+/g, " ").trim();
  if (!safeQuery) return [];
  const url = new URL(`${TIGERWEB_BASE}/${config.layer}/query`);
  const literal = safeQuery.toUpperCase().replaceAll("'", "''");
  url.searchParams.set("where", `UPPER(BASENAME) LIKE '%${literal}%' OR UPPER(NAME) LIKE '%${literal}%'`);
  url.searchParams.set("outFields", "*");
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("outSR", "4326");
  // TIGERweb place geometries can contain hundreds of thousands of vertices.
  // Simplify them server-side so choosing a city remains responsive in Mapbox.
  url.searchParams.set("maxAllowableOffset", "0.0005");
  url.searchParams.set("geometryPrecision", "5");
  url.searchParams.set("resultRecordCount", "12");
  url.searchParams.set("f", "geojson");

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Census boundary search HTTP ${response.status}`);
  const collection = await response.json() as GeoJSON.FeatureCollection;
  return (collection.features || []).flatMap((feature) => {
    if (feature.geometry?.type !== "Polygon" && feature.geometry?.type !== "MultiPolygon") return [];
    const label = boundaryLabel(feature, config.label);
    return [{
      kind,
      key: boundaryKey(feature, kind, config.layer, label),
      label,
      feature: feature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
    }];
  });
}

async function searchBoundaries(kind: BoundaryKind, query: string): Promise<BoundarySearchResult[]> {
  const groups = await Promise.all(BOUNDARY_LAYERS[kind].map((config) => queryBoundaryLayer(kind, config, query)));
  const seen = new Set<string>();
  return groups.flat().filter((result) => {
    if (seen.has(result.key)) return false;
    seen.add(result.key);
    return true;
  }).slice(0, 18);
}

function visitCoordinates(value: unknown, bounds: mapboxgl.LngLatBounds): void {
  if (!Array.isArray(value)) return;
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
    bounds.extend([value[0], value[1]]);
    return;
  }
  value.forEach((child) => visitCoordinates(child, bounds));
}

function fitSelectedBoundaries(): void {
  const map = getActiveMapboxMap();
  if (!map || selectedBoundaries.size === 0) return;
  const bounds = new mapboxgl.LngLatBounds();
  for (const selection of selectedBoundaries.values()) visitCoordinates(selection.feature.geometry.coordinates, bounds);
  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 48, duration: 700, maxZoom: 11 });
}

function renderBoundarySelected(view: BoundaryView): void {
  view.selected.innerHTML = "";
  for (const selection of selectedBoundaries.values()) {
    const button = actionButton(`× ${selection.label}`, () => {
      selectedBoundaries.delete(selection.key);
      refreshOverlays();
      refreshBoundaryViews();
    });
    view.selected.appendChild(button);
  }
  view.status.textContent = `${selectedBoundaries.size} ${selectedBoundaries.size === 1 ? "area" : "areas"} selected`;
}

function refreshBoundaryViews(): void {
  boundaryViews.forEach(renderBoundarySelected);
}

function renderBoundaryResults(view: BoundaryView, results: BoundarySearchResult[]): void {
  view.results.innerHTML = "";
  if (results.length === 0) {
    view.results.textContent = "No matching Census boundary found.";
    return;
  }
  for (const result of results) {
    const button = actionButton(result.label, () => {
      selectedBoundaries.set(result.key, result);
      refreshOverlays();
      refreshBoundaryViews();
    });
    button.className = "occumed-eta-row";
    view.results.appendChild(button);
  }
}

async function runBoundarySearch(view: BoundaryView): Promise<void> {
  const query = view.input.value.trim();
  if (!query) return;
  const kind = view.kind.value as BoundaryKind;
  view.status.textContent = `Searching ${kind} boundaries…`;
  view.results.innerHTML = "";
  try {
    const results = await searchBoundaries(kind, query);
    renderBoundaryResults(view, results);
    view.status.textContent = `${results.length} match${results.length === 1 ? "" : "es"} · ${selectedBoundaries.size} selected`;
  } catch (error) {
    view.status.textContent = error instanceof Error ? error.message : "Boundary search failed.";
  }
}

function mountGeographicFocus(panel: HTMLElement): () => void {
  const root = section("Geographic Focus", "geographic-focus");
  const kind = document.createElement("select");
  kind.className = "occumed-mapbox-search";
  kind.setAttribute("aria-label", "Boundary type");
  for (const [value, label] of [["state", "State"], ["county", "County"], ["city", "City"]] as const) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    kind.appendChild(option);
  }
  const input = document.createElement("input");
  input.type = "text";
  input.className = "occumed-mapbox-search";
  input.placeholder = "Search U.S. state, county, or city";
  input.setAttribute("aria-label", "Boundary search");

  const actions = document.createElement("div");
  actions.className = "occumed-mapbox-actions";
  const searchButton = actionButton("Search", () => { void runBoundarySearch(view); });
  const fitButton = actionButton("Fit selected", fitSelectedBoundaries);
  const clearButton = actionButton("Clear areas", () => {
    selectedBoundaries.clear();
    refreshOverlays();
    refreshBoundaryViews();
  });
  actions.append(searchButton, fitButton, clearButton);

  const results = document.createElement("div");
  results.className = "occumed-eta-results";
  const selected = document.createElement("div");
  selected.className = "occumed-mapbox-actions";
  const status = document.createElement("div");
  status.className = "occumed-mapbox-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  const view: BoundaryView = { root, kind, input, results, selected, status };
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void runBoundarySearch(view);
  });
  root.append(kind, input, actions, results, selected, status);
  panel.appendChild(root);
  boundaryViews.add(view);
  renderBoundarySelected(view);

  return () => {
    boundaryViews.delete(view);
    root.remove();
  };
}

function installMapCoverageGeographicFocus(): void {
  if (!registerRuntimeOwner("map-coverage-geographic-focus", "Map Tools provider coverage rings and Census geographic focus")) return;
  registerMapboxMapInitializer({ id: "map-coverage-geographic-focus", priority: 16, initialize: bindMap });
  registerMapToolsSection({ id: "provider-coverage-radius", priority: 140, mount: (panel) => mountCoverageRadius(panel) });
  registerMapToolsSection({ id: "geographic-focus", priority: 150, mount: (panel) => mountGeographicFocus(panel) });
}

installMapCoverageGeographicFocus();
export {};

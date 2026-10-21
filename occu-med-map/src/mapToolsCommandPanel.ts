import mapboxgl from "mapbox-gl";
import { rankProvidersByEta } from "./features/driveTime/providerEtaEngine";
import { getProviderEtaResult, setProviderEtaResult } from "./features/driveTime/providerEtaStore";
import type { EtaProviderRanking, EtaRankingResult } from "./features/driveTime/providerEtaTypes";
import { applyBasemapStyle, type BasemapStyle } from "./mapControlsBridgeRuntime";
import { getActiveMapboxMap, getTrackedMapboxMaps, registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";
import { hasMapboxToken, mapboxDirections, mapboxGeocode, mapboxIsochrone, mapboxReverseGeocode } from "./mapboxServices";
import { registerMapToolsPanel } from "./mapToolsPanelRegistry";
import {
  clearMapToolsDensity,
  clearMapToolsRoute,
  clearMapToolsZones,
  fitActiveMapToGeoJSON,
  fitActiveMapToRoute,
  setMapToolsDensity,
  setMapToolsOrigin,
  setMapToolsRoute,
  setMapToolsZones,
  type NativeMapToolsPoint,
} from "./mapToolsNativeMapRuntime";
import { registerRuntimeOwner } from "./runtimeControllerRegistry";

type Point = NativeMapToolsPoint;

let installed = false;
let origin: Point | null = null;
let densityEnabled = false;
let statusNode: HTMLDivElement | null = null;
let etaResultsNode: HTMLDivElement | null = null;
let latestRankings: EtaProviderRanking[] = [];
let latestRankingResult: EtaRankingResult | null = null;
let panelOwner: mapboxgl.Map | null = null;
let removePanel: (() => void) | null = null;

const basemaps: Array<{ label: string; style: BasemapStyle }> = [
  { label: "Dark", style: "dark-v11" },
  { label: "Streets", style: "streets-v12" },
  { label: "Light", style: "light-v11" },
  { label: "Terrain", style: "outdoors-v12" },
  { label: "Satellite", style: "satellite-streets-v12" },
];

function setStatus(text: string): void {
  if (statusNode) statusNode.textContent = text;
}

function activeMap(): mapboxgl.Map | null {
  return getActiveMapboxMap();
}

// The map controls bridge is the single basemap owner: it restyles the 2D map
// and the globe together, marks the active button, and reports progress.
function updateBasemap(style: BasemapStyle): void {
  void applyBasemapStyle(style);
}

function stripHtml(value: unknown): string {
  const node = document.createElement("div");
  node.innerHTML = String(value || "");
  return (node.textContent || "").replace(/\s+/g, " ").trim();
}

function providerLayerIds(map: mapboxgl.Map): string[] {
  const fixed = new Set([
    "provider-explorer-native-pins",
    "provider-explorer-native-live",
    "provider-explorer-native-gaps",
    "live-finder-results-native",
    "provider-location-search-dots",
  ]);
  // getStyle() throws while a style swap is in flight; no provider layers
  // are queryable then.
  let layers: mapboxgl.LayerSpecification[] = [];
  try { layers = map.getStyle()?.layers || []; } catch { return []; }
  return layers
    .map((layer) => layer.id)
    .filter((id) => fixed.has(id) || (id.startsWith("provider-dataset-native-") && id.endsWith("-points")));
}

function visibleProviderPoints(map: mapboxgl.Map): Array<Point & { name: string }> {
  const layers = providerLayerIds(map);
  if (!layers.length) return [];
  const canvas = map.getCanvas();
  const box: [[number, number], [number, number]] = [[0, 0], [canvas.clientWidth, canvas.clientHeight]];
  let features: mapboxgl.MapboxGeoJSONFeature[] = [];
  try { features = map.queryRenderedFeatures(box, { layers }); } catch { return []; }
  const seen = new Set<string>();
  const rows: Array<Point & { name: string }> = [];
  for (const feature of features) {
    if (feature.geometry?.type !== "Point") continue;
    const coordinates = feature.geometry.coordinates;
    const lng = Number(coordinates[0]);
    const lat = Number(coordinates[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const properties = feature.properties || {};
    const key = String(properties.providerId || properties.id || `${lat.toFixed(6)},${lng.toFixed(6)}`);
    if (seen.has(key)) continue;
    seen.add(key);
    const name = stripHtml(properties.name || properties.popupHtml || properties.label || key).slice(0, 72) || "Provider";
    rows.push({ lat, lng, name });
  }
  return rows;
}

function emitOriginChanged(): void {
  window.dispatchEvent(new CustomEvent("occumed:map-origin-changed", { detail: origin }));
}

// Publishes the Map Tools ranking to the shared ETA store that the Results
// workspace reads for its per-provider drive-time badges.
function emitEtaRankings(): void {
  if (latestRankingResult) setProviderEtaResult(latestRankingResult);
  window.dispatchEvent(new CustomEvent("occumed:provider-eta-rankings", { detail: latestRankings }));
}

function setOrigin(point: Point): void {
  origin = point;
  setMapToolsOrigin(point);
  setStatus(`Origin set: ${point.label || point.lat.toFixed(4) + ", " + point.lng.toFixed(4)}`);
  emitOriginChanged();
}

async function searchPlace(input: HTMLInputElement): Promise<void> {
  const query = input.value.trim();
  if (!query) return;
  const map = activeMap();
  if (!map) { setStatus("Map is not ready."); return; }
  setStatus("Searching Mapbox...");
  try {
    const center = map.getCenter();
    const results = await mapboxGeocode(query, { lat: center.lat, lng: center.lng });
    const best = results[0];
    if (!best) { setStatus("No Mapbox result found."); return; }
    setOrigin({ lat: best.lat, lng: best.lng, label: best.placeName });
    map.flyTo({ center: [best.lng, best.lat], zoom: 13, duration: 1100, essential: true });
  } catch (err: any) {
    setStatus(err?.message || "Search failed.");
  }
}

function clearRoutes(): void {
  clearMapToolsRoute();
  clearMapToolsZones();
  if (latestRankingResult && getProviderEtaResult() === latestRankingResult) setProviderEtaResult(null);
  latestRankings = [];
  latestRankingResult = null;
  if (etaResultsNode) etaResultsNode.innerHTML = "";
  emitEtaRankings();
  setStatus("Routes and zones cleared.");
}

async function drawRoute(target: Point): Promise<void> {
  if (!origin) { setStatus("Set an origin first."); return; }
  setStatus("Loading Mapbox route...");
  try {
    const route = await mapboxDirections(origin, target, "driving-traffic");
    setMapToolsRoute(route.coordinates, target);
    fitActiveMapToRoute(route.coordinates, 38);
    setStatus(`${target.label || "Provider"}: ${route.distanceMiles.toFixed(1)} mi / ${Math.round(route.durationMinutes)} min.`);
  } catch (err: any) {
    setStatus(err?.message || "Route failed.");
  }
}

async function drawZones(): Promise<void> {
  if (!origin) { setStatus("Set an origin first."); return; }
  setStatus("Loading 15/30/45/60 minute zones...");
  try {
    const data = await mapboxIsochrone(origin, [15, 30, 45, 60], "driving");
    setMapToolsZones(data);
    fitActiveMapToGeoJSON(data, 30);
    setStatus("Service zones shown: 15 / 30 / 45 / 60 minutes.");
  } catch (err: any) {
    setStatus(err?.message || "Zones failed.");
  }
}

function renderRankings(rows: EtaProviderRanking[]): void {
  if (!etaResultsNode) return;
  etaResultsNode.innerHTML = "";
  rows.forEach((row, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "occumed-eta-row";
    const name = document.createElement("span");
    name.textContent = `${index + 1}. ${row.name}`;
    const mins = document.createElement("strong");
    mins.textContent = `${Math.round(row.driveMinutes)} min`;
    const miles = document.createElement("em");
    miles.textContent = `${row.driveMiles.toFixed(1)} mi`;
    btn.append(name, mins, miles);
    btn.addEventListener("click", () => { void drawRoute({ lat: row.lat, lng: row.lng, label: row.name }); });
    etaResultsNode?.appendChild(btn);
  });
}

async function rankVisiblePins(): Promise<void> {
  if (!origin) { setStatus("Set an origin first."); return; }
  const map = activeMap();
  if (!map) { setStatus("Map is not ready."); return; }
  const rankingOrigin = { ...origin, label: origin.label || "Selected origin" };
  const candidates = visibleProviderPoints(map).map((point, index) => ({ ...point, id: `map-tools:${index}` }));
  const options = { maxCandidates: 8, maxRouteCalls: 8, maxStraightMiles: 250, routeProfile: "driving-traffic" as const };
  setStatus(`Ranking visible pins by drive time...`);
  let result: EtaRankingResult;
  try {
    result = await rankProvidersByEta(rankingOrigin, candidates, options);
  } catch (err: any) {
    setStatus(err?.message || "Drive-time ranking failed.");
    return;
  }
  if (result.attempted === 0) { setStatus("No visible provider pins found to rank."); return; }
  latestRankings = result.rankings.slice(0, 6);
  latestRankingResult = { ...result, rankings: latestRankings };
  renderRankings(latestRankings);
  emitEtaRankings();
  setStatus(`Ranked ${latestRankings.length} provider pins. Result cards updated.`);
}

async function copyEta(): Promise<void> {
  if (latestRankings.length === 0) { setStatus("No ETA ranking to copy yet."); return; }
  const lines = [`Provider ETA ranking from ${origin?.label || "selected origin"}`];
  latestRankings.forEach((row, index) => lines.push(`${index + 1}. ${row.name} — ${Math.round(row.driveMinutes)} min / ${row.driveMiles.toFixed(1)} mi`));
  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    setStatus("ETA ranking copied.");
  } catch {
    setStatus(lines.join(" | "));
  }
}

function drawDensity(): void {
  if (!densityEnabled) { clearMapToolsDensity(); return; }
  const map = activeMap();
  if (!map) return;
  const points = visibleProviderPoints(map);
  setMapToolsDensity(points);
  setStatus(`Density field: ${points.length} visible provider pins sampled.`);
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}

function section(label: string): HTMLDivElement {
  const node = document.createElement("div");
  node.className = "occumed-map-tools-section";
  const title = document.createElement("div");
  title.className = "occumed-map-tools-section-title";
  title.textContent = label;
  node.appendChild(title);
  return node;
}

function createPanel(map: mapboxgl.Map): () => void {
  const box = document.createElement("div");
  box.className = "occumed-map-tools-panel";
  box.addEventListener("click", (event) => event.stopPropagation());
  box.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });

  const title = document.createElement("div");
  title.className = "occumed-basemap-title";
  title.textContent = "Map Tools";
  box.appendChild(title);

  const search = section("Search");
  const input = document.createElement("input");
  input.className = "occumed-mapbox-search";
  input.placeholder = "Search address or place";
  input.type = "text";
  const searchActions = document.createElement("div");
  searchActions.className = "occumed-mapbox-actions";
  searchActions.appendChild(button("Search", () => { void searchPlace(input); }));
  input.addEventListener("keydown", (event) => { if (event.key === "Enter") void searchPlace(input); });
  search.append(input, searchActions);
  box.appendChild(search);

  const route = section("Routes and Zones");
  const routeActions = document.createElement("div");
  routeActions.className = "occumed-mapbox-actions";
  routeActions.appendChild(button("Service Zones", () => { void drawZones(); }));
  routeActions.appendChild(button("Clear", clearRoutes));
  route.appendChild(routeActions);
  box.appendChild(route);

  const eta = section("ETA Ranking");
  const etaActions = document.createElement("div");
  etaActions.className = "occumed-mapbox-actions";
  etaActions.appendChild(button("Rank Visible", () => { void rankVisiblePins(); }));
  etaActions.appendChild(button("Apply to Results", emitEtaRankings));
  etaActions.appendChild(button("Copy ETA", () => { void copyEta(); }));
  etaResultsNode = document.createElement("div");
  etaResultsNode.className = "occumed-eta-results";
  eta.append(etaActions, etaResultsNode);
  box.appendChild(eta);

  const density = section("Density and Basemap");
  const densityActions = document.createElement("div");
  densityActions.className = "occumed-mapbox-actions";
  const densityButton = button("Density", () => {
    densityEnabled = !densityEnabled;
    densityButton.classList.toggle("active", densityEnabled);
    densityButton.setAttribute("aria-pressed", String(densityEnabled));
    drawDensity();
  });
  densityButton.setAttribute("aria-pressed", "false");
  densityActions.appendChild(densityButton);
  basemaps.forEach((item) => densityActions.appendChild(button(item.label, () => updateBasemap(item.style))));
  density.appendChild(densityActions);
  box.appendChild(density);

  statusNode = document.createElement("div");
  statusNode.className = "occumed-mapbox-status";
  statusNode.setAttribute("role", "status");
  statusNode.setAttribute("aria-live", "polite");
  statusNode.textContent = "Click map to set origin. Alt-click routes from origin.";
  box.appendChild(statusNode);

  map.getContainer().appendChild(box);
  const unregisterPanel = registerMapToolsPanel(box, map);
  return () => {
    unregisterPanel();
    box.remove();
    if (statusNode && !statusNode.isConnected) statusNode = null;
    if (etaResultsNode && !etaResultsNode.isConnected) etaResultsNode = null;
  };
}

// One Map Tools panel serves every map mode. It is mounted on the first map
// that registers (2D or globe) and moves to a surviving map if its owner is
// removed, e.g. when the 2D map fails to load and the globe is used instead.
function mountPanel(map: mapboxgl.Map): void {
  panelOwner = map;
  removePanel = createPanel(map);
  if (latestRankings.length) renderRankings(latestRankings);
}

function releasePanel(map: mapboxgl.Map): void {
  if (panelOwner !== map) return;
  removePanel?.();
  panelOwner = null;
  removePanel = null;
  const next = getTrackedMapboxMaps().find((candidate) => candidate !== map);
  if (next) mountPanel(next);
}

function installNativeEvents(): () => void {
  const onClick = async (rawEvent: Event) => {
    const detail = (rawEvent as CustomEvent<{ lat: number; lng: number; originalEvent?: MouseEvent }>).detail;
    if (!detail) return;
    const point = { lat: detail.lat, lng: detail.lng };
    if (detail.originalEvent?.altKey) {
      await drawRoute(point);
      return;
    }
    try {
      const place = await mapboxReverseGeocode(point);
      setOrigin({ ...point, label: place?.placeName || "Selected location" });
    } catch {
      setOrigin(point);
    }
  };
  const onCamera = () => { if (densityEnabled) drawDensity(); };
  window.addEventListener("network-map:native-click", onClick as EventListener);
  window.addEventListener("network-map:native-camera", onCamera);
  return () => {
    window.removeEventListener("network-map:native-click", onClick as EventListener);
    window.removeEventListener("network-map:native-camera", onCamera);
  };
}

export function installMapToolsCommandPanel(): void {
  if (installed || !hasMapboxToken()) return;
  if (!registerRuntimeOwner("map-tools-command-panel", "Authoritative native Map Tools panel and core actions")) return;
  installed = true;
  installNativeEvents();
  registerMapboxMapInitializer({
    id: "map-tools-command-panel-ui",
    priority: 40,
    initialize: (map) => {
      if (!panelOwner) mountPanel(map);
      return () => releasePanel(map);
    },
  });
}

installMapToolsCommandPanel();

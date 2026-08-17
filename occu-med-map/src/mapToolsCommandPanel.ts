import mapboxgl from "mapbox-gl";
import { getActiveMapboxMap, getMapboxMapByMode, registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";
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
type RankedPin = Point & { name: string; driveMiles: number; driveMinutes: number; coordinates: Array<[number, number]> };

let installed = false;
let origin: Point | null = null;
let densityEnabled = false;
let statusNode: HTMLDivElement | null = null;
let etaResultsNode: HTMLDivElement | null = null;
let latestRankings: RankedPin[] = [];

const basemaps = [
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

function updateBasemap(style: string): void {
  const map = getMapboxMapByMode("2d");
  if (!map) { setStatus("Mapbox 2D map is not ready yet."); return; }
  map.setStyle(`mapbox://styles/mapbox/${style}`);
  setStatus(`2D basemap: ${basemaps.find((item) => item.style === style)?.label || style}.`);
}

function milesBetween(a: Point, b: Point): number {
  const radiusMiles = 3958.7613;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radiusMiles * Math.asin(Math.sqrt(h));
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
  return (map.getStyle()?.layers || [])
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

function emitEtaRankings(): void {
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
  latestRankings = [];
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

function visibleMarkerCandidates(map: mapboxgl.Map, currentOrigin: Point) {
  return visibleProviderPoints(map)
    .map((point) => ({ ...point, straightMiles: milesBetween(currentOrigin, point) }))
    .filter((point) => point.straightMiles >= 0.03 && point.straightMiles <= 250)
    .sort((a, b) => a.straightMiles - b.straightMiles)
    .slice(0, 8);
}

function renderRankings(rows: RankedPin[]): void {
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
    btn.addEventListener("click", () => { void drawRoute(row); });
    etaResultsNode?.appendChild(btn);
  });
}

async function rankVisiblePins(): Promise<void> {
  if (!origin) { setStatus("Set an origin first."); return; }
  const map = activeMap();
  if (!map) { setStatus("Map is not ready."); return; }
  const candidates = visibleMarkerCandidates(map, origin);
  if (candidates.length === 0) { setStatus("No visible provider pins found to rank."); return; }
  setStatus(`Ranking ${candidates.length} visible pins by drive time...`);
  const ranked: RankedPin[] = [];
  for (const candidate of candidates) {
    try {
      const route = await mapboxDirections(origin, candidate, "driving-traffic");
      ranked.push({ ...candidate, driveMiles: route.distanceMiles, driveMinutes: route.durationMinutes, coordinates: route.coordinates });
    } catch {}
  }
  ranked.sort((a, b) => a.driveMinutes - b.driveMinutes);
  latestRankings = ranked.slice(0, 6);
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
    initialize: (map, context) => context.mode === "2d" ? createPanel(map) : undefined,
  });
}

installMapToolsCommandPanel();

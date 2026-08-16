from pathlib import Path

root = Path(__file__).resolve().parents[1]

# 1) Add active/native map helpers to the authoritative Mapbox lifecycle.
lifecycle = root / "src/mapboxMapLifecycleRuntime.ts"
text = lifecycle.read_text()
anchor = '''export function getTrackedMapboxMaps(): mapboxgl.Map[] {
  return [...maps.keys()];
}

'''
replacement = '''export function getTrackedMapboxMaps(): mapboxgl.Map[] {
  return [...maps.keys()];
}

export function getMapboxMapByMode(mode: MapboxMapMode): mapboxgl.Map | null {
  for (const [map, tracked] of maps) {
    if (tracked.context.mode === mode) return map;
  }
  return null;
}

export function getActiveMapboxMap(): mapboxgl.Map | null {
  const requestedMode = (window as any).__NETWORK_MAP_GLOBE__?.getMode?.() as MapboxMapMode | undefined;
  if (requestedMode) {
    const requested = getMapboxMapByMode(requestedMode);
    if (requested) return requested;
  }
  return getMapboxMapByMode("2d") || getTrackedMapboxMaps()[0] || null;
}

'''
if anchor not in text:
    raise SystemExit("Mapbox lifecycle insertion anchor missing")
lifecycle.write_text(text.replace(anchor, replacement, 1))

# 2) Shared native Map Tools overlays rendered identically in both Mapbox engines.
overlay = root / "src/mapToolsNativeMapRuntime.ts"
overlay.write_text(r'''import mapboxgl from "mapbox-gl";
import { getActiveMapboxMap, getTrackedMapboxMaps, registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";

export type NativeMapToolsPoint = { lat: number; lng: number; label?: string };

type Channel = "origin" | "route" | "zones" | "density" | "planner";

const IDS = {
  origin: { source: "map-tools-native-origin", point: "map-tools-native-origin" },
  route: { source: "map-tools-native-route", line: "map-tools-native-route-line", point: "map-tools-native-route-end" },
  zones: { source: "map-tools-native-zones", fill: "map-tools-native-zones-fill", line: "map-tools-native-zones-line" },
  density: { source: "map-tools-native-density", heatmap: "map-tools-native-density-heatmap" },
  planner: { source: "map-tools-native-planner", line: "map-tools-native-planner-line", point: "map-tools-native-planner-points", label: "map-tools-native-planner-labels" },
} as const;

const empty = (): GeoJSON.FeatureCollection => ({ type: "FeatureCollection", features: [] });
const collections: Record<Channel, GeoJSON.FeatureCollection> = {
  origin: empty(),
  route: empty(),
  zones: empty(),
  density: empty(),
  planner: empty(),
};

function validPoint(point: NativeMapToolsPoint | null | undefined): point is NativeMapToolsPoint {
  return Boolean(point)
    && Number.isFinite(point!.lat)
    && Number.isFinite(point!.lng)
    && point!.lat >= -90 && point!.lat <= 90
    && point!.lng >= -180 && point!.lng <= 180;
}

function sourceData(map: mapboxgl.Map, sourceId: string, collection: GeoJSON.FeatureCollection): void {
  const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
  if (source) source.setData(collection);
  else map.addSource(sourceId, { type: "geojson", data: collection, generateId: true });
}

function ensureLayers(map: mapboxgl.Map): void {
  if (!map.getStyle()) return;
  sourceData(map, IDS.origin.source, collections.origin);
  sourceData(map, IDS.route.source, collections.route);
  sourceData(map, IDS.zones.source, collections.zones);
  sourceData(map, IDS.density.source, collections.density);
  sourceData(map, IDS.planner.source, collections.planner);

  if (!map.getLayer(IDS.zones.fill)) {
    map.addLayer({
      id: IDS.zones.fill,
      type: "fill",
      source: IDS.zones.source,
      paint: {
        "fill-color": ["coalesce", ["get", "color"], "#14b8a6"],
        "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.10],
      },
    });
  }
  if (!map.getLayer(IDS.zones.line)) {
    map.addLayer({
      id: IDS.zones.line,
      type: "line",
      source: IDS.zones.source,
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#0f766e"],
        "line-width": 1.4,
        "line-opacity": 0.5,
      },
    });
  }
  if (!map.getLayer(IDS.density.heatmap)) {
    map.addLayer({
      id: IDS.density.heatmap,
      type: "heatmap",
      source: IDS.density.source,
      maxzoom: 16,
      paint: {
        "heatmap-weight": 1,
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 1, 0.45, 8, 0.8, 14, 1.1],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 1, 10, 7, 22, 13, 42, 16, 56],
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.10, 8, 0.20, 14, 0.15, 16, 0],
        "heatmap-color": [
          "interpolate", ["linear"], ["heatmap-density"],
          0, "rgba(14,165,233,0)",
          0.25, "rgba(14,165,233,0.12)",
          0.55, "rgba(14,165,233,0.26)",
          0.8, "rgba(34,211,238,0.38)",
          1, "rgba(103,232,249,0.52)",
        ],
      },
    });
  }
  if (!map.getLayer(IDS.route.line)) {
    map.addLayer({
      id: IDS.route.line,
      type: "line",
      source: IDS.route.source,
      filter: ["==", ["get", "role"], "route"],
      paint: { "line-color": "#2563eb", "line-width": 5, "line-opacity": 0.9 },
    });
  }
  if (!map.getLayer(IDS.planner.line)) {
    map.addLayer({
      id: IDS.planner.line,
      type: "line",
      source: IDS.planner.source,
      filter: ["==", ["get", "role"], "route"],
      paint: { "line-color": "#2563eb", "line-width": 6, "line-opacity": 0.92 },
    });
  }
  if (!map.getLayer(IDS.origin.point)) {
    map.addLayer({
      id: IDS.origin.point,
      type: "circle",
      source: IDS.origin.source,
      paint: {
        "circle-radius": 8,
        "circle-color": "#22d3ee",
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff",
        "circle-blur": 0.08,
      },
    });
  }
  if (!map.getLayer(IDS.route.point)) {
    map.addLayer({
      id: IDS.route.point,
      type: "circle",
      source: IDS.route.source,
      filter: ["==", ["get", "role"], "destination"],
      paint: {
        "circle-radius": 6,
        "circle-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#1e3a8a",
      },
    });
  }
  if (!map.getLayer(IDS.planner.point)) {
    map.addLayer({
      id: IDS.planner.point,
      type: "circle",
      source: IDS.planner.source,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-radius": 9,
        "circle-color": ["case", ["==", ["get", "kind"], "from"], "#16a34a", "#dc2626"],
        "circle-stroke-width": 2.5,
        "circle-stroke-color": "#ffffff",
      },
    });
  }
  if (!map.getLayer(IDS.planner.label)) {
    map.addLayer({
      id: IDS.planner.label,
      type: "symbol",
      source: IDS.planner.source,
      filter: ["==", ["geometry-type"], "Point"],
      layout: {
        "text-field": ["get", "markerLabel"],
        "text-size": 10,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: { "text-color": "#ffffff" },
    });
  }
}

function update(channel: Channel): void {
  for (const map of getTrackedMapboxMaps()) {
    if (!map.getStyle()) continue;
    try {
      ensureLayers(map);
      const sourceId = IDS[channel].source;
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined)?.setData(collections[channel]);
    } catch (error) {
      console.warn(`Map Tools native ${channel} update failed`, error);
    }
  }
}

function setCollection(channel: Channel, features: GeoJSON.Feature[]): void {
  collections[channel] = { type: "FeatureCollection", features };
  update(channel);
}

function pointFeature(point: NativeMapToolsPoint, properties: Record<string, unknown> = {}): GeoJSON.Feature<GeoJSON.Point> {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [point.lng, point.lat] },
    properties,
  };
}

function routeLine(coordinates: Array<[number, number]>): GeoJSON.Feature<GeoJSON.LineString> | null {
  const normalized = coordinates
    .map(([lat, lng]) => [Number(lng), Number(lat)] as [number, number])
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
  if (normalized.length < 2) return null;
  return { type: "Feature", geometry: { type: "LineString", coordinates: normalized }, properties: { role: "route" } };
}

export function setMapToolsOrigin(point: NativeMapToolsPoint | null): void {
  setCollection("origin", validPoint(point) ? [pointFeature(point, { label: point.label || "Selected origin" })] : []);
}

export function setMapToolsRoute(coordinates: Array<[number, number]>, destination?: NativeMapToolsPoint | null): void {
  const features: GeoJSON.Feature[] = [];
  const line = routeLine(coordinates);
  if (line) features.push(line);
  if (validPoint(destination)) features.push(pointFeature(destination, { role: "destination" }));
  setCollection("route", features);
}

export function clearMapToolsRoute(): void {
  setCollection("route", []);
}

export function setMapToolsZones(data: GeoJSON.FeatureCollection | null): void {
  if (!data || !Array.isArray(data.features)) return setCollection("zones", []);
  const contours = [15, 30, 45, 60];
  const features = data.features.map((feature) => {
    const contour = Number((feature.properties as any)?.contour || 15);
    const rank = Math.max(0, contours.indexOf(contour));
    return {
      ...feature,
      properties: {
        ...(feature.properties || {}),
        color: "#14b8a6",
        fillOpacity: Math.max(0.05, 0.19 - rank * 0.04),
      },
    } as GeoJSON.Feature;
  });
  setCollection("zones", features);
}

export function clearMapToolsZones(): void {
  setCollection("zones", []);
}

export function setMapToolsDensity(points: NativeMapToolsPoint[]): void {
  setCollection("density", points.filter(validPoint).slice(0, 1000).map((point) => pointFeature(point)));
}

export function clearMapToolsDensity(): void {
  setCollection("density", []);
}

export function setRoutePlannerOverlay(
  from: NativeMapToolsPoint | null,
  to: NativeMapToolsPoint | null,
  coordinates: Array<[number, number]> = [],
): void {
  const features: GeoJSON.Feature[] = [];
  const line = routeLine(coordinates);
  if (line) features.push(line);
  if (validPoint(from)) features.push(pointFeature(from, { role: "endpoint", kind: "from", markerLabel: "A" }));
  if (validPoint(to)) features.push(pointFeature(to, { role: "endpoint", kind: "to", markerLabel: "B" }));
  setCollection("planner", features);
}

export function clearRoutePlannerOverlay(): void {
  setCollection("planner", []);
}

export function fitActiveMapToRoute(coordinates: Array<[number, number]>, padding = 38): void {
  const map = getActiveMapboxMap();
  if (!map) return;
  const bounds = new mapboxgl.LngLatBounds();
  coordinates.forEach(([lat, lng]) => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) bounds.extend([lng, lat]);
  });
  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding, duration: 700 });
}

function visitCoordinates(value: unknown, bounds: mapboxgl.LngLatBounds): void {
  if (!Array.isArray(value)) return;
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
    const lng = Number(value[0]);
    const lat = Number(value[1]);
    if (Number.isFinite(lng) && Number.isFinite(lat)) bounds.extend([lng, lat]);
    return;
  }
  value.forEach((child) => visitCoordinates(child, bounds));
}

export function fitActiveMapToGeoJSON(data: GeoJSON.FeatureCollection | null, padding = 30): void {
  const map = getActiveMapboxMap();
  if (!map || !data) return;
  const bounds = new mapboxgl.LngLatBounds();
  data.features.forEach((feature) => visitCoordinates((feature.geometry as any)?.coordinates, bounds));
  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding, duration: 700 });
}

registerMapboxMapInitializer({
  id: "map-tools-native-overlays",
  priority: 14,
  initialize: (map) => {
    const apply = () => ensureLayers(map);
    map.on("style.load", apply);
    if (map.isStyleLoaded()) queueMicrotask(apply);
    return () => map.off("style.load", apply);
  },
});
''')

# 3) Registry is neutral DOM composition with a native Mapbox map context.
registry = root / "src/mapToolsPanelRegistry.ts"
registry.write_text(r'''import type mapboxgl from "mapbox-gl";
import { registerRuntimeOwner } from "./runtimeControllerRegistry";

export type MapToolsPanelSection = {
  id: string;
  priority?: number;
  mount: (panel: HTMLElement, map: mapboxgl.Map) => void | (() => void);
};

type RegisteredSection = {
  id: string;
  priority: number;
  sequence: number;
  mount: MapToolsPanelSection["mount"];
};

type PanelRecord = {
  panel: HTMLElement;
  map: mapboxgl.Map;
  mounted: Map<string, (() => void) | null>;
};

const sections = new Map<string, RegisteredSection>();
const panels = new Set<PanelRecord>();
let sequence = 0;

function orderedSections(): RegisteredSection[] {
  return [...sections.values()].sort((left, right) =>
    left.priority - right.priority || left.sequence - right.sequence || left.id.localeCompare(right.id),
  );
}

function mountSection(record: PanelRecord, section: RegisteredSection): void {
  if (record.mounted.has(section.id)) return;
  record.mounted.set(section.id, null);
  try {
    const cleanup = section.mount(record.panel, record.map);
    record.mounted.set(section.id, typeof cleanup === "function" ? cleanup : null);
    record.panel.dispatchEvent(new CustomEvent("network-map:map-tools-section-mounted", {
      bubbles: true,
      detail: { id: section.id },
    }));
  } catch (error) {
    record.mounted.delete(section.id);
    console.error(`Map Tools section failed to mount: ${section.id}`, error);
  }
}

function cleanupSection(record: PanelRecord, id: string): void {
  const cleanup = record.mounted.get(id);
  if (cleanup) {
    try { cleanup(); } catch (error) { console.warn(`Map Tools section cleanup failed: ${id}`, error); }
  }
  record.mounted.delete(id);
}

export function registerMapToolsSection(section: MapToolsPanelSection): () => void {
  const id = section.id.trim();
  if (!id) throw new Error("Map Tools section requires a stable id");
  if (sections.has(id)) throw new Error(`Map Tools section is already registered: ${id}`);

  const registered: RegisteredSection = {
    id,
    priority: Number.isFinite(section.priority) ? Number(section.priority) : 100,
    sequence: sequence += 1,
    mount: section.mount,
  };
  sections.set(id, registered);
  for (const panel of panels) mountSection(panel, registered);

  return () => {
    if (sections.get(id) !== registered) return;
    sections.delete(id);
    for (const panel of panels) cleanupSection(panel, id);
  };
}

export function registerMapToolsPanel(panel: HTMLElement, map: mapboxgl.Map): () => void {
  const existing = [...panels].find((record) => record.panel === panel);
  if (existing) return () => undefined;

  const record: PanelRecord = { panel, map, mounted: new Map() };
  panels.add(record);
  panel.dataset.mapToolsRegistryOwned = "true";
  for (const section of orderedSections()) mountSection(record, section);
  window.dispatchEvent(new CustomEvent("network-map:map-tools-panel-mounted", { detail: { panel } }));

  return () => {
    for (const id of [...record.mounted.keys()].reverse()) cleanupSection(record, id);
    panels.delete(record);
  };
}

export function getMapToolsPanelCount(): number {
  return panels.size;
}

registerRuntimeOwner("map-tools-section-registry", "Authoritative Map Tools section registry");
''')

# 4) Command panel: one sidebar panel, active native engine at action time.
command = root / "src/mapToolsCommandPanel.ts"
command.write_text(r'''import mapboxgl from "mapbox-gl";
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
''')

# 5) From/To planner keeps its sidebar UI but renders points/route with native Mapbox.
planner = root / "src/routePlannerControlsRuntime.ts"
planner.write_text(r'''import type mapboxgl from "mapbox-gl";
import { getActiveMapboxMap } from "./mapboxMapLifecycleRuntime";
import { mapboxDirections, mapboxGeocode } from "./mapboxServices";
import { registerMapToolsSection } from "./mapToolsPanelRegistry";
import { clearRoutePlannerOverlay, fitActiveMapToRoute, setRoutePlannerOverlay, type NativeMapToolsPoint } from "./mapToolsNativeMapRuntime";
import { registerRuntimeOwner } from "./runtimeControllerRegistry";

type Point = NativeMapToolsPoint;

let activePanel: HTMLElement | null = null;
let fallbackMap: mapboxgl.Map | null = null;
let fromPoint: Point | null = null;
let toPoint: Point | null = null;
let routeCoordinates: Array<[number, number]> = [];

function currentMap(): mapboxgl.Map | null {
  return getActiveMapboxMap() || fallbackMap;
}

function status(text: string): void {
  const scope = activePanel || document;
  scope.querySelectorAll<HTMLElement>(".occumed-mapbox-status").forEach((node) => { node.textContent = text; });
}

function inputFor(target: "from" | "to"): HTMLInputElement | null {
  return (activePanel || document).querySelector<HTMLInputElement>(`.occumed-route-${target}`);
}

function refreshOverlay(): void {
  setRoutePlannerOverlay(fromPoint, toPoint, routeCoordinates);
}

function setPoint(target: "from" | "to", point: Point): void {
  const input = inputFor(target);
  if (input) input.value = point.label || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
  if (target === "from") {
    fromPoint = point;
    window.dispatchEvent(new CustomEvent("occumed:map-origin-changed", { detail: point }));
  } else {
    toPoint = point;
  }
  routeCoordinates = [];
  refreshOverlay();
}

async function geocodeInput(target: "from" | "to"): Promise<Point | null> {
  const input = inputFor(target);
  const query = input?.value.trim() || "";
  if (!query) {
    status(`Enter a ${target === "from" ? "starting location" : "destination"}.`);
    return null;
  }
  const map = currentMap();
  if (!map) { status("Map is not ready."); return null; }
  status(`Finding ${target === "from" ? "starting location" : "destination"}…`);
  const center = map.getCenter();
  const results = await mapboxGeocode(query, { lat: center.lat, lng: center.lng });
  const best = results[0];
  if (!best) { status(`No result found for ${query}.`); return null; }
  const point = { lat: best.lat, lng: best.lng, label: best.placeName };
  setPoint(target, point);
  return point;
}

function clearRouteOnly(): void {
  routeCoordinates = [];
  refreshOverlay();
}

async function drawRoute(start: Point, end: Point): Promise<void> {
  status("Loading route…");
  const route = await mapboxDirections(start, end, "driving-traffic");
  routeCoordinates = route.coordinates;
  refreshOverlay();
  fitActiveMapToRoute(route.coordinates, 44);
  status(`${route.distanceMiles.toFixed(1)} mi · ${Math.round(route.durationMinutes)} min with traffic`);
}

async function routeFromInputs(): Promise<void> {
  try {
    const start = fromPoint || await geocodeInput("from");
    if (!start) return;
    const end = toPoint || await geocodeInput("to");
    if (!end) return;
    await drawRoute(start, end);
  } catch (error) {
    status(error instanceof Error ? error.message : "Route failed.");
  }
}

function clearPlanner(): void {
  fromPoint = null;
  toPoint = null;
  routeCoordinates = [];
  clearRoutePlannerOverlay();
  const fromInput = inputFor("from");
  const toInput = inputFor("to");
  if (fromInput) fromInput.value = "";
  if (toInput) toInput.value = "";
  status("Enter a starting location and destination.");
}

function swapPlanner(): void {
  const previousFrom = fromPoint;
  const previousTo = toPoint;
  const fromText = inputFor("from")?.value || "";
  const toText = inputFor("to")?.value || "";
  fromPoint = previousTo;
  toPoint = previousFrom;
  routeCoordinates = [];
  const fromInput = inputFor("from");
  const toInput = inputFor("to");
  if (fromInput) fromInput.value = fromPoint?.label || (fromPoint ? `${fromPoint.lat.toFixed(5)}, ${fromPoint.lng.toFixed(5)}` : toText);
  if (toInput) toInput.value = toPoint?.label || (toPoint ? `${toPoint.lat.toFixed(5)}, ${toPoint.lng.toFixed(5)}` : fromText);
  refreshOverlay();
  if (fromPoint && toPoint) void drawRoute(fromPoint, toPoint);
  else status("From and To swapped.");
}

function createInput(className: string, placeholder: string, ariaLabel: string): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "text";
  input.className = `occumed-mapbox-search ${className}`;
  input.placeholder = placeholder;
  input.setAttribute("aria-label", ariaLabel);
  return input;
}

function actionButton(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function mountRoutePlanner(panel: HTMLElement, map: mapboxgl.Map): () => void {
  fallbackMap = map;
  activePanel = panel;
  const planner = document.createElement("div");
  planner.className = "occumed-map-tools-section occumed-route-planner";
  planner.dataset.mapToolsSection = "route-planner-controls";
  const title = document.createElement("div");
  title.className = "occumed-map-tools-section-title";
  title.textContent = "From / To Route";
  planner.appendChild(title);

  const fromInput = createInput("occumed-route-from", "From address or place", "Route starting location");
  const toInput = createInput("occumed-route-to", "To address, place, or provider", "Route destination");
  const actions = document.createElement("div");
  actions.className = "occumed-mapbox-actions occumed-route-actions";
  actions.append(
    actionButton("Route", "occumed-route-go", () => { void routeFromInputs(); }),
    actionButton("Swap", "occumed-route-swap", swapPlanner),
    actionButton("Clear", "occumed-route-clear", clearPlanner),
  );

  fromInput.addEventListener("input", () => { fromPoint = null; clearRouteOnly(); });
  toInput.addEventListener("input", () => { toPoint = null; clearRouteOnly(); });
  fromInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void geocodeInput("from");
  });
  toInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void routeFromInputs();
  });

  planner.append(fromInput, toInput, actions);
  const firstCoreSection = panel.querySelector<HTMLElement>(".occumed-map-tools-section");
  if (firstCoreSection) panel.insertBefore(planner, firstCoreSection);
  else panel.appendChild(planner);
  status("Enter a starting location and destination.");

  return () => {
    clearPlanner();
    planner.remove();
    if (activePanel === panel) activePanel = null;
    if (fallbackMap === map) fallbackMap = null;
  };
}

function installRoutePlannerControls(): void {
  if (!registerRuntimeOwner("route-planner-controls", "Map Tools native From/To route planner")) return;
  registerMapToolsSection({ id: "route-planner-controls", priority: 10, mount: mountRoutePlanner });
  window.addEventListener("occumed:route-to-point", ((event: Event) => {
    const detail = (event as CustomEvent<Point>).detail;
    if (!detail || !Number.isFinite(detail.lat) || !Number.isFinite(detail.lng)) return;
    const point = { lat: detail.lat, lng: detail.lng, label: detail.label || "Selected provider" };
    setPoint("to", point);
    if (fromPoint) void drawRoute(fromPoint, point);
    else status("Destination selected. Enter the starting location, then press Route.");
  }) as EventListener);
}

installRoutePlannerControls();
export {};
''')

for relative in [
    "src/mapToolsCommandPanel.ts",
    "src/mapToolsPanelRegistry.ts",
    "src/routePlannerControlsRuntime.ts",
    "src/mapToolsNativeMapRuntime.ts",
]:
    content = (root / relative).read_text()
    if "mapSceneRuntime" in content or "MapScene" in content or "subscribeSceneRoots" in content:
        raise SystemExit(f"scene dependency remains in {relative}")

print("Migrated Map Tools panel, routing, zones, density, and From/To planner to native Mapbox ownership.")

import L from "leaflet";
import { registerLeafletMapInitializer } from "./leafletMapLifecycleRuntime";
import { mapboxDirections, mapboxGeocode } from "./mapboxServices";

type Point = { lat: number; lng: number; label?: string };

const ROUTE_PANEL_FLAG = "routePlannerReady";
let canonicalMap: L.Map | null = null;
let fromPoint: Point | null = null;
let toPoint: Point | null = null;
let fromMarker: L.Marker | null = null;
let toMarker: L.Marker | null = null;
let routeLayer: L.LayerGroup | null = null;
let observer: MutationObserver | null = null;
let scanTimer: number | null = null;

function status(text: string): void {
  document.querySelectorAll<HTMLElement>(".occumed-map-tools-panel .occumed-mapbox-status").forEach((node) => {
    node.textContent = text;
  });
}

function inputFor(target: "from" | "to"): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>(`.occumed-route-${target}`);
}

function markerIcon(kind: "from" | "to"): L.DivIcon {
  const label = kind === "from" ? "A" : "B";
  return L.divIcon({
    className: "",
    html: `<div class="occumed-route-marker ${kind}" aria-hidden="true">${label}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function setPoint(map: L.Map, target: "from" | "to", point: Point): void {
  const input = inputFor(target);
  if (input) input.value = point.label || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;

  if (target === "from") {
    fromPoint = point;
    if (fromMarker) map.removeLayer(fromMarker);
    fromMarker = L.marker([point.lat, point.lng], { icon: markerIcon("from"), zIndexOffset: 7200 }).addTo(map);
    window.dispatchEvent(new CustomEvent("occumed:map-origin-changed", { detail: point }));
  } else {
    toPoint = point;
    if (toMarker) map.removeLayer(toMarker);
    toMarker = L.marker([point.lat, point.lng], { icon: markerIcon("to"), zIndexOffset: 7100 }).addTo(map);
  }
}

async function geocodeInput(map: L.Map, target: "from" | "to"): Promise<Point | null> {
  const input = inputFor(target);
  const query = input?.value.trim() || "";
  if (!query) {
    status(`Enter a ${target === "from" ? "starting location" : "destination"}.`);
    return null;
  }

  status(`Finding ${target === "from" ? "starting location" : "destination"}…`);
  const center = map.getCenter();
  const results = await mapboxGeocode(query, { lat: center.lat, lng: center.lng });
  const best = results[0];
  if (!best) {
    status(`No result found for ${query}.`);
    return null;
  }

  const point = { lat: best.lat, lng: best.lng, label: best.placeName };
  setPoint(map, target, point);
  return point;
}

function clearRouteOnly(map: L.Map): void {
  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }
}

async function drawRoute(map: L.Map, start: Point, end: Point): Promise<void> {
  status("Loading route…");
  clearRouteOnly(map);
  const route = await mapboxDirections(start, end, "driving-traffic");
  const line = L.polyline(route.coordinates, {
    color: "#2563eb",
    weight: 6,
    opacity: 0.92,
    className: "occumed-from-to-route",
  });
  routeLayer = L.layerGroup([line]).addTo(map);
  map.fitBounds(line.getBounds(), { padding: [44, 44] });
  status(`${route.distanceMiles.toFixed(1)} mi · ${Math.round(route.durationMinutes)} min with traffic`);
}

async function routeFromInputs(map: L.Map): Promise<void> {
  try {
    const start = fromPoint || await geocodeInput(map, "from");
    if (!start) return;
    const end = toPoint || await geocodeInput(map, "to");
    if (!end) return;
    await drawRoute(map, start, end);
  } catch (error) {
    status(error instanceof Error ? error.message : "Route failed.");
  }
}

function clearPlanner(map: L.Map): void {
  clearRouteOnly(map);
  if (fromMarker) map.removeLayer(fromMarker);
  if (toMarker) map.removeLayer(toMarker);
  fromMarker = null;
  toMarker = null;
  fromPoint = null;
  toPoint = null;
  const fromInput = inputFor("from");
  const toInput = inputFor("to");
  if (fromInput) fromInput.value = "";
  if (toInput) toInput.value = "";
  status("Enter a starting location and destination.");
}

function swapPlanner(map: L.Map): void {
  const previousFrom = fromPoint;
  const previousTo = toPoint;
  const fromText = inputFor("from")?.value || "";
  const toText = inputFor("to")?.value || "";

  if (fromMarker) map.removeLayer(fromMarker);
  if (toMarker) map.removeLayer(toMarker);
  fromMarker = null;
  toMarker = null;
  fromPoint = null;
  toPoint = null;

  if (previousTo) setPoint(map, "from", previousTo);
  else {
    const input = inputFor("from");
    if (input) input.value = toText;
  }
  if (previousFrom) setPoint(map, "to", previousFrom);
  else {
    const input = inputFor("to");
    if (input) input.value = fromText;
  }

  clearRouteOnly(map);
  if (fromPoint && toPoint) void drawRoute(map, fromPoint, toPoint);
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

function installPanel(panel: HTMLElement): void {
  if (panel.dataset[ROUTE_PANEL_FLAG] === "true") return;
  const map = canonicalMap;
  if (!map) return;

  const firstSection = panel.querySelector<HTMLElement>(".occumed-map-tools-section");
  const planner = document.createElement("div");
  planner.className = "occumed-map-tools-section occumed-route-planner";

  const title = document.createElement("div");
  title.className = "occumed-map-tools-section-title";
  title.textContent = "From / To Route";
  planner.appendChild(title);

  const fromInput = createInput("occumed-route-from", "From address or place", "Route starting location");
  const toInput = createInput("occumed-route-to", "To address, place, or provider", "Route destination");

  const actions = document.createElement("div");
  actions.className = "occumed-mapbox-actions occumed-route-actions";
  actions.append(
    actionButton("Route", "occumed-route-go", () => { void routeFromInputs(map); }),
    actionButton("Swap", "occumed-route-swap", () => swapPlanner(map)),
    actionButton("Clear", "occumed-route-clear", () => clearPlanner(map)),
  );

  fromInput.addEventListener("input", () => { fromPoint = null; });
  toInput.addEventListener("input", () => { toPoint = null; });
  fromInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void geocodeInput(map, "from");
  });
  toInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void routeFromInputs(map);
  });

  planner.append(fromInput, toInput, actions);
  if (firstSection) panel.insertBefore(planner, firstSection);
  else panel.appendChild(planner);
  panel.dataset[ROUTE_PANEL_FLAG] = "true";
  status("Enter a starting location and destination.");
}

function scanForPanel(): void {
  document.querySelectorAll<HTMLElement>(".occumed-map-tools-panel").forEach(installPanel);
}

function scheduleScan(delay = 0): void {
  if (scanTimer !== null) window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(() => {
    scanTimer = null;
    scanForPanel();
  }, delay);
}

function bindMap(map: L.Map): void {
  canonicalMap = map;
  map.once("unload", () => {
    if (canonicalMap === map) canonicalMap = null;
  });
  scheduleScan(0);
}

function startObserver(): void {
  if (observer || !document.body) return;
  observer = new MutationObserver(() => scheduleScan(30));
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleScan();
}

window.addEventListener("occumed:route-to-point", ((event: Event) => {
  const detail = (event as CustomEvent<Point>).detail;
  if (!canonicalMap || !detail || !Number.isFinite(detail.lat) || !Number.isFinite(detail.lng)) return;
  const point = { lat: detail.lat, lng: detail.lng, label: detail.label || "Selected provider" };
  setPoint(canonicalMap, "to", point);
  if (fromPoint) void drawRoute(canonicalMap, fromPoint, point);
  else status("Destination selected. Enter the starting location, then press Route.");
}) as EventListener);

registerLeafletMapInitializer({
  id: "route-planner-controls",
  priority: 50,
  initialize: bindMap,
});
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startObserver, { once: true });
else startObserver();

export {};

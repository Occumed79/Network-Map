import type mapboxgl from "mapbox-gl";
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

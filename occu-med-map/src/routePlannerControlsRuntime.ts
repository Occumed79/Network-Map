import MapScene from "./mapSceneRuntime";
import { mapboxDirections, mapboxGeocode } from "./mapboxServices";
import { registerMapToolsSection } from "./mapToolsPanelRegistry";
import { registerRuntimeOwner } from "./runtimeControllerRegistry";

type Point = { lat: number; lng: number; label?: string };

let activeMap: MapScene.Map | null = null;
let activePanel: HTMLElement | null = null;
let fromPoint: Point | null = null;
let toPoint: Point | null = null;
let fromMarker: MapScene.Marker | null = null;
let toMarker: MapScene.Marker | null = null;
let routeLayer: MapScene.LayerGroup | null = null;

function status(text: string): void {
  const scope = activePanel || document;
  scope.querySelectorAll<HTMLElement>(".occumed-mapbox-status").forEach((node) => {
    node.textContent = text;
  });
}

function inputFor(target: "from" | "to"): HTMLInputElement | null {
  return (activePanel || document).querySelector<HTMLInputElement>(`.occumed-route-${target}`);
}

function markerIcon(kind: "from" | "to"): MapScene.DivIcon {
  const label = kind === "from" ? "A" : "B";
  return MapScene.divIcon({
    className: "",
    html: `<div class="occumed-route-marker ${kind}" aria-hidden="true">${label}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function removeLayerIfPresent(map: MapScene.Map, layer: MapScene.Layer | null): void {
  if (layer && map.hasLayer(layer)) map.removeLayer(layer);
}

function setPoint(map: MapScene.Map, target: "from" | "to", point: Point): void {
  const input = inputFor(target);
  if (input) input.value = point.label || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;

  if (target === "from") {
    fromPoint = point;
    removeLayerIfPresent(map, fromMarker);
    fromMarker = MapScene.marker([point.lat, point.lng], { icon: markerIcon("from"), zIndexOffset: 7200 }).addTo(map);
    window.dispatchEvent(new CustomEvent("occumed:map-origin-changed", { detail: point }));
  } else {
    toPoint = point;
    removeLayerIfPresent(map, toMarker);
    toMarker = MapScene.marker([point.lat, point.lng], { icon: markerIcon("to"), zIndexOffset: 7100 }).addTo(map);
  }
}

async function geocodeInput(map: MapScene.Map, target: "from" | "to"): Promise<Point | null> {
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

function clearRouteOnly(map: MapScene.Map): void {
  removeLayerIfPresent(map, routeLayer);
  routeLayer = null;
}

async function drawRoute(map: MapScene.Map, start: Point, end: Point): Promise<void> {
  status("Loading route…");
  clearRouteOnly(map);
  const route = await mapboxDirections(start, end, "driving-traffic");
  const line = MapScene.polyline(route.coordinates, {
    color: "#2563eb",
    weight: 6,
    opacity: 0.92,
    className: "occumed-from-to-route",
  });
  routeLayer = MapScene.layerGroup([line]).addTo(map);
  map.fitBounds(line.getBounds(), { padding: [44, 44] });
  status(`${route.distanceMiles.toFixed(1)} mi · ${Math.round(route.durationMinutes)} min with traffic`);
}

async function routeFromInputs(map: MapScene.Map): Promise<void> {
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

function clearPlanner(map: MapScene.Map): void {
  clearRouteOnly(map);
  removeLayerIfPresent(map, fromMarker);
  removeLayerIfPresent(map, toMarker);
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

function swapPlanner(map: MapScene.Map): void {
  const previousFrom = fromPoint;
  const previousTo = toPoint;
  const fromText = inputFor("from")?.value || "";
  const toText = inputFor("to")?.value || "";

  removeLayerIfPresent(map, fromMarker);
  removeLayerIfPresent(map, toMarker);
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

function mountRoutePlanner(panel: HTMLElement, map: MapScene.Map): () => void {
  activeMap = map;
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
  const firstCoreSection = panel.querySelector<HTMLElement>(".occumed-map-tools-section");
  if (firstCoreSection) panel.insertBefore(planner, firstCoreSection);
  else panel.appendChild(planner);
  status("Enter a starting location and destination.");

  return () => {
    if (activeMap === map) clearPlanner(map);
    planner.remove();
    if (activePanel === panel) activePanel = null;
    if (activeMap === map) activeMap = null;
  };
}

function installRoutePlannerControls(): void {
  if (!registerRuntimeOwner("route-planner-controls", "Map Tools From/To route planner")) return;

  registerMapToolsSection({
    id: "route-planner-controls",
    priority: 10,
    mount: mountRoutePlanner,
  });

  window.addEventListener("occumed:route-to-point", ((event: Event) => {
    const detail = (event as CustomEvent<Point>).detail;
    const map = activeMap;
    if (!map || !detail || !Number.isFinite(detail.lat) || !Number.isFinite(detail.lng)) return;
    const point = { lat: detail.lat, lng: detail.lng, label: detail.label || "Selected provider" };
    setPoint(map, "to", point);
    if (fromPoint) void drawRoute(map, fromPoint, point);
    else status("Destination selected. Enter the starting location, then press Route.");
  }) as EventListener);
}

installRoutePlannerControls();

export {};

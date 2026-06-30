import L from "leaflet";

const originalMap = L.map.bind(L);
let installed = false;
let densityLayer: L.LayerGroup | null = null;
let statusNode: HTMLDivElement | null = null;
let densityEnabled = false;

function setStatus(text: string): void {
  if (statusNode) statusNode.textContent = text;
}

function visibleMarkerPoints(map: L.Map): L.LatLng[] {
  const bounds = map.getBounds().pad(0.15);
  const rows: L.LatLng[] = [];
  map.eachLayer((layer: L.Layer) => {
    const marker = layer as L.Marker & { getLatLng?: () => L.LatLng };
    if (typeof marker.getLatLng !== "function") return;
    const point = marker.getLatLng();
    if (!bounds.contains(point)) return;
    rows.push(point);
  });
  return rows;
}

function drawDensity(map: L.Map): void {
  if (densityLayer) {
    map.removeLayer(densityLayer);
    densityLayer = null;
  }
  if (!densityEnabled) return;
  const points = visibleMarkerPoints(map);
  const zoom = map.getZoom();
  const radius = Math.max(1200, Math.min(18000, 52000 / Math.max(1, zoom)));
  const layers = points.slice(0, 250).map((point) => L.circle(point, {
    radius,
    color: "#0ea5e9",
    weight: 0,
    fillColor: "#0ea5e9",
    fillOpacity: 0.055,
    interactive: false,
  }));
  densityLayer = L.layerGroup(layers).addTo(map);
  setStatus(`Density field: ${points.length} visible pins sampled.`);
}

function addControl(map: L.Map): void {
  const control = new L.Control({ position: "bottomleft" });
  control.onAdd = () => {
    const box = L.DomUtil.create("div", "occumed-density-control");
    L.DomEvent.disableClickPropagation(box);
    L.DomEvent.disableScrollPropagation(box);

    const title = document.createElement("div");
    title.className = "occumed-basemap-title";
    title.textContent = "Provider Density Field";
    box.appendChild(title);

    const actions = document.createElement("div");
    actions.className = "occumed-mapbox-actions";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.textContent = "Toggle Density";
    toggle.addEventListener("click", () => {
      densityEnabled = !densityEnabled;
      toggle.classList.toggle("active", densityEnabled);
      drawDensity(map);
      if (!densityEnabled) setStatus("Density field off.");
    });
    const refresh = document.createElement("button");
    refresh.type = "button";
    refresh.textContent = "Refresh";
    refresh.addEventListener("click", () => drawDensity(map));
    actions.appendChild(toggle);
    actions.appendChild(refresh);
    box.appendChild(actions);

    statusNode = document.createElement("div");
    statusNode.className = "occumed-mapbox-status";
    statusNode.textContent = "Visualizes visible provider concentration.";
    box.appendChild(statusNode);
    return box;
  };
  control.addTo(map);
}

function installOnMap(map: L.Map): void {
  addControl(map);
  map.on("moveend zoomend", () => {
    if (densityEnabled) drawDensity(map);
  });
}

export function installProviderDensityField(): void {
  if (installed) return;
  installed = true;
  (L as any).map = (...args: Parameters<typeof L.map>) => {
    const map = originalMap(...args);
    window.setTimeout(() => installOnMap(map), 0);
    return map;
  };
}

installProviderDensityField();

import L from "leaflet";
import { hasMapboxToken, mapboxDirections, mapboxGeocode, mapboxIsochrone, mapboxReverseGeocode } from "./mapboxServices";

type Point = { lat: number; lng: number; label?: string };
type RankedPin = Point & { name: string; driveMiles: number; driveMinutes: number; coordinates: Array<[number, number]> };

const originalMap = L.map.bind(L);
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || "";
let installed = false;
let origin: Point | null = null;
let searchMarker: L.Marker | null = null;
let routeLayer: L.LayerGroup | null = null;
let zoneLayer: L.GeoJSON | null = null;
let densityLayer: L.LayerGroup | null = null;
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

function mapboxTileUrl(style: string): string {
  const url = new URL(`https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/256/{z}/{x}/{y}@2x`);
  url.searchParams.set(["access", "token"].join("_"), mapboxToken);
  return url.toString().replaceAll("%7B", "{").replaceAll("%7D", "}");
}

function updateBasemap(map: L.Map, style: string): void {
  map.eachLayer((layer) => {
    const tile = layer as L.TileLayer & { setUrl?: (url: string) => void };
    if (typeof tile.setUrl === "function") tile.setUrl(mapboxTileUrl(style));
  });
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

function markerLabel(layer: L.Layer, fallback: string): string {
  const marker = layer as L.Marker;
  const tooltip = marker.getTooltip?.();
  const popup = marker.getPopup?.();
  const tooltipContent = tooltip?.getContent?.();
  const popupContent = popup?.getContent?.();
  const raw = typeof tooltipContent === "string" ? tooltipContent : typeof popupContent === "string" ? popupContent : fallback;
  return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 72) || fallback;
}

function setOrigin(map: L.Map, point: Point): void {
  origin = point;
  if (searchMarker) map.removeLayer(searchMarker);
  searchMarker = L.marker([point.lat, point.lng], {
    icon: L.divIcon({
      className: "",
      html: '<div class="occumed-mapbox-origin-dot"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    }),
    zIndexOffset: 6000,
  }).addTo(map);
  setStatus(`Origin set: ${point.label || point.lat.toFixed(4) + ", " + point.lng.toFixed(4)}`);
}

async function searchPlace(map: L.Map, input: HTMLInputElement): Promise<void> {
  const query = input.value.trim();
  if (!query) return;
  setStatus("Searching Mapbox...");
  try {
    const center = map.getCenter();
    const results = await mapboxGeocode(query, { lat: center.lat, lng: center.lng });
    const best = results[0];
    if (!best) { setStatus("No Mapbox result found."); return; }
    setOrigin(map, { lat: best.lat, lng: best.lng, label: best.placeName });
    map.flyTo([best.lat, best.lng], 13, { duration: 1.1 });
  } catch (err: any) {
    setStatus(err?.message || "Search failed.");
  }
}

function clearRoutes(map: L.Map): void {
  if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
  if (zoneLayer) { map.removeLayer(zoneLayer); zoneLayer = null; }
  latestRankings = [];
  if (etaResultsNode) etaResultsNode.innerHTML = "";
  setStatus("Routes and zones cleared.");
}

async function drawRoute(map: L.Map, target: Point): Promise<void> {
  if (!origin) { setStatus("Set an origin first."); return; }
  setStatus("Loading Mapbox route...");
  try {
    if (routeLayer) map.removeLayer(routeLayer);
    const route = await mapboxDirections(origin, target, "driving-traffic");
    const line = L.polyline(route.coordinates, { color: "#2563eb", weight: 5, opacity: 0.88 });
    const end = L.circleMarker([target.lat, target.lng], { radius: 6, color: "#1e3a8a", fillColor: "#ffffff", fillOpacity: 1, weight: 2 });
    routeLayer = L.layerGroup([line, end]).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [38, 38] });
    setStatus(`Route: ${route.distanceMiles.toFixed(1)} mi / ${Math.round(route.durationMinutes)} min.`);
  } catch (err: any) {
    setStatus(err?.message || "Route failed.");
  }
}

async function drawZones(map: L.Map): Promise<void> {
  if (!origin) { setStatus("Set an origin first."); return; }
  setStatus("Loading 15/30/45/60 minute zones...");
  try {
    if (zoneLayer) map.removeLayer(zoneLayer);
    const data = await mapboxIsochrone(origin, [15, 30, 45, 60], "driving");
    zoneLayer = L.geoJSON(data, {
      style: (feature: any) => {
        const contour = Number(feature?.properties?.contour || 15);
        const rank = [15, 30, 45, 60].indexOf(contour);
        return { color: "#0f766e", weight: 1.4, opacity: 0.44, fillColor: "#14b8a6", fillOpacity: Math.max(0.05, 0.19 - rank * 0.04) };
      },
    }).addTo(map);
    map.fitBounds(zoneLayer.getBounds(), { padding: [30, 30] });
    setStatus("Service zones shown: 15 / 30 / 45 / 60 minutes.");
  } catch (err: any) {
    setStatus(err?.message || "Zones failed.");
  }
}

function visibleMarkerCandidates(map: L.Map, currentOrigin: Point) {
  const bounds = map.getBounds().pad(0.1);
  const rows: Array<Point & { name: string; straightMiles: number }> = [];
  map.eachLayer((layer: L.Layer) => {
    const marker = layer as L.Marker & { getLatLng?: () => L.LatLng };
    if (typeof marker.getLatLng !== "function") return;
    const latLng = marker.getLatLng();
    if (!bounds.contains(latLng)) return;
    const point = { lat: latLng.lat, lng: latLng.lng };
    const straightMiles = milesBetween(currentOrigin, point);
    if (straightMiles < 0.03 || straightMiles > 250) return;
    rows.push({ ...point, straightMiles, name: markerLabel(layer, `Pin ${rows.length + 1}`) });
  });
  return rows.sort((a, b) => a.straightMiles - b.straightMiles).slice(0, 8);
}

function renderRankings(map: L.Map, rows: RankedPin[]): void {
  if (!etaResultsNode) return;
  etaResultsNode.innerHTML = "";
  rows.forEach((row, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "occumed-eta-row";
    const name = document.createElement("span");
    name.textContent = `${index + 1}. ${row.name}`;
    const mins = document.createElement("strong");
    mins.textContent = `${Math.round(row.driveMinutes)} min`;
    const miles = document.createElement("em");
    miles.textContent = `${row.driveMiles.toFixed(1)} mi`;
    button.appendChild(name);
    button.appendChild(mins);
    button.appendChild(miles);
    button.addEventListener("click", () => drawRoute(map, row));
    etaResultsNode?.appendChild(button);
  });
}

async function rankVisiblePins(map: L.Map): Promise<void> {
  if (!origin) { setStatus("Set an origin first."); return; }
  const candidates = visibleMarkerCandidates(map, origin);
  if (candidates.length === 0) { setStatus("No visible provider pins found to rank."); return; }
  setStatus(`Ranking ${candidates.length} visible pins by drive time...`);
  const ranked: RankedPin[] = [];
  for (const candidate of candidates) {
    try {
      const route = await mapboxDirections(origin, candidate, "driving-traffic");
      ranked.push({ ...candidate, driveMiles: route.distanceMiles, driveMinutes: route.durationMinutes, coordinates: route.coordinates });
    } catch {
      // Keep ranking resilient when a single pin cannot route.
    }
  }
  ranked.sort((a, b) => a.driveMinutes - b.driveMinutes);
  latestRankings = ranked.slice(0, 6);
  renderRankings(map, latestRankings);
  setStatus(`Ranked ${latestRankings.length} provider pins.`);
}

async function copyEta(): Promise<void> {
  if (latestRankings.length === 0) { setStatus("No ETA ranking to copy yet."); return; }
  const originLabel = origin?.label || "selected origin";
  const lines = [`Provider ETA ranking from ${originLabel}`];
  latestRankings.forEach((row, index) => lines.push(`${index + 1}. ${row.name} — ${Math.round(row.driveMinutes)} min / ${row.driveMiles.toFixed(1)} mi`));
  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    setStatus("ETA ranking copied.");
  } catch {
    setStatus(lines.join(" | "));
  }
}

function visibleMarkerPoints(map: L.Map): L.LatLng[] {
  const bounds = map.getBounds().pad(0.15);
  const rows: L.LatLng[] = [];
  map.eachLayer((layer: L.Layer) => {
    const marker = layer as L.Marker & { getLatLng?: () => L.LatLng };
    if (typeof marker.getLatLng !== "function") return;
    const point = marker.getLatLng();
    if (bounds.contains(point)) rows.push(point);
  });
  return rows;
}

function drawDensity(map: L.Map): void {
  if (densityLayer) { map.removeLayer(densityLayer); densityLayer = null; }
  if (!densityEnabled) return;
  const points = visibleMarkerPoints(map);
  const radius = Math.max(1200, Math.min(18000, 52000 / Math.max(1, map.getZoom())));
  densityLayer = L.layerGroup(points.slice(0, 250).map((point) => L.circle(point, {
    radius,
    color: "#0ea5e9",
    weight: 0,
    fillColor: "#0ea5e9",
    fillOpacity: 0.055,
    interactive: false,
  }))).addTo(map);
  setStatus(`Density field: ${points.length} visible pins sampled.`);
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

function addCommandPanel(map: L.Map): void {
  const control = new L.Control({ position: "bottomleft" });
  control.onAdd = () => {
    const box = L.DomUtil.create("div", "occumed-map-tools-panel");
    L.DomEvent.disableClickPropagation(box);
    L.DomEvent.disableScrollPropagation(box);

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
    searchActions.appendChild(button("Search", () => searchPlace(map, input)));
    input.addEventListener("keydown", (event) => { if (event.key === "Enter") searchPlace(map, input); });
    search.appendChild(input);
    search.appendChild(searchActions);
    box.appendChild(search);

    const route = section("Routes and Zones");
    const routeActions = document.createElement("div");
    routeActions.className = "occumed-mapbox-actions";
    routeActions.appendChild(button("Service Zones", () => drawZones(map)));
    routeActions.appendChild(button("Clear", () => clearRoutes(map)));
    route.appendChild(routeActions);
    box.appendChild(route);

    const eta = section("ETA Ranking");
    const etaActions = document.createElement("div");
    etaActions.className = "occumed-mapbox-actions";
    etaActions.appendChild(button("Rank Visible", () => rankVisiblePins(map)));
    etaActions.appendChild(button("Copy ETA", () => copyEta()));
    etaResultsNode = document.createElement("div");
    etaResultsNode.className = "occumed-eta-results";
    eta.appendChild(etaActions);
    eta.appendChild(etaResultsNode);
    box.appendChild(eta);

    const density = section("Density and Basemap");
    const densityActions = document.createElement("div");
    densityActions.className = "occumed-mapbox-actions";
    const densityButton = button("Density", () => { densityEnabled = !densityEnabled; densityButton.classList.toggle("active", densityEnabled); drawDensity(map); });
    densityActions.appendChild(densityButton);
    basemaps.forEach((item) => densityActions.appendChild(button(item.label, () => updateBasemap(map, item.style))));
    density.appendChild(densityActions);
    box.appendChild(density);

    statusNode = document.createElement("div");
    statusNode.className = "occumed-mapbox-status";
    statusNode.textContent = "Click map to set origin. Alt-click routes from origin.";
    box.appendChild(statusNode);
    return box;
  };
  control.addTo(map);
}

function installOnMap(map: L.Map): void {
  addCommandPanel(map);
  map.on("click", async (event: L.LeafletMouseEvent) => {
    const point = { lat: event.latlng.lat, lng: event.latlng.lng };
    if (event.originalEvent?.altKey) {
      await drawRoute(map, point);
      return;
    }
    try {
      const place = await mapboxReverseGeocode(point);
      setOrigin(map, { ...point, label: place?.placeName || "Selected location" });
    } catch {
      setOrigin(map, point);
    }
  });
  map.on("moveend zoomend", () => { if (densityEnabled) drawDensity(map); });
}

export function installMapToolsCommandPanel(): void {
  if (installed || !hasMapboxToken()) return;
  installed = true;
  (L as any).map = (...args: Parameters<typeof L.map>) => {
    const map = originalMap(...args);
    window.setTimeout(() => installOnMap(map), 0);
    return map;
  };
}

installMapToolsCommandPanel();

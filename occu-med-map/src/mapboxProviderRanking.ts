import L from "leaflet";
import { hasMapboxToken, mapboxDirections, mapboxReverseGeocode } from "./mapboxServices";

type Point = { lat: number; lng: number; label?: string };
type Candidate = Point & { layer: L.Layer; straightMiles: number; name: string };
type RankedCandidate = Candidate & { driveMiles: number; driveMinutes: number; coordinates: Array<[number, number]> };

const originalMap = L.map.bind(L);
let installed = false;
let origin: Point | null = null;
let rankLayer: L.LayerGroup | null = null;
let statusNode: HTMLDivElement | null = null;
let resultsNode: HTMLDivElement | null = null;
let latestRankings: RankedCandidate[] = [];

function milesBetween(a: Point, b: Point): number {
  const radiusMiles = 3958.7613;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radiusMiles * Math.asin(Math.sqrt(h));
}

function setStatus(text: string): void {
  if (statusNode) statusNode.textContent = text;
}

function markerLabel(layer: L.Layer, fallback: string): string {
  const tooltip = (layer as L.Marker).getTooltip?.();
  const popup = (layer as L.Marker).getPopup?.();
  const tooltipContent = tooltip?.getContent?.();
  const popupContent = popup?.getContent?.();
  const raw = typeof tooltipContent === "string" ? tooltipContent : typeof popupContent === "string" ? popupContent : fallback;
  const stripped = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return stripped.slice(0, 70) || fallback;
}

function collectVisibleCandidates(map: L.Map, currentOrigin: Point): Candidate[] {
  const bounds = map.getBounds().pad(0.1);
  const rows: Candidate[] = [];
  map.eachLayer((layer: L.Layer) => {
    const maybeMarker = layer as L.Marker & { getLatLng?: () => L.LatLng };
    if (typeof maybeMarker.getLatLng !== "function") return;
    const latLng = maybeMarker.getLatLng();
    if (!bounds.contains(latLng)) return;
    const point = { lat: latLng.lat, lng: latLng.lng };
    const straightMiles = milesBetween(currentOrigin, point);
    if (straightMiles < 0.03 || straightMiles > 250) return;
    rows.push({ ...point, layer, straightMiles, name: markerLabel(layer, `Pin ${rows.length + 1}`) });
  });
  return rows.sort((a, b) => a.straightMiles - b.straightMiles).slice(0, 8);
}

function clearRanking(map: L.Map): void {
  latestRankings = [];
  if (rankLayer) {
    map.removeLayer(rankLayer);
    rankLayer = null;
  }
  if (resultsNode) resultsNode.innerHTML = "";
  setStatus("ETA ranking cleared.");
}

function drawRankedRoute(map: L.Map, row: RankedCandidate): void {
  if (rankLayer) map.removeLayer(rankLayer);
  const line = L.polyline(row.coordinates, { color: "#7c3aed", weight: 5, opacity: 0.86 });
  const end = L.circleMarker([row.lat, row.lng], { radius: 6, color: "#4c1d95", fillColor: "#ffffff", fillOpacity: 1, weight: 2 });
  rankLayer = L.layerGroup([line, end]).addTo(map);
  map.fitBounds(line.getBounds(), { padding: [38, 38] });
  setStatus(`${row.name}: ${Math.round(row.driveMinutes)} min / ${row.driveMiles.toFixed(1)} mi`);
}

function rankingText(): string {
  if (latestRankings.length === 0) return "No ETA rankings available.";
  const originLabel = origin?.label || (origin ? `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}` : "selected origin");
  const lines = [`Provider ETA ranking from ${originLabel}`];
  latestRankings.forEach((row, index) => {
    lines.push(`${index + 1}. ${row.name} — ${Math.round(row.driveMinutes)} min / ${row.driveMiles.toFixed(1)} mi`);
  });
  return lines.join("\n");
}

async function copyRanking(): Promise<void> {
  const text = rankingText();
  try {
    await navigator.clipboard.writeText(text);
    setStatus("ETA ranking copied to clipboard.");
  } catch {
    setStatus(text);
  }
}

function renderRankings(map: L.Map, rankings: RankedCandidate[]): void {
  if (!resultsNode) return;
  resultsNode.innerHTML = "";
  rankings.forEach((row, index) => {
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
    button.addEventListener("click", () => drawRankedRoute(map, row));
    resultsNode?.appendChild(button);
  });
}

async function rankVisibleProviders(map: L.Map): Promise<void> {
  const currentOrigin = origin;
  if (!currentOrigin) {
    setStatus("Click the map to set an origin first.");
    return;
  }
  const candidates = collectVisibleCandidates(map, currentOrigin);
  if (candidates.length === 0) {
    setStatus("No visible provider pins found to rank. Zoom to results first.");
    return;
  }
  setStatus(`Ranking ${candidates.length} visible pins by Mapbox drive time...`);
  const ranked: RankedCandidate[] = [];
  for (const candidate of candidates) {
    try {
      const route = await mapboxDirections(currentOrigin, candidate, "driving-traffic");
      ranked.push({ ...candidate, driveMiles: route.distanceMiles, driveMinutes: route.durationMinutes, coordinates: route.coordinates });
    } catch {
      // Skip candidates that Mapbox cannot route to.
    }
  }
  if (ranked.length === 0) {
    setStatus("Mapbox could not route to the visible pins.");
    return;
  }
  ranked.sort((a, b) => a.driveMinutes - b.driveMinutes);
  latestRankings = ranked.slice(0, 6);
  renderRankings(map, latestRankings);
  setStatus(`Ranked ${ranked.length} routed pins. Click a row to draw the route.`);
}

function addRankingControl(map: L.Map): void {
  const control = new L.Control({ position: "bottomleft" });
  control.onAdd = () => {
    const box = L.DomUtil.create("div", "occumed-eta-ranking");
    L.DomEvent.disableClickPropagation(box);
    L.DomEvent.disableScrollPropagation(box);

    const title = document.createElement("div");
    title.className = "occumed-basemap-title";
    title.textContent = "Provider ETA Ranking";
    box.appendChild(title);

    const actions = document.createElement("div");
    actions.className = "occumed-mapbox-actions";
    const rankButton = document.createElement("button");
    rankButton.type = "button";
    rankButton.textContent = "Rank Visible Pins";
    rankButton.addEventListener("click", () => rankVisibleProviders(map));
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = "Copy ETA";
    copyButton.addEventListener("click", () => copyRanking());
    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.textContent = "Clear ETA";
    clearButton.addEventListener("click", () => clearRanking(map));
    actions.appendChild(rankButton);
    actions.appendChild(copyButton);
    actions.appendChild(clearButton);
    box.appendChild(actions);

    statusNode = document.createElement("div");
    statusNode.className = "occumed-mapbox-status";
    statusNode.textContent = "Click map to set origin, then rank visible pins.";
    box.appendChild(statusNode);

    resultsNode = document.createElement("div");
    resultsNode.className = "occumed-eta-results";
    box.appendChild(resultsNode);
    return box;
  };
  control.addTo(map);
}

function installOnMap(map: L.Map): void {
  addRankingControl(map);
  map.on("click", async (event: L.LeafletMouseEvent) => {
    const point = { lat: event.latlng.lat, lng: event.latlng.lng };
    try {
      const place = await mapboxReverseGeocode(point);
      origin = { ...point, label: place?.placeName || "Selected origin" };
      setStatus(`Origin set: ${origin.label}`);
    } catch {
      origin = point;
      setStatus(`Origin set: ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`);
    }
  });
}

export function installMapboxProviderRanking(): void {
  if (installed || !hasMapboxToken()) return;
  installed = true;
  (L as any).map = (...args: Parameters<typeof L.map>) => {
    const map = originalMap(...args);
    window.setTimeout(() => installOnMap(map), 0);
    return map;
  };
}

installMapboxProviderRanking();

import L from "leaflet";
import { hasMapboxToken, mapboxDirections, mapboxGeocode, mapboxIsochrone, mapboxReverseGeocode } from "./mapboxServices";

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || "";
const originalTileLayer = L.tileLayer.bind(L);
const originalMap = L.map.bind(L);
let installed = false;

const basemaps = [
  { id: "streets", label: "Streets", style: "streets-v12" },
  { id: "light", label: "Light", style: "light-v11" },
  { id: "terrain", label: "Terrain", style: "outdoors-v12" },
  { id: "satellite", label: "Satellite", style: "satellite-streets-v12" },
] as const;

type Point = { lat: number; lng: number; label?: string };
let selectedOrigin: Point | null = null;
let routeLayer: L.LayerGroup | null = null;
let zoneLayer: L.GeoJSON | null = null;
let searchMarker: L.Marker | null = null;
let statusEl: HTMLDivElement | null = null;

function mapboxStyleTileUrl(style: string): string {
  const url = new URL(`https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/256/{z}/{x}/{y}@2x`);
  url.searchParams.set(["access", "token"].join("_"), mapboxToken);
  return url.toString().replaceAll("%7B", "{").replaceAll("%7D", "}");
}

function setStatus(message: string): void {
  if (statusEl) statusEl.textContent = message;
}

function updateMapTiles(map: L.Map, style: string): void {
  map.eachLayer((layer) => {
    const tileLayer = layer as L.TileLayer & { setUrl?: (url: string) => void };
    if (typeof tileLayer.setUrl === "function") tileLayer.setUrl(mapboxStyleTileUrl(style));
  });
}

function clearAdvancedLayers(map: L.Map): void {
  if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
  if (zoneLayer) { map.removeLayer(zoneLayer); zoneLayer = null; }
}

function setOrigin(map: L.Map, point: Point): void {
  selectedOrigin = point;
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
  const label = point.label || `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
  searchMarker.bindPopup(`<div class="occumed-mapbox-popup"><strong>${label}</strong><br/>Mapbox origin selected</div>`);
  setStatus(`Origin set: ${label}`);
}

async function runControlSearch(map: L.Map, input: HTMLInputElement): Promise<void> {
  const query = input.value.trim();
  if (!query) return;
  setStatus("Searching Mapbox geocoding...");
  try {
    const center = map.getCenter();
    const results = await mapboxGeocode(query, { lat: center.lat, lng: center.lng });
    const best = results[0];
    if (!best) { setStatus("No Mapbox geocode result found."); return; }
    setOrigin(map, { lat: best.lat, lng: best.lng, label: best.placeName });
    map.flyTo([best.lat, best.lng], 13, { duration: 1.1 });
  } catch (err: any) {
    setStatus(err?.message || "Mapbox search failed.");
  }
}

async function drawDriveTimeZones(map: L.Map): Promise<void> {
  if (!selectedOrigin) { setStatus("Set an origin first by searching or clicking the map."); return; }
  setStatus("Loading Mapbox drive-time zones...");
  try {
    if (zoneLayer) map.removeLayer(zoneLayer);
    const data = await mapboxIsochrone(selectedOrigin, [15, 30, 45, 60]);
    zoneLayer = L.geoJSON(data, {
      style: (feature: any) => {
        const mins = Number(feature?.properties?.contour || 15);
        const opacity = mins === 15 ? 0.18 : mins === 30 ? 0.13 : mins === 45 ? 0.09 : 0.06;
        return { color: "#0369a1", weight: 1.4, opacity: 0.45, fillColor: "#0ea5e9", fillOpacity: opacity };
      },
    }).addTo(map);
    map.fitBounds(zoneLayer.getBounds(), { padding: [28, 28] });
    setStatus("Drive-time zones: 15 / 30 / 45 / 60 minutes.");
  } catch (err: any) {
    setStatus(err?.message || "Drive-time zone request failed.");
  }
}

async function drawRoute(map: L.Map, destination: Point): Promise<void> {
  if (!selectedOrigin) { setStatus("Set an origin first by searching or clicking the map."); return; }
  setStatus("Loading Mapbox route...");
  try {
    if (routeLayer) map.removeLayer(routeLayer);
    const route = await mapboxDirections(selectedOrigin, destination, "driving-traffic");
    const line = L.polyline(route.coordinates, { color: "#0284c7", weight: 5, opacity: 0.86 });
    const start = L.circleMarker([selectedOrigin.lat, selectedOrigin.lng], { radius: 5, color: "#0284c7", fillColor: "#0284c7", fillOpacity: 1 });
    const end = L.circleMarker([destination.lat, destination.lng], { radius: 5, color: "#0f172a", fillColor: "#f8fafc", fillOpacity: 1, weight: 2 });
    routeLayer = L.layerGroup([line, start, end]).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [35, 35] });
    setStatus(`Route: ${route.distanceMiles.toFixed(1)} mi / ${Math.round(route.durationMinutes)} min.`);
  } catch (err: any) {
    setStatus(err?.message || "Mapbox route request failed.");
  }
}

function addBasemapControl(map: L.Map): void {
  const control = new L.Control({ position: "bottomleft" });
  control.onAdd = () => {
    const container = L.DomUtil.create("div", "occumed-basemap-control");
    L.DomEvent.disableClickPropagation(container);
    const title = document.createElement("div");
    title.className = "occumed-basemap-title";
    title.textContent = "Mapbox Basemaps";
    container.appendChild(title);
    basemaps.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.label;
      button.addEventListener("click", () => updateMapTiles(map, item.style));
      container.appendChild(button);
    });
    return container;
  };
  control.addTo(map);
}

function addMapboxToolsControl(map: L.Map): void {
  const control = new L.Control({ position: "bottomleft" });
  control.onAdd = () => {
    const container = L.DomUtil.create("div", "occumed-mapbox-tools");
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    const title = document.createElement("div");
    title.className = "occumed-basemap-title";
    title.textContent = "Mapbox Intelligence";
    container.appendChild(title);

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Search address or place";
    input.className = "occumed-mapbox-search";
    container.appendChild(input);

    const actions = document.createElement("div");
    actions.className = "occumed-mapbox-actions";
    const searchButton = document.createElement("button");
    searchButton.type = "button";
    searchButton.textContent = "Search";
    searchButton.addEventListener("click", () => runControlSearch(map, input));
    input.addEventListener("keydown", (event) => { if (event.key === "Enter") runControlSearch(map, input); });

    const zonesButton = document.createElement("button");
    zonesButton.type = "button";
    zonesButton.textContent = "Drive Zones";
    zonesButton.addEventListener("click", () => drawDriveTimeZones(map));

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.textContent = "Clear";
    clearButton.addEventListener("click", () => {
      clearAdvancedLayers(map);
      if (searchMarker) { map.removeLayer(searchMarker); searchMarker = null; }
      selectedOrigin = null;
      setStatus("Cleared Mapbox layers.");
    });

    actions.appendChild(searchButton);
    actions.appendChild(zonesButton);
    actions.appendChild(clearButton);
    container.appendChild(actions);

    statusEl = document.createElement("div");
    statusEl.className = "occumed-mapbox-status";
    statusEl.textContent = "Click map to set origin. Shift-click to route.";
    container.appendChild(statusEl);

    return container;
  };
  control.addTo(map);
}

function attachPopupRouteAction(map: L.Map, popup: L.Popup): void {
  window.setTimeout(() => {
    const root = popup.getElement();
    const latlng = popup.getLatLng();
    if (!root || !latlng || root.querySelector(".occumed-popup-route")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "occumed-popup-route";
    button.textContent = selectedOrigin ? "Route from selected origin" : "Set origin first, then route";
    button.addEventListener("click", () => drawRoute(map, { lat: latlng.lat, lng: latlng.lng, label: "Selected provider" }));
    root.appendChild(button);
  }, 0);
}

function installAdvancedMapboxBehaviors(map: L.Map): void {
  addBasemapControl(map);
  addMapboxToolsControl(map);

  map.on("click", async (event: L.LeafletMouseEvent) => {
    const point = { lat: event.latlng.lat, lng: event.latlng.lng };
    if (event.originalEvent?.shiftKey) {
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

  map.on("popupopen", (event: any) => attachPopupRouteAction(map, event.popup));
}

export function installMapboxLeafletRuntime(): void {
  if (installed) return;
  installed = true;
  if (!mapboxToken || !hasMapboxToken()) return;

  (L as any).tileLayer = (template: string, options: L.TileLayerOptions = {}) => {
    const isDefaultOpenStreetMap = typeof template === "string" && template.includes("tile.openstreetmap.org");
    if (!isDefaultOpenStreetMap) return originalTileLayer(template, options);
    return originalTileLayer(mapboxStyleTileUrl("streets-v12"), {
      ...options,
      className: "mapbox-streets-tiles",
      maxZoom: 20,
      attribution: "© Mapbox © OpenStreetMap",
    });
  };

  (L as any).map = (...args: Parameters<typeof L.map>) => {
    const map = originalMap(...args);
    window.setTimeout(() => installAdvancedMapboxBehaviors(map), 0);
    return map;
  };
}

installMapboxLeafletRuntime();

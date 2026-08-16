import MapScene from "./mapSceneRuntime";
import { registerMapSceneInitializer } from "./mapSceneLifecycleRuntime";
import { hasMapboxToken, mapboxDirections, mapboxIsochrone, mapboxReverseGeocode } from "./mapboxServices";

type Point = { lat: number; lng: number; label?: string };
type TravelMode = "driving-traffic" | "driving" | "walking";

let installed = false;
let origin: Point | null = null;
let routeLayer: MapScene.LayerGroup | null = null;
let zoneLayer: MapScene.GeoJSON | null = null;
let mode: TravelMode = "driving-traffic";
let zonePreset = [15, 30, 45, 60];
let statusNode: HTMLDivElement | null = null;

function setStatus(text: string) {
  if (statusNode) statusNode.textContent = text;
}

function zoneMode(): "driving" | "walking" {
  return mode === "walking" ? "walking" : "driving";
}

function clearLayers(map: MapScene.Map) {
  if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
  if (zoneLayer) { map.removeLayer(zoneLayer); zoneLayer = null; }
}

async function setOriginFromPoint(point: Point) {
  origin = point;
  setStatus(`Origin ready: ${point.label || point.lat.toFixed(4) + ", " + point.lng.toFixed(4)}`);
}

async function routeTo(map: MapScene.Map, target: Point) {
  if (!origin) { setStatus("Set an origin first by clicking the map."); return; }
  setStatus(`Loading ${mode} route...`);
  try {
    if (routeLayer) map.removeLayer(routeLayer);
    const route = await mapboxDirections(origin, target, mode);
    const line = MapScene.polyline(route.coordinates, { color: "#0f766e", weight: 5, opacity: 0.86 });
    routeLayer = MapScene.layerGroup([line]).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [38, 38] });
    setStatus(`${mode}: ${route.distanceMiles.toFixed(1)} mi / ${Math.round(route.durationMinutes)} min`);
  } catch (err: any) {
    setStatus(err?.message || "Route failed.");
  }
}

async function drawZones(map: MapScene.Map) {
  if (!origin) { setStatus("Set an origin first by clicking the map."); return; }
  setStatus(`Loading ${zonePreset.join("/")} min zones...`);
  try {
    if (zoneLayer) map.removeLayer(zoneLayer);
    const data = await mapboxIsochrone(origin, zonePreset, zoneMode());
    zoneLayer = MapScene.geoJSON(data, {
      style: (feature: any) => {
        const contour = Number(feature?.properties?.contour || zonePreset[0]);
        const index = Math.max(0, zonePreset.indexOf(contour));
        return { color: "#0f766e", weight: 1.4, opacity: 0.45, fillColor: "#14b8a6", fillOpacity: Math.max(0.05, 0.18 - index * 0.04) };
      },
    }).addTo(map);
    map.fitBounds(zoneLayer.getBounds(), { padding: [30, 30] });
    setStatus(`Zones shown: ${zonePreset.join(" / ")} minutes`);
  } catch (err: any) {
    setStatus(err?.message || "Zones failed.");
  }
}

function addControl(map: MapScene.Map) {
  const control = new MapScene.Control({ position: "bottomleft" });
  control.onAdd = () => {
    const box = MapScene.DomUtil.create("div", "occumed-mapbox-advanced");
    MapScene.DomEvent.disableClickPropagation(box);
    MapScene.DomEvent.disableScrollPropagation(box);

    const title = document.createElement("div");
    title.className = "occumed-basemap-title";
    title.textContent = "Route Profiles";
    box.appendChild(title);

    const modes = document.createElement("div");
    modes.className = "occumed-mapbox-actions";
    [
      { id: "driving-traffic", label: "Traffic" },
      { id: "driving", label: "Drive" },
      { id: "walking", label: "Walk" },
    ].forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = item.label;
      if (item.id === mode) btn.classList.add("active");
      btn.addEventListener("click", () => {
        mode = item.id as TravelMode;
        modes.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        setStatus(`Mode: ${item.label}`);
      });
      modes.appendChild(btn);
    });
    box.appendChild(modes);

    const zones = document.createElement("div");
    zones.className = "occumed-mapbox-actions";
    [
      { label: "15/30", values: [15, 30] },
      { label: "15/30/45", values: [15, 30, 45] },
      { label: "15/30/45/60", values: [15, 30, 45, 60] },
    ].forEach((item, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = item.label;
      if (index === 2) btn.classList.add("active");
      btn.addEventListener("click", () => {
        zonePreset = item.values;
        zones.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        setStatus(`Preset: ${item.label}`);
      });
      zones.appendChild(btn);
    });
    box.appendChild(zones);

    const actions = document.createElement("div");
    actions.className = "occumed-mapbox-actions";
    const zoneBtn = document.createElement("button");
    zoneBtn.type = "button";
    zoneBtn.textContent = "Draw Zones";
    zoneBtn.addEventListener("click", () => drawZones(map));
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.textContent = "Clear Routes";
    clearBtn.addEventListener("click", () => { clearLayers(map); setStatus("Route layers cleared."); });
    actions.appendChild(zoneBtn);
    actions.appendChild(clearBtn);
    box.appendChild(actions);

    statusNode = document.createElement("div");
    statusNode.className = "occumed-mapbox-status";
    statusNode.textContent = "Click sets origin. Alt-click routes.";
    box.appendChild(statusNode);
    return box;
  };
  control.addTo(map);
}

function installOnMap(map: MapScene.Map) {
  addControl(map);
  map.on("click", async (event: MapScene.MapPointerEvent) => {
    const point = { lat: event.latlng.lat, lng: event.latlng.lng };
    if (event.originalEvent?.altKey) {
      await routeTo(map, point);
      return;
    }
    try {
      const place = await mapboxReverseGeocode(point);
      await setOriginFromPoint({ ...point, label: place?.placeName || "Selected location" });
    } catch {
      await setOriginFromPoint(point);
    }
  });
}

export function installMapboxAdvancedControls() {
  if (installed || !hasMapboxToken()) return;
  installed = true;
  registerMapSceneInitializer({
    id: "mapbox-advanced-controls",
    priority: 90,
    initialize: (map) => { window.setTimeout(() => installOnMap(map), 0); },
  });
}

installMapboxAdvancedControls();

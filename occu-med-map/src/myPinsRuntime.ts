import mapboxgl from "mapbox-gl";
import { getTrackedMapboxMaps, registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";
import { registerMapToolsSection } from "./mapToolsPanelRegistry";
import { registerRuntimeOwner } from "./runtimeControllerRegistry";

/**
 * My Pins: user-placed map markers with a name, note and color.
 * Stored in this browser's localStorage (no backend). Self-contained: it only
 * adds its own source/layers and one Map Tools section, and never touches
 * provider layers.
 */

type Pin = { id: string; name: string; note: string; color: string; lat: number; lng: number; createdAt: string };

const STORAGE_KEY = "network-map-my-pins-v1";
const SOURCE_ID = "my-pins-source";
const CIRCLE_ID = "my-pins-circle";
const LABEL_ID = "my-pins-label";
const MAX_PINS = 500;
const COLORS = [
  { label: "Red", value: "#ef4444" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Green", value: "#22c55e" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Violet", value: "#a855f7" },
];

let pins: Pin[] = loadPins();
let armed = false;
let draftName = "";
let draftNote = "";
let draftColor = COLORS[0].value;
const views = new Set<() => void>();
const popups = new Set<mapboxgl.Popup>();

function loadPins(): Pin[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng)).map((p) => ({
      id: String(p.id), name: String(p.name || "Pin"), note: String(p.note || ""),
      color: String(p.color || COLORS[0].value), lat: Number(p.lat), lng: Number(p.lng),
      createdAt: String(p.createdAt || ""),
    })).slice(0, MAX_PINS);
  } catch { return []; }
}

function savePins(): boolean {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pins)); return true; } catch { return false; }
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}

function toGeoJson(): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: pins.map((pin) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [pin.lng, pin.lat] },
      properties: { id: pin.id, name: pin.name, note: pin.note, color: pin.color },
    })),
  };
}

function ensureLayers(map: mapboxgl.Map): void {
  if (!map.isStyleLoaded() && !map.getStyle()) return;
  const data = toGeoJson();
  const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  if (source) { source.setData(data); return; }
  map.addSource(SOURCE_ID, { type: "geojson", data });
  map.addLayer({
    id: CIRCLE_ID, type: "circle", source: SOURCE_ID,
    paint: {
      "circle-radius": 9, "circle-color": ["get", "color"],
      "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.5, "circle-pitch-alignment": "map",
    },
  });
  map.addLayer({
    id: LABEL_ID, type: "symbol", source: SOURCE_ID,
    layout: { "text-field": ["get", "name"], "text-size": 12, "text-offset": [0, 1.4], "text-anchor": "top", "text-allow-overlap": false, "text-optional": true },
    paint: { "text-color": "#0f172a", "text-halo-color": "#ffffff", "text-halo-width": 1.6 },
  });
}

function refreshMaps(): void {
  for (const map of getTrackedMapboxMaps()) {
    try { ensureLayers(map); } catch (error) { console.debug("My Pins waiting for map style", error); }
  }
}

function commit(): void {
  savePins();
  refreshMaps();
  for (const render of views) render();
}

function addPin(lat: number, lng: number): void {
  if (pins.length >= MAX_PINS) return;
  const pin: Pin = {
    id: `pin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: draftName.trim() || `Pin ${pins.length + 1}`, note: draftNote.trim(),
    color: draftColor, lat, lng, createdAt: new Date().toISOString(),
  };
  pins = [...pins, pin];
  draftName = ""; draftNote = "";
  armed = false;
  commit();
}

function removePin(id: string): void {
  pins = pins.filter((p) => p.id !== id);
  for (const popup of popups) popup.remove();
  commit();
}

function flyTo(pin: Pin): void {
  const map = getTrackedMapboxMaps().find((m) => m.getContainer().offsetParent !== null) || getTrackedMapboxMaps()[0];
  map?.flyTo({ center: [pin.lng, pin.lat], zoom: Math.max(map.getZoom(), 13), duration: 800 });
}

function exportGeoJson(): void {
  const blob = new Blob([JSON.stringify(toGeoJson(), null, 2)], { type: "application/geo+json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "my-pins.geojson";
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function showPopup(map: mapboxgl.Map, pin: Pin): void {
  const root = document.createElement("div");
  root.className = "my-pin-popup";
  root.innerHTML = `<strong>${escapeHtml(pin.name)}</strong>${pin.note ? `<div>${escapeHtml(pin.note)}</div>` : ""}<div class="my-pin-coords">${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}</div><button type="button">Delete pin</button>`;
  root.querySelector("button")?.addEventListener("click", () => removePin(pin.id));
  const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "260px", offset: 12 })
    .setLngLat([pin.lng, pin.lat]).setDOMContent(root).addTo(map);
  popups.add(popup);
  popup.on("close", () => popups.delete(popup));
}

function bindMap(map: mapboxgl.Map): () => void {
  const apply = () => { try { ensureLayers(map); } catch (error) { console.debug("My Pins waiting for map style", error); } };
  const click = (event: mapboxgl.MapMouseEvent) => {
    const original = event.originalEvent as unknown as Record<string, unknown> | undefined;
    if (armed) {
      if (original) original.__networkMapOverlayHandled = true;
      addPin(event.lngLat.lat, event.lngLat.lng);
      return;
    }
    if (!map.getLayer(CIRCLE_ID)) return;
    const hit = map.queryRenderedFeatures(event.point, { layers: [CIRCLE_ID] })[0];
    const pin = hit && pins.find((p) => p.id === hit.properties?.id);
    if (!pin) return;
    if (original) original.__networkMapOverlayHandled = true;
    showPopup(map, pin);
  };
  const move = (event: mapboxgl.MapMouseEvent) => {
    if (armed) { map.getCanvas().style.cursor = "crosshair"; return; }
    if (!map.getLayer(CIRCLE_ID)) return;
    const over = map.queryRenderedFeatures(event.point, { layers: [CIRCLE_ID] }).length > 0;
    if (over) map.getCanvas().style.cursor = "pointer";
  };
  // The app's dual-engine click handler runs before ours and treats any map click as
  // "set origin". Claim the click in the capture phase (before Mapbox sees it) when we
  // are placing a pin or the click lands on an existing pin.
  const container = map.getCanvasContainer();
  const claim = (domEvent: MouseEvent) => {
    let mine = armed;
    if (!mine && map.getLayer(CIRCLE_ID)) {
      const rect = container.getBoundingClientRect();
      const point: [number, number] = [domEvent.clientX - rect.left, domEvent.clientY - rect.top];
      mine = map.queryRenderedFeatures(point, { layers: [CIRCLE_ID] }).length > 0;
    }
    if (mine) (domEvent as unknown as Record<string, unknown>).__networkMapOverlayHandled = true;
  };
  container.addEventListener("click", claim, true);
  map.on("style.load", apply);
  map.on("load", apply);
  map.on("click", click);
  map.on("mousemove", move);
  queueMicrotask(apply);
  const syncCursor = () => { if (!armed) map.getCanvas().style.cursor = ""; };
  views.add(syncCursor);
  return () => {
    views.delete(syncCursor);
    map.off("style.load", apply); map.off("load", apply);
    map.off("click", click); map.off("mousemove", move);
    container.removeEventListener("click", claim, true);
    try { if (map.getLayer(LABEL_ID)) map.removeLayer(LABEL_ID); if (map.getLayer(CIRCLE_ID)) map.removeLayer(CIRCLE_ID); if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID); } catch {}
  };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function mountSection(panel: HTMLElement): () => void {
  const root = el("div", "occumed-map-tools-section my-pins-section");
  root.dataset.mapToolsSection = "my-pins";
  root.appendChild(el("div", "occumed-map-tools-section-title", "My Pins"));

  const form = el("div", "my-pins-form");
  const nameInput = el("input"); nameInput.type = "text"; nameInput.placeholder = "Pin name (optional)"; nameInput.maxLength = 80; nameInput.setAttribute("aria-label", "Pin name");
  const noteInput = el("input"); noteInput.type = "text"; noteInput.placeholder = "Note (optional)"; noteInput.maxLength = 300; noteInput.setAttribute("aria-label", "Pin note");
  const colorSelect = el("select"); colorSelect.setAttribute("aria-label", "Pin color");
  for (const c of COLORS) { const o = el("option", undefined, c.label); o.value = c.value; colorSelect.appendChild(o); }
  nameInput.addEventListener("input", () => { draftName = nameInput.value; });
  noteInput.addEventListener("input", () => { draftNote = noteInput.value; });
  colorSelect.addEventListener("change", () => { draftColor = colorSelect.value; });
  form.append(nameInput, noteInput, colorSelect);

  const actions = el("div", "occumed-mapbox-actions");
  const dropButton = el("button", undefined, "Drop pin"); dropButton.type = "button";
  dropButton.addEventListener("click", () => { armed = !armed; render(); for (const v of views) v(); });
  const exportButton = el("button", undefined, "Export"); exportButton.type = "button";
  exportButton.addEventListener("click", exportGeoJson);
  const clearButton = el("button", undefined, "Clear all"); clearButton.type = "button";
  clearButton.addEventListener("click", () => {
    if (!pins.length || !window.confirm(`Delete all ${pins.length} pins? This can't be undone.`)) return;
    pins = []; for (const popup of popups) popup.remove(); commit();
  });
  actions.append(dropButton, exportButton, clearButton);

  const status = el("div", "occumed-mapbox-status"); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
  const list = el("div", "my-pins-list");
  root.append(form, actions, status, list);
  panel.appendChild(root);

  function render(): void {
    dropButton.classList.toggle("active", armed);
    dropButton.setAttribute("aria-pressed", String(armed));
    dropButton.textContent = armed ? "Click the map…" : "Drop pin";
    exportButton.disabled = pins.length === 0;
    clearButton.disabled = pins.length === 0;
    nameInput.value = draftName; noteInput.value = draftNote; colorSelect.value = draftColor;
    status.textContent = armed ? "Click anywhere on the map to place the pin." : pins.length ? `${pins.length} saved pin${pins.length === 1 ? "" : "s"} (stored in this browser).` : "No pins yet. Name one above, then Drop pin.";
    list.replaceChildren(...[...pins].reverse().map((pin) => {
      const row = el("div", "my-pins-row");
      const dot = el("span", "my-pins-dot"); dot.style.background = pin.color;
      const go = el("button", "my-pins-go"); go.type = "button"; go.title = "Zoom to pin";
      go.append(el("strong", undefined, pin.name), ...(pin.note ? [el("small", undefined, pin.note)] : []));
      go.addEventListener("click", () => flyTo(pin));
      const del = el("button", "my-pins-del", "×"); del.type = "button"; del.setAttribute("aria-label", `Delete ${pin.name}`);
      del.addEventListener("click", () => removePin(pin.id));
      row.append(dot, go, del);
      return row;
    }));
  }
  views.add(render);
  render();
  return () => { views.delete(render); root.remove(); };
}

function install(): void {
  if (!registerRuntimeOwner("my-pins", "User-placed map pins with notes (localStorage)")) return;
  registerMapboxMapInitializer({ id: "my-pins", priority: 30, initialize: bindMap });
  registerMapToolsSection({ id: "my-pins", priority: 160, mount: (panel) => mountSection(panel) });
}

install();
export {};

import type mapboxgl from "mapbox-gl";
import { getMapboxMapByMode, registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";
import { registerMapToolsSection } from "./mapToolsPanelRegistry";
import { registerRuntimeOwner } from "./runtimeControllerRegistry";

/**
 * 3D Terrain for the 2D Mapbox map: Mapbox's terrain DEM + sky, with an
 * exaggeration choice and a tilt slider (the 2D map ships with rotation/tilt
 * gestures disabled). Off by default and never touches provider layers.
 */

const DEM_SOURCE_ID = "occumed-terrain-dem";
const SKY_LAYER_ID = "occumed-terrain-sky";
const EXAGGERATIONS = [1, 1.5, 2, 3] as const;
const DEFAULT_TILT = 60;
const MAX_TILT = 75;

let enabled = false;
let exaggeration: number = 1.5;
let previousPitch = 0;
const views = new Set<() => void>();

function map2d(): mapboxgl.Map | null {
  return getMapboxMapByMode("2d");
}

function applyTerrain(map: mapboxgl.Map): void {
  if (!enabled) {
    try { map.setTerrain(null); } catch {}
    try { if (map.getLayer(SKY_LAYER_ID)) map.removeLayer(SKY_LAYER_ID); } catch {}
    try { if (map.getSource(DEM_SOURCE_ID)) map.removeSource(DEM_SOURCE_ID); } catch {}
    return;
  }
  if (!map.getSource(DEM_SOURCE_ID)) {
    map.addSource(DEM_SOURCE_ID, {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14,
    });
  }
  map.setTerrain({ source: DEM_SOURCE_ID, exaggeration });
  if (!map.getLayer(SKY_LAYER_ID)) {
    map.addLayer({
      id: SKY_LAYER_ID,
      type: "sky",
      paint: { "sky-type": "atmosphere", "sky-atmosphere-sun": [0, 0], "sky-atmosphere-sun-intensity": 8 },
    } as mapboxgl.SkyLayerSpecification);
  }
}

function safeApply(map: mapboxgl.Map): void {
  try { applyTerrain(map); } catch (error) { console.debug("3D terrain waiting for map style", error); }
}

function setEnabled(next: boolean): void {
  const map = map2d();
  enabled = next;
  if (map) {
    if (next) {
      previousPitch = map.getPitch();
      safeApply(map);
      if (map.getPitch() < 30) map.easeTo({ pitch: DEFAULT_TILT, duration: 900 });
    } else {
      safeApply(map);
      map.easeTo({ pitch: previousPitch < 30 ? previousPitch : 0, bearing: 0, duration: 700 });
    }
  }
  for (const render of views) render();
}

function setExaggeration(value: number): void {
  exaggeration = value;
  const map = map2d();
  if (map && enabled) safeApply(map);
  for (const render of views) render();
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function mountSection(panel: HTMLElement): () => void {
  const root = el("div", "occumed-map-tools-section terrain-section");
  root.dataset.mapToolsSection = "terrain-3d";
  root.appendChild(el("div", "occumed-map-tools-section-title", "3D Terrain"));

  const actions = el("div", "occumed-mapbox-actions");
  const toggle = el("button"); toggle.type = "button";
  toggle.addEventListener("click", () => setEnabled(!enabled));
  actions.appendChild(toggle);

  const exagRow = el("div", "occumed-mapbox-actions terrain-exag");
  const exagButtons = new Map<number, HTMLButtonElement>();
  for (const value of EXAGGERATIONS) {
    const button = el("button", undefined, `${value}×`); button.type = "button";
    button.setAttribute("aria-label", `Terrain exaggeration ${value} times`);
    button.addEventListener("click", () => setExaggeration(value));
    exagButtons.set(value, button);
    exagRow.appendChild(button);
  }

  const tiltLabel = el("label", "terrain-tilt");
  const tiltText = el("span", undefined, "Tilt");
  const tilt = el("input"); tilt.type = "range"; tilt.min = "0"; tilt.max = String(MAX_TILT); tilt.step = "1"; tilt.value = "0";
  tilt.setAttribute("aria-label", "Map tilt");
  const tiltValue = el("span", "terrain-tilt-value", "0°");
  tilt.addEventListener("input", () => {
    const map = map2d();
    tiltValue.textContent = `${tilt.value}°`;
    map?.setPitch(Number(tilt.value));
  });
  tiltLabel.append(tiltText, tilt, tiltValue);

  const status = el("div", "occumed-mapbox-status"); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
  root.append(actions, exagRow, tiltLabel, status);
  panel.appendChild(root);

  let boundMap: mapboxgl.Map | null = null;
  const syncTilt = () => {
    if (!boundMap) return;
    const pitch = Math.round(boundMap.getPitch());
    tilt.value = String(pitch);
    tiltValue.textContent = `${pitch}°`;
  };

  function render(): void {
    const map = map2d();
    if (boundMap !== map) {
      boundMap?.off("pitchend", syncTilt);
      boundMap = map;
      boundMap?.on("pitchend", syncTilt);
    }
    toggle.textContent = enabled ? "Turn off terrain" : "Turn on terrain";
    toggle.classList.toggle("active", enabled);
    toggle.setAttribute("aria-pressed", String(enabled));
    for (const [value, button] of exagButtons) {
      button.classList.toggle("active", value === exaggeration);
      button.disabled = !enabled;
    }
    tilt.disabled = !map;
    syncTilt();
    status.textContent = !map
      ? "The 2D map is not ready yet."
      : enabled
        ? "Terrain is on for the 2D map. Use Tilt, or zoom in, to see relief."
        : "Shows real elevation (mountains, valleys) on the 2D map.";
  }
  views.add(render);
  render();
  return () => { boundMap?.off("pitchend", syncTilt); views.delete(render); root.remove(); };
}

function install(): void {
  if (!registerRuntimeOwner("terrain-3d", "Optional 3D terrain for the 2D Mapbox map")) return;
  registerMapboxMapInitializer({
    id: "terrain-3d",
    priority: 35,
    initialize: (map, context) => {
      if (context.mode !== "2d") return;
      const reapply = () => { if (enabled) safeApply(map); };
      map.on("style.load", reapply);
      return () => map.off("style.load", reapply);
    },
  });
  registerMapToolsSection({ id: "terrain-3d", priority: 170, mount: (panel) => mountSection(panel) });
}

install();
export {};

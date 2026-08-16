import mapboxgl from "mapbox-gl";
import type { Feature, FeatureCollection, Point, Polygon } from "geojson";
import type { ProviderFeature } from "./DatasetBrowser";
import { registerMapboxMapInitializer, getTrackedMapboxMaps } from "./mapboxMapLifecycleRuntime";
import { sourceColor } from "./phaseTwoLayerModel";

const SOURCE_ID = "phase-two-overlay";
const PIN_LAYER_ID = "phase-two-pins";
const DENSITY_LAYER_ID = "phase-two-density";
const GRID_FILL_LAYER_ID = "phase-two-grid-fill";
const GRID_LINE_LAYER_ID = "phase-two-grid-line";

type PhaseTwoMode = "pins" | "density" | "grid" | "none";
type DensityCell = { lat: number; lng: number; count: number };

type RuntimeState = {
  mode: PhaseTwoMode;
  collection: FeatureCollection;
};

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };
const state: RuntimeState = { mode: "none", collection: EMPTY };

function htmlEscape(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] || char));
}

function providerPopup(provider: ProviderFeature): string {
  const location = [provider.address, provider.city, provider.admin_area, provider.country].filter(Boolean).join(", ") || "Location unavailable";
  const source = provider.source || "Unknown source";
  const trust = provider.trust_tier || provider.source_kind || "unrated";
  const website = provider.website
    ? `<a href="${htmlEscape(provider.website)}" target="_blank" rel="noreferrer">Open website</a>`
    : "";
  return `<div class="p2-provider-popup"><strong>${htmlEscape(provider.name || "Provider")}</strong><span>${htmlEscape(location)}</span><span>${htmlEscape(source)} · ${htmlEscape(trust)}</span>${website}</div>`;
}

function ensureSource(map: mapboxgl.Map): mapboxgl.GeoJSONSource | null {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, { type: "geojson", data: state.collection, generateId: true });
  }
  return map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | null;
}

function setVisibility(map: mapboxgl.Map): void {
  const visibility = (mode: PhaseTwoMode) => state.mode === mode ? "visible" : "none";
  if (map.getLayer(PIN_LAYER_ID)) map.setLayoutProperty(PIN_LAYER_ID, "visibility", visibility("pins"));
  if (map.getLayer(DENSITY_LAYER_ID)) map.setLayoutProperty(DENSITY_LAYER_ID, "visibility", visibility("density"));
  if (map.getLayer(GRID_FILL_LAYER_ID)) map.setLayoutProperty(GRID_FILL_LAYER_ID, "visibility", visibility("grid"));
  if (map.getLayer(GRID_LINE_LAYER_ID)) map.setLayoutProperty(GRID_LINE_LAYER_ID, "visibility", visibility("grid"));
}

function ensureLayers(map: mapboxgl.Map): void {
  const source = ensureSource(map);
  if (!source) return;
  source.setData(state.collection);

  if (!map.getLayer(GRID_FILL_LAYER_ID)) {
    map.addLayer({
      id: GRID_FILL_LAYER_ID,
      type: "fill",
      source: SOURCE_ID,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": "#7c3aed",
        "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.25],
      },
    });
  }
  if (!map.getLayer(GRID_LINE_LAYER_ID)) {
    map.addLayer({
      id: GRID_LINE_LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "line-color": "#c4b5fd",
        "line-width": 0.6,
        "line-opacity": 0.55,
      },
    });
  }
  if (!map.getLayer(DENSITY_LAYER_ID)) {
    map.addLayer({
      id: DENSITY_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      filter: ["==", ["get", "kind"], "density"],
      paint: {
        "circle-radius": ["coalesce", ["get", "radius"], 8],
        "circle-color": "#8b5cf6",
        "circle-opacity": ["coalesce", ["get", "fillOpacity"], 0.25],
        "circle-stroke-width": 0,
      },
    });
  }
  if (!map.getLayer(PIN_LAYER_ID)) {
    map.addLayer({
      id: PIN_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      filter: ["==", ["get", "kind"], "provider"],
      paint: {
        "circle-radius": 4,
        "circle-color": ["coalesce", ["get", "color"], "#a78bfa"],
        "circle-opacity": 0.9,
        "circle-stroke-color": "#f8fbff",
        "circle-stroke-width": 1,
        "circle-stroke-opacity": 0.9,
      },
    });
  }
  setVisibility(map);
}

function updateAll(): void {
  for (const map of getTrackedMapboxMaps()) {
    const apply = () => ensureLayers(map);
    if (map.isStyleLoaded()) apply();
    else map.once("style.load", apply);
  }
}

function popupHit(map: mapboxgl.Map, event: mapboxgl.MapMouseEvent): void {
  if (state.mode === "none") return;
  const layers = [PIN_LAYER_ID, DENSITY_LAYER_ID, GRID_FILL_LAYER_ID].filter((id) => Boolean(map.getLayer(id)));
  if (!layers.length) return;
  const feature = map.queryRenderedFeatures(event.point, { layers })[0];
  if (!feature) return;
  const properties = feature.properties || {};
  const popupHtml = String(properties.popupHtml || "").trim();
  if (!popupHtml) return;
  const coordinates = feature.geometry.type === "Point"
    ? feature.geometry.coordinates as [number, number]
    : [event.lngLat.lng, event.lngLat.lat] as [number, number];
  new mapboxgl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "320px" })
    .setLngLat(coordinates)
    .setHTML(popupHtml)
    .addTo(map);
}

registerMapboxMapInitializer({
  id: "phase-two-native-overlay",
  priority: 18,
  initialize: (map) => {
    const apply = () => ensureLayers(map);
    const click = (event: mapboxgl.MapMouseEvent) => popupHit(map, event);
    if (map.isStyleLoaded()) apply();
    map.on("style.load", apply);
    map.on("click", click);
    return () => {
      map.off("style.load", apply);
      map.off("click", click);
    };
  },
});

export function clearPhaseTwoOverlay(): void {
  state.mode = "none";
  state.collection = EMPTY;
  updateAll();
}

export function renderPhaseTwoPins(rows: ProviderFeature[]): void {
  const features: Array<Feature<Point>> = rows
    .filter((provider): provider is ProviderFeature & { lat: number; lng: number } => Number.isFinite(provider.lat) && Number.isFinite(provider.lng))
    .map((provider) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [provider.lng, provider.lat] },
      properties: {
        kind: "provider",
        color: sourceColor(provider.source, provider.source_kind),
        popupHtml: providerPopup(provider),
      },
    }));
  state.mode = "pins";
  state.collection = { type: "FeatureCollection", features };
  updateAll();
}

export function renderPhaseTwoDensity(cells: DensityCell[]): void {
  const features: Array<Feature<Point>> = cells
    .filter((cell) => Number.isFinite(cell.lat) && Number.isFinite(cell.lng) && cell.count > 0)
    .map((cell) => {
      const radius = Math.max(5, Math.min(32, 4 + Math.log2(cell.count + 1) * 3));
      const fillOpacity = Math.max(0.12, Math.min(0.58, 0.13 + Math.log10(cell.count + 1) * 0.13));
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [cell.lng, cell.lat] },
        properties: {
          kind: "density",
          radius,
          fillOpacity,
          popupHtml: `<div class="p2-provider-popup"><strong>${cell.count.toLocaleString()} providers</strong></div>`,
        },
      };
    });
  state.mode = "density";
  state.collection = { type: "FeatureCollection", features };
  updateAll();
}

export function renderPhaseTwoGrid(cells: DensityCell[], precision: number): void {
  const safePrecision = Math.max(1, Math.min(10, Math.trunc(precision || 1)));
  const step = 10 ** -safePrecision;
  const half = step / 2;
  const maxCount = Math.max(1, ...cells.map((cell) => cell.count));
  const features: Array<Feature<Polygon>> = cells
    .filter((cell) => Number.isFinite(cell.lat) && Number.isFinite(cell.lng) && cell.count > 0)
    .map((cell) => {
      const ratio = Math.log1p(cell.count) / Math.log1p(maxCount);
      const west = cell.lng - half;
      const east = cell.lng + half;
      const south = cell.lat - half;
      const north = cell.lat + half;
      return {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
        },
        properties: {
          kind: "grid",
          fillOpacity: 0.08 + ratio * 0.46,
          popupHtml: `<div class="p2-provider-popup"><strong>${cell.count.toLocaleString()} providers in grid cell</strong></div>`,
        },
      };
    });
  state.mode = "grid";
  state.collection = { type: "FeatureCollection", features };
  updateAll();
}

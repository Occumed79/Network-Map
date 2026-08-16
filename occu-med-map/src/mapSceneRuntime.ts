import mapboxgl from "mapbox-gl";
import { getTrackedMapboxMaps, registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";
import { wasCompatibilityClickHandled } from "./mapboxCompatInteractionRuntime";

/*
 * MAPBOX SCENE RUNTIME
 * --------------------------
 * This internal scene runtime is backed entirely by Mapbox GL. It owns temporary
 * scene/layer helpers used while the remaining call sites are converted to direct
 * Mapbox sources, layers, markers, popups, and camera APIs. It never creates a
 * second renderer.
 */

let nextId = 1;
const allLayers = new globalThis.Map<number, MapScene.Layer>();
const logicalMaps = new Set<MapScene.Map>();
type SceneRootSubscriber = (map: MapScene.Map) => void;
const sceneRootSubscribers = new Set<SceneRootSubscriber>();

export function subscribeSceneRoots(subscriber: SceneRootSubscriber): () => void {
  sceneRootSubscribers.add(subscriber);
  for (const map of logicalMaps) queueMicrotask(() => subscriber(map));
  return () => sceneRootSubscribers.delete(subscriber);
}

function announceSceneRoot(map: MapScene.Map): void {
  for (const subscriber of sceneRootSubscribers) {
    try { subscriber(map); } catch (error) { console.error("Map scene root subscriber failed", error); }
  }
}
const boundLayerEvents = new WeakMap<mapboxgl.Map, Set<string>>();

function uid(prefix: string): string {
  return `occumed-${prefix}-${nextId++}`;
}

function htmlEscape(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nativeMode(map: mapboxgl.Map): "2d" | "3d" {
  return map.getContainer().closest(".mapbox-globe-host") ? "3d" : "2d";
}

function activeNativeMap(): mapboxgl.Map | null {
  const maps = getTrackedMapboxMaps();
  if (!maps.length) return null;
  const requested = window.__NETWORK_MAP_GLOBE__?.getMode?.();
  const match = maps.find((map) => nativeMode(map) === requested);
  return match || maps[0] || null;
}

function eachNativeMap(callback: (map: mapboxgl.Map) => void): void {
  for (const map of getTrackedMapboxMaps()) callback(map);
}

function normalizeLatLng(value: MapScene.LatLngExpression): MapScene.LatLng {
  if (value instanceof MapScene.LatLng) return value;
  if (Array.isArray(value)) return new MapScene.LatLng(Number(value[0]), Number(value[1]));
  return new MapScene.LatLng(Number((value as any).lat), Number((value as any).lng ?? (value as any).lon));
}

function flattenCoordinates(value: unknown, output: Array<[number, number]>): void {
  if (!Array.isArray(value)) return;
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
    output.push([Number(value[0]), Number(value[1])]);
    return;
  }
  for (const child of value) flattenCoordinates(child, output);
}

function boundsFromGeoJSON(geojson: GeoJSON.GeoJSON): MapScene.LatLngBounds {
  const points: Array<[number, number]> = [];
  if ((geojson as any).coordinates) flattenCoordinates((geojson as any).coordinates, points);
  if (geojson.type === "Feature") flattenCoordinates((geojson.geometry as any)?.coordinates, points);
  if (geojson.type === "FeatureCollection") {
    for (const feature of geojson.features) flattenCoordinates((feature.geometry as any)?.coordinates, points);
  }
  if (!points.length) return new MapScene.LatLngBounds([-85, -180], [85, 180]);
  let south = 90, north = -90, west = 180, east = -180;
  for (const [lng, lat] of points) {
    south = Math.min(south, lat); north = Math.max(north, lat);
    west = Math.min(west, lng); east = Math.max(east, lng);
  }
  return new MapScene.LatLngBounds([south, west], [north, east]);
}

function geodesicCircle(lat: number, lng: number, radiusMeters: number): GeoJSON.Polygon {
  const earthRadius = 6_378_137;
  const angular = Math.max(1, radiusMeters) / earthRadius;
  const phi1 = lat * Math.PI / 180;
  const lambda1 = lng * Math.PI / 180;
  const coordinates: number[][] = [];
  for (let i = 0; i <= 72; i += 1) {
    const bearing = i / 72 * Math.PI * 2;
    const phi2 = Math.asin(
      Math.sin(phi1) * Math.cos(angular)
      + Math.cos(phi1) * Math.sin(angular) * Math.cos(bearing),
    );
    const lambda2 = lambda1 + Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(phi1),
      Math.cos(angular) - Math.sin(phi1) * Math.sin(phi2),
    );
    coordinates.push([lambda2 * 180 / Math.PI, phi2 * 180 / Math.PI]);
  }
  return { type: "Polygon", coordinates: [coordinates] };
}

function styleProperties(options: Record<string, any> = {}): Record<string, unknown> {
  return {
    __compatKind: options.__compatKind || "shape",
    __fillColor: String(options.fillColor || options.color || "#0e7490"),
    __fillOpacity: Number.isFinite(Number(options.fillOpacity)) ? Number(options.fillOpacity) : 0.32,
    __lineColor: String(options.color || options.fillColor || "#ffffff"),
    __lineOpacity: Number.isFinite(Number(options.opacity)) ? Number(options.opacity) : 0.95,
    __lineWidth: Math.max(0, Number(options.weight ?? 1)),
    __pointRadius: Math.max(1, Number(options.radius ?? 4)),
    __interactive: options.interactive !== false,
  };
}

function layerFeature(layer: MapScene.Layer): GeoJSON.Feature | null {
  return layer.toGeoJSON?.() as GeoJSON.Feature | null;
}

function sourceIds(layer: MapScene.Layer) {
  const root = layer.renderRoot();
  const stem = `map-scene-${root._scene_id}`;
  return {
    source: `${stem}-source`,
    fill: `${stem}-fills`,
    line: `${stem}-lines`,
    point: `${stem}-points`,
  };
}

function safeRemoveMapboxLayer(map: mapboxgl.Map, id: string): void {
  try { if (map.getLayer(id)) map.removeLayer(id); } catch {}
}
function safeRemoveMapboxSource(map: mapboxgl.Map, id: string): void {
  try { if (map.getSource(id)) map.removeSource(id); } catch {}
}

function featureCollectionForRoot(root: MapScene.Layer): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const add = (layer: MapScene.Layer) => {
    if (layer instanceof MapScene.LayerGroup) {
      layer.eachLayer((child) => add(child));
      return;
    }
    if (layer instanceof MapScene.Marker && !(layer instanceof MapScene.CircleMarker)) return;
    const feature = layerFeature(layer);
    if (!feature) return;
    const style = styleProperties((layer as any).options || {});
    feature.properties = {
      ...(feature.properties || {}),
      ...style,
      __compatLayerId: layer._scene_id,
      __popupHtml: layer.getPopup?.()?.getContent?.() || "",
      __tooltipHtml: layer.getTooltip?.()?.getContent?.() || "",
    };
    features.push(feature);
  };
  add(root);
  return { type: "FeatureCollection", features };
}

function bindSourceInteractions(map: mapboxgl.Map, root: MapScene.Layer): void {
  const ids = sourceIds(root);
  let set = boundLayerEvents.get(map);
  if (!set) { set = new Set(); boundLayerEvents.set(map, set); }
  for (const layerId of [ids.point, ids.fill, ids.line]) {
    if (set.has(layerId)) continue;
    set.add(layerId);
    const click = (event: any) => {
      const feature = event.features?.[0];
      const id = Number(feature?.properties?.__compatLayerId || 0);
      const layer = allLayers.get(id);
      if (!layer || (layer as any).options?.interactive === false) return;
      layer.fire("click", {
        latlng: new MapScene.LatLng(event.lngLat.lat, event.lngLat.lng),
        originalEvent: event.originalEvent,
        target: layer,
      });
      const popup = layer.getPopup?.();
      if (popup?.getContent?.() && !wasCompatibilityClickHandled(event.originalEvent)) {
        popup.setLatLng?.(event.lngLat);
        popup.openOnNative(map, event.lngLat, layer);
      }
    };
    const enter = (event: any) => {
      map.getCanvas().style.cursor = "pointer";
      const feature = event.features?.[0];
      const id = Number(feature?.properties?.__compatLayerId || 0);
      const layer = allLayers.get(id);
      if (!layer || (layer as any).options?.interactive === false) return;
      const latlng = new MapScene.LatLng(event.lngLat.lat, event.lngLat.lng);
      layer.fire("mouseover", { latlng, originalEvent: event.originalEvent, target: layer });
      layer.fire("mouseenter", { latlng, originalEvent: event.originalEvent, target: layer });
      const tooltip = layer.getTooltip?.();
      if (tooltip?.getContent?.()) tooltip.openOnNative(map, event.lngLat, layer);
    };
    const leave = (event: any) => {
      map.getCanvas().style.cursor = "";
      const feature = event.features?.[0];
      const id = Number(feature?.properties?.__compatLayerId || 0);
      const layer = allLayers.get(id);
      if (layer) {
        const latlng = event.lngLat ? new MapScene.LatLng(event.lngLat.lat, event.lngLat.lng) : layer.defaultLatLng();
        layer.fire("mouseout", { latlng, originalEvent: event.originalEvent, target: layer });
        layer.fire("mouseleave", { latlng, originalEvent: event.originalEvent, target: layer });
        layer.getTooltip?.()?.close();
      }
    };
    try {
      map.on("click", layerId, click);
      map.on("mouseenter", layerId, enter);
      map.on("mouseleave", layerId, leave);
    } catch {}
  }
}

function renderVectorRoot(root: MapScene.Layer, native: mapboxgl.Map, preparedCollection?: GeoJSON.FeatureCollection): void {
  if (!native.isStyleLoaded()) return;
  const ids = sourceIds(root);
  const collection = preparedCollection || featureCollectionForRoot(root);
  const existing = native.getSource(ids.source) as mapboxgl.GeoJSONSource | undefined;
  if (existing) {
    existing.setData(collection);
  } else {
    native.addSource(ids.source, { type: "geojson", data: collection, generateId: true });
  }

  if (!native.getLayer(ids.fill)) {
    native.addLayer({
      id: ids.fill,
      type: "fill",
      source: ids.source,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": ["coalesce", ["get", "__fillColor"], "#0e7490"],
        "fill-opacity": ["coalesce", ["to-number", ["get", "__fillOpacity"]], 0.28],
      },
    });
  }
  if (!native.getLayer(ids.line)) {
    native.addLayer({
      id: ids.line,
      type: "line",
      source: ids.source,
      filter: ["match", ["geometry-type"], ["LineString", "Polygon"], true, false],
      paint: {
        "line-color": ["coalesce", ["get", "__lineColor"], "#ffffff"],
        "line-opacity": ["coalesce", ["to-number", ["get", "__lineOpacity"]], 0.95],
        "line-width": ["coalesce", ["to-number", ["get", "__lineWidth"]], 1],
      },
    });
  }
  if (!native.getLayer(ids.point)) {
    native.addLayer({
      id: ids.point,
      type: "circle",
      source: ids.source,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-radius": ["coalesce", ["to-number", ["get", "__pointRadius"]], 4],
        "circle-color": ["coalesce", ["get", "__fillColor"], "#0e7490"],
        "circle-opacity": ["coalesce", ["to-number", ["get", "__fillOpacity"]], 0.92],
        "circle-stroke-color": ["coalesce", ["get", "__lineColor"], "#ffffff"],
        "circle-stroke-opacity": ["coalesce", ["to-number", ["get", "__lineOpacity"]], 0.95],
        "circle-stroke-width": ["coalesce", ["to-number", ["get", "__lineWidth"]], 1],
      },
    });
  }
  bindSourceInteractions(native, root);
}

function cleanupVectorRoot(root: MapScene.Layer, native: mapboxgl.Map): void {
  const ids = sourceIds(root);
  safeRemoveMapboxLayer(native, ids.point);
  safeRemoveMapboxLayer(native, ids.line);
  safeRemoveMapboxLayer(native, ids.fill);
  safeRemoveMapboxSource(native, ids.source);
}

const pendingVectorRefreshRoots = new Set<MapScene.Layer>();
let vectorRefreshScheduled = false;

function flushVectorRefreshes(): void {
  vectorRefreshScheduled = false;
  const roots = [...pendingVectorRefreshRoots];
  pendingVectorRefreshRoots.clear();

  for (const root of roots) {
    const attached = root._map;
    if (!attached || !attached.hasLayer(root)) continue;

    // Build the feature collection once per logical root, not once per native map.
    // A 1,000-provider layer can add/clear hundreds of children synchronously; the
    // queue below collapses that burst into one GeoJSON setData per 2D/3D map.
    const collection = featureCollectionForRoot(root);
    eachNativeMap((native) => {
      try { renderVectorRoot(root, native, collection); } catch (error) { console.warn("Mapbox compatibility layer refresh failed", error); }
    });
  }
}

function refreshRoot(root: MapScene.Layer): void {
  pendingVectorRefreshRoots.add(root);
  if (vectorRefreshScheduled) return;
  vectorRefreshScheduled = true;
  queueMicrotask(flushVectorRefreshes);
}

function renderLogicalMap(native: mapboxgl.Map): void {
  for (const logical of logicalMaps) {
    logical.eachTopLayer((layer) => {
      try { layer.renderNative(native); } catch (error) { console.warn("Mapbox compatibility layer render failed", error); }
    });
  }
}

registerMapboxMapInitializer({
  id: "mapbox-native-scene",
  priority: 5,
  initialize: (native) => {
    const sync = () => renderLogicalMap(native);
    const canvas = native.getCanvas();
    const onWebglRestored = () => sync();
    native.on("style.load", sync);
    canvas.addEventListener("webglcontextrestored", onWebglRestored);
    if (native.isStyleLoaded()) queueMicrotask(sync);
    return () => {
      native.off("style.load", sync);
      canvas.removeEventListener("webglcontextrestored", onWebglRestored);
    };
  },
});

namespace MapScene {
  export type LatLngTuple = [number, number];
  export type PointTuple = [number, number];
  export type LatLngExpression = LatLng | LatLngTuple | { lat: number; lng: number } | { lat: number; lon: number };
  export type Content = string | HTMLElement | (() => string | HTMLElement);
  export type MapOptions = Record<string, any>;
  export type GridLayerOptions = Record<string, any>;
  export type TileLayerOptions = Record<string, any>;
  export type PathOptions = Record<string, any>;
  export type CircleMarkerOptions = PathOptions & { radius?: number };
  export type MarkerOptions = Record<string, any>;
  export type PolylineOptions = PathOptions;
  export type GeoJSONOptions = Record<string, any>;
  export type MapPointerEvent = any;
  export type MapEvent = any;
  export type MapEventHandlerFn = (event: any) => void;

  export class Point {
    constructor(public x: number, public y: number) {}
  }

  export class LatLng {
    constructor(public lat: number, public lng: number) {}
    distanceTo(other: LatLngExpression): number {
      const b = normalizeLatLng(other);
      const R = 6_371_000;
      const p1 = this.lat * Math.PI / 180, p2 = b.lat * Math.PI / 180;
      const dp = (b.lat - this.lat) * Math.PI / 180;
      const dl = (b.lng - this.lng) * Math.PI / 180;
      const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    }
    equals(other: LatLngExpression): boolean {
      const b = normalizeLatLng(other);
      return Math.abs(this.lat - b.lat) < 1e-9 && Math.abs(this.lng - b.lng) < 1e-9;
    }
  }

  export class LatLngBounds {
    private south: number;
    private west: number;
    private north: number;
    private east: number;
    constructor(a: LatLngExpression | LatLngExpression[], b?: LatLngExpression) {
      let values: LatLngExpression[];
      if (b) {
        values = [a as LatLngExpression, b];
      } else if (
        Array.isArray(a)
        && a.length === 2
        && typeof a[0] === "number"
        && typeof a[1] === "number"
      ) {
        values = [a as LatLngTuple];
      } else if (Array.isArray(a)) {
        values = a as LatLngExpression[];
      } else {
        values = [a as LatLngExpression];
      }
      const points = values.map(normalizeLatLng).filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
      if (!points.length) {
        this.south = -85;
        this.north = 85;
        this.west = -180;
        this.east = 180;
        return;
      }
      this.south = Math.min(...points.map((p) => p.lat));
      this.north = Math.max(...points.map((p) => p.lat));
      this.west = Math.min(...points.map((p) => p.lng));
      this.east = Math.max(...points.map((p) => p.lng));
    }
    extend(value: LatLngExpression | LatLngBounds): this {
      if (value instanceof LatLngBounds) {
        this.south = Math.min(this.south, value.south); this.north = Math.max(this.north, value.north);
        this.west = Math.min(this.west, value.west); this.east = Math.max(this.east, value.east);
      } else {
        const p = normalizeLatLng(value);
        this.south = Math.min(this.south, p.lat); this.north = Math.max(this.north, p.lat);
        this.west = Math.min(this.west, p.lng); this.east = Math.max(this.east, p.lng);
      }
      return this;
    }
    contains(value: LatLngExpression): boolean {
      const p = normalizeLatLng(value);
      const lngOk = this.west <= this.east ? p.lng >= this.west && p.lng <= this.east : p.lng >= this.west || p.lng <= this.east;
      return p.lat >= this.south && p.lat <= this.north && lngOk;
    }
    pad(ratio: number): LatLngBounds {
      const latPad = (this.north - this.south) * ratio;
      const lngPad = (this.east - this.west) * ratio;
      return new LatLngBounds([this.south - latPad, this.west - lngPad], [this.north + latPad, this.east + lngPad]);
    }
    getSouth(): number { return this.south; }
    getNorth(): number { return this.north; }
    getWest(): number { return this.west; }
    getEast(): number { return this.east; }
    getSouthWest(): LatLng { return new LatLng(this.south, this.west); }
    getNorthEast(): LatLng { return new LatLng(this.north, this.east); }
    getCenter(): LatLng { return new LatLng((this.south + this.north) / 2, (this.west + this.east) / 2); }
    isValid(): boolean { return [this.south, this.west, this.north, this.east].every(Number.isFinite); }
  }

  class Evented {
    private handlers = new globalThis.Map<string, Set<MapEventHandlerFn>>();
    on(types: string | Record<string, MapEventHandlerFn>, fn?: MapEventHandlerFn): this {
      if (typeof types === "object") {
        for (const [type, handler] of Object.entries(types)) this.on(type, handler);
        return this;
      }
      if (!fn) return this;
      for (const type of types.split(/\s+/).filter(Boolean)) {
        let set = this.handlers.get(type); if (!set) { set = new Set(); this.handlers.set(type, set); }
        set.add(fn);
      }
      return this;
    }
    off(types?: string | Record<string, MapEventHandlerFn>, fn?: MapEventHandlerFn): this {
      if (!types) { this.handlers.clear(); return this; }
      if (typeof types === "object") {
        for (const [type, handler] of Object.entries(types)) this.off(type, handler);
        return this;
      }
      for (const type of types.split(/\s+/).filter(Boolean)) {
        if (!fn) this.handlers.delete(type); else this.handlers.get(type)?.delete(fn);
      }
      return this;
    }
    once(types: string, fn: MapEventHandlerFn): this {
      const wrapped = (event: any) => { this.off(types, wrapped); fn(event); };
      return this.on(types, wrapped);
    }
    fire(type: string, data: Record<string, any> = {}): this {
      const event = { type, target: this, ...data };
      for (const fn of [...(this.handlers.get(type) || [])]) {
        try { fn(event); } catch (error) { console.error("Map compatibility event handler failed", error); }
      }
      return this;
    }
  }

  export class Popup {
    private content: Content = "";
    private latlng: LatLng | null = null;
    private native: mapboxgl.Popup | null = null;
    constructor(public options: Record<string, any> = {}, private source?: Layer) {}
    setContent(content: Content): this { this.content = content; return this; }
    getContent(): any { return typeof this.content === "function" ? this.content() : this.content; }
    setLatLng(value: LatLngExpression | mapboxgl.LngLat): this { this.latlng = normalizeLatLng(value as any); return this; }
    getLatLng(): LatLng | null { return this.latlng; }
    getElement(): HTMLElement | null { return this.native?.getElement() || null; }
    addTo(map: Map): this { map.openPopup(this); return this; }
    openOn(map: Map): this { map.openPopup(this); return this; }
    openOnNative(native: mapboxgl.Map, at: LatLngExpression | mapboxgl.LngLat, layer?: Layer): this {
      this.close();
      const ll = normalizeLatLng(at as any);
      const popup = new mapboxgl.Popup({ closeButton: this.options.closeButton !== false, closeOnClick: this.options.closeOnClick !== false, maxWidth: this.options.maxWidth || "380px" })
        .setLngLat([ll.lng, ll.lat]);
      const content = this.getContent();
      if (content instanceof HTMLElement) popup.setDOMContent(content); else popup.setHTML(String(content || ""));
      popup.addTo(native);
      this.native = popup;
      (layer || this.source)?.fire("popupopen", { popup: this });
      popup.on("close", () => (layer || this.source)?.fire("popupclose", { popup: this }));
      return this;
    }
    close(): this { try { this.native?.remove(); } catch {} this.native = null; return this; }
    remove(): this { return this.close(); }
  }

  export class Tooltip extends Popup {
    openOnNative(native: mapboxgl.Map, at: LatLngExpression | mapboxgl.LngLat, layer?: Layer): this {
      this.close();
      const ll = normalizeLatLng(at as any);
      const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, closeOnMove: false, offset: 8, maxWidth: "280px", className: "map-scene-tooltip" })
        .setLngLat([ll.lng, ll.lat]);
      const content = this.getContent();
      if (content instanceof HTMLElement) popup.setDOMContent(content); else popup.setHTML(String(content || ""));
      popup.addTo(native);
      (this as any).native = popup;
      layer?.fire("tooltipopen", { tooltip: this });
      return this;
    }
  }

  export class Layer extends Evented {
    readonly _scene_id = nextId++;
    _map: Map | null = null;
    _parent: LayerGroup | null = null;
    options: Record<string, any>;
    private popupValue: Popup | null = null;
    private tooltipValue: Tooltip | null = null;
    constructor(options: Record<string, any> = {}) { super(); this.options = options; allLayers.set(this._scene_id, this); }
    addTo(target: Map | LayerGroup): this { target.addLayer(this); return this; }
    remove(): this { this._map?.removeLayer(this); return this; }
    bindPopup(content: Content, options: Record<string, any> = {}): this { this.popupValue = new Popup(options, this).setContent(content); this.touch(); return this; }
    unbindPopup(): this { this.popupValue?.close(); this.popupValue = null; this.touch(); return this; }
    getPopup(): Popup | null { return this.popupValue; }
    openPopup(latlng?: LatLngExpression): this {
      const native = activeNativeMap();
      if (native && this.popupValue) this.popupValue.openOnNative(native, latlng || this.defaultLatLng(), this);
      return this;
    }
    closePopup(): this { this.popupValue?.close(); return this; }
    bindTooltip(content: Content, options: Record<string, any> = {}): this { this.tooltipValue = new Tooltip(options, this).setContent(content); this.touch(); return this; }
    unbindTooltip(): this { this.tooltipValue?.close(); this.tooltipValue = null; this.touch(); return this; }
    getTooltip(): Tooltip | null { return this.tooltipValue; }
    openTooltip(latlng?: LatLngExpression): this { const native = activeNativeMap(); if (native && this.tooltipValue) this.tooltipValue.openOnNative(native, latlng || this.defaultLatLng(), this); return this; }
    closeTooltip(): this { this.tooltipValue?.close(); return this; }
    setStyle(style: Record<string, any>): this { Object.assign(this.options, style); this.touch(); return this; }
    bringToFront(): this { return this; }
    redraw(): this { this.touch(); return this; }
    renderRoot(): Layer { return this._parent ? this._parent.renderRoot() : this; }
    renderNative(native: mapboxgl.Map): void { renderVectorRoot(this.renderRoot(), native); }
    cleanupNative(native: mapboxgl.Map): void { cleanupVectorRoot(this.renderRoot(), native); }
    toGeoJSON(): GeoJSON.Feature | null { return null; }
    defaultLatLng(): LatLng { return this._map?.getCenter() || new LatLng(0, 0); }
    touch(): void { refreshRoot(this.renderRoot()); }
    _attach(map: Map): void { this._map = map; }
    _detach(): void { this.getPopup()?.close(); this.getTooltip()?.close(); this._map = null; }
  }

  export class LayerGroup extends Layer {
    protected layers = new Set<Layer>();
    constructor(initial: Layer[] = []) { super(); initial.forEach((layer) => this.addLayer(layer)); }
    addLayer(layer: Layer): this {
      this.layers.add(layer); layer._parent = this; if (this._map) layer._attach(this._map); this.touch(); return this;
    }
    removeLayer(layer: Layer | number): this {
      const target = typeof layer === "number" ? [...this.layers].find((item) => item._scene_id === layer) : layer;
      if (target) { this.layers.delete(target); target._parent = null; target._detach(); this.touch(); }
      return this;
    }
    clearLayers(): this { for (const layer of this.layers) { layer._parent = null; layer._detach(); } this.layers.clear(); this.touch(); return this; }
    eachLayer(fn: (layer: Layer) => void): this { for (const layer of this.layers) fn(layer); return this; }
    getLayers(): Layer[] { return [...this.layers]; }
    hasLayer(layer: Layer): boolean { return this.layers.has(layer); }
    getBounds(): LatLngBounds {
      let result: LatLngBounds | null = null;
      this.eachLayer((layer: any) => {
        const bounds = typeof layer.getBounds === "function" ? layer.getBounds() : typeof layer.getLatLng === "function" ? new LatLngBounds(layer.getLatLng()) : null;
        if (bounds) result = result ? result.extend(bounds) : new LatLngBounds(bounds.getSouthWest(), bounds.getNorthEast());
      });
      return result || new LatLngBounds([-85, -180], [85, 180]);
    }
    override _attach(map: Map): void { super._attach(map); for (const layer of this.layers) layer._attach(map); }
    override _detach(): void { for (const layer of this.layers) layer._detach(); super._detach(); }
    override renderNative(native: mapboxgl.Map): void {
      renderVectorRoot(this, native);
      for (const layer of this.layers) if (layer instanceof Marker && !(layer instanceof CircleMarker)) layer.renderNative(native);
    }
    override cleanupNative(native: mapboxgl.Map): void {
      cleanupVectorRoot(this, native);
      for (const layer of this.layers) layer.cleanupNative(native);
    }
  }

  export class FeatureGroup extends LayerGroup {}

  export class Marker extends Layer {
    protected latlng: LatLng;
    protected nativeMarkers = new globalThis.Map<mapboxgl.Map, mapboxgl.Marker>();
    constructor(value: LatLngExpression, options: MarkerOptions = {}) { super(options); this.latlng = normalizeLatLng(value); }
    getLatLng(): LatLng { return this.latlng; }
    setLatLng(value: LatLngExpression): this { this.latlng = normalizeLatLng(value); this.renderMarkers(); this.touch(); return this; }
    setZIndexOffset(offset: number): this { this.options.zIndexOffset = offset; this.renderMarkers(); return this; }
    override defaultLatLng(): LatLng { return this.latlng; }
    override renderNative(native: mapboxgl.Map): void {
      if (this instanceof CircleMarker) { super.renderNative(native); return; }
      let marker = this.nativeMarkers.get(native);
      if (!marker) {
        const element = document.createElement("div");
        element.className = this.options.icon?.options?.className || "mapbox-native-compat-marker";
        const html = this.options.icon?.options?.html;
        if (html) element.innerHTML = String(html);
        else element.innerHTML = '<div style="width:12px;height:12px;border-radius:50%;background:#0e7490;border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,.4)"></div>';
        if (this.options.zIndexOffset) element.style.zIndex = String(this.options.zIndexOffset);
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          this.fire("click", { latlng: this.latlng, originalEvent: event });
          this.openPopup();
        });
        const tooltip = this.getTooltip()?.getContent?.();
        if (tooltip) element.title = String(tooltip).replace(/<[^>]+>/g, " ");
        marker = new mapboxgl.Marker({ element }).setLngLat([this.latlng.lng, this.latlng.lat]).addTo(native);
        this.nativeMarkers.set(native, marker);
      } else marker.setLngLat([this.latlng.lng, this.latlng.lat]);
    }
    override cleanupNative(native: mapboxgl.Map): void { const marker = this.nativeMarkers.get(native); try { marker?.remove(); } catch {} this.nativeMarkers.delete(native); }
    private renderMarkers(): void { eachNativeMap((native) => this.renderNative(native)); }
    override toGeoJSON(): GeoJSON.Feature { return { type: "Feature", geometry: { type: "Point", coordinates: [this.latlng.lng, this.latlng.lat] }, properties: {} }; }
  }

  export class CircleMarker extends Marker {
    constructor(value: LatLngExpression, options: CircleMarkerOptions = {}) { super(value, options); this.options.__compatKind = "circleMarker"; }
    setRadius(radius: number): this { this.options.radius = radius; this.touch(); return this; }
    getRadius(): number { return Number(this.options.radius || 4); }
  }

  export class Circle extends CircleMarker {
    private radiusMeters: number;
    constructor(value: LatLngExpression, options: Record<string, any> = {}) {
      super(value, options); this.radiusMeters = Number(options.radius || 0); this.options.__compatKind = "circle";
    }
    override setRadius(radius: number): this { this.radiusMeters = radius; this.options.radius = radius; this.touch(); return this; }
    override getRadius(): number { return this.radiusMeters; }
    override toGeoJSON(): GeoJSON.Feature<GeoJSON.Polygon> { return { type: "Feature", geometry: geodesicCircle(this.latlng.lat, this.latlng.lng, this.radiusMeters), properties: {} }; }
  }

  export class Polyline extends Layer {
    protected latlngs: LatLng[];
    constructor(values: LatLngExpression[] | LatLngExpression[][], options: PolylineOptions = {}) {
      super(options); this.latlngs = (values as any[]).flat(Infinity).length && Array.isArray((values as any)[0]) && typeof (values as any)[0][0] !== "number"
        ? (values as any[]).flat().map(normalizeLatLng)
        : (values as any[]).map(normalizeLatLng);
      this.options.__compatKind = "polyline";
    }
    getLatLngs(): any { return this.latlngs; }
    setLatLngs(values: LatLngExpression[]): this { this.latlngs = values.map(normalizeLatLng); this.touch(); return this; }
    addLatLng(value: LatLngExpression): this { this.latlngs.push(normalizeLatLng(value)); this.touch(); return this; }
    getBounds(): LatLngBounds { return new LatLngBounds(this.latlngs as any); }
    override defaultLatLng(): LatLng { return this.latlngs[0] || super.defaultLatLng(); }
    override toGeoJSON(): GeoJSON.Feature { return { type: "Feature", geometry: { type: "LineString", coordinates: this.latlngs.map((p) => [p.lng, p.lat]) }, properties: {} }; }
  }

  export class Polygon extends Polyline {
    constructor(values: any, options: PathOptions = {}) { super(values, options); this.options.__compatKind = "polygon"; }
    override toGeoJSON(): GeoJSON.Feature<GeoJSON.Polygon> {
      const ring = this.latlngs.map((p) => [p.lng, p.lat]);
      if (ring.length && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) ring.push([...ring[0]]);
      return { type: "Feature", geometry: { type: "Polygon", coordinates: [ring] }, properties: {} };
    }
  }

  class GeoJSONFeatureLayer extends Layer {
    constructor(private feature: GeoJSON.Feature, private styleFn?: any) {
      super();
      const style = typeof styleFn === "function" ? styleFn(feature) : styleFn;
      if (style) Object.assign(this.options, style);
    }
    override toGeoJSON(): GeoJSON.Feature { return { ...this.feature, properties: { ...(this.feature.properties || {}) } }; }
    getBounds(): LatLngBounds { return boundsFromGeoJSON(this.feature); }
    override defaultLatLng(): LatLng { return this.getBounds().getCenter(); }
  }

  export class GeoJSON<P = any> extends LayerGroup {
    private raw: GeoJSON.GeoJSON | null = null;
    private geoOptions: GeoJSONOptions;
    constructor(data?: GeoJSON.GeoJSON | null, options: GeoJSONOptions = {}) { super(); this.geoOptions = options; if (data) this.addData(data); }
    addData(data: GeoJSON.GeoJSON): this {
      this.raw = data;
      const features: GeoJSON.Feature[] = data.type === "FeatureCollection" ? data.features : data.type === "Feature" ? [data] : [{ type: "Feature", geometry: data as GeoJSON.Geometry, properties: {} }];
      for (const feature of features) {
        let layer: Layer;
        if (feature.geometry?.type === "Point" && typeof this.geoOptions.pointToLayer === "function") {
          const c = feature.geometry.coordinates as [number, number];
          layer = this.geoOptions.pointToLayer(feature, new LatLng(c[1], c[0]));
        } else layer = new GeoJSONFeatureLayer(feature, this.geoOptions.style);
        this.addLayer(layer);
        if (typeof this.geoOptions.onEachFeature === "function") this.geoOptions.onEachFeature(feature, layer);
      }
      return this;
    }
    resetStyle(layer?: Layer): this { if (layer && this.geoOptions.style) layer.setStyle(typeof this.geoOptions.style === "function" ? this.geoOptions.style(layer.toGeoJSON()) : this.geoOptions.style); else this.touch(); return this; }
    override setStyle(style: any): this { this.geoOptions.style = style; this.eachLayer((layer) => layer.setStyle(typeof style === "function" ? style(layer.toGeoJSON()) : style)); return this; }
    override toGeoJSON(): any { return this.raw || { type: "FeatureCollection", features: [] }; }
  }

  export class GridLayer extends Layer {
    static defaultOptions: GridLayerOptions = {};
    static mergeOptions(options: GridLayerOptions): void { Object.assign(GridLayer.defaultOptions, options); }
    constructor(options: GridLayerOptions = {}) { super({ ...GridLayer.defaultOptions, ...options }); }
  }
  export class TileLayer extends GridLayer {
    constructor(public url: string, options: TileLayerOptions = {}) { super(options); }
    setUrl(url: string): this {
      this.url = url;
      const styleMatch = url.match(/styles\/v1\/mapbox\/([^/]+)\/tiles/i);
      if (styleMatch?.[1]) eachNativeMap((native) => { try { native.setStyle(`mapbox://styles/mapbox/${styleMatch[1]}`); } catch {} });
      return this;
    }
  }
  export class ImageOverlay extends Layer {}

  export class Control {
    onAdd?: (map: Map) => HTMLElement;
    onRemove?: (map: Map) => void;
    private container: HTMLElement | null = null;
    private map: Map | null = null;
    constructor(public options: Record<string, any> = {}) {}
    addTo(map: Map): this {
      this.map = map;
      const content = this.onAdd?.(map);
      if (content) {
        const position = String(this.options.position || "topright").toLowerCase();
        const host = map.getContainer().parentElement || map.getContainer();
        host.style.position ||= "relative";
        const cornerClass = `mapbox-native-control-corner-${position}`;
        let corner = host.querySelector<HTMLElement>(`.${cornerClass}`);
        if (!corner) {
          corner = document.createElement("div");
          corner.className = `mapbox-native-control-corner ${cornerClass}`;
          Object.assign(corner.style, {
            position: "absolute",
            zIndex: "1200",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            pointerEvents: "none",
          });
          const top = position.startsWith("top");
          const left = position.endsWith("left");
          if (top) corner.style.top = "12px"; else corner.style.bottom = "12px";
          if (left) corner.style.left = "52px"; else corner.style.right = top ? "228px" : "12px";
          host.appendChild(corner);
        }
        const wrapper = document.createElement("div");
        wrapper.className = `map-scene-control map-scene-${position}`;
        wrapper.style.pointerEvents = "auto";
        wrapper.appendChild(content);
        corner.appendChild(wrapper);
        this.container = wrapper;
      }
      return this;
    }
    remove(): this { if (this.map) this.onRemove?.(this.map); this.container?.remove(); this.container = null; this.map = null; return this; }
    getContainer(): HTMLElement | null { return this.container; }
  }

  export class DivIcon { constructor(public options: Record<string, any> = {}) {} }
  export class Icon extends DivIcon {}

  export class Map extends Evented {
    static defaultOptions: MapOptions = {};
    static mergeOptions(options: MapOptions): void { Object.assign(Map.defaultOptions, options); }
    private container: HTMLElement;
    private center: LatLng;
    private zoom: number;
    private layers = new Set<Layer>();
    private removed = false;
    private nativeEventDisposers: Array<() => void> = [];
    dragging = { enable() {}, disable() {}, enabled: () => true };
    scrollWheelZoom = { enable() {}, disable() {}, enabled: () => true };
    doubleClickZoom = { enable() {}, disable() {}, enabled: () => true };
    boxZoom = { enable() {}, disable() {}, enabled: () => true };
    keyboard = { enable() {}, disable() {}, enabled: () => true };
    touchZoom = { enable() {}, disable() {}, enabled: () => true };
    tap = { enable() {}, disable() {}, enabled: () => true };
    constructor(element: string | HTMLElement, options: MapOptions = {}) {
      super();
      const resolvedOptions = { ...Map.defaultOptions, ...options };
      const container = typeof element === "string" ? document.getElementById(element) : element;
      if (!container) throw new Error("Map container not found");
      this.container = container;
      this.center = normalizeLatLng(resolvedOptions.center || [20, 0]);
      this.zoom = Number(resolvedOptions.zoom ?? resolvedOptions.minZoom ?? 2);
      logicalMaps.add(this);
      queueMicrotask(() => announceSceneRoot(this));

      const onSceneClick = (rawEvent: Event) => {
        const detail = (rawEvent as CustomEvent<{ lat:number; lng:number; originalEvent?: Event }>).detail;
        if (!detail) return;
        this.fire("click", { latlng: new LatLng(detail.lat, detail.lng), originalEvent: detail.originalEvent });
      };
      const onSceneDoubleClick = (rawEvent: Event) => {
        const detail = (rawEvent as CustomEvent<{ lat:number; lng:number; originalEvent?: Event }>).detail;
        if (!detail) return;
        this.fire("dblclick", { latlng: new LatLng(detail.lat, detail.lng), originalEvent: detail.originalEvent });
      };
      const onNativeCamera = (rawEvent: Event) => {
        const detail = (rawEvent as CustomEvent<{ lat:number; lng:number; zoom:number }>).detail;
        if (!detail) return;
        this.center = new LatLng(detail.lat, detail.lng);
        this.zoom = Number(detail.zoom);
        this.fire("moveend");
        this.fire("zoomend");
      };
      window.addEventListener("network-map:scene-click", onSceneClick);
      window.addEventListener("network-map:scene-dblclick", onSceneDoubleClick);
      window.addEventListener("network-map:native-camera", onNativeCamera);
      this.nativeEventDisposers.push(
        () => window.removeEventListener("network-map:scene-click", onSceneClick),
        () => window.removeEventListener("network-map:scene-dblclick", onSceneDoubleClick),
        () => window.removeEventListener("network-map:native-camera", onNativeCamera),
      );
      queueMicrotask(() => this.fire("load"));
    }
    getContainer(): HTMLElement { return this.container; }
    whenReady(fn: (event?: any) => void): this { queueMicrotask(() => fn({ target: this })); return this; }
    addLayer(layer: Layer): this { if (this.removed) return this; this.layers.add(layer); layer._parent = null; layer._attach(this); eachNativeMap((native) => layer.renderNative(native)); this.fire("layeradd", { layer }); return this; }
    removeLayer(layer: Layer): this { if (!this.layers.has(layer)) return this; this.layers.delete(layer); eachNativeMap((native) => layer.cleanupNative(native)); layer._detach(); this.fire("layerremove", { layer }); return this; }
    hasLayer(layer: Layer): boolean { return this.layers.has(layer); }
    eachTopLayer(fn: (layer: Layer) => void): this { for (const layer of this.layers) fn(layer); return this; }
    eachLayer(fn: (layer: Layer) => void): this {
      const visit = (layer: Layer) => { fn(layer); if (layer instanceof LayerGroup) layer.eachLayer((child) => visit(child)); };
      for (const layer of this.layers) visit(layer);
      return this;
    }
    getCenter(): LatLng {
      const native = activeNativeMap();
      if (native) { const c = native.getCenter(); this.center = new LatLng(c.lat, c.lng); }
      return this.center;
    }
    getZoom(): number { const native = activeNativeMap(); if (native) this.zoom = native.getZoom(); return this.zoom; }
    getBounds(): LatLngBounds {
      const native = activeNativeMap();
      if (native) { const b = native.getBounds(); if (b) return new LatLngBounds([b.getSouth(), b.getWest()], [b.getNorth(), b.getEast()]); }
      const latSpan = Math.min(170, 170 / Math.pow(2, Math.max(0, this.zoom - 1)));
      const lngSpan = Math.min(360, 360 / Math.pow(2, Math.max(0, this.zoom - 1)));
      return new LatLngBounds([this.center.lat - latSpan / 2, this.center.lng - lngSpan / 2], [this.center.lat + latSpan / 2, this.center.lng + lngSpan / 2]);
    }
    setView(center: LatLngExpression, zoom?: number, options: Record<string, any> = {}): this {
      const resolvedZoom = zoom ?? this.zoom;
      this.center = normalizeLatLng(center); this.zoom = Number(resolvedZoom);
      const native = activeNativeMap();
      if (native) native.jumpTo({ center: [this.center.lng, this.center.lat], zoom: this.zoom });
      if (!options.silent) { this.fire("moveend"); this.fire("zoomend"); }
      return this;
    }
    flyTo(center: LatLngExpression, zoom?: number, options: Record<string, any> = {}): this {
      const resolvedZoom = zoom ?? this.zoom;
      this.center = normalizeLatLng(center); this.zoom = Number(resolvedZoom);
      const native = activeNativeMap();
      if (native) native.flyTo({ center: [this.center.lng, this.center.lat], zoom: this.zoom, duration: Number(options.duration || 1) * (Number(options.duration || 1) < 20 ? 1000 : 1) });
      return this;
    }
    fitBounds(bounds: LatLngBounds | LatLngExpression[], options: Record<string, any> = {}): this {
      const b = bounds instanceof LatLngBounds ? bounds : new LatLngBounds(bounds as any);
      this.center = b.getCenter();
      const native = activeNativeMap();
      if (native) native.fitBounds([[b.getWest(), b.getSouth()], [b.getEast(), b.getNorth()]], { padding: options.padding || 30, duration: Number(options.duration || 0) });
      return this;
    }
    panTo(center: LatLngExpression, options?: Record<string, any>): this { return this.setView(center, this.zoom, options); }
    setZoom(zoom: number): this { return this.setView(this.center, zoom); }
    zoomIn(delta = 1): this { return this.setZoom(this.getZoom() + delta); }
    zoomOut(delta = 1): this { return this.setZoom(this.getZoom() - delta); }
    project(value: LatLngExpression, zoom?: number): Point {
      const resolvedZoom = zoom ?? this.getZoom();
      const p = normalizeLatLng(value); const native = activeNativeMap();
      if (native && Math.abs(native.getZoom() - resolvedZoom) < 0.05) { const q = native.project([p.lng, p.lat]); return new Point(q.x, q.y); }
      const scale = 256 * Math.pow(2, resolvedZoom);
      const x = (p.lng + 180) / 360 * scale;
      const sin = Math.sin(Math.max(-85.0511, Math.min(85.0511, p.lat)) * Math.PI / 180);
      const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
      return new Point(x, y);
    }
    unproject(value: Point | PointTuple, zoom?: number): LatLng {
      const resolvedZoom = zoom ?? this.getZoom();
      const p = value instanceof Point ? value : new Point(Number(value[0]), Number(value[1])); const native = activeNativeMap();
      if (native && Math.abs(native.getZoom() - resolvedZoom) < 0.05) { const q = native.unproject([p.x, p.y]); return new LatLng(q.lat, q.lng); }
      const scale = 256 * Math.pow(2, resolvedZoom);
      const lng = p.x / scale * 360 - 180;
      const n = Math.PI - 2 * Math.PI * p.y / scale;
      return new LatLng(180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))), lng);
    }
    invalidateSize(): this { eachNativeMap((native) => native.resize()); return this; }
    openPopup(value: Popup | string | HTMLElement, latlng?: LatLngExpression): this {
      const popupValue = value instanceof Popup ? value : new Popup().setContent(value as any);
      const native = activeNativeMap(); if (native) popupValue.openOnNative(native, latlng || popupValue.getLatLng() || this.getCenter()); return this;
    }
    closePopup(popup?: Popup): this { popup?.close(); return this; }
    remove(): this {
      if (this.removed) return this;
      this.removed = true;
      for (const layer of [...this.layers]) this.removeLayer(layer);
      logicalMaps.delete(this);
      for (const dispose of this.nativeEventDisposers.splice(0)) dispose();
      this.fire("unload");
      this.off();
      return this;
    }
    _setViewFromNative(center: LatLngExpression, zoom: number): void { this.center = normalizeLatLng(center); this.zoom = zoom; this.fire("moveend"); this.fire("zoomend"); }
  }

  export function map(element: string | HTMLElement, options: MapOptions = {}): Map { return new Map(element, options); }
  export function latLng(a: number | LatLngExpression, b?: number): LatLng { return typeof a === "number" ? new LatLng(a, Number(b)) : normalizeLatLng(a); }
  export function latLngBounds(a: any, b?: any): LatLngBounds { return new LatLngBounds(a, b); }
  export function point(x: number | PointTuple, y?: number): Point { return Array.isArray(x) ? new Point(Number(x[0]), Number(x[1])) : new Point(Number(x), Number(y)); }
  export function layerGroup(layers: Layer[] = []): LayerGroup { return new LayerGroup(layers); }
  export function featureGroup(layers: Layer[] = []): FeatureGroup { return new FeatureGroup(layers); }
  export function marker(value: LatLngExpression, options: MarkerOptions = {}): Marker { return new Marker(value, options); }
  export function circleMarker(value: LatLngExpression, options: CircleMarkerOptions = {}): CircleMarker { return new CircleMarker(value, options); }
  export function circle(value: LatLngExpression, optionsOrRadius: Record<string, any> | number = {}): Circle {
    const options = typeof optionsOrRadius === "number" ? { radius: optionsOrRadius } : optionsOrRadius;
    return new Circle(value, options);
  }
  export function polyline(values: any, options: PolylineOptions = {}): Polyline { return new Polyline(values, options); }
  export function polygon(values: any, options: PathOptions = {}): Polygon { return new Polygon(values, options); }
  export function rectangle(bounds: LatLngBounds | LatLngExpression[], options: PathOptions = {}): Polygon {
    const b = bounds instanceof LatLngBounds ? bounds : new LatLngBounds(bounds as any);
    return new Polygon([[b.getSouth(), b.getWest()], [b.getSouth(), b.getEast()], [b.getNorth(), b.getEast()], [b.getNorth(), b.getWest()]], options);
  }
  export function geoJSON<P = any>(data?: GeoJSON.GeoJSON | null, options: GeoJSONOptions = {}): GeoJSON<P> { return new GeoJSON<P>(data, options); }
  export function tileLayer(url: string, options: TileLayerOptions = {}): TileLayer { return new TileLayer(url, options); }
  export function popup(options: Record<string, any> = {}): Popup { return new Popup(options); }
  export function tooltip(options: Record<string, any> = {}): Tooltip { return new Tooltip(options); }
  export function divIcon(options: Record<string, any> = {}): DivIcon { return new DivIcon(options); }
  export function icon(options: Record<string, any> = {}): Icon { return new Icon(options); }
  export function canvas(options: Record<string, any> = {}): any { return { options }; }

  export const DomUtil = {
    create<K extends keyof HTMLElementTagNameMap>(tagName: K, className = "", container?: HTMLElement): HTMLElementTagNameMap[K] {
      const el = document.createElement(tagName); el.className = className; container?.appendChild(el); return el;
    },
    addClass(el: Element, name: string) { el.classList.add(name); },
    removeClass(el: Element, name: string) { el.classList.remove(name); },
  };

  export const DomEvent = {
    disableClickPropagation(el: HTMLElement) { for (const type of ["click", "dblclick", "mousedown", "pointerdown"]) el.addEventListener(type, (event) => event.stopPropagation()); return this; },
    disableScrollPropagation(el: HTMLElement) { el.addEventListener("wheel", (event) => event.stopPropagation()); return this; },
    on(el: EventTarget, type: string, fn: EventListenerOrEventListenerObject) { el.addEventListener(type, fn as EventListener); return this; },
    off(el: EventTarget, type: string, fn: EventListenerOrEventListenerObject) { el.removeEventListener(type, fn as EventListener); return this; },
    stopPropagation(event: Event) { event.stopPropagation(); return this; },
    preventDefault(event: Event) { event.preventDefault(); return this; },
  };
}

export default MapScene;

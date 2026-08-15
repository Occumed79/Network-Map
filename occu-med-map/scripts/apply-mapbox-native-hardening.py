from pathlib import Path

compat = Path('occu-med-map/src/mapboxNativeCompat.ts')
text = compat.read_text()

old_initializer = '''registerMapboxMapInitializer({
  id: "mapbox-native-leaflet-compat",
  priority: 5,
  initialize: (native) => {
    const sync = () => renderLogicalMap(native);
    native.on("style.load", sync);
    if (native.isStyleLoaded()) queueMicrotask(sync);
    return () => native.off("style.load", sync);
  },
});'''
new_initializer = '''registerMapboxMapInitializer({
  id: "mapbox-native-leaflet-compat",
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
});'''
if old_initializer not in text:
    raise SystemExit('missing Mapbox initializer patch target')
text = text.replace(old_initializer, new_initializer)

old_bounds = '''    constructor(a: LatLngExpression | LatLngExpression[], b?: LatLngExpression) {
      const values: LatLngExpression[] = Array.isArray(a) && Array.isArray((a as any)[0]) ? a as LatLngExpression[] : b ? [a as LatLngExpression, b] : [a as LatLngExpression];
      const points = values.map(normalizeLatLng);
      this.south = Math.min(...points.map((p) => p.lat));
      this.north = Math.max(...points.map((p) => p.lat));
      this.west = Math.min(...points.map((p) => p.lng));
      this.east = Math.max(...points.map((p) => p.lng));
    }'''
new_bounds = '''    constructor(a: LatLngExpression | LatLngExpression[], b?: LatLngExpression) {
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
    }'''
if old_bounds not in text:
    raise SystemExit('missing LatLngBounds patch target')
text = text.replace(old_bounds, new_bounds)

old_grid = '  export class GridLayer extends Layer {}'
new_grid = '''  export class GridLayer extends Layer {
    static defaultOptions: GridLayerOptions = {};
    static mergeOptions(options: GridLayerOptions): void { Object.assign(GridLayer.defaultOptions, options); }
    constructor(options: GridLayerOptions = {}) { super({ ...GridLayer.defaultOptions, ...options }); }
  }'''
if old_grid not in text:
    raise SystemExit('missing GridLayer patch target')
text = text.replace(old_grid, new_grid)

old_control = '''    addTo(map: Map): this {
      this.map = map;
      const content = this.onAdd?.(map);
      if (content) {
        const wrapper = document.createElement("div");
        wrapper.className = `leaflet-compat-control leaflet-${this.options.position || "topright"}`;
        wrapper.appendChild(content);
        (map.getContainer().parentElement || map.getContainer()).appendChild(wrapper);
        this.container = wrapper;
      }
      return this;
    }'''
new_control = '''    addTo(map: Map): this {
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
        wrapper.className = `leaflet-compat-control leaflet-${position}`;
        wrapper.style.pointerEvents = "auto";
        wrapper.appendChild(content);
        corner.appendChild(wrapper);
        this.container = wrapper;
      }
      return this;
    }'''
if old_control not in text:
    raise SystemExit('missing Control.addTo patch target')
text = text.replace(old_control, new_control)

old_map_header = '''  export class Map extends Evented {
    private container: HTMLElement;'''
new_map_header = '''  export class Map extends Evented {
    static defaultOptions: MapOptions = {};
    static mergeOptions(options: MapOptions): void { Object.assign(Map.defaultOptions, options); }
    private container: HTMLElement;'''
if old_map_header not in text:
    raise SystemExit('missing Map static defaults patch target')
text = text.replace(old_map_header, new_map_header)

old_map_constructor = '''    constructor(element: string | HTMLElement, options: MapOptions = {}) {
      super();
      const container = typeof element === "string" ? document.getElementById(element) : element;
      if (!container) throw new Error("Map container not found");
      this.container = container;
      this.center = normalizeLatLng(options.center || [20, 0]);
      this.zoom = Number(options.zoom ?? 2);'''
new_map_constructor = '''    constructor(element: string | HTMLElement, options: MapOptions = {}) {
      super();
      const resolvedOptions = { ...Map.defaultOptions, ...options };
      const container = typeof element === "string" ? document.getElementById(element) : element;
      if (!container) throw new Error("Map container not found");
      this.container = container;
      this.center = normalizeLatLng(resolvedOptions.center || [20, 0]);
      this.zoom = Number(resolvedOptions.zoom ?? resolvedOptions.minZoom ?? 2);'''
if old_map_constructor not in text:
    raise SystemExit('missing Map constructor defaults patch target')
text = text.replace(old_map_constructor, new_map_constructor)
compat.write_text(text)

dual = Path('occu-med-map/src/dualMapEngineRuntime.ts')
text = dual.read_text()
old_click = '''    if (html) {
      new mapboxgl.Popup({ closeButton: true }).setLngLat(event.lngLat).setHTML(html).addTo(instance);
      return;
    }
    canonicalMap.fire("click", {
      latlng: L.latLng(event.lngLat.lat, event.lngLat.lng),
      originalEvent: event.originalEvent,
    });'''
new_click = '''    if (html) {
      new mapboxgl.Popup({ closeButton: true }).setLngLat(event.lngLat).setHTML(html).addTo(instance);
      return;
    }

    // Layer-specific Mapbox handlers own provider/compatibility feature clicks.
    // Do not let those same clicks fall through into generic map-click tools
    // such as radius selection or Live Finder coordinate selection.
    const overlayHit = instance.queryRenderedFeatures(event.point).some((feature) => {
      const layerId = String(feature.layer?.id || "");
      const properties = feature.properties || {};
      const compatibilityFeature = properties.__compatLayerId !== undefined
        && properties.__compatLayerId !== null
        && properties.__interactive !== false;
      return compatibilityFeature
        || layerId === "provider-location-search-dots"
        || layerId.startsWith("leaflet-compat-");
    });
    if (overlayHit) return;

    canonicalMap.fire("click", {
      latlng: L.latLng(event.lngLat.lat, event.lngLat.lng),
      originalEvent: event.originalEvent,
    });'''
if old_click not in text:
    raise SystemExit('missing Mapbox click ownership patch target')
dual.write_text(text.replace(old_click, new_click))

print('Applied Mapbox native defaults, bounds, controls, WebGL, and click hardening.')

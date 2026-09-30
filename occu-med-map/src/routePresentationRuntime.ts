import mapboxgl from "mapbox-gl";

export type RouteLayerIds = {
  source: string;
  outer: string;
  body: string;
  core: string;
  pulse: string;
};

type RoutePoint = [number, number];

const activeAnimations = new WeakMap<mapboxgl.Map, () => void>();
const pendingAnimations = new WeakMap<mapboxgl.Map, number>();

function standardStyle(map: mapboxgl.Map): boolean {
  const style = map.getStyle() as mapboxgl.StyleSpecification & { imports?: Array<{ id?: string; url?: string }> };
  return Boolean(style?.imports?.some((item) => item.id === "basemap" || item.url?.includes("/standard")));
}

function topSlot(map: mapboxgl.Map): { slot?: "top" } {
  return standardStyle(map) ? { slot: "top" } : {};
}

export function ensureLuminousRouteLayers(map: mapboxgl.Map, ids: RouteLayerIds): void {
  const common = {
    type: "line" as const,
    source: ids.source,
    filter: ["==", ["get", "role"], "route"] as mapboxgl.FilterSpecification,
    layout: { "line-cap": "round" as const, "line-join": "round" as const },
    ...topSlot(map),
  };
  if (!map.getLayer(ids.outer)) map.addLayer({
    id: ids.outer,
    ...common,
    paint: {
      "line-color": "#38bdf8",
      "line-width": ["interpolate", ["linear"], ["zoom"], 4, 10, 14, 18],
      "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.42, 0.24],
      "line-blur": 8,
    },
  });
  if (!map.getLayer(ids.body)) map.addLayer({
    id: ids.body,
    ...common,
    paint: {
      "line-gradient": ["interpolate", ["linear"], ["line-progress"], 0, "#2563eb", 0.48, "#22d3ee", 1, "#8b5cf6"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 4, 3.5, 14, 7],
      "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.92],
    },
  });
  if (!map.getLayer(ids.core)) map.addLayer({
    id: ids.core,
    ...common,
    paint: {
      "line-color": "#ecfeff",
      "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.8, 14, 2.2],
      "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.98, 0.72],
      "line-blur": 0.4,
    },
  });
  if (!map.getLayer(ids.pulse)) map.addLayer({
    id: ids.pulse,
    ...common,
    paint: {
      "line-gradient": ["interpolate", ["linear"], ["line-progress"], 0, "rgba(255,255,255,0)", 0.01, "rgba(255,255,255,0)"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 4, 3, 14, 6],
      "line-blur": 1.2,
    },
  });
}

export function installRouteHover(map: mapboxgl.Map, ids: RouteLayerIds): () => void {
  let hoveredId: string | number | null = null;
  const leave = () => {
    if (hoveredId !== null && map.getSource(ids.source)) map.setFeatureState({ source: ids.source, id: hoveredId }, { hover: false });
    hoveredId = null;
    map.getCanvas().style.cursor = "";
  };
  const move = (event: mapboxgl.MapLayerMouseEvent) => {
    const id = event.features?.[0]?.id;
    if (id === undefined || id === null || id === hoveredId) return;
    leave();
    hoveredId = id;
    map.setFeatureState({ source: ids.source, id }, { hover: true });
    map.getCanvas().style.cursor = "pointer";
  };
  map.on("mousemove", ids.body, move);
  map.on("mouseleave", ids.body, leave);
  return () => {
    leave();
    map.off("mousemove", ids.body, move);
    map.off("mouseleave", ids.body, leave);
  };
}

export function startRoutePulse(map: mapboxgl.Map, ids: RouteLayerIds): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => undefined;
  let frame = 0;
  let cycleStarted: number | null = null;
  let lastPresenceCheck = -Infinity;
  const draw = (now: number) => {
    if (!map.getLayer(ids.pulse)) {
      frame = requestAnimationFrame(draw);
      return;
    }
    if (now - lastPresenceCheck > 400) {
      lastPresenceCheck = now;
      const route = map.querySourceFeatures(ids.source, { filter: ["==", ["get", "role"], "route"] })[0];
      if (route && cycleStarted === null) cycleStarted = now;
      if (!route) {
        cycleStarted = null;
        map.setPaintProperty(ids.pulse, "line-opacity", 0);
      }
    }
    if (cycleStarted === null) {
      frame = requestAnimationFrame(draw);
      return;
    }
    // Source features are tiled and may change shape as the camera moves.
    // Track presence rather than a tile geometry signature, and keep the
    // highlight traveling for as long as the selected route is displayed.
    const center = ((now - cycleStarted) % 2400) / 2400;
    map.setPaintProperty(ids.pulse, "line-opacity", 1);
    map.setPaintProperty(ids.pulse, "line-gradient", [
      "interpolate", ["linear"], ["abs", ["-", ["line-progress"], center]],
      0, "rgba(255,255,255,0.98)",
      0.055, "rgba(255,255,255,0)",
    ]);
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frame);
}

function distance(left: RoutePoint, right: RoutePoint): number {
  const lat = (left[1] + right[1]) * Math.PI / 360;
  const x = (right[0] - left[0]) * Math.cos(lat);
  const y = right[1] - left[1];
  return Math.hypot(x, y);
}

function routeSampler(coordinates: RoutePoint[]): { at: (progress: number) => RoutePoint; length: number } {
  const cumulative = [0];
  for (let index = 1; index < coordinates.length; index += 1) {
    cumulative.push(cumulative[index - 1] + distance(coordinates[index - 1], coordinates[index]));
  }
  const length = cumulative.at(-1) || 0;
  return {
    length,
    at(progress) {
      if (!length) return coordinates[0];
      const target = Math.max(0, Math.min(1, progress)) * length;
      let index = 1;
      while (index < cumulative.length - 1 && cumulative[index] < target) index += 1;
      const startLength = cumulative[index - 1];
      const span = Math.max(cumulative[index] - startLength, Number.EPSILON);
      const local = (target - startLength) / span;
      return [
        coordinates[index - 1][0] + (coordinates[index][0] - coordinates[index - 1][0]) * local,
        coordinates[index - 1][1] + (coordinates[index][1] - coordinates[index - 1][1]) * local,
      ];
    },
  };
}

export function enableDestinationBuildings(map: mapboxgl.Map): void {
  if (standardStyle(map)) {
    for (const property of ["show3dObjects", "show3dBuildings", "show3dFacades"] as const) {
      try { map.setConfigProperty("basemap", property, true); } catch { /* Older Standard revisions omit granular controls. */ }
    }
    return;
  }
  const style = map.getStyle();
  const hasBuildings = style.layers?.some((layer) => layer.type === "fill-extrusion"
    && (layer as mapboxgl.FillExtrusionLayerSpecification)["source-layer"] === "building");
  if (hasBuildings || !map.getSource("composite")) return;
  const firstLabel = style.layers?.find((layer) => layer.type === "symbol" && "text-field" in (layer.layout || {}))?.id;
  map.addLayer({
    id: "occumed-destination-3d-buildings",
    type: "fill-extrusion",
    source: "composite",
    "source-layer": "building",
    minzoom: 14,
    filter: ["==", ["get", "extrude"], "true"],
    paint: {
      "fill-extrusion-color": "#dbeafe",
      "fill-extrusion-height": ["coalesce", ["get", "height"], 6],
      "fill-extrusion-base": ["coalesce", ["get", "min_height"], 0],
      "fill-extrusion-opacity": 0.82,
    },
  }, firstLabel);
}

export function travelAlongRoute(map: mapboxgl.Map, coordinates: RoutePoint[]): () => void {
  cancelRouteTravel(map);
  if (coordinates.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => undefined;
  const sampler = routeSampler(coordinates);
  if (!sampler.length) return () => undefined;
  map.stop();
  const duration = Math.max(5200, Math.min(12000, 5200 + sampler.length * 180));
  const altitude = Math.max(220, Math.min(1400, 240 + sampler.length * 55));
  let frame = 0;
  let cancelled = false;
  const started = performance.now();
  let lastFrame = started;
  let bearing = map.getBearing();
  const interrupt = () => cancel();
  const events: Array<keyof HTMLElementEventMap> = ["pointerdown", "wheel", "touchstart", "keydown"];
  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    cancelAnimationFrame(frame);
    events.forEach((event) => map.getCanvas().removeEventListener(event, interrupt));
    if (activeAnimations.get(map) === cancel) activeAnimations.delete(map);
  };
  events.forEach((event) => map.getCanvas().addEventListener(event, interrupt, { passive: true }));
  enableDestinationBuildings(map);
  const animate = (now: number) => {
    if (cancelled) return;
    const raw = Math.min(1, (now - started) / duration);
    const progress = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
    const point = sampler.at(progress);
    const before = sampler.at(Math.max(0, progress - 0.012));
    const ahead = sampler.at(Math.min(1, progress + 0.012));
    const dx = (ahead[0] - before[0]) * Math.cos(point[1] * Math.PI / 180);
    const dy = ahead[1] - before[1];
    if (dx || dy) {
      const targetBearing = Math.atan2(dx, dy) * 180 / Math.PI;
      const turn = (((targetBearing - bearing + 180) % 360 + 360) % 360) - 180;
      bearing += turn * (1 - Math.exp(-Math.max(0, now - lastFrame) / 180));
    }
    lastFrame = now;
    const pitch = 45 + progress * 20;
    const position = mapboxgl.MercatorCoordinate.fromLngLat(point, altitude * (1 - progress * 0.68));
    const trailingDistance = position.z * Math.tan(pitch * Math.PI / 180);
    const heading = bearing * Math.PI / 180;
    position.x -= Math.sin(heading) * trailingDistance;
    position.y += Math.cos(heading) * trailingDistance;
    const camera = map.getFreeCameraOptions();
    camera.position = position;
    // Keep the route point centered while approaching from behind. Clamping
    // a look-ahead point to the destination previously flattened the pitch
    // to zero at arrival, hiding the requested 3D city view.
    camera.lookAtPoint(point, [0, 0, 1]);
    map.setFreeCameraOptions(camera);
    if (raw < 1) frame = requestAnimationFrame(animate);
    else cancel();
  };
  activeAnimations.set(map, cancel);
  frame = requestAnimationFrame(animate);
  return cancel;
}

export function cancelRouteTravel(map: mapboxgl.Map): void {
  const pending = pendingAnimations.get(map);
  if (pending !== undefined) cancelAnimationFrame(pending);
  pendingAnimations.delete(map);
  activeAnimations.get(map)?.();
}

export function scheduleRouteTravel(map: mapboxgl.Map, coordinates: RoutePoint[]): void {
  cancelRouteTravel(map);
  const frame = requestAnimationFrame(() => {
    pendingAnimations.delete(map);
    travelAlongRoute(map, coordinates);
  });
  pendingAnimations.set(map, frame);
}

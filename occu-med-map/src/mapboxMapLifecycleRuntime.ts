import mapboxgl from "mapbox-gl";
import { registerRuntimeOwner } from "./runtimeControllerRegistry";

export type MapboxMapMode = "2d" | "3d" | "unknown";

export type MapboxMapContext = {
  mode: MapboxMapMode;
};

export type MapboxMapInitializer = {
  id: string;
  priority?: number;
  initialize: (map: mapboxgl.Map, context: MapboxMapContext) => void | (() => void);
};

type RegisteredInitializer = {
  id: string;
  priority: number;
  sequence: number;
  initialize: MapboxMapInitializer["initialize"];
};

type TrackedMap = {
  context: MapboxMapContext;
  onRemove: () => void;
};

type MapboxLifecycleDiagnostics = {
  mapCount: number;
  initializerCount: number;
  initializers: Array<{ id: string; priority: number }>;
  maps: Array<{ mode: MapboxMapMode; loaded: boolean }>;
  initializationErrors: number;
};

declare global {
  interface Window {
    __NETWORK_MAP_MAPBOX_LIFECYCLE__?: {
      getMaps: () => mapboxgl.Map[];
      getDiagnostics: () => MapboxLifecycleDiagnostics;
    };
  }
}

const initializers = new Map<string, RegisteredInitializer>();
const maps = new Map<mapboxgl.Map, TrackedMap>();
const executedByMap = new WeakMap<mapboxgl.Map, Map<string, (() => void) | null>>();
let sequence = 0;
let initializationErrors = 0;

function orderedInitializers(): RegisteredInitializer[] {
  return [...initializers.values()].sort((left, right) =>
    left.priority - right.priority || left.sequence - right.sequence || left.id.localeCompare(right.id),
  );
}

function emit(phase: string, detail: Record<string, unknown> = {}): void {
  window.dispatchEvent(new CustomEvent("network-map:mapbox-lifecycle", {
    detail: {
      phase,
      mapCount: maps.size,
      initializerCount: initializers.size,
      ...detail,
    },
  }));
}

function initializeMapWith(
  map: mapboxgl.Map,
  context: MapboxMapContext,
  initializer: RegisteredInitializer,
): void {
  let executed = executedByMap.get(map);
  if (!executed) {
    executed = new Map();
    executedByMap.set(map, executed);
  }
  if (executed.has(initializer.id)) return;

  executed.set(initializer.id, null);
  try {
    const cleanup = initializer.initialize(map, context);
    executed.set(initializer.id, typeof cleanup === "function" ? cleanup : null);
    emit("initializer-complete", {
      id: initializer.id,
      priority: initializer.priority,
      mode: context.mode,
    });
  } catch (error) {
    initializationErrors += 1;
    executed.delete(initializer.id);
    console.error("Mapbox initializer failed: " + initializer.id, error);
    emit("initializer-error", {
      id: initializer.id,
      mode: context.mode,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function runCleanup(map: mapboxgl.Map): void {
  const executed = executedByMap.get(map);
  if (!executed) return;
  for (const [id, cleanup] of [...executed.entries()].reverse()) {
    if (!cleanup) continue;
    try {
      cleanup();
    } catch (error) {
      console.warn("Mapbox initializer cleanup failed: " + id, error);
    }
  }
  executed.clear();
}

export function registerMapboxMap(
  map: mapboxgl.Map,
  context: MapboxMapContext,
): mapboxgl.Map {
  const existing = maps.get(map);
  if (existing) return map;

  const normalizedContext: MapboxMapContext = {
    mode: context.mode || "unknown",
  };
  const onRemove = () => unregisterMapboxMap(map);
  maps.set(map, { context: normalizedContext, onRemove });
  executedByMap.set(map, new Map());
  map.once("remove", onRemove);

  for (const initializer of orderedInitializers()) {
    initializeMapWith(map, normalizedContext, initializer);
  }
  emit("map-registered", { mode: normalizedContext.mode });
  return map;
}

export function unregisterMapboxMap(map: mapboxgl.Map): void {
  const tracked = maps.get(map);
  if (!tracked) return;
  maps.delete(map);
  try {
    map.off("remove", tracked.onRemove);
  } catch {}
  runCleanup(map);
  emit("map-unregistered", { mode: tracked.context.mode });
}

export function registerMapboxMapInitializer(initializer: MapboxMapInitializer): () => void {
  const id = initializer.id.trim();
  if (!id) throw new Error("Mapbox map initializer requires a stable id");
  if (initializers.has(id)) throw new Error("Mapbox map initializer is already registered: " + id);

  const registered: RegisteredInitializer = {
    id,
    priority: Number.isFinite(initializer.priority) ? Number(initializer.priority) : 100,
    sequence: sequence += 1,
    initialize: initializer.initialize,
  };
  initializers.set(id, registered);
  for (const [map, tracked] of maps) {
    initializeMapWith(map, tracked.context, registered);
  }
  emit("initializer-registered", { id, priority: registered.priority });

  return () => {
    if (initializers.get(id) !== registered) return;
    initializers.delete(id);
    for (const map of maps.keys()) {
      const executed = executedByMap.get(map);
      const cleanup = executed?.get(id);
      if (cleanup) {
        try {
          cleanup();
        } catch (error) {
          console.warn("Mapbox initializer cleanup failed: " + id, error);
        }
      }
      executed?.delete(id);
    }
    emit("initializer-unregistered", { id });
  };
}

export function getTrackedMapboxMaps(): mapboxgl.Map[] {
  return [...maps.keys()];
}

if (registerRuntimeOwner("mapbox-map-lifecycle", "Authoritative Mapbox map lifecycle and initializer registry")) {
  window.__NETWORK_MAP_MAPBOX_LIFECYCLE__ = {
    getMaps: getTrackedMapboxMaps,
    getDiagnostics: () => ({
      mapCount: maps.size,
      initializerCount: initializers.size,
      initializers: orderedInitializers().map(({ id, priority }) => ({ id, priority })),
      maps: [...maps.entries()].map(([map, tracked]) => ({
        mode: tracked.context.mode,
        loaded: map.loaded(),
      })),
      initializationErrors,
    }),
  };
}

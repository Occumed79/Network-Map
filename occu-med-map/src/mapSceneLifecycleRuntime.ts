import MapScene from "./mapSceneRuntime";
import { registerRuntimeOwner } from "./runtimeControllerRegistry";

export type MapSceneInitializer = {
  id: string;
  priority?: number;
  initialize: (map: MapScene.Map) => void | (() => void);
};

type RegisteredInitializer = Required<Pick<MapSceneInitializer, "id" | "initialize">> & {
  priority: number;
  sequence: number;
};

type LifecycleDiagnostics = {
  mapCount: number;
  initializerCount: number;
  initializers: Array<{ id: string; priority: number }>;
  initializationErrors: number;
};

declare global {
  interface Window {
    __NETWORK_MAP_SCENE_LIFECYCLE__?: {
      getMaps: () => MapScene.Map[];
      getDiagnostics: () => LifecycleDiagnostics;
    };
  }
}

const PATCH_FLAG = "__occumedMapSceneLifecycleFactoryPatched";
const mapSceneRuntime = MapScene as typeof MapScene & Record<string, unknown>;
const initializers = new Map<string, RegisteredInitializer>();
const maps = new Set<MapScene.Map>();
const executedByMap = new WeakMap<MapScene.Map, Map<string, (() => void) | null>>();
let sequence = 0;
let initializationErrors = 0;

function orderedInitializers(): RegisteredInitializer[] {
  return [...initializers.values()].sort((left, right) =>
    left.priority - right.priority || left.sequence - right.sequence || left.id.localeCompare(right.id),
  );
}

function emit(phase: string, detail: Record<string, unknown> = {}): void {
  window.dispatchEvent(new CustomEvent("network-map:scene-lifecycle", {
    detail: {
      phase,
      mapCount: maps.size,
      initializerCount: initializers.size,
      ...detail,
    },
  }));
}

function initializeMapWith(map: MapScene.Map, initializer: RegisteredInitializer): void {
  let executed = executedByMap.get(map);
  if (!executed) {
    executed = new Map();
    executedByMap.set(map, executed);
  }
  if (executed.has(initializer.id)) return;

  executed.set(initializer.id, null);
  try {
    const cleanup = initializer.initialize(map);
    executed.set(initializer.id, typeof cleanup === "function" ? cleanup : null);
    emit("initializer-complete", { id: initializer.id, priority: initializer.priority });
  } catch (error) {
    initializationErrors += 1;
    executed.delete(initializer.id);
    console.error("Map scene initializer failed: " + initializer.id, error);
    emit("initializer-error", {
      id: initializer.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function cleanupMap(map: MapScene.Map): void {
  const executed = executedByMap.get(map);
  if (executed) {
    for (const [id, cleanup] of [...executed.entries()].reverse()) {
      if (!cleanup) continue;
      try {
        cleanup();
      } catch (error) {
        console.warn("Map scene initializer cleanup failed: " + id, error);
      }
    }
    executed.clear();
  }
  maps.delete(map);
  emit("map-unloaded");
}

function trackMap(map: MapScene.Map): MapScene.Map {
  if (maps.has(map)) return map;
  maps.add(map);
  executedByMap.set(map, new Map());
  map.once("unload", () => cleanupMap(map));
  for (const initializer of orderedInitializers()) initializeMapWith(map, initializer);
  emit("map-created");
  return map;
}

function installFactoryOwner(): void {
  if (mapSceneRuntime[PATCH_FLAG]) return;
  const nativeMapFactory = MapScene.map.bind(MapScene);
  (MapScene as any).map = (...args: Parameters<typeof MapScene.map>): MapScene.Map => trackMap(nativeMapFactory(...args));
  mapSceneRuntime[PATCH_FLAG] = true;
}

export function registerMapSceneInitializer(initializer: MapSceneInitializer): () => void {
  const id = initializer.id.trim();
  if (!id) throw new Error("Map scene initializer requires a stable id");
  if (initializers.has(id)) throw new Error("Map scene initializer is already registered: " + id);

  const registered: RegisteredInitializer = {
    id,
    priority: Number.isFinite(initializer.priority) ? Number(initializer.priority) : 100,
    initialize: initializer.initialize,
    sequence: sequence += 1,
  };
  initializers.set(id, registered);
  for (const map of maps) initializeMapWith(map, registered);
  emit("initializer-registered", { id, priority: registered.priority });

  return () => {
    if (initializers.get(id) !== registered) return;
    initializers.delete(id);
    for (const map of maps) {
      const executed = executedByMap.get(map);
      const cleanup = executed?.get(id);
      if (cleanup) {
        try { cleanup(); } catch (error) { console.warn("Map scene initializer cleanup failed: " + id, error); }
      }
      executed?.delete(id);
    }
    emit("initializer-unregistered", { id });
  };
}

export function getTrackedMapScenes(): MapScene.Map[] {
  return [...maps];
}

if (registerRuntimeOwner("map-scene-lifecycle", "Mapbox scene lifecycle and initializer registry")) {
  installFactoryOwner();

  window.__NETWORK_MAP_SCENE_LIFECYCLE__ = {
    getMaps: getTrackedMapScenes,
    getDiagnostics: () => ({
      mapCount: maps.size,
      initializerCount: initializers.size,
      initializers: orderedInitializers().map(({ id, priority }) => ({ id, priority })),
      initializationErrors,
    }),
  };
}

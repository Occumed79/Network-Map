import L from "leaflet";

export type LeafletMapInitializer = {
  id: string;
  priority?: number;
  initialize: (map: L.Map) => void | (() => void);
};

type RegisteredInitializer = Required<Pick<LeafletMapInitializer, "id" | "initialize">> & {
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
    __NETWORK_MAP_LEAFLET_LIFECYCLE__?: {
      getMaps: () => L.Map[];
      getDiagnostics: () => LifecycleDiagnostics;
    };
  }
}

const PATCH_FLAG = "__occumedLeafletLifecycleFactoryPatched";
const leafletRuntime = L as typeof L & Record<string, unknown>;
const initializers = new Map<string, RegisteredInitializer>();
const maps = new Set<L.Map>();
const executedByMap = new WeakMap<L.Map, Map<string, (() => void) | null>>();
let sequence = 0;
let initializationErrors = 0;

function orderedInitializers(): RegisteredInitializer[] {
  return [...initializers.values()].sort((left, right) =>
    left.priority - right.priority || left.sequence - right.sequence || left.id.localeCompare(right.id),
  );
}

function emit(phase: string, detail: Record<string, unknown> = {}): void {
  window.dispatchEvent(new CustomEvent("network-map:leaflet-lifecycle", {
    detail: {
      phase,
      mapCount: maps.size,
      initializerCount: initializers.size,
      ...detail,
    },
  }));
}

function initializeMapWith(map: L.Map, initializer: RegisteredInitializer): void {
  let executed = executedByMap.get(map);
  if (!executed) {
    executed = new Map();
    executedByMap.set(map, executed);
  }
  if (executed.has(initializer.id)) return;

  // Mark before invoking so a re-entrant registration cannot run the same
  // initializer twice on the same map.
  executed.set(initializer.id, null);
  try {
    const cleanup = initializer.initialize(map);
    executed.set(initializer.id, typeof cleanup === "function" ? cleanup : null);
    emit("initializer-complete", { id: initializer.id, priority: initializer.priority });
  } catch (error) {
    initializationErrors += 1;
    executed.delete(initializer.id);
    console.error("Leaflet initializer failed: " + initializer.id, error);
    emit("initializer-error", {
      id: initializer.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function cleanupMap(map: L.Map): void {
  const executed = executedByMap.get(map);
  if (executed) {
    for (const [id, cleanup] of [...executed.entries()].reverse()) {
      if (!cleanup) continue;
      try {
        cleanup();
      } catch (error) {
        console.warn("Leaflet initializer cleanup failed: " + id, error);
      }
    }
    executed.clear();
  }
  maps.delete(map);
  emit("map-unloaded");
}

function trackMap(map: L.Map): L.Map {
  if (maps.has(map)) return map;
  maps.add(map);
  executedByMap.set(map, new Map());
  map.once("unload", () => cleanupMap(map));
  for (const initializer of orderedInitializers()) initializeMapWith(map, initializer);
  emit("map-created");
  return map;
}

function installFactoryOwner(): void {
  if (leafletRuntime[PATCH_FLAG]) return;
  const nativeMapFactory = L.map.bind(L);
  (L as any).map = (...args: Parameters<typeof L.map>): L.Map => trackMap(nativeMapFactory(...args));
  leafletRuntime[PATCH_FLAG] = true;
}

export function registerLeafletMapInitializer(initializer: LeafletMapInitializer): () => void {
  const id = initializer.id.trim();
  if (!id) throw new Error("Leaflet map initializer requires a stable id");

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
        try { cleanup(); } catch (error) { console.warn("Leaflet initializer cleanup failed: " + id, error); }
      }
      executed?.delete(id);
    }
    emit("initializer-unregistered", { id });
  };
}

export function getTrackedLeafletMaps(): L.Map[] {
  return [...maps];
}

installFactoryOwner();

window.__NETWORK_MAP_LEAFLET_LIFECYCLE__ = {
  getMaps: getTrackedLeafletMaps,
  getDiagnostics: () => ({
    mapCount: maps.size,
    initializerCount: initializers.size,
    initializers: orderedInitializers().map(({ id, priority }) => ({ id, priority })),
    initializationErrors,
  }),
};

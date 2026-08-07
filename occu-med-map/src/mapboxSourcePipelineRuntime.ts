import mapboxgl from "mapbox-gl";

export type MapboxSourceWriter = "initial" | "external" | string;
export type MapboxGeoJsonData = string | GeoJSON.GeoJSON;

export type MapboxSourceDataContext = { map: mapboxgl.Map; sourceId: string; writer: MapboxSourceWriter };
export type MapboxSourceDataMiddleware = {
  id: string;
  sourceId: string;
  priority?: number;
  allowWrite?: (context: MapboxSourceDataContext, data: MapboxGeoJsonData) => boolean;
  transform?: (context: MapboxSourceDataContext, data: MapboxGeoJsonData) => MapboxGeoJsonData;
};

type RegisteredMiddleware = MapboxSourceDataMiddleware & { id: string; sourceId: string; priority: number; sequence: number };
type PipelineSource = mapboxgl.GeoJSONSource & { __networkMapSourcePipelineWrapped?: boolean };
type SourceState = {
  map: mapboxgl.Map;
  sourceId: string;
  source: PipelineSource;
  nativeSetData: mapboxgl.GeoJSONSource["setData"];
  writesApplied: number;
  writesSuppressed: number;
  lastRequestedData?: MapboxGeoJsonData;
  lastWriter?: MapboxSourceWriter;
  lastFeatureCount: number;
  lastWriteDurationMs: number;
  maxWriteDurationMs: number;
};
type MiddlewareStats = { transformedWrites: number; suppressedWrites: number };
type PipelineDiagnostics = {
  middlewareCount: number;
  sourceCount: number;
  featureCount: number;
  middlewares: Array<{ id: string; sourceId: string; priority: number; transformedWrites: number; suppressedWrites: number }>;
  sources: Array<{ sourceId: string; writesApplied: number; writesSuppressed: number; featureCount: number; lastWriteDurationMs: number; maxWriteDurationMs: number }>;
};

declare global {
  interface Window {
    __NETWORK_MAP_MAPBOX_SOURCE_PIPELINE__?: { getDiagnostics: () => PipelineDiagnostics };
  }
}

const PATCH_FLAG = "__networkMapSourcePipelinePatched";
const middlewares = new Map<string, RegisteredMiddleware>();
const middlewareStats = new Map<string, MiddlewareStats>();
const statesByMap = new Map<mapboxgl.Map, Map<string, SourceState>>();
let sequence = 0;

function featureCount(data: MapboxGeoJsonData): number {
  if (typeof data === "string") return 0;
  if (data?.type === "FeatureCollection") return data.features.length;
  if (data?.type === "Feature") return 1;
  return 0;
}

function emit(phase: string, detail: Record<string, unknown> = {}): void {
  window.dispatchEvent(new CustomEvent("network-map:mapbox-source-pipeline", { detail: { phase, middlewareCount: middlewares.size, sourceCount: sourceCount(), ...detail } }));
}
function sourceCount(): number {
  let count = 0;
  statesByMap.forEach((states) => { count += states.size; });
  return count;
}
function orderedMiddleware(sourceId: string): RegisteredMiddleware[] {
  return [...middlewares.values()].filter((middleware) => middleware.sourceId === sourceId)
    .sort((left, right) => left.priority - right.priority || left.sequence - right.sequence || left.id.localeCompare(right.id));
}
function statsFor(id: string): MiddlewareStats {
  let stats = middlewareStats.get(id);
  if (!stats) { stats = { transformedWrites: 0, suppressedWrites: 0 }; middlewareStats.set(id, stats); }
  return stats;
}
function applyMiddleware(context: MapboxSourceDataContext, data: MapboxGeoJsonData): { allowed: boolean; data: MapboxGeoJsonData; suppressedBy?: string } {
  let nextData = data;
  for (const middleware of orderedMiddleware(context.sourceId)) {
    if (middleware.allowWrite && !middleware.allowWrite(context, nextData)) {
      statsFor(middleware.id).suppressedWrites += 1;
      return { allowed: false, data: nextData, suppressedBy: middleware.id };
    }
    if (middleware.transform) {
      const transformed = middleware.transform(context, nextData);
      if (transformed !== nextData) statsFor(middleware.id).transformedWrites += 1;
      nextData = transformed;
    }
  }
  return { allowed: true, data: nextData };
}
function sourceState(map: mapboxgl.Map, sourceId: string): SourceState | undefined { return statesByMap.get(map)?.get(sourceId); }
function storeState(state: SourceState): void {
  let states = statesByMap.get(state.map);
  if (!states) { states = new Map(); statesByMap.set(state.map, states); }
  states.set(state.sourceId, state);
}
function removeState(map: mapboxgl.Map, sourceId: string): void {
  const states = statesByMap.get(map);
  if (!states) return;
  states.delete(sourceId);
  if (states.size === 0) statesByMap.delete(map);
}

function applySourceData(state: SourceState, data: MapboxGeoJsonData, writer: MapboxSourceWriter): mapboxgl.GeoJSONSource {
  const startedAt = performance.now();
  const context: MapboxSourceDataContext = { map: state.map, sourceId: state.sourceId, writer };
  const result = applyMiddleware(context, data);
  if (!result.allowed) {
    state.writesSuppressed += 1;
    emit("write-suppressed", { sourceId: state.sourceId, writer, middlewareId: result.suppressedBy });
    return state.source;
  }
  state.writesApplied += 1;
  state.lastRequestedData = data;
  state.lastWriter = writer;
  state.lastFeatureCount = featureCount(result.data);
  state.nativeSetData(result.data);
  state.lastWriteDurationMs = performance.now() - startedAt;
  state.maxWriteDurationMs = Math.max(state.maxWriteDurationMs, state.lastWriteDurationMs);
  emit("write-applied", { sourceId: state.sourceId, writer, featureCount: state.lastFeatureCount, durationMs: state.lastWriteDurationMs });
  return state.source;
}

function wrapSource(map: mapboxgl.Map, sourceId: string): SourceState | null {
  const existing = sourceState(map, sourceId);
  const source = map.getSource(sourceId) as PipelineSource | undefined;
  if (!source || typeof source.setData !== "function") return null;
  if (existing?.source === source) return existing;
  const state: SourceState = {
    map, sourceId, source, nativeSetData: source.setData.bind(source), writesApplied: 0, writesSuppressed: 0,
    lastFeatureCount: 0, lastWriteDurationMs: 0, maxWriteDurationMs: 0,
  };
  source.setData = ((data: MapboxGeoJsonData) => applySourceData(state, data, "external")) as mapboxgl.GeoJSONSource["setData"];
  source.__networkMapSourcePipelineWrapped = true;
  storeState(state);
  emit("source-wrapped", { sourceId });
  return state;
}

function transformInitialSource(map: mapboxgl.Map, sourceId: string, source: mapboxgl.AnySourceData): mapboxgl.AnySourceData {
  if (!source || source.type !== "geojson") return source;
  const specification = source as mapboxgl.GeoJSONSourceSpecification;
  const context: MapboxSourceDataContext = { map, sourceId, writer: "initial" };
  const result = applyMiddleware(context, specification.data as MapboxGeoJsonData);
  return result.data === specification.data ? source : { ...specification, data: result.data } as mapboxgl.GeoJSONSourceSpecification;
}

function installPipelineOwner(): void {
  const prototype = mapboxgl.Map.prototype as any;
  if (prototype[PATCH_FLAG]) return;
  const nativeAddSource = prototype.addSource as (this: mapboxgl.Map, id: string, source: mapboxgl.AnySourceData) => mapboxgl.Map;
  const nativeRemoveSource = prototype.removeSource as (this: mapboxgl.Map, id: string) => mapboxgl.Map;
  prototype.addSource = function pipelineAddSource(this: mapboxgl.Map, id: string, source: mapboxgl.AnySourceData): mapboxgl.Map {
    const result = nativeAddSource.call(this, id, transformInitialSource(this, id, source));
    wrapSource(this, id);
    return result;
  };
  prototype.removeSource = function pipelineRemoveSource(this: mapboxgl.Map, id: string): mapboxgl.Map {
    removeState(this, id);
    return nativeRemoveSource.call(this, id);
  };
  prototype[PATCH_FLAG] = true;
}

export function registerMapboxSourceDataMiddleware(middleware: MapboxSourceDataMiddleware): () => void {
  const id = middleware.id.trim();
  const sourceId = middleware.sourceId.trim();
  if (!id || !sourceId) throw new Error("Mapbox source middleware requires stable id and sourceId values");
  if (middlewares.has(id)) throw new Error("Mapbox source middleware is already registered: " + id);
  const registered: RegisteredMiddleware = { ...middleware, id, sourceId, priority: Number.isFinite(middleware.priority) ? Number(middleware.priority) : 100, sequence: sequence += 1 };
  middlewares.set(id, registered);
  statsFor(id);
  statesByMap.forEach((states) => {
    const state = states.get(sourceId);
    if (state?.lastRequestedData !== undefined && state.lastWriter) applySourceData(state, state.lastRequestedData, state.lastWriter);
  });
  emit("middleware-registered", { id, sourceId, priority: registered.priority });
  return () => { if (middlewares.get(id) === registered) { middlewares.delete(id); emit("middleware-unregistered", { id, sourceId }); } };
}

export function setMapboxGeoJsonSourceData(map: mapboxgl.Map, sourceId: string, data: MapboxGeoJsonData, writer: MapboxSourceWriter): mapboxgl.GeoJSONSource | null {
  const state = sourceState(map, sourceId) || wrapSource(map, sourceId);
  return state ? applySourceData(state, data, writer) : null;
}

export function getMapboxSourcePipelineDiagnostics(): PipelineDiagnostics {
  const sources: PipelineDiagnostics["sources"] = [];
  statesByMap.forEach((states) => {
    states.forEach((state) => sources.push({
      sourceId: state.sourceId,
      writesApplied: state.writesApplied,
      writesSuppressed: state.writesSuppressed,
      featureCount: state.lastFeatureCount,
      lastWriteDurationMs: Math.round(state.lastWriteDurationMs),
      maxWriteDurationMs: Math.round(state.maxWriteDurationMs),
    }));
  });
  return {
    middlewareCount: middlewares.size,
    sourceCount: sources.length,
    featureCount: sources.reduce((sum, source) => sum + source.featureCount, 0),
    middlewares: [...middlewares.values()].sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id)).map((middleware) => {
      const stats = statsFor(middleware.id);
      return { id: middleware.id, sourceId: middleware.sourceId, priority: middleware.priority, transformedWrites: stats.transformedWrites, suppressedWrites: stats.suppressedWrites };
    }),
    sources,
  };
}

installPipelineOwner();
window.__NETWORK_MAP_MAPBOX_SOURCE_PIPELINE__ = { getDiagnostics: getMapboxSourcePipelineDiagnostics };

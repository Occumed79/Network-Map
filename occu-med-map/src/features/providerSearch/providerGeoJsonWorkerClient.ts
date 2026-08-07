import type { MapInventoryProvider } from "./providerSearchClient";

type GeoJsonCollection = GeoJSON.FeatureCollection<GeoJSON.Point, Record<string, unknown>>;
type Pending = { resolve: (value: GeoJsonCollection) => void; reject: (reason?: unknown) => void; startedAt: number };

let worker: Worker | null = null;
let sequence = 0;
let transformations = 0;
let workerTransformations = 0;
let cancelledTransformations = 0;
let lastDurationMs = 0;
const pending = new Map<string, Pending>();

function diagnostics() {
  return { transformations, workerTransformations, cancelledTransformations, pending: pending.size, lastDurationMs: Math.round(lastDurationMs) };
}

function ensureWorker(): Worker | null {
  if (worker) return worker;
  if (typeof Worker === "undefined") return null;
  worker = new Worker(new URL("./providerGeoJson.worker.ts", import.meta.url), { type: "module", name: "provider-geojson" });
  worker.onmessage = (event: MessageEvent<{ requestId: string; collection: GeoJsonCollection; durationMs: number }>) => {
    const item = pending.get(event.data.requestId);
    if (!item) return;
    pending.delete(event.data.requestId);
    workerTransformations += 1;
    lastDurationMs = performance.now() - item.startedAt;
    item.resolve(event.data.collection);
  };
  worker.onerror = (event) => {
    const error = new Error(event.message || "Provider GeoJSON worker failed");
    for (const item of pending.values()) item.reject(error);
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

function inlineCollection(providers: MapInventoryProvider[], detail: "minimal" | "compact" | "full"): GeoJsonCollection {
  return {
    type: "FeatureCollection",
    features: providers.flatMap((provider) => {
      if (!Number.isFinite(provider.lat) || !Number.isFinite(provider.lng)) return [];
      const properties: Record<string, unknown> = {
        providerId: provider.id,
        name: provider.name,
        providerType: provider.providerType,
        trustTier: provider.trustTier,
        coordinateStatus: provider.coordinateStatus,
      };
      if (detail === "minimal") delete properties.providerType;
      return [{
        type: "Feature" as const,
        id: provider.featureId || `provider:${provider.id}`,
        geometry: { type: "Point" as const, coordinates: [Number(provider.lng), Number(provider.lat)] },
        properties,
      }];
    }),
  };
}

export async function providersToGeoJson(
  providers: MapInventoryProvider[],
  detail: "minimal" | "compact" | "full" = "compact",
  signal?: AbortSignal,
): Promise<GeoJsonCollection> {
  transformations += 1;
  const startedAt = performance.now();
  const background = providers.length >= 500 ? ensureWorker() : null;
  if (!background) {
    const collection = inlineCollection(providers, detail);
    lastDurationMs = performance.now() - startedAt;
    return collection;
  }

  const requestId = `geojson-${++sequence}`;
  return new Promise<GeoJsonCollection>((resolve, reject) => {
    const onAbort = () => {
      pending.delete(requestId);
      cancelledTransformations += 1;
      reject(signal?.reason || new DOMException("Provider GeoJSON transform cancelled", "AbortError"));
    };
    if (signal?.aborted) return onAbort();
    signal?.addEventListener("abort", onAbort, { once: true });
    pending.set(requestId, {
      startedAt,
      resolve(value) { signal?.removeEventListener("abort", onAbort); resolve(value); },
      reject(reason) { signal?.removeEventListener("abort", onAbort); reject(reason); },
    });
    background.postMessage({ requestId, providers, detail });
  });
}

export function providerGeoJsonDiagnostics() { return diagnostics(); }

export function disposeProviderGeoJsonWorker() {
  worker?.terminate();
  worker = null;
  for (const item of pending.values()) item.reject(new DOMException("Provider GeoJSON worker disposed", "AbortError"));
  pending.clear();
}

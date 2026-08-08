import { mapInventoryRequestDiagnostics } from "./features/providerSearch/providerSearchClient";
import { providerGeoJsonDiagnostics } from "./features/providerSearch/providerGeoJsonWorkerClient";

type LongTaskSummary = { count: number; totalDurationMs: number; maxDurationMs: number };
type MemorySummary = { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number };

declare global {
  interface Window {
    __NETWORK_MAP_PERFORMANCE__?: {
      snapshot: () => Record<string, unknown>;
      resetLongTasks: () => void;
    };
  }
}

let longTasks: LongTaskSummary = { count: 0, totalDurationMs: 0, maxDurationMs: 0 };
let observer: PerformanceObserver | null = null;

function memorySnapshot(): MemorySummary {
  const memory = (performance as Performance & { memory?: MemorySummary }).memory;
  return memory ? { usedJSHeapSize: memory.usedJSHeapSize, totalJSHeapSize: memory.totalJSHeapSize, jsHeapSizeLimit: memory.jsHeapSizeLimit } : {};
}

function mapboxLifecycle() {
  return (window as any).__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getDiagnostics?.() || null;
}
function leafletLifecycle() {
  return (window as any).__NETWORK_MAP_LEAFLET_LIFECYCLE__?.getDiagnostics?.() || null;
}
function sourcePipeline() {
  return (window as any).__NETWORK_MAP_MAPBOX_SOURCE_PIPELINE__?.getDiagnostics?.() || null;
}
function activeEngine(): string {
  const bodyMode = document.body?.dataset?.mapEngine || document.documentElement.dataset.mapEngine;
  if (bodyMode) return bodyMode;
  const mapbox = document.querySelector(".mapboxgl-map");
  return mapbox ? "mapbox" : "leaflet";
}

function snapshot() {
  const pipeline = sourcePipeline();
  return {
    capturedAt: new Date().toISOString(),
    activeEngine: activeEngine(),
    viewportRequests: mapInventoryRequestDiagnostics(),
    geoJsonWorker: providerGeoJsonDiagnostics(),
    mapboxLifecycle: mapboxLifecycle(),
    leafletLifecycle: leafletLifecycle(),
    mapboxSources: pipeline,
    featureCount: Array.isArray(pipeline?.sources)
      ? pipeline.sources.reduce((sum: number, source: any) => sum + Number(source.featureCount || 0), 0)
      : 0,
    sourceCount: Number(pipeline?.sourceCount || 0),
    memory: memorySnapshot(),
    longTasks: { ...longTasks },
  };
}

if ("PerformanceObserver" in window) {
  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration < 50) continue;
        longTasks.count += 1;
        longTasks.totalDurationMs += entry.duration;
        longTasks.maxDurationMs = Math.max(longTasks.maxDurationMs, entry.duration);
      }
    });
    observer.observe({ type: "longtask", buffered: true } as PerformanceObserverInit);
  } catch {
    observer = null;
  }
}

window.__NETWORK_MAP_PERFORMANCE__ = {
  snapshot,
  resetLongTasks: () => { longTasks = { count: 0, totalDurationMs: 0, maxDurationMs: 0 }; },
};

window.addEventListener("beforeunload", () => observer?.disconnect(), { once: true });

export {};

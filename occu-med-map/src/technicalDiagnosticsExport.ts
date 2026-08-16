type DiagnosticsApi = {
  snapshot: () => Promise<Record<string, unknown>>;
  download: () => Promise<void>;
};

declare global {
  interface Window {
    __NETWORK_MAP_TECHNICAL_DIAGNOSTICS__?: DiagnosticsApi;
  }
}

function safeValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[TRUNCATED]";
  if (typeof value === "string") {
    return value
      .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
      .replace(/(?:sk|sk-proj)-[A-Za-z0-9_-]+/g, "[REDACTED_TOKEN]")
      .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
      .slice(0, 2000);
  }
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => safeValue(item, depth + 1));
  if (!value || typeof value !== "object") return value;
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (/authorization|cookie|secret|token|password|api.?key|connection|string/i.test(key)) result[key] = "[REDACTED]";
    else result[key] = safeValue(nested, depth + 1);
  }
  return result;
}

async function backendSnapshot(): Promise<Record<string, unknown>> {
  try {
    const response = await fetch("/api/diagnostics/export", { headers: { Accept: "application/json" }, cache: "no-store" });
    const requestId = response.headers.get("x-request-id");
    const payload = await response.json().catch(() => ({}));
    return { ok: response.ok, requestId, payload: safeValue(payload) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function snapshot(): Promise<Record<string, unknown>> {
  const runtime = window as any;
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    location: { pathname: location.pathname, search: location.search },
    viewport: { width: innerWidth, height: innerHeight, devicePixelRatio: window.devicePixelRatio },
    boot: safeValue(runtime.__NETWORK_MAP_BOOT__?.snapshot?.() || runtime.__NETWORK_MAP_BOOT__ || null),
    runtimeOwnership: safeValue(runtime.__NETWORK_MAP_RUNTIME_OWNERSHIP__?.snapshot?.() || null),
    uiIntegrity: safeValue(runtime.__NETWORK_MAP_GENERAL_UI__?.lastResult || runtime.__NETWORK_MAP_GENERAL_UI__?.audit?.() || null),
    sidebarIntegrity: safeValue(runtime.__NETWORK_MAP_UI_INTEGRITY__?.lastResult || runtime.__NETWORK_MAP_UI_INTEGRITY__?.audit?.() || null),
    mapPerformance: safeValue(runtime.__NETWORK_MAP_PERFORMANCE__?.snapshot?.() || null),
    sceneLifecycle: safeValue(runtime.__NETWORK_MAP_SCENE_LIFECYCLE__?.getDiagnostics?.() || null),
    mapboxLifecycle: safeValue(runtime.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getDiagnostics?.() || null),
    mapboxSources: safeValue(runtime.__NETWORK_MAP_MAPBOX_SOURCE_PIPELINE__?.getDiagnostics?.() || null),
    networkPipeline: safeValue(runtime.__NETWORK_MAP_NETWORK_PIPELINE__?.getDiagnostics?.() || runtime.__NETWORK_MAP_NETWORK_REQUESTS__?.snapshot?.() || null),
    backend: await backendSnapshot(),
  };
}

async function download(): Promise<void> {
  const report = await snapshot();
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `network-map-diagnostics-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

window.__NETWORK_MAP_TECHNICAL_DIAGNOSTICS__ = { snapshot, download };

export { snapshot as getTechnicalDiagnostics, download as downloadTechnicalDiagnostics };

type ProviderLayerStatusDetail = {
  source?: string;
  loaded?: number;
  total?: number;
  rendered?: number;
  successfullyLoaded?: boolean;
  transientFailure?: boolean;
  fromCache?: boolean;
  stale?: boolean;
  warning?: string;
  pagesLoaded?: number;
  visibleCapped?: boolean;
  timestamp?: number;
};

type SourceMetric = {
  source: string;
  loaded: number;
  total: number;
  rendered: number;
  successfullyLoaded: boolean;
  transientFailure: boolean;
  fromCache: boolean;
  stale: boolean;
  warning: string;
  pagesLoaded: number;
  updatedAt: number;
};

type OverlayMetric = {
  label: string;
  records: number;
  updatedAt: number;
};

declare global {
  interface Window {
    __networkMapProviderMetrics?: {
      sources: Record<string, SourceMetric>;
      overlays: Record<string, OverlayMetric>;
      enabledSources: string[];
      loadedRecords: number;
      renderedRecords: number;
    };
  }
}

const SOURCE_KEYS = ["indexed", "bluehive", "dentists", "my-clinics"] as const;
const sourceMetrics = new Map<string, SourceMetric>();
const overlayMetrics = new Map<string, OverlayMetric>();
const delegatedFetch = window.fetch.bind(window);
let updateTimer: number | null = null;
let mutationObserver: MutationObserver | null = null;

function asUrl(input: RequestInfo | URL): URL | null {
  try {
    if (input instanceof Request) return new URL(input.url, window.location.origin);
    return new URL(input.toString(), window.location.origin);
  } catch {
    return null;
  }
}

function normalizeSourceKey(value: string): string | null {
  const normalized = value.trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (normalized.includes("bluehive")) return "bluehive";
  if (normalized.includes("dentist")) return "dentists";
  if (normalized.includes("indexed")) return "indexed";
  if (normalized.includes("my-clinics") || normalized.includes("my-clinic")) return "my-clinics";
  return null;
}

function sourceKeyFromInput(input: HTMLInputElement): string | null {
  return normalizeSourceKey(input.getAttribute("aria-label") || input.name || input.id || "");
}

function sourceInputs(): Array<{ key: string; input: HTMLInputElement; row: HTMLElement | null }> {
  const result: Array<{ key: string; input: HTMLInputElement; row: HTMLElement | null }> = [];
  document.querySelectorAll<HTMLInputElement>(".workflow-layer input[type='checkbox']").forEach((input) => {
    const key = sourceKeyFromInput(input);
    if (!key || !SOURCE_KEYS.includes(key as typeof SOURCE_KEYS[number])) return;
    result.push({ key, input, row: input.closest<HTMLElement>(".workflow-layer") });
  });
  return result;
}

function enabledSourceKeys(): Set<string> {
  return new Set(sourceInputs().filter(({ input }) => input.checked).map(({ key }) => key));
}

function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function formatNumber(value: number): string {
  return Math.max(0, Math.trunc(value)).toLocaleString();
}

function setText(element: Element | null, value: string): void {
  if (element && element.textContent !== value) element.textContent = value;
}

function scheduleUpdate(): void {
  if (updateTimer !== null) window.clearTimeout(updateTimer);
  updateTimer = window.setTimeout(() => {
    updateTimer = null;
    updateUi();
  }, 60);
}

function markOverlay(label: string, records = 0): void {
  overlayMetrics.set(label, {
    label,
    records: safeNumber(records),
    updatedAt: Date.now(),
  });
  scheduleUpdate();
}

function clearOverlay(label: string): void {
  if (overlayMetrics.delete(label)) scheduleUpdate();
}

function overlayLabelForUrl(url: URL): string | null {
  if (url.pathname.startsWith("/api/provider-explorer/")) return "Provider Explorer";
  if (url.pathname.startsWith("/api/map-inventory")) return "Service Presence";
  if (
    url.pathname.startsWith("/api/live-finder") ||
    url.pathname.startsWith("/api/provider-sources/search") ||
    url.hostname.includes("overpass")
  ) return "Live Finder";
  return null;
}

function recordsFromPayload(payload: Record<string, unknown>): number {
  const direct = [payload.total, payload.count, payload.loaded, payload.stored_count, payload.live_count]
    .map(safeNumber)
    .find((value) => value > 0);
  if (direct) return direct;
  for (const key of ["providers", "results", "cells", "live_only", "clinics"]) {
    const value = payload[key];
    if (Array.isArray(value)) return value.length;
  }
  return 0;
}

async function observeOverlayResponse(url: URL, response: Response): Promise<void> {
  const label = overlayLabelForUrl(url);
  if (!label || !response.ok) return;
  try {
    const payload = await response.clone().json() as unknown;
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      markOverlay(label, recordsFromPayload(payload as Record<string, unknown>));
    } else {
      markOverlay(label, 0);
    }
  } catch {
    markOverlay(label, 0);
  }
}

window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const response = await delegatedFetch(input, init);
  const url = asUrl(input);
  if (url && !url.pathname.startsWith("/api/provider-layers/")) {
    void observeOverlayResponse(url, response);
  }
  return response;
}) as typeof window.fetch;

function ensureStyles(): void {
  if (document.getElementById("provider-layer-telemetry-styles")) return;
  const style = document.createElement("style");
  style.id = "provider-layer-telemetry-styles";
  style.textContent = `
    .provider-counter-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
      margin-top: 9px;
    }
    .provider-counter-metric {
      min-width: 0;
      padding: 6px 7px;
      border: 1px solid rgba(105, 139, 183, 0.2);
      border-radius: 8px;
      background: rgba(10, 24, 45, 0.36);
    }
    .provider-counter-metric strong,
    .provider-counter-metric span {
      display: block;
    }
    .provider-counter-metric strong {
      color: #eef7ff;
      font: 700 11px/1.15 'IBM Plex Mono', monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .provider-counter-metric span {
      margin-top: 2px;
      color: #7890aa;
      font: 600 7px/1.2 'IBM Plex Mono', monospace;
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    .provider-counter-metric[data-provider-metric='overlays'] {
      grid-column: 1 / -1;
    }
    .provider-source-health strong {
      white-space: nowrap;
    }
  `;
  document.head.appendChild(style);
}

function ensureCounterGrid(heroSummary: Element): HTMLElement {
  const existing = heroSummary.parentElement?.querySelector<HTMLElement>(".provider-counter-grid");
  if (existing) return existing;
  const grid = document.createElement("div");
  grid.className = "provider-counter-grid";
  const metrics = [
    ["enabled", "Enabled sources"],
    ["loaded", "Loaded sources"],
    ["records", "Loaded records"],
    ["rendered", "Rendered in viewport"],
    ["overlays", "Independent overlays"],
  ];
  for (const [key, label] of metrics) {
    const metric = document.createElement("div");
    metric.className = "provider-counter-metric";
    metric.dataset.providerMetric = key;
    const value = document.createElement("strong");
    value.textContent = "0";
    const caption = document.createElement("span");
    caption.textContent = label;
    metric.append(value, caption);
    grid.appendChild(metric);
  }
  heroSummary.insertAdjacentElement("afterend", grid);
  return grid;
}

function updateMetric(grid: HTMLElement, key: string, value: string, title = ""): void {
  const metric = grid.querySelector<HTMLElement>(`[data-provider-metric='${key}']`);
  if (!metric) return;
  setText(metric.querySelector("strong"), value);
  if (metric.title !== title) metric.title = title;
}

function updateSourceRows(enabled: Set<string>): void {
  for (const { key, input, row } of sourceInputs()) {
    const status = row?.querySelector<HTMLElement>(".workflow-layer-status");
    const metric = sourceMetrics.get(key);
    if (!status) continue;
    if (!input.checked) {
      if (metric?.successfullyLoaded) {
        setText(status, `${formatNumber(metric.loaded)} cached · toggle off`);
      }
      continue;
    }
    if (!enabled.has(key) || !metric) {
      setText(status, "Enabled · waiting to load");
      continue;
    }
    if (!metric.successfullyLoaded || metric.transientFailure) {
      setText(status, "Enabled · temporary load failure");
      status.title = metric.warning || "The source remains enabled and will retry.";
      continue;
    }
    const suffix = metric.stale ? " · cached fallback" : metric.fromCache ? " · cached" : "";
    setText(status, `${formatNumber(metric.loaded)} loaded · ${formatNumber(metric.rendered)} rendered${suffix}`);
    status.title = `${formatNumber(metric.total)} matching records · ${metric.pagesLoaded} database page${metric.pagesLoaded === 1 ? "" : "s"}`;
  }
}

function updateUi(): void {
  ensureStyles();
  const enabled = enabledSourceKeys();
  const enabledMetrics = [...enabled]
    .map((key) => sourceMetrics.get(key))
    .filter((metric): metric is SourceMetric => Boolean(metric));
  const successfullyLoaded = enabledMetrics.filter((metric) => metric.successfullyLoaded && !metric.transientFailure);
  const loadedRecords = successfullyLoaded.reduce((sum, metric) => sum + metric.loaded, 0);
  const renderedRecords = successfullyLoaded.reduce((sum, metric) => sum + metric.rendered, 0);
  const activeOverlays = [...overlayMetrics.values()];
  const overlayNames = activeOverlays.map((overlay) => overlay.label).join(", ") || "None";

  const header = document.querySelector<HTMLElement>(".provider-source-health");
  if (header) {
    setText(header.querySelector("strong"), `${enabled.size} enabled`);
    const spans = header.querySelectorAll("span");
    setText(spans.length ? spans[spans.length - 1] : null, `${successfullyLoaded.length} loaded`);
    header.title = [
      `${enabled.size} provider sources enabled`,
      `${successfullyLoaded.length} successfully loaded`,
      `${formatNumber(loadedRecords)} records loaded`,
      `${formatNumber(renderedRecords)} records rendered in the viewport`,
      `${activeOverlays.length} independent overlays: ${overlayNames}`,
    ].join(" · ");
  }

  const heroSummary = document.querySelector<HTMLElement>(".hero-source-summary");
  if (heroSummary) {
    setText(heroSummary.querySelector("span"), `${formatNumber(loadedRecords)} loaded records`);
    setText(heroSummary.querySelector("strong"), `${formatNumber(renderedRecords)} rendered in viewport`);
    const grid = ensureCounterGrid(heroSummary);
    updateMetric(grid, "enabled", String(enabled.size), [...enabled].join(", ") || "No provider sources enabled");
    updateMetric(grid, "loaded", String(successfullyLoaded.length), successfullyLoaded.map((metric) => metric.source).join(", ") || "No sources loaded yet");
    updateMetric(grid, "records", formatNumber(loadedRecords), "Provider records fetched for enabled source layers");
    updateMetric(grid, "rendered", formatNumber(renderedRecords), "Valid provider records inside the current viewport");
    updateMetric(grid, "overlays", String(activeOverlays.length), overlayNames);
  }

  updateSourceRows(enabled);
  window.__networkMapProviderMetrics = {
    sources: Object.fromEntries(sourceMetrics.entries()),
    overlays: Object.fromEntries(overlayMetrics.entries()),
    enabledSources: [...enabled],
    loadedRecords,
    renderedRecords,
  };
}

window.addEventListener("network-map:provider-layer-status", (event) => {
  const detail = (event as CustomEvent<ProviderLayerStatusDetail>).detail || {};
  const source = normalizeSourceKey(String(detail.source || ""));
  if (!source) return;
  sourceMetrics.set(source, {
    source,
    loaded: safeNumber(detail.loaded),
    total: safeNumber(detail.total),
    rendered: safeNumber(detail.rendered),
    successfullyLoaded: detail.successfullyLoaded === true,
    transientFailure: detail.transientFailure === true,
    fromCache: detail.fromCache === true,
    stale: detail.stale === true,
    warning: String(detail.warning || ""),
    pagesLoaded: Math.max(0, Math.trunc(safeNumber(detail.pagesLoaded))),
    updatedAt: safeNumber(detail.timestamp) || Date.now(),
  });
  scheduleUpdate();
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const sourceKey = sourceKeyFromInput(target);
  if (sourceKey) scheduleUpdate();
  const label = (target.getAttribute("aria-label") || "").toLowerCase();
  if (label.includes("service presence") && !target.checked) clearOverlay("Service Presence");
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest("button");
  const text = (button?.textContent || "").trim().toLowerCase();
  if (!text) return;
  if (text.includes("clear") && (text.includes("provider") || text.includes("map"))) {
    clearOverlay("Provider Explorer");
  }
  if (text.includes("clear") && (text.includes("live") || text.includes("result"))) {
    clearOverlay("Live Finder");
  }
});

function start(): void {
  ensureStyles();
  scheduleUpdate();
  if (!document.body) {
    window.addEventListener("DOMContentLoaded", start, { once: true });
    return;
  }
  mutationObserver?.disconnect();
  mutationObserver = new MutationObserver(() => scheduleUpdate());
  mutationObserver.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "aria-expanded"],
  });
}

start();

export {};

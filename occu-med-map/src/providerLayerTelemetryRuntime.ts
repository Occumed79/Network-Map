/**
 * Provider layer telemetry runtime.
 *
 * Keeps database inventory totals separate from records loaded/rendered for the
 * current viewport. The old UI presented a viewport-limited BlueHive count as
 * though it were the full source inventory.
 */

import {
  registerRuntimeOwner,
  runWithoutSharedDomObservation,
  subscribeToSharedDomObserver,
} from "./runtimeControllerRegistry";

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
  viewportTotal: number;
  rendered: number;
  successfullyLoaded: boolean;
  transientFailure: boolean;
  fromCache: boolean;
  stale: boolean;
  warning: string;
  pagesLoaded: number;
  updatedAt: number;
};

type SourceKey = "indexed" | "bluehive" | "dentists" | "my-clinics";

declare global {
  interface Window {
    __networkMapProviderMetrics?: {
      sources: Record<string, SourceMetric>;
      sourceTotals: Record<string, number>;
      overlays: Record<string, never>;
      enabledSources: string[];
      selectedSourceRecords: number;
      loadedRecords: number;
      renderedRecords: number;
    };
  }
}

const SOURCE_KEYS: SourceKey[] = ["indexed", "bluehive", "dentists", "my-clinics"];
const SOURCE_QUERY: Record<SourceKey, string> = {
  indexed: "indexed",
  bluehive: "bluehive",
  dentists: "dentists",
  "my-clinics": "my-clinics",
};

const sourceMetrics = new Map<string, SourceMetric>();
const sourceTotals = new Map<SourceKey, number>();
let updateTimer: number | null = null;
let inventoryRequest: Promise<void> | null = null;

function normalizeSourceKey(value: string): SourceKey | null {
  const normalized = value.trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (normalized.includes("bluehive")) return "bluehive";
  if (normalized.includes("dentist")) return "dentists";
  if (normalized.includes("indexed")) return "indexed";
  if (normalized.includes("my-clinics") || normalized.includes("my-clinic")) return "my-clinics";
  return null;
}

function sourceKeyFromInput(input: HTMLInputElement): SourceKey | null {
  return normalizeSourceKey(input.getAttribute("aria-label") || input.name || input.id || "");
}

function sourceInputs(): Array<{ key: SourceKey; input: HTMLInputElement; row: HTMLElement | null }> {
  const result: Array<{ key: SourceKey; input: HTMLInputElement; row: HTMLElement | null }> = [];
  document.querySelectorAll<HTMLInputElement>(".workflow-layer input[type='checkbox']").forEach((input) => {
    const key = sourceKeyFromInput(input);
    if (!key || !SOURCE_KEYS.includes(key)) return;
    result.push({ key, input, row: input.closest<HTMLElement>(".workflow-layer") });
  });
  return result;
}

function enabledSourceKeys(): Set<SourceKey> {
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

function setAttributeIfChanged(element: Element, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

function scheduleUpdate(): void {
  if (updateTimer !== null) window.clearTimeout(updateTimer);
  updateTimer = window.setTimeout(() => {
    updateTimer = null;
    updateUi();
  }, 60);
}

function clearOverlay(label: string): void {
  scheduleUpdate();
  void label;
}

function inventoryTotal(key: SourceKey): number | null {
  const value = sourceTotals.get(key);
  return value === undefined ? null : value;
}

async function fetchSourceInventoryTotal(key: SourceKey): Promise<void> {
  const params = new URLSearchParams({
    mode: "records",
    source: SOURCE_QUERY[key],
    page: "1",
    limit: "1",
    includeLive: "false",
    includeCandidates: "false",
    includeSaved: key === "my-clinics" ? "true" : "false",
  });
  const response = await fetch(`/api/provider-explorer?${params.toString()}`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json().catch(() => null) as { total?: unknown; error?: unknown } | null;
  if (!payload || payload.error) throw new Error(String(payload?.error || "Invalid provider inventory response"));
  sourceTotals.set(key, safeNumber(payload.total));
}

function refreshInventoryTotals(): Promise<void> {
  if (inventoryRequest) return inventoryRequest;
  inventoryRequest = Promise.allSettled(SOURCE_KEYS.map((key) => fetchSourceInventoryTotal(key)))
    .then(() => {
      scheduleUpdate();
      window.dispatchEvent(new CustomEvent("network-map:provider-inventory-totals", {
        detail: Object.fromEntries(sourceTotals.entries()),
      }));
    })
    .finally(() => {
      inventoryRequest = null;
    });
  return inventoryRequest;
}

function sourceStatusText(key: SourceKey, input: HTMLInputElement, metric: SourceMetric | undefined): string {
  const inventory = inventoryTotal(key);
  const prefix = inventory === null ? "" : `${formatNumber(inventory)} total`;

  if (!input.checked) return prefix ? `${prefix} · off` : "Off";
  if (!metric) return prefix ? `${prefix} · loading…` : "Loading…";
  if (!metric.successfullyLoaded || metric.transientFailure) {
    return prefix ? `${prefix} · load failed` : "Temporary load failure";
  }

  const suffix = metric.stale ? " · cached fallback" : metric.fromCache ? " · cached" : "";
  const visible = `${formatNumber(metric.rendered)} in view${suffix}`;
  return prefix ? `${prefix} · ${visible}` : visible;
}

function updateSourceButtons(enabled: Set<SourceKey>): void {
  const inputs = sourceInputs();
  SOURCE_KEYS.forEach((key) => {
    const button = document.querySelector<HTMLButtonElement>(`.unified-source-tool[data-source-key='${key}']`);
    if (!button) return;
    const input = inputs.find((entry) => entry.key === key)?.input;
    const count = button.querySelector<HTMLElement>(".unified-source-count");
    if (!input) {
      setText(count, "Source unavailable");
      return;
    }
    const metric = sourceMetrics.get(key);
    const status = sourceStatusText(key, input, metric);
    setText(count, status);
    button.title = status;
    const isEnabled = enabled.has(key);
    button.classList.toggle("active", isEnabled);
    setAttributeIfChanged(button, "aria-pressed", String(isEnabled));
  });
}

function updateLegacySourceRows(enabled: Set<SourceKey>): void {
  for (const { key, input, row } of sourceInputs()) {
    const status = row?.querySelector<HTMLElement>(".workflow-layer-status");
    if (!status) continue;
    const metric = sourceMetrics.get(key);
    setText(status, sourceStatusText(key, input, metric));
    if (!enabled.has(key)) continue;
    const inventory = inventoryTotal(key);
    status.title = inventory === null
      ? "Full source inventory is being checked."
      : `${formatNumber(inventory)} records in the source database. Viewport loading is shown separately.`;
  }
}

function removeLegacyCounterGrid(): void {
  document.querySelectorAll<HTMLElement>(".provider-counter-grid").forEach((grid) => grid.remove());
}

function updateUi(): void {
  const enabled = enabledSourceKeys();
  const enabledMetrics = [...enabled]
    .map((key) => sourceMetrics.get(key))
    .filter((metric): metric is SourceMetric => Boolean(metric));
  const successfullyLoaded = enabledMetrics.filter((metric) => metric.successfullyLoaded && !metric.transientFailure);
  const loadedRecords = successfullyLoaded.reduce((sum, metric) => sum + metric.loaded, 0);
  const renderedRecords = successfullyLoaded.reduce((sum, metric) => sum + metric.rendered, 0);
  const selectedSourceRecords = [...enabled].reduce((sum, key) => sum + (inventoryTotal(key) || 0), 0);

  runWithoutSharedDomObservation(() => {
    const header = document.querySelector<HTMLElement>(".provider-source-health");
    if (header) {
      setText(header.querySelector("strong"), `${enabled.size} selected`);
      const spans = header.querySelectorAll("span");
      setText(spans.length ? spans[spans.length - 1] : null, `${successfullyLoaded.length} loaded`);
      header.title = [
        `${enabled.size} provider sources selected`,
        `${successfullyLoaded.length} successfully loaded`,
        `${formatNumber(selectedSourceRecords)} records across selected source inventories`,
        `${formatNumber(renderedRecords)} rendered in the current viewport`,
      ].join(" · ");
    }

    const heroSummary = document.querySelector<HTMLElement>(".hero-source-summary");
    if (heroSummary) {
      const sourceRecordLabel = sourceTotals.size
        ? `${formatNumber(selectedSourceRecords)} selected-source records`
        : `${formatNumber(loadedRecords)} records loaded for this view`;
      setText(heroSummary.querySelector("span"), sourceRecordLabel);
      setText(heroSummary.querySelector("strong"), `${formatNumber(renderedRecords)} rendered in viewport`);
      heroSummary.title = "Database source totals and current viewport rendering are intentionally shown as separate numbers.";
    }

    removeLegacyCounterGrid();
    updateSourceButtons(enabled);
    updateLegacySourceRows(enabled);
  });

  window.__networkMapProviderMetrics = {
    sources: Object.fromEntries(sourceMetrics.entries()),
    sourceTotals: Object.fromEntries(sourceTotals.entries()),
    overlays: {},
    enabledSources: [...enabled],
    selectedSourceRecords,
    loadedRecords,
    renderedRecords,
  };
}

function installProviderLayerTelemetry(): void {
  if (!registerRuntimeOwner("provider-layer-telemetry", "Provider source inventory and viewport telemetry")) return;

  window.addEventListener("network-map:provider-layer-status", (event) => {
    const detail = (event as CustomEvent<ProviderLayerStatusDetail>).detail || {};
    const source = normalizeSourceKey(String(detail.source || ""));
    if (!source) return;
    sourceMetrics.set(source, {
      source,
      loaded: safeNumber(detail.loaded),
      viewportTotal: safeNumber(detail.total),
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
    if (label.includes("naccho") && !target.checked) clearOverlay("NACCHO LHD");
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("button");
    const text = (button?.textContent || "").trim().toLowerCase();
    if (!text) return;
    if (text.includes("clear") && (text.includes("provider") || text.includes("map"))) clearOverlay("Provider Explorer");
    if (text.includes("clear") && (text.includes("live") || text.includes("result"))) clearOverlay("Live Places");
  });

  subscribeToSharedDomObserver("provider-layer-telemetry", (mutations) => {
    if (!mutations.some((mutation) => {
      const target = mutation.target instanceof Element ? mutation.target : null;
      if (target?.closest(".provider-source-health, .hero-source-summary, .workflow-layer, .unified-source-tool")) return true;
      return Array.from(mutation.addedNodes).some((node) => node instanceof Element && Boolean(node.matches(".provider-source-health, .hero-source-summary, .workflow-layer, .unified-source-tool") || node.querySelector(".provider-source-health, .hero-source-summary, .workflow-layer, .unified-source-tool")));
    })) return;
    scheduleUpdate();
  });

  scheduleUpdate();
  void refreshInventoryTotals();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", installProviderLayerTelemetry, { once: true });
} else {
  installProviderLayerTelemetry();
}

export {};

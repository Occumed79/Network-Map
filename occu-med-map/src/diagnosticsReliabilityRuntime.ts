import L from "leaflet";

type DiagnosticLabel =
  | "State Labels"
  | "Timezone Overlay"
  | "Population Density"
  | "State Color Fill"
  | "City Dots";

const STATE_DEPENDENT_LABELS = new Set<DiagnosticLabel>([
  "State Labels",
  "Timezone Overlay",
  "Population Density",
  "State Color Fill",
  "City Dots",
]);

let canonicalMap: L.Map | null = null;
let stateLayerReady = false;
let replaying = false;
let refreshTimer: number | null = null;
let replayTimer: number | null = null;
let pulseLayer: L.LayerGroup | null = null;
let pulseInProgress = false;

function visibleMapSync(): void {
  const sync = (window as any).__NETWORK_MAP_GLOBE__?.sync;
  if (typeof sync === "function") sync();
}

function pulseOverlayMirror(): void {
  const map = canonicalMap;
  if (!map || pulseInProgress) return;

  pulseInProgress = true;
  try {
    pulseLayer = L.layerGroup().addTo(map);
    map.removeLayer(pulseLayer);
    pulseLayer = null;
  } finally {
    pulseInProgress = false;
  }
}

function scheduleDiagnosticRefresh(): void {
  if (refreshTimer !== null) window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null;
    pulseOverlayMirror();
    visibleMapSync();
  }, 0);

  for (const delay of [120, 420, 950, 1_800, 3_000]) {
    window.setTimeout(() => {
      pulseOverlayMirror();
      visibleMapSync();
    }, delay);
  }
}

function diagnosticLabel(input: HTMLInputElement): DiagnosticLabel | null {
  const label = input
    .closest<HTMLElement>(".workflow-layer")
    ?.querySelector<HTMLElement>(".workflow-layer-name")
    ?.textContent
    ?.trim();

  return label && STATE_DEPENDENT_LABELS.has(label as DiagnosticLabel)
    ? label as DiagnosticLabel
    : null;
}

function checkedStateDependentInputs(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>(
    '.diagnostics-section .workflow-layer input[type="checkbox"]',
  )).filter((input) => input.checked && !input.disabled && Boolean(diagnosticLabel(input)));
}

function replayCheckedDiagnostics(): void {
  if (replaying || !stateLayerReady) return;
  const inputs = checkedStateDependentInputs();
  if (!inputs.length) {
    scheduleDiagnosticRefresh();
    return;
  }

  replaying = true;
  let index = 0;

  const replayNext = () => {
    const input = inputs[index];
    index += 1;

    if (!input) {
      replaying = false;
      scheduleDiagnosticRefresh();
      return;
    }

    if (!input.isConnected || !input.checked || input.disabled) {
      window.setTimeout(replayNext, 20);
      return;
    }

    input.click();
    window.setTimeout(() => {
      if (input.isConnected && !input.checked && !input.disabled) input.click();
      scheduleDiagnosticRefresh();
      window.setTimeout(replayNext, 90);
    }, 70);
  };

  replayNext();
}

function scheduleReplay(delay = 100): void {
  if (replayTimer !== null) window.clearTimeout(replayTimer);
  replayTimer = window.setTimeout(() => {
    replayTimer = null;
    replayCheckedDiagnostics();
  }, delay);
}

function isStateBoundaryLayer(layer: L.Layer): boolean {
  if (!(layer instanceof L.GeoJSON)) return false;
  let childCount = 0;
  layer.eachLayer(() => {
    childCount += 1;
  });
  return childCount >= 20;
}

function bindMap(map: L.Map): void {
  canonicalMap = map;

  map.on("layeradd", (event: L.LayerEvent) => {
    if (pulseInProgress || event.layer === pulseLayer) return;
    if (isStateBoundaryLayer(event.layer)) {
      stateLayerReady = true;
      scheduleReplay(120);
    }
    visibleMapSync();
  });

  map.on("layerremove overlayadd overlayremove", () => {
    if (!pulseInProgress) visibleMapSync();
  });

  map.once("unload", () => {
    if (canonicalMap === map) canonicalMap = null;
  });
}

function patchLeafletMapFactory(): void {
  const originalMap = L.map.bind(L);
  (L as any).map = (element: string | HTMLElement, options?: L.MapOptions) => {
    const map = originalMap(element, options);
    bindMap(map);
    return map;
  };
}

function patchGeoJsonStyleRefresh(): void {
  const prototype = L.GeoJSON.prototype as L.GeoJSON & {
    __occumedDiagnosticsStylePatched?: boolean;
  };
  if (prototype.__occumedDiagnosticsStylePatched) return;

  const originalSetStyle = prototype.setStyle;
  prototype.setStyle = function patchedSetStyle(style: L.PathOptions | L.StyleFunction): L.GeoJSON {
    const result = originalSetStyle.call(this, style);
    scheduleDiagnosticRefresh();
    return result;
  };
  prototype.__occumedDiagnosticsStylePatched = true;
}

function installDiagnosticDomListeners(): void {
  document.addEventListener("change", (event) => {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    if (!input?.matches('.diagnostics-section input[type="checkbox"]')) return;
    scheduleDiagnosticRefresh();
    if (input.checked && stateLayerReady && diagnosticLabel(input)) scheduleReplay(350);
  }, true);

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest(".diagnostics-section")) return;
    scheduleDiagnosticRefresh();
    if (target.closest(".diagnostics-toggle") && stateLayerReady) scheduleReplay(450);
  }, true);
}

patchLeafletMapFactory();
patchGeoJsonStyleRefresh();
installDiagnosticDomListeners();

export {};

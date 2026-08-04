import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "mapbox-gl/dist/mapbox-gl.css";
import "./adminApiRuntime";
import "./dualMapEngineRuntime";
import App from "./App";
import "./dual-map-engines.css";
import "./arcgis-leaflet-2d.css";
import "./dual-map-transition-opaque.css";
import "./map-engine-final-fixes.css";
import "./modal-command-polish.css";
import "./features/driveTime/nativeDriveTimeRuntime.css";
import "./index.css";
import "./professional-overrides.css";
import "./professional-hardening.css";
import "./liquid-glass-theme.css";
import "./live-finder-ux.css";
import "./mapbox-intelligence.css";
import "./live-finder-eta-actions.css";
import "./luminous-shell-fixes.css";
import "./sidebar-control-fixes.css";
import "./modal-popup-fixes.css";
import "./modal-content-polish.css";
import "./performance-safety.css";
import "./app-shell-layout.css";
import "./workflow-ui.css";
import "./network-command-center.css";
import "./core-app-p2-fixes.css";
import "./ui-cascade-stabilization.css";

type ProviderSourceKey = "indexed" | "bluehive" | "dentists" | "my-clinics";

const SOURCE_PATH = /^\/api\/provider-layers\/(indexed|bluehive|dentists|my-clinics)$/;
const VISUALIZATION_PATH = /^\/api\/provider-explorer\/(density|hex|map)$/;
const explicitlyEnabledSources = new Set<ProviderSourceKey>();
let visualizationBudget = 0;
let visualizationDeadline = 0;

function normalizeSource(value: string): ProviderSourceKey | null {
  const normalized = value.trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (normalized.includes("bluehive")) return "bluehive";
  if (normalized.includes("dentist")) return "dentists";
  if (normalized.includes("indexed")) return "indexed";
  if (normalized.includes("my-clinics") || normalized.includes("my-clinic")) return "my-clinics";
  return null;
}

function installManualRequestGates(): void {
  document.addEventListener("change", (event) => {
    if (!event.isTrusted) return;
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "checkbox") return;
    const source = normalizeSource(input.getAttribute("aria-label") || input.name || input.id || "");
    if (!source) return;
    if (input.checked) explicitlyEnabledSources.add(source);
    else explicitlyEnabledSources.delete(source);
  }, true);

  document.addEventListener("click", (event) => {
    if (!event.isTrusted) return;
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLButtonElement>("button");
    if (!button) return;

    const sourceButton = button.closest<HTMLButtonElement>(".unified-source-tool[data-source-key]");
    if (sourceButton) {
      const source = normalizeSource(sourceButton.dataset.sourceKey || "");
      if (source) {
        const active = sourceButton.classList.contains("active") || sourceButton.getAttribute("aria-pressed") === "true";
        if (active) explicitlyEnabledSources.delete(source);
        else explicitlyEnabledSources.add(source);
      }
    }

    const text = (button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    const visualizationControl = Boolean(button.closest(".provider-visualization-grid, .provider-mode-switch"))
      || text.includes("view all matching as density")
      || text.includes("density + points")
      || text.includes("dot density")
      || text.includes("hex field")
      || text === "density"
      || text.includes("8px points")
      || text.includes("refresh map");

    if (visualizationControl) {
      visualizationBudget = 4;
      visualizationDeadline = Date.now() + 15_000;
      document.body.dataset.providerDensityUserEnabled = "true";
    }
  }, true);

  const originalFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    let url: URL | null = null;
    try {
      const raw = input instanceof Request ? input.url : input.toString();
      url = new URL(raw, window.location.origin);
    } catch {
      url = null;
    }

    if (url?.origin === window.location.origin) {
      const sourceMatch = url.pathname.match(SOURCE_PATH);
      const source = sourceMatch?.[1] as ProviderSourceKey | undefined;
      if (source && !explicitlyEnabledSources.has(source)) {
        return Promise.resolve(new Response(JSON.stringify({
          providers: [], count: 0, loaded: 0, total: 0, source,
          all: false, hasMore: false, visibleCapped: false,
          manualActivationRequired: true,
        }), {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8" },
        }));
      }

      const visualizationMatch = url.pathname.match(VISUALIZATION_PATH);
      if (visualizationMatch) {
        const allowed = visualizationBudget > 0 && Date.now() <= visualizationDeadline;
        if (!allowed) {
          const payload = visualizationMatch[1] === "map"
            ? { providers: [], total: 0, count: 0, manualActivationRequired: true }
            : { cells: [], total: 0, count: 0, manualActivationRequired: true };
          return Promise.resolve(new Response(JSON.stringify(payload), {
            status: 200,
            headers: { "content-type": "application/json; charset=utf-8" },
          }));
        }
        visualizationBudget -= 1;
      }
    }

    return originalFetch(input, init);
  }) as typeof window.fetch;
}

async function safeLoad(name: string, loader: () => Promise<unknown>): Promise<void> {
  try {
    await loader();
  } catch (error) {
    console.error(`Network Map optional runtime failed: ${name}`, error);
  }
}

async function loadOptionalRuntimes(): Promise<void> {
  await safeLoad("Mapbox load hardening", () => import("./mapboxGlobeLoadHardeningRuntime"));
  await safeLoad("transition sound and cleanup", () => import("./mapEngineFinalFixRuntime"));
  await safeLoad("map transition", () => import("./dualMapTransitionRuntime"));

  await Promise.allSettled([
    safeLoad("provider tools", () => import("./unifiedProviderToolsRuntime")),
    safeLoad("map tools", () => import("./mapToolsCommandPanel")),
    safeLoad("right panel", () => import("./rightPanelCompactor")),
    safeLoad("live finder tools", () => import("./liveFinderDriveTools")),
    safeLoad("U.S. diagnostics", () => import("./usDiagnosticsGate")),
    safeLoad("drive time", () => import("./features/driveTime/nativeDriveTimeRuntime")),
  ]);
}

installManualRequestGates();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Network Map root element is missing");
const root = createRoot(rootElement);
const phaseTwoPreview = new URLSearchParams(window.location.search).get("p2-preview") === "1";

async function boot(): Promise<void> {
  if (!phaseTwoPreview) {
    root.render(<App />);
    window.setTimeout(() => { void loadOptionalRuntimes(); }, 0);
    return;
  }

  try {
    await Promise.all([
      import("./phaseTwoMapBridge"),
      import("./phase-two-shell.css"),
      import("./phase-two-control-fix.css"),
    ]);
    const { default: PhaseTwoShell } = await import("./PhaseTwoShell");
    root.render(<PhaseTwoShell><App /></PhaseTwoShell>);
  } catch (error) {
    console.error("Phase Two preview failed; loading standard map", error);
    root.render(<App />);
  }
  window.setTimeout(() => { void loadOptionalRuntimes(); }, 0);
}

void boot();

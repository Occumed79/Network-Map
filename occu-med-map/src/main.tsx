import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "mapbox-gl/dist/mapbox-gl.css";
import "./leafletMapLifecycleRuntime";
import "./mapboxMapLifecycleRuntime";
import "./mapboxSourcePipelineRuntime";
import "./networkRequestPipelineRuntime";
import "./uploadedDatasetLabelRuntime";
import "./adminApiRuntime";
import "./mapControlsBridgeRuntime";
import "./diagnosticsReliabilityRuntime";
import "./mapToolsCommandPanel";
import "./routePlannerControlsRuntime";
import "./healthsitesFlatDotsRuntime";
import "./providerLocationFinderRuntime";
import "./providerTypeNormalizationRuntime";
import "./dualMapEngineRuntime";
import "./providerExplorerStabilityRuntime";
import "./mapOverlaySynchronizationControllerRuntime";
import App from "./App";
import "./dual-map-engines.css";
import "./dual-map-transition-opaque.css";
import "./map-engine-final-fixes.css";
import "./features/driveTime/nativeDriveTimeRuntime.css";
import "./index.css";
import "./liquid-glass-theme.css";
import "./live-finder-ux.css";
import "./mapbox-intelligence.css";
import "./live-finder-eta-actions.css";
import "./performance-safety.css";
import "./app-shell-layout.css";
import "./workflow-ui.css";
import "./network-command-center.css";
import "./core-app-p2.css";
import "./map-tools-visible.css";
import "./luxury-futuristic-shell.css";
import "./map-tools-reliability.css";
import "./provider-location-finder.css";
import "./sidebar-button-theme.css";
import "./sidebarWorkspaceControllerRuntime";
import "./sidebar-workspace-final-fixes.css";
import "./sidebarWorkspacePanelGuardRuntime";
import "./ui-system.css";
import "./dialogControllerRuntime";
import "./generalUiIntegrityRuntime";

async function safeLoad(name: string, loader: () => Promise<unknown>): Promise<void> {
  try {
    await loader();
  } catch (error) {
    console.error(`Network Map optional runtime failed: ${name}`, error);
  }
}

async function loadOptionalRuntimes(): Promise<void> {
  await safeLoad("Mapbox load hardening", () => import("./mapboxGlobeLoadHardeningRuntime"));
  await safeLoad("map engine cleanup", () => import("./mapEngineFinalFixRuntime"));

  // Do not import dualMapTransitionRuntime during startup/idle. That module owns
  // a large embedded audio payload and eagerly creates/loads an HTMLAudioElement
  // at evaluation time. Chromium and WebKit can wedge their renderer while that
  // payload initializes, even though the application has already painted and is
  // otherwise healthy. Core 2D/3D switching is owned by dualMapEngineRuntime and
  // remains available through the direct control handler below. The cinematic
  // transition can be reintroduced only after its audio/animation setup is made
  // interaction-lazy and proven non-blocking across engines.

  await Promise.allSettled([
    safeLoad("provider source selection persistence", () => import("./providerSourceSelectionPersistenceRuntime")),
    safeLoad("provider layer telemetry", () => import("./providerLayerTelemetryRuntime")),
    safeLoad("map performance telemetry", () => import("./mapPerformanceTelemetryRuntime")),
    safeLoad("technical diagnostics export", () => import("./technicalDiagnosticsExport")),
    safeLoad("right panel", () => import("./rightPanelCompactor")),
    safeLoad("live finder tools", () => import("./liveFinderDriveTools")),
    safeLoad("U.S. diagnostics", () => import("./usDiagnosticsGate")),
    safeLoad("drive time", () => import("./features/driveTime/nativeDriveTimeRuntime")),
  ]);
}

function installDirectMapModeSwitching(): void {
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLButtonElement>(".map-dimension-toggle button[data-map-mode]");
    if (!button || button.disabled) return;

    const control = button.closest<HTMLElement>(".map-dimension-toggle");
    const globe = window.__NETWORK_MAP_GLOBE__;
    if (!control || !globe) return;

    const mode = button.dataset.mapMode === "3d" ? "3d" : "2d";
    if (globe.getMode() === mode) return;

    event.preventDefault();
    control.dataset.transitioning = "true";
    control.querySelectorAll<HTMLButtonElement>("button[data-map-mode]").forEach((candidate) => {
      candidate.disabled = true;
    });

    void globe.setMode(mode).catch((error) => {
      console.error("Map engine switch failed", error);
    }).finally(() => {
      control.querySelectorAll<HTMLButtonElement>("button[data-map-mode]").forEach((candidate) => {
        candidate.disabled = false;
      });
      control.dataset.transitioning = "false";
    });
  });
}

function scheduleOptionalRuntimes(): void {
  const idleWindow = window as typeof window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  };
  const start = () => { void loadOptionalRuntimes(); };

  // Do not let optional compatibility/telemetry runtimes race React's initial
  // commit. The first usable application frame owns startup; optional work is
  // admitted only after the browser has had a paint opportunity and an idle
  // slice, with a bounded fallback for browsers without requestIdleCallback.
  window.requestAnimationFrame(() => {
    if (idleWindow.requestIdleCallback) {
      idleWindow.requestIdleCallback(start, { timeout: 1600 });
      return;
    }
    window.setTimeout(start, 180);
  });
}

installDirectMapModeSwitching();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Network Map root element is missing");
const root = createRoot(rootElement);
const phaseTwoPreview = new URLSearchParams(window.location.search).get("p2-preview") === "1";

async function boot(): Promise<void> {
  if (!phaseTwoPreview) {
    root.render(<App />);
    scheduleOptionalRuntimes();
    return;
  }

  try {
    await Promise.all([
      import("./phaseTwoMapBridge"),
      import("./phase-two-shell.css"),
      import("./phase-two-controls.css"),
    ]);
    const { default: PhaseTwoShell } = await import("./PhaseTwoShell");
    root.render(<PhaseTwoShell><App /></PhaseTwoShell>);
  } catch (error) {
    console.error("Phase Two preview failed; loading standard map", error);
    root.render(<App />);
  }
  scheduleOptionalRuntimes();
}

void boot();

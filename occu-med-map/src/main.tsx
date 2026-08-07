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

declare global {
  interface Window {
    __NETWORK_MAP_BOOT_TRACE__?: string[];
  }
}

const urlParams = new URLSearchParams(window.location.search);
const bootTraceEnabled = urlParams.get("ci-boot-trace") === "1";
let bootHeartbeat = 0;
let bootHeartbeatTimer: number | null = null;

function traceBoot(stage: string): void {
  if (!bootTraceEnabled) return;
  const entry = `${new Date().toISOString()} ${stage}`;
  const trace = window.__NETWORK_MAP_BOOT_TRACE__ || (window.__NETWORK_MAP_BOOT_TRACE__ = []);
  trace.push(entry);
  if (trace.length > 200) trace.splice(0, trace.length - 200);
  console.info(`[network-map-boot] ${stage}`);
}

if (bootTraceEnabled) {
  window.__NETWORK_MAP_BOOT_TRACE__ = [];
  traceBoot("module-evaluated");
  bootHeartbeatTimer = window.setInterval(() => {
    bootHeartbeat += 1;
    traceBoot(`heartbeat:${bootHeartbeat}`);
    if (bootHeartbeat >= 120 && bootHeartbeatTimer !== null) {
      window.clearInterval(bootHeartbeatTimer);
      bootHeartbeatTimer = null;
    }
  }, 500);
}

async function safeLoad(name: string, loader: () => Promise<unknown>): Promise<void> {
  traceBoot(`optional-start:${name}`);
  try {
    await loader();
    traceBoot(`optional-complete:${name}`);
  } catch (error) {
    traceBoot(`optional-error:${name}:${error instanceof Error ? error.message : String(error)}`);
    console.error(`Network Map optional runtime failed: ${name}`, error);
  }
}

async function loadOptionalRuntimes(): Promise<void> {
  traceBoot("optional-sequence-start");
  await safeLoad("Mapbox load hardening", () => import("./mapboxGlobeLoadHardeningRuntime"));
  await safeLoad("transition sound and cleanup", () => import("./mapEngineFinalFixRuntime"));
  await safeLoad("map transition", () => import("./dualMapTransitionRuntime"));

  traceBoot("optional-parallel-start");
  await Promise.allSettled([
    safeLoad("provider source selection persistence", () => import("./providerSourceSelectionPersistenceRuntime")),
    safeLoad("provider layer telemetry", () => import("./providerLayerTelemetryRuntime")),
    safeLoad("right panel", () => import("./rightPanelCompactor")),
    safeLoad("live finder tools", () => import("./liveFinderDriveTools")),
    safeLoad("U.S. diagnostics", () => import("./usDiagnosticsGate")),
    safeLoad("drive time", () => import("./features/driveTime/nativeDriveTimeRuntime")),
  ]);
  traceBoot("optional-sequence-complete");
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Network Map root element is missing");
const root = createRoot(rootElement);
const phaseTwoPreview = urlParams.get("p2-preview") === "1";

async function boot(): Promise<void> {
  traceBoot(`boot-start:${phaseTwoPreview ? "p2" : "standard"}`);
  if (!phaseTwoPreview) {
    traceBoot("render-start:standard");
    root.render(<App />);
    traceBoot("render-returned:standard");
    window.setTimeout(() => {
      traceBoot("optional-timeout-fired");
      void loadOptionalRuntimes();
    }, 0);
    return;
  }

  try {
    traceBoot("p2-import-start");
    await Promise.all([
      import("./phaseTwoMapBridge"),
      import("./phase-two-shell.css"),
      import("./phase-two-controls.css"),
    ]);
    const { default: PhaseTwoShell } = await import("./PhaseTwoShell");
    traceBoot("render-start:p2");
    root.render(<PhaseTwoShell><App /></PhaseTwoShell>);
    traceBoot("render-returned:p2");
  } catch (error) {
    traceBoot(`p2-import-error:${error instanceof Error ? error.message : String(error)}`);
    console.error("Phase Two preview failed; loading standard map", error);
    root.render(<App />);
    traceBoot("render-returned:p2-fallback");
  }
  window.setTimeout(() => {
    traceBoot("optional-timeout-fired");
    void loadOptionalRuntimes();
  }, 0);
}

void boot();

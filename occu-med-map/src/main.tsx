import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "mapbox-gl/dist/mapbox-gl.css";
import "./adminApiRuntime";
import "./mapControlsBridgeRuntime";
import "./diagnosticsReliabilityRuntime";
import "./completeProviderPinMirrorRuntime";
import "./mapToolsCommandPanel";
import "./routePlannerControlsRuntime";
import "./healthsitesFlatDotsRuntime";
import "./providerLocationFinderRuntime";
import "./providerTypeNormalizationRuntime";
import "./dualMapEngineRuntime";
import App from "./App";
import "./dual-map-engines.css";
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
import "./map-tools-visible.css";
import "./luxury-futuristic-shell.css";
import "./map-tools-reliability.css";
import "./provider-location-finder.css";
import "./sidebar-button-theme.css";
import "./sidebarWorkspaceTabsRuntime";
import "./sidebarWorkspaceConsistencyRuntime";

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
    safeLoad("provider layer telemetry", () => import("./providerLayerTelemetryRuntime")),
    safeLoad("right panel", () => import("./rightPanelCompactor")),
    safeLoad("live finder tools", () => import("./liveFinderDriveTools")),
    safeLoad("U.S. diagnostics", () => import("./usDiagnosticsGate")),
    safeLoad("drive time", () => import("./features/driveTime/nativeDriveTimeRuntime")),
  ]);
}

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

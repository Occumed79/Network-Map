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
import AppErrorBoundary, { ApplicationFailureScreen } from "./AppErrorBoundary";
import {
  installGlobalBootDiagnostics,
  loadOptionalRuntime,
  markApplicationInteractive,
  markOptionalRuntimesComplete,
  recordBootFailure,
  setBootPhase,
} from "./startupDiagnostics";
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
import "./sidebarWorkspaceControllerRuntime";
import "./sidebar-workspace-final-fixes.css";
import "./sidebarWorkspacePanelGuardRuntime";
import "./liveFinderControlCleanupRuntime";
import "./general-ui-hardening.css";
import "./general-ui-visual-consistency.css";
import "./pdf-preview-hardening.css";
import "./startup-hardening.css";
import "./generalUiIntegrityRuntime";

async function safeLoad(name: string, loader: () => Promise<unknown>): Promise<void> {
  await loadOptionalRuntime(name, loader);
}

async function loadOptionalRuntimes(): Promise<void> {
  setBootPhase("optional-runtimes");
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
  markOptionalRuntimesComplete();
}

function scheduleOptionalRuntimes(): void {
  const idleWindow = window as typeof window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  };
  const start = () => { void loadOptionalRuntimes(); };
  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(start, { timeout: 1600 });
    return;
  }
  window.setTimeout(start, 180);
}

const rootHost = document.getElementById("root");
if (!rootHost) throw new Error("Network Map root element is missing");
const rootElement: HTMLElement = rootHost;
rootElement.setAttribute("aria-busy", "true");
installGlobalBootDiagnostics();
const root = createRoot(rootElement);
const phaseTwoPreview = new URLSearchParams(window.location.search).get("p2-preview") === "1";

function renderStandardApplication(): void {
  root.render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>,
  );
}

async function boot(): Promise<void> {
  setBootPhase("rendering");
  if (!phaseTwoPreview) {
    renderStandardApplication();
  } else {
    try {
      await Promise.all([
        import("./phaseTwoMapBridge"),
        import("./phase-two-shell.css"),
        import("./phase-two-control-fix.css"),
      ]);
      const { default: PhaseTwoShell } = await import("./PhaseTwoShell");
      root.render(
        <AppErrorBoundary>
          <PhaseTwoShell><App /></PhaseTwoShell>
        </AppErrorBoundary>,
      );
    } catch (error) {
      recordBootFailure("phase-two-preview", error, false);
      console.error("Phase Two preview failed; loading standard map", error);
      renderStandardApplication();
    }
  }

  window.requestAnimationFrame(() => markApplicationInteractive(rootElement));
  scheduleOptionalRuntimes();
}

void boot().catch((error) => {
  recordBootFailure("application-boot", error, true);
  setBootPhase("failed");
  rootElement.setAttribute("aria-busy", "false");
  root.render(
    <ApplicationFailureScreen
      title="Network Map could not start"
      message="The application stopped safely before entering a frozen state. Reload to retry the startup sequence."
    />,
  );
});

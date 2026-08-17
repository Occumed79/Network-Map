import { createRoot } from "react-dom/client";
import "mapbox-gl/dist/mapbox-gl.css";
import "./mapboxMapLifecycleRuntime";
import "./mapboxSourcePipelineRuntime";
import "./networkRequestPipelineRuntime";
import "./uploadedDatasetLabelRuntime";
import "./adminApiRuntime";
import "./mapControlsBridgeRuntime";
import "./mapToolsCommandPanel";
import "./routePlannerControlsRuntime";
import "./providerLocationFinderRuntime";
import "./providerTypeNormalizationRuntime";
import { switchMapModeWithTransition } from "./dualMapTransitionRuntime";
import "./providerExplorerRequestStabilityRuntime";
import "./providerExplorerExplicitVisualizationRuntime";
// Source selection is user-facing state, not optional telemetry. Install its
// change listener before React mounts so a fast user toggle can never be
// overwritten later by a lazily loaded default-selection restore.
import "./providerSourceSelectionPersistenceRuntime";
import App from "./App";
import ProviderLayerRegistryPanel from "./ProviderLayerRegistryPanel";
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
import "./black-hole-transition.css";
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
import "./sidebarWorkspacePanelGuardRuntime";
import "./ui-system.css";
import "./startup-hardening.css";
// The consolidated sidebar layer intentionally loads after every synchronous
// shell/theme stylesheet. It remains the owner of sidebar geometry, workspace
// visibility, hit testing, and scrolling. The following regression sheet only
// normalizes text close controls and the explicit-off Explorer presentation.
import "./sidebar-workspace-final-fixes.css";
import "./sidebar-workspace-regression-fixes.css";
import "./dialogControllerRuntime";
import "./generalUiIntegrityRuntime";

async function safeLoad(name: string, loader: () => Promise<unknown>): Promise<void> {
  await loadOptionalRuntime(name, loader);
}

async function loadOptionalRuntimes(): Promise<void> {
  setBootPhase("optional-runtimes");
  await safeLoad("Mapbox load hardening", () => import("./mapboxGlobeLoadHardeningRuntime"));
  await safeLoad("map engine cleanup", () => import("./mapEngineFinalFixRuntime"));

  await Promise.allSettled([
    safeLoad("provider layer telemetry", () => import("./providerLayerTelemetryRuntime")),
    safeLoad("map performance telemetry", () => import("./mapPerformanceTelemetryRuntime")),
    safeLoad("technical diagnostics export", () => import("./technicalDiagnosticsExport")),
    safeLoad("right panel", () => import("./rightPanelCompactor")),
    safeLoad("live finder tools", () => import("./liveFinderDriveTools")),
    safeLoad("U.S. diagnostics", () => import("./usDiagnosticsGate")),
    safeLoad("drive time", () => import("./features/driveTime/nativeDriveTimeRuntime")),
  ]);
  markOptionalRuntimesComplete();
}

function installMapModeSwitching(): void {
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLButtonElement>(".map-dimension-toggle button[data-map-mode]");
    if (!button || button.disabled) return;

    const control = button.closest<HTMLElement>(".map-dimension-toggle");
    if (!control || !window.__NETWORK_MAP_GLOBE__) return;

    const mode = button.dataset.mapMode === "3d" ? "3d" : "2d";
    if (window.__NETWORK_MAP_GLOBE__.getMode() === mode) return;

    event.preventDefault();
    void switchMapModeWithTransition(mode, control);
  });
}

function scheduleOptionalRuntimes(): void {
  const idleWindow = window as typeof window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  };
  const start = () => { void loadOptionalRuntimes(); };

  window.requestAnimationFrame(() => {
    if (idleWindow.requestIdleCallback) {
      idleWindow.requestIdleCallback(start, { timeout: 1600 });
      return;
    }
    window.setTimeout(start, 180);
  });
}

installMapModeSwitching();
installGlobalBootDiagnostics();

const rootHost = document.getElementById("root");
if (!rootHost) {
  recordBootFailure("application-root", new Error("Network Map root element is missing"), true);
  throw new Error("Network Map root element is missing");
}
const rootElement: HTMLElement = rootHost;
rootElement.setAttribute("aria-busy", "true");
const root = createRoot(rootElement);
const phaseTwoPreview = new URLSearchParams(window.location.search).get("p2-preview") === "1";

function renderStandardApplication(): void {
  root.render(
    <AppErrorBoundary>
      <>
        <App />
        <ProviderLayerRegistryPanel />
      </>
    </AppErrorBoundary>,
  );
}

function markInitialRenderComplete(): void {
  window.requestAnimationFrame(() => {
    markApplicationInteractive(rootElement);
    scheduleOptionalRuntimes();
  });
}

async function boot(): Promise<void> {
  setBootPhase("rendering");
  if (!phaseTwoPreview) {
    renderStandardApplication();
    markInitialRenderComplete();
    return;
  }

  try {
    await Promise.all([
      import("./phaseTwoMapBridge"),
      import("./phase-two-shell.css"),
      import("./phase-two-controls.css"),
    ]);
    const { default: PhaseTwoShell } = await import("./PhaseTwoShell");
    root.render(
      <AppErrorBoundary>
        <PhaseTwoShell>
          <App />
          <ProviderLayerRegistryPanel />
        </PhaseTwoShell>
      </AppErrorBoundary>,
    );
  } catch (error) {
    recordBootFailure("phase-two-preview", error, false);
    console.error("Phase Two preview failed; loading standard map", error);
    renderStandardApplication();
  }
  markInitialRenderComplete();
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

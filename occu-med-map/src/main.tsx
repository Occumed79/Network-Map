import { createRoot } from "react-dom/client";
import "./adminApiRuntime";
import "./mapboxLeafletRuntime";
import "./mapToolsCommandPanel";
import "./rightPanelCompactor";
import "./liveFinderDriveTools";
import "./usDiagnosticsGate";
import "./modal-command-polish.css";
import "./features/driveTime/nativeDriveTimeRuntime";
import "./features/driveTime/nativeDriveTimeRuntime.css";
import App from "./App";
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

const root = createRoot(document.getElementById("root")!);
const phaseTwoPreview = new URLSearchParams(window.location.search).get("p2-preview") === "1";

async function boot() {
  if (!phaseTwoPreview) {
    await Promise.all([
      import("./providerLayerRequestRuntime"),
      import("./providerLayerTelemetryRuntime"),
    ]);
    root.render(<App />);
    return;
  }

  await Promise.all([
    import("./phaseTwoPreviewIsolation"),
    import("./phaseTwoMapBridge"),
    import("./phase-two-shell.css"),
    import("./phase-two-control-fix.css"),
  ]);
  const { default: PhaseTwoShell } = await import("./PhaseTwoShell");
  root.render(
    <PhaseTwoShell>
      <App />
    </PhaseTwoShell>,
  );
}

void boot().catch((error) => {
  console.error("Network Map startup failed", error);
  root.render(<App />);
});

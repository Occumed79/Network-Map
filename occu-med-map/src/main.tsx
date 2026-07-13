import { createRoot } from "react-dom/client";
import "./adminApiRuntime";
import "./providerLayerRequestRuntime";
import "./providerLayerTelemetryRuntime";
import "./mapboxLeafletRuntime";
import "./mapToolsCommandPanel";
import "./phaseTwoMapBridge";
import "./phaseTwoLegacyLayerBridge";
import "./rightPanelCompactor";
import "./liveFinderDriveTools";
import "./usDiagnosticsGate";
import "./modal-command-polish.css";
import "./features/driveTime/nativeDriveTimeRuntime";
import "./features/driveTime/nativeDriveTimeRuntime.css";
import App from "./App";
import PhaseTwoShell from "./PhaseTwoShell";
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
import "./phase-two-legacy.css";

createRoot(document.getElementById("root")!).render(
  <PhaseTwoShell>
    <App />
  </PhaseTwoShell>,
);

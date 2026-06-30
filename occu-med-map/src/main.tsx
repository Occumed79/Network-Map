import { createRoot } from "react-dom/client";
import "./mapboxLeafletRuntime";
import "./mapToolsCommandPanel";
import "./rightPanelCompactor";
import App from "./App";
import "./index.css";
import "./professional-overrides.css";
import "./professional-hardening.css";
import "./liquid-glass-theme.css";
import "./live-finder-ux.css";
import "./mapbox-intelligence.css";
import "./live-finder-eta-actions.css";

createRoot(document.getElementById("root")!).render(<App />);

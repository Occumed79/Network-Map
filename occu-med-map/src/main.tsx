import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./professional-overrides.css";
import "./professional-hardening.css";
import "./liquid-glass-theme.css";

createRoot(document.getElementById("root")!).render(<App />);

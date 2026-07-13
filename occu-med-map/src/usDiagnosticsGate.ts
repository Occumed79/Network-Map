import "./us-diagnostics-gate.css";

let installed = false;
let lastState = "";
let syncTimer: number | null = null;

function diagnosticsButton(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".diagnostics-toggle");
}

function syncDiagnosticsClass(): void {
  const button = diagnosticsButton();
  const isOn = Boolean(button?.classList.contains("active"));
  const next = isOn ? "on" : "off";
  if (next === lastState) return;
  lastState = next;
  document.documentElement.classList.toggle("occumed-us-diagnostics-on", isOn);
  document.documentElement.classList.toggle("occumed-us-diagnostics-off", !isOn);
  window.dispatchEvent(new CustomEvent("occumed:us-diagnostics-gate", { detail: { enabled: isOn } }));
}

function scheduleDiagnosticsSync(delay = 80): void {
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    syncDiagnosticsClass();
  }, delay);
}

export function installUsDiagnosticsGate(): void {
  if (installed) return;
  installed = true;
  syncDiagnosticsClass();
  scheduleDiagnosticsSync(250);
  window.setTimeout(() => scheduleDiagnosticsSync(0), 900);
  document.addEventListener("click", () => scheduleDiagnosticsSync(0), true);
  const observer = new MutationObserver(() => scheduleDiagnosticsSync());
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
}

installUsDiagnosticsGate();

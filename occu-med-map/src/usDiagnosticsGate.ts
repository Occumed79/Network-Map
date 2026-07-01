let installed = false;
let lastState = "";

function diagnosticsButton(): HTMLElement | null {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>("button"));
  return buttons.find((button) => (button.textContent || "").trim().toLowerCase() === "u.s. diagnostics") || null;
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

export function installUsDiagnosticsGate(): void {
  if (installed) return;
  installed = true;
  syncDiagnosticsClass();
  window.setTimeout(syncDiagnosticsClass, 250);
  window.setTimeout(syncDiagnosticsClass, 900);
  document.addEventListener("click", () => window.setTimeout(syncDiagnosticsClass, 0), true);
  const observer = new MutationObserver(() => window.setTimeout(syncDiagnosticsClass, 80));
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
}

installUsDiagnosticsGate();

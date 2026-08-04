import "./us-diagnostics-gate.css";

let installed = false;
let lastState = "";
let syncTimer: number | null = null;
let mapSyncTimers: number[] = [];

function diagnosticsButton(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".diagnostics-toggle");
}

function syncVisibleMap(): void {
  const sync = (window as any).__NETWORK_MAP_GLOBE__?.sync;
  if (typeof sync === "function") sync();
}

function scheduleVisibleMapSync(): void {
  mapSyncTimers.forEach((timer) => window.clearTimeout(timer));
  mapSyncTimers = [0, 100, 350, 1_000].map((delay) => window.setTimeout(syncVisibleMap, delay));
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
  scheduleVisibleMapSync();
}

function scheduleDiagnosticsSync(delay = 80): void {
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    syncDiagnosticsClass();
  }, delay);
}

function isDiagnosticsInteraction(event: Event): boolean {
  const target = event.target instanceof Element ? event.target : null;
  return Boolean(target?.closest(".diagnostics-section, .local-pop-card, .tz-legend"));
}

export function installUsDiagnosticsGate(): void {
  if (installed) return;
  installed = true;
  syncDiagnosticsClass();
  scheduleDiagnosticsSync(250);
  window.setTimeout(() => scheduleDiagnosticsSync(0), 900);

  document.addEventListener("click", (event) => {
    scheduleDiagnosticsSync(0);
    if (isDiagnosticsInteraction(event)) scheduleVisibleMapSync();
  }, true);

  document.addEventListener("change", (event) => {
    if (!isDiagnosticsInteraction(event)) return;
    scheduleDiagnosticsSync(0);
    scheduleVisibleMapSync();
  }, true);

  const observer = new MutationObserver(() => scheduleDiagnosticsSync());
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
}

installUsDiagnosticsGate();

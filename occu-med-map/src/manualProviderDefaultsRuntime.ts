const SOURCE_SELECTION_KEY = "network-map:provider-source-selection-v3";
const SOURCE_INPUT_LABELS = [
  "Indexed Providers",
  "BlueHive Providers",
  "Dental Examiner Presence",
  "My Clinics",
] as const;
const DENSITY_INPUT_LABEL = "Luminous Density";

let initialized = false;
let scanQueued = false;

function setStoredSourcesOff(): void {
  try {
    localStorage.setItem(SOURCE_SELECTION_KEY, JSON.stringify({
      bluehive: false,
      indexed: false,
      dentists: false,
      "my-clinics": false,
    }));
  } catch {
    // Storage is optional. The DOM controls are still reset below.
  }
}

function inputByLabel(label: string): HTMLInputElement | null {
  const target = label.trim().toLowerCase();
  return Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
    .find((input) => (input.getAttribute("aria-label") || "").trim().toLowerCase() === target) || null;
}

function turnOff(input: HTMLInputElement | null): void {
  if (!input || input.disabled || !input.checked) return;
  input.click();
}

function applyManualDefaults(): void {
  SOURCE_INPUT_LABELS.forEach((label) => turnOff(inputByLabel(label)));
  turnOff(inputByLabel(DENSITY_INPUT_LABEL));

  const allPresent = SOURCE_INPUT_LABELS.every((label) => Boolean(inputByLabel(label)))
    && Boolean(inputByLabel(DENSITY_INPUT_LABEL));
  if (allPresent) {
    initialized = true;
    document.body.dataset.providerDefaultsReady = "true";
  }
}

function scheduleScan(): void {
  if (scanQueued || initialized) return;
  scanQueued = true;
  window.setTimeout(() => {
    scanQueued = false;
    applyManualDefaults();
  }, 0);
}

function installDensityGate(): void {
  if (document.getElementById("manual-provider-density-gate")) return;
  const style = document.createElement("style");
  style.id = "manual-provider-density-gate";
  style.textContent = `
    body:not([data-provider-density-user-enabled="true"]) .provider-density-field,
    body:not([data-provider-density-user-enabled="true"]) .provider-hex-field {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

function visualizationButton(target: Element): HTMLButtonElement | null {
  const button = target.closest<HTMLButtonElement>(".provider-visualization-grid button");
  return button || null;
}

function installUserActivationListeners(): void {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const visualization = visualizationButton(target);
    if (visualization) {
      document.body.dataset.providerDensityUserEnabled = "true";
      return;
    }

    const button = target.closest<HTMLButtonElement>("button");
    const text = (button?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (text.includes("clear filters") || text.includes("clear map")) {
      delete document.body.dataset.providerDensityUserEnabled;
    }
  }, true);
}

function initialize(): void {
  setStoredSourcesOff();
  installDensityGate();
  installUserActivationListeners();
  applyManualDefaults();

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.body, { childList: true, subtree: true });
}

setStoredSourcesOff();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
  initialize();
}

export {};

const SOURCE_SELECTION_KEY = "network-map:provider-source-selection-v3";
const OFF_BY_DEFAULT_LABELS = [
  "Indexed Providers",
  "BlueHive Providers",
  "Dental Examiner Presence",
  "My Clinics",
  "Luminous Density",
] as const;

let attempts = 0;
let timer: number | null = null;

function persistOffDefaults(): void {
  try {
    localStorage.setItem(SOURCE_SELECTION_KEY, JSON.stringify({
      bluehive: false,
      indexed: false,
      dentists: false,
      "my-clinics": false,
    }));
  } catch {
    // Local storage is optional.
  }
}

function findInput(label: string): HTMLInputElement | null {
  const wanted = label.toLowerCase();
  return Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
    .find(input => (input.getAttribute("aria-label") || "").trim().toLowerCase() === wanted) || null;
}

function turnOff(input: HTMLInputElement): void {
  if (!input.checked) return;
  const wasDisabled = input.disabled;
  if (wasDisabled) input.disabled = false;
  input.click();
  if (wasDisabled && input.isConnected) input.disabled = true;
}

function updateCopy(): void {
  document.querySelectorAll<HTMLElement>(".command-section-title small").forEach(node => {
    if ((node.textContent || "").trim().toLowerCase() === "all on by default") {
      node.textContent = "Off by default";
    }
  });
}

function applyDefaults(): boolean {
  updateCopy();
  const inputs = OFF_BY_DEFAULT_LABELS.map(findInput);
  inputs.forEach(input => { if (input) turnOff(input); });
  const complete = inputs.every(Boolean) && inputs.every(input => input?.checked === false);
  if (complete) {
    document.body.dataset.providerDefaultsReady = "true";
    delete document.body.dataset.providerDensityUserEnabled;
  }
  return complete;
}

function scan(): void {
  attempts += 1;
  if (applyDefaults() || attempts >= 160) {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    return;
  }
  timer = window.setTimeout(scan, 50);
}

function initialize(): void {
  persistOffDefaults();
  if (timer === null) scan();
}

persistOffDefaults();
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
else initialize();

export {};

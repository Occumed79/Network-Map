import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const runtimePath = path.join(root, "src/unifiedProviderToolsRuntime.ts");
const inventoryPath = path.join(root, "UI_CONTROL_INVENTORY.md");

const runtime = String.raw`import "./unified-provider-tools.css";
import {
  registerRuntimeOwner,
  runWithoutSharedDomObservation,
  subscribeToSharedDomObserver,
} from "./runtimeControllerRegistry";

type ProviderToolMode = "live" | "npi" | "explorer" | "";
type SourceKey = "bluehive" | "indexed" | "dentists" | "my-clinics";

const SOURCE_SELECTION_KEY = "network-map:provider-source-selection-v4";
const SOURCE_INPUT_LABELS: Record<SourceKey, string> = {
  bluehive: "BlueHive Providers",
  indexed: "Indexed Providers",
  dentists: "Dental Examiner Presence",
  "my-clinics": "My Clinics",
};
const DEFAULT_SOURCE_SELECTION: Record<SourceKey, boolean> = {
  bluehive: false,
  indexed: false,
  dentists: false,
  "my-clinics": false,
};

let installed = false;
let scanQueued = false;
let sourceSelectionInitialized = false;
let applyingStoredSelection = false;
let unsubscribeDomObserver: (() => void) | null = null;

function normalizedText(node: Element | null): string {
  return (node?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function findButton(scope: ParentNode, label: string): HTMLButtonElement | null {
  const needle = label.toLowerCase();
  return Array.from(scope.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
    normalizedText(button).includes(needle),
  ) || null;
}

function setMode(mode: ProviderToolMode): void {
  if (mode) document.body.dataset.providerTool = mode;
  else delete document.body.dataset.providerTool;
  scheduleScan();
}

function makeIcon(path: string): string {
  return \`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="\${path}"/></svg>\`;
}

function providerGrid(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".command-tool-grid");
}

function findSourceInput(key: SourceKey): HTMLInputElement | null {
  const expected = SOURCE_INPUT_LABELS[key].toLowerCase();
  return Array.from(document.querySelectorAll<HTMLInputElement>(".workflow-layer input[type='checkbox']"))
    .find((input) => (input.getAttribute("aria-label") || "").trim().toLowerCase() === expected) || null;
}

function currentSelection(): Record<SourceKey, boolean> {
  return Object.fromEntries((Object.keys(SOURCE_INPUT_LABELS) as SourceKey[]).map((key) => [key, Boolean(findSourceInput(key)?.checked)])) as Record<SourceKey, boolean>;
}

function readStoredSelection(): Record<SourceKey, boolean> {
  try {
    const parsed = JSON.parse(localStorage.getItem(SOURCE_SELECTION_KEY) || "null") as Partial<Record<SourceKey, boolean>> | null;
    if (!parsed) return { ...DEFAULT_SOURCE_SELECTION };
    return Object.fromEntries((Object.keys(SOURCE_INPUT_LABELS) as SourceKey[]).map((key) => [key, parsed[key] === true])) as Record<SourceKey, boolean>;
  } catch {
    return { ...DEFAULT_SOURCE_SELECTION };
  }
}

function persistSelection(): void {
  if (applyingStoredSelection) return;
  try {
    localStorage.setItem(SOURCE_SELECTION_KEY, JSON.stringify(currentSelection()));
  } catch {
    // Storage is optional; the source-owned React checkboxes still work without it.
  }
}

function initializeSourceSelection(): void {
  if (sourceSelectionInitialized) return;
  const keys = Object.keys(SOURCE_INPUT_LABELS) as SourceKey[];
  const inputs = keys.map(findSourceInput);
  if (inputs.some((input) => !input)) return;

  const desired = readStoredSelection();
  applyingStoredSelection = true;
  keys.forEach((key) => {
    const input = findSourceInput(key);
    if (!input || input.disabled || input.checked === desired[key]) return;
    input.click();
  });
  applyingStoredSelection = false;
  sourceSelectionInitialized = true;
  persistSelection();
}

function hiddenHeaderLauncher(label: string): HTMLButtonElement | null {
  return Array.from(document.querySelectorAll<HTMLButtonElement>(".command-header .command-action"))
    .find((button) => normalizedText(button).includes(label.toLowerCase())) || null;
}

function closeExplorerDrawer(): void {
  if (!document.querySelector(".provider-explorer-drawer.open")) return;
  hiddenHeaderLauncher("Provider Explorer")?.click();
}

function originalLiveButton(): HTMLButtonElement | null {
  const grid = providerGrid();
  return grid ? findButton(grid, "Live Places") || findButton(grid, "Live Finder") : null;
}

function closeLivePanel(): void {
  if (!document.querySelector(".live-panel.open")) return;
  originalLiveButton()?.click();
  setMode("");
}

function resetNpiStateForLiveMode(): void {
  const panel = document.querySelector<HTMLElement>(".live-panel.open .lp-inner");
  if (!panel) return;
  const npiGroup = Array.from(panel.querySelectorAll<HTMLElement>(".provider-tool-npi-only"));
  const allButton = npiGroup
    .flatMap((group) => Array.from(group.querySelectorAll<HTMLButtonElement>("button.lp-chip")))
    .find((button) => normalizedText(button) === "all");
  allButton?.click();
}

function ensureModeLaunchers(): void {
  const grid = providerGrid();
  if (!grid) return;

  const liveButton = findButton(grid, "Live Finder") || findButton(grid, "Live Places");
  if (!liveButton) return;
  liveButton.classList.add("unified-live-tool");
  if (!liveButton.dataset.unifiedBound) {
    liveButton.dataset.unifiedBound = "true";
    liveButton.addEventListener("click", () => {
      window.setTimeout(() => {
        if (document.querySelector(".live-panel.open")) {
          resetNpiStateForLiveMode();
          setMode("live");
        } else {
          setMode("");
        }
      }, 0);
    });
  }

  let npiButton = grid.querySelector<HTMLButtonElement>(".unified-npi-tool");
  if (!npiButton) {
    npiButton = document.createElement("button");
    npiButton.type = "button";
    npiButton.className = "unified-npi-tool";
    npiButton.innerHTML = \`\${makeIcon("M4 19.5V8.75L12 4l8 4.75V19.5M8 19.5v-5h8v5M9 10.5h.01M12 10.5h.01M15 10.5h.01")}<span>NPI Registry</span>\`;
    npiButton.addEventListener("click", () => {
      closeExplorerDrawer();
      if (!document.querySelector(".live-panel.open")) originalLiveButton()?.click();
      window.setTimeout(() => setMode("npi"), 0);
    });
    liveButton.insertAdjacentElement("afterend", npiButton);
  }

  let explorerButton = grid.querySelector<HTMLButtonElement>(".unified-explorer-tool");
  if (!explorerButton) {
    explorerButton = document.createElement("button");
    explorerButton.type = "button";
    explorerButton.className = "unified-explorer-tool";
    explorerButton.innerHTML = \`\${makeIcon("M4 6h16M7 12h10M10 18h4M8 3v6M16 9v6M12 15v6")}<span>Provider Explorer</span>\`;
    explorerButton.addEventListener("click", () => {
      closeLivePanel();
      const launcher = hiddenHeaderLauncher("Provider Explorer");
      if (!launcher) return;
      launcher.click();
      window.setTimeout(() => setMode(document.querySelector(".provider-explorer-drawer.open") ? "explorer" : ""), 0);
    });
    npiButton.insertAdjacentElement("afterend", explorerButton);
  }
}

function hideDuplicateLaunchers(): void {
  Array.from(document.querySelectorAll<HTMLButtonElement>(".command-header .command-action")).forEach((button) => {
    const text = normalizedText(button);
    if (text.includes("provider explorer") || text.includes("analysis")) {
      button.dataset.unifiedHiddenLauncher = "true";
      button.hidden = true;
      button.setAttribute("aria-hidden", "true");
      button.tabIndex = -1;
    }
  });
  document.querySelectorAll<HTMLElement>(".provider-explorer-launch").forEach((node) => {
    node.dataset.unifiedHiddenLauncher = "true";
    node.hidden = true;
    node.setAttribute("aria-hidden", "true");
  });
}

function markControlGroups(panel: HTMLElement): void {
  const controls = panel.querySelector<HTMLElement>(".lp-controls");
  if (!controls) return;
  const children = Array.from(controls.children) as HTMLElement[];
  const liveStart = children.findIndex((child) => normalizedText(child).startsWith("live source filters"));
  const npiStart = children.findIndex((child) => normalizedText(child).startsWith("u.s. npi filters"));
  children.forEach((child) => child.classList.remove("provider-tool-live-only", "provider-tool-npi-only"));
  if (liveStart >= 0) {
    const liveEnd = npiStart >= 0 ? npiStart : children.length;
    children.slice(liveStart, liveEnd).forEach((child) => child.classList.add("provider-tool-live-only"));
  }
  if (npiStart >= 0) children.slice(npiStart).forEach((child) => child.classList.add("provider-tool-npi-only"));
  Array.from(panel.querySelectorAll<HTMLElement>("button")).forEach((button) => {
    if (normalizedText(button).includes("export csv")) button.classList.add("provider-tool-live-only");
  });
}

function ensureModePrompt(panel: HTMLElement, mode: ProviderToolMode): void {
  const results = panel.querySelector<HTMLElement>(".lp-results");
  if (!results) return;
  let prompt = results.querySelector<HTMLElement>(".provider-tool-mode-prompt");
  if (!prompt) {
    prompt = document.createElement("div");
    prompt.className = "provider-tool-mode-prompt";
    results.prepend(prompt);
  }
  const resultText = normalizedText(results);
  const npiActive = resultText.includes("verified candidates")
    || resultText.includes("querying npi registry")
    || resultText.includes("no npi providers found");
  results.classList.toggle("provider-npi-results-active", npiActive);
  prompt.textContent = mode === "npi"
    ? "Choose a U.S. location, then select an NPI category or open Custom NPI Search."
    : "";
}

function updatePanelMode(): void {
  const mode = (document.body.dataset.providerTool || "") as ProviderToolMode;
  const panel = document.querySelector<HTMLElement>(".live-panel.open .lp-inner");
  if (!panel) return;
  markControlGroups(panel);
  panel.dataset.providerToolPanel = mode || "live";
  const title = panel.querySelector<HTMLElement>(".analysis-panel-title .lp-title");
  const subtitle = panel.querySelector<HTMLElement>(".analysis-panel-title small");
  const handle = panel.querySelector<HTMLElement>(".sheet-handle-label");
  if (mode === "npi") {
    if (title) title.textContent = "NPI Registry";
    if (subtitle) subtitle.textContent = "U.S. provider registry search";
    if (handle) handle.textContent = "NPI Registry";
  } else {
    if (title) title.textContent = "Live Places";
    if (subtitle) subtitle.textContent = "OpenStreetMap + Google Places";
    if (handle) handle.textContent = "Live Places";
  }
  ensureModePrompt(panel, mode || "live");
}

function syncActiveButtons(): void {
  const mode = (document.body.dataset.providerTool || "") as ProviderToolMode;
  const grid = providerGrid();
  if (!grid) return;
  const npiButton = grid.querySelector<HTMLButtonElement>(".unified-npi-tool");
  const explorerButton = grid.querySelector<HTMLButtonElement>(".unified-explorer-tool");
  npiButton?.classList.toggle("active", mode === "npi");
  npiButton?.setAttribute("aria-pressed", String(mode === "npi"));
  const explorerOpen = Boolean(document.querySelector(".provider-explorer-drawer.open"));
  explorerButton?.classList.toggle("active", explorerOpen);
  explorerButton?.setAttribute("aria-pressed", String(explorerOpen));
  if (mode === "explorer" && !explorerOpen) setMode("");
}

function scan(): void {
  ensureModeLaunchers();
  hideDuplicateLaunchers();
  initializeSourceSelection();
  updatePanelMode();
  syncActiveButtons();
}

function scheduleScan(): void {
  if (scanQueued) return;
  scanQueued = true;
  window.setTimeout(() => {
    scanQueued = false;
    runWithoutSharedDomObservation(scan);
  }, 40);
}

function mutationTouchesProviderTools(mutations: MutationRecord[]): boolean {
  return mutations.some((mutation) => {
    const target = mutation.target instanceof Element ? mutation.target : null;
    if (target?.closest(".command-tool-grid, .workflow-layer, .live-panel, .provider-explorer-drawer, .command-header")) return true;
    return Array.from(mutation.addedNodes).some((node) =>
      node instanceof Element
      && Boolean(node.matches(".command-tool-grid, .workflow-layer, .live-panel, .provider-explorer-drawer")
        || node.querySelector(".command-tool-grid, .workflow-layer, .live-panel, .provider-explorer-drawer")),
    );
  });
}

function handleSourceSelectionChange(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const label = (target.getAttribute("aria-label") || "").trim().toLowerCase();
  if (!(Object.values(SOURCE_INPUT_LABELS) as string[]).some((inputLabel) => inputLabel.toLowerCase() === label)) return;
  persistSelection();
  scheduleScan();
}

function cleanupUnifiedProviderTools(): void {
  unsubscribeDomObserver?.();
  unsubscribeDomObserver = null;
  document.removeEventListener("change", handleSourceSelectionChange);
}

export function installUnifiedProviderTools(): void {
  if (installed) return;
  if (!registerRuntimeOwner(
    "unified-provider-tools",
    "Finder/NPI/Explorer compatibility while remaining launchers migrate to React source ownership",
  )) return;
  installed = true;
  document.addEventListener("change", handleSourceSelectionChange);
  unsubscribeDomObserver = subscribeToSharedDomObserver("unified-provider-tools", (mutations) => {
    if (mutationTouchesProviderTools(mutations)) scheduleScan();
  });
  window.addEventListener("load", scheduleScan, { once: true });
  window.addEventListener("beforeunload", cleanupUnifiedProviderTools, { once: true });
  scheduleScan();
}

installUnifiedProviderTools();
`;

fs.writeFileSync(runtimePath, runtime);

let inventory = fs.readFileSync(inventoryPath, "utf8");
inventory = inventory.replace(
  "| Provider source controls | BlueHive, Indexed Providers, Dental Examiners, My Clinics | React checkboxes in `App.tsx`; compatibility buttons in `unifiedProviderToolsRuntime.ts` | **pending source migration**; opt-in defaults enforced | off by default; loading, loaded, failed, cached; repeated toggle stability |",
  "| Provider source controls | BlueHive, Indexed Providers, Dental Examiners, My Clinics | React checkboxes in `App.tsx`; runtime only persists opt-in selection | source-owned controls; opt-in defaults enforced | off by default; loading, loaded, failed, cached; repeated toggle stability |",
);
inventory = inventory.replace(
  "| Manage Clinics | clinic list / saved providers workflow | React action plus compatibility label/state adapter | pending source migration | open/close, empty/results, action feedback |",
  "| Manage Clinics | clinic list / saved providers workflow | React `App.tsx` | source-owned | open/close, empty/results, action feedback |",
);
inventory = inventory.replace(
  "The runtime-observer consolidation is complete only when CI confirms the registry is the sole MutationObserver owner. The major remaining source-ownership blocker is `unifiedProviderToolsRuntime.ts`: it still creates/hides/renames provider controls after React render. Those controls must move into React/source markup and state before this inventory can mark Finder/NPI/Explorer/provider-source controls as source-owned.",
  "Runtime-observer consolidation is complete: the registry is the sole application MutationObserver owner. `unifiedProviderToolsRuntime.ts` no longer creates replacement provider-source buttons, hides source rows, or relabels Manage Clinics. Its remaining source-ownership blocker is limited to Finder/NPI/Explorer mode launchers and duplicate-launcher compatibility; those controls must still move into React/source markup and state before #168 is complete.",
);
fs.writeFileSync(inventoryPath, inventory);

if (runtime.includes("unified-source-tool") || runtime.includes("unified-source-divider") || runtime.includes("simplifyLegacyLayerSection") || runtime.includes("Manage Clinics")) {
  throw new Error("Provider source compatibility UI mutations remain after migration");
}
console.log("Provider source controls and Manage Clinics returned to React source ownership; compatibility runtime narrowed to Finder/NPI/Explorer modes.");

import "./unified-provider-tools.css";

type ProviderToolMode = "live" | "npi" | "explorer" | "";
type SourceKey = "bluehive" | "indexed" | "dentists" | "my-clinics";

type SourceConfig = {
  key: SourceKey;
  label: string;
  inputLabel: string;
  iconPath: string;
};

// v4 intentionally invalidates selections saved before provider layers became
// opt-in. A stale `true` from v3 must not silently enable a source on startup.
const SOURCE_SELECTION_KEY = "network-map:provider-source-selection-v4";
const DEFAULT_SOURCE_SELECTION: Record<SourceKey, boolean> = {
  bluehive: false,
  indexed: false,
  dentists: false,
  "my-clinics": false,
};

const OBSERVER_OPTIONS: MutationObserverInit = {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden"],
};

const SOURCE_CONFIGS: SourceConfig[] = [
  {
    key: "bluehive",
    label: "BlueHive",
    inputLabel: "BlueHive Providers",
    iconPath: "M4 19V8l8-4 8 4v11M8 19v-6h8v6M9 9h.01M12 9h.01M15 9h.01",
  },
  {
    key: "indexed",
    label: "Indexed Providers",
    inputLabel: "Indexed Providers",
    iconPath: "M4 6h16M6 10h12M8 14h8M10 18h4",
  },
  {
    key: "dentists",
    label: "Dental Examiners",
    inputLabel: "Dental Examiner Presence",
    iconPath: "M8.5 4.5c1.1 0 2 .5 3.5.5s2.4-.5 3.5-.5c2.2 0 3.5 1.7 3.5 4 0 2.7-1.5 4.1-2.2 6.7-.6 2.3-1.2 4.3-2.6 4.3-1.1 0-1.2-3-2.2-3s-1.1 3-2.2 3c-1.4 0-2-2-2.6-4.3C6.5 12.6 5 11.2 5 8.5c0-2.3 1.3-4 3.5-4Z",
  },
  {
    key: "my-clinics",
    label: "My Clinics",
    inputLabel: "My Clinics",
    iconPath: "M5 20V7l7-4 7 4v13M9 20v-5h6v5M9 9h.01M12 9h.01M15 9h.01",
  },
];

let installed = false;
let scanQueued = false;
let sourceSelectionInitialized = false;
let applyingStoredSelection = false;
let observer: MutationObserver | null = null;
let observerConnected = false;

function normalizedText(node: Element | null): string {
  return (node?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function findButton(scope: ParentNode, label: string): HTMLButtonElement | null {
  const needle = label.toLowerCase();
  return Array.from(scope.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
    !button.classList.contains("unified-source-tool") && normalizedText(button).includes(needle),
  ) || null;
}

function setMode(mode: ProviderToolMode): void {
  if (mode) document.body.dataset.providerTool = mode;
  else delete document.body.dataset.providerTool;
  scheduleScan();
}

function makeIcon(path: string): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
}

function providerGrid(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".command-tool-grid");
}

function findSourceInput(key: SourceKey): HTMLInputElement | null {
  const config = SOURCE_CONFIGS.find((item) => item.key === key);
  if (!config) return null;
  const expected = config.inputLabel.toLowerCase();
  return Array.from(document.querySelectorAll<HTMLInputElement>(".workflow-layer input[type='checkbox']"))
    .find((input) => (input.getAttribute("aria-label") || "").trim().toLowerCase() === expected) || null;
}

function currentSelection(): Record<SourceKey, boolean> {
  return Object.fromEntries(SOURCE_CONFIGS.map(({ key }) => [key, Boolean(findSourceInput(key)?.checked)])) as Record<SourceKey, boolean>;
}

function readStoredSelection(): Record<SourceKey, boolean> {
  try {
    const parsed = JSON.parse(localStorage.getItem(SOURCE_SELECTION_KEY) || "null") as Partial<Record<SourceKey, boolean>> | null;
    if (!parsed) return { ...DEFAULT_SOURCE_SELECTION };
    return Object.fromEntries(SOURCE_CONFIGS.map(({ key }) => [key, parsed[key] === true])) as Record<SourceKey, boolean>;
  } catch {
    return { ...DEFAULT_SOURCE_SELECTION };
  }
}

function persistSelection(): void {
  if (applyingStoredSelection) return;
  try {
    localStorage.setItem(SOURCE_SELECTION_KEY, JSON.stringify(currentSelection()));
  } catch {
    // Storage is optional; the controls still work without it.
  }
}

function initializeSourceSelection(): void {
  if (sourceSelectionInitialized) return;
  const inputs = SOURCE_CONFIGS.map(({ key }) => findSourceInput(key));
  if (inputs.some((input) => !input)) return;

  const desired = readStoredSelection();
  applyingStoredSelection = true;
  SOURCE_CONFIGS.forEach(({ key }) => {
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

function closeOtherWorkspaces(): void {
  closeExplorerDrawer();
  closeLivePanel();
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

function removeDirectoriesTool(): void {
  const grid = providerGrid();
  const directoriesButton = grid ? findButton(grid, "Directories") : null;
  if (directoriesButton) {
    directoriesButton.hidden = true;
    directoriesButton.style.display = "none";
    directoriesButton.disabled = true;
    directoriesButton.setAttribute("aria-hidden", "true");
    directoriesButton.tabIndex = -1;
  }

  document.querySelectorAll<HTMLElement>(".workflow-directory-modal").forEach((modal) => {
    const backdrop = modal.closest<HTMLElement>(".modal-backdrop");
    const target = backdrop || modal;
    target.hidden = true;
    target.style.display = "none";
    target.setAttribute("aria-hidden", "true");
  });
}

function makeSourceButton(config: SourceConfig): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "unified-source-tool";
  button.dataset.sourceKey = config.key;
  button.innerHTML = `${makeIcon(config.iconPath)}<span class="unified-source-copy"><strong>${config.label}</strong><small class="unified-source-count">Choose layer</small></span>`;
  button.addEventListener("click", () => {
    closeOtherWorkspaces();
    const input = findSourceInput(config.key);
    if (!input || input.disabled) return;
    input.click();
    persistSelection();
    setMode("");
    scheduleScan();
  });
  return button;
}

function ensureUnifiedButtons(): void {
  const grid = providerGrid();
  if (!grid) return;

  const liveButton = findButton(grid, "Live Finder") || findButton(grid, "Live Places");
  if (!liveButton) return;

  liveButton.classList.add("unified-live-tool");
  const liveLabel = liveButton.querySelector("span");
  if (liveLabel && liveLabel.textContent !== "Live Places") liveLabel.textContent = "Live Places";
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
    npiButton.innerHTML = `${makeIcon("M4 19.5V8.75L12 4l8 4.75V19.5M8 19.5v-5h8v5M9 10.5h.01M12 10.5h.01M15 10.5h.01")}<span>NPI Registry</span>`;
    npiButton.addEventListener("click", () => {
      closeExplorerDrawer();
      const currentLiveButton = originalLiveButton();
      if (!document.querySelector(".live-panel.open")) currentLiveButton?.click();
      window.setTimeout(() => setMode("npi"), 0);
    });
    liveButton.insertAdjacentElement("afterend", npiButton);
  }

  let explorerButton = grid.querySelector<HTMLButtonElement>(".unified-explorer-tool");
  if (!explorerButton) {
    explorerButton = document.createElement("button");
    explorerButton.type = "button";
    explorerButton.className = "unified-explorer-tool";
    explorerButton.innerHTML = `${makeIcon("M4 6h16M7 12h10M10 18h4M8 3v6M16 9v6M12 15v6")}<span>Provider Explorer</span>`;
    explorerButton.addEventListener("click", () => {
      closeLivePanel();
      const launcher = hiddenHeaderLauncher("Provider Explorer");
      if (!launcher) return;
      launcher.click();
      window.setTimeout(() => setMode(document.querySelector(".provider-explorer-drawer.open") ? "explorer" : ""), 0);
    });
    npiButton.insertAdjacentElement("afterend", explorerButton);
  }

  let divider = grid.querySelector<HTMLElement>(".unified-source-divider");
  if (!divider) {
    divider = document.createElement("div");
    divider.className = "unified-source-divider";
    divider.innerHTML = "<span>Stored map sources</span><small>Select one or more</small>";
    explorerButton.insertAdjacentElement("afterend", divider);
  }

  let insertAfter: Element = divider;
  SOURCE_CONFIGS.forEach((config) => {
    let button = grid.querySelector<HTMLButtonElement>(`.unified-source-tool[data-source-key='${config.key}']`);
    if (!button) button = makeSourceButton(config);
    if (button.previousElementSibling !== insertAfter) insertAfter.insertAdjacentElement("afterend", button);
    insertAfter = button;
  });

  const manageClinicsButton = findButton(grid, "My Clinics");
  if (manageClinicsButton) {
    const label = manageClinicsButton.querySelector("span");
    if (label && label.textContent !== "Manage Clinics") label.textContent = "Manage Clinics";
    if (!manageClinicsButton.dataset.unifiedClinicBound) {
      manageClinicsButton.dataset.unifiedClinicBound = "true";
      manageClinicsButton.addEventListener("click", () => {
        closeExplorerDrawer();
        const input = findSourceInput("my-clinics");
        if (input && !input.checked && !input.disabled) input.click();
        persistSelection();
        setMode("");
      });
    }
  }

  Array.from(grid.querySelectorAll<HTMLButtonElement>("button")).forEach((button) => {
    if (
      button === liveButton || button === npiButton || button === explorerButton ||
      button.classList.contains("unified-source-tool") || button.dataset.unifiedOtherBound
    ) return;
    button.dataset.unifiedOtherBound = "true";
    button.addEventListener("click", () => {
      window.setTimeout(() => {
        closeExplorerDrawer();
        setMode("");
      }, 0);
    });
  });
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

function simplifyLegacyLayerSection(): void {
  document.querySelectorAll<HTMLElement>(".workflow-layer").forEach((row) => {
    const input = row.querySelector<HTMLInputElement>("input[type='checkbox']");
    const inputLabel = (input?.getAttribute("aria-label") || "").trim().toLowerCase();
    if (SOURCE_CONFIGS.some((config) => config.inputLabel.toLowerCase() === inputLabel)) {
      row.dataset.unifiedHiddenSourceRow = "true";
      row.hidden = true;
    }
  });

  const sourceRow = findSourceInput("bluehive")?.closest<HTMLElement>(".workflow-layer");
  const section = sourceRow?.closest<HTMLElement>("section.sb-section");
  if (!section) return;
  const title = section.querySelector<HTMLElement>(".command-section-title span");
  const hint = section.querySelector<HTMLElement>(".command-section-title small");
  if (title) title.textContent = "Map Overlays";
  if (hint) hint.textContent = "Optional";
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
    const text = normalizedText(button);
    if (text.includes("export csv")) button.classList.add("provider-tool-live-only");
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
  explorerButton?.classList.toggle("active", Boolean(document.querySelector(".provider-explorer-drawer.open")));
  explorerButton?.setAttribute("aria-pressed", String(Boolean(document.querySelector(".provider-explorer-drawer.open"))));

  SOURCE_CONFIGS.forEach(({ key }) => {
    const button = grid.querySelector<HTMLButtonElement>(`.unified-source-tool[data-source-key='${key}']`);
    const input = findSourceInput(key);
    if (!button || !input) return;
    button.classList.toggle("active", input.checked);
    button.disabled = input.disabled;
    button.setAttribute("aria-pressed", String(input.checked));
  });

  if (mode === "explorer" && !document.querySelector(".provider-explorer-drawer.open")) setMode("");
}

function scan(): void {
  ensureUnifiedButtons();
  removeDirectoriesTool();
  hideDuplicateLaunchers();
  simplifyLegacyLayerSection();
  initializeSourceSelection();
  updatePanelMode();
  syncActiveButtons();
}

function connectObserver(): void {
  if (!observer || observerConnected || !document.body) return;
  observer.observe(document.body, OBSERVER_OPTIONS);
  observerConnected = true;
}

function scanWithoutObservingOwnChanges(): void {
  const reconnect = observerConnected;
  if (reconnect) {
    observer?.disconnect();
    observerConnected = false;
  }

  try {
    scan();
  } finally {
    if (reconnect) connectObserver();
  }
}

function scheduleScan(): void {
  if (scanQueued) return;
  scanQueued = true;
  window.setTimeout(() => {
    scanQueued = false;
    scanWithoutObservingOwnChanges();
  }, 40);
}

export function installUnifiedProviderTools(): void {
  if (installed) return;
  installed = true;

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!SOURCE_CONFIGS.some(({ inputLabel }) => inputLabel.toLowerCase() === (target.getAttribute("aria-label") || "").trim().toLowerCase())) return;
    persistSelection();
    scheduleScan();
  });

  observer = new MutationObserver(scheduleScan);
  connectObserver();
  window.addEventListener("load", scheduleScan, { once: true });
  scheduleScan();
}

installUnifiedProviderTools();

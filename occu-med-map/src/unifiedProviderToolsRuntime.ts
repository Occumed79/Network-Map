import "./unified-provider-tools.css";

type ProviderToolMode = "live" | "npi" | "explorer" | "";

let installed = false;
let scanQueued = false;

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
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
}

function ensureUnifiedButtons(): void {
  const grid = document.querySelector<HTMLElement>(".command-tool-grid");
  if (!grid) return;

  const liveButton = findButton(grid, "Live Finder") || findButton(grid, "Live Places");
  if (!liveButton) return;

  liveButton.classList.add("unified-live-tool");
  const liveLabel = liveButton.querySelector("span");
  if (liveLabel && liveLabel.textContent !== "Live Places") liveLabel.textContent = "Live Places";
  if (!liveButton.dataset.unifiedBound) {
    liveButton.dataset.unifiedBound = "true";
    liveButton.addEventListener("click", () => setMode("live"));
  }

  let npiButton = grid.querySelector<HTMLButtonElement>(".unified-npi-tool");
  if (!npiButton) {
    npiButton = document.createElement("button");
    npiButton.type = "button";
    npiButton.className = "unified-npi-tool";
    npiButton.innerHTML = `${makeIcon("M4 19.5V8.75L12 4l8 4.75V19.5M8 19.5v-5h8v5M9 10.5h.01M12 10.5h.01M15 10.5h.01")}<span>NPI Registry</span>`;
    npiButton.addEventListener("click", () => {
      const currentLiveButton = findButton(grid, "Live Places") || findButton(grid, "Live Finder");
      if (currentLiveButton && !currentLiveButton.classList.contains("active")) currentLiveButton.click();
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
      const launcher = Array.from(document.querySelectorAll<HTMLButtonElement>(".command-header .command-action"))
        .find((button) => normalizedText(button).includes("provider explorer"));
      if (launcher) {
        setMode("explorer");
        launcher.click();
      }
    });
    npiButton.insertAdjacentElement("afterend", explorerButton);
  }

  Array.from(grid.querySelectorAll<HTMLButtonElement>("button")).forEach((button) => {
    if (button === liveButton || button === npiButton || button === explorerButton || button.dataset.unifiedOtherBound) return;
    button.dataset.unifiedOtherBound = "true";
    button.addEventListener("click", () => setMode(""));
  });
}

function hideDuplicateLaunchers(): void {
  Array.from(document.querySelectorAll<HTMLButtonElement>(".command-header .command-action")).forEach((button) => {
    const text = normalizedText(button);
    if (text.includes("provider explorer") || text.includes("analysis")) {
      button.dataset.unifiedHiddenLauncher = "true";
    }
  });
  document.querySelectorAll<HTMLElement>(".provider-explorer-launch").forEach((node) => {
    node.dataset.unifiedHiddenLauncher = "true";
  });
}

function markControlGroups(panel: HTMLElement): void {
  const controls = panel.querySelector<HTMLElement>(".lp-controls");
  if (!controls) return;

  const children = Array.from(controls.children) as HTMLElement[];
  const liveStart = children.findIndex((child) => normalizedText(child).startsWith("live source filters"));
  const npiStart = children.findIndex((child) => normalizedText(child).startsWith("u.s. npi filters"));

  children.forEach((child) => {
    child.classList.remove("provider-tool-live-only", "provider-tool-npi-only");
  });

  if (liveStart >= 0) {
    const liveEnd = npiStart >= 0 ? npiStart : children.length;
    children.slice(liveStart, liveEnd).forEach((child) => child.classList.add("provider-tool-live-only"));
  }
  if (npiStart >= 0) {
    children.slice(npiStart).forEach((child) => child.classList.add("provider-tool-npi-only"));
  }

  Array.from(panel.querySelectorAll<HTMLElement>("button")).forEach((button) => {
    const text = normalizedText(button);
    if (text.includes("export csv") || text.includes("leadership export")) {
      button.classList.add("provider-tool-live-only");
    }
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
  const grid = document.querySelector<HTMLElement>(".command-tool-grid");
  if (!grid) return;
  const npiButton = grid.querySelector<HTMLButtonElement>(".unified-npi-tool");
  const explorerButton = grid.querySelector<HTMLButtonElement>(".unified-explorer-tool");
  npiButton?.classList.toggle("active", mode === "npi");
  explorerButton?.classList.toggle("active", Boolean(document.querySelector(".provider-explorer-drawer.open")));
  if (mode === "explorer" && !document.querySelector(".provider-explorer-drawer.open")) setMode("");
}

function scan(): void {
  ensureUnifiedButtons();
  hideDuplicateLaunchers();
  updatePanelMode();
  syncActiveButtons();
}

function scheduleScan(): void {
  if (scanQueued) return;
  scanQueued = true;
  window.setTimeout(() => {
    scanQueued = false;
    scan();
  }, 40);
}

export function installUnifiedProviderTools(): void {
  if (installed) return;
  installed = true;
  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  window.addEventListener("load", scheduleScan, { once: true });
  scheduleScan();
}

installUnifiedProviderTools();

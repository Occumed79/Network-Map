type WorkspaceTab = "providers" | "mapTools" | "liveFinder" | "explorer";

type TabDefinition = {
  id: WorkspaceTab;
  label: string;
  ariaLabel: string;
};

const STYLE_ID = "occumed-sidebar-workspace-tabs-style";
const TABS_CLASS = "occumed-sidebar-workspace-tabs";
const PROVIDER_CONTENT_CLASS = "occumed-sidebar-provider-content";
const DATA_ATTRIBUTE = "occumedworkspace";

const TAB_DEFINITIONS: TabDefinition[] = [
  { id: "providers", label: "Providers", ariaLabel: "Show provider layers and workflows" },
  { id: "mapTools", label: "Map Tools", ariaLabel: "Show map routing and map tools" },
  { id: "liveFinder", label: "Finder", ariaLabel: "Show the live provider finder" },
  { id: "explorer", label: "Explorer", ariaLabel: "Show the provider explorer" },
];

let activeTab: WorkspaceTab = "providers";
let observer: MutationObserver | null = null;
let syncTimer: number | null = null;
let suppressPanelSyncUntil = 0;

function installStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    :root {
      --occumed-workspace-panel-top: 122px;
      --occumed-workspace-panel-left: 0px;
      --occumed-workspace-panel-width: var(--command-sidebar-width, 320px);
      --occumed-workspace-tabs-height: 52px;
      --occumed-workspace-deep: #071522;
      --occumed-workspace-mid: #102b3f;
      --occumed-workspace-cyan: #89e7f4;
      --occumed-workspace-cyan-strong: #dffcff;
    }

    .sidebar > .${TABS_CLASS} {
      position: sticky !important;
      top: 0 !important;
      z-index: 5000 !important;
      display: grid !important;
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      gap: 5px !important;
      min-height: var(--occumed-workspace-tabs-height) !important;
      margin: -2px -2px 10px !important;
      padding: 5px !important;
      border: 1px solid rgba(126, 218, 238, 0.22) !important;
      border-radius: 14px !important;
      background:
        linear-gradient(145deg, rgba(12, 31, 49, 0.98), rgba(4, 13, 23, 0.99)) !important;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.07),
        0 10px 28px rgba(0, 0, 0, 0.28) !important;
      backdrop-filter: blur(20px) saturate(150%) !important;
    }

    .sidebar > .${TABS_CLASS} .occumed-sidebar-workspace-tab {
      display: grid !important;
      min-width: 0 !important;
      min-height: 36px !important;
      place-items: center !important;
      margin: 0 !important;
      padding: 5px 4px !important;
      border: 1px solid rgba(126, 211, 232, 0.18) !important;
      border-radius: 9px !important;
      color: #aac6d5 !important;
      background:
        linear-gradient(180deg, rgba(20, 44, 65, 0.92), rgba(7, 18, 31, 0.98)) !important;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
      font-size: 8.5px !important;
      font-weight: 850 !important;
      line-height: 1.1 !important;
      letter-spacing: 0.01em !important;
      text-align: center !important;
      white-space: nowrap !important;
      cursor: pointer !important;
      transform: none !important;
    }

    .sidebar > .${TABS_CLASS} .occumed-sidebar-workspace-tab:hover {
      color: #f2fdff !important;
      border-color: rgba(137, 229, 245, 0.5) !important;
      background:
        linear-gradient(180deg, rgba(28, 75, 101, 0.96), rgba(9, 31, 50, 0.99)) !important;
      box-shadow: 0 0 18px rgba(67, 198, 226, 0.18) !important;
      transform: none !important;
    }

    .sidebar > .${TABS_CLASS} .occumed-sidebar-workspace-tab.active,
    .sidebar > .${TABS_CLASS} .occumed-sidebar-workspace-tab[aria-selected="true"] {
      color: #f4feff !important;
      border-color: rgba(151, 239, 250, 0.76) !important;
      background:
        linear-gradient(180deg, rgba(30, 117, 145, 0.98), rgba(8, 50, 72, 0.99)) !important;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.14),
        0 0 20px rgba(69, 207, 232, 0.28) !important;
    }

    .sidebar[data-occumed-workspace-tab]:not([data-occumed-workspace-tab="providers"]) > .${PROVIDER_CONTENT_CLASS} {
      visibility: hidden !important;
      pointer-events: none !important;
    }

    html[data-${DATA_ATTRIBUTE}="mapTools"] .occumed-map-tools-panel,
    html[data-${DATA_ATTRIBUTE}="liveFinder"] .live-panel.open,
    html[data-${DATA_ATTRIBUTE}="explorer"] .provider-explorer-drawer.open {
      position: fixed !important;
      top: var(--occumed-workspace-panel-top) !important;
      right: auto !important;
      bottom: 0 !important;
      left: var(--occumed-workspace-panel-left) !important;
      width: var(--occumed-workspace-panel-width) !important;
      min-width: 0 !important;
      max-width: none !important;
      height: auto !important;
      max-height: none !important;
      margin: 0 !important;
      transform: none !important;
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
      z-index: 4200 !important;
      overflow: auto !important;
      border-radius: 0 0 16px 0 !important;
      border-right: 1px solid rgba(124, 215, 236, 0.2) !important;
      border-top: 1px solid rgba(124, 215, 236, 0.12) !important;
      background:
        linear-gradient(160deg, rgba(9, 25, 41, 0.99), rgba(4, 13, 23, 0.995)) !important;
      box-shadow:
        12px 0 34px rgba(0, 0, 0, 0.28),
        inset 0 1px 0 rgba(255, 255, 255, 0.045) !important;
      backdrop-filter: blur(24px) saturate(145%) !important;
    }

    html[data-${DATA_ATTRIBUTE}]:not([data-${DATA_ATTRIBUTE}="mapTools"]) .occumed-map-tools-panel,
    html[data-${DATA_ATTRIBUTE}]:not([data-${DATA_ATTRIBUTE}="liveFinder"]) .live-panel,
    html[data-${DATA_ATTRIBUTE}]:not([data-${DATA_ATTRIBUTE}="explorer"]) .provider-explorer-drawer {
      display: none !important;
    }

    html[data-${DATA_ATTRIBUTE}="mapTools"] .occumed-map-tools-panel {
      display: block !important;
      padding: 12px !important;
    }

    html[data-${DATA_ATTRIBUTE}="liveFinder"] .live-panel.open {
      display: flex !important;
    }

    html[data-${DATA_ATTRIBUTE}="explorer"] .provider-explorer-drawer.open {
      display: flex !important;
    }

    html[data-${DATA_ATTRIBUTE}="liveFinder"] .live-panel .lp-inner,
    html[data-${DATA_ATTRIBUTE}="explorer"] .provider-explorer-drawer .provider-drawer-body {
      width: 100% !important;
      min-width: 0 !important;
      max-width: none !important;
      height: 100% !important;
      max-height: none !important;
      overflow-y: auto !important;
    }

    html[data-${DATA_ATTRIBUTE}="explorer"] .provider-drawer-backdrop,
    html[data-${DATA_ATTRIBUTE}="liveFinder"] .provider-drawer-backdrop {
      display: none !important;
    }

    html[data-${DATA_ATTRIBUTE}] .occumed-map-tools-panel .occumed-basemap-title {
      position: sticky !important;
      top: -12px !important;
      z-index: 2 !important;
      margin: -12px -12px 10px !important;
      padding: 12px !important;
      color: #dffcff !important;
      background: rgba(5, 16, 28, 0.96) !important;
      border-bottom: 1px solid rgba(126, 216, 236, 0.17) !important;
    }

    html[data-${DATA_ATTRIBUTE}] .occumed-map-tools-panel .occumed-map-tools-section {
      margin: 0 0 10px !important;
      padding: 10px !important;
      border: 1px solid rgba(126, 211, 232, 0.15) !important;
      border-radius: 12px !important;
      background: linear-gradient(145deg, rgba(17, 39, 58, 0.9), rgba(6, 17, 29, 0.96)) !important;
    }

    html[data-${DATA_ATTRIBUTE}] .occumed-map-tools-panel input,
    html[data-${DATA_ATTRIBUTE}] .occumed-map-tools-panel select,
    html[data-${DATA_ATTRIBUTE}] .live-panel input,
    html[data-${DATA_ATTRIBUTE}] .live-panel select,
    html[data-${DATA_ATTRIBUTE}] .provider-explorer-drawer input,
    html[data-${DATA_ATTRIBUTE}] .provider-explorer-drawer select {
      color: #e9f9ff !important;
      border-color: rgba(126, 211, 232, 0.22) !important;
      background: rgba(4, 13, 23, 0.82) !important;
    }

    /* Final, runtime-loaded button palette so later stylesheet injections cannot turn the controls pale again. */
    html[data-${DATA_ATTRIBUTE}] .sidebar button:not(.command-section-toggle):not(.command-search-clear):not(.mobile-menu-button):not(.occumed-sidebar-workspace-tab),
    html[data-${DATA_ATTRIBUTE}] .live-panel button,
    html[data-${DATA_ATTRIBUTE}] .provider-explorer-drawer button,
    html[data-${DATA_ATTRIBUTE}] .occumed-map-tools-panel button,
    html[data-${DATA_ATTRIBUTE}] .occumed-provider-location-actions button {
      color: #dff2f8 !important;
      border: 1px solid rgba(129, 215, 235, 0.27) !important;
      background:
        linear-gradient(180deg, rgba(20, 48, 71, 0.98), rgba(6, 19, 33, 0.99)) !important;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.07),
        0 7px 18px rgba(0, 0, 0, 0.23) !important;
      text-shadow: none !important;
    }

    html[data-${DATA_ATTRIBUTE}] .sidebar button:not(.command-section-toggle):not(.command-search-clear):not(.mobile-menu-button):not(.occumed-sidebar-workspace-tab):hover:not(:disabled),
    html[data-${DATA_ATTRIBUTE}] .live-panel button:hover:not(:disabled),
    html[data-${DATA_ATTRIBUTE}] .provider-explorer-drawer button:hover:not(:disabled),
    html[data-${DATA_ATTRIBUTE}] .occumed-map-tools-panel button:hover:not(:disabled) {
      color: #f5feff !important;
      border-color: rgba(145, 232, 248, 0.62) !important;
      background:
        linear-gradient(180deg, rgba(29, 79, 104, 0.99), rgba(8, 33, 53, 0.99)) !important;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        0 0 20px rgba(64, 199, 227, 0.19),
        0 9px 22px rgba(0, 0, 0, 0.29) !important;
    }

    html[data-${DATA_ATTRIBUTE}] .sidebar button:is(.active, [aria-pressed="true"], [data-active="true"]),
    html[data-${DATA_ATTRIBUTE}] .live-panel button:is(.active, .on, .pri, [aria-pressed="true"], [data-active="true"]),
    html[data-${DATA_ATTRIBUTE}] .provider-explorer-drawer button:is(.active, [aria-pressed="true"], [data-active="true"]),
    html[data-${DATA_ATTRIBUTE}] .occumed-map-tools-panel button:is(.active, [aria-pressed="true"], [data-active="true"]) {
      color: #f6feff !important;
      border-color: rgba(153, 239, 250, 0.78) !important;
      background:
        linear-gradient(180deg, rgba(31, 121, 149, 0.99), rgba(8, 51, 74, 0.99)) !important;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.14),
        0 0 24px rgba(63, 205, 231, 0.3),
        0 9px 22px rgba(0, 0, 0, 0.3) !important;
    }

    html[data-${DATA_ATTRIBUTE}] .sidebar .workflow-layer,
    html[data-${DATA_ATTRIBUTE}] .sidebar .tog-row {
      color: #d8eaf2 !important;
      border-color: rgba(126, 211, 232, 0.17) !important;
      background:
        linear-gradient(145deg, rgba(18, 41, 61, 0.92), rgba(6, 17, 29, 0.97)) !important;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045) !important;
    }

    html[data-${DATA_ATTRIBUTE}] .sidebar .workflow-layer.active {
      border-color: rgba(145, 232, 248, 0.55) !important;
      background:
        linear-gradient(145deg, rgba(22, 74, 96, 0.96), rgba(8, 31, 49, 0.98)) !important;
      box-shadow: 0 0 18px rgba(60, 193, 220, 0.16) !important;
    }

    html[data-${DATA_ATTRIBUTE}] .sidebar .workflow-layer-name,
    html[data-${DATA_ATTRIBUTE}] .sidebar .tog-lbl {
      color: #e5f5fa !important;
    }

    html[data-${DATA_ATTRIBUTE}] .sidebar .workflow-layer-status {
      color: #9fbac8 !important;
    }

    @media (max-width: 768px) {
      .sidebar > .${TABS_CLASS} {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        --occumed-workspace-tabs-height: 88px;
      }

      html[data-${DATA_ATTRIBUTE}="mapTools"] .occumed-map-tools-panel,
      html[data-${DATA_ATTRIBUTE}="liveFinder"] .live-panel.open,
      html[data-${DATA_ATTRIBUTE}="explorer"] .provider-explorer-drawer.open {
        right: 0 !important;
        width: auto !important;
        border-radius: 0 !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function panelIsOpen(selector: string): boolean {
  return document.querySelector<HTMLElement>(selector)?.classList.contains("open") ?? false;
}

function normalizedButtonText(button: HTMLButtonElement): string {
  return (button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function findToggleButton(labels: string[]): HTMLButtonElement | null {
  const wanted = labels.map((label) => label.toLowerCase());
  const headerButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".command-header .command-action"));
  const sidebarButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".sidebar button"));
  const candidates = [...headerButtons, ...sidebarButtons];
  return candidates.find((button) => wanted.some((label) => normalizedButtonText(button) === label || normalizedButtonText(button).includes(label))) || null;
}

function ensurePanelState(selector: string, shouldOpen: boolean, labels: string[]): void {
  const isOpen = panelIsOpen(selector);
  if (isOpen === shouldOpen) return;
  const button = findToggleButton(labels);
  button?.click();
}

function managePanelsForTab(tab: WorkspaceTab): void {
  if (tab === "liveFinder") {
    ensurePanelState(".provider-explorer-drawer", false, ["provider explorer"]);
    window.setTimeout(() => ensurePanelState(".live-panel", true, ["analysis", "live finder"]), 0);
    return;
  }
  if (tab === "explorer") {
    ensurePanelState(".live-panel", false, ["analysis", "live finder"]);
    window.setTimeout(() => ensurePanelState(".provider-explorer-drawer", true, ["provider explorer"]), 0);
    return;
  }
  ensurePanelState(".live-panel", false, ["analysis", "live finder"]);
  ensurePanelState(".provider-explorer-drawer", false, ["provider explorer"]);
}

function updateDimensions(sidebar: HTMLElement, tabs: HTMLElement): void {
  const sidebarRect = sidebar.getBoundingClientRect();
  const tabsRect = tabs.getBoundingClientRect();
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--occumed-workspace-panel-top", `${Math.max(tabsRect.bottom, 0)}px`);
  rootStyle.setProperty("--occumed-workspace-panel-left", `${Math.max(sidebarRect.left, 0)}px`);
  rootStyle.setProperty("--occumed-workspace-panel-width", `${Math.max(sidebarRect.width, 280)}px`);
  rootStyle.setProperty("--occumed-workspace-tabs-height", `${Math.max(tabsRect.height, 52)}px`);
}

function applyActiveTab(): void {
  const sidebar = document.querySelector<HTMLElement>(".sidebar");
  const tabs = sidebar?.querySelector<HTMLElement>(`.${TABS_CLASS}`);
  document.documentElement.dataset[DATA_ATTRIBUTE] = activeTab;
  if (!sidebar || !tabs) return;
  sidebar.dataset.occumedWorkspaceTab = activeTab;
  tabs.querySelectorAll<HTMLButtonElement>(".occumed-sidebar-workspace-tab").forEach((button) => {
    const selected = button.dataset.workspaceTab === activeTab;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", selected ? "true" : "false");
    button.tabIndex = selected ? 0 : -1;
  });
  updateDimensions(sidebar, tabs);
}

function setActiveTab(tab: WorkspaceTab, managePanels = true): void {
  activeTab = tab;
  suppressPanelSyncUntil = performance.now() + 650;
  applyActiveTab();
  if (managePanels) managePanelsForTab(tab);
}

function createTabs(): HTMLElement {
  const tabs = document.createElement("div");
  tabs.className = TABS_CLASS;
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Sidebar workspaces");

  for (const definition of TAB_DEFINITIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "occumed-sidebar-workspace-tab";
    button.dataset.workspaceTab = definition.id;
    button.textContent = definition.label;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-label", definition.ariaLabel);
    button.addEventListener("click", () => setActiveTab(definition.id));
    tabs.appendChild(button);
  }
  return tabs;
}

function ensureTabs(): void {
  const sidebar = document.querySelector<HTMLElement>(".sidebar");
  if (!sidebar) return;
  let tabs = sidebar.querySelector<HTMLElement>(`:scope > .${TABS_CLASS}`);
  if (!tabs) {
    tabs = createTabs();
    sidebar.prepend(tabs);
  }
  Array.from(sidebar.children).forEach((child) => {
    if (child !== tabs) child.classList.add(PROVIDER_CONTENT_CLASS);
  });
  applyActiveTab();
}

function syncFromExistingPanels(): void {
  if (performance.now() < suppressPanelSyncUntil) return;
  const explorerOpen = panelIsOpen(".provider-explorer-drawer");
  const liveOpen = panelIsOpen(".live-panel");
  if (explorerOpen && activeTab !== "explorer") {
    setActiveTab("explorer", false);
    return;
  }
  if (liveOpen && activeTab !== "liveFinder") {
    setActiveTab("liveFinder", false);
    return;
  }
  if (activeTab === "explorer" && !explorerOpen) setActiveTab("providers", false);
  if (activeTab === "liveFinder" && !liveOpen) setActiveTab("providers", false);
}

function runSync(): void {
  installStyles();
  ensureTabs();
  syncFromExistingPanels();
}

function scheduleSync(delay = 24): void {
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    runSync();
  }, delay);
}

function installSidebarWorkspaceTabs(): void {
  installStyles();
  scheduleSync(0);
  if (!document.body || observer) return;
  observer = new MutationObserver(() => scheduleSync());
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "aria-hidden"],
  });
  window.addEventListener("resize", () => scheduleSync(40), { passive: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", installSidebarWorkspaceTabs, { once: true });
} else {
  installSidebarWorkspaceTabs();
}

export {};

type WorkspaceTab = "providers" | "mapTools" | "liveFinder" | "explorer";

type TabDefinition = {
  id: WorkspaceTab;
  label: string;
  ariaLabel: string;
};

const STYLE_ID = "occumed-sidebar-workspace-controller-style";
const TABS_CLASS = "occumed-sidebar-workspace-tabs";
const HOST_CLASS = "occumed-sidebar-workspace-host";
const PROVIDER_CONTENT_CLASS = "occumed-sidebar-provider-content";
const SIDEBAR_SCOPE_CLASS = "occumed-sidebar-workspace-scope";
const DATA_ATTRIBUTE = "occumedworkspace";
const SYNC_DELAY_MS = 28;
const PANEL_ACTION_GRACE_MS = 900;

const TAB_DEFINITIONS: TabDefinition[] = [
  { id: "providers", label: "Providers", ariaLabel: "Show provider layers and workflows" },
  { id: "mapTools", label: "Map Tools", ariaLabel: "Show map routing and map tools" },
  { id: "liveFinder", label: "Finder", ariaLabel: "Show the live provider finder" },
  { id: "explorer", label: "Explorer", ariaLabel: "Show the provider explorer" },
];

let activeTab: WorkspaceTab = "providers";
let observer: MutationObserver | null = null;
let resizeObserver: ResizeObserver | null = null;
let syncTimer: number | null = null;
let suppressPanelSyncUntil = 0;
let observedSidebar: HTMLElement | null = null;
let observedTabs: HTMLElement | null = null;

declare global {
  interface Window {
    __NETWORK_MAP_SIDEBAR_WORKSPACES__?: {
      getActiveTab: () => WorkspaceTab;
      setActiveTab: (tab: WorkspaceTab) => void;
      sync: () => void;
    };
  }
}

const styles = `
  :root {
    --workspace-panel-top: 122px;
    --workspace-panel-left: 0px;
    --workspace-panel-width: var(--command-sidebar-width, 320px);
    --workspace-panel-bottom: 10px;
    --workspace-control-bg: #071d30;
    --workspace-control-bg-hover: #0a2b43;
    --workspace-control-border: rgba(82, 184, 216, 0.46);
    --workspace-control-border-hover: rgba(117, 222, 244, 0.72);
    --workspace-control-text: #dcebf2;
    --workspace-control-muted: #9fb7c5;
    --workspace-panel-bg: #061421;
    --workspace-card-bg: #0a1c2c;
  }

  html body .sidebar.${SIDEBAR_SCOPE_CLASS} > .${TABS_CLASS} {
    position: sticky !important;
    top: 0 !important;
    z-index: 5000 !important;
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 6px !important;
    width: 100% !important;
    min-height: 52px !important;
    margin: -2px -2px 10px !important;
    padding: 6px !important;
    border: 1px solid rgba(82, 184, 216, 0.38) !important;
    border-radius: 14px !important;
    background: var(--workspace-panel-bg) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 10px 28px rgba(0,0,0,.28) !important;
    backdrop-filter: blur(20px) saturate(145%) !important;
  }

  html body .sidebar.${SIDEBAR_SCOPE_CLASS} > .${TABS_CLASS} .occumed-sidebar-workspace-tab {
    display: grid !important;
    min-width: 0 !important;
    min-height: 40px !important;
    place-items: center !important;
    margin: 0 !important;
    padding: 7px 5px !important;
    color: var(--workspace-control-text) !important;
    border: 1px solid var(--workspace-control-border) !important;
    border-radius: 10px !important;
    background: var(--workspace-control-bg) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.04) !important;
    font-size: 11px !important;
    font-weight: 800 !important;
    line-height: 1.15 !important;
    letter-spacing: .01em !important;
    text-align: center !important;
    white-space: nowrap !important;
    cursor: pointer !important;
    transform: none !important;
  }

  html body .sidebar.${SIDEBAR_SCOPE_CLASS} > .${TABS_CLASS} .occumed-sidebar-workspace-tab:hover:not(:disabled) {
    color: #f7fdff !important;
    border-color: var(--workspace-control-border-hover) !important;
    background: var(--workspace-control-bg-hover) !important;
    box-shadow: 0 0 16px rgba(57,191,224,.18) !important;
  }

  html body .sidebar.${SIDEBAR_SCOPE_CLASS} > .${TABS_CLASS} .occumed-sidebar-workspace-tab.active,
  html body .sidebar.${SIDEBAR_SCOPE_CLASS} > .${TABS_CLASS} .occumed-sidebar-workspace-tab[aria-selected="true"] {
    color: #ffffff !important;
    border-color: rgba(143,235,250,.88) !important;
    background: linear-gradient(180deg, #117c9b, #084c68) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.13), 0 0 18px rgba(51,200,229,.26) !important;
  }

  html body .sidebar.${SIDEBAR_SCOPE_CLASS}[data-occumed-workspace-tab]:not([data-occumed-workspace-tab="providers"])
    > .${PROVIDER_CONTENT_CLASS}:not(.${HOST_CLASS}) {
    display: none !important;
  }

  html body .sidebar.${SIDEBAR_SCOPE_CLASS} > .${HOST_CLASS} {
    display: none !important;
    width: 100% !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    visibility: visible !important;
    pointer-events: auto !important;
  }

  html[data-${DATA_ATTRIBUTE}="mapTools"] body .sidebar.${SIDEBAR_SCOPE_CLASS} > .${HOST_CLASS} {
    display: block !important;
  }

  html body .sidebar.${SIDEBAR_SCOPE_CLASS} > .${HOST_CLASS} > .occumed-map-tools-panel {
    position: static !important;
    inset: auto !important;
    display: block !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: none !important;
    height: auto !important;
    max-height: none !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    transform: none !important;
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  html[data-${DATA_ATTRIBUTE}="liveFinder"] body .live-panel.open,
  html[data-${DATA_ATTRIBUTE}="explorer"] body .provider-explorer-drawer.open {
    position: fixed !important;
    top: var(--workspace-panel-top) !important;
    right: auto !important;
    bottom: var(--workspace-panel-bottom) !important;
    left: var(--workspace-panel-left) !important;
    display: flex !important;
    width: var(--workspace-panel-width) !important;
    min-width: 0 !important;
    max-width: none !important;
    height: auto !important;
    max-height: none !important;
    margin: 0 !important;
    transform: none !important;
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
    z-index: 4900 !important;
    overflow: hidden !important;
    color: #dcebf2 !important;
    border: 1px solid rgba(82,184,216,.28) !important;
    border-radius: 0 0 14px 14px !important;
    background: var(--workspace-panel-bg) !important;
    box-shadow: 10px 12px 30px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.04) !important;
    backdrop-filter: blur(22px) saturate(145%) !important;
  }

  html[data-${DATA_ATTRIBUTE}]:not([data-${DATA_ATTRIBUTE}="liveFinder"]) body .live-panel,
  html[data-${DATA_ATTRIBUTE}]:not([data-${DATA_ATTRIBUTE}="explorer"]) body .provider-explorer-drawer {
    display: none !important;
  }

  html[data-${DATA_ATTRIBUTE}="liveFinder"] body .live-panel.open .lp-inner,
  html[data-${DATA_ATTRIBUTE}="explorer"] body .provider-explorer-drawer.open .provider-drawer-body {
    width: 100% !important;
    min-width: 0 !important;
    max-width: none !important;
    height: 100% !important;
    max-height: none !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
  }

  html[data-${DATA_ATTRIBUTE}="liveFinder"] body .provider-drawer-backdrop,
  html[data-${DATA_ATTRIBUTE}="explorer"] body .provider-drawer-backdrop {
    display: none !important;
    pointer-events: none !important;
  }

  html[data-occumed-workspace-ready="true"] body .leaflet-control-container .occumed-map-tools-panel[data-sidebar-docked="true"] {
    display: none !important;
  }

  html body .sidebar.${SIDEBAR_SCOPE_CLASS} .occumed-map-tools-panel .occumed-basemap-title {
    position: static !important;
    margin: 0 0 10px !important;
    padding: 10px 11px !important;
    color: #e8f8fc !important;
    border: 1px solid rgba(82,184,216,.28) !important;
    border-radius: 11px !important;
    background: var(--workspace-card-bg) !important;
    font-size: 12px !important;
  }

  html body :is(
    .sidebar.${SIDEBAR_SCOPE_CLASS},
    .live-panel,
    .provider-explorer-drawer
  ) :is(
    button,
    .mbtn,
    .vbtn,
    .fbtn,
    .lp-act,
    .lp-chip,
    .provider-explorer-launch,
    .diagnostics-toggle
  ):not(.command-section-toggle):not(.command-search-clear):not(.mobile-menu-button):not(.occumed-sidebar-workspace-tab):not(.rp-close) {
    min-height: 36px !important;
    color: var(--workspace-control-text) !important;
    border: 1px solid var(--workspace-control-border) !important;
    border-radius: 10px !important;
    background: var(--workspace-control-bg) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.035) !important;
    font-size: 11.5px !important;
    font-weight: 750 !important;
    line-height: 1.2 !important;
    text-shadow: none !important;
    transform: none !important;
  }

  html body :is(
    .sidebar.${SIDEBAR_SCOPE_CLASS},
    .live-panel,
    .provider-explorer-drawer
  ) :is(
    button,
    .mbtn,
    .vbtn,
    .fbtn,
    .lp-act,
    .lp-chip,
    .provider-explorer-launch,
    .diagnostics-toggle
  ):not(.command-section-toggle):not(.command-search-clear):not(.mobile-menu-button):not(.occumed-sidebar-workspace-tab):not(.rp-close):hover:not(:disabled) {
    color: #f7fdff !important;
    border-color: var(--workspace-control-border-hover) !important;
    background: var(--workspace-control-bg-hover) !important;
    box-shadow: 0 0 15px rgba(57,191,224,.16) !important;
  }

  html body :is(
    .sidebar.${SIDEBAR_SCOPE_CLASS},
    .live-panel,
    .provider-explorer-drawer
  ) :is(
    button.active,
    button.on,
    button.pri,
    button[aria-pressed="true"],
    button[data-active="true"],
    .mbtn.active,
    .vbtn.active,
    .fbtn.active,
    .lp-chip.on,
    .diagnostics-toggle.active
  ) {
    color: #ffffff !important;
    border-color: rgba(143,235,250,.84) !important;
    background: linear-gradient(180deg, #117c9b, #084c68) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.12), 0 0 16px rgba(51,200,229,.23) !important;
  }

  html body :is(.sidebar.${SIDEBAR_SCOPE_CLASS}, .live-panel, .provider-explorer-drawer) button:disabled {
    color: rgba(184,205,215,.5) !important;
    border-color: rgba(82,145,168,.18) !important;
    background: #071522 !important;
    opacity: .62 !important;
  }

  html body :is(.live-panel, .provider-explorer-drawer) :is(.rp-close, .provider-drawer-header > button) {
    color: var(--workspace-control-text) !important;
    border: 1px solid var(--workspace-control-border) !important;
    background: var(--workspace-control-bg) !important;
    font-size: 10.5px !important;
  }

  html body :is(
    .occumed-map-tools-section,
    .provider-drawer-section,
    .live-panel .lp-item,
    .live-panel .lp-controls > div,
    .sidebar.${SIDEBAR_SCOPE_CLASS} .hero-card,
    .sidebar.${SIDEBAR_SCOPE_CLASS} > .sb-section
  ) {
    color: #dcebf2 !important;
    border-color: rgba(82,184,216,.22) !important;
    background: var(--workspace-card-bg) !important;
    box-shadow: none !important;
  }

  html body :is(.sidebar.${SIDEBAR_SCOPE_CLASS}, .live-panel, .provider-explorer-drawer) :is(
    input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
    select,
    textarea
  ) {
    min-height: 38px !important;
    color: #e7f5f9 !important;
    border: 1px solid rgba(82,184,216,.32) !important;
    border-radius: 9px !important;
    background: #061522 !important;
    font-size: 11.5px !important;
  }

  html body :is(.sidebar.${SIDEBAR_SCOPE_CLASS}, .live-panel, .provider-explorer-drawer) :is(
    .command-section-title,
    .command-section-toggle,
    .provider-drawer-section-title span,
    .occumed-map-tools-section-title,
    .lp-title,
    .analysis-panel-title,
    label,
    strong
  ) {
    color: #e2f2f7 !important;
  }

  html body :is(.sidebar.${SIDEBAR_SCOPE_CLASS}, .live-panel, .provider-explorer-drawer) :is(
    small,
    .command-section-help,
    .workflow-layer-status,
    .provider-drawer-section-title small,
    .provider-field-label,
    .occumed-provider-location-description
  ) {
    color: var(--workspace-control-muted) !important;
    font-size: 10px !important;
  }

  html body .sidebar.${SIDEBAR_SCOPE_CLASS} .command-section-toggle {
    min-height: 38px !important;
    padding: 8px 10px !important;
    color: var(--workspace-control-text) !important;
    border: 1px solid var(--workspace-control-border) !important;
    border-radius: 10px !important;
    background: var(--workspace-control-bg) !important;
    font-size: 11.5px !important;
  }

  html body .sidebar.${SIDEBAR_SCOPE_CLASS} .workflow-layer,
  html body .sidebar.${SIDEBAR_SCOPE_CLASS} .tog-row,
  html body .provider-explorer-drawer .provider-live-toggle {
    color: #dcebf2 !important;
    border-color: rgba(82,184,216,.25) !important;
    background: var(--workspace-card-bg) !important;
  }

  html body .provider-explorer-drawer .provider-map-status,
  html body .occumed-provider-location-status,
  html body .occumed-mapbox-status {
    color: #b9d4df !important;
    border-color: rgba(82,184,216,.24) !important;
    background: #071a29 !important;
    font-size: 10.5px !important;
  }

  @media (max-width: 768px) {
    html body .sidebar.${SIDEBAR_SCOPE_CLASS} > .${TABS_CLASS} {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      min-height: 92px !important;
    }

    html body .sidebar.${SIDEBAR_SCOPE_CLASS} > .${TABS_CLASS} .occumed-sidebar-workspace-tab {
      font-size: 11.5px !important;
    }

    html[data-${DATA_ATTRIBUTE}="liveFinder"] body .live-panel.open,
    html[data-${DATA_ATTRIBUTE}="explorer"] body .provider-explorer-drawer.open {
      top: var(--workspace-panel-top) !important;
      right: 0 !important;
      bottom: 0 !important;
      left: 0 !important;
      width: auto !important;
      border-radius: 0 !important;
    }
  }
`;

function normalizedText(node: Element | null): string {
  return (node?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function installStyle(): void {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
  }
  if (style.textContent !== styles) style.textContent = styles;
  if (style.parentElement !== document.head || style.nextSibling) document.head.appendChild(style);
}

function panelIsOpen(selector: string): boolean {
  return document.querySelector<HTMLElement>(selector)?.classList.contains("open") ?? false;
}

function createTabs(): HTMLElement {
  const tabs = document.createElement("div");
  tabs.className = TABS_CLASS;
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Sidebar workspaces");

  TAB_DEFINITIONS.forEach((definition, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "occumed-sidebar-workspace-tab";
    button.dataset.workspaceTab = definition.id;
    button.textContent = definition.label;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-label", definition.ariaLabel);
    button.addEventListener("click", () => setActiveTab(definition.id));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const buttons = Array.from(tabs.querySelectorAll<HTMLButtonElement>(".occumed-sidebar-workspace-tab"));
      const currentIndex = Math.max(0, buttons.indexOf(button));
      const targetIndex = event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      buttons[targetIndex]?.focus();
      const target = TAB_DEFINITIONS[targetIndex];
      if (target) setActiveTab(target.id);
    });
    button.tabIndex = index === 0 ? 0 : -1;
    tabs.appendChild(button);
  });

  return tabs;
}

function ensureSidebarStructure(): { sidebar: HTMLElement; tabs: HTMLElement; host: HTMLElement } | null {
  const sidebar = document.querySelector<HTMLElement>(".sidebar");
  if (!sidebar) return null;
  sidebar.classList.add(SIDEBAR_SCOPE_CLASS);

  let tabs = sidebar.querySelector<HTMLElement>(`:scope > .${TABS_CLASS}`);
  if (!tabs) {
    tabs = createTabs();
    sidebar.prepend(tabs);
  }

  let host = sidebar.querySelector<HTMLElement>(`:scope > .${HOST_CLASS}`);
  if (!host) {
    host = document.createElement("div");
    host.className = HOST_CLASS;
    host.setAttribute("aria-label", "Map tools workspace");
    tabs.insertAdjacentElement("afterend", host);
  }

  Array.from(sidebar.children).forEach((child) => {
    if (child === tabs || child === host) {
      child.classList.remove(PROVIDER_CONTENT_CLASS);
      return;
    }
    child.classList.add(PROVIDER_CONTENT_CLASS);
  });

  return { sidebar, tabs, host };
}

function dockMapTools(host: HTMLElement): void {
  const panel = document.querySelector<HTMLElement>(".occumed-map-tools-panel");
  if (!panel) return;
  if (panel.parentElement !== host) host.appendChild(panel);
  panel.dataset.sidebarDocked = "true";
}

function markExternalPanels(): void {
  const livePanel = document.querySelector<HTMLElement>(".live-panel");
  const explorerPanel = document.querySelector<HTMLElement>(".provider-explorer-drawer");
  if (livePanel) livePanel.dataset.occumedWorkspacePanel = "liveFinder";
  if (explorerPanel) explorerPanel.dataset.occumedWorkspacePanel = "explorer";
}

function updateDimensions(sidebar: HTMLElement, tabs: HTMLElement): void {
  const sidebarRect = sidebar.getBoundingClientRect();
  const tabsRect = tabs.getBoundingClientRect();
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--workspace-panel-top", `${Math.max(0, tabsRect.bottom)}px`);
  rootStyle.setProperty("--workspace-panel-left", `${Math.max(0, sidebarRect.left)}px`);
  rootStyle.setProperty("--workspace-panel-width", `${Math.max(280, sidebarRect.width)}px`);
  rootStyle.setProperty("--workspace-panel-bottom", `${Math.max(0, window.innerHeight - sidebarRect.bottom)}px`);
}

function observeDimensions(sidebar: HTMLElement, tabs: HTMLElement): void {
  if (typeof ResizeObserver === "undefined") return;
  if (observedSidebar === sidebar && observedTabs === tabs && resizeObserver) return;
  resizeObserver?.disconnect();
  resizeObserver = new ResizeObserver(() => updateDimensions(sidebar, tabs));
  resizeObserver.observe(sidebar);
  resizeObserver.observe(tabs);
  observedSidebar = sidebar;
  observedTabs = tabs;
}

function primaryLiveLauncher(): HTMLButtonElement | null {
  const direct = document.querySelector<HTMLButtonElement>(".unified-live-tool");
  if (direct) return direct;
  return Array.from(document.querySelectorAll<HTMLButtonElement>(".command-tool-grid button, .sidebar button"))
    .find((button) => {
      const text = normalizedText(button);
      return text === "live places" || text === "live finder" || text.includes("live places");
    }) || null;
}

function primaryExplorerLauncher(): HTMLButtonElement | null {
  const direct = document.querySelector<HTMLButtonElement>(".unified-explorer-tool, .provider-explorer-launch");
  if (direct) return direct;
  return Array.from(document.querySelectorAll<HTMLButtonElement>(".command-header .command-action, .sidebar button"))
    .find((button) => normalizedText(button).includes("provider explorer")) || null;
}

function closeButtonFor(selector: string): HTMLButtonElement | null {
  const panel = document.querySelector<HTMLElement>(selector);
  return panel?.querySelector<HTMLButtonElement>(
    ".rp-close, .provider-drawer-header > button, button[aria-label*='close' i], button[title*='close' i]",
  ) || null;
}

function ensureLivePanel(open: boolean): void {
  if (panelIsOpen(".live-panel") === open) return;
  if (!open) {
    const close = closeButtonFor(".live-panel");
    if (close) { close.click(); return; }
  }
  primaryLiveLauncher()?.click();
}

function ensureExplorerPanel(open: boolean): void {
  if (panelIsOpen(".provider-explorer-drawer") === open) return;
  if (!open) {
    const close = closeButtonFor(".provider-explorer-drawer");
    if (close) { close.click(); return; }
  }
  primaryExplorerLauncher()?.click();
}

function managePanelsForTab(tab: WorkspaceTab): void {
  if (tab === "liveFinder") {
    ensureExplorerPanel(false);
    window.setTimeout(() => ensureLivePanel(true), 0);
    return;
  }
  if (tab === "explorer") {
    ensureLivePanel(false);
    window.setTimeout(() => ensureExplorerPanel(true), 0);
    return;
  }
  ensureLivePanel(false);
  ensureExplorerPanel(false);
}

function applyActiveTab(structure = ensureSidebarStructure()): void {
  document.documentElement.dataset[DATA_ATTRIBUTE] = activeTab;
  document.documentElement.dataset.occumedWorkspaceReady = "true";
  if (!structure) return;

  structure.sidebar.dataset.occumedWorkspaceTab = activeTab;
  structure.tabs.querySelectorAll<HTMLButtonElement>(".occumed-sidebar-workspace-tab").forEach((button) => {
    const selected = button.dataset.workspaceTab === activeTab;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", selected ? "true" : "false");
    button.tabIndex = selected ? 0 : -1;
  });
  updateDimensions(structure.sidebar, structure.tabs);
  observeDimensions(structure.sidebar, structure.tabs);
}

function setActiveTab(tab: WorkspaceTab, managePanels = true): void {
  activeTab = tab;
  suppressPanelSyncUntil = performance.now() + PANEL_ACTION_GRACE_MS;
  applyActiveTab();
  if (managePanels) managePanelsForTab(tab);
  window.dispatchEvent(new CustomEvent("network-map:sidebar-workspace", { detail: { tab } }));
}

function syncFromPanelState(): void {
  if (performance.now() < suppressPanelSyncUntil) return;
  const providerTool = document.body?.dataset.providerTool || "";
  const explorerOpen = panelIsOpen(".provider-explorer-drawer");
  const liveOpen = panelIsOpen(".live-panel");

  if ((providerTool === "explorer" || explorerOpen) && activeTab !== "explorer") {
    setActiveTab("explorer", false);
    return;
  }
  if ((providerTool === "live" || providerTool === "npi" || liveOpen) && activeTab !== "liveFinder") {
    setActiveTab("liveFinder", false);
    return;
  }
  if (activeTab === "explorer" && !explorerOpen && providerTool !== "explorer") {
    setActiveTab("providers", false);
    return;
  }
  if (activeTab === "liveFinder" && !liveOpen && providerTool !== "live" && providerTool !== "npi") {
    setActiveTab("providers", false);
  }
}

function runSync(): void {
  installStyle();
  const structure = ensureSidebarStructure();
  if (!structure) return;
  dockMapTools(structure.host);
  markExternalPanels();
  applyActiveTab(structure);
  syncFromPanelState();
}

function scheduleSync(delay = SYNC_DELAY_MS): void {
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    runSync();
  }, delay);
}

function install(): void {
  installStyle();
  scheduleSync(0);
  if (!document.body || observer) return;

  observer = new MutationObserver(() => scheduleSync());
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "aria-hidden", "hidden", "data-provider-tool"],
  });
  window.addEventListener("resize", () => scheduleSync(40), { passive: true });
  window.addEventListener("orientationchange", () => scheduleSync(40), { passive: true });
}

function cleanup(): void {
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = null;
  observer?.disconnect();
  observer = null;
  resizeObserver?.disconnect();
  resizeObserver = null;
  observedSidebar = null;
  observedTabs = null;
}

window.__NETWORK_MAP_SIDEBAR_WORKSPACES__ = {
  getActiveTab: () => activeTab,
  setActiveTab,
  sync: () => scheduleSync(0),
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", install, { once: true });
} else {
  install();
}
window.addEventListener("beforeunload", cleanup, { once: true });

export {};

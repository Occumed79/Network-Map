import {
  registerRuntimeOwner,
  runWithoutSharedDomObservation,
  subscribeToSharedDomObserver,
} from "./runtimeControllerRegistry";

type WorkspaceTab = "providers" | "mapTools" | "liveFinder" | "explorer";

type TabDefinition = {
  id: WorkspaceTab;
  label: string;
  ariaLabel: string;
};

const TABS_CLASS = "occumed-sidebar-workspace-tabs";
const HOST_CLASS = "occumed-sidebar-workspace-host";
const PROVIDER_CONTENT_CLASS = "occumed-sidebar-provider-content";
const SIDEBAR_SCOPE_CLASS = "occumed-sidebar-workspace-scope";
const DATA_ATTRIBUTE = "occumedworkspace";
const SYNC_DELAY_MS = 28;
const PANEL_ACTION_GRACE_MS = 900;

const TAB_DEFINITIONS: TabDefinition[] = [
  { id: "providers", label: "Providers", ariaLabel: "Providers workspace — provider layers and workflows" },
  { id: "mapTools", label: "Map Tools", ariaLabel: "Map Tools workspace — routing and map tools" },
  { id: "liveFinder", label: "Finder", ariaLabel: "Finder workspace — live provider finder" },
  { id: "explorer", label: "Explorer", ariaLabel: "Explorer workspace — provider explorer" },
];

let activeTab: WorkspaceTab = "providers";
let unsubscribeDomObserver: (() => void) | null = null;
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

function normalizedText(node: Element | null): string {
  return (node?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
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
    button.setAttribute("aria-selected", "false");
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
      const targetButton = buttons[targetIndex];
      const target = TAB_DEFINITIONS[targetIndex];
      targetButton?.focus();
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
    if (!(child instanceof HTMLElement)) return;
    if (child === tabs || child === host) child.classList.remove(PROVIDER_CONTENT_CLASS);
    else child.classList.add(PROVIDER_CONTENT_CLASS);
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
    if (close) {
      close.click();
      return;
    }
  }
  primaryLiveLauncher()?.click();
}

function ensureExplorerPanel(open: boolean): void {
  if (panelIsOpen(".provider-explorer-drawer") === open) return;
  if (!open) {
    const close = closeButtonFor(".provider-explorer-drawer");
    if (close) {
      close.click();
      return;
    }
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
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  updateDimensions(structure.sidebar, structure.tabs);
  observeDimensions(structure.sidebar, structure.tabs);
}

function setActiveTab(tab: WorkspaceTab, managePanels = true): void {
  activeTab = tab;
  suppressPanelSyncUntil = performance.now() + PANEL_ACTION_GRACE_MS;
  runWithoutSharedDomObservation(() => applyActiveTab());
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
    runWithoutSharedDomObservation(runSync);
  }, delay);
}

function mutationTouchesWorkspace(mutations: MutationRecord[]): boolean {
  return mutations.some((mutation) => {
    const target = mutation.target instanceof Element ? mutation.target : null;
    if (target?.closest(".sidebar, .live-panel, .provider-explorer-drawer, .occumed-map-tools-panel, .command-tool-grid, .command-header")) return true;
    return Array.from(mutation.addedNodes).some((node) =>
      node instanceof Element
      && Boolean(node.matches(".sidebar, .live-panel, .provider-explorer-drawer, .occumed-map-tools-panel")
        || node.querySelector(".sidebar, .live-panel, .provider-explorer-drawer, .occumed-map-tools-panel")),
    );
  });
}

function handleViewportChange(): void {
  scheduleSync(40);
}

function install(): void {
  if (!registerRuntimeOwner(
    "sidebar-workspace-controller",
    "Authoritative sidebar workspace tabs, panel visibility, and Map Tools docking",
  )) return;

  scheduleSync(0);
  unsubscribeDomObserver = subscribeToSharedDomObserver("sidebar-workspace-controller", (mutations) => {
    if (mutationTouchesWorkspace(mutations)) scheduleSync();
  });
  window.addEventListener("resize", handleViewportChange, { passive: true });
  window.addEventListener("orientationchange", handleViewportChange, { passive: true });
}

function cleanup(): void {
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = null;
  unsubscribeDomObserver?.();
  unsubscribeDomObserver = null;
  resizeObserver?.disconnect();
  resizeObserver = null;
  observedSidebar = null;
  observedTabs = null;
  window.removeEventListener("resize", handleViewportChange);
  window.removeEventListener("orientationchange", handleViewportChange);
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
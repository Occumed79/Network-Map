import {
  registerRuntimeOwner,
  runWithoutSharedDomObservation,
  subscribeToSharedDomObserver,
} from "./runtimeControllerRegistry";

type WorkspaceTab = "providers" | "mapTools" | "liveFinder" | "explorer";

const TABS_CLASS = "occumed-sidebar-workspace-tabs";
const HOST_CLASS = "occumed-sidebar-workspace-host";
const SIDEBAR_SCOPE_CLASS = "occumed-sidebar-workspace-scope";
const DATA_ATTRIBUTE = "occumedworkspace";
const SYNC_DELAY_MS = 28;

let activeTab: WorkspaceTab = "providers";
let unsubscribeDomObserver: (() => void) | null = null;
let resizeObserver: ResizeObserver | null = null;
let syncTimer: number | null = null;
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

function workspaceButton(target: EventTarget | null): HTMLButtonElement | null {
  return target instanceof Element
    ? target.closest<HTMLButtonElement>(`.${TABS_CLASS} .occumed-sidebar-workspace-tab`)
    : null;
}

function handleWorkspaceTabClick(event: Event): void {
  if (event.defaultPrevented) return;
  const button = workspaceButton(event.target);
  if (button?.dataset.workspaceReactOwned === "true") return;
  const tab = button?.dataset.workspaceTab;
  if (tab === "providers" || tab === "mapTools" || tab === "liveFinder" || tab === "explorer") {
    setActiveTab(tab);
  }
}

function handleWorkspaceTabKeydown(event: KeyboardEvent): void {
  const button = workspaceButton(event.target);
  if (!button || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const tabs = button.closest<HTMLElement>(`.${TABS_CLASS}`);
  if (!tabs) return;
  event.preventDefault();
  const buttons = Array.from(tabs.querySelectorAll<HTMLButtonElement>(".occumed-sidebar-workspace-tab"));
  const currentIndex = Math.max(0, buttons.indexOf(button));
  const targetIndex = event.key === "Home"
    ? 0
    : event.key === "End"
      ? buttons.length - 1
      : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
  const target = buttons[targetIndex];
  const tab = target?.dataset.workspaceTab;
  target?.focus();
  if (tab === "providers" || tab === "mapTools" || tab === "liveFinder" || tab === "explorer") {
    setActiveTab(tab);
  }
}

function ensureSidebarStructure(): { sidebar: HTMLElement; tabs: HTMLElement; host: HTMLElement } | null {
  const sidebar = document.querySelector<HTMLElement>(".sidebar");
  if (!sidebar) return null;
  sidebar.classList.add(SIDEBAR_SCOPE_CLASS);

  const tabs = sidebar.querySelector<HTMLElement>(`:scope > .${TABS_CLASS}`);
  // React is the sole owner of the tab strip. Injecting a second, temporary
  // implementation during a delayed commit created duplicate controls and
  // allowed the compatibility runtime to retain detached DOM.
  if (!tabs) return null;

  let host = sidebar.querySelector<HTMLElement>(`:scope > .${HOST_CLASS}`);
  if (!host) {
    host = document.createElement("div");
    host.className = HOST_CLASS;
    host.setAttribute("aria-label", "Map tools workspace");
    tabs.insertAdjacentElement("afterend", host);
  }

  return { sidebar, tabs, host };
}

function dockMapTools(host: HTMLElement): void {
  const panel = document.querySelector<HTMLElement>(
    ".occumed-map-tools-panel[data-map-tools-registry-owned='true'], .occumed-map-tools-panel",
  );
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

function setActiveTab(tab: WorkspaceTab): void {
  activeTab = tab;
  if (tab === "liveFinder") {
    if (!["live", "npi"].includes(document.body.dataset.providerTool || "")) {
      document.body.dataset.providerTool = "live";
    }
  } else {
    delete document.body.dataset.providerTool;
  }
  runWithoutSharedDomObservation(() => applyActiveTab());
  window.dispatchEvent(new CustomEvent("network-map:sidebar-workspace", { detail: { tab } }));
}

function runSync(): void {
  const structure = ensureSidebarStructure();
  if (!structure) return;
  dockMapTools(structure.host);
  markExternalPanels();
  applyActiveTab(structure);
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

function handleMapToolsPanelMounted(): void {
  const structure = ensureSidebarStructure();
  if (!structure) return;
  runWithoutSharedDomObservation(() => dockMapTools(structure.host));
  scheduleSync(0);
}

function handlePanelCloseClick(event: Event): void {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const closesFinder = Boolean(target.closest(
    ".live-panel .rp-close, .live-panel button[aria-label*='close' i], .live-panel button[title*='close' i]",
  ));
  const closesExplorer = Boolean(target.closest(
    ".provider-explorer-drawer button[aria-label*='close' i], .provider-explorer-drawer button[title*='close' i], .provider-drawer-backdrop",
  ));
  if ((closesFinder && activeTab !== "liveFinder") || (closesExplorer && activeTab !== "explorer")) return;
  if (!closesFinder && !closesExplorer) return;

  if (closesFinder) delete document.body.dataset.providerTool;
  setActiveTab("providers");
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
  window.addEventListener("network-map:map-tools-panel-mounted", handleMapToolsPanelMounted);
  document.addEventListener("click", handlePanelCloseClick, true);
  document.addEventListener("click", handleWorkspaceTabClick);
  document.addEventListener("keydown", handleWorkspaceTabKeydown);
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
  window.removeEventListener("network-map:map-tools-panel-mounted", handleMapToolsPanelMounted);
  document.removeEventListener("click", handlePanelCloseClick, true);
  document.removeEventListener("click", handleWorkspaceTabClick);
  document.removeEventListener("keydown", handleWorkspaceTabKeydown);
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

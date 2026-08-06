type GuardedWorkspaceTab = "providers" | "mapTools" | "liveFinder" | "explorer";

type SidebarWorkspaceController = {
  getActiveTab?: () => GuardedWorkspaceTab;
  setActiveTab?: (tab: GuardedWorkspaceTab, managePanels?: boolean) => void;
  sync?: () => void;
};

type UiIntegrityResult = {
  tab: GuardedWorkspaceTab;
  healthy: boolean;
  failures: string[];
  measuredAt: number;
};

declare global {
  interface Window {
    __NETWORK_MAP_UI_INTEGRITY__?: {
      audit: () => UiIntegrityResult;
      recover: () => void;
      lastResult: () => UiIntegrityResult | null;
    };
  }
}

const RETRY_DELAYS_MS = [0, 90, 240, 520, 900, 1500, 2300];
const PANEL_SELECTORS: Partial<Record<GuardedWorkspaceTab, string>> = {
  liveFinder: ".live-panel.open",
  explorer: ".provider-explorer-drawer.open",
};
const CLOSE_SELECTOR = [
  ".live-panel .rp-close",
  ".provider-explorer-drawer .provider-drawer-header > button",
  ".live-panel button[aria-label*='close' i]",
  ".provider-explorer-drawer button[aria-label*='close' i]",
  ".live-panel button[title*='close' i]",
  ".provider-explorer-drawer button[title*='close' i]",
].join(", ");

let recoveryGeneration = 0;
let retryTimers: number[] = [];
let auditTimers: number[] = [];
let closeIntentUntil = 0;
let lastLaunchAt = 0;
let lastAudit: UiIntegrityResult | null = null;

function controller(): SidebarWorkspaceController | null {
  return (window as typeof window & {
    __NETWORK_MAP_SIDEBAR_WORKSPACES__?: SidebarWorkspaceController;
  }).__NETWORK_MAP_SIDEBAR_WORKSPACES__ || null;
}

function normalizedText(node: Element | null): string {
  return (node?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function currentTab(): GuardedWorkspaceTab {
  const reported = controller()?.getActiveTab?.();
  if (reported === "providers" || reported === "mapTools" || reported === "liveFinder" || reported === "explorer") {
    return reported;
  }
  const datasetTab = document.documentElement.dataset.occumedworkspace;
  if (datasetTab === "mapTools" || datasetTab === "liveFinder" || datasetTab === "explorer") return datasetTab;
  return "providers";
}

function elementIsVisible(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 40 && rect.height > 40;
}

function panelFor(tab: GuardedWorkspaceTab): HTMLElement | null {
  const selector = PANEL_SELECTORS[tab];
  return selector ? document.querySelector<HTMLElement>(selector) : null;
}

function panelIsOpen(tab: GuardedWorkspaceTab): boolean {
  if (tab !== "liveFinder" && tab !== "explorer") return true;
  return elementIsVisible(panelFor(tab));
}

function liveLauncher(): HTMLButtonElement | null {
  const direct = document.querySelector<HTMLButtonElement>(".unified-live-tool");
  if (direct) return direct;
  return Array.from(document.querySelectorAll<HTMLButtonElement>(".command-tool-grid button, .sidebar button"))
    .find((button) => {
      const text = normalizedText(button);
      return text === "live places" || text === "live finder" || text.includes("live places");
    }) || null;
}

function explorerLauncher(): HTMLButtonElement | null {
  const direct = document.querySelector<HTMLButtonElement>(".unified-explorer-tool, .provider-explorer-launch");
  if (direct) return direct;
  return Array.from(document.querySelectorAll<HTMLButtonElement>(".command-header .command-action, .sidebar button"))
    .find((button) => normalizedText(button).includes("provider explorer")) || null;
}

function launcherFor(tab: GuardedWorkspaceTab): HTMLButtonElement | null {
  if (tab === "liveFinder") return liveLauncher();
  if (tab === "explorer") return explorerLauncher();
  return null;
}

function clearTimers(timers: number[]): void {
  timers.forEach((timer) => window.clearTimeout(timer));
  timers.length = 0;
}

function settleMapLayout(): void {
  const emitResize = () => window.dispatchEvent(new Event("resize"));
  window.requestAnimationFrame(emitResize);
  auditTimers.push(window.setTimeout(emitResize, 80));
  auditTimers.push(window.setTimeout(emitResize, 240));
}

function closeEnough(a: number, b: number, tolerance = 5): boolean {
  return Math.abs(a - b) <= tolerance;
}

function auditLayout(): UiIntegrityResult {
  const failures: string[] = [];
  const tab = currentTab();
  const desktop = window.innerWidth > 768;
  const sidebar = document.querySelector<HTMLElement>(".sidebar.occumed-sidebar-workspace-scope");
  const tabs = document.querySelector<HTMLElement>(".occumed-sidebar-workspace-tabs");
  const map = document.querySelector<HTMLElement>(".map-wrap");
  const activeTabs = Array.from(document.querySelectorAll<HTMLElement>(".occumed-sidebar-workspace-tab[aria-selected='true']"));

  if (!sidebar) failures.push("sidebar-missing");
  if (!tabs) failures.push("tabs-missing");
  if (!map) failures.push("map-missing");
  if (activeTabs.length !== 1) failures.push("active-tab-count");

  if (desktop && sidebar && map && tabs) {
    const sidebarRect = sidebar.getBoundingClientRect();
    const tabsRect = tabs.getBoundingClientRect();
    const mapRect = map.getBoundingClientRect();

    if (sidebarRect.width < 275 || sidebarRect.width > 345) failures.push("sidebar-width");
    if (sidebarRect.height < 300) failures.push("sidebar-height");
    if (tabsRect.left < sidebarRect.left - 2 || tabsRect.right > sidebarRect.right + 2) failures.push("tabs-overflow");
    if (mapRect.width < Math.max(420, window.innerWidth - sidebarRect.width - 80)) failures.push("map-width");
    if (mapRect.right < window.innerWidth - 18) failures.push("phantom-right-column");
    if (mapRect.left < sidebarRect.right + 4) failures.push("map-sidebar-overlap");

    if (tab === "liveFinder" || tab === "explorer") {
      const panel = panelFor(tab);
      if (!elementIsVisible(panel)) {
        failures.push(`${tab}-panel-hidden`);
      } else {
        const panelRect = panel.getBoundingClientRect();
        if (!closeEnough(panelRect.left, sidebarRect.left)) failures.push(`${tab}-panel-left`);
        if (!closeEnough(panelRect.width, sidebarRect.width)) failures.push(`${tab}-panel-width`);
        if (!closeEnough(panelRect.top, tabsRect.bottom, 7)) failures.push(`${tab}-panel-top`);
        if (!closeEnough(panelRect.bottom, sidebarRect.bottom, 7)) failures.push(`${tab}-panel-bottom`);
        if (panel.scrollWidth > panel.clientWidth + 2) failures.push(`${tab}-horizontal-overflow`);
      }
    }

    if (tab === "mapTools") {
      const tools = document.querySelector<HTMLElement>(".occumed-sidebar-workspace-host > .occumed-map-tools-panel");
      if (!elementIsVisible(tools)) failures.push("map-tools-hidden");
      else if (tools.scrollWidth > tools.clientWidth + 2) failures.push("map-tools-horizontal-overflow");
    }
  }

  const inactiveLive = tab !== "liveFinder" && elementIsVisible(document.querySelector(".live-panel"));
  const inactiveExplorer = tab !== "explorer" && elementIsVisible(document.querySelector(".provider-explorer-drawer"));
  if (inactiveLive) failures.push("inactive-finder-visible");
  if (inactiveExplorer) failures.push("inactive-explorer-visible");

  lastAudit = {
    tab,
    healthy: failures.length === 0,
    failures,
    measuredAt: Date.now(),
  };
  document.documentElement.dataset.occumedUiIntegrity = lastAudit.healthy ? "healthy" : "repairing";
  return lastAudit;
}

function scheduleAudit(): void {
  clearTimers(auditTimers);
  [0, 120, 360, 900].forEach((delay) => {
    auditTimers.push(window.setTimeout(() => {
      const result = auditLayout();
      if (!result.healthy) {
        controller()?.sync?.();
        settleMapLayout();
      }
    }, delay));
  });
}

function recoverPanel(tab: GuardedWorkspaceTab): void {
  recoveryGeneration += 1;
  const generation = recoveryGeneration;
  clearTimers(retryTimers);
  settleMapLayout();
  scheduleAudit();

  if (tab !== "liveFinder" && tab !== "explorer") return;
  if (Date.now() < closeIntentUntil) return;

  RETRY_DELAYS_MS.forEach((delay) => {
    retryTimers.push(window.setTimeout(() => {
      if (generation !== recoveryGeneration || currentTab() !== tab || Date.now() < closeIntentUntil) return;
      if (panelIsOpen(tab)) {
        controller()?.sync?.();
        scheduleAudit();
        return;
      }

      const launcher = launcherFor(tab);
      if (!launcher || launcher.disabled) return;
      const now = performance.now();
      if (now - lastLaunchAt < 180) return;
      lastLaunchAt = now;
      launcher.click();
      controller()?.sync?.();
      settleMapLayout();
      scheduleAudit();
    }, delay));
  });
}

function tabFromEvent(event: Event): GuardedWorkspaceTab | null {
  const customEvent = event as CustomEvent<{ tab?: GuardedWorkspaceTab }>;
  const tab = customEvent.detail?.tab;
  return tab === "providers" || tab === "mapTools" || tab === "liveFinder" || tab === "explorer" ? tab : null;
}

function handleWorkspaceEvent(event: Event): void {
  recoverPanel(tabFromEvent(event) || currentTab());
}

function handleDocumentClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;

  if (target.closest(CLOSE_SELECTOR)) {
    closeIntentUntil = Date.now() + 1200;
    recoveryGeneration += 1;
    clearTimers(retryTimers);
    settleMapLayout();
    scheduleAudit();
    return;
  }

  const tabButton = target.closest<HTMLButtonElement>(".occumed-sidebar-workspace-tab");
  const tab = tabButton?.dataset.workspaceTab as GuardedWorkspaceTab | undefined;
  if (tab === "providers" || tab === "mapTools" || tab === "liveFinder" || tab === "explorer") {
    closeIntentUntil = 0;
    window.setTimeout(() => recoverPanel(tab), 0);
  }
}

function handleFocus(): void {
  recoverPanel(currentTab());
}

function handleVisibility(): void {
  if (!document.hidden) recoverPanel(currentTab());
}

function handleResize(): void {
  scheduleAudit();
}

function cleanup(): void {
  recoveryGeneration += 1;
  clearTimers(retryTimers);
  clearTimers(auditTimers);
  window.removeEventListener("network-map:sidebar-workspace", handleWorkspaceEvent);
  document.removeEventListener("click", handleDocumentClick, true);
  window.removeEventListener("focus", handleFocus);
  document.removeEventListener("visibilitychange", handleVisibility);
  window.removeEventListener("resize", handleResize);
}

function install(): void {
  window.addEventListener("network-map:sidebar-workspace", handleWorkspaceEvent);
  document.addEventListener("click", handleDocumentClick, true);
  window.addEventListener("focus", handleFocus, { passive: true });
  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("resize", handleResize, { passive: true });
  window.addEventListener("beforeunload", cleanup, { once: true });

  window.__NETWORK_MAP_UI_INTEGRITY__ = {
    audit: auditLayout,
    recover: () => recoverPanel(currentTab()),
    lastResult: () => lastAudit,
  };

  recoverPanel(currentTab());
  retryTimers.push(window.setTimeout(() => recoverPanel(currentTab()), 450));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", install, { once: true });
} else {
  install();
}

export {};

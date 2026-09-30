import { registerRuntimeOwner } from "./runtimeControllerRegistry";

type GuardedWorkspaceTab = "providers" | "mapTools" | "find" | "results";

type SidebarWorkspaceController = {
  getActiveTab?: () => GuardedWorkspaceTab;
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

let auditTimers: number[] = [];
let lastAudit: UiIntegrityResult | null = null;

function controller(): SidebarWorkspaceController | null {
  return (window as typeof window & {
    __NETWORK_MAP_SIDEBAR_WORKSPACES__?: SidebarWorkspaceController;
  }).__NETWORK_MAP_SIDEBAR_WORKSPACES__ || null;
}

function currentTab(): GuardedWorkspaceTab {
  const reported = controller()?.getActiveTab?.();
  if (reported === "providers" || reported === "mapTools" || reported === "find" || reported === "results") {
    return reported;
  }
  const datasetTab = document.documentElement.dataset.occumedworkspace;
  if (datasetTab === "mapTools" || datasetTab === "find" || datasetTab === "results") return datasetTab as GuardedWorkspaceTab;
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
  if (tab === "providers") {
    return document.querySelector<HTMLElement>(
      ".sidebar.occumed-sidebar-workspace-scope > .occumed-sidebar-provider-content",
    );
  }
  if (tab === "mapTools") {
    return document.querySelector<HTMLElement>(
      ".occumed-sidebar-workspace-host > .occumed-map-tools-panel",
    );
  }
  if (tab === "find") return document.querySelector<HTMLElement>("#sidebar-find-panel");
  return document.querySelector<HTMLElement>("#sidebar-results-panel");
}

function panelHasUsableContent(tab: GuardedWorkspaceTab): boolean {
  const panel = panelFor(tab);
  if (!(panel instanceof HTMLElement)) return false;
  const text = (panel.textContent || "").replace(/\s+/g, " ").trim();
  const actionCount = panel.querySelectorAll(
    "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)",
  ).length;
  return text.length >= 24 && actionCount > 0;
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
  if (!panelHasUsableContent(tab)) failures.push(`${tab}-workspace-empty`);

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

    if (tab === "mapTools") {
      const tools = document.querySelector<HTMLElement>(".occumed-sidebar-workspace-host > .occumed-map-tools-panel");
      if (!elementIsVisible(tools)) failures.push("map-tools-hidden");
      else if (tools.scrollWidth > tools.clientWidth + 2) failures.push("map-tools-horizontal-overflow");
    }
  }

  lastAudit = {
    tab,
    healthy: failures.length === 0,
    failures,
    measuredAt: Date.now(),
  };
  document.documentElement.dataset.occumedUiIntegrity = lastAudit.healthy ? "healthy" : "degraded";
  return lastAudit;
}

function clearAuditTimers(): void {
  auditTimers.forEach((timer) => window.clearTimeout(timer));
  auditTimers = [];
}

function scheduleAudit(): void {
  clearAuditTimers();
  [0, 120, 360, 900].forEach((delay) => {
    auditTimers.push(window.setTimeout(auditLayout, delay));
  });
}

function handleWorkspaceEvent(): void {
  scheduleAudit();
}

function handleFocus(): void {
  scheduleAudit();
}

function handleVisibility(): void {
  if (!document.hidden) scheduleAudit();
}

function handleResize(): void {
  scheduleAudit();
}

function cleanup(): void {
  clearAuditTimers();
  window.removeEventListener("network-map:sidebar-workspace", handleWorkspaceEvent);
  window.removeEventListener("focus", handleFocus);
  document.removeEventListener("visibilitychange", handleVisibility);
  window.removeEventListener("resize", handleResize);
}

function install(): void {
  if (!registerRuntimeOwner("sidebar-workspace-integrity", "Read-only sidebar workspace geometry and visibility diagnostics")) return;

  window.addEventListener("network-map:sidebar-workspace", handleWorkspaceEvent);
  window.addEventListener("focus", handleFocus, { passive: true });
  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("resize", handleResize, { passive: true });
  window.addEventListener("beforeunload", cleanup, { once: true });

  window.__NETWORK_MAP_UI_INTEGRITY__ = {
    audit: auditLayout,
    recover: scheduleAudit,
    lastResult: () => lastAudit,
  };

  scheduleAudit();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", install, { once: true });
} else {
  install();
}

export {};

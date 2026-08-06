type GuardedWorkspaceTab = "providers" | "mapTools" | "liveFinder" | "explorer";

type SidebarWorkspaceController = {
  getActiveTab?: () => GuardedWorkspaceTab;
  sync?: () => void;
};

const RETRY_DELAYS_MS = [0, 80, 220, 480, 850, 1350, 2200];
const PANEL_SELECTORS: Partial<Record<GuardedWorkspaceTab, string>> = {
  liveFinder: ".live-panel.open",
  explorer: ".provider-explorer-drawer.open",
};

let recoveryGeneration = 0;

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

function panelIsOpen(tab: GuardedWorkspaceTab): boolean {
  const selector = PANEL_SELECTORS[tab];
  return selector ? Boolean(document.querySelector(selector)) : true;
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

function settleMapLayout(): void {
  const emitResize = () => window.dispatchEvent(new Event("resize"));
  window.requestAnimationFrame(emitResize);
  window.setTimeout(emitResize, 90);
  window.setTimeout(emitResize, 280);
}

function recoverPanel(tab: GuardedWorkspaceTab): void {
  recoveryGeneration += 1;
  const generation = recoveryGeneration;
  settleMapLayout();

  if (tab !== "liveFinder" && tab !== "explorer") return;

  RETRY_DELAYS_MS.forEach((delay) => {
    window.setTimeout(() => {
      if (generation !== recoveryGeneration || currentTab() !== tab) return;
      if (panelIsOpen(tab)) {
        controller()?.sync?.();
        settleMapLayout();
        return;
      }

      const launcher = launcherFor(tab);
      if (!launcher || launcher.disabled) return;
      launcher.click();
      controller()?.sync?.();
      settleMapLayout();
    }, delay);
  });
}

function tabFromEvent(event: Event): GuardedWorkspaceTab | null {
  const customEvent = event as CustomEvent<{ tab?: GuardedWorkspaceTab }>;
  const tab = customEvent.detail?.tab;
  return tab === "providers" || tab === "mapTools" || tab === "liveFinder" || tab === "explorer" ? tab : null;
}

function install(): void {
  window.addEventListener("network-map:sidebar-workspace", (event) => {
    recoverPanel(tabFromEvent(event) || currentTab());
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const closeButton = target.closest(
      ".live-panel .rp-close, .provider-explorer-drawer .provider-drawer-header > button, " +
      ".live-panel button[aria-label*='close' i], .provider-explorer-drawer button[aria-label*='close' i], " +
      ".live-panel button[title*='close' i], .provider-explorer-drawer button[title*='close' i]",
    );
    if (closeButton) {
      recoveryGeneration += 1;
      settleMapLayout();
      return;
    }

    const tabButton = target.closest<HTMLButtonElement>(".occumed-sidebar-workspace-tab");
    const tab = tabButton?.dataset.workspaceTab as GuardedWorkspaceTab | undefined;
    if (tab === "providers" || tab === "mapTools" || tab === "liveFinder" || tab === "explorer") {
      window.setTimeout(() => recoverPanel(tab), 0);
    }
  }, true);

  window.addEventListener("focus", () => recoverPanel(currentTab()), { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) recoverPanel(currentTab());
  });

  recoverPanel(currentTab());
  window.setTimeout(() => recoverPanel(currentTab()), 450);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", install, { once: true });
} else {
  install();
}

export {};

(() => {
  const CONTROLLER_KEY = "__NETWORK_MAP_SIDEBAR_WORKSPACES__";
  const VALID_TABS = new Set(["providers", "mapTools", "liveFinder", "explorer"]);
  const PANEL_SELECTOR = {
    liveFinder: ".live-panel",
    explorer: ".provider-explorer-drawer",
  };
  const OPEN_SELECTOR = {
    liveFinder: ".live-panel.open",
    explorer: ".provider-explorer-drawer.open",
  };
  const CLOSE_SELECTOR = ".rp-close, .provider-drawer-header > button, button[aria-label*='close' i], button[title*='close' i]";
  const MIN_OPEN_ATTEMPT_GAP_MS = 220;

  let selectedTab = "providers";
  let syncTimer = null;
  let observer = null;
  let closeIntentUntil = 0;
  const lastOpenAttempt = { liveFinder: 0, explorer: 0 };

  function normalizedText(node) {
    return (node && node.textContent ? node.textContent : "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function controller() {
    return window[CONTROLLER_KEY] || null;
  }

  function currentTab() {
    const api = controller();
    const reported = api && typeof api.getActiveTab === "function" ? api.getActiveTab() : "";
    if (VALID_TABS.has(reported)) selectedTab = reported;
    return selectedTab;
  }

  function panelIsOpen(tab) {
    return Boolean(document.querySelector(OPEN_SELECTOR[tab]));
  }

  function findLauncher(tab) {
    if (tab === "liveFinder") {
      const direct = document.querySelector(".unified-live-tool");
      if (direct instanceof HTMLButtonElement) return direct;
      return Array.from(document.querySelectorAll(".command-tool-grid button, .sidebar button"))
        .find((button) => {
          const text = normalizedText(button);
          return text === "live places" || text === "live finder" || text.includes("live places");
        }) || null;
    }

    const direct = document.querySelector(".unified-explorer-tool, .provider-explorer-launch");
    if (direct instanceof HTMLButtonElement) return direct;
    return Array.from(document.querySelectorAll(".command-header .command-action, .sidebar button"))
      .find((button) => normalizedText(button).includes("provider explorer")) || null;
  }

  function applyWorkspaceAttributes(tab) {
    document.documentElement.dataset.occumedworkspace = tab;
    const sidebar = document.querySelector(".sidebar");
    if (sidebar instanceof HTMLElement) sidebar.dataset.occumedWorkspaceTab = tab;
  }

  function scheduleSync(delay = 48) {
    if (syncTimer !== null) window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => {
      syncTimer = null;
      reconcile();
    }, delay);
  }

  function ensureSelectedPanel(tab) {
    if (panelIsOpen(tab)) return;

    const now = performance.now();
    if (now - lastOpenAttempt[tab] < MIN_OPEN_ATTEMPT_GAP_MS) {
      scheduleSync(MIN_OPEN_ATTEMPT_GAP_MS);
      return;
    }

    const launcher = findLauncher(tab);
    if (!(launcher instanceof HTMLButtonElement)) {
      scheduleSync(160);
      return;
    }

    lastOpenAttempt[tab] = now;
    launcher.click();
    scheduleSync(180);
  }

  function reconcile() {
    const tab = currentTab();
    applyWorkspaceAttributes(tab);

    if (Date.now() < closeIntentUntil) return;
    if (tab === "liveFinder" || tab === "explorer") ensureSelectedPanel(tab);
  }

  function panelTabForButton(button) {
    const livePanel = button.closest(PANEL_SELECTOR.liveFinder);
    if (livePanel) return "liveFinder";
    const explorerPanel = button.closest(PANEL_SELECTOR.explorer);
    if (explorerPanel) return "explorer";
    return "";
  }

  function isCloseButton(button) {
    return button.matches(CLOSE_SELECTOR) || normalizedText(button) === "close";
  }

  function install() {
    window.addEventListener("network-map:sidebar-workspace", (event) => {
      const tab = event && event.detail ? event.detail.tab : "";
      if (VALID_TABS.has(tab)) selectedTab = tab;
      scheduleSync(0);
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button");
      if (!(button instanceof HTMLButtonElement) || !isCloseButton(button)) return;

      const panelTab = panelTabForButton(button);
      if (!panelTab || currentTab() !== panelTab) return;

      closeIntentUntil = Date.now() + 800;
      window.setTimeout(() => {
        selectedTab = "providers";
        const api = controller();
        if (api && typeof api.setActiveTab === "function") api.setActiveTab("providers", false);
        scheduleSync(0);
      }, 0);
    }, true);

    observer = new MutationObserver(() => scheduleSync());
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "hidden", "aria-hidden", "data-provider-tool"],
      });
    }

    window.addEventListener("focus", () => scheduleSync(0), { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) scheduleSync(0);
    });
    window.addEventListener("beforeunload", () => observer && observer.disconnect(), { once: true });

    scheduleSync(0);
    window.setTimeout(() => scheduleSync(0), 350);
    window.setTimeout(() => scheduleSync(0), 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();

const STYLE_ID = "occumed-sidebar-workspace-consistency-style";
const HOST_CLASS = "occumed-sidebar-maptools-host";
const TABS_CLASS = "occumed-sidebar-workspace-tabs";
const PROVIDER_CONTENT_CLASS = "occumed-sidebar-provider-content";
const WORKSPACE_ATTRIBUTE = "occumedworkspace";

let observer: MutationObserver | null = null;
let syncTimer: number | null = null;

const styles = `
  :root {
    --workspace-control-bg: #071d30;
    --workspace-control-bg-hover: #0a2b43;
    --workspace-control-bg-active: #0b6582;
    --workspace-control-border: rgba(82, 184, 216, 0.46);
    --workspace-control-border-hover: rgba(117, 222, 244, 0.72);
    --workspace-control-text: #dcebf2;
    --workspace-control-muted: #9fb7c5;
    --workspace-panel-bg: #061421;
    --workspace-card-bg: #0a1c2c;
  }

  /* Keep the four workspace tabs identical to the Explorer controls. */
  html body .sidebar > .${TABS_CLASS} {
    gap: 6px !important;
    padding: 6px !important;
    border-color: rgba(82, 184, 216, 0.38) !important;
    background: var(--workspace-panel-bg) !important;
  }

  html body .sidebar > .${TABS_CLASS} .occumed-sidebar-workspace-tab {
    min-height: 40px !important;
    padding: 7px 5px !important;
    color: var(--workspace-control-text) !important;
    border: 1px solid var(--workspace-control-border) !important;
    border-radius: 10px !important;
    background: var(--workspace-control-bg) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.04) !important;
    font-size: 10.5px !important;
    font-weight: 800 !important;
    line-height: 1.15 !important;
  }

  html body .sidebar > .${TABS_CLASS} .occumed-sidebar-workspace-tab:hover {
    color: #f6fdff !important;
    border-color: var(--workspace-control-border-hover) !important;
    background: var(--workspace-control-bg-hover) !important;
    box-shadow: 0 0 16px rgba(57, 191, 224, .18) !important;
  }

  html body .sidebar > .${TABS_CLASS} .occumed-sidebar-workspace-tab.active,
  html body .sidebar > .${TABS_CLASS} .occumed-sidebar-workspace-tab[aria-selected="true"] {
    color: #ffffff !important;
    border-color: rgba(143, 235, 250, .88) !important;
    background: linear-gradient(180deg, #117c9b, #084c68) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.13), 0 0 18px rgba(51, 200, 229, .26) !important;
  }

  /* Non-provider workspaces replace the provider content instead of sitting over it. */
  html body .sidebar[data-occumed-workspace-tab]:not([data-occumed-workspace-tab="providers"]) > .${PROVIDER_CONTENT_CLASS}:not(.${HOST_CLASS}) {
    display: none !important;
  }

  html body .sidebar > .${HOST_CLASS} {
    display: none !important;
    width: 100% !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    visibility: visible !important;
    pointer-events: auto !important;
  }

  html[data-${WORKSPACE_ATTRIBUTE}="mapTools"] body .sidebar > .${HOST_CLASS} {
    display: block !important;
  }

  /* Map Tools is physically docked into the left sidebar. It must never float on the map. */
  html[data-${WORKSPACE_ATTRIBUTE}="mapTools"] body .sidebar > .${HOST_CLASS} > .occumed-map-tools-panel {
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
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  html[data-${WORKSPACE_ATTRIBUTE}="mapTools"] body .occumed-map-tools-panel .occumed-basemap-title {
    position: static !important;
    margin: 0 0 10px !important;
    padding: 10px 11px !important;
    color: #e8f8fc !important;
    border: 1px solid rgba(82,184,216,.28) !important;
    border-radius: 11px !important;
    background: var(--workspace-card-bg) !important;
    font-size: 12px !important;
  }

  /* One visual system for Providers, Map Tools, Finder, and Explorer. */
  html body :is(
    .sidebar,
    .live-panel,
    .provider-explorer-drawer,
    .occumed-map-tools-panel
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
  }

  html body :is(
    .sidebar,
    .live-panel,
    .provider-explorer-drawer,
    .occumed-map-tools-panel
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
    transform: none !important;
  }

  html body :is(
    .sidebar,
    .live-panel,
    .provider-explorer-drawer,
    .occumed-map-tools-panel
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

  html body :is(.sidebar, .live-panel, .provider-explorer-drawer, .occumed-map-tools-panel) button:disabled {
    color: rgba(184,205,215,.5) !important;
    border-color: rgba(82,145,168,.18) !important;
    background: #071522 !important;
    opacity: .62 !important;
  }

  /* Preserve compact icon-close controls while matching the palette. */
  html body :is(.live-panel, .provider-explorer-drawer, .occumed-map-tools-panel) .rp-close,
  html body .provider-drawer-header > button {
    color: var(--workspace-control-text) !important;
    border: 1px solid var(--workspace-control-border) !important;
    background: var(--workspace-control-bg) !important;
    font-size: 10.5px !important;
  }

  /* Panels and cards use the Explorer tab's dark navy treatment. */
  html body :is(.live-panel, .provider-explorer-drawer) {
    color: #dcebf2 !important;
    border-color: rgba(82,184,216,.28) !important;
    background: var(--workspace-panel-bg) !important;
  }

  html body :is(
    .occumed-map-tools-section,
    .provider-drawer-section,
    .live-panel .lp-item,
    .live-panel .lp-controls > div,
    .sidebar .hero-card,
    .sidebar > .sb-section
  ) {
    color: #dcebf2 !important;
    border-color: rgba(82,184,216,.22) !important;
    background: var(--workspace-card-bg) !important;
    box-shadow: none !important;
  }

  html body :is(.sidebar, .live-panel, .provider-explorer-drawer, .occumed-map-tools-panel) :is(
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

  html body :is(.sidebar, .live-panel, .provider-explorer-drawer, .occumed-map-tools-panel) :is(
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

  html body :is(.sidebar, .live-panel, .provider-explorer-drawer, .occumed-map-tools-panel) :is(
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

  html body .sidebar .command-section-toggle {
    min-height: 38px !important;
    padding: 8px 10px !important;
    color: var(--workspace-control-text) !important;
    border: 1px solid var(--workspace-control-border) !important;
    border-radius: 10px !important;
    background: var(--workspace-control-bg) !important;
    font-size: 11.5px !important;
  }

  html body .sidebar .workflow-layer,
  html body .sidebar .tog-row,
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
    html body .sidebar > .${TABS_CLASS} .occumed-sidebar-workspace-tab {
      font-size: 11px !important;
    }
  }
`;

function installStyle(): void {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = styles;
  }
  if (style.textContent !== styles) style.textContent = styles;
  if (style.parentElement !== document.head || style.nextSibling) document.head.appendChild(style);
}

function ensureHost(): HTMLElement | null {
  const sidebar = document.querySelector<HTMLElement>(".sidebar");
  const tabs = sidebar?.querySelector<HTMLElement>(`:scope > .${TABS_CLASS}`);
  if (!sidebar || !tabs) return null;

  let host = sidebar.querySelector<HTMLElement>(`:scope > .${HOST_CLASS}`);
  if (!host) {
    host = document.createElement("div");
    host.className = HOST_CLASS;
    host.setAttribute("aria-label", "Map tools workspace");
    tabs.insertAdjacentElement("afterend", host);
  }
  host.classList.remove(PROVIDER_CONTENT_CLASS);
  return host;
}

function dockMapTools(): void {
  const host = ensureHost();
  if (!host) return;
  const panel = document.querySelector<HTMLElement>(`.occumed-map-tools-panel`);
  if (!panel || panel.parentElement === host) return;
  host.appendChild(panel);
  panel.dataset.sidebarDocked = "true";
}

function sync(): void {
  installStyle();
  ensureHost();
  dockMapTools();
}

function scheduleSync(delay = 20): void {
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    sync();
  }, delay);
}

function install(): void {
  scheduleSync(0);
  if (observer) return;
  observer = new MutationObserver(() => scheduleSync());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", `data-${WORKSPACE_ATTRIBUTE}`, "aria-hidden"],
  });
  window.addEventListener("resize", () => scheduleSync(50), { passive: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", install, { once: true });
} else {
  install();
}

export {};

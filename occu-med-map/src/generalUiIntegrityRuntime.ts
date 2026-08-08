import { registerRuntimeOwner, subscribeToSharedDomObserver } from "./runtimeControllerRegistry";

type GeneralUiAuditResult = {
  healthy: boolean;
  failures: string[];
  viewport: { width: number; height: number };
  visibleDialogs: number;
  measuredAt: number;
};

declare global {
  interface Window {
    __NETWORK_MAP_GENERAL_UI__?: {
      audit: () => GeneralUiAuditResult;
      recover: () => void;
      lastResult: () => GeneralUiAuditResult | null;
    };
  }
}

const DIALOG_SELECTOR = [
  ".modal-backdrop.open .modal-box",
  ".modal-backdrop:not([hidden]) .modal-box",
  ".pdf-modal-wrap",
].join(", ");
const OVERLAY_SELECTOR = [
  ".command-search-results",
  ".local-pop-card",
  ".tz-legend",
  ".leaflet-popup",
  ".mapboxgl-popup",
  ".modal-backdrop.open .modal-box",
  ".pdf-modal-wrap",
  ".pdf-toolbar",
].join(", ");

let frame: number | null = null;
let lastAudit: GeneralUiAuditResult | null = null;
let unsubscribeDomObserver: (() => void) | null = null;

function isVisible(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  if (element.hidden || element.getAttribute("aria-hidden") === "true") return false;
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity || 1) === 0) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 2 && rect.height > 2;
}

function visibleDialogs(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(DIALOG_SELECTOR)).filter(isVisible);
}

function withinViewport(rect: DOMRect, tolerance = 12): boolean {
  return rect.left >= -tolerance
    && rect.top >= -tolerance
    && rect.right <= window.innerWidth + tolerance
    && rect.bottom <= window.innerHeight + tolerance;
}

function audit(): GeneralUiAuditResult {
  const failures: string[] = [];
  const documentWidth = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
  if (documentWidth > window.innerWidth + 3) failures.push(`document overflow ${documentWidth - window.innerWidth}px`);

  const header = document.querySelector<HTMLElement>(".command-header");
  if (header && isVisible(header)) {
    const rect = header.getBoundingClientRect();
    if (rect.left < -2 || rect.right > window.innerWidth + 2) failures.push("header exceeds viewport width");
    if (rect.height < 44) failures.push("header collapsed below usable height");
  }

  const appBody = document.querySelector<HTMLElement>(".app-body");
  if (appBody && isVisible(appBody)) {
    const rect = appBody.getBoundingClientRect();
    const minimumWidth = Math.min(400, Math.max(280, window.innerWidth - 4));
    const minimumHeight = Math.min(240, Math.max(180, window.innerHeight - 180));
    if (rect.width < minimumWidth || rect.height < minimumHeight) failures.push("application workspace collapsed");
  }

  document.querySelectorAll<HTMLElement>(OVERLAY_SELECTOR).forEach((element) => {
    if (!isVisible(element)) return;
    const rect = element.getBoundingClientRect();
    if (!withinViewport(rect)) {
      const name = element.className || element.tagName.toLowerCase();
      failures.push(`offscreen overlay: ${String(name).slice(0, 80)}`);
    }
    if (element.scrollWidth > element.clientWidth + 3) {
      const name = element.className || element.tagName.toLowerCase();
      failures.push(`horizontal overflow: ${String(name).slice(0, 80)}`);
    }
  });

  const dialogs = visibleDialogs();
  if (dialogs.length > 1) failures.push(`${dialogs.length} dialogs visible simultaneously`);
  dialogs.forEach((dialog) => {
    if (dialog.getAttribute("role") !== "dialog") failures.push("visible modal missing dialog role");
    if (dialog.getAttribute("aria-modal") !== "true") failures.push("visible modal missing aria-modal");
    if (!dialog.hasAttribute("tabindex")) failures.push("visible modal missing managed focus target");
  });

  const selectedWorkspaceTabs = document.querySelectorAll(
    ".occumed-sidebar-workspace-tab[aria-selected='true']",
  ).length;
  if (selectedWorkspaceTabs > 1) failures.push("multiple sidebar workspaces selected");

  const dialogController = window.__NETWORK_MAP_DIALOG_CONTROLLER__?.snapshot();
  if (dialogController && dialogController.visibleDialogs !== dialogs.length) {
    failures.push("dialog controller and UI audit disagree on visible dialogs");
  }

  const result: GeneralUiAuditResult = {
    healthy: failures.length === 0,
    failures,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    visibleDialogs: dialogs.length,
    measuredAt: Date.now(),
  };
  lastAudit = result;
  document.documentElement.dataset.occumedGeneralUi = result.healthy ? "healthy" : "degraded";
  document.documentElement.dataset.occumedUiOverflow = failures.some((failure) => failure.includes("overflow"))
    ? "true"
    : "false";
  return result;
}

function scheduleAudit(): void {
  if (frame !== null) return;
  frame = window.requestAnimationFrame(() => {
    frame = null;
    audit();
  });
}

/**
 * Compatibility API retained for callers that previously asked the integrity
 * monitor to "recover" the UI. Recovery is now diagnostic-only: ownership
 * controllers are responsible for behavior, while this method only re-audits.
 */
function recover(): void {
  scheduleAudit();
}

function handleVisibilityChange(): void {
  if (!document.hidden) scheduleAudit();
}

function mutationTouchesAuditedSurface(mutation: MutationRecord): boolean {
  const target = mutation.target instanceof Element ? mutation.target : null;
  if (target?.closest(".app-wrap, .command-header, .app-body, .occumed-sidebar-workspace-host, .modal-backdrop, .modal-box, .pdf-modal-wrap, .leaflet-popup, .mapboxgl-popup, .command-search-results, .local-pop-card, .tz-legend")) return true;
  return Array.from(mutation.addedNodes).some((node) =>
    node instanceof Element
      && Boolean(node.matches(".modal-backdrop, .modal-box, .pdf-modal-wrap, .leaflet-popup, .mapboxgl-popup, .command-search-results, .local-pop-card, .tz-legend")
        || node.querySelector(".modal-backdrop, .modal-box, .pdf-modal-wrap, .leaflet-popup, .mapboxgl-popup, .command-search-results, .local-pop-card, .tz-legend")),
  );
}

function install(): void {
  if (!registerRuntimeOwner("general-ui-integrity", "Read-only UI geometry, overflow, dialog, and workspace diagnostics")) return;

  unsubscribeDomObserver = subscribeToSharedDomObserver("general-ui-integrity", (mutations) => {
    if (mutations.some(mutationTouchesAuditedSurface)) scheduleAudit();
  });
  window.addEventListener("resize", scheduleAudit, { passive: true });
  window.addEventListener("orientationchange", scheduleAudit, { passive: true });
  window.addEventListener("focus", scheduleAudit, { passive: true });
  document.addEventListener("visibilitychange", handleVisibilityChange);

  window.__NETWORK_MAP_GENERAL_UI__ = {
    audit,
    recover,
    lastResult: () => lastAudit,
  };

  scheduleAudit();
  window.setTimeout(scheduleAudit, 450);
  window.setTimeout(scheduleAudit, 1400);
}

function cleanup(): void {
  if (frame !== null) window.cancelAnimationFrame(frame);
  frame = null;
  unsubscribeDomObserver?.();
  unsubscribeDomObserver = null;
  window.removeEventListener("resize", scheduleAudit);
  window.removeEventListener("orientationchange", scheduleAudit);
  window.removeEventListener("focus", scheduleAudit);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", install, { once: true });
} else {
  install();
}
window.addEventListener("beforeunload", cleanup, { once: true });

export {};

type GeneralUiAuditResult = {
  healthy: boolean;
  failures: string[];
  viewport: { width: number; height: number };
  visibleDialogs: number;
  measuredAt: number;
};

type DialogState = {
  dialog: HTMLElement;
  opener: HTMLElement | null;
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
const AUDIT_RELEVANT_SELECTOR = [
  DIALOG_SELECTOR,
  OVERLAY_SELECTOR,
  ".command-header",
  ".app-body",
  ".sidebar",
  ".map-wrap",
  ".occumed-sidebar-workspace-tab",
].join(", ");
const RESIZE_TARGET_SELECTOR = [
  ".command-header",
  ".app-body",
  ".sidebar",
  ".map-wrap",
  DIALOG_SELECTOR,
].join(", ");
const CLOSE_SELECTOR = [
  ".modal-close",
  ".rp-close",
  ".pdf-toolbar button[aria-label*='close' i]",
  "button[aria-label*='close' i]",
  "button[title*='close' i]",
].join(", ");
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");
const MIN_AUDIT_INTERVAL_MS = 90;

let mutationObserver: MutationObserver | null = null;
let resizeObserver: ResizeObserver | null = null;
let frame: number | null = null;
let auditTimer: number | null = null;
let recoveryTimer: number | null = null;
let lastAuditAt = 0;
let lastAudit: GeneralUiAuditResult | null = null;
let activeDialogs: DialogState[] = [];
let dialogSequence = 0;

function normalizedText(node: Element | null): string {
  return (node?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
}

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

function topDialog(): HTMLElement | null {
  const dialogs = visibleDialogs();
  return dialogs[dialogs.length - 1] || null;
}

function focusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    if (!isVisible(element)) return false;
    return element.getAttribute("aria-hidden") !== "true";
  });
}

function titleFor(dialog: HTMLElement): HTMLElement | null {
  return dialog.querySelector<HTMLElement>(
    ".modal-header h1, .modal-header h2, .modal-header h3, .modal-header strong, " +
    ".modal-title, [data-dialog-title], .pdf-toolbar > span",
  );
}

function prepareDialog(dialog: HTMLElement): void {
  if (!dialog.hasAttribute("role")) dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  if (!dialog.hasAttribute("tabindex")) dialog.tabIndex = -1;

  const title = titleFor(dialog);
  if (title && !dialog.hasAttribute("aria-labelledby")) {
    if (!title.id) {
      dialogSequence += 1;
      title.id = `network-map-dialog-title-${dialogSequence}`;
    }
    dialog.setAttribute("aria-labelledby", title.id);
  }
}

function syncDialogs(): void {
  const current = visibleDialogs();
  current.forEach(prepareDialog);

  const previousDialogs = new Set(activeDialogs.map((state) => state.dialog));
  const next: DialogState[] = current.map((dialog) => {
    const existing = activeDialogs.find((state) => state.dialog === dialog);
    if (existing) return existing;
    const active = document.activeElement;
    const opener = active instanceof HTMLElement && !dialog.contains(active) ? active : null;
    return { dialog, opener };
  });

  activeDialogs.forEach((state) => {
    if (current.includes(state.dialog)) return;
    if (state.opener?.isConnected) state.opener.focus({ preventScroll: true });
  });

  activeDialogs = next;
  document.documentElement.dataset.occumedModalOpen = current.length ? "true" : "false";

  const newest = current.find((dialog) => !previousDialogs.has(dialog));
  if (newest && !newest.contains(document.activeElement)) {
    const first = focusableElements(newest)[0];
    (first || newest).focus({ preventScroll: true });
  }
}

function withinViewport(rect: DOMRect, tolerance = 12): boolean {
  return rect.left >= -tolerance
    && rect.top >= -tolerance
    && rect.right <= window.innerWidth + tolerance
    && rect.bottom <= window.innerHeight + tolerance;
}

function audit(): GeneralUiAuditResult {
  lastAuditAt = performance.now();
  syncDialogs();
  const failures = new Set<string>();
  const documentWidth = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
  if (documentWidth > window.innerWidth + 3) failures.add(`document overflow ${documentWidth - window.innerWidth}px`);

  const header = document.querySelector<HTMLElement>(".command-header");
  if (header && isVisible(header)) {
    const rect = header.getBoundingClientRect();
    if (rect.left < -2 || rect.right > window.innerWidth + 2) failures.add("header exceeds viewport width");
    if (rect.height < 44) failures.add("header collapsed below usable height");
  }

  const appBody = document.querySelector<HTMLElement>(".app-body");
  if (appBody && isVisible(appBody)) {
    const rect = appBody.getBoundingClientRect();
    const minimumWidth = Math.min(400, Math.max(280, window.innerWidth - 4));
    const minimumHeight = Math.min(240, Math.max(180, window.innerHeight - 180));
    if (rect.width < minimumWidth || rect.height < minimumHeight) failures.add("application workspace collapsed");
  }

  document.querySelectorAll<HTMLElement>(OVERLAY_SELECTOR).forEach((element) => {
    if (!isVisible(element)) return;
    const rect = element.getBoundingClientRect();
    const name = String(element.className || element.tagName.toLowerCase()).slice(0, 80);
    if (!withinViewport(rect)) failures.add(`offscreen overlay: ${name}`);
    if (element.scrollWidth > element.clientWidth + 3) failures.add(`horizontal overflow: ${name}`);
  });

  const dialogs = visibleDialogs();
  if (dialogs.length > 1) failures.add(`${dialogs.length} dialogs visible simultaneously`);
  dialogs.forEach((dialog) => {
    if (dialog.getAttribute("role") !== "dialog") failures.add("visible modal missing dialog role");
    if (dialog.getAttribute("aria-modal") !== "true") failures.add("visible modal missing aria-modal");
  });

  const selectedWorkspaceTabs = document.querySelectorAll(
    ".occumed-sidebar-workspace-tab[aria-selected='true']",
  ).length;
  if (selectedWorkspaceTabs > 1) failures.add("multiple sidebar workspaces selected");

  const failureList = Array.from(failures);
  const result: GeneralUiAuditResult = {
    healthy: failureList.length === 0,
    failures: failureList,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    visibleDialogs: dialogs.length,
    measuredAt: Date.now(),
  };
  lastAudit = result;
  document.documentElement.dataset.occumedGeneralUi = result.healthy ? "healthy" : "degraded";
  document.documentElement.dataset.occumedUiOverflow = failureList.some((failure) => failure.includes("overflow"))
    ? "true"
    : "false";
  return result;
}

function runScheduledAudit(): void {
  frame = null;
  if (document.hidden) return;
  audit();
  refreshResizeTargets();
}

function scheduleAudit(): void {
  if (document.hidden || frame !== null || auditTimer !== null) return;
  const wait = Math.max(0, MIN_AUDIT_INTERVAL_MS - (performance.now() - lastAuditAt));
  if (wait > 0) {
    auditTimer = window.setTimeout(() => {
      auditTimer = null;
      frame = window.requestAnimationFrame(runScheduledAudit);
    }, wait);
    return;
  }
  frame = window.requestAnimationFrame(runScheduledAudit);
}

function elementAffectsAudit(element: Element): boolean {
  return element.matches(AUDIT_RELEVANT_SELECTOR)
    || Boolean(element.closest(AUDIT_RELEVANT_SELECTOR))
    || Boolean(element.querySelector(AUDIT_RELEVANT_SELECTOR));
}

function nodeAffectsAudit(node: Node): boolean {
  return node instanceof Element && elementAffectsAudit(node);
}

function mutationsAffectAudit(records: MutationRecord[]): boolean {
  return records.some((record) => {
    if (record.type === "attributes") {
      return record.target instanceof Element && elementAffectsAudit(record.target);
    }
    if (record.target instanceof Element && elementAffectsAudit(record.target)) return true;
    return Array.from(record.addedNodes).some(nodeAffectsAudit)
      || Array.from(record.removedNodes).some(nodeAffectsAudit);
  });
}

function handleMutations(records: MutationRecord[]): void {
  if (!mutationsAffectAudit(records)) return;
  refreshResizeTargets();
  scheduleAudit();
}

function refreshResizeTargets(): void {
  if (!resizeObserver) return;
  const root = document.getElementById("root");
  if (root) resizeObserver.observe(root);
  document.querySelectorAll<HTMLElement>(RESIZE_TARGET_SELECTOR).forEach((element) => {
    resizeObserver?.observe(element);
  });
}

function emitResize(): void {
  window.dispatchEvent(new Event("resize"));
}

function recover(): void {
  syncDialogs();
  emitResize();
  if (recoveryTimer !== null) window.clearTimeout(recoveryTimer);
  recoveryTimer = window.setTimeout(() => {
    recoveryTimer = null;
    emitResize();
    audit();
  }, 140);
}

function closeButtonFor(dialog: HTMLElement): HTMLButtonElement | null {
  const direct = dialog.querySelector<HTMLButtonElement>(CLOSE_SELECTOR);
  if (direct) return direct;
  return Array.from(dialog.querySelectorAll<HTMLButtonElement>("button"))
    .find((button) => normalizedText(button) === "close") || null;
}

function handleKeydown(event: KeyboardEvent): void {
  const dialog = topDialog();
  if (!dialog) return;

  if (event.key === "Escape") {
    const close = closeButtonFor(dialog);
    if (close && !close.disabled) {
      event.preventDefault();
      close.click();
    }
    return;
  }

  if (event.key !== "Tab") return;
  const focusable = focusableElements(dialog);
  if (!focusable.length) {
    event.preventDefault();
    dialog.focus({ preventScroll: true });
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !dialog.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function handleVisibilityChange(): void {
  if (!document.hidden) scheduleAudit();
}

function install(): void {
  if (!document.body || mutationObserver) return;
  mutationObserver = new MutationObserver(handleMutations);
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "hidden", "aria-hidden", "aria-selected"],
  });

  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(scheduleAudit);
    refreshResizeTargets();
  }

  document.addEventListener("keydown", handleKeydown, true);
  window.addEventListener("resize", scheduleAudit, { passive: true });
  window.addEventListener("orientationchange", scheduleAudit, { passive: true });
  window.addEventListener("pageshow", scheduleAudit, { passive: true });
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
  if (auditTimer !== null) window.clearTimeout(auditTimer);
  auditTimer = null;
  if (recoveryTimer !== null) window.clearTimeout(recoveryTimer);
  recoveryTimer = null;
  mutationObserver?.disconnect();
  mutationObserver = null;
  resizeObserver?.disconnect();
  resizeObserver = null;
  document.removeEventListener("keydown", handleKeydown, true);
  window.removeEventListener("resize", scheduleAudit);
  window.removeEventListener("orientationchange", scheduleAudit);
  window.removeEventListener("pageshow", scheduleAudit);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", install, { once: true });
} else {
  install();
}
window.addEventListener("beforeunload", cleanup, { once: true });

export {};

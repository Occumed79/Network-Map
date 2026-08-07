import { registerRuntimeOwner, subscribeToSharedDomObserver } from "./runtimeControllerRegistry";

type DialogState = {
  dialog: HTMLElement;
  opener: HTMLElement | null;
};

type DialogControllerSnapshot = {
  visibleDialogs: number;
  topDialogClass: string | null;
};

declare global {
  interface Window {
    __NETWORK_MAP_DIALOG_CONTROLLER__?: {
      snapshot: () => DialogControllerSnapshot;
      sync: () => void;
    };
  }
}

const DIALOG_SELECTOR = [
  ".modal-backdrop.open .modal-box",
  ".modal-backdrop:not([hidden]) .modal-box",
  ".pdf-modal-wrap",
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

let activeDialogs: DialogState[] = [];
let dialogSequence = 0;
let syncQueued = false;

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
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) =>
    isVisible(element) && element.getAttribute("aria-hidden") !== "true",
  );
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

function restoreFocus(opener: HTMLElement | null): void {
  if (!opener?.isConnected) return;
  try {
    opener.focus({ preventScroll: true });
  } catch {
    opener.focus();
  }
}

function restoreFocusAfterClose(dialog: HTMLElement, opener: HTMLElement | null, attempt = 0): void {
  if (!dialog.isConnected || !isVisible(dialog)) {
    restoreFocus(opener);
    return;
  }
  if (attempt >= 6) return;
  window.requestAnimationFrame(() => restoreFocusAfterClose(dialog, opener, attempt + 1));
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
    restoreFocus(state.opener);
  });

  activeDialogs = next;
  document.documentElement.dataset.occumedModalOpen = current.length ? "true" : "false";

  const newest = current.find((dialog) => !previousDialogs.has(dialog));
  if (newest && !newest.contains(document.activeElement)) {
    const first = focusableElements(newest)[0];
    (first || newest).focus({ preventScroll: true });
  }
}

function scheduleSync(): void {
  if (syncQueued) return;
  syncQueued = true;
  window.requestAnimationFrame(() => {
    syncQueued = false;
    syncDialogs();
  });
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
      const opener = activeDialogs.find((state) => state.dialog === dialog)?.opener || null;
      event.preventDefault();
      close.click();
      restoreFocusAfterClose(dialog, opener);
      scheduleSync();
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

function mutationTouchesDialog(mutation: MutationRecord): boolean {
  const target = mutation.target instanceof Element ? mutation.target : null;
  if (target?.closest(".modal-backdrop, .modal-box, .pdf-modal-wrap, .pdf-toolbar")) return true;
  return Array.from(mutation.addedNodes).some((node) =>
    node instanceof Element
      && Boolean(node.matches(".modal-backdrop, .modal-box, .pdf-modal-wrap, .pdf-toolbar")
        || node.querySelector(".modal-backdrop, .modal-box, .pdf-modal-wrap, .pdf-toolbar")),
  );
}

function installDialogController(): void {
  if (!registerRuntimeOwner("dialog-controller", "Authoritative dialog semantics, focus containment, dismissal, and focus restoration")) return;

  document.addEventListener("keydown", handleKeydown, true);
  subscribeToSharedDomObserver("dialog-controller", (mutations) => {
    if (mutations.some(mutationTouchesDialog)) scheduleSync();
  });

  window.__NETWORK_MAP_DIALOG_CONTROLLER__ = {
    snapshot: () => {
      const dialogs = visibleDialogs();
      const top = dialogs[dialogs.length - 1] || null;
      return {
        visibleDialogs: dialogs.length,
        topDialogClass: top ? String(top.className || top.tagName) : null,
      };
    },
    sync: syncDialogs,
  };
  scheduleSync();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", installDialogController, { once: true });
} else {
  installDialogController();
}

export {};

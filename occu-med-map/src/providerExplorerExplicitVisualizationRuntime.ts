import { clearProviderExplorerNative } from "./providerExplorerNativeMapRuntime";
import { registerRuntimeOwner, subscribeToSharedDomObserver } from "./runtimeControllerRegistry";

type ProviderExplorerIntentGlobal = typeof window & {
  __NETWORK_MAP_PROVIDER_EXPLORER_INTENT__?: {
    isExplicitlyActive: () => boolean;
    reset: () => void;
  };
};

const VISUALIZATION_LABELS = new Set([
  "density",
  "hex field",
  "8px points",
  "density + points",
  "dot density",
]);

let explicitlyActive = false;
let unsubscribeDom: (() => void) | null = null;

function setIntent(active: boolean): void {
  explicitlyActive = active;
  document.documentElement.dataset.providerExplorerVisualizationActive = active ? "true" : "false";
}

function clearExplorerVisualization(): void {
  clearProviderExplorerNative();
}

function normalizeButtonLabel(button: HTMLButtonElement): string {
  return `${button.textContent || ""} ${button.getAttribute("aria-label") || ""}`
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function restoreInactivePresentation(): void {
  if (explicitlyActive) return;

  const aggregateCount = window.__NETWORK_MAP_PROVIDER_EXPLORER_NATIVE__?.getSnapshot?.("aggregate")?.featureCount || 0;
  const dotCount = window.__NETWORK_MAP_PROVIDER_EXPLORER_NATIVE__?.getSnapshot?.("dots")?.featureCount || 0;
  if (aggregateCount > 0 || dotCount > 0) clearProviderExplorerNative(["aggregate", "dots"]);

  const drawer = document.querySelector<HTMLElement>(".provider-explorer-drawer");
  if (!drawer) return;

  drawer.querySelectorAll<HTMLButtonElement>(".provider-visualization-grid button.active").forEach((button) => {
    button.classList.remove("active");
  });

  const status = drawer.querySelector<HTMLElement>(".provider-map-status");
  const readyText = "Choose a visualization to render providers on the map.";
  if (status && status.textContent?.trim() !== readyText) status.textContent = readyText;
}

function reset(): void {
  setIntent(false);
  clearExplorerVisualization();
  restoreInactivePresentation();
}

function handleClick(event: MouseEvent): void {
  const target = event.target instanceof Element ? event.target : null;
  const button = target?.closest<HTMLButtonElement>("button");
  if (!button || button.disabled) return;

  const drawer = button.closest<HTMLElement>(".provider-explorer-drawer");
  if (!drawer) return;

  const label = normalizeButtonLabel(button);
  if (VISUALIZATION_LABELS.has(label)) {
    setIntent(true);
    return;
  }

  if (button.getAttribute("aria-label") === "Close Provider Explorer" || label === "clear filters") {
    reset();
  }
}

function handleWorkspaceChange(): void {
  window.requestAnimationFrame(() => {
    if (document.documentElement.dataset.occumedworkspace !== "explorer") {
      reset();
      return;
    }
    restoreInactivePresentation();
  });
}

function cleanup(): void {
  document.removeEventListener("click", handleClick, true);
  window.removeEventListener("network-map:sidebar-workspace", handleWorkspaceChange);
  unsubscribeDom?.();
  unsubscribeDom = null;
}

function install(): void {
  if (!registerRuntimeOwner(
    "provider-explorer-explicit-visualization",
    "Require explicit user intent before Provider Explorer visualization layers can remain on the map",
  )) return;

  setIntent(false);
  document.addEventListener("click", handleClick, true);
  window.addEventListener("network-map:sidebar-workspace", handleWorkspaceChange);
  unsubscribeDom = subscribeToSharedDomObserver(
    "provider-explorer-explicit-visualization",
    restoreInactivePresentation,
  );
  window.addEventListener("beforeunload", cleanup, { once: true });

  (window as ProviderExplorerIntentGlobal).__NETWORK_MAP_PROVIDER_EXPLORER_INTENT__ = {
    isExplicitlyActive: () => explicitlyActive,
    reset,
  };

  window.setTimeout(restoreInactivePresentation, 0);
  window.setTimeout(restoreInactivePresentation, 500);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", install, { once: true });
} else {
  install();
}

export {};

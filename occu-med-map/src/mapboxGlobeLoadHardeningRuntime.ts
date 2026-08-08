import { registerRuntimeOwner, subscribeToSharedDomObserver } from "./runtimeControllerRegistry";

declare global {
  interface Window {
    mapboxgl?: any;
  }
}

const MAPBOX_VERSION = "3.25.0";
const MAPBOX_SCRIPT_ID = "network-map-mapbox-gl-sdk";
const MAPBOX_CSS_ID = "network-map-mapbox-gl-css";

type PendingPreparation = {
  host: HTMLElement;
  cleanupTimer: number;
};

let preloadPromise: Promise<void> | null = null;
const pendingPreparations = new Map<HTMLElement, PendingPreparation>();

function ensureMapboxAssets(): Promise<void> {
  if (window.mapboxgl) return Promise.resolve();
  if (preloadPromise) return preloadPromise;

  if (!document.getElementById(MAPBOX_CSS_ID)) {
    const link = document.createElement("link");
    link.id = MAPBOX_CSS_ID;
    link.rel = "stylesheet";
    link.href = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_VERSION}/mapbox-gl.css`;
    document.head.appendChild(link);
  }

  preloadPromise = new Promise<void>((resolve, reject) => {
    let script = document.getElementById(MAPBOX_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = MAPBOX_SCRIPT_ID;
      script.src = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_VERSION}/mapbox-gl.js`;
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }

    const deadline = Date.now() + 30_000;
    let settled = false;

    const finish = () => {
      if (settled) return;
      if (window.mapboxgl) {
        settled = true;
        resolve();
        return;
      }
      if (Date.now() >= deadline) {
        settled = true;
        reject(new Error("Mapbox GL JS preload timed out"));
        return;
      }
      window.setTimeout(finish, 50);
    };

    script.addEventListener("error", () => {
      if (settled) return;
      settled = true;
      reject(new Error("Mapbox GL JS preload failed"));
    }, { once: true });

    finish();
  }).catch((error) => {
    preloadPromise = null;
    throw error;
  });

  return preloadPromise;
}

function clearPreparation(wrap: HTMLElement): void {
  const pending = pendingPreparations.get(wrap);
  if (pending) window.clearTimeout(pending.cleanupTimer);
  pendingPreparations.delete(wrap);
  const host = pending?.host || wrap.querySelector<HTMLElement>(".mapbox-globe-host");
  wrap.classList.remove("mapbox-globe-preparing");
  host?.style.removeProperty("visibility");
  host?.style.removeProperty("display");
}

function preparationFinished(wrap: HTMLElement, host: HTMLElement): boolean {
  const status = wrap.querySelector<HTMLElement>(".map-dimension-status")?.textContent?.toLowerCase() || "";
  return host.classList.contains("ready")
    || status.includes("active")
    || status.includes("failed")
    || status.includes("timed out")
    || status.includes("unavailable");
}

function reconcilePreparations(): void {
  for (const [wrap, pending] of pendingPreparations) {
    if (!wrap.isConnected || preparationFinished(wrap, pending.host)) clearPreparation(wrap);
  }
}

function prepareGlobeContainer(button: HTMLButtonElement): void {
  const wrap = button.closest<HTMLElement>(".dual-engine-map-shell");
  const host = wrap?.querySelector<HTMLElement>(".mapbox-globe-host");
  if (!wrap || !host) return;

  clearPreparation(wrap);
  wrap.classList.add("mapbox-globe-preparing");
  host.setAttribute("aria-hidden", "false");
  host.style.visibility = "visible";
  host.style.display = "block";

  const cleanupTimer = window.setTimeout(() => clearPreparation(wrap), 45_000);
  pendingPreparations.set(wrap, { host, cleanupTimer });
  reconcilePreparations();
}

function installMapboxGlobeLoadHardening(): void {
  if (!registerRuntimeOwner("mapbox-globe-load-hardening", "Mapbox globe asset preload and transition preparation")) return;

  subscribeToSharedDomObserver("mapbox-globe-load-hardening", (mutations) => {
    if (!pendingPreparations.size) return;
    if (!mutations.some((mutation) => {
      const target = mutation.target instanceof Element ? mutation.target : null;
      return Boolean(target?.closest(".dual-engine-map-shell, .mapbox-globe-host, .map-dimension-status"));
    })) return;
    reconcilePreparations();
  });

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLButtonElement>(".map-dimension-toggle button[data-map-mode]");
    if (!button) return;

    if (button.dataset.mapMode === "3d") {
      prepareGlobeContainer(button);
      void ensureMapboxAssets().catch((error) => {
        console.error("Mapbox preload failed", error);
      });
      return;
    }

    const wrap = button.closest<HTMLElement>(".dual-engine-map-shell");
    if (wrap) clearPreparation(wrap);
  }, true);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", installMapboxGlobeLoadHardening, { once: true });
} else {
  installMapboxGlobeLoadHardening();
}

export {};

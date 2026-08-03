type MapMode = "2d" | "3d";

type GlobeBridge = {
  getMode: () => MapMode;
  setMode: (mode: MapMode) => Promise<void>;
  sync: () => void;
};

type ArcgisImportApi = {
  import: (modules: string[]) => Promise<any[]>;
};

declare global {
  interface Window {
    __NETWORK_MAP_GLOBE__?: GlobeBridge;
    $arcgis?: ArcgisImportApi;
  }
}

const ARCGIS_VERSION = "5.1";
const ARCGIS_SCRIPT_ID = "network-map-arcgis-sdk";
const MODE_TIMEOUT_MS = 25_000;

let loaderPromise: Promise<void> | null = null;
let transitionRunning = false;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function ensureArcgisModuleLoader(): Promise<void> {
  if (window.$arcgis) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<void>((resolve, reject) => {
    let script = document.getElementById(ARCGIS_SCRIPT_ID) as HTMLScriptElement | null;

    // ArcGIS 5.x is distributed as a module script. Replace any failed legacy
    // non-module loader left behind by an earlier build.
    if (script && script.type !== "module" && !window.$arcgis) {
      script.remove();
      script = null;
    }

    const finish = () => {
      if (window.$arcgis) resolve();
      else reject(new Error("ArcGIS module loader finished without exposing $arcgis"));
    };
    const fail = () => reject(new Error("ArcGIS module loader request failed"));

    if (!script) {
      script = document.createElement("script");
      script.id = ARCGIS_SCRIPT_ID;
      script.type = "module";
      script.src = `https://js.arcgis.com/${ARCGIS_VERSION}/`;
      script.crossOrigin = "anonymous";
      script.dataset.networkMapLoader = "module";
      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", fail, { once: true });
      document.head.appendChild(script);
      return;
    }

    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", fail, { once: true });

    // The loader may have completed before this listener was attached.
    window.setTimeout(() => {
      if (window.$arcgis) resolve();
    }, 0);
  }).catch((error) => {
    loaderPromise = null;
    throw error;
  });

  return loaderPromise;
}

function setControlStatus(
  control: HTMLElement,
  message: string,
  state: "normal" | "loading" | "error" = "normal",
): void {
  const status = control.querySelector<HTMLElement>(".map-dimension-status");
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}

function syncControl(control: HTMLElement): void {
  const mode = window.__NETWORK_MAP_GLOBE__?.getMode() || "2d";
  control.dataset.currentMode = mode;
  control.querySelectorAll<HTMLButtonElement>("button[data-map-mode]").forEach((button) => {
    const active = button.dataset.mapMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  control.setAttribute("aria-label", mode === "3d" ? "3D globe active" : "2D map active");
}

function actualModeReady(targetMode: MapMode, control: HTMLElement): boolean {
  const api = window.__NETWORK_MAP_GLOBE__;
  const mapWrap = control.closest<HTMLElement>(".map-wrap");
  if (!api || !mapWrap) return false;

  if (targetMode === "2d") {
    return api.getMode() === "2d" && !mapWrap.classList.contains("arcgis-globe-active");
  }

  const host = mapWrap.querySelector<HTMLElement>(".arcgis-globe-host");
  return api.getMode() === "3d"
    && mapWrap.classList.contains("arcgis-globe-active")
    && Boolean(host?.classList.contains("ready"));
}

async function monitorModeChange(targetMode: MapMode, control: HTMLElement): Promise<void> {
  if (transitionRunning) return;
  const api = window.__NETWORK_MAP_GLOBE__;
  if (!api) {
    setControlStatus(control, "3D globe bridge unavailable", "error");
    return;
  }

  transitionRunning = true;
  control.dataset.transitioning = "true";
  control.querySelectorAll<HTMLButtonElement>("button[data-map-mode]").forEach((button) => {
    button.disabled = true;
  });

  setControlStatus(
    control,
    targetMode === "3d" ? "Opening 3D globe…" : "Returning to 2D map…",
    "loading",
  );

  try {
    if (targetMode === "3d") await ensureArcgisModuleLoader();

    const deadline = Date.now() + MODE_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (actualModeReady(targetMode, control)) {
        setControlStatus(
          control,
          targetMode === "3d" ? "3D globe active" : "2D map active",
        );
        syncControl(control);
        return;
      }
      await delay(100);
    }

    throw new Error(targetMode === "3d" ? "ArcGIS scene did not become ready" : "2D map did not restore");
  } catch (error) {
    console.error("Map dimension switch failed", error);
    setControlStatus(
      control,
      targetMode === "3d" ? "3D globe failed to load" : "2D map failed to restore",
      "error",
    );
    syncControl(control);
  } finally {
    control.querySelectorAll<HTMLButtonElement>("button[data-map-mode]").forEach((button) => {
      button.disabled = false;
    });
    control.dataset.transitioning = "false";
    transitionRunning = false;
  }
}

function enhanceToggle(control: HTMLElement): void {
  if (control.dataset.directGlobeSwitch === "true") return;

  const mapButton = control.querySelector<HTMLButtonElement>('button[data-map-mode="2d"]');
  const globeButton = control.querySelector<HTMLButtonElement>('button[data-map-mode="3d"]');
  if (!mapButton || !globeButton) return;

  control.dataset.directGlobeSwitch = "true";
  control.classList.add("immersive-portal-toggle", "direct-globe-toggle");

  mapButton.title = "Use the flat 2D map";
  mapButton.setAttribute("aria-label", "Use the flat 2D map");
  mapButton.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"></path>
    </svg>
    <span><strong>2D Map</strong></span>
  `;

  globeButton.title = "Open the interactive 3D globe";
  globeButton.setAttribute("aria-label", "Open the interactive 3D globe");
  globeButton.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M3 12h18M12 3c3 3 4.5 6 4.5 9S15 18 12 21c-3-3-4.5-6-4.5-9S9 6 12 3Z"></path>
    </svg>
    <span><strong>3D Globe</strong></span>
  `;

  // Do not intercept the click. The ArcGIS bridge's original button listener
  // performs the switch; this listener only verifies that the requested view
  // actually became active and reports a real failure when it did not.
  mapButton.addEventListener("click", () => {
    window.setTimeout(() => void monitorModeChange("2d", control), 0);
  });
  globeButton.addEventListener("click", () => {
    window.setTimeout(() => void monitorModeChange("3d", control), 0);
  });

  syncControl(control);
}

function scanForToggle(): void {
  document.querySelectorAll<HTMLElement>(".map-dimension-toggle").forEach(enhanceToggle);
  document.querySelectorAll<HTMLElement>(".globe-portal-transition").forEach((overlay) => overlay.remove());
}

function initialize(): void {
  // Start loading the correct module loader before the user requests 3D so the
  // first transition is a real map switch rather than a decorative wait screen.
  void ensureArcgisModuleLoader().catch((error) => {
    console.warn("ArcGIS module preloading failed", error);
  });

  scanForToggle();
  const observer = new MutationObserver(scanForToggle);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
  initialize();
}

export {};

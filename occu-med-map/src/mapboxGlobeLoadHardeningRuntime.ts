declare global {
  interface Window {
    mapboxgl?: any;
  }
}

const MAPBOX_VERSION = "3.25.0";
const MAPBOX_SCRIPT_ID = "network-map-mapbox-gl-sdk";
const MAPBOX_CSS_ID = "network-map-mapbox-gl-css";
const PATCH_FLAG = "__networkMapLoadReadinessPatched";

let preloadPromise: Promise<void> | null = null;

function ensureMapboxAssets(): Promise<void> {
  if (window.mapboxgl) {
    patchMapboxReadiness();
    return Promise.resolve();
  }
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
        patchMapboxReadiness();
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

function patchMapboxReadiness(): void {
  const MapCtor = window.mapboxgl?.Map;
  const prototype = MapCtor?.prototype as any;
  if (!prototype || prototype[PATCH_FLAG]) return;

  const originalOnce = prototype.once;
  if (typeof originalOnce !== "function") return;

  prototype.once = function patchedOnce(type: string, listener?: (...args: any[]) => void): any {
    if (type !== "load" || typeof listener !== "function") {
      return originalOnce.call(this, type, listener);
    }

    let fired = false;
    const complete = (event?: any) => {
      if (fired) return;
      fired = true;
      listener.call(this, event || { type: "style.load", target: this });
    };

    originalOnce.call(this, "load", complete);
    originalOnce.call(this, "style.load", complete);

    try {
      if (this.isStyleLoaded?.()) queueMicrotask(() => complete());
    } catch {
      // The normal load/style.load listeners remain active.
    }

    return this;
  };

  prototype[PATCH_FLAG] = true;
}

function prepareGlobeContainer(button: HTMLButtonElement): void {
  const wrap = button.closest<HTMLElement>(".dual-engine-map-shell");
  const host = wrap?.querySelector<HTMLElement>(".mapbox-globe-host");
  if (!wrap || !host) return;

  wrap.classList.add("mapbox-globe-preparing");
  host.setAttribute("aria-hidden", "false");
  host.style.visibility = "visible";
  host.style.display = "block";

  const cleanup = () => {
    const status = wrap.querySelector<HTMLElement>(".map-dimension-status")?.textContent?.toLowerCase() || "";
    const finished = host.classList.contains("ready")
      || status.includes("active")
      || status.includes("failed")
      || status.includes("timed out")
      || status.includes("unavailable");
    if (!finished) return false;
    wrap.classList.remove("mapbox-globe-preparing");
    host.style.removeProperty("visibility");
    host.style.removeProperty("display");
    return true;
  };

  const observer = new MutationObserver(() => {
    if (cleanup()) observer.disconnect();
  });
  observer.observe(wrap, { subtree: true, childList: true, attributes: true, characterData: true });

  window.setTimeout(() => {
    observer.disconnect();
    wrap.classList.remove("mapbox-globe-preparing");
    host.style.removeProperty("visibility");
    host.style.removeProperty("display");
  }, 45_000);
}

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
  wrap?.classList.remove("mapbox-globe-preparing");
}, true);

// Begin downloading and patching Mapbox before the first globe request.
void ensureMapboxAssets().catch((error) => {
  console.warn("Mapbox background preload did not complete", error);
});

export {};

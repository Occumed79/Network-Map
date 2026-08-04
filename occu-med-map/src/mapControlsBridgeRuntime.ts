import mapboxgl from "mapbox-gl";

type BasemapStyle = "streets-v12" | "light-v11" | "outdoors-v12" | "satellite-streets-v12";

const MAPBOX_STYLE_BY_LABEL: Record<string, BasemapStyle> = {
  streets: "streets-v12",
  light: "light-v11",
  terrain: "outdoors-v12",
  satellite: "satellite-streets-v12",
};

const LABEL_BY_STYLE: Record<BasemapStyle, string> = {
  "streets-v12": "Streets",
  "light-v11": "Light",
  "outdoors-v12": "Terrain",
  "satellite-streets-v12": "Satellite",
};

const PATCH_FLAG = "__occumedMapControlsBridgePatched";
const trackedMaps = new Set<mapboxgl.Map>();
let selectedStyle: BasemapStyle = "streets-v12";
let observer: MutationObserver | null = null;
let scanTimer: number | null = null;

function registerMap(instance: mapboxgl.Map): void {
  trackedMaps.add(instance);
}

function patchMapboxRegistration(): void {
  const prototype = mapboxgl.Map.prototype as any;
  if (prototype[PATCH_FLAG]) return;

  const originalOn = prototype.on;
  prototype.on = function trackedOn(this: mapboxgl.Map, ...args: any[]) {
    registerMap(this);
    return originalOn.apply(this, args);
  };

  const originalRemove = prototype.remove;
  prototype.remove = function trackedRemove(this: mapboxgl.Map, ...args: any[]) {
    trackedMaps.delete(this);
    return originalRemove.apply(this, args);
  };

  prototype[PATCH_FLAG] = true;
}

function mapStyleUri(style: BasemapStyle): string {
  return `mapbox://styles/mapbox/${style}`;
}

function isGlobeMap(instance: mapboxgl.Map): boolean {
  return Boolean(instance.getContainer().closest(".mapbox-globe-host"));
}

function configureProjection(instance: mapboxgl.Map, globe: boolean): void {
  try {
    instance.setProjection(globe ? "globe" : "mercator");
  } catch {
    // The selected style remains usable even if projection configuration fails.
  }

  if (!globe) return;
  try {
    instance.setFog({
      color: "rgb(185, 214, 235)",
      "high-color": "rgb(36, 92, 223)",
      "horizon-blend": 0.08,
      "space-color": "rgb(3, 7, 18)",
      "star-intensity": 0.38,
    });
  } catch {
    // Fog is decorative and should never prevent a basemap change.
  }
}

function ensureNetworkOverlayLayers(instance: mapboxgl.Map): void {
  if (!instance.isStyleLoaded()) return;

  try {
    if (!instance.getSource("network-overlays")) {
      instance.addSource("network-overlays", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    if (!instance.getLayer("network-fills")) {
      instance.addLayer({
        id: "network-fills",
        type: "fill",
        source: "network-overlays",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-color": ["coalesce", ["get", "fillColor"], "#0e7490"],
          "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.2],
          "fill-outline-color": ["coalesce", ["get", "lineColor"], "#ffffff"],
        },
      } as any);
    }

    if (!instance.getLayer("network-lines")) {
      instance.addLayer({
        id: "network-lines",
        type: "line",
        source: "network-overlays",
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": ["coalesce", ["get", "lineColor"], "#67e8f9"],
          "line-opacity": ["coalesce", ["get", "lineOpacity"], 0.9],
          "line-width": ["coalesce", ["get", "lineWidth"], 2],
        },
      } as any);
    }

    if (!instance.getLayer("network-points")) {
      instance.addLayer({
        id: "network-points",
        type: "circle",
        source: "network-overlays",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": ["coalesce", ["get", "pointRadius"], 5],
          "circle-color": ["coalesce", ["get", "fillColor"], "#0e7490"],
          "circle-opacity": ["coalesce", ["get", "fillOpacity"], 0.9],
          "circle-stroke-color": ["coalesce", ["get", "lineColor"], "#ffffff"],
          "circle-stroke-width": ["coalesce", ["get", "lineWidth"], 1],
        },
      } as any);
    }
  } catch (error) {
    console.warn("Network Map overlays could not be restored after the basemap change", error);
  }
}

function syncVisibleOverlays(): void {
  const sync = (window as any).__NETWORK_MAP_GLOBE__?.sync;
  if (typeof sync === "function") sync();
}

function finishStyleChange(instance: mapboxgl.Map, globe: boolean): void {
  configureProjection(instance, globe);
  ensureNetworkOverlayLayers(instance);
  syncVisibleOverlays();
  window.setTimeout(syncVisibleOverlays, 120);
  window.setTimeout(syncVisibleOverlays, 420);
}

function setPanelStatus(text: string): void {
  document.querySelectorAll<HTMLElement>(".occumed-mapbox-status").forEach((status) => {
    status.textContent = text;
  });
}

function markStyleButtons(): void {
  document.querySelectorAll<HTMLButtonElement>(".occumed-map-tools-panel .occumed-mapbox-actions button").forEach((button) => {
    const style = MAPBOX_STYLE_BY_LABEL[(button.textContent || "").trim().toLowerCase()];
    if (!style) return;
    button.dataset.mapboxStyle = style;
    button.classList.toggle("active", style === selectedStyle);
    button.setAttribute("aria-pressed", String(style === selectedStyle));
  });
}

async function applyBasemapStyle(style: BasemapStyle): Promise<void> {
  selectedStyle = style;
  markStyleButtons();
  const label = LABEL_BY_STYLE[style];
  setPanelStatus(`Switching to ${label} map…`);

  const instances = Array.from(trackedMaps);
  if (!instances.length) {
    setPanelStatus(`${label} selected. The map is still initializing.`);
    return;
  }

  await Promise.allSettled(instances.map((instance) => new Promise<void>((resolve) => {
    const globe = isGlobeMap(instance);
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      finishStyleChange(instance, globe);
      resolve();
    };

    try {
      instance.once("style.load", finish);
      instance.setStyle(mapStyleUri(style));
      window.setTimeout(finish, 8_000);
    } catch (error) {
      console.error(`Unable to switch to the ${label} basemap`, error);
      finish();
    }
  })));

  setPanelStatus(`${label} map active.`);
}

function handleBasemapClick(event: Event): void {
  const target = event.target instanceof Element ? event.target : null;
  const button = target?.closest<HTMLButtonElement>(".occumed-map-tools-panel button");
  if (!button) return;
  const style = MAPBOX_STYLE_BY_LABEL[(button.textContent || "").trim().toLowerCase()];
  if (!style) return;
  void applyBasemapStyle(style);
}

function rehomeMapToolsPanel(): void {
  const shell = document.querySelector<HTMLElement>(".dual-engine-map-shell");
  if (!shell) return;

  document.querySelectorAll<HTMLElement>(".occumed-map-tools-panel").forEach((panel) => {
    if (panel.parentElement !== shell) shell.appendChild(panel);
    panel.dataset.mapToolsVisible = "true";
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", "Map tools and basemap styles");
  });

  markStyleButtons();
}

function scheduleScan(delay = 0): void {
  if (scanTimer !== null) window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(() => {
    scanTimer = null;
    rehomeMapToolsPanel();
  }, delay);
}

function startObserver(): void {
  if (observer || !document.body) return;
  observer = new MutationObserver(() => scheduleScan(20));
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleScan();
  window.setTimeout(() => scheduleScan(), 250);
  window.setTimeout(() => scheduleScan(), 1_000);
}

patchMapboxRegistration();
document.addEventListener("click", handleBasemapClick, true);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startObserver, { once: true });
} else {
  startObserver();
}

export {};

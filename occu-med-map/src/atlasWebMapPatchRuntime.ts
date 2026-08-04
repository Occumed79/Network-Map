type ArcgisLoader = {
  import: (moduleIds: string | string[]) => Promise<any>;
  [key: string]: unknown;
};

const ATLAS_WEBMAP_ID = "7378ae8b471940cb9f9d114b67cd09b8";
const MAP_MODULE_ID = "@arcgis/core/Map.js";
const WEBMAP_MODULE_ID = "@arcgis/core/WebMap.js";
const WRAPPED = Symbol.for("network-map.atlas-webmap-loader");

function wrapLoader(loader: ArcgisLoader | undefined): ArcgisLoader | undefined {
  if (!loader || typeof loader.import !== "function") return loader;
  if ((loader as any)[WRAPPED]) return loader;

  const originalImport = loader.import.bind(loader);
  const wrapped = new Proxy(loader, {
    get(target, property, receiver) {
      if (property === WRAPPED) return true;
      if (property !== "import") return Reflect.get(target, property, receiver);

      return async (moduleIds: string | string[]) => {
        const requested = Array.isArray(moduleIds) ? [...moduleIds] : [moduleIds];
        const mapIndex = requested.indexOf(MAP_MODULE_ID);
        if (mapIndex < 0) return originalImport(moduleIds);

        const extended = [...requested, WEBMAP_MODULE_ID];
        const imported = await originalImport(extended);
        const modules = Array.isArray(imported) ? imported : [imported];
        const WebMap = modules[extended.length - 1];

        if (typeof WebMap !== "function") return originalImport(moduleIds);

        class OccuMedAtlasWebMap extends WebMap {
          constructor(options: Record<string, any> = {}) {
            super({ portalItem: { id: ATLAS_WEBMAP_ID } });

            const layers = Array.isArray(options.layers) ? options.layers : [];
            const atlasMap = this as any;
            if (layers.length) {
              try {
                atlasMap.addMany(layers);
              } catch {
                for (const layer of layers) {
                  try { atlasMap.add(layer); } catch { /* optional overlay */ }
                }
              }
            }
          }
        }

        const result = modules.slice(0, requested.length);
        result[mapIndex] = OccuMedAtlasWebMap;
        return Array.isArray(moduleIds) ? result : result[0];
      };
    },
  });

  return wrapped;
}

function installLoaderHook(): void {
  const existingDescriptor = Object.getOwnPropertyDescriptor(window, "$arcgis");
  const existingValue = (window as any).$arcgis as ArcgisLoader | undefined;

  if (existingValue) {
    try { (window as any).$arcgis = wrapLoader(existingValue); } catch { /* optional patch */ }
    return;
  }

  if (!existingDescriptor || existingDescriptor.configurable !== false) {
    let current: ArcgisLoader | undefined;
    try {
      Object.defineProperty(window, "$arcgis", {
        configurable: true,
        enumerable: true,
        get() { return current; },
        set(value: ArcgisLoader | undefined) { current = wrapLoader(value); },
      });
    } catch {
      // The SDK can still be patched by the short poll below.
    }
  }

  const started = Date.now();
  const timer = window.setInterval(() => {
    const loader = (window as any).$arcgis as ArcgisLoader | undefined;
    if (loader && !(loader as any)[WRAPPED]) {
      try { (window as any).$arcgis = wrapLoader(loader); } catch { /* retry */ }
    }
    const active = (window as any).$arcgis as ArcgisLoader | undefined;
    if ((active as any)?.[WRAPPED] || Date.now() - started > 35_000) {
      window.clearInterval(timer);
    }
  }, 5);
}

// DISABLED - This patch forces ArcGIS to use a specific WebMap which causes stuck loading
// To re-enable, remove this early return
export {};

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const filePath = (relative) => path.join(root, relative);

function read(relative) {
  return fs.readFileSync(filePath(relative), "utf8");
}

function write(relative, content) {
  fs.writeFileSync(filePath(relative), content);
}

function replaceOnce(content, search, replacement, label) {
  if (typeof search === "string") {
    const first = content.indexOf(search);
    if (first < 0) throw new Error("Missing expected text for " + label);
    if (content.indexOf(search, first + search.length) >= 0) throw new Error("Expected one match for " + label);
    return content.slice(0, first) + replacement + content.slice(first + search.length);
  }
  const flags = search.flags.includes("g") ? search.flags : search.flags + "g";
  const matches = [...content.matchAll(new RegExp(search.source, flags))];
  if (matches.length !== 1) throw new Error("Expected one regex match for " + label + "; found " + matches.length);
  return content.replace(search, replacement);
}

function edit(relative, transform) {
  const before = read(relative);
  const after = transform(before);
  if (before === after) throw new Error("No changes produced for " + relative);
  write(relative, after);
}

edit("occu-med-map/src/main.tsx", (content) => replaceOnce(
  content,
  'import "./leafletMapLifecycleRuntime";\n',
  'import "./leafletMapLifecycleRuntime";\nimport "./mapboxMapLifecycleRuntime";\n',
  "main Mapbox lifecycle import",
));

edit("occu-med-map/src/dualMapEngineRuntime.ts", (content) => {
  content = replaceOnce(
    content,
    'import { registerLeafletMapInitializer } from "./leafletMapLifecycleRuntime";\n',
    'import { registerLeafletMapInitializer } from "./leafletMapLifecycleRuntime";\nimport { registerMapboxMap, unregisterMapboxMap } from "./mapboxMapLifecycleRuntime";\n',
    "dual engine Mapbox lifecycle import",
  );
  content = replaceOnce(
    content,
    '  });\n\n  if (is2d) mapbox2dMap = instance;',
    '  });\n  registerMapboxMap(instance, { mode });\n\n  if (is2d) mapbox2dMap = instance;',
    "dual engine map registration",
  );
  content = replaceOnce(
    content,
    'function destroyMapbox2dView(): void {\n  mapbox2dMap?.remove();\n  mapbox2dMap = null;\n  mapbox2dHost?.classList.remove("ready", "engine-render-ready");\n}',
    'function destroyMapbox2dView(): void {\n  const instance = mapbox2dMap;\n  mapbox2dMap = null;\n  if (instance) {\n    unregisterMapboxMap(instance);\n    instance.remove();\n  }\n  mapbox2dHost?.classList.remove("ready", "engine-render-ready");\n}',
    "dual engine 2d cleanup",
  );
  return replaceOnce(
    content,
    'function destroyMapboxGlobeView(): void {\n  mapboxGlobeMap?.remove();\n  mapboxGlobeMap = null;\n  mapboxGlobeHost?.classList.remove("ready", "engine-render-ready");\n}',
    'function destroyMapboxGlobeView(): void {\n  const instance = mapboxGlobeMap;\n  mapboxGlobeMap = null;\n  if (instance) {\n    unregisterMapboxMap(instance);\n    instance.remove();\n  }\n  mapboxGlobeHost?.classList.remove("ready", "engine-render-ready");\n}',
    "dual engine globe cleanup",
  );
});

edit("occu-med-map/src/mapControlsBridgeRuntime.ts", (content) => {
  content = replaceOnce(
    content,
    'import mapboxgl from "mapbox-gl";\n',
    'import mapboxgl from "mapbox-gl";\nimport { registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";\n',
    "map controls lifecycle import",
  );
  content = replaceOnce(content, 'const PATCH_FLAG = "__occumedMapControlsBridgePatched";\n', '', "map controls patch flag");
  content = replaceOnce(
    content,
    'function registerMap(instance: mapboxgl.Map): void {\n  trackedMaps.add(instance);\n}',
    'function registerMap(instance: mapboxgl.Map): () => void {\n  trackedMaps.add(instance);\n  return () => { trackedMaps.delete(instance); };\n}',
    "map controls registration cleanup",
  );
  content = replaceOnce(
    content,
    /\nfunction patchMapboxRegistration\(\): void \{[\s\S]*?\n\}\n\nfunction mapStyleUri/,
    '\nfunction mapStyleUri',
    "map controls prototype registration",
  );
  return replaceOnce(
    content,
    'patchMapboxRegistration();\ndocument.addEventListener("click", handleBasemapClick, true);',
    'registerMapboxMapInitializer({\n  id: "map-controls-bridge",\n  priority: 10,\n  initialize: registerMap,\n});\ndocument.addEventListener("click", handleBasemapClick, true);',
    "map controls lifecycle registration",
  );
});

edit("occu-med-map/src/healthsitesFlatDotsRuntime.ts", (content) => {
  content = replaceOnce(
    content,
    'import mapboxgl from "mapbox-gl";\n',
    'import mapboxgl from "mapbox-gl";\nimport { registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";\n',
    "healthsites lifecycle import",
  );
  content = replaceOnce(content, 'const PATCH_FLAG = "__occumedHealthsitesFlatDotsPatched";\n', '', "healthsites patch flag");
  content = replaceOnce(
    content,
    /function registerMap\(map: mapboxgl\.Map, originalOn: \(\.\.\.args: any\[\]\) => mapboxgl\.Map\): void \{[\s\S]*?\n\}\n\nfunction patchMapboxRegistration\(\): void \{[\s\S]*?\n\}\n\nfunction toggleHealthsites/,
    `function registerMap(map: mapboxgl.Map): () => void {
  if (trackedMaps.has(map)) return () => undefined;
  trackedMaps.add(map);

  const onLoad = () => {
    ensureMapLayer(map);
    if (enabled) scheduleRefresh(0);
  };
  const onStyleLoad = () => {
    ensureMapLayer(map);
    pushCollection(latestCollection);
  };
  const onViewportChanged = () => scheduleRefresh();

  map.on("load", onLoad);
  map.on("style.load", onStyleLoad);
  map.on("moveend", onViewportChanged);
  map.on("zoomend", onViewportChanged);

  if (map.loaded()) {
    ensureMapLayer(map);
    if (enabled) scheduleRefresh(0);
  }

  return () => {
    map.off("load", onLoad);
    map.off("style.load", onStyleLoad);
    map.off("moveend", onViewportChanged);
    map.off("zoomend", onViewportChanged);
    trackedMaps.delete(map);
  };
}

function toggleHealthsites`,
    "healthsites lifecycle registration",
  );
  return replaceOnce(
    content,
    'patchMapboxRegistration();\nwindow.addEventListener("network-map:mode-changed", () => scheduleRefresh(80));',
    'registerMapboxMapInitializer({\n  id: "healthsites-flat-dots",\n  priority: 30,\n  initialize: registerMap,\n});\nwindow.addEventListener("network-map:mode-changed", () => scheduleRefresh(80));',
    "healthsites lifecycle install",
  );
});

edit("occu-med-map/src/providerTypeNormalizationRuntime.ts", (content) => {
  content = replaceOnce(content, 'const EVENT_PATCH_FLAG = "__occumedProviderTypeEventsPatched";\n', '', "provider type event patch flag");
  content = replaceOnce(
    content,
    'function normalizedClickListener(event: mapboxgl.MapLayerMouseEvent): void {',
    'export function normalizedProviderClickListener(event: mapboxgl.MapLayerMouseEvent): void {',
    "provider type click export",
  );
  content = replaceOnce(
    content,
    /\nfunction patchFinderClickPopup\(\): void \{[\s\S]*?\n\}\n\npatchSourceRegistration\(\);\npatchFinderClickPopup\(\);/,
    '\npatchSourceRegistration();',
    "provider type event prototype patch",
  );
  return content;
});

edit("occu-med-map/src/providerLocationFinderRuntime.ts", (content) => {
  content = replaceOnce(
    content,
    'import { mapboxGeocode, type MapboxBounds, type MapboxPlace } from "./mapboxServices";\n',
    'import { mapboxGeocode, type MapboxBounds, type MapboxPlace } from "./mapboxServices";\nimport { registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";\nimport { normalizedProviderClickListener } from "./providerTypeNormalizationRuntime";\n',
    "provider finder lifecycle imports",
  );
  content = replaceOnce(content, 'const PATCH_FLAG = "__occumedProviderLocationFinderPatched";\n', '', "provider finder patch flag");
  content = replaceOnce(
    content,
    /  map\.on\("click", LAYER_ID, \(event\) => \{[\s\S]*?\n  \}\);/,
    '  map.on("click", LAYER_ID, normalizedProviderClickListener);',
    "provider finder normalized click binding",
  );
  content = replaceOnce(
    content,
    /function registerMap\(map: mapboxgl\.Map, originalOn: \(\.\.\.args: any\[\]\) => mapboxgl\.Map\): void \{[\s\S]*?\n\}\n\nfunction patchMapboxRegistration\(\): void \{[\s\S]*?\n\}\n\nfunction loadFlatGeobuf/,
    `function registerMap(map: mapboxgl.Map): () => void {
  if (trackedMaps.has(map)) return () => undefined;
  trackedMaps.add(map);

  const onLoad = () => {
    ensureLayer(map);
    pushCollection(latestCollection);
  };
  const onStyleLoad = () => {
    ensureLayer(map);
    pushCollection(latestCollection);
  };

  map.on("load", onLoad);
  map.on("style.load", onStyleLoad);
  if (map.loaded()) {
    ensureLayer(map);
    pushCollection(latestCollection);
  }

  return () => {
    map.off("load", onLoad);
    map.off("style.load", onStyleLoad);
    trackedMaps.delete(map);
  };
}

function loadFlatGeobuf`,
    "provider finder lifecycle registration",
  );
  return replaceOnce(
    content,
    'patchMapboxRegistration();\nif (document.readyState === "loading")',
    'registerMapboxMapInitializer({\n  id: "provider-location-finder",\n  priority: 40,\n  initialize: registerMap,\n});\nif (document.readyState === "loading")',
    "provider finder lifecycle install",
  );
});

edit("occu-med-map/src/mapOverlaySynchronizationControllerRuntime.ts", (content) => {
  content = replaceOnce(
    content,
    'import { registerLeafletMapInitializer } from "./leafletMapLifecycleRuntime";\n',
    'import { registerLeafletMapInitializer } from "./leafletMapLifecycleRuntime";\nimport { registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";\n',
    "overlay Mapbox lifecycle import",
  );
  content = replaceOnce(
    content,
    '  const originalRemove = prototype.remove as (this: mapboxgl.Map, ...args: any[]) => any;\n',
    '',
    "overlay remove capture",
  );
  content = replaceOnce(content, '      trackMap(this);\n      wrapNetworkSource(this);', '      wrapNetworkSource(this);', "overlay source discovery tracking");
  content = replaceOnce(
    content,
    /\n  prototype\.remove = function controlledRemove\(this: mapboxgl\.Map, \.\.\.args: any\[\]\): any \{[\s\S]*?\n  \};/,
    '',
    "overlay remove prototype patch",
  );
  return replaceOnce(
    content,
    'registerLeafletMapInitializer({\n  id: "overlay-synchronization",\n  priority: 30,\n  initialize: bindCanonicalMap,\n});\ninstallMapboxOwnership();',
    'registerLeafletMapInitializer({\n  id: "overlay-synchronization",\n  priority: 30,\n  initialize: bindCanonicalMap,\n});\nregisterMapboxMapInitializer({\n  id: "overlay-synchronization",\n  priority: 20,\n  initialize: (map) => {\n    trackMap(map);\n    return () => untrackMap(map);\n  },\n});\ninstallMapboxOwnership();',
    "overlay Mapbox lifecycle registration",
  );
});

edit("occu-med-map/src/mapboxGlobeLoadHardeningRuntime.ts", (content) => {
  content = replaceOnce(content, 'const PATCH_FLAG = "__networkMapLoadReadinessPatched";\n', '', "Mapbox readiness patch flag");
  content = replaceOnce(
    content,
    '  if (window.mapboxgl) {\n    patchMapboxReadiness();\n    return Promise.resolve();\n  }',
    '  if (window.mapboxgl) return Promise.resolve();',
    "bundled Mapbox readiness",
  );
  content = replaceOnce(content, '        patchMapboxReadiness();\n        resolve();', '        resolve();', "Mapbox preload completion");
  return replaceOnce(
    content,
    /\nfunction patchMapboxReadiness\(\): void \{[\s\S]*?\n\}\n\nfunction prepareGlobeContainer/,
    '\nfunction prepareGlobeContainer',
    "Mapbox once prototype patch",
  );
});

edit("occu-med-map/package.json", (content) => {
  const manifest = JSON.parse(content);
  manifest.scripts["test:mapbox-lifecycle-hardening"] = "tsx scripts/mapbox-lifecycle-hardening-smoke.ts";
  return JSON.stringify(manifest, null, 2) + "\n";
});

console.log("Mapbox lifecycle refactor complete.");

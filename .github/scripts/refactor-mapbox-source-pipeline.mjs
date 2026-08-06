import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = (relative) => path.join(root, relative);
const read = (relative) => fs.readFileSync(target(relative), "utf8");
const write = (relative, content) => fs.writeFileSync(target(relative), content);

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
  'import "./mapboxMapLifecycleRuntime";\n',
  'import "./mapboxMapLifecycleRuntime";\nimport "./mapboxSourcePipelineRuntime";\n',
  "main source pipeline import",
));

edit("occu-med-map/src/providerTypeNormalizationRuntime.ts", (content) => {
  content = replaceOnce(
    content,
    'import mapboxgl from "mapbox-gl";\n',
    'import mapboxgl from "mapbox-gl";\nimport { registerMapboxSourceDataMiddleware, type MapboxGeoJsonData } from "./mapboxSourcePipelineRuntime";\n',
    "provider normalization pipeline import",
  );
  content = replaceOnce(content, 'const SOURCE_PATCH_FLAG = "__occumedProviderTypeSourcePatched";\n', '', "provider source patch flag");
  content = replaceOnce(content, 'const WRAPPED_SOURCE_FLAG = "__occumedProviderTypeSetDataWrapped";\n', '', "provider wrapped source flag");
  content = replaceOnce(
    content,
    /\nfunction wrapFinderSource\(map: mapboxgl\.Map\): void \{[\s\S]*?\n\}\n\nfunction patchSourceRegistration\(\): void \{[\s\S]*?\n\}\n\nfunction popupHtml/,
    '\nfunction popupHtml',
    "provider source prototype patch",
  );
  return replaceOnce(
    content,
    'patchSourceRegistration();\n\nexport {};',
    'registerMapboxSourceDataMiddleware({\n  id: "provider-type-normalization",\n  sourceId: SOURCE_ID,\n  priority: 10,\n  transform: (_context, data) => normalizeGeoJsonData(data) as MapboxGeoJsonData,\n});\n\nexport {};',
    "provider source middleware registration",
  );
});

edit("occu-med-map/src/mapOverlaySynchronizationControllerRuntime.ts", (content) => {
  content = replaceOnce(
    content,
    'import { registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";\n',
    'import { registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";\nimport {\n  getMapboxSourcePipelineDiagnostics,\n  registerMapboxSourceDataMiddleware,\n  setMapboxGeoJsonSourceData,\n} from "./mapboxSourcePipelineRuntime";\n',
    "overlay source pipeline import",
  );
  content = replaceOnce(content, 'const MAP_PATCH_FLAG = "__occumedUnifiedOverlayControllerMapPatched";\n', '', "overlay map patch flag");
  content = replaceOnce(content, 'const SOURCE_PATCH_FLAG = "__occumedUnifiedOverlayControllerSourcePatched";\n', '', "overlay source patch flag");
  content = replaceOnce(
    content,
    /type GuardedSource = mapboxgl\.GeoJSONSource & \{[\s\S]*?\n\};\n\ntype SourceState = \{[\s\S]*?\n\};/,
    'type SourceState = {\n  lastAppliedRevision: number;\n};',
    "overlay source state types",
  );
  content = replaceOnce(
    content,
    /\nfunction wrapNetworkSource\(instance: mapboxgl\.Map\): SourceState \| null \{[\s\S]*?\n\}\n\nfunction ensureOverlayLayers/,
    '\nfunction ensureOverlayLayers',
    "overlay direct setData wrapper",
  );
  content = replaceOnce(content, '\n  wrapNetworkSource(instance);\n}', '\n}', "overlay ensure wrapper call");
  content = replaceOnce(
    content,
    `function applyCollectionToMap(instance: mapboxgl.Map): void {
  if (!instance.isStyleLoaded()) return;
  ensureOverlayLayers(instance);
  const state = wrapNetworkSource(instance);
  if (!state || state.lastAppliedRevision === appliedRevision) return;
  state.originalSetData(lastCollection);
  state.lastAppliedRevision = appliedRevision;
}`,
    `function applyCollectionToMap(instance: mapboxgl.Map): void {
  if (!instance.isStyleLoaded()) return;
  ensureOverlayLayers(instance);
  let state = sourceStates.get(instance);
  if (!state) {
    state = { lastAppliedRevision: -1 };
    sourceStates.set(instance, state);
  }
  if (state.lastAppliedRevision === appliedRevision) return;
  const source = setMapboxGeoJsonSourceData(
    instance,
    NETWORK_SOURCE_ID,
    lastCollection,
    "overlay-synchronization",
  );
  if (!source) return;
  state.lastAppliedRevision = appliedRevision;
}`,
    "overlay explicit source writer",
  );
  content = replaceOnce(
    content,
    /\nfunction installMapboxOwnership\(\): void \{[\s\S]*?\n\}\n\nfunction onStabilityEvent/,
    '\nfunction onStabilityEvent',
    "overlay addSource prototype ownership",
  );
  content = replaceOnce(
    content,
    `function totalExternalWritesSuppressed(): number {
  let count = 0;
  sourceStates.forEach((state) => { count += state.externalWritesSuppressed; });
  return count;
}`,
    `function totalExternalWritesSuppressed(): number {
  const middleware = getMapboxSourcePipelineDiagnostics().middlewares
    .find((item) => item.id === "network-overlay-authority");
  return middleware?.suppressedWrites || 0;
}`,
    "overlay suppression diagnostics",
  );
  content = replaceOnce(
    content,
    `registerLeafletMapInitializer({
  id: "overlay-synchronization",
  priority: 30,
  initialize: bindCanonicalMap,
});`,
    `registerMapboxSourceDataMiddleware({
  id: "network-overlay-authority",
  sourceId: NETWORK_SOURCE_ID,
  priority: 10,
  allowWrite: (context) => context.writer === "initial" || context.writer === "overlay-synchronization",
});
registerLeafletMapInitializer({
  id: "overlay-synchronization",
  priority: 30,
  initialize: bindCanonicalMap,
});`,
    "overlay authority middleware",
  );
  return replaceOnce(content, '});\ninstallMapboxOwnership();\ndocument.addEventListener', '});\ndocument.addEventListener', "overlay ownership installer");
});

edit("occu-med-map/src/mapEngineFinalFixRuntime.ts", (content) => {
  content = replaceOnce(
    content,
    'import { runWithoutObserverFeedback } from "./settledMutationObserver";\n',
    'import { runWithoutObserverFeedback } from "./settledMutationObserver";\nimport { registerMapboxSourceDataMiddleware } from "./mapboxSourcePipelineRuntime";\n',
    "density filter pipeline import",
  );
  content = replaceOnce(
    content,
    'const MAPBOX_PATCH_FLAG = "__networkMapDensityFilterPatched";\nconst SOURCE_PATCH_FLAG = "__networkMapDensitySourcePatched";\nconst MAPBOX_SCRIPT_PATCH_FLAG = "networkMapDensityPatchBound";\n\n',
    '',
    "density prototype flags",
  );
  content = replaceOnce(
    content,
    /\nfunction patchNetworkOverlaySource\(map: any, sourceId: string\): void \{[\s\S]*?\n\}\n\nfunction patchMapboxDensityMirroring\(\): void \{[\s\S]*?\n\}\n\nfunction bindMapboxScriptPatch\(\): void \{[\s\S]*?\n\}\n\nfunction removeFinishedLoadingPanels/,
    '\nfunction removeFinishedLoadingPanels',
    "density addSource prototype patch",
  );
  content = replaceOnce(content, '\n  patchMapboxDensityMirroring();\n  const requestedMode', '\n  const requestedMode', "density click patch call");
  content = replaceOnce(content, '    bindMapboxScriptPatch();\n    patchMapboxDensityMirroring();\n    removeFinishedLoadingPanels();', '    removeFinishedLoadingPanels();', "density observer patch calls");
  content = replaceOnce(content, '  bindMapboxScriptPatch();\n  patchMapboxDensityMirroring();\n  removeFinishedLoadingPanels();', '  removeFinishedLoadingPanels();', "density initialize patch calls");
  content = replaceOnce(content, '\nbindMapboxScriptPatch();\n\nif (document.readyState', '\nif (document.readyState', "density startup patch call");
  return replaceOnce(
    content,
    'function removeFinishedLoadingPanels(): void {',
    'registerMapboxSourceDataMiddleware({\n  id: "network-overlay-density-filter",\n  sourceId: "network-overlays",\n  priority: 20,\n  transform: (_context, data) => filterDensityFeatures(data),\n});\n\nfunction removeFinishedLoadingPanels(): void {',
    "density source middleware registration",
  );
});

edit("occu-med-map/scripts/mapbox-lifecycle-hardening-smoke.ts", (content) => {
  content = replaceOnce(
    content,
    'const lifecycle = source("src/mapboxMapLifecycleRuntime.ts");\n',
    'const lifecycle = source("src/mapboxMapLifecycleRuntime.ts");\nconst sourcePipeline = source("src/mapboxSourcePipelineRuntime.ts");\n',
    "Mapbox lifecycle source pipeline fixture",
  );
  content = replaceOnce(
    content,
    `const overlay = source("src/mapOverlaySynchronizationControllerRuntime.ts");
assert.doesNotMatch(
  overlay,
  /prototype\\.remove\\s*=\\s*function/,
  "overlay cleanup must be lifecycle-owned rather than patching Map.prototype.remove",
);
assert.match(overlay, /prototype\\.addSource = function controlledAddSource/, "network overlay source ownership must remain narrowly scoped");
assert.match(overlay, /prototype\\.removeSource = function controlledRemoveSource/, "network overlay source cleanup must remain narrowly scoped");`,
    `const overlay = source("src/mapOverlaySynchronizationControllerRuntime.ts");
assert.doesNotMatch(overlay, /prototype\\.(addSource|removeSource)\\s*=/, "overlay source behavior must use the source pipeline");
assert.match(overlay, /registerMapboxSourceDataMiddleware/, "overlay authority must register through the source pipeline");
assert.match(sourcePipeline, /prototype\\.addSource = function pipelineAddSource/, "source pipeline must own Map.prototype.addSource");
assert.match(sourcePipeline, /prototype\\.removeSource = function pipelineRemoveSource/, "source pipeline must own Map.prototype.removeSource");`,
    "Mapbox lifecycle source ownership assertions",
  );
  return content;
});

edit("occu-med-map/package.json", (content) => {
  const manifest = JSON.parse(content);
  manifest.scripts["test:mapbox-source-pipeline-hardening"] = "tsx scripts/mapbox-source-pipeline-hardening-smoke.ts";
  return JSON.stringify(manifest, null, 2) + "\n";
});

console.log("Mapbox source pipeline refactor complete.");

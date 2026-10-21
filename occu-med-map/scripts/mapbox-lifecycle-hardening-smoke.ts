import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const sourceRoot = path.join(projectRoot, "src");

function source(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = path.join(directory, entry);
    if (statSync(absolute).isDirectory()) return sourceFiles(absolute);
    return /\.(ts|tsx)$/.test(entry) ? [absolute] : [];
  });
}

const main = source("src/main.tsx");
const lifecycle = source("src/mapboxMapLifecycleRuntime.ts");
const lifecycleImport = main.indexOf('import "./mapboxMapLifecycleRuntime";');

assert.ok(lifecycleImport >= 0, "Mapbox lifecycle runtime must be imported before application boot");
for (const owner of [
  "./mapboxSourcePipelineRuntime",
  "./mapControlsBridgeRuntime",
  "./providerLocationFinderRuntime",
] as const) {
  const position = main.indexOf(`import "${owner}";`);
  assert.ok(position >= 0, `${owner} must remain explicitly imported`);
  assert.ok(lifecycleImport < position, `Mapbox lifecycle runtime must load before ${owner}`);
}

assert.match(lifecycle, /orderedInitializers/, "Mapbox initializers must have deterministic ordering");
assert.match(lifecycle, /left\.priority - right\.priority/, "Mapbox initializer priority must control execution order");
assert.match(lifecycle, /for \(const \[map, tracked\] of maps\)/, "late initializers must run against existing maps");
assert.match(lifecycle, /map\.once\("remove", onRemove\)/, "Mapbox cleanup must be tied to map removal");
assert.match(lifecycle, /runCleanup\(map\)/, "Mapbox initializer cleanup must be centralized");
assert.match(lifecycle, /__NETWORK_MAP_MAPBOX_LIFECYCLE__/, "Mapbox lifecycle diagnostics must be exposed");

const prototypeDiscoveryOwners: string[] = [];
const constructorOwners: string[] = [];
for (const absolute of sourceFiles(sourceRoot)) {
  const relative = path.relative(projectRoot, absolute);
  const content = readFileSync(absolute, "utf8");
  if (/prototype\.(on|once|remove)\s*=/.test(content)) prototypeDiscoveryOwners.push(relative);
  if (/new mapboxgl\.Map\s*\(/.test(content)) constructorOwners.push(relative);
}
assert.deepEqual(prototypeDiscoveryOwners, [], "Mapbox discovery and cleanup must not patch on, once, or remove prototypes");
assert.deepEqual(constructorOwners, ["src/dualMapEngineRuntime.ts"], "the dual engine must remain the sole Mapbox constructor owner");

const dualEngine = source("src/dualMapEngineRuntime.ts");
assert.match(dualEngine, /registerMapboxMap\(instance, \{ mode \}\)/, "new Mapbox maps must be explicitly registered");
assert.ok((dualEngine.match(/unregisterMapboxMap\(instance\)/g) || []).length >= 3, "Mapbox maps must be unregistered on both normal teardown and failed-token retry cleanup");
assert.match(dualEngine, /mapboxTokenCandidates/, "Mapbox engines must support configured token failover");
assert.match(dualEngine, /\[MAPBOX_2D_TOKEN, MAPBOX_TOKEN\]/, "2D must prefer the secondary token and retain the primary as fallback");
assert.match(dualEngine, /\[MAPBOX_TOKEN, MAPBOX_2D_TOKEN\]/, "3D must prefer the primary token and retain the secondary as fallback");

const registeredInitializers = [
  ["src/mapControlsBridgeRuntime.ts", "map-controls-bridge", 10],
  ["src/providerLocationFinderRuntime.ts", "provider-location-finder", 40],
  ["src/providerDatasetNativeMapRuntime.ts", "provider-dataset-native-map", 11],
  ["src/providerExplorerNativeMapRuntime.ts", "provider-explorer-native-map", 12],
  ["src/mapToolsNativeMapRuntime.ts", "map-tools-native-overlays", 14],
  ["src/phaseTwoNativeMapRuntime.ts", "phase-two-native-overlay", 18],
] as const;
for (const [file, id, priority] of registeredInitializers) {
  const content = source(file);
  assert.match(content, /registerMapboxMapInitializer/, `${file} must use the Mapbox lifecycle registry`);
  assert.match(content, new RegExp(`id: ["']${id}["']`), `${file} must retain stable initializer id ${id}`);
  assert.match(content, new RegExp(`priority: ${priority}`), `${file} must retain deterministic priority ${priority}`);
  assert.doesNotMatch(content, /patchMapboxRegistration/, `${file} must not retain prototype-based map discovery`);
}

for (const file of [
  "src/phaseTwoNativeMapRuntime.ts",
] as const) {
  const content = source(file);
  assert.match(content, /isStyleLoaded\(\)/, `${file} must guard native overlay installation on style readiness`);
  assert.doesNotMatch(content, /if \(!map\.getStyle\(\)\)/, `${file} must not call getStyle as a pre-style readiness guard`);
}

// isStyleLoaded() is false whenever any tile or GeoJSON job is pending, so
// overlay owners that gate writes on it silently drop user actions during
// ordinary camera movement. They must defer through runWhenStyleReady, which
// only waits for the style document and replays refused work on style.load.
assert.match(lifecycle, /export function runWhenStyleReady/, "the lifecycle runtime must own style-readiness deferral");
assert.match(lifecycle, /map\.on\("style\.load", flush\)/, "deferred style work must replay on style.load");
for (const file of [
  "src/mapToolsNativeMapRuntime.ts",
  "src/mapCoverageGeographicFocusRuntime.ts",
  "src/providerLocationFinderRuntime.ts",
  "src/liveFinderNativeMapRuntime.ts",
  "src/usDiagnosticsNativeMapRuntime.ts",
  "src/features/driveTime/mapboxEtaRouteLayer.ts",
] as const) {
  const content = source(file);
  assert.match(content, /runWhenStyleReady\(/, `${file} must defer overlay writes through runWhenStyleReady`);
  assert.doesNotMatch(content, /isStyleLoaded\(\)/, `${file} must not gate overlay writes on isStyleLoaded()`);
  assert.doesNotMatch(content, /if \(!map\.getStyle\(\)\)/, `${file} must not call getStyle as a pre-style readiness guard`);
}

for (const file of [
  "src/providerDatasetNativeMapRuntime.ts",
  "src/providerExplorerNativeMapRuntime.ts",
] as const) {
  const content = source(file);
  assert.doesNotMatch(
    content,
    /if \(!map\.isStyleLoaded\(\)\)\s*(?:\{[^}]*\})?\s*return/,
    `${file} must not short-circuit cross-browser attachment on Mapbox's style readiness flag`,
  );
  assert.match(content, /styleRetryTimer/, `${file} must retain an explicit style retry timer`);
  assert.match(content, /window\.setTimeout\(apply, 50\)/, `${file} must retry native attachment after an actual Mapbox rejection`);
  assert.match(content, /map\.on\("style\.load", apply\)/, `${file} must re-apply native layers after style reloads`);
  assert.match(content, /map\.on\("load", apply\)/, `${file} must also re-apply native layers on the initial map load`);
  assert.match(content, /try \{[\s\S]*ensure/, `${file} must attempt native attachment inside the retry boundary`);
  assert.doesNotMatch(content, /if \(!map\.getStyle\(\)\)/, `${file} must not call getStyle as a pre-style readiness guard`);
}

const normalization = source("src/providerTypeNormalizationRuntime.ts");
const finder = source("src/providerLocationFinderRuntime.ts");
assert.match(normalization, /export function normalizedProviderClickListener/, "normalized provider popups must use an explicit exported listener");
assert.doesNotMatch(normalization, /patchFinderClickPopup/, "provider popup normalization must not replace Map.prototype.on");
assert.match(finder, /normalizedProviderClickListener/, "provider finder must explicitly bind the normalized popup listener");

const globeHardening = source("src/mapboxGlobeLoadHardeningRuntime.ts");
assert.doesNotMatch(globeHardening, /patchMapboxReadiness/, "globe readiness must use the dual engine's instance-level readiness handling");
assert.doesNotMatch(globeHardening, /prototype\.once\s*=/, "globe readiness must not patch Map.prototype.once");

const sourcePipeline = source("src/mapboxSourcePipelineRuntime.ts");
assert.match(sourcePipeline, /prototype\.addSource = function pipelineAddSource/, "source pipeline must own Map.prototype.addSource");
assert.match(sourcePipeline, /prototype\.removeSource = function pipelineRemoveSource/, "source pipeline must own Map.prototype.removeSource");

assert.match(dualEngine, /MAPBOX_BASEMAP_STYLE = "mapbox:\/\/styles\/mapbox\/standard"/, "2D and globe must use the globe’s existing Standard basemap");
assert.match(dualEngine, /style: MAPBOX_BASEMAP_STYLE/, "both dimensions must share the same basemap setting");
assert.match(dualEngine, /projection: is2d \? "mercator" : "globe"/, "flat map and globe must keep their distinct projections");
const mapCss = source("src/dual-map-engines.css");
assert.doesNotMatch(mapCss, /background: #d9effb/, "flat map must never flash the old pale-blue host backdrop");
assert.match(dualEngine, /attributionControl: true/, "Mapbox attribution must remain enabled");
assert.match(dualEngine, /showCompass: !is2d/, "the non-rotating 2D map must not show a dead compass control");
assert.match(dualEngine, /syncWorldCoverMinZoom\(instance\)/, "the 2D world must always cover its host without empty bands");
assert.doesNotMatch(dualEngine, /applyNavyBasemapTint|NAVY_BASEMAP_PAINT/, "the dark navy basemap override must be removed");

console.log("Mapbox map lifecycle hardening smoke test passed for the native runtime architecture.");

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
assert.equal((dualEngine.match(/unregisterMapboxMap\(instance\)/g) || []).length, 2, "both Mapbox engines must be explicitly unregistered");

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
  "src/mapToolsNativeMapRuntime.ts",
  "src/phaseTwoNativeMapRuntime.ts",
] as const) {
  const content = source(file);
  assert.match(content, /isStyleLoaded\(\)/, `${file} must guard native overlay installation on style readiness`);
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

console.log("Mapbox map lifecycle hardening smoke test passed for the native runtime architecture.");

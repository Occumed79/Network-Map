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
const sourcePipeline = source("src/mapboxSourcePipelineRuntime.ts");
const lifecycleImport = main.indexOf('import "./mapboxMapLifecycleRuntime";');
const firstInitializerImport = Math.min(
  main.indexOf('import "./mapControlsBridgeRuntime";'),
  main.indexOf('import "./healthsitesFlatDotsRuntime";'),
  main.indexOf('import "./mapOverlaySynchronizationControllerRuntime";'),
);
assert.ok(lifecycleImport >= 0, "Mapbox lifecycle runtime must be imported");
assert.ok(lifecycleImport < firstInitializerImport, "Mapbox lifecycle runtime must load before map initializers");
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
  ["src/mapOverlaySynchronizationControllerRuntime.ts", "overlay-synchronization", 20],
  ["src/healthsitesFlatDotsRuntime.ts", "healthsites-flat-dots", 30],
  ["src/providerLocationFinderRuntime.ts", "provider-location-finder", 40],
] as const;
for (const [file, id, priority] of registeredInitializers) {
  const content = source(file);
  assert.match(content, /registerMapboxMapInitializer/, `${file} must use the Mapbox lifecycle registry`);
  assert.match(content, new RegExp(`id: ["']${id}["']`), `${file} must retain stable initializer id ${id}`);
  assert.match(content, new RegExp(`priority: ${priority}`), `${file} must retain deterministic priority ${priority}`);
  assert.doesNotMatch(content, /patchMapboxRegistration/, `${file} must not retain prototype-based map discovery`);
}

const normalization = source("src/providerTypeNormalizationRuntime.ts");
const finder = source("src/providerLocationFinderRuntime.ts");
assert.match(normalization, /export function normalizedProviderClickListener/, "normalized provider popups must use an explicit exported listener");
assert.doesNotMatch(normalization, /patchFinderClickPopup/, "provider popup normalization must not replace Map.prototype.on");
assert.match(finder, /normalizedProviderClickListener/, "provider finder must explicitly bind the normalized popup listener");

const globeHardening = source("src/mapboxGlobeLoadHardeningRuntime.ts");
assert.doesNotMatch(globeHardening, /patchMapboxReadiness/, "globe readiness must use the dual engine's instance-level readiness handling");
assert.doesNotMatch(globeHardening, /prototype\.once\s*=/, "globe readiness must not patch Map.prototype.once");

const overlay = source("src/mapOverlaySynchronizationControllerRuntime.ts");
assert.doesNotMatch(overlay, /prototype\.(addSource|removeSource)\s*=/, "overlay source behavior must use the source pipeline");
assert.match(overlay, /registerMapboxSourceDataMiddleware/, "overlay authority must register through the source pipeline");
assert.match(sourcePipeline, /prototype\.addSource = function pipelineAddSource/, "source pipeline must own Map.prototype.addSource");
assert.match(sourcePipeline, /prototype\.removeSource = function pipelineRemoveSource/, "source pipeline must own Map.prototype.removeSource");

console.log("Mapbox map lifecycle hardening smoke test passed.");

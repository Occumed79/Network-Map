import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

function source(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const main = source("src/main.tsx");
const compat = source("src/mapboxNativeCompat.ts");
const dual = source("src/dualMapEngineRuntime.ts");
const lifecycle = source("src/mapboxMapLifecycleRuntime.ts");
const providerFinder = source("src/providerLocationFinderRuntime.ts");

assert.match(main, /import "\.\/dualMapEngineRuntime";/, "dual Mapbox engine must remain the 2D/3D owner");
assert.doesNotMatch(main, /mapOverlaySynchronizationControllerRuntime/, "Leaflet-to-Mapbox overlay mirroring must not load");
assert.doesNotMatch(main, /leaflet\/dist\/leaflet\.css/, "Leaflet stylesheet must not load");
assert.doesNotMatch(main, /completeProviderPinMirrorRuntime/, "legacy periodic complete mirror must not load");
assert.doesNotMatch(main, /providerExplorerMapboxCommitGuardRuntime/, "legacy source guard must not load");

assert.match(compat, /import mapboxgl from "mapbox-gl"/, "compatibility layer must render through Mapbox GL");
assert.match(compat, /registerMapboxMapInitializer/, "compatibility layer must participate in the Mapbox lifecycle");
assert.match(compat, /native\.addSource\(/, "legacy vector geometry must become native Mapbox sources");
assert.match(compat, /native\.addLayer\(/, "legacy vector geometry must become native Mapbox layers");
assert.match(compat, /new mapboxgl\.Marker/, "legacy point markers must become Mapbox markers");
assert.match(compat, /new mapboxgl\.Popup/, "legacy popups must become Mapbox popups");
assert.match(compat, /native\.on\("style\.load"/, "style reloads must restore Mapbox-native compatibility layers");
assert.match(compat, /webglcontextrestored/, "WebGL restoration must rehydrate Mapbox-native compatibility layers");
assert.doesNotMatch(compat, /from ["']leaflet["']/, "compatibility implementation must not depend on Leaflet");

assert.match(dual, /projection: is2d \? "mercator" : "globe"/, "2D Mercator and 3D globe modes must both remain Mapbox-native");
assert.match(dual, /mapbox2dMap/, "2D Mapbox instance must remain");
assert.match(dual, /mapboxGlobeMap/, "3D Mapbox instance must remain");
assert.match(dual, /_setViewFromNative/, "Mapbox camera changes must update shared logical state without feedback recursion");

assert.match(lifecycle, /orderedInitializers/, "Mapbox lifecycle must retain deterministic initializer ordering");
assert.match(lifecycle, /executedByMap/, "Mapbox lifecycle must prevent duplicate initializer ownership");
assert.match(lifecycle, /runCleanup\(map\)/, "Mapbox lifecycle must clean up registered owners when a map is removed");

assert.match(providerFinder, /map\.addSource\(SOURCE_ID/, "provider finder must own a native Mapbox source");
assert.match(providerFinder, /map\.addLayer\(/, "provider finder must own a native Mapbox layer");

console.log("Mapbox-native map synchronization hardening smoke test passed.");

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
const app = source("src/App.tsx");
const scene = source("src/mapSceneRuntime.ts");
const dual = source("src/dualMapEngineRuntime.ts");
const lifecycle = source("src/mapboxMapLifecycleRuntime.ts");
const providerFinder = source("src/providerLocationFinderRuntime.ts");

assert.doesNotMatch(main, /mapOverlaySynchronizationControllerRuntime/, "retired overlay mirroring must not load");
assert.doesNotMatch(main, /leaflet\/dist\/leaflet\.css/, "Leaflet stylesheet must not load");
assert.doesNotMatch(main, /completeProviderPinMirrorRuntime/, "legacy periodic complete mirror must not load");
assert.doesNotMatch(main, /providerExplorerMapboxCommitGuardRuntime/, "legacy source guard must not load");
assert.doesNotMatch(main, /import "\.\/dualMapEngineRuntime";/, "dual engine ownership must be explicit from App, not boot-order side effects");

assert.match(app, /initializeDualMapEngines\(/, "App must explicitly initialize native Mapbox engines");
assert.match(app, /cleanupDualMapEngines\(/, "App must explicitly clean up native Mapbox engines");

assert.match(scene, /import mapboxgl from "mapbox-gl"/, "temporary scene layer registry must render through Mapbox GL");
assert.match(scene, /registerMapboxMapInitializer/, "scene layer registry must rehydrate through the Mapbox lifecycle");
assert.match(scene, /native\.addSource\(/, "scene vector geometry must become native Mapbox sources");
assert.match(scene, /native\.addLayer\(/, "scene vector geometry must become native Mapbox layers");
assert.match(scene, /new mapboxgl\.Marker/, "scene point markers must become Mapbox markers");
assert.match(scene, /new mapboxgl\.Popup/, "scene popups must become Mapbox popups");
assert.match(scene, /network-map:native-camera/, "scene registry may observe neutral native camera events during migration");
assert.doesNotMatch(scene, /from ["']leaflet["']/, "scene implementation must not depend on Leaflet");

assert.match(dual, /projection: is2d \? "mercator" : "globe"/, "2D Mercator and 3D globe modes must both remain Mapbox-native");
assert.match(dual, /mapbox2dMap/, "2D Mapbox instance must remain");
assert.match(dual, /mapboxGlobeMap/, "3D Mapbox instance must remain");
assert.match(dual, /sharedCamera/, "2D and 3D must share native camera state directly");
assert.match(dual, /captureCamera\(/, "native Mapbox movement must update shared camera state");
assert.match(dual, /applySharedCamera\(/, "mode switches must apply shared camera state directly to Mapbox");
assert.match(dual, /network-map:native-camera/, "Mapbox must publish neutral camera updates to transitional consumers");
assert.doesNotMatch(dual, /canonicalMap/, "dual-engine runtime must not retain a logical-map controller");
assert.doesNotMatch(dual, /registerMapSceneInitializer/, "dual-engine runtime must not depend on scene lifecycle registration");
assert.doesNotMatch(dual, /syncMapboxCameraFromLeaflet|syncLeafletCameraFromMapbox|lastEngineDrivenLeafletMove/, "retired camera bridge must not return");
assert.doesNotMatch(dual, /from ["'].+mapSceneRuntime["']/, "dual-engine camera owner must not import the transitional scene runtime");

assert.match(lifecycle, /orderedInitializers/, "Mapbox lifecycle must retain deterministic initializer ordering");
assert.match(lifecycle, /executedByMap/, "Mapbox lifecycle must prevent duplicate initializer ownership");
assert.match(lifecycle, /runCleanup\(map\)/, "Mapbox lifecycle must clean up registered owners when a map is removed");

assert.match(providerFinder, /map\.addSource\(SOURCE_ID/, "provider finder must own a native Mapbox source");
assert.match(providerFinder, /map\.addLayer\(/, "provider finder must own a native Mapbox layer");

console.log("Native Mapbox camera synchronization hardening smoke test passed.");

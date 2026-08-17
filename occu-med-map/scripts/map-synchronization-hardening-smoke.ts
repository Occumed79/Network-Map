import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

function source(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const main = source("src/main.tsx");
const app = source("src/App.tsx");
const dual = source("src/dualMapEngineRuntime.ts");
const lifecycle = source("src/mapboxMapLifecycleRuntime.ts");
const providerFinder = source("src/providerLocationFinderRuntime.ts");
const sceneRuntimePath = path.join(projectRoot, "src/mapSceneRuntime.ts");

assert.doesNotMatch(main, /mapOverlaySynchronizationControllerRuntime/, "retired overlay mirroring must not load");
assert.doesNotMatch(main, /leaflet\/dist\/leaflet\.css/, "Leaflet stylesheet must not load");
assert.doesNotMatch(main, /completeProviderPinMirrorRuntime/, "legacy periodic complete mirror must not load");
assert.doesNotMatch(main, /providerExplorerMapboxCommitGuardRuntime/, "legacy source guard must not load");
assert.doesNotMatch(main, /import "\.\/dualMapEngineRuntime";/, "dual engine ownership must be explicit from App, not boot-order side effects");

assert.match(app, /initializeDualMapEngines\(/, "App must explicitly initialize native Mapbox engines");
assert.match(app, /cleanupDualMapEngines\(/, "App must explicitly clean up native Mapbox engines");
assert.match(app, /getActiveMapboxMap\(/, "App must read active camera and bounds from the visible Mapbox engine");
assert.match(app, /network-map:native-camera/, "App refresh work must follow the active native 2D\/3D camera");
assert.doesNotMatch(app, /MapScene|mapSceneRuntime|mapRef\.current/, "App must not retain transitional scene ownership");
assert.equal(existsSync(sceneRuntimePath), false, "transitional mapSceneRuntime must be physically deleted");

assert.match(dual, /projection: is2d \? "mercator" : "globe"/, "2D Mercator and 3D globe modes must both remain Mapbox-native");
assert.match(dual, /mapbox2dMap/, "2D Mapbox instance must remain");
assert.match(dual, /mapboxGlobeMap/, "3D Mapbox instance must remain");
assert.match(dual, /getActiveMapboxMap/, "dual-engine runtime must expose the currently visible native Mapbox instance");
assert.match(dual, /sharedCamera/, "2D and 3D must share native camera state directly");
assert.match(dual, /captureCamera\(/, "native Mapbox movement must update shared camera state");
assert.match(dual, /applySharedCamera\(/, "mode switches must apply shared camera state directly to Mapbox");
assert.match(dual, /network-map:native-camera/, "Mapbox must publish neutral camera updates to consumers");
assert.match(dual, /instance\.doubleClickZoom\.disable\(\)/, "double-click is owned by the native Live Finder interaction instead of Mapbox zoom");
assert.doesNotMatch(dual, /canonicalMap/, "dual-engine runtime must not retain a logical-map controller");
assert.doesNotMatch(dual, /registerMapSceneInitializer/, "dual-engine runtime must not depend on scene lifecycle registration");
assert.doesNotMatch(dual, /syncMapboxCameraFromLeaflet|syncLeafletCameraFromMapbox|lastEngineDrivenLeafletMove/, "retired camera bridge must not return");
assert.doesNotMatch(dual, /from ["'].+mapSceneRuntime["']/, "dual-engine camera owner must not import a transitional scene runtime");

assert.match(lifecycle, /orderedInitializers/, "Mapbox lifecycle must retain deterministic initializer ordering");
assert.match(lifecycle, /executedByMap/, "Mapbox lifecycle must prevent duplicate initializer ownership");
assert.match(lifecycle, /runCleanup\(map\)/, "Mapbox lifecycle must clean up registered owners when a map is removed");

assert.match(providerFinder, /map\.addSource\(SOURCE_ID/, "provider finder must own a native Mapbox source");
assert.match(providerFinder, /map\.addLayer\(/, "provider finder must own a native Mapbox layer");

console.log("Native Mapbox camera synchronization hardening smoke test passed.");

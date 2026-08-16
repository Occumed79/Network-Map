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
const nativeMap = source("src/providerExplorerNativeMapRuntime.ts");
const requestStability = source("src/providerExplorerRequestStabilityRuntime.ts");
const providerFinder = source("src/providerLocationFinderRuntime.ts");

const pipelineImport = main.indexOf('import "./networkRequestPipelineRuntime";');
const stabilityImport = main.indexOf('import "./providerExplorerRequestStabilityRuntime";');
const appImport = main.indexOf('import App from "./App";');

assert.ok(pipelineImport >= 0, "unified request pipeline must be imported");
assert.ok(stabilityImport > pipelineImport, "Provider Explorer request stability must initialize after the shared request pipeline");
assert.ok(appImport > stabilityImport, "Provider Explorer request guards must load before React mounts App");
assert.doesNotMatch(main, /providerExplorerStabilityRuntime/, "retired LayerGroup transaction runtime must remain deleted");
assert.doesNotMatch(main, /mapOverlaySynchronizationControllerRuntime/, "Provider Explorer must not depend on retired overlay mirroring");
assert.doesNotMatch(main, /completeProviderPinMirrorRuntime|providerExplorerMapboxCommitGuardRuntime|providerExplorerLayerStabilityRuntime/, "legacy Provider Explorer mirror/commit guards must remain retired");

assert.match(app, /renderProviderExplorerPins/, "App must send Provider Explorer pins to the native renderer");
assert.match(app, /renderProviderExplorerDensity/, "App must send Provider Explorer density and hex data to the native renderer");
assert.match(app, /renderProviderExplorerDotDensity/, "App must send dot-density data to the native renderer");
assert.match(app, /renderProviderExplorerLive/, "App must send live discovery results to the native renderer");
assert.match(app, /renderProviderExplorerGaps/, "App must send comparison gaps to the native renderer");
assert.match(app, /clearProviderExplorerNative/, "App must clear stable native sources instead of LayerGroups");
assert.doesNotMatch(app, /providerExplorer(?:Layer|DensityLayer|LiveLayer|GapLayer)Ref/, "Provider Explorer must not retain scene LayerGroup refs");

assert.match(nativeMap, /registerMapboxMapInitializer\(/, "native Provider Explorer renderer must attach through the Mapbox lifecycle");
assert.match(nativeMap, /map\.addSource\(/, "native Provider Explorer renderer must own Mapbox GeoJSON sources");
assert.match(nativeMap, /map\.addLayer\(/, "native Provider Explorer renderer must own Mapbox layers");
assert.match(nativeMap, /source\.setData\(collection\)/, "native Provider Explorer refreshes must update stable sources with setData");
assert.match(nativeMap, /provider-explorer-native-pins/, "pins must use a stable native source/layer id");
assert.match(nativeMap, /provider-explorer-native-aggregate/, "density and hex must use a stable native aggregate source");
assert.match(nativeMap, /provider-explorer-native-dot-density/, "dot density must use a stable native source");
assert.match(nativeMap, /provider-explorer-native-live/, "live results must use a stable native source");
assert.match(nativeMap, /provider-explorer-native-gaps/, "gap results must use a stable native source");
assert.match(nativeMap, /map\.fitBounds\(/, "pin fitting must use native Mapbox camera APIs");
assert.match(nativeMap, /map\.queryRenderedFeatures\(/, "provider popup ownership must use native Mapbox hit testing");
assert.match(nativeMap, /new mapboxgl\.Popup/, "provider popups must be native Mapbox popups");
assert.doesNotMatch(nativeMap, /mapSceneRuntime|MapScene\.|LayerGroup/, "native Provider Explorer renderer must not depend on compatibility geometry");

assert.match(requestStability, /REQUEST_TIMEOUT_MS\s*=\s*25_000/, "Provider Explorer requests must retain a finite timeout");
assert.match(requestStability, /Superseded by a newer Provider Explorer/, "latest-request-wins cancellation must remain enabled");
assert.match(requestStability, /Ignored stale Provider Explorer/, "stale responses must be rejected before drawing");
assert.match(requestStability, /registerNetworkRequestMiddleware\("provider-explorer-request-stability"/, "Provider Explorer must remain on the shared request pipeline");
assert.doesNotMatch(requestStability, /window\.fetch\s*=/, "Provider Explorer must never own window.fetch");
assert.doesNotMatch(requestStability, /mapSceneRuntime|MapScene\.|LayerGroup|stagedLayers|commitGroup/, "request stability must not patch rendering primitives");

assert.match(providerFinder, /map\.addSource\(SOURCE_ID/, "Provider Location Finder must continue using its native Mapbox source");
assert.match(providerFinder, /map\.addLayer\(/, "Provider Location Finder must continue using its native Mapbox layer");

console.log("Provider Explorer native Mapbox hardening smoke test passed.");

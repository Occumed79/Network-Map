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
const stability = source("src/providerExplorerStabilityRuntime.ts");
const providerFinder = source("src/providerLocationFinderRuntime.ts");
const compat = source("src/mapboxNativeCompat.ts");

const pipelineImport = main.indexOf('import "./networkRequestPipelineRuntime";');
const dualMapImport = main.indexOf('import "./dualMapEngineRuntime";');
const stabilityImport = main.indexOf('import "./providerExplorerStabilityRuntime";');
const appImport = main.indexOf('import App from "./App";');

assert.ok(pipelineImport >= 0, "unified request pipeline must be imported");
assert.ok(dualMapImport > pipelineImport, "request pipeline must initialize before map request middleware");
assert.ok(stabilityImport > dualMapImport, "Provider Explorer stability must load after the dual-map runtime");
assert.ok(appImport > stabilityImport, "Provider Explorer stability guards must load before React mounts App");
assert.doesNotMatch(main, /mapOverlaySynchronizationControllerRuntime/, "Provider Explorer must not depend on the retired Leaflet overlay mirror");
assert.doesNotMatch(main, /providerExplorerLayerStabilityRuntime/, "fetch-patching Provider Explorer runtime must remain retired");
assert.doesNotMatch(main, /completeProviderPinMirrorRuntime/, "legacy complete-pin mirror must remain retired");
assert.doesNotMatch(main, /providerExplorerMapboxCommitGuardRuntime/, "legacy Mapbox commit guard must remain retired");

assert.match(stability, /stagedLayers:\s*L\.Layer\[\]/, "aggregate replacements must retain a staging buffer during migration");
assert.match(stability, /Superseded by a newer Provider Explorer/, "latest-request-wins cancellation must remain enabled");
assert.match(stability, /REQUEST_TIMEOUT_MS\s*=\s*25_000/, "Provider Explorer visual requests must retain a finite timeout");
assert.match(stability, /Ignored stale Provider Explorer/, "stale responses must be rejected before drawing");
assert.match(stability, /activeAggregateDrawRequestId/, "nested draw clears must preserve the active aggregate transaction");
assert.match(stability, /commitGroup\(group, "explicit-clear"\)/, "switching away from aggregate mode must still clear intentionally");
assert.match(stability, /registerNetworkRequestMiddleware\("provider-explorer-stability"/, "Provider Explorer must register with the shared request pipeline");
assert.doesNotMatch(stability, /window\.fetch\s*=/, "Provider Explorer must not own window.fetch");
assert.doesNotMatch(stability, /text\.includes\("8px points"\)/, "hardening must not depend on visible button labels");
assert.doesNotMatch(stability, /text\.includes\("clear filters"\)/, "hardening must not depend on visible button labels");

assert.match(providerFinder, /map\.addSource\(SOURCE_ID/, "provider result pins must render through a native Mapbox source");
assert.match(providerFinder, /map\.addLayer\(/, "provider result pins must render through a native Mapbox layer");
assert.match(providerFinder, /source\?\.setData\(collection\)/, "Provider Explorer results must update the native Mapbox source directly");
assert.match(compat, /native\.on\("style\.load"/, "transitional Mapbox-native layers must rehydrate after style changes");
assert.doesNotMatch(compat, /from ["']leaflet["']/, "transitional Provider Explorer rendering must not import Leaflet");

console.log("Provider Explorer Mapbox-native hardening smoke test passed.");

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
const stability = source("src/providerExplorerLayerStabilityRuntime.ts");
const mapboxGuard = source("src/providerExplorerMapboxCommitGuardRuntime.ts");

const dualMapImport = main.indexOf('import "./dualMapEngineRuntime";');
const stabilityImport = main.indexOf('import "./providerExplorerLayerStabilityRuntime";');
const guardImport = main.indexOf('import "./providerExplorerMapboxCommitGuardRuntime";');
const appImport = main.indexOf('import App from "./App";');

assert.ok(dualMapImport >= 0, "dualMapEngineRuntime must be imported");
assert.ok(stabilityImport > dualMapImport, "Provider Explorer stability must load after the dual-map prototype patches");
assert.ok(guardImport > stabilityImport, "Mapbox commit guard must load after the aggregate transaction runtime");
assert.ok(appImport > guardImport, "All rendering guards must load before React mounts App");

assert.match(stability, /stagedLayers:\s*L\.Layer\[\]/, "aggregate replacements must use a staging buffer");
assert.match(stability, /Superseded by a newer Provider Explorer/, "latest-request-wins cancellation must remain enabled");
assert.match(stability, /REQUEST_TIMEOUT_MS\s*=\s*25_000/, "Provider Explorer visual requests must retain a finite timeout");
assert.match(stability, /Ignored stale Provider Explorer/, "stale responses must be rejected before drawing");
assert.match(stability, /activeAggregateDrawRequestId/, "nested draw clears must preserve the active aggregate transaction");
assert.match(stability, /commitGroup\(group, "explicit-clear"\)/, "switching away from aggregate mode must still clear intentionally");
assert.doesNotMatch(stability, /text\.includes\("8px points"\)/, "hardening must not depend on visible button labels");
assert.doesNotMatch(stability, /text\.includes\("clear filters"\)/, "hardening must not depend on visible button labels");

assert.match(mapboxGuard, /NETWORK_SOURCE_ID\s*=\s*"network-overlays"/, "Mapbox guard must wrap the mirrored overlay source");
assert.match(mapboxGuard, /runtime\?\.requestActive/, "Mapbox guard must preserve the last good frame during aggregate requests");
assert.match(mapboxGuard, /runtime\?\.commitDepth/, "Mapbox guard must buffer snapshots during atomic commits");
assert.match(mapboxGuard, /RELEASE_GRACE_MS\s*=\s*240/, "Mapbox empty-frame release must remain delayed beyond the overlay debounce");

console.log("Provider Explorer hardening smoke test passed.");

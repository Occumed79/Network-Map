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
const controller = source("src/mapOverlaySynchronizationControllerRuntime.ts");

assert.match(main, /import "\.\/dualMapEngineRuntime";/, "dual map engine must remain the camera and engine owner");
assert.match(main, /import "\.\/mapOverlaySynchronizationControllerRuntime";/, "unified overlay controller must load before App");
assert.doesNotMatch(main, /completeProviderPinMirrorRuntime/, "legacy periodic complete mirror must not load");
assert.doesNotMatch(main, /providerExplorerMapboxCommitGuardRuntime/, "legacy source guard must not load");

assert.match(controller, /MAX_MIRRORED_FEATURES\s*=\s*75_000/, "controller must preserve complete provider coverage capacity");
assert.match(controller, /layeradd layerremove overlayadd overlayremove/, "overlay rebuilds must be event driven");
assert.doesNotMatch(controller, /setInterval\s*\(/, "overlay synchronization must not use periodic full-map reconciliation");
assert.doesNotMatch(controller, /map\.on\("moveend zoomend"/, "camera movement must not rebuild all overlay GeoJSON");
assert.match(controller, /externalWritesSuppressed/, "competing network-overlays setData writers must be suppressed");
assert.match(controller, /document\.hidden/, "background tabs must pause expensive rebuilds");
assert.match(controller, /visibilitychange/, "foreground restoration must resume pending synchronization");
assert.match(controller, /style\.load/, "Mapbox style reloads must restore overlay sources and layers");
assert.match(controller, /webglcontextlost/, "WebGL loss must be observed");
assert.match(controller, /webglcontextrestored/, "WebGL restoration must reapply the latest collection");
assert.match(controller, /empty-frame-held/, "temporary empty snapshots must be held before release");
assert.match(controller, /__NETWORK_MAP_OVERLAY_SYNC__/, "controller must expose explicit synchronization diagnostics");

console.log("Unified map synchronization hardening smoke test passed.");

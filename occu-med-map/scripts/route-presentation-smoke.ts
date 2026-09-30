import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");
const runtime = source("src/routePresentationRuntime.ts");
const mapTools = source("src/mapToolsNativeMapRuntime.ts");
const etaRoute = source("src/features/driveTime/mapboxEtaRouteLayer.ts");
const packageJson = JSON.parse(source("package.json")) as { dependencies: Record<string, string> };

assert.equal(packageJson.dependencies["mapbox-gl"], "^3.9.2", "route presentation must use the installed Mapbox GL JS v3 dependency without upgrading it");
assert.match(runtime, /getFreeCameraOptions\(\)/, "route travel must use Mapbox FreeCamera");
assert.match(runtime, /setFreeCameraOptions\(camera\)/, "route travel must update the FreeCamera along the route");
assert.match(runtime, /MercatorCoordinate\.fromLngLat/, "route travel must use altitude-aware Mercator camera positions");
assert.match(runtime, /lookAtPoint\(ahead/, "route travel must orient the camera toward the route ahead");
assert.match(runtime, /activeAnimations\.get\(map\)\?\.\(\)/, "starting a route must cancel an earlier travel animation");
assert.match(runtime, /pointerdown.*wheel.*touchstart.*keydown/s, "user input must interrupt route travel");
assert.match(runtime, /feature-state.*hover/s, "route hover must use Mapbox feature state");
assert.match(runtime, /show3dObjects/, "Mapbox Standard must enable its native 3D environment");
assert.match(runtime, /hasBuildings \|\| !map\.getSource\("composite"\)/, "classic styles must not receive duplicate building extrusions");
assert.match(runtime, /minzoom: 14/, "fallback buildings must only render near the destination");

for (const [name, content] of [["Map Tools", mapTools], ["ETA", etaRoute]] as const) {
  assert.match(content, /lineMetrics: true/, `${name} route GeoJSON must provide line-progress metrics`);
  assert.match(content, /ensureLuminousRouteLayers/, `${name} routes must use the shared luminous layer stack`);
  assert.match(content, /installRouteHover/, `${name} routes must install hover interaction`);
  assert.match(content, /startRoutePulse/, `${name} routes must animate the traveling highlight`);
  assert.match(content, /travelAlongRoute/, `${name} route selection must start route travel`);
}

console.log("Route presentation smoke test passed for luminous paths, hover, FreeCamera travel, and 3D buildings.");

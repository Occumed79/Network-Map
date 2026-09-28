import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const runtimePath = path.join(projectRoot, "src/mapCoverageGeographicFocusRuntime.ts");

assert.ok(existsSync(runtimePath), "coverage/geographic-focus runtime must exist");

const main = readFileSync(path.join(projectRoot, "src/main.tsx"), "utf8");
const runtime = readFileSync(runtimePath, "utf8");

assert.match(main, /import ["']\.\/mapCoverageGeographicFocusRuntime["'];/, "main.tsx must load the coverage/geographic-focus runtime");
assert.match(runtime, /registerRuntimeOwner\(\s*["']map-coverage-geographic-focus["']/, "runtime must have a unique ownership id");
assert.match(runtime, /registerMapboxMapInitializer/, "runtime must use the authoritative Mapbox lifecycle registry");
assert.match(runtime, /registerMapToolsSection/, "runtime must mount through the Map Tools section registry");
assert.match(runtime, /RADIUS_OPTIONS\s*=\s*\[0,\s*10,\s*25,\s*40,\s*50,\s*75,\s*100\]/, "radius options must be Off, 10, 25, 40, 50, 75, 100 miles");
assert.match(runtime, /selectedProviders\s*=\s*new Map/, "coverage rings must support multiple selected providers");
assert.match(runtime, /selectedBoundaries\s*=\s*new Map/, "geographic focus must support multiple selected boundaries");
assert.match(runtime, /selectingProviders\s*=\s*miles\s*>\s*0/, "choosing a radius must immediately enable pin selection");
assert.match(runtime, /event\.point\.x\s*-\s*12/, "provider pins must have a usable click target");
assert.match(runtime, /map\.project\(/, "provider hit testing must project candidate pins for nearest-click selection");
assert.match(runtime, /Math\.hypot/, "provider hit testing must choose the nearest candidate inside the hit box");
assert.match(runtime, /tigerWMS_Current\/MapServer/, "geographic focus must use the current TIGERweb service");
assert.match(runtime, /maxAllowableOffset/, "boundary geometry must be simplified for interactive selection");
for (const layer of ["80", "82", "28", "30"]) {
  assert.ok(runtime.includes(`layer: ${layer}`), `TIGERweb layer ${layer} must be configured`);
}
assert.match(runtime, /type:\s*["']geojson["']/, "overlays must use native Mapbox GeoJSON sources");
assert.match(runtime, /type:\s*["']fill["']/, "overlays must include native Mapbox fill layers");
assert.match(runtime, /type:\s*["']line["']/, "overlays must include native Mapbox line layers");
assert.doesNotMatch(runtime, /new\s+mapboxgl\.Marker\s*\(/, "coverage/geographic-focus runtime must not create DOM markers");
assert.doesNotMatch(runtime, /leaflet|\bL\./i, "coverage/geographic-focus runtime must not introduce a second map engine");
assert.doesNotMatch(runtime, /new\s+MutationObserver/, "coverage/geographic-focus runtime must not add another DOM observer");

const providerRegistry = readFileSync(path.join(projectRoot, "src/providerLayerRegistry.ts"), "utf8");
const fcdoIndex = providerRegistry.indexOf("synchronizedRegistrySource('uk-fcdo-recommended'");
const domesticIndex = providerRegistry.indexOf("providerType('urgent-cares'");
assert.ok(fcdoIndex >= 0 && fcdoIndex < domesticIndex, "UK FCDO toggle must remain visible at the top of the Providers registry");

console.log("Coverage radius + geographic focus smoke test passed.");

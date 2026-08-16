import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

function source(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const packageJson = JSON.parse(source("package.json"));
const tsconfig = source("tsconfig.json");
const vite = source("vite.config.ts");
const main = source("src/main.tsx");
const compat = source("src/mapboxNativeCompat.ts");
const logicalLifecycle = source("src/leafletMapLifecycleRuntime.ts");
const dual = source("src/dualMapEngineRuntime.ts");
const osm = source("../api-server/src/providerSources/adapters/openStreetMap.ts");

const dependencies = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
for (const packageName of ["leaflet", "react-leaflet", "@types/leaflet"]) {
  assert.equal(dependencies[packageName], undefined, `${packageName} must be removed from runtime dependencies`);
}

assert.match(tsconfig, /"leaflet"\s*:\s*\["\.\/src\/mapboxNativeCompat\.ts"\]/, "TypeScript must route the legacy Leaflet-shaped API to the Mapbox-native facade");
assert.match(vite, /"leaflet"\s*:\s*path\.resolve\(import\.meta\.dirname, "src\/mapboxNativeCompat\.ts"\)/, "Vite must route runtime Leaflet-shaped imports to the Mapbox-native facade");
assert.doesNotMatch(main, /leaflet\/dist\/leaflet\.css/, "Leaflet CSS must not load");
assert.doesNotMatch(main, /mapOverlaySynchronizationControllerRuntime/, "Leaflet-to-Mapbox overlay mirroring must not load");

assert.match(compat, /import mapboxgl from "mapbox-gl"/, "migration facade must be implemented on Mapbox GL");
assert.doesNotMatch(compat, /from ["']leaflet["']/, "migration facade itself must not import Leaflet");
assert.match(compat, /native\.addSource\(/, "vector features must render through Mapbox sources");
assert.match(compat, /native\.addLayer\(/, "vector features must render through Mapbox layers");
assert.match(compat, /new mapboxgl\.Marker/, "point markers must render through Mapbox markers");
assert.match(compat, /new mapboxgl\.Popup/, "popups must render through Mapbox popups");

// During the migration, the historical lifecycle registry is intentionally kept
// as a logical initializer registry. Its `L.map` symbol resolves to the facade,
// not to the removed Leaflet package. This lets the 4,971-line App migrate in
// controlled steps without recreating a hidden Leaflet renderer.
assert.match(logicalLifecycle, /orderedInitializers/, "legacy initializer order must remain deterministic during migration");
assert.match(logicalLifecycle, /left\.priority - right\.priority/, "legacy initializer priorities must remain deterministic");
assert.match(logicalLifecycle, /executedByMap/, "legacy initializers must still run once per logical map");

assert.match(dual, /projection: is2d \? "mercator" : "globe"/, "Mapbox 2D and 3D globe must remain intact");
assert.match(dual, /mapbox2dMap/, "Mapbox 2D must remain");
assert.match(dual, /mapboxGlobeMap/, "Mapbox 3D globe must remain");

assert.doesNotMatch(osm, /from ["']leaflet["']/, "OpenStreetMap live discovery must remain independent of Leaflet");
assert.match(osm, /overpass-api\.de\/api\/interpreter/, "primary OSM Overpass discovery endpoint must remain");
assert.match(osm, /overpass\.kumi\.systems\/api\/interpreter/, "OSM Overpass fallback must remain");
assert.match(osm, /searchOpenStreetMap/, "OSM live provider search must remain available");

console.log("Mapbox-native migration lifecycle smoke test passed with Leaflet removed.");

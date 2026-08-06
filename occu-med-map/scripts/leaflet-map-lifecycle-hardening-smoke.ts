import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const sourceRoot = path.join(projectRoot, "src");

function source(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = path.join(directory, entry);
    if (statSync(absolute).isDirectory()) return sourceFiles(absolute);
    return /\.(ts|tsx)$/.test(entry) ? [absolute] : [];
  });
}

const main = source("src/main.tsx");
const lifecycle = source("src/leafletMapLifecycleRuntime.ts");
const lifecycleImport = main.indexOf('import "./leafletMapLifecycleRuntime";');
const firstMapInitializerImport = Math.min(
  main.indexOf('import "./diagnosticsReliabilityRuntime";'),
  main.indexOf('import "./mapToolsCommandPanel";'),
  main.indexOf('import "./dualMapEngineRuntime";'),
);

assert.ok(lifecycleImport >= 0, "Leaflet lifecycle owner must be imported");
assert.ok(lifecycleImport < firstMapInitializerImport, "lifecycle owner must load before map initializers");
assert.match(lifecycle, /const nativeMapFactory = L\.map\.bind\(L\)/, "lifecycle runtime must capture the native Leaflet factory once");
assert.match(lifecycle, /orderedInitializers/, "initializer order must be deterministic");
assert.match(lifecycle, /left\.priority - right\.priority/, "initializer priorities must control execution order");
assert.match(lifecycle, /executedByMap/, "each initializer must run once per map");
assert.match(lifecycle, /for \(const map of maps\) initializeMapWith\(map, registered\)/, "late optional runtimes must initialize existing maps");
assert.match(lifecycle, /map\.once\("unload"/, "map cleanup must be lifecycle-owned");
assert.match(lifecycle, /__NETWORK_MAP_LEAFLET_LIFECYCLE__/, "lifecycle diagnostics must be exposed");

const assignmentOwners: string[] = [];
const nativeCaptures: string[] = [];
for (const absolute of sourceFiles(sourceRoot)) {
  const relative = path.relative(projectRoot, absolute);
  const content = readFileSync(absolute, "utf8");
  if (
    /\(L as any\)\.map\s*=/.test(content)
    || /\(L as typeof L[^)]*\)\.map\s*=/.test(content)
  ) assignmentOwners.push(relative);
  if (/L\.map\.bind\(L\)/.test(content)) nativeCaptures.push(relative);
}
assert.deepEqual(assignmentOwners, ["src/leafletMapLifecycleRuntime.ts"], "only the lifecycle runtime may replace L.map");
assert.deepEqual(nativeCaptures, ["src/leafletMapLifecycleRuntime.ts"], "only the lifecycle runtime may capture the native L.map factory");

const registeredInitializers = [
  ["src/phaseTwoMapBridge.ts", "phase-two-map-bridge", 0],
  ["src/dualMapEngineRuntime.ts", "dual-map-engine", 10],
  ["src/diagnosticsReliabilityRuntime.ts", "diagnostics-reliability", 20],
  ["src/mapOverlaySynchronizationControllerRuntime.ts", "overlay-synchronization", 30],
  ["src/mapToolsCommandPanel.ts", "map-tools-command-panel", 40],
  ["src/routePlannerControlsRuntime.ts", "route-planner-controls", 50],
  ["src/features/driveTime/nativeDriveTimeRuntime.ts", "native-drive-time", 60],
  ["src/providerDensityField.ts", "provider-density-field", 70],
  ["src/mapboxProviderRanking.ts", "mapbox-provider-ranking", 80],
  ["src/mapboxAdvancedControls.ts", "mapbox-advanced-controls", 90],
] as const;

for (const [file, id, priority] of registeredInitializers) {
  const content = source(file);
  assert.match(content, /registerLeafletMapInitializer/, `${file} must use the lifecycle registry`);
  assert.match(content, new RegExp(`id: ["']${id}["']`), `${file} must retain a stable initializer id`);
  assert.match(content, new RegExp(`priority: ${priority}`), `${file} must retain deterministic priority ${priority}`);
}

console.log("Leaflet map lifecycle hardening smoke test passed.");

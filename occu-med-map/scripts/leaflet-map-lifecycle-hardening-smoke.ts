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
assert.ok(main.indexOf('import "./leafletMapLifecycleRuntime";') < main.indexOf('import "./diagnosticsReliabilityRuntime";'), "lifecycle owner must load before map initializers");
assert.match(lifecycle, /const nativeMapFactory = L\.map\.bind\(L\)/, "lifecycle runtime must capture the native Leaflet factory once");
assert.match(lifecycle, /orderedInitializers/, "initializer order must be deterministic");
assert.match(lifecycle, /priority - right\.priority/, "initializer priorities must control execution order");
assert.match(lifecycle, /executedByMap/, "each initializer must run once per map");
assert.match(lifecycle, /for (const map of maps) initializeMapWith(map, registered)/, "late optional runtimes must initialize existing maps");
assert.match(lifecycle, /map\.once\("unload"/, "map cleanup must be lifecycle-owned");
assert.match(lifecycle, /__NETWORK_MAP_LEAFLET_LIFECYCLE__/, "lifecycle diagnostics must be exposed");

const assignmentOwners: string[] = [];
const nativeCaptures: string[] = [];
for (const absolute of sourceFiles(sourceRoot)) {
  const relative = path.relative(projectRoot, absolute);
  const content = readFileSync(absolute, "utf8");
  if (/\(L as any\)\.map\s*=/.test(content) || /\.map\s*=\s*\(...args: Parameters<typeof L\.map>\)/.test(content)) assignmentOwners.push(relative);
  if (/L\.map\.bind\(L\)/.test(content)) nativeCaptures.push(relative);
}
assert.deepEqual(assignmentOwners, ["src/leafletMapLifecycleRuntime.ts"], "only the lifecycle runtime may replace L.map");
assert.deepEqual(nativeCaptures, ["src/leafletMapLifecycleRuntime.ts"], "only the lifecycle runtime may capture the native L.map factory");

for (const [file, id] of [
  ["src/dualMapEngineRuntime.ts", "dual-map-engine"],
  ["src/diagnosticsReliabilityRuntime.ts", "diagnostics-reliability"],
  ["src/mapOverlaySynchronizationControllerRuntime.ts", "overlay-synchronization"],
  ["src/mapToolsCommandPanel.ts", "map-tools-command-panel"],
  ["src/routePlannerControlsRuntime.ts", "route-planner-controls"],
  ["src/features/driveTime/nativeDriveTimeRuntime.ts", "native-drive-time"],
  ["src/phaseTwoMapBridge.ts", "phase-two-map-bridge"],
] as const) {
  const content = source(file);
  assert.match(content, /registerLeafletMapInitializer/, file + " must use the lifecycle registry");
  assert.match(content, new RegExp("id: ["']" + id + "["']"), file + " must retain a stable initializer id");
}

console.log("Leaflet map lifecycle hardening smoke test passed.");

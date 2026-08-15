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
const pipeline = source("src/mapboxSourcePipelineRuntime.ts");
const compat = source("src/mapboxNativeCompat.ts");
const pipelineImport = main.indexOf('import "./mapboxSourcePipelineRuntime";');
assert.ok(pipelineImport >= 0, "Mapbox source pipeline must be imported");

// Every live source producer/middleware must execute after the pipeline patches
// Mapbox source registration. The retired Leaflet-to-Mapbox overlay authority is
// intentionally absent and must never participate in import-order calculations.
for (const owner of [
  './mapControlsBridgeRuntime',
  './providerLocationFinderRuntime',
  './providerTypeNormalizationRuntime',
  './dualMapEngineRuntime',
] as const) {
  const position = main.indexOf(`import "${owner}";`);
  assert.ok(position >= 0, `${owner} must remain explicitly imported`);
  assert.ok(pipelineImport < position, `source pipeline must load before ${owner}`);
}
assert.doesNotMatch(
  main,
  /import ["']\.\/mapOverlaySynchronizationControllerRuntime["'];/,
  "retired Leaflet-to-Mapbox overlay source authority must not return to boot",
);

assert.match(pipeline, /orderedMiddleware/, "source middleware order must be deterministic");
assert.match(pipeline, /left\.priority - right\.priority/, "source middleware priorities must control execution order");
assert.match(
  pipeline,
  /applySourceData\(state, data, "external"\)/,
  "direct source.setData calls must be classified as external writes",
);
assert.match(pipeline, /writer: "initial"/, "initial GeoJSON payloads must pass through the pipeline");
assert.match(pipeline, /write-suppressed/, "suppressed writes must be observable");
assert.match(pipeline, /lastRequestedData/, "the pipeline must retain the last authoritative payload for late middleware replay");
assert.match(
  pipeline,
  /applySourceData\(state, state\.lastRequestedData, state\.lastWriter\)/,
  "late middleware registration must replay the current source frame",
);
assert.match(pipeline, /__NETWORK_MAP_MAPBOX_SOURCE_PIPELINE__/, "source pipeline diagnostics must be exposed");

const addSourceOwners: string[] = [];
const removeSourceOwners: string[] = [];
const setDataAssignmentOwners: string[] = [];
for (const absolute of sourceFiles(sourceRoot)) {
  const relative = path.relative(projectRoot, absolute);
  const content = readFileSync(absolute, "utf8");
  if (/prototype\.addSource\s*=/.test(content)) addSourceOwners.push(relative);
  if (/prototype\.removeSource\s*=/.test(content)) removeSourceOwners.push(relative);
  if (/\.setData\s*=\s*\(/.test(content)) setDataAssignmentOwners.push(relative);
}
assert.deepEqual(addSourceOwners, ["src/mapboxSourcePipelineRuntime.ts"], "only the source pipeline may replace Map.prototype.addSource");
assert.deepEqual(removeSourceOwners, ["src/mapboxSourcePipelineRuntime.ts"], "only the source pipeline may replace Map.prototype.removeSource");
assert.deepEqual(setDataAssignmentOwners, ["src/mapboxSourcePipelineRuntime.ts"], "only the source pipeline may replace GeoJSONSource.setData");

// The migration facade is a normal source producer. It must use public Mapbox
// addSource/setData calls so the pipeline remains the sole interception owner.
assert.match(compat, /native\.addSource\(ids\.source/, "compatibility geometry must register through Mapbox.addSource");
assert.match(compat, /existing\.setData\(collection\)/, "compatibility geometry updates must use the wrapped GeoJSONSource.setData");
assert.doesNotMatch(compat, /\.setData\s*=/, "compatibility runtime must never replace GeoJSONSource.setData");
assert.doesNotMatch(compat, /prototype\.addSource\s*=/, "compatibility runtime must never replace Map.prototype.addSource");

const dualEngine = source("src/dualMapEngineRuntime.ts");
assert.doesNotMatch(dualEngine, /setInterval\s*\(/, "the dual engine must not periodically rebuild overlay GeoJSON");
assert.doesNotMatch(dualEngine, /source\?\.setData\(collection\)/, "the dual engine must not compete with authoritative source writes");
assert.doesNotMatch(dualEngine, /collectRenderableLayers/, "the retired dual-engine overlay collector must remain removed");
assert.doesNotMatch(dualEngine, /mapOverlaySynchronizationControllerRuntime/, "dual engine must not depend on the retired overlay controller");

const normalization = source("src/providerTypeNormalizationRuntime.ts");
assert.match(normalization, /id: "provider-type-normalization"/, "provider normalization must use a stable middleware id");
assert.match(normalization, /sourceId: SOURCE_ID/, "provider normalization must target only its source");
assert.match(normalization, /priority: 10/, "provider normalization must retain deterministic middleware priority");
assert.doesNotMatch(normalization, /patchSourceRegistration/, "provider normalization must not replace Map.prototype.addSource");
assert.doesNotMatch(normalization, /wrapFinderSource/, "provider normalization must not replace setData directly");

const finalFix = source("src/mapEngineFinalFixRuntime.ts");
assert.match(finalFix, /id: "network-overlay-density-filter"/, "density filtering must retain a stable middleware id while legacy network-overlay data can still appear");
assert.match(finalFix, /priority: 20/, "density filtering must retain deterministic transform order");
assert.doesNotMatch(finalFix, /patchMapboxDensityMirroring/, "density filtering must not replace Map.prototype.addSource");
assert.doesNotMatch(finalFix, /patchNetworkOverlaySource/, "density filtering must not replace setData directly");

console.log("Mapbox source pipeline hardening smoke test passed for native source ownership.");

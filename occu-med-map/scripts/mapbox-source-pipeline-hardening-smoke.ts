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
const pipelineImport = main.indexOf('import "./mapboxSourcePipelineRuntime";');
const firstSourceMiddlewareImport = Math.min(
  main.indexOf('import "./mapControlsBridgeRuntime";'),
  main.indexOf('import "./providerLocationFinderRuntime";'),
  main.indexOf('import "./mapOverlaySynchronizationControllerRuntime";'),
);
assert.ok(pipelineImport >= 0, "Mapbox source pipeline must be imported");
assert.ok(pipelineImport < firstSourceMiddlewareImport, "source pipeline must load before source middleware registrations");
assert.match(pipeline, /orderedMiddleware/, "source middleware order must be deterministic");
assert.match(pipeline, /left\.priority - right\.priority/, "source middleware priorities must control execution order");
assert.match(pipeline, /writer: "external"/, "direct source.setData calls must be classified as external writes");
assert.match(pipeline, /writer: "initial"/, "initial GeoJSON payloads must pass through the pipeline");
assert.match(pipeline, /write-suppressed/, "suppressed writes must be observable");
assert.match(pipeline, /lastRequestedData/, "the pipeline must retain the last authoritative payload for late middleware replay");
assert.match(pipeline, /applySourceData(state, state.lastRequestedData, state.lastWriter)/, "late middleware registration must replay the current source frame");
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

const dualEngine = source("src/dualMapEngineRuntime.ts");
assert.doesNotMatch(dualEngine, /setIntervals*(/, "the dual engine must not periodically rebuild overlay GeoJSON");
assert.doesNotMatch(dualEngine, /source?.setData(collection)/, "the dual engine must not compete with authoritative overlay writes");
assert.doesNotMatch(dualEngine, /collectRenderableLayers/, "the retired dual-engine overlay collector must remain removed");
assert.match(dualEngine, /requestOverlaySync/, "the dual engine may request synchronization without owning source data");

const overlay = source("src/mapOverlaySynchronizationControllerRuntime.ts");
assert.match(overlay, /id: "network-overlay-authority"/, "network overlays must register a stable authority middleware");
assert.match(overlay, /priority: 10/, "network overlay authority must run before transforms");
assert.match(overlay, /context\.writer === "initial" \|\| context\.writer === "overlay-synchronization"/, "only initial and authoritative overlay writes may proceed");
assert.match(overlay, /setMapboxGeoJsonSourceData/, "overlay synchronization must use an explicit writer identity");
assert.match(overlay, /getMapboxSourcePipelineDiagnostics/, "overlay diagnostics must report source-pipeline suppression counts");
assert.doesNotMatch(overlay, /wrapNetworkSource/, "overlay controller must not replace setData directly");
assert.doesNotMatch(overlay, /installMapboxOwnership/, "overlay controller must not replace Map source methods");

const normalization = source("src/providerTypeNormalizationRuntime.ts");
assert.match(normalization, /id: "provider-type-normalization"/, "provider normalization must use a stable middleware id");
assert.match(normalization, /sourceId: SOURCE_ID/, "provider normalization must target only its source");
assert.doesNotMatch(normalization, /patchSourceRegistration/, "provider normalization must not replace Map.prototype.addSource");
assert.doesNotMatch(normalization, /wrapFinderSource/, "provider normalization must not replace setData directly");

const finalFix = source("src/mapEngineFinalFixRuntime.ts");
assert.match(finalFix, /id: "network-overlay-density-filter"/, "density filtering must use a stable middleware id");
assert.match(finalFix, /priority: 20/, "density filtering must run after overlay write authorization");
assert.doesNotMatch(finalFix, /patchMapboxDensityMirroring/, "density filtering must not replace Map.prototype.addSource");
assert.doesNotMatch(finalFix, /patchNetworkOverlaySource/, "density filtering must not replace setData directly");

console.log("Mapbox source pipeline hardening smoke test passed.");

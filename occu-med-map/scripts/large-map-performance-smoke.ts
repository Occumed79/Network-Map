import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { featureBudgetForZoom, clampFeatureLimit } from "../../api-server/src/providerSources/mapFeatureBudget";

const projectRoot = path.resolve(process.cwd());
const repoRoot = path.resolve(projectRoot, "..");
const client = fs.readFileSync(path.join(projectRoot, "src/features/providerSearch/providerSearchClient.ts"), "utf8");
const workerClient = fs.readFileSync(path.join(projectRoot, "src/features/providerSearch/providerGeoJsonWorkerClient.ts"), "utf8");
const worker = fs.readFileSync(path.join(projectRoot, "src/features/providerSearch/providerGeoJson.worker.ts"), "utf8");
const pipeline = fs.readFileSync(path.join(projectRoot, "src/mapboxSourcePipelineRuntime.ts"), "utf8");
const telemetry = fs.readFileSync(path.join(projectRoot, "src/mapPerformanceTelemetryRuntime.ts"), "utf8");
const inventoryRoute = fs.readFileSync(path.join(repoRoot, "api-server/src/routes/mapInventory.ts"), "utf8");

assert.deepEqual(featureBudgetForZoom(3), { zoomBand: "world", maxFeatures: 350, detail: "minimal" });
assert.equal(featureBudgetForZoom(7).maxFeatures, 750);
assert.equal(featureBudgetForZoom(10).maxFeatures, 1500);
assert.equal(featureBudgetForZoom(13).maxFeatures, 3000);
assert.equal(featureBudgetForZoom(16).maxFeatures, 5000);
assert.equal(clampFeatureLimit(100000, 16).limit, 5000, "street zoom must remain bounded without clustering");
assert.equal(clampFeatureLimit(100000, 3).limit, 350, "distant zoom must use simplified individual-dot budget");

assert.match(client, /activeMapInventoryController\.abort/, "a newer viewport request must abort the previous one");
assert.match(client, /generationNumber !== mapInventoryGeneration/, "stale responses must be rejected by generation");
assert.match(client, /X-Map-Generation/, "generation ID must travel with viewport requests");
assert.match(client, /cancelledViewportRequests/, "viewport cancellation telemetry must be retained");
assert.match(workerClient, /providers\.length >= 500 \? ensureWorker\(\)/, "large provider transforms must move into a Web Worker");
assert.match(workerClient, /signal\?\.addEventListener\("abort"/, "worker transforms must be cancellable");
assert.match(worker, /FeatureCollection/, "worker must produce stable GeoJSON feature collections");
assert.match(worker, /featureId \|\| `provider:/, "worker features must use stable provider IDs");
assert.match(pipeline, /lastFeatureCount/, "Mapbox source reuse diagnostics must include feature counts");
assert.match(pipeline, /lastWriteDurationMs/, "Mapbox source writes must be timed");
assert.match(pipeline, /source\.setData =/, "existing Mapbox GeoJSON source setData path must be reused rather than recreated for every update");
assert.match(telemetry, /longtask/, "browser long tasks must be measured when supported");
assert.match(telemetry, /usedJSHeapSize/, "browser memory must be captured when exposed");
assert.match(telemetry, /viewportRequests/, "map diagnostics must include viewport generation/cancellation state");
assert.match(inventoryRoute, /clampFeatureLimit/, "server viewport responses must enforce zoom feature budgets");
assert.match(inventoryRoute, /featureId:/, "server map records must expose stable feature IDs");
assert.match(inventoryRoute, /quarantine_status/, "questionable provider rows must stay out of normal viewport results");
assert.doesNotMatch(inventoryRoute, /cluster/i, "large-map budget must not introduce forced clustering");
assert.doesNotMatch(inventoryRoute, /coordinateStatus:\s*"verified_exact"[\s\S]*legacy-map-inventory/, "legacy inventory must not be falsely promoted to exact coordinates");

console.log("Large-map rendering/memory hardening smoke passed.");

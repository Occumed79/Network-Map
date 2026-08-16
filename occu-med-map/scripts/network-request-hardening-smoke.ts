import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const srcRoot = path.join(projectRoot, "src");

function source(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const fullPath = path.join(directory, name);
    if (statSync(fullPath).isDirectory()) return sourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(name) ? [fullPath] : [];
  });
}

const main = source("src/main.tsx");
const pipeline = source("src/networkRequestPipelineRuntime.ts");
const admin = source("src/adminApiRuntime.ts");
const providerExplorer = source("src/providerExplorerRequestStabilityRuntime.ts");

const pipelineImport = main.indexOf('import "./networkRequestPipelineRuntime";');
const adminImport = main.indexOf('import "./adminApiRuntime";');
const providerExplorerImport = main.indexOf('import "./providerExplorerRequestStabilityRuntime";');
assert.ok(pipelineImport >= 0, "request pipeline must be imported");
assert.ok(adminImport > pipelineImport, "admin middleware must register after pipeline installation");
assert.ok(providerExplorerImport > pipelineImport, "Provider Explorer middleware must register after pipeline installation");

assert.match(pipeline, /const nativeFetch = window\.fetch\.bind\(window\)/, "pipeline must capture the browser transport once");
assert.match(pipeline, /window\.fetch =/, "pipeline must be the sole fetch owner");
assert.match(pipeline, /registrations\.sort/, "middleware order must be deterministic");
assert.match(pipeline, /dispatch\(index \+ 1/, "middleware must compose through one downstream chain");
assert.match(pipeline, /mergeContext/, "middleware must be able to pass controlled request overrides");
assert.match(pipeline, /__NETWORK_MAP_REQUEST_PIPELINE__/, "pipeline must expose diagnostics");

assert.match(admin, /registerNetworkRequestMiddleware\("admin-auth"/, "admin authentication must register as middleware");
assert.match(admin, /, 100\);/, "admin authentication priority must remain explicit");
assert.doesNotMatch(admin, /window\.fetch\s*=/, "admin authentication must not replace fetch");
assert.match(providerExplorer, /registerNetworkRequestMiddleware\("provider-explorer-request-stability"/, "Provider Explorer must register as middleware");
assert.match(providerExplorer, /, 200\);/, "Provider Explorer cancellation priority must remain explicit");
assert.doesNotMatch(providerExplorer, /window\.fetch\s*=/, "Provider Explorer must not replace fetch");

const fetchOwners = sourceFiles(srcRoot)
  .map((file) => ({ file, count: (readFileSync(file, "utf8").match(/window\.fetch\s*=/g) || []).length }))
  .filter(({ count }) => count > 0);
assert.deepEqual(
  fetchOwners.map(({ file, count }) => ({ file: path.relative(srcRoot, file), count })),
  [{ file: "networkRequestPipelineRuntime.ts", count: 1 }],
  "exactly one source file must own window.fetch",
);

for (const retired of [
  "manualProviderLayerGateRuntime.ts",
  "manualProviderVisualizationGateRuntime.ts",
  "phaseTwoLegacyLayerBridge.ts",
  "providerExplorerLayerStabilityRuntime.ts",
]) {
  assert.ok(!sourceFiles(srcRoot).some((file) => path.basename(file) === retired), `${retired} must remain retired`);
}

console.log("Unified network request pipeline hardening smoke test passed.");

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "src");
const SHARED_OBSERVER_OWNER = "runtimeControllerRegistry.ts";

function filesUnder(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

function source(relative: string): string {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const registrySource = source(SHARED_OBSERVER_OWNER);
assert(registrySource.includes("registerRuntimeOwner"), "runtime owner registry is missing registerRuntimeOwner");
assert(registrySource.includes("subscribeToSharedDomObserver"), "runtime owner registry is missing the shared DOM observer");
assert(registrySource.includes("duplicateAttempts"), "runtime owner registry must record blocked duplicate registrations");
assert((registrySource.match(/new MutationObserver/g) || []).length === 1, "runtime owner registry must own exactly one shared MutationObserver");

const requiredOwners: Record<string, string> = {
  "leafletMapLifecycleRuntime.ts": "leaflet-map-lifecycle",
  "mapboxMapLifecycleRuntime.ts": "mapbox-map-lifecycle",
  "networkRequestPipelineRuntime.ts": "network-request-pipeline",
  "mapControlsBridgeRuntime.ts": "map-controls-bridge",
  "uploadedDatasetLabelRuntime.ts": "uploaded-dataset-labels",
  "providerLayerTelemetryRuntime.ts": "provider-layer-telemetry",
  "rightPanelCompactor.ts": "right-panel-compactor",
  "liveFinderDriveTools.ts": "live-finder-drive-tools",
  "usDiagnosticsGate.ts": "us-diagnostics-gate",
  "modalLabelScrubber.ts": "modal-label-scrubber",
  "mapEngineLoadingCleanupRuntime.ts": "map-engine-loading-cleanup",
  "routePlannerControlsRuntime.ts": "route-planner-controls",
  "mapEngineFinalFixRuntime.ts": "map-engine-final-fixes",
  "mapboxGlobeLoadHardeningRuntime.ts": "mapbox-globe-load-hardening",
};

for (const [file, id] of Object.entries(requiredOwners)) {
  const text = source(file);
  assert(text.includes(`registerRuntimeOwner("${id}"`), `${file} does not register runtime owner ${id}`);
}

const sharedObserverConsumers = [
  "mapControlsBridgeRuntime.ts",
  "uploadedDatasetLabelRuntime.ts",
  "providerLayerTelemetryRuntime.ts",
  "rightPanelCompactor.ts",
  "liveFinderDriveTools.ts",
  "usDiagnosticsGate.ts",
  "modalLabelScrubber.ts",
  "mapEngineLoadingCleanupRuntime.ts",
  "routePlannerControlsRuntime.ts",
  "mapEngineFinalFixRuntime.ts",
  "mapboxGlobeLoadHardeningRuntime.ts",
];

for (const file of sharedObserverConsumers) {
  const text = source(file);
  assert(!text.includes("new MutationObserver"), `${file} still owns an independent MutationObserver`);
  assert(text.includes("subscribeToSharedDomObserver"), `${file} is not using the shared DOM observer`);
}

const ownerIds = new Map<string, string[]>();
for (const file of filesUnder(root)) {
  const text = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  for (const match of text.matchAll(/registerRuntimeOwner\(\s*["'`]([^"'`]+)["'`]/g)) {
    const id = match[1];
    const owners = ownerIds.get(id) ?? [];
    owners.push(relative);
    ownerIds.set(id, owners);
  }
}

const duplicateOwners = [...ownerIds.entries()].filter(([, files]) => files.length > 1);
assert(!duplicateOwners.length, `Duplicate runtime owner ids found: ${duplicateOwners.map(([id, files]) => `${id} => ${files.join(", ")}`).join("; ")}`);

const main = source("main.tsx");
for (const runtime of [
  "./leafletMapLifecycleRuntime",
  "./mapboxMapLifecycleRuntime",
  "./networkRequestPipelineRuntime",
]) {
  const count = main.split(runtime).length - 1;
  assert(count === 1, `${runtime} must be loaded exactly once by main.tsx; found ${count}`);
}

const directObserverFiles = filesUnder(root)
  .filter((file) => fs.readFileSync(file, "utf8").includes("new MutationObserver"))
  .map((file) => path.relative(root, file))
  .filter((file) => file !== SHARED_OBSERVER_OWNER)
  .sort();

const allowedDirectObservers = new Set([
  "generalUiIntegrityRuntime.ts",
  "healthsitesFlatDotsRuntime.ts",
  "providerLocationFinderRuntime.ts",
  "sidebarWorkspaceControllerRuntime.ts",
  "unifiedProviderToolsRuntime.ts",
]);

const unexpectedObservers = directObserverFiles.filter((file) => !allowedDirectObservers.has(file));
assert(!unexpectedObservers.length, `Unexpected independent MutationObserver owners: ${unexpectedObservers.join(", ")}`);

console.log(`Runtime ownership smoke passed: ${ownerIds.size} registered owners; one shared observer owner; ${directObserverFiles.length} legacy direct observers remain on the explicit migration allowlist.`);

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
assert(registrySource.includes("runWithoutSharedDomObservation"), "runtime owner registry must support safe legacy reconciliation without observer feedback");
assert(registrySource.includes("duplicateAttempts"), "runtime owner registry must record blocked duplicate registrations");
assert((registrySource.match(/new MutationObserver/g) || []).length === 1, "runtime owner registry must own exactly one shared MutationObserver");

const requiredOwners: Record<string, string> = {
  "leafletMapLifecycleRuntime.ts": "leaflet-map-lifecycle",
  "mapboxMapLifecycleRuntime.ts": "mapbox-map-lifecycle",
  "networkRequestPipelineRuntime.ts": "network-request-pipeline",
  "mapToolsPanelRegistry.ts": "map-tools-section-registry",
  "mapToolsCommandPanel.ts": "map-tools-command-panel",
  "mapControlsBridgeRuntime.ts": "map-controls-bridge",
  "uploadedDatasetLabelRuntime.ts": "uploaded-dataset-labels",
  "providerLayerTelemetryRuntime.ts": "provider-layer-telemetry",
  "rightPanelCompactor.ts": "right-panel-compactor",
  "liveFinderDriveTools.ts": "live-finder-drive-tools",
  "usDiagnosticsGate.ts": "us-diagnostics-gate",
  "modalLabelScrubber.ts": "modal-label-scrubber",
  "mapEngineLoadingCleanupRuntime.ts": "map-engine-loading-cleanup",
  "routePlannerControlsRuntime.ts": "route-planner-controls",
  "healthsitesFlatDotsRuntime.ts": "healthsites-flat-dots",
  "providerLocationFinderRuntime.ts": "provider-location-finder",
  "mapEngineFinalFixRuntime.ts": "map-engine-final-fixes",
  "mapboxGlobeLoadHardeningRuntime.ts": "mapbox-globe-load-hardening",
  "dialogControllerRuntime.ts": "dialog-controller",
  "generalUiIntegrityRuntime.ts": "general-ui-integrity",
  "sidebarWorkspaceControllerRuntime.ts": "sidebar-workspace-controller",
  "sidebarWorkspacePanelGuardRuntime.ts": "sidebar-workspace-integrity",
  "providerSourceSelectionPersistenceRuntime.ts": "provider-source-selection-persistence",
};

for (const [file, id] of Object.entries(requiredOwners)) {
  const text = source(file);
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert(new RegExp(`registerRuntimeOwner\\(\\s*["']${escapedId}["']`).test(text), `${file} does not register runtime owner ${id}`);
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
  "mapboxGlobeLoadHardeningRuntime.ts",
  "dialogControllerRuntime.ts",
  "generalUiIntegrityRuntime.ts",
  "sidebarWorkspaceControllerRuntime.ts",
];

for (const file of sharedObserverConsumers) {
  const text = source(file);
  assert(!text.includes("new MutationObserver"), `${file} still owns an independent MutationObserver`);
  assert(text.includes("subscribeToSharedDomObserver"), `${file} is not using the shared DOM observer`);
}

// mapEngineFinalFixRuntime deliberately does NOT observe the map subtree. Its
// prior observer callback wrote classes/removals back into the same subtree and
// created a renderer-locking feedback loop in Chromium/WebKit. It is now a
// bounded event/checkpoint reconciler while retaining explicit runtime ownership.
const mapEngineFinalFix = source("mapEngineFinalFixRuntime.ts");
assert(!mapEngineFinalFix.includes("new MutationObserver"), "mapEngineFinalFixRuntime.ts must not own a DOM observer");
assert(!mapEngineFinalFix.includes("subscribeToSharedDomObserver"), "mapEngineFinalFixRuntime.ts must remain off the shared DOM observer to prevent feedback loops");
assert(mapEngineFinalFix.includes("scheduleReconcile"), "mapEngineFinalFixRuntime.ts must use bounded reconciliation checkpoints");

for (const file of ["sidebarWorkspaceControllerRuntime.ts"]) {
  const text = source(file);
  assert(text.includes("runWithoutSharedDomObservation"), `${file} must prevent its own compatibility writes from feeding back into the shared observer`);
}

for (const file of ["routePlannerControlsRuntime.ts", "healthsitesFlatDotsRuntime.ts", "providerLocationFinderRuntime.ts"]) {
  const text = source(file);
  assert(text.includes("registerMapToolsSection"), `${file} must register with the authoritative Map Tools section registry`);
  assert(!text.includes("new MutationObserver"), `${file} must not own a DOM observer after Map Tools ownership migration`);
  assert(!text.includes("subscribeToSharedDomObserver"), `${file} must not scan the DOM after Map Tools ownership migration`);
}

const integrity = source("generalUiIntegrityRuntime.ts");
assert(!integrity.includes("addEventListener(\"keydown\""), "UI integrity monitor must not own dialog keyboard behavior");
assert(!integrity.includes("dispatchEvent(new Event(\"resize\")"), "UI integrity monitor must not repair layout with synthetic resize events");

const sidebarIntegrity = source("sidebarWorkspacePanelGuardRuntime.ts");
assert(!sidebarIntegrity.includes("launcher.click("), "sidebar integrity monitor must not launch panels");
assert(!sidebarIntegrity.includes("controller()?.sync"), "sidebar integrity monitor must not repair sidebar ownership");
assert(!sidebarIntegrity.includes("dispatchEvent(new Event(\"resize\")"), "sidebar integrity monitor must not synthesize layout recovery events");

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
  "./sidebarWorkspaceControllerRuntime",
  "./dialogControllerRuntime",
  "./generalUiIntegrityRuntime",
]) {
  const count = main.split(runtime).length - 1;
  assert(count === 1, `${runtime} must be loaded exactly once by main.tsx; found ${count}`);
}
assert(main.indexOf('import "./dialogControllerRuntime";') < main.indexOf('import "./generalUiIntegrityRuntime";'), "dialog behavior owner must load before integrity diagnostics");

const directObserverFiles = filesUnder(root)
  .filter((file) => fs.readFileSync(file, "utf8").includes("new MutationObserver"))
  .map((file) => path.relative(root, file))
  .filter((file) => file !== SHARED_OBSERVER_OWNER)
  .sort();

assert(
  directObserverFiles.length === 0,
  `runtimeControllerRegistry.ts must be the only application-level MutationObserver owner; found: ${directObserverFiles.join(", ")}`,
);

console.log(`Runtime ownership smoke passed: ${ownerIds.size} registered owners; runtimeControllerRegistry.ts is the sole application-level MutationObserver owner.`);

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const src = (relative) => path.join(root, relative);

function read(relative) {
  return fs.readFileSync(src(relative), "utf8");
}

function write(relative, content) {
  fs.mkdirSync(path.dirname(src(relative)), { recursive: true });
  fs.writeFileSync(src(relative), content);
}

function replaceOnce(content, search, replacement, label) {
  if (typeof search === "string") {
    const first = content.indexOf(search);
    if (first < 0) throw new Error(`Missing expected text for ${label}`);
    if (content.indexOf(search, first + search.length) >= 0) throw new Error(`Expected one match for ${label}`);
    return content.slice(0, first) + replacement + content.slice(first + search.length);
  }
  const matches = [...content.matchAll(new RegExp(search.source, search.flags.includes("g") ? search.flags : `${search.flags}g`))];
  if (matches.length !== 1) throw new Error(`Expected one regex match for ${label}; found ${matches.length}`);
  return content.replace(search, replacement);
}

function edit(relative, transform) {
  const before = read(relative);
  const after = transform(before);
  if (before === after) throw new Error(`No changes produced for ${relative}`);
  write(relative, after);
}

const lifecycle = `import L from "leaflet";

export type LeafletMapInitializer = {
  id: string;
  priority?: number;
  initialize: (map: L.Map) => void | (() => void);
};

type RegisteredInitializer = Required<Pick<LeafletMapInitializer, "id" | "initialize">> & {
  priority: number;
  sequence: number;
};

type LifecycleDiagnostics = {
  mapCount: number;
  initializerCount: number;
  initializers: Array<{ id: string; priority: number }>;
  initializationErrors: number;
};

declare global {
  interface Window {
    __NETWORK_MAP_LEAFLET_LIFECYCLE__?: {
      getMaps: () => L.Map[];
      getDiagnostics: () => LifecycleDiagnostics;
    };
  }
}

const PATCH_FLAG = "__occumedLeafletLifecycleFactoryPatched";
const leafletRuntime = L as typeof L & Record<string, unknown>;
const initializers = new Map<string, RegisteredInitializer>();
const maps = new Set<L.Map>();
const executedByMap = new WeakMap<L.Map, Map<string, (() => void) | null>>();
let sequence = 0;
let initializationErrors = 0;

function orderedInitializers(): RegisteredInitializer[] {
  return [...initializers.values()].sort((left, right) =>
    left.priority - right.priority || left.sequence - right.sequence || left.id.localeCompare(right.id),
  );
}

function emit(phase: string, detail: Record<string, unknown> = {}): void {
  window.dispatchEvent(new CustomEvent("network-map:leaflet-lifecycle", {
    detail: {
      phase,
      mapCount: maps.size,
      initializerCount: initializers.size,
      ...detail,
    },
  }));
}

function initializeMapWith(map: L.Map, initializer: RegisteredInitializer): void {
  let executed = executedByMap.get(map);
  if (!executed) {
    executed = new Map();
    executedByMap.set(map, executed);
  }
  if (executed.has(initializer.id)) return;

  // Mark before invoking so a re-entrant registration cannot run the same
  // initializer twice on the same map.
  executed.set(initializer.id, null);
  try {
    const cleanup = initializer.initialize(map);
    executed.set(initializer.id, typeof cleanup === "function" ? cleanup : null);
    emit("initializer-complete", { id: initializer.id, priority: initializer.priority });
  } catch (error) {
    initializationErrors += 1;
    executed.delete(initializer.id);
    console.error(`Leaflet initializer failed: ${initializer.id}`, error);
    emit("initializer-error", {
      id: initializer.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function cleanupMap(map: L.Map): void {
  const executed = executedByMap.get(map);
  if (executed) {
    for (const [id, cleanup] of [...executed.entries()].reverse()) {
      if (!cleanup) continue;
      try {
        cleanup();
      } catch (error) {
        console.warn(`Leaflet initializer cleanup failed: ${id}`, error);
      }
    }
    executed.clear();
  }
  maps.delete(map);
  emit("map-unloaded");
}

function trackMap(map: L.Map): L.Map {
  if (maps.has(map)) return map;
  maps.add(map);
  executedByMap.set(map, new Map());
  map.once("unload", () => cleanupMap(map));
  for (const initializer of orderedInitializers()) initializeMapWith(map, initializer);
  emit("map-created");
  return map;
}

function installFactoryOwner(): void {
  if (leafletRuntime[PATCH_FLAG]) return;
  const nativeMapFactory = L.map.bind(L);
  (L as any).map = (...args: Parameters<typeof L.map>): L.Map => trackMap(nativeMapFactory(...args));
  leafletRuntime[PATCH_FLAG] = true;
}

export function registerLeafletMapInitializer(initializer: LeafletMapInitializer): () => void {
  const id = initializer.id.trim();
  if (!id) throw new Error("Leaflet map initializer requires a stable id");

  const registered: RegisteredInitializer = {
    id,
    priority: Number.isFinite(initializer.priority) ? Number(initializer.priority) : 100,
    initialize: initializer.initialize,
    sequence: sequence += 1,
  };
  initializers.set(id, registered);
  for (const map of maps) initializeMapWith(map, registered);
  emit("initializer-registered", { id, priority: registered.priority });

  return () => {
    if (initializers.get(id) !== registered) return;
    initializers.delete(id);
    for (const map of maps) {
      const executed = executedByMap.get(map);
      const cleanup = executed?.get(id);
      if (cleanup) {
        try { cleanup(); } catch (error) { console.warn(`Leaflet initializer cleanup failed: ${id}`, error); }
      }
      executed?.delete(id);
    }
    emit("initializer-unregistered", { id });
  };
}

export function getTrackedLeafletMaps(): L.Map[] {
  return [...maps];
}

installFactoryOwner();

window.__NETWORK_MAP_LEAFLET_LIFECYCLE__ = {
  getMaps: getTrackedLeafletMaps,
  getDiagnostics: () => ({
    mapCount: maps.size,
    initializerCount: initializers.size,
    initializers: orderedInitializers().map(({ id, priority }) => ({ id, priority })),
    initializationErrors,
  }),
};
`;
write("occu-med-map/src/leafletMapLifecycleRuntime.ts", lifecycle);

edit("occu-med-map/src/main.tsx", (content) => replaceOnce(
  content,
  'import "mapbox-gl/dist/mapbox-gl.css";\n',
  'import "mapbox-gl/dist/mapbox-gl.css";\nimport "./leafletMapLifecycleRuntime";\n',
  "main lifecycle import",
));

edit("occu-med-map/src/diagnosticsReliabilityRuntime.ts", (content) => {
  content = replaceOnce(content, 'import L from "leaflet";\n', 'import L from "leaflet";\nimport { registerLeafletMapInitializer } from "./leafletMapLifecycleRuntime";\n', "diagnostics lifecycle import");
  content = replaceOnce(content, /\nfunction patchLeafletMapFactory\(\): void \{[\s\S]*?\n\}\n\nfunction patchGeoJsonStyleRefresh/, '\nfunction patchGeoJsonStyleRefresh', "diagnostics factory wrapper");
  return replaceOnce(content, 'patchLeafletMapFactory();\npatchGeoJsonStyleRefresh();', 'registerLeafletMapInitializer({\n  id: "diagnostics-reliability",\n  priority: 20,\n  initialize: bindMap,\n});\npatchGeoJsonStyleRefresh();', "diagnostics registration");
});

edit("occu-med-map/src/mapToolsCommandPanel.ts", (content) => {
  content = replaceOnce(content, 'import L from "leaflet";\n', 'import L from "leaflet";\nimport { registerLeafletMapInitializer } from "./leafletMapLifecycleRuntime";\n', "map tools lifecycle import");
  content = replaceOnce(content, 'const originalMap = L.map.bind(L);\n', '', "map tools original factory");
  return replaceOnce(content, /export function installMapToolsCommandPanel\(\): void \{[\s\S]*?\n\}\n\ninstallMapToolsCommandPanel\(\);/, `export function installMapToolsCommandPanel(): void {
  if (installed || !hasMapboxToken()) return;
  installed = true;
  registerLeafletMapInitializer({
    id: "map-tools-command-panel",
    priority: 40,
    initialize: (map) => { window.setTimeout(() => installOnMap(map), 0); },
  });
}

installMapToolsCommandPanel();`, "map tools registration");
});

edit("occu-med-map/src/routePlannerControlsRuntime.ts", (content) => {
  content = replaceOnce(content, 'import L from "leaflet";\n', 'import L from "leaflet";\nimport { registerLeafletMapInitializer } from "./leafletMapLifecycleRuntime";\n', "route planner lifecycle import");
  content = replaceOnce(content, /\nfunction patchLeafletFactory\(\): void \{[\s\S]*?\n\}\n\nfunction startObserver/, '\nfunction startObserver', "route planner factory wrapper");
  return replaceOnce(content, 'patchLeafletFactory();\nif (document.readyState', 'registerLeafletMapInitializer({\n  id: "route-planner-controls",\n  priority: 50,\n  initialize: bindMap,\n});\nif (document.readyState', "route planner registration");
});

edit("occu-med-map/src/dualMapEngineRuntime.ts", (content) => {
  content = replaceOnce(content, 'import L from "leaflet";\n', 'import L from "leaflet";\nimport { registerLeafletMapInitializer } from "./leafletMapLifecycleRuntime";\n', "dual engine lifecycle import");
  return replaceOnce(content, /const originalMapFactory = L\.map\.bind\(L\);\n\(L as any\)\.map = \(element: string \| HTMLElement, options\?: L\.MapOptions\) => \{[\s\S]*?\n\};\n\nasync function initializeDualEngines/, `registerLeafletMapInitializer({
  id: "dual-map-engine",
  priority: 10,
  initialize: (map) => {
    canonicalMap = map;
    map.whenReady(() => { void initializeDualEngines(map); });
  },
});

async function initializeDualEngines`, "dual engine factory wrapper");
});

edit("occu-med-map/src/mapOverlaySynchronizationControllerRuntime.ts", (content) => {
  content = replaceOnce(content, 'import L from "leaflet";\n', 'import L from "leaflet";\nimport { registerLeafletMapInitializer } from "./leafletMapLifecycleRuntime";\n', "overlay lifecycle import");
  content = replaceOnce(content, /\nfunction installLeafletRegistration\(\): void \{[\s\S]*?\n\}\n\nfunction wrapNetworkSource/, '\nfunction wrapNetworkSource', "overlay factory wrapper");
  return replaceOnce(content, 'installLeafletRegistration();\ninstallMapboxOwnership();', 'registerLeafletMapInitializer({\n  id: "overlay-synchronization",\n  priority: 30,\n  initialize: bindCanonicalMap,\n});\ninstallMapboxOwnership();', "overlay registration");
});

edit("occu-med-map/src/features/driveTime/nativeDriveTimeRuntime.ts", () => `import L from "leaflet";
import { registerLeafletMapInitializer } from "../../leafletMapLifecycleRuntime";
import { installLeafletEtaRouteLayer } from "./leafletEtaRouteLayer";

let installed = false;

function nativeDriveTimeEnabled(): boolean {
  return import.meta.env.VITE_NATIVE_DRIVE_TIME === "true";
}

function installOnMap(map: L.Map): void {
  installLeafletEtaRouteLayer(map);
}

export function installNativeDriveTimeRuntime(): void {
  if (installed || !nativeDriveTimeEnabled()) return;
  installed = true;
  registerLeafletMapInitializer({
    id: "native-drive-time",
    priority: 60,
    initialize: (map) => { window.setTimeout(() => installOnMap(map), 0); },
  });
}

installNativeDriveTimeRuntime();
`);

edit("occu-med-map/src/phaseTwoMapBridge.ts", (content) => {
  content = replaceOnce(content, "import L from 'leaflet';\n", "import L from 'leaflet';\nimport { registerLeafletMapInitializer } from './leafletMapLifecycleRuntime';\n", "phase two lifecycle import");
  return replaceOnce(content, /export function installPhaseTwoMapBridge\(\): void \{[\s\S]*?\n\}\n\ninstallPhaseTwoMapBridge\(\);/, `export function installPhaseTwoMapBridge(): void {
  if (leafletRuntime[INSTALL_KEY]) return;
  leafletRuntime[INSTALL_KEY] = true;
  registerLeafletMapInitializer({
    id: 'phase-two-map-bridge',
    priority: 0,
    initialize: registerMap,
  });
}

installPhaseTwoMapBridge();`, "phase two registration");
});

for (const [relative, importPath, id, priority, installer, guard] of [
  ["occu-med-map/src/providerDensityField.ts", "./leafletMapLifecycleRuntime", "provider-density-field", 70, "installOnMap", "installed"],
  ["occu-med-map/src/mapboxProviderRanking.ts", "./leafletMapLifecycleRuntime", "mapbox-provider-ranking", 80, "installOnMap", "installed || !hasMapboxToken()"],
  ["occu-med-map/src/mapboxAdvancedControls.ts", "./leafletMapLifecycleRuntime", "mapbox-advanced-controls", 90, "installOnMap", "installed || !hasMapboxToken()"],
]) {
  edit(relative, (content) => {
    content = replaceOnce(content, 'import L from "leaflet";\n', `import L from "leaflet";\nimport { registerLeafletMapInitializer } from "${importPath}";\n`, `${id} lifecycle import`);
    content = replaceOnce(content, 'const originalMap = L.map.bind(L);\n', '', `${id} original factory`);
    const functionName = relative.includes("providerDensity") ? "installProviderDensityField" : relative.includes("ProviderRanking") ? "installMapboxProviderRanking" : "installMapboxAdvancedControls";
    const signature = functionName === "installMapboxAdvancedControls" ? `export function ${functionName}()` : `export function ${functionName}(): void`;
    const call = `${functionName}();`;
    const regex = new RegExp(`export function ${functionName.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\([^)]*\\)(?:: void)? \\{[\\s\\S]*?\\n\\}\\n\\n${functionName.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\(\\);`);
    return replaceOnce(content, regex, `${signature} {
  if (${guard}) return;
  installed = true;
  registerLeafletMapInitializer({
    id: "${id}",
    priority: ${priority},
    initialize: (map) => { window.setTimeout(() => ${installer}(map), 0); },
  });
}

${call}`, `${id} registration`);
  });
}

const smoke = `import assert from "node:assert/strict";
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
    return /\\.(ts|tsx)$/.test(entry) ? [absolute] : [];
  });
}

const main = source("src/main.tsx");
const lifecycle = source("src/leafletMapLifecycleRuntime.ts");
assert.ok(main.indexOf('import "./leafletMapLifecycleRuntime";') < main.indexOf('import "./diagnosticsReliabilityRuntime";'), "lifecycle owner must load before map initializers");
assert.match(lifecycle, /const nativeMapFactory = L\\.map\\.bind\\(L\\)/, "lifecycle runtime must capture the native Leaflet factory once");
assert.match(lifecycle, /orderedInitializers/, "initializer order must be deterministic");
assert.match(lifecycle, /priority - right\\.priority/, "initializer priorities must control execution order");
assert.match(lifecycle, /executedByMap/, "each initializer must run once per map");
assert.match(lifecycle, /for \(const map of maps\) initializeMapWith\(map, registered\)/, "late optional runtimes must initialize existing maps");
assert.match(lifecycle, /map\\.once\\("unload"/, "map cleanup must be lifecycle-owned");
assert.match(lifecycle, /__NETWORK_MAP_LEAFLET_LIFECYCLE__/, "lifecycle diagnostics must be exposed");

const assignmentOwners: string[] = [];
const nativeCaptures: string[] = [];
for (const absolute of sourceFiles(sourceRoot)) {
  const relative = path.relative(projectRoot, absolute);
  const content = readFileSync(absolute, "utf8");
  if (/\\(L as any\\)\\.map\\s*=/.test(content) || /\\.map\\s*=\\s*\\(\.\.\.args: Parameters<typeof L\\.map>\\)/.test(content)) assignmentOwners.push(relative);
  if (/L\\.map\\.bind\\(L\\)/.test(content)) nativeCaptures.push(relative);
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
  assert.match(content, /registerLeafletMapInitializer/, `${file} must use the lifecycle registry`);
  assert.match(content, new RegExp(`id: ["']${id}["']`), `${file} must retain a stable initializer id`);
}

console.log("Leaflet map lifecycle hardening smoke test passed.");
`;
write("occu-med-map/scripts/leaflet-map-lifecycle-hardening-smoke.ts", smoke);

edit("occu-med-map/package.json", (content) => {
  const manifest = JSON.parse(content);
  manifest.scripts["test:leaflet-map-lifecycle-hardening"] = "tsx scripts/leaflet-map-lifecycle-hardening-smoke.ts";
  return `${JSON.stringify(manifest, null, 2)}\n`;
});

edit(".github/workflows/validate.yml", (content) => replaceOnce(
  content,
  '      - name: Run network request pipeline hardening smoke test\n        run: pnpm --filter @workspace/occu-med-map test:network-request-hardening\n',
  '      - name: Run network request pipeline hardening smoke test\n        run: pnpm --filter @workspace/occu-med-map test:network-request-hardening\n\n      - name: Run Leaflet map lifecycle hardening smoke test\n        run: pnpm --filter @workspace/occu-med-map test:leaflet-map-lifecycle-hardening\n',
  "validate lifecycle test",
));

const remainingOwners = [];
for (const absolute of (function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const target = path.join(directory, entry);
    return statSync(target).isDirectory() ? walk(target) : /\.(ts|tsx)$/.test(entry) ? [target] : [];
  });
})(src("occu-med-map/src"))) {
  const relative = path.relative(root, absolute);
  const content = fs.readFileSync(absolute, "utf8");
  if (relative !== "occu-med-map/src/leafletMapLifecycleRuntime.ts" && (content.includes("L.map.bind(L)") || /\(L as any\)\.map\s*=/.test(content) || /\)\.map\s*=/.test(content))) remainingOwners.push(relative);
}
if (remainingOwners.length) throw new Error(`Unconverted Leaflet factory owners: ${remainingOwners.join(", ")}`);

console.log("Leaflet lifecycle refactor complete.");

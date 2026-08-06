import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = (relative) => path.join(root, relative);
const read = (relative) => fs.readFileSync(target(relative), "utf8");
const write = (relative, content) => fs.writeFileSync(target(relative), content);

function replaceOnce(content, search, replacement, label) {
  if (typeof search === "string") {
    const first = content.indexOf(search);
    if (first < 0) throw new Error("Missing expected text for " + label);
    if (content.indexOf(search, first + search.length) >= 0) throw new Error("Expected one match for " + label);
    return content.slice(0, first) + replacement + content.slice(first + search.length);
  }
  const flags = search.flags.includes("g") ? search.flags : search.flags + "g";
  const matches = [...content.matchAll(new RegExp(search.source, flags))];
  if (matches.length !== 1) throw new Error("Expected one regex match for " + label + "; found " + matches.length);
  return content.replace(search, replacement);
}

function edit(relative, transform) {
  const before = read(relative);
  const after = transform(before);
  if (before === after) throw new Error("No changes produced for " + relative);
  write(relative, after);
}

edit("occu-med-map/src/mapboxSourcePipelineRuntime.ts", (content) => {
  content = replaceOnce(
    content,
    `  writesApplied: number;
  writesSuppressed: number;
};`,
    `  writesApplied: number;
  writesSuppressed: number;
  lastRequestedData?: MapboxGeoJsonData;
  lastWriter?: MapboxSourceWriter;
};`,
    "pipeline source replay state",
  );
  content = replaceOnce(
    content,
    `  state.writesApplied += 1;
  state.nativeSetData(result.data);`,
    `  state.writesApplied += 1;
  state.lastRequestedData = data;
  state.lastWriter = writer;
  state.nativeSetData(result.data);`,
    "pipeline remember applied write",
  );
  return replaceOnce(
    content,
    `  middlewares.set(id, registered);
  statsFor(id);
  emit("middleware-registered", { id, sourceId, priority: registered.priority });`,
    `  middlewares.set(id, registered);
  statsFor(id);
  statesByMap.forEach((states) => {
    const state = states.get(sourceId);
    if (state?.lastRequestedData !== undefined && state.lastWriter) {
      applySourceData(state, state.lastRequestedData, state.lastWriter);
    }
  });
  emit("middleware-registered", { id, sourceId, priority: registered.priority });`,
    "pipeline replay on late middleware registration",
  );
});

edit("occu-med-map/src/dualMapEngineRuntime.ts", (content) => {
  content = replaceOnce(content, 'const MAX_MIRRORED_FEATURES = 12_000;\n', '', "dual mirror feature cap");
  content = replaceOnce(content, 'let syncTimer: number | null = null;\nlet periodicTimer: number | null = null;\n', '', "dual overlay timers");
  content = replaceOnce(content, '  map.on("layeradd layerremove overlayadd overlayremove", queueOverlaySync);\n', '', "dual layer overlay listener");
  content = replaceOnce(content, '    syncAllOverlays();\n    setStatus("Mapbox 2D active");', '    requestOverlaySync();\n    setStatus("Mapbox 2D active");', "dual initial overlay sync");
  content = replaceOnce(content, '      syncAllOverlays();\n      setStatus("Mapbox 2D active");', '      requestOverlaySync();\n      setStatus("Mapbox 2D active");', "dual retry overlay sync");
  content = replaceOnce(content, '      syncAllOverlays();\n      startPeriodicSync();\n      setStatus("Mapbox 3D globe active");', '      requestOverlaySync();\n      setStatus("Mapbox 3D globe active");', "dual globe overlay sync");
  content = replaceOnce(content, '  stopPeriodicSync();\n  await ensureMapbox2d();', '  await ensureMapbox2d();', "dual mode periodic stop");
  content = replaceOnce(content, '  syncAllOverlays();\n  setStatus("Mapbox 2D active");', '  requestOverlaySync();\n  setStatus("Mapbox 2D active");', "dual 2d overlay sync");
  content = replaceOnce(content, '  installMapboxOverlayLayers(instance);\n  installMapboxInteractions(instance, mode);', '  installMapboxInteractions(instance, mode);\n  requestOverlaySync();', "dual source creation ownership");
  content = replaceOnce(
    content,
    /\nfunction installMapboxOverlayLayers\(targetMap: mapboxgl\.Map\): void \{[\s\S]*?\nfunction onCanonicalViewChanged\(\): void \{/,
    `
function requestOverlaySync(): void {
  const sync = window.__NETWORK_MAP_OVERLAY_SYNC__?.sync;
  if (typeof sync === "function") sync();
}

function onCanonicalViewChanged(): void {`,
    "dual overlay writer implementation",
  );
  content = replaceOnce(content, 'function onCanonicalViewChanged(): void {\n  queueOverlaySync();\n', 'function onCanonicalViewChanged(): void {\n', "dual camera overlay rebuild");
  content = replaceOnce(
    content,
    `function cleanupDualEngines(): void {
  stopPeriodicSync();
  if (syncTimer !== null) window.clearTimeout(syncTimer);`,
    `function cleanupDualEngines(): void {`,
    "dual overlay timer cleanup",
  );
  return replaceOnce(content, '  sync: queueOverlaySync,', '  sync: requestOverlaySync,', "dual public overlay sync");
});

edit("occu-med-map/scripts/mapbox-source-pipeline-hardening-smoke.ts", (content) => {
  content = replaceOnce(
    content,
    'assert.match(pipeline, /write-suppressed/, "suppressed writes must be observable");\n',
    'assert.match(pipeline, /write-suppressed/, "suppressed writes must be observable");\nassert.match(pipeline, /lastRequestedData/, "the pipeline must retain the last authoritative payload for late middleware replay");\nassert.match(pipeline, /applySourceData\(state, state\.lastRequestedData, state\.lastWriter\)/, "late middleware registration must replay the current source frame");\n',
    "pipeline replay regression checks",
  );
  return replaceOnce(
    content,
    'const overlay = source("src/mapOverlaySynchronizationControllerRuntime.ts");\n',
    'const dualEngine = source("src/dualMapEngineRuntime.ts");\nassert.doesNotMatch(dualEngine, /setInterval\s*\(/, "the dual engine must not periodically rebuild overlay GeoJSON");\nassert.doesNotMatch(dualEngine, /source\?\.setData\(collection\)/, "the dual engine must not compete with authoritative overlay writes");\nassert.doesNotMatch(dualEngine, /collectRenderableLayers/, "the retired dual-engine overlay collector must remain removed");\nassert.match(dualEngine, /requestOverlaySync/, "the dual engine may request synchronization without owning source data");\n\nconst overlay = source("src/mapOverlaySynchronizationControllerRuntime.ts");\n',
    "dual overlay ownership regression checks",
  );
});

console.log("Mapbox source pipeline finalization complete.");

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

function source(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const main = source("src/main.tsx");
const controller = source("src/sidebarWorkspaceControllerRuntime.ts");
const mapControls = source("src/mapControlsBridgeRuntime.ts");

assert.match(main, /import "\.\/sidebarWorkspaceControllerRuntime";/, "unified sidebar controller must load");
assert.doesNotMatch(main, /sidebarWorkspaceTabsRuntime/, "legacy tab runtime must remain retired");
assert.doesNotMatch(main, /sidebarWorkspaceConsistencyRuntime/, "legacy consistency runtime must remain retired");

for (const tab of ["providers", "mapTools", "liveFinder", "explorer"]) {
  assert.match(controller, new RegExp(`id: "${tab}"`), `workspace tab ${tab} must remain registered`);
}

assert.match(controller, /occumed-sidebar-workspace-host/, "Map Tools must use a dedicated sidebar host");
assert.match(controller, /host\.appendChild\(panel\)/, "Map Tools must be physically docked into the sidebar");
assert.match(controller, /> \.occumed-map-tools-panel \{\s*position: static !important;/s, "docked Map Tools must never float over the map");
assert.match(controller, /font-size: 11px !important;/, "workspace tab labels must retain the larger text size");
assert.match(controller, /font-size: 11\.5px !important;/, "workspace controls must retain the Explorer-sized text");
assert.match(controller, /new MutationObserver/, "one DOM lifecycle observer must keep late panels synchronized");
assert.equal((controller.match(/new MutationObserver/g) || []).length, 1, "sidebar must have exactly one MutationObserver owner");
assert.match(controller, /new ResizeObserver/, "sidebar dimensions must update without polling");
assert.doesNotMatch(controller, /setInterval\s*\(/, "sidebar synchronization must not poll continuously");
assert.match(controller, /\.unified-live-tool/, "Finder must prefer a stable launcher selector");
assert.match(controller, /\.unified-explorer-tool/, "Explorer must prefer a stable launcher selector");
assert.match(controller, /ArrowLeft.*ArrowRight.*Home.*End/s, "workspace tabs must support keyboard navigation");
assert.match(controller, /__NETWORK_MAP_SIDEBAR_WORKSPACES__/, "sidebar controller must expose diagnostics and explicit control");
assert.match(controller, /beforeunload.*cleanup/s, "sidebar observers must be cleaned up");

assert.match(mapControls, /workspaceReady/, "Map Controls must detect final sidebar ownership");
assert.match(mapControls, /panel\.dataset\.sidebarDocked === "true"/, "Map Controls must respect a docked panel marker");
assert.match(mapControls, /panel\.closest\("\.occumed-sidebar-workspace-host"\)/, "Map Controls must recognize the sidebar host");
assert.match(mapControls, /if \(!sidebarOwned && shell/, "Map Controls may use the map shell only before sidebar ownership begins");
assert.doesNotMatch(
  mapControls,
  /if \(panel\.parentElement !== shell\) shell\.appendChild\(panel\)/,
  "Map Controls must never unconditionally pull the panel out of the sidebar",
);

console.log("Sidebar workspace hardening smoke test passed.");

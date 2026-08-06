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
const panelGuard = source("src/sidebarWorkspacePanelGuardRuntime.ts");
const finalFixes = source("src/sidebar-workspace-final-fixes.css");
const mapControls = source("src/mapControlsBridgeRuntime.ts");
const indexHtml = source("index.html");

assert.match(main, /import "\.\/sidebarWorkspaceControllerRuntime";/, "unified sidebar controller must load");
assert.match(main, /import "\.\/sidebar-workspace-final-fixes\.css";/, "final sidebar layout corrections must load");
assert.match(main, /import "\.\/sidebarWorkspacePanelGuardRuntime";/, "event-driven panel recovery must load");
assert.doesNotMatch(main, /sidebarWorkspaceTabsRuntime/, "legacy tab runtime must remain retired");
assert.doesNotMatch(main, /sidebarWorkspaceConsistencyRuntime/, "legacy consistency runtime must remain retired");
assert.doesNotMatch(indexHtml, /sidebarWorkspacePersistence/, "duplicate public persistence observer must remain removed");

for (const tab of ["providers", "mapTools", "liveFinder", "explorer"]) {
  assert.match(controller, new RegExp(`id: "${tab}"`), `workspace tab ${tab} must remain registered`);
}

assert.match(controller, /occumed-sidebar-workspace-host/, "Map Tools must use a dedicated sidebar host");
assert.match(controller, /host\.appendChild\(panel\)/, "Map Tools must be physically docked into the sidebar");
assert.match(controller, /> \.occumed-map-tools-panel \{\s*position: static !important;/s, "docked Map Tools must never float over the map");
assert.match(controller, /font-size: 11px !important;/, "workspace tab labels must retain the larger text size");
assert.match(controller, /font-size: 11\.5px !important;/, "workspace controls must retain the Explorer-sized text");
assert.match(controller, /new MutationObserver/, "one DOM lifecycle observer must keep late panels synchronized");
assert.equal((controller.match(/new MutationObserver/g) || []).length, 1, "sidebar controller must have exactly one MutationObserver owner");
assert.doesNotMatch(panelGuard, /new MutationObserver/, "panel recovery must not add a competing DOM observer");
assert.match(panelGuard, /RETRY_DELAYS_MS/, "panel recovery must retry late Finder and Explorer launchers");
assert.match(panelGuard, /network-map:sidebar-workspace/, "panel recovery must follow explicit workspace events");
assert.match(panelGuard, /dispatchEvent\(new Event\("resize"\)\)/, "workspace changes must resize the map engines");
assert.match(controller, /new ResizeObserver/, "sidebar dimensions must update without polling");
assert.doesNotMatch(controller, /setInterval\s*\(/, "sidebar synchronization must not poll continuously");
assert.match(controller, /\.unified-live-tool/, "Finder must prefer a stable launcher selector");
assert.match(controller, /\.unified-explorer-tool/, "Explorer must prefer a stable launcher selector");
assert.match(controller, /ArrowLeft.*ArrowRight.*Home.*End/s, "workspace tabs must support keyboard navigation");
assert.match(controller, /__NETWORK_MAP_SIDEBAR_WORKSPACES__/, "sidebar controller must expose diagnostics and explicit control");
assert.match(controller, /beforeunload.*cleanup/s, "sidebar observers must be cleaned up");

assert.match(finalFixes, /\.app-body:has\(\.live-panel\.open\)/, "Finder must override the legacy third application column");
assert.match(finalFixes, /grid-template-columns: var\(--command-sidebar-width\) minmax\(0, 1fr\) 0 !important;/, "Finder must not leave a black right-side gutter");
assert.match(finalFixes, /data-occumedworkspace="mapTools"/, "Map Tools must have a workspace-scoped final theme");
assert.match(finalFixes, /background: #0a1c2c !important;/, "Map Tools cards must use the same navy panel palette");
assert.match(finalFixes, /--command-sidebar-width: clamp\(292px, 21vw, 320px\)/, "desktop workspace width must remain consistent across tabs");

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
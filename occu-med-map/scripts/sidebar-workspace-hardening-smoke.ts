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
const appSource = source("src/App.tsx");
const controller = source("src/sidebarWorkspaceControllerRuntime.ts");
const panelGuard = source("src/sidebarWorkspacePanelGuardRuntime.ts");
const finalFixes = source("src/sidebar-workspace-final-fixes.css");
const mapControls = source("src/mapControlsBridgeRuntime.ts");
const productionUi = source("scripts/production-ui-smoke.mjs");
const uiAcceptance = source("scripts/ci-ui-acceptance.mjs");
const postIdleProbe = source("scripts/ci-post-idle-probe.mjs");
const indexHtml = source("index.html");

assert.match(main, /import "\.\/sidebarWorkspaceControllerRuntime";/, "unified sidebar controller must load");
assert.match(main, /import "\.\/sidebar-workspace-final-fixes\.css";/, "authoritative sidebar layout layer must load");
assert.match(main, /import "\.\/sidebarWorkspacePanelGuardRuntime";/, "sidebar integrity diagnostics must load");
assert.doesNotMatch(main, /sidebarWorkspaceTabsRuntime/, "legacy tab runtime must remain retired");
assert.doesNotMatch(main, /sidebarWorkspaceConsistencyRuntime/, "legacy consistency runtime must remain retired");
assert.doesNotMatch(indexHtml, /sidebarWorkspacePersistence/, "duplicate public persistence observer must remain removed");
assert.doesNotMatch(appSource, new RegExp(["export", "Leadership", "Package"].join("")), "obsolete export function must stay removed");
assert.match(
  appSource,
  /setMasterProviderTypeFilter\(''\);setProviderExplorerFilters\(INITIAL_PROVIDER_EXPLORER_FILTERS\)[\s\S]*Clear filters/,
  "Explorer Clear filters must reset the visible provider type selection",
);
assert.doesNotMatch(main, new RegExp(["liveFinder", "ControlCleanupRuntime"].join("")), "obsolete Finder cleanup runtime must stay retired");

for (const tab of ["providers", "mapTools", "liveFinder", "explorer"]) {
  assert.match(controller, new RegExp(`id: "${tab}"`), `workspace tab ${tab} must remain registered`);
}

assert.match(controller, /registerRuntimeOwner\([\s\S]*"sidebar-workspace-controller"/, "sidebar workspace behavior must have one explicit owner");
assert.match(controller, /subscribeToSharedDomObserver\("sidebar-workspace-controller"/, "sidebar must use the shared DOM observer");
assert.match(controller, /runWithoutSharedDomObservation/, "sidebar compatibility reconciliation must not feed its own writes back into observation");
assert.doesNotMatch(controller, /new MutationObserver/, "sidebar must not create a private MutationObserver");
assert.match(controller, /occumed-sidebar-workspace-host/, "Map Tools must use a dedicated sidebar host");
assert.match(controller, /host\.appendChild\(panel\)/, "Map Tools must be physically docked into the sidebar");
assert.match(controller, /network-map:map-tools-panel-mounted/, "Map Tools must redock from its explicit late-mount event");
assert.match(controller, /PANEL_RETRY_DELAYS_MS/, "Finder and Explorer must reconcile delayed React commits with bounded retries");
assert.match(controller, /panelHasContent/, "workspace reconciliation must verify that an open panel has real content");
assert.match(controller, /delete document\.body\.dataset\.providerTool/, "leaving Finder must clear stale provider tool state");
assert.match(controller, /handlePanelCloseClick/, "Finder and Explorer close actions must return workspace ownership safely");
assert.match(controller, /document\.addEventListener\("click", handlePanelCloseClick, true\)/, "panel close handling must observe the real user action");
assert.match(controller, /document\.removeEventListener\("click", handlePanelCloseClick, true\)/, "panel close handling must be cleaned up");
assert.match(controller, /new ResizeObserver/, "sidebar dimensions must update without polling");
assert.doesNotMatch(controller, /setInterval\s*\(/, "sidebar synchronization must not poll continuously");
assert.match(controller, /\.unified-live-tool/, "Finder must prefer a stable launcher selector during the remaining source-control migration");
assert.match(controller, /\.unified-explorer-tool/, "Explorer must prefer a stable launcher selector during the remaining source-control migration");
assert.match(controller, /ArrowLeft.*ArrowRight.*Home.*End/s, "workspace tabs must support keyboard navigation");
assert.match(controller, /__NETWORK_MAP_SIDEBAR_WORKSPACES__/, "sidebar controller must expose diagnostics and explicit control");
assert.match(controller, /removeEventListener\("resize", handleViewportChange\)/, "sidebar resize listener must be cleaned up");
assert.match(controller, /beforeunload.*cleanup/s, "sidebar runtime resources must be cleaned up");
assert.doesNotMatch(controller, /createElement\("style"\)|style\.textContent/, "sidebar behavior controller must not own global runtime CSS");

assert.match(panelGuard, /registerRuntimeOwner\("sidebar-workspace-integrity"/, "sidebar integrity diagnostics must have an explicit owner");
assert.doesNotMatch(panelGuard, /new MutationObserver/, "sidebar integrity diagnostics must not add a competing DOM observer");
assert.doesNotMatch(panelGuard, /setInterval\s*\(/, "sidebar integrity diagnostics must remain event-driven");
assert.doesNotMatch(panelGuard, /RETRY_DELAYS_MS|launcher\.click\(|controller\(\)\?\.sync|dispatchEvent\(new Event\("resize"\)\)/, "sidebar integrity diagnostics must detect problems without repairing workspace ownership");
assert.match(panelGuard, /network-map:sidebar-workspace/, "sidebar integrity diagnostics must follow explicit workspace events");
assert.match(panelGuard, /recover: scheduleAudit/, "legacy recovery API must now be diagnostic-only");
assert.match(panelGuard, /phantom-right-column/, "runtime audit must detect the black right-side gutter");
assert.match(panelGuard, /map-tools-horizontal-overflow/, "runtime audit must detect Map Tools overflow");
assert.match(panelGuard, /workspace-empty/, "runtime audit must reject selected workspaces without usable controls");
assert.match(panelGuard, /__NETWORK_MAP_UI_INTEGRITY__/, "runtime UI audit must be externally inspectable");
assert.match(panelGuard, /removeEventListener/, "UI integrity listeners must be cleaned up");

assert.match(finalFixes, /\.occumed-sidebar-workspace-host > \.occumed-map-tools-panel\s*\{[\s\S]*position: static !important;/, "docked Map Tools must never float over the map");
assert.match(finalFixes, /\.occumed-sidebar-workspace-tab\s*\{[\s\S]*font-size: 11\.5px !important;/, "workspace tab labels must retain readable text");
assert.match(finalFixes, /grid-template-columns: var\(--command-sidebar-width\) minmax\(0, 1fr\) !important;/, "desktop layout must have only sidebar and map columns");
assert.doesNotMatch(finalFixes, /minmax\(0, 1fr\) 0 !important/, "a zero-width legacy third column must not remain");
assert.match(finalFixes, /phantom|legacy right drawer/i, "final layout must document right-drawer ownership");
assert.match(finalFixes, /position: fixed !important;[\s\S]*--workspace-panel-top/, "Finder and Explorer must align to measured sidebar geometry");
assert.match(finalFixes, /data-occumedworkspace="mapTools"/, "Map Tools must have a workspace-scoped final theme");
assert.match(finalFixes, /background: var\(--workspace-card-bg\) !important;/, "workspace cards must share the navy panel palette");
assert.match(finalFixes, /--command-sidebar-width: clamp\(292px, 21vw, 320px\)/, "desktop workspace width must remain consistent across tabs");
assert.match(finalFixes, /overflow-x: hidden !important;/, "workspace panels must prevent horizontal overflow");
assert.match(finalFixes, /data-occumedworkspace\]:not\(\[data-occumedworkspace="liveFinder"\]\)/, "inactive Finder must be forcibly hidden");
assert.match(finalFixes, /data-occumedworkspace\]:not\(\[data-occumedworkspace="explorer"\]\)/, "inactive Explorer must be forcibly hidden");

assert.match(productionUi, /assertWorkspace\("providers"\)/, "production UI smoke must exercise Providers");
assert.match(productionUi, /assertWorkspace\("mapTools"/, "production UI smoke must exercise Map Tools");
assert.match(productionUi, /assertWorkspace\("liveFinder"/, "production UI smoke must exercise Finder");
assert.match(productionUi, /assertWorkspace\("explorer"/, "production UI smoke must exercise Explorer");
assert.match(productionUi, /phantom right-side column/, "production UI smoke must reject map gutters");
assert.match(productionUi, /setViewportSize\(\{ width: 1024, height: 768 \}\)/, "workspace UI must be checked at a narrower desktop viewport");
assert.match(productionUi, /__NETWORK_MAP_UI_INTEGRITY__/, "production UI smoke must consume the runtime audit");

for (const control of [
  "Route starting location",
  "Route destination",
  "Luminous Density",
  "Occ-Med",
  "occupational_health_clinic",
]) {
  assert.match(uiAcceptance, new RegExp(control), `rendered UI acceptance must exercise ${control}`);
}
assert.match(uiAcceptance, /closing Finder must return to Providers/, "Finder Close must not leave an empty selected workspace");
assert.match(uiAcceptance, /second ArrowRight must select Finder/, "keyboard acceptance must traverse Finder");
assert.match(uiAcceptance, /third ArrowRight must select Explorer/, "keyboard acceptance must traverse Explorer");
assert.match(uiAcceptance, /fourth ArrowRight must wrap to Providers/, "keyboard acceptance must cover all four tabs");

for (const tab of ["providers", "mapTools", "liveFinder", "explorer"]) {
  assert.match(postIdleProbe, new RegExp(`tab: "${tab}"`), `post-idle probe must cycle ${tab}`);
}
assert.match(postIdleProbe, /assertFourWorkspaceCycle\(page, "before-idle"\)/, "post-idle probe must verify every tab before settling");
assert.match(postIdleProbe, /waitForTimeout\(10_000\)/, "post-idle probe must include a real idle window");
assert.match(postIdleProbe, /assertFourWorkspaceCycle\(page, "after-idle"\)/, "post-idle probe must verify every tab after settling");

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

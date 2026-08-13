import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

function source(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const main = source("src/main.tsx");
const appSource = source("src/App.tsx");
const panelGuard = source("src/sidebarWorkspacePanelGuardRuntime.ts");
const finalFixes = source("src/sidebar-workspace-final-fixes.css");
const mapControls = source("src/mapControlsBridgeRuntime.ts");
const productionUi = source("scripts/production-ui-smoke.mjs");
const uiAcceptance = source("scripts/ci-ui-acceptance.mjs");
const postIdleProbe = source("scripts/ci-post-idle-probe.mjs");
const indexHtml = source("index.html");

assert.equal(
  existsSync(path.join(projectRoot, "src/sidebarWorkspaceControllerRuntime.ts")),
  false,
  "the retired imperative sidebar controller must not be restored during conflict resolution",
);
assert.doesNotMatch(main, /sidebarWorkspaceControllerRuntime/, "obsolete imperative sidebar controller must remain retired");
assert.match(main, /import "\.\/sidebar-workspace-final-fixes\.css";/, "authoritative sidebar layout layer must load");
assert.match(main, /import "\.\/ui-system\.css";[\s\S]*import "\.\/startup-hardening\.css";[\s\S]*import "\.\/sidebar-workspace-final-fixes\.css";/, "authoritative sidebar CSS must load after synchronous shell and UI layers");
assert.match(main, /import "\.\/sidebarWorkspacePanelGuardRuntime";/, "sidebar integrity diagnostics must load");
assert.doesNotMatch(main, /sidebarWorkspaceTabsRuntime/, "legacy tab runtime must remain retired");
assert.doesNotMatch(main, /sidebarWorkspaceConsistencyRuntime/, "legacy consistency runtime must remain retired");
assert.doesNotMatch(indexHtml, /sidebarWorkspacePersistence/, "duplicate public persistence observer must remain removed");
assert.doesNotMatch(appSource, new RegExp(["export", "Leadership", "Package"].join("")), "obsolete export function must stay removed");
assert.match(appSource, /className="occumed-sidebar-workspace-tabs"/, "workspace tabs must be owned by React rather than injected beside React children");
assert.match(appSource, /className="occumed-sidebar-workspace-host"/, "the Map Tools docking host must survive React rerenders");
assert.match(appSource, /className="occumed-sidebar-provider-content"/, "provider controls must remain in one React-owned workspace container");
assert.match(appSource, /aria-selected=\{sidebarWorkspace===id\}/, "React rerenders must preserve the controller-selected workspace");
assert.match(appSource, /MapToolsWorkspaceHost = React\.memo/, "the imperative Map Tools subtree must be isolated from unrelated React rerenders");
assert.match(appSource, /network-map:sidebar-workspace/, "React workspace state must publish explicit diagnostic events");
assert.match(appSource, /aria-controls=\{controls\}/, "workspace tabs must identify their controlled panels");
assert.match(
  appSource,
  /setMasterProviderTypeFilter\(''\);setProviderExplorerFilters\(INITIAL_PROVIDER_EXPLORER_FILTERS\)[\s\S]*Clear filters/,
  "Explorer Clear filters must reset the visible provider type selection",
);
assert.doesNotMatch(main, new RegExp(["liveFinder", "ControlCleanupRuntime"].join("")), "obsolete Finder cleanup runtime must stay retired");

for (const tab of ["providers", "mapTools", "liveFinder", "explorer"]) {
  assert.match(appSource, new RegExp(`id:'${tab}'`), `React must register workspace tab ${tab}`);
}

assert.match(appSource, /setShowProviderExplorerDrawer\(workspace === 'explorer'\)/, "React must derive Explorer visibility from the selected workspace");
assert.match(appSource, /workspace === 'liveFinder' \? 'liveFinder'/, "React must derive Finder visibility from the selected workspace");
assert.match(appSource, /handleSidebarTabKeyDown[\s\S]*ArrowLeft[\s\S]*ArrowRight[\s\S]*Home[\s\S]*End/, "React tabs must support keyboard navigation");
assert.match(appSource, /new ResizeObserver\(updateGeometry\)/, "React must observe sidebar geometry without polling");
assert.match(appSource, /observer\?\.disconnect\(\)/, "React must clean up sidebar geometry observation");
assert.match(appSource, /network-map:map-tools-panel-mounted/, "React must dock Map Tools from its explicit mount event");
assert.match(appSource, /host\.appendChild\(panel\)/, "Map Tools must be physically docked into the React host");
assert.match(appSource, /__NETWORK_MAP_SIDEBAR_WORKSPACES__ =/, "React must expose diagnostics and explicit external control");
assert.doesNotMatch(appSource, /PANEL_RETRY_DELAYS_MS|panelHasContent|launcher\?\.click\(\)|handleWorkspaceTabClick|sidebarWorkspaceControllerRuntime/, "workspace ownership must not retain imperative controller workarounds");
assert.match(appSource, /aria-hidden=\{activeTool !== 'liveFinder'\} inert=\{activeTool !== 'liveFinder'\}/, "inactive Finder must be natively non-interactive");
assert.match(appSource, /aria-hidden=\{!showProviderExplorerDrawer\}[\s\S]*inert=\{!showProviderExplorerDrawer\}/, "inactive Explorer must be natively non-interactive");

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
assert.match(finalFixes, /occumed-sidebar-provider-content > :is\(\.hero-card, \.sb-section\)/, "React's provider wrapper must retain the direct-child card styling");
assert.match(finalFixes, /occumed-sidebar-provider-content \{[\s\S]*background: transparent !important;/, "the structural provider wrapper must not become a legacy card surface");
assert.match(finalFixes, /--command-sidebar-width: clamp\(292px, 21vw, 320px\)/, "desktop workspace width must remain consistent across tabs");
assert.match(finalFixes, /overflow-x: hidden !important;/, "workspace panels must prevent horizontal overflow");
assert.match(finalFixes, /occumed-sidebar-workspace-scope::before[\s\S]*pointer-events: none !important;/, "decorative sidebar pseudo-elements must never intercept pointers");
assert.match(finalFixes, /--workspace-layer-panel: 3100;[\s\S]*--workspace-layer-tabs: 3110;/, "sidebar overlays must use the documented application layer band");
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

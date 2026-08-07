import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const write = (relative, content) => fs.writeFileSync(path.join(root, relative), content);

function replaceOnce(content, before, after, label) {
  const first = content.indexOf(before);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (content.indexOf(before, first + before.length) >= 0) throw new Error(`Expected one ${label}`);
  return content.slice(0, first) + after + content.slice(first + before.length);
}

// Sidebar controller: retain one workspace controller, but move DOM lifecycle
// observation into the shared runtime registry and make listener cleanup explicit.
const sidebarPath = "src/sidebarWorkspaceControllerRuntime.ts";
let sidebar = read(sidebarPath);
if (!sidebar.startsWith('import { registerRuntimeOwner')) {
  sidebar = 'import { registerRuntimeOwner, runWithoutSharedDomObservation, subscribeToSharedDomObserver } from "./runtimeControllerRegistry";\n\n' + sidebar;
}
sidebar = replaceOnce(
  sidebar,
  'let observer: MutationObserver | null = null;\n',
  'let unsubscribeDomObserver: (() => void) | null = null;\n',
  "sidebar observer variable",
);
sidebar = replaceOnce(
  sidebar,
  '    runSync();\n  }, delay);',
  '    runWithoutSharedDomObservation(runSync);\n  }, delay);',
  "sidebar sync callback",
);
const sidebarInstallBefore = `function install(): void {
  installStyle();
  scheduleSync(0);
  if (!document.body || observer) return;

  observer = new MutationObserver(() => scheduleSync());
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "aria-hidden", "hidden", "data-provider-tool"],
  });
  window.addEventListener("resize", () => scheduleSync(40), { passive: true });
  window.addEventListener("orientationchange", () => scheduleSync(40), { passive: true });
}

function cleanup(): void {
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = null;
  observer?.disconnect();
  observer = null;
  resizeObserver?.disconnect();
  resizeObserver = null;
  observedSidebar = null;
  observedTabs = null;
}`;
const sidebarInstallAfter = `function handleViewportChange(): void {
  scheduleSync(40);
}

function install(): void {
  if (!registerRuntimeOwner("sidebar-workspace-controller", "Authoritative sidebar workspace tabs, panel visibility, and Map Tools docking")) return;
  installStyle();
  scheduleSync(0);
  if (!document.body || unsubscribeDomObserver) return;

  unsubscribeDomObserver = subscribeToSharedDomObserver("sidebar-workspace-controller", () => scheduleSync());
  window.addEventListener("resize", handleViewportChange, { passive: true });
  window.addEventListener("orientationchange", handleViewportChange, { passive: true });
}

function cleanup(): void {
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = null;
  unsubscribeDomObserver?.();
  unsubscribeDomObserver = null;
  resizeObserver?.disconnect();
  resizeObserver = null;
  observedSidebar = null;
  observedTabs = null;
  window.removeEventListener("resize", handleViewportChange);
  window.removeEventListener("orientationchange", handleViewportChange);
}`;
sidebar = replaceOnce(sidebar, sidebarInstallBefore, sidebarInstallAfter, "sidebar install/cleanup block");
if (sidebar.includes("new MutationObserver")) throw new Error("Sidebar controller still contains a private MutationObserver");
write(sidebarPath, sidebar);

// Unified provider compatibility layer: keep its existing DOM compatibility
// behavior for this PR slice, but remove its private observer and register one
// explicit owner while source-level React migration proceeds separately.
const unifiedPath = "src/unifiedProviderToolsRuntime.ts";
let unified = read(unifiedPath);
unified = replaceOnce(
  unified,
  'import "./unified-provider-tools.css";\n',
  'import "./unified-provider-tools.css";\nimport { registerRuntimeOwner, runWithoutSharedDomObservation, subscribeToSharedDomObserver } from "./runtimeControllerRegistry";\n',
  "unified runtime import anchor",
);
const observerOptionsStart = unified.indexOf("const OBSERVER_OPTIONS: MutationObserverInit = {");
if (observerOptionsStart < 0) throw new Error("Missing unified observer options");
const observerOptionsEnd = unified.indexOf("};\n\n", observerOptionsStart);
if (observerOptionsEnd < 0) throw new Error("Missing unified observer options end");
unified = unified.slice(0, observerOptionsStart) + unified.slice(observerOptionsEnd + 4);
unified = replaceOnce(
  unified,
  'let observer: MutationObserver | null = null;\nlet observerConnected = false;\n',
  'let unsubscribeDomObserver: (() => void) | null = null;\n',
  "unified observer variables",
);
const connectStart = unified.indexOf("function connectObserver(): void {");
if (connectStart < 0) throw new Error("Missing unified connectObserver");
const scheduleStart = unified.indexOf("function scheduleScan(): void {", connectStart);
if (scheduleStart < 0) throw new Error("Missing unified scheduleScan after observer helpers");
unified = unified.slice(0, connectStart) + unified.slice(scheduleStart);
unified = replaceOnce(
  unified,
  '    scanWithoutObservingOwnChanges();\n',
  '    runWithoutSharedDomObservation(scan);\n',
  "unified scan callback",
);
const installStart = unified.indexOf("export function installUnifiedProviderTools(): void {");
if (installStart < 0) throw new Error("Missing unified install function");
const installEndMarker = "\n\ninstallUnifiedProviderTools();";
const installEnd = unified.indexOf(installEndMarker, installStart);
if (installEnd < 0) throw new Error("Missing unified install function end");
const unifiedInstallAfter = `function handleSourceSelectionChange(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (!SOURCE_CONFIGS.some(({ inputLabel }) => inputLabel.toLowerCase() === (target.getAttribute("aria-label") || "").trim().toLowerCase())) return;
  persistSelection();
  scheduleScan();
}

function cleanupUnifiedProviderTools(): void {
  unsubscribeDomObserver?.();
  unsubscribeDomObserver = null;
  document.removeEventListener("change", handleSourceSelectionChange);
}

export function installUnifiedProviderTools(): void {
  if (installed) return;
  if (!registerRuntimeOwner("unified-provider-tools", "Legacy provider-tool compatibility layer while controls migrate to React source ownership")) return;
  installed = true;

  document.addEventListener("change", handleSourceSelectionChange);
  unsubscribeDomObserver = subscribeToSharedDomObserver("unified-provider-tools", () => scheduleScan());
  window.addEventListener("load", scheduleScan, { once: true });
  window.addEventListener("beforeunload", cleanupUnifiedProviderTools, { once: true });
  scheduleScan();
}`;
unified = unified.slice(0, installStart) + unifiedInstallAfter + unified.slice(installEnd);
if (unified.includes("new MutationObserver")) throw new Error("Unified provider tools still contains a private MutationObserver");
write(unifiedPath, unified);

console.log("Final private MutationObserver owners migrated to the shared runtime controller.");

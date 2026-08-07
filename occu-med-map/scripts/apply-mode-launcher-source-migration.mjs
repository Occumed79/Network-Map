import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(process.cwd());
const appPath = path.join(root, "src/App.tsx");
const runtimePath = path.join(root, "src/unifiedProviderToolsRuntime.ts");
const inventoryPath = path.join(root, "UI_CONTROL_INVENTORY.md");
let app = fs.readFileSync(appPath, "utf8");
const sourceFile = ts.createSourceFile(appPath, app, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function attribute(node, name) {
  const properties = node.openingElement?.attributes?.properties || [];
  return properties.find((property) => ts.isJsxAttribute(property) && property.name.text === name) || null;
}
function attributeText(node, name) {
  const found = attribute(node, name);
  return found ? found.getText(sourceFile) : "";
}
function hasClass(node, className) {
  return attributeText(node, "className").includes(className);
}

let commandGrid = null;
let liveButton = null;
let explorerButton = null;
const providerLaunchers = [];
function visit(node, parents = []) {
  if (ts.isJsxElement(node)) {
    if (hasClass(node, "command-tool-grid")) commandGrid = node;
    const tag = node.openingElement.tagName.getText(sourceFile);
    const raw = node.getText(sourceFile);
    const inGrid = parents.some((parent) => ts.isJsxElement(parent) && hasClass(parent, "command-tool-grid"));
    if (tag === "button" && inGrid && /Live Finder|Live Places/.test(raw)) liveButton = node;
    if (tag === "button" && /Provider Explorer/.test(raw) && !inGrid) explorerButton ??= node;
    if (hasClass(node, "provider-explorer-launch")) providerLaunchers.push(node);
  }
  ts.forEachChild(node, (child) => visit(child, [...parents, node]));
}
visit(sourceFile);
if (!commandGrid) throw new Error("command-tool-grid not found");
if (!liveButton) throw new Error("source Live Finder button not found");
if (!explorerButton) throw new Error("source Provider Explorer launcher not found");
const explorerOnClick = attributeText(explorerButton, "onClick");
if (!explorerOnClick) throw new Error("Provider Explorer onClick is missing");

const edits = [];
const liveClass = attribute(liveButton, "className");
if (!liveClass) throw new Error("Live Finder className is missing");
const liveClassText = liveClass.getText(sourceFile);
let nextLiveClass = liveClassText;
if (!liveClassText.includes("unified-live-tool")) {
  if (/^className="/.test(liveClassText)) nextLiveClass = liveClassText.replace(/"$/, ' unified-live-tool"');
  else if (/^className='/.test(liveClassText)) nextLiveClass = liveClassText.replace(/'$/, " unified-live-tool'");
  else throw new Error(`Live Finder className must be a simple literal: ${liveClassText}`);
}
edits.push([liveClass.getStart(sourceFile), liveClass.getEnd(), nextLiveClass]);

const sourceLaunchers = `
                <button type="button" className="unified-npi-tool" onClick={()=>{setActiveTool('liveFinder');document.body.dataset.providerTool='npi';}} aria-pressed={document.body.dataset.providerTool==='npi'}>
                  <span>NPI Registry</span>
                </button>
                <button type="button" className="unified-explorer-tool" ${explorerOnClick}>
                  <span>Provider Explorer</span>
                </button>`;
edits.push([liveButton.getEnd(), liveButton.getEnd(), sourceLaunchers]);

const removalTargets = [explorerButton, ...providerLaunchers];
const seen = new Set();
for (const target of removalTargets) {
  const key = `${target.getFullStart()}:${target.getEnd()}`;
  if (seen.has(key)) continue;
  seen.add(key);
  edits.push([target.getFullStart(), target.getEnd(), ""]);
}
edits.sort((left, right) => right[0] - left[0] || right[1] - left[1]);
for (const [start, end, replacement] of edits) app = app.slice(0, start) + replacement + app.slice(end);
fs.writeFileSync(appPath, app);

const check = ts.createSourceFile(appPath, app, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let sourceExplorer = 0;
let sourceNpi = 0;
let externalExplorer = 0;
function verify(node, parents = []) {
  if (ts.isJsxElement(node)) {
    const raw = node.getText(check);
    const tag = node.openingElement.tagName.getText(check);
    const inGrid = parents.some((parent) => ts.isJsxElement(parent) && parent.getText(check).startsWith('<div className="command-tool-grid"'));
    if (tag === "button" && /Provider Explorer/.test(raw)) {
      if (inGrid) sourceExplorer += 1;
      else externalExplorer += 1;
    }
    if (tag === "button" && /NPI Registry/.test(raw) && inGrid) sourceNpi += 1;
  }
  ts.forEachChild(node, (child) => verify(child, [...parents, node]));
}
verify(check);
if (sourceExplorer !== 1 || sourceNpi !== 1 || externalExplorer !== 0) {
  throw new Error(`Source-launcher verification failed: explorer=${sourceExplorer}, npi=${sourceNpi}, externalExplorer=${externalExplorer}`);
}

let runtime = fs.readFileSync(runtimePath, "utf8");
const launcherStart = runtime.indexOf("function ensureModeLaunchers(): void {");
const duplicateLauncherStart = runtime.indexOf("function hideDuplicateLaunchers(): void {", launcherStart);
if (launcherStart < 0 || duplicateLauncherStart < 0) throw new Error("Mode launcher compatibility block not found");
const sourceBinder = `function bindSourceModeLaunchers(): void {
  const grid = providerGrid();
  if (!grid) return;
  const liveButton = grid.querySelector<HTMLButtonElement>(".unified-live-tool");
  const npiButton = grid.querySelector<HTMLButtonElement>(".unified-npi-tool");
  const explorerButton = grid.querySelector<HTMLButtonElement>(".unified-explorer-tool");
  if (liveButton && !liveButton.dataset.unifiedBound) {
    liveButton.dataset.unifiedBound = "true";
    liveButton.addEventListener("click", () => {
      window.setTimeout(() => {
        if (document.querySelector(".live-panel.open")) {
          resetNpiStateForLiveMode();
          setMode("live");
        } else setMode("");
      }, 0);
    });
  }
  if (npiButton && !npiButton.dataset.unifiedBound) {
    npiButton.dataset.unifiedBound = "true";
    npiButton.addEventListener("click", () => window.setTimeout(() => setMode("npi"), 0));
  }
  if (explorerButton && !explorerButton.dataset.unifiedBound) {
    explorerButton.dataset.unifiedBound = "true";
    explorerButton.addEventListener("click", () => window.setTimeout(() => {
      setMode(document.querySelector(".provider-explorer-drawer.open") ? "explorer" : "");
    }, 0));
  }
}

`;
runtime = runtime.slice(0, launcherStart) + sourceBinder + runtime.slice(duplicateLauncherStart);
const hideStart = runtime.indexOf("function hideDuplicateLaunchers(): void {");
const markStart = runtime.indexOf("function markControlGroups", hideStart);
if (hideStart < 0 || markStart < 0) throw new Error("Duplicate launcher hide block not found");
runtime = runtime.slice(0, hideStart) + runtime.slice(markStart);
for (const [startMarker, endMarker] of [
  ["function makeIcon(path: string): string {", "function providerGrid"],
  ["function hiddenHeaderLauncher(label: string): HTMLButtonElement | null {", "function resetNpiStateForLiveMode"],
]) {
  const start = runtime.indexOf(startMarker);
  const end = runtime.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`Runtime cleanup markers missing: ${startMarker}`);
  runtime = runtime.slice(0, start) + runtime.slice(end);
}
runtime = runtime.replace("  ensureModeLaunchers();\n  hideDuplicateLaunchers();\n", "  bindSourceModeLaunchers();\n");
runtime = runtime.replace(
  '    "Finder/NPI/Explorer compatibility while remaining launchers migrate to React source ownership",',
  '    "Finder/NPI/Explorer mode synchronization for source-owned React launchers",',
);
if (runtime.includes('document.createElement("button")') || runtime.includes("insertAdjacentElement") || runtime.includes("unifiedHiddenLauncher")) {
  throw new Error("Dynamic mode-launcher creation or hiding remains");
}
fs.writeFileSync(runtimePath, runtime);

let inventory = fs.readFileSync(inventoryPath, "utf8");
inventory = inventory.replace(
  "| Finder launcher / mode | Live Places | React launcher adapted by `unifiedProviderToolsRuntime.ts` | **pending source migration** | open/close; correct selected workspace; no hidden duplicate launcher dependency |",
  "| Finder launcher / mode | Live Finder / Live Places | React `App.tsx`; compatibility runtime only synchronizes mode presentation | source-owned launcher | open/close; correct selected workspace; no hidden duplicate launcher dependency |",
);
inventory = inventory.replace(
  "| NPI launcher / mode | NPI Registry | dynamically added by `unifiedProviderToolsRuntime.ts` | **pending source migration** | source-owned button required before #168 complete |",
  "| NPI launcher / mode | NPI Registry | React `App.tsx` | source-owned launcher | open Finder in NPI mode; selected state; NPI initial/error/results states |",
);
inventory = inventory.replace(
  "| Provider Explorer launcher | visible sidebar Explorer control + underlying React drawer state | compatibility layer still depends on underlying launcher | **pending source migration** | visible control must directly own action; no hidden launcher dependency |",
  "| Provider Explorer launcher | React `App.tsx` source button + sidebar workspace controller | source-owned React action; sidebar reuses the visible source launcher | repeated open/close; no hidden header launcher dependency |",
);
inventory = inventory.replace(
  "Its remaining source-ownership blocker is limited to Finder/NPI/Explorer mode launchers and duplicate-launcher compatibility; those controls must still move into React/source markup and state before #168 is complete.",
  "Finder, NPI Registry, and Provider Explorer launchers now exist directly in React source and the duplicate hidden header Explorer launcher is retired. `unifiedProviderToolsRuntime.ts` remains only as a compatibility synchronizer for Finder/NPI presentation state; the final cleanup target is to move that presentation state fully into React and delete the runtime.",
);
fs.writeFileSync(inventoryPath, inventory);

console.log("Finder/NPI/Explorer launchers migrated into React source; duplicate hidden Explorer launcher and dynamic button creation retired.");

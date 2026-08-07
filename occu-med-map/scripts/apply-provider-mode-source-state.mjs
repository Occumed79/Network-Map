import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(process.cwd());
const appPath = path.join(root, "src/App.tsx");
const mainPath = path.join(root, "src/main.tsx");
const oldRuntimePath = path.join(root, "src/unifiedProviderToolsRuntime.ts");
const persistencePath = path.join(root, "src/providerSourceSelectionPersistenceRuntime.ts");
const ownershipSmokePath = path.join(root, "scripts/runtime-ownership-smoke.ts");
const ownershipDocPath = path.join(root, "RUNTIME_OWNERSHIP.md");
const inventoryPath = path.join(root, "UI_CONTROL_INVENTORY.md");

let app = fs.readFileSync(appPath, "utf8");
const sourceFile = ts.createSourceFile(appPath, app, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const edits = [];

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
function appendClass(node, className) {
  const found = attribute(node, "className");
  if (!found) {
    edits.push([node.openingElement.getEnd() - 1, node.openingElement.getEnd() - 1, ` className="${className}"`]);
    return;
  }
  const raw = found.getText(sourceFile);
  if (raw.includes(className)) return;
  if (/^className="/.test(raw)) edits.push([found.getStart(sourceFile), found.getEnd(), raw.replace(/"$/, ` ${className}"`)]);
  else if (/^className='/.test(raw)) edits.push([found.getStart(sourceFile), found.getEnd(), raw.replace(/'$/, ` ${className}'`)]);
  else throw new Error(`Complex className on Finder control-group child: ${raw}`);
}

let activeToolStatement = null;
let liveButton = null;
let npiButton = null;
let liveControls = null;
let liveResults = null;
const labelNodes = [];

function visit(node) {
  if (ts.isVariableStatement(node)) {
    for (const declaration of node.declarationList.declarations) {
      if (!ts.isArrayBindingPattern(declaration.name)) continue;
      const hasActiveTool = declaration.name.elements.some((element) =>
        ts.isBindingElement(element) && ts.isIdentifier(element.name) && element.name.text === "activeTool",
      );
      if (hasActiveTool) activeToolStatement = node;
    }
  }
  if (ts.isJsxElement(node)) {
    const tag = node.openingElement.tagName.getText(sourceFile);
    const raw = node.getText(sourceFile);
    if (tag === "button" && hasClass(node, "unified-live-tool")) liveButton = node;
    if (tag === "button" && hasClass(node, "unified-npi-tool")) npiButton = node;
    if (hasClass(node, "lp-controls")) liveControls = node;
    if (hasClass(node, "lp-results")) liveResults = node;
    if (hasClass(node, "lp-title") || hasClass(node, "sheet-handle-label")) labelNodes.push(["title", node]);
    if (tag === "small" && /Live provider finder/.test(raw)) labelNodes.push(["subtitle", node]);
  }
  ts.forEachChild(node, visit);
}
visit(sourceFile);
if (!activeToolStatement || !liveButton || !npiButton || !liveControls || !liveResults) {
  throw new Error("Required Finder source nodes were not found");
}

edits.push([
  activeToolStatement.getEnd(),
  activeToolStatement.getEnd(),
  "\n  const [providerToolMode,setProviderToolMode] = useState<'live'|'npi'>('live');",
]);

for (const [button, mode] of [[liveButton, "live"], [npiButton, "npi"]]) {
  const onClick = attribute(button, "onClick");
  if (!onClick || !ts.isJsxExpression(onClick.initializer) || !onClick.initializer.expression) {
    throw new Error(`${mode} source launcher onClick is missing`);
  }
  const originalExpression = onClick.initializer.expression.getText(sourceFile);
  edits.push([
    onClick.getStart(sourceFile),
    onClick.getEnd(),
    `onClick={(event)=>{setProviderToolMode('${mode}');document.body.dataset.providerTool='${mode}';(${originalExpression})(event);}}`,
  ]);
  if (mode === "npi") {
    const pressed = attribute(button, "aria-pressed");
    if (pressed) edits.push([pressed.getStart(sourceFile), pressed.getEnd(), "aria-pressed={providerToolMode==='npi'}"]);
  }
}

for (const [kind, node] of labelNodes) {
  const meaningfulChildren = node.children.filter((child) => !ts.isJsxText(child) || child.getText(sourceFile).trim());
  if (meaningfulChildren.length !== 1 || !ts.isJsxText(meaningfulChildren[0])) continue;
  const child = meaningfulChildren[0];
  const normalized = child.getText(sourceFile).replace(/\s+/g, " ").trim();
  if (kind === "title" && normalized === "Analysis Inspector") {
    edits.push([child.getStart(sourceFile), child.getEnd(), "{providerToolMode==='npi'?'NPI Registry':'Live Places'}"]);
  }
  if (kind === "subtitle" && normalized === "Live provider finder") {
    edits.push([child.getStart(sourceFile), child.getEnd(), "{providerToolMode==='npi'?'U.S. provider registry search':'OpenStreetMap + Google Places'}"]);
  }
}

const controlChildren = liveControls.children.filter(ts.isJsxElement);
const liveStart = controlChildren.findIndex((child) => /LIVE SOURCE FILTERS/.test(child.getText(sourceFile)));
const npiStart = controlChildren.findIndex((child) => /U\.S\. NPI FILTERS/.test(child.getText(sourceFile)));
if (liveStart < 0 || npiStart < 0 || npiStart <= liveStart) {
  throw new Error(`Finder control section markers missing: live=${liveStart}, npi=${npiStart}`);
}
for (let index = liveStart; index < npiStart; index += 1) appendClass(controlChildren[index], "provider-tool-live-only");
for (let index = npiStart; index < controlChildren.length; index += 1) appendClass(controlChildren[index], "provider-tool-npi-only");

edits.push([
  liveResults.openingElement.getEnd(),
  liveResults.openingElement.getEnd(),
  "\n                <div className=\"provider-tool-mode-prompt\">{providerToolMode==='npi'?'Choose a U.S. location, then select an NPI category or open Custom NPI Search.':''}</div>",
]);

edits.sort((left, right) => right[0] - left[0] || right[1] - left[1]);
for (const [start, end, replacement] of edits) app = app.slice(0, start) + replacement + app.slice(end);
fs.writeFileSync(appPath, app);

const persistenceRuntime = `import "./unified-provider-tools.css";
import { registerRuntimeOwner } from "./runtimeControllerRegistry";

type SourceKey = "bluehive" | "indexed" | "dentists" | "my-clinics";

const SOURCE_SELECTION_KEY = "network-map:provider-source-selection-v4";
const SOURCE_INPUT_LABELS: Record<SourceKey, string> = {
  bluehive: "BlueHive Providers",
  indexed: "Indexed Providers",
  dentists: "Dental Examiner Presence",
  "my-clinics": "My Clinics",
};
const DEFAULT_SOURCE_SELECTION: Record<SourceKey, boolean> = {
  bluehive: false,
  indexed: false,
  dentists: false,
  "my-clinics": false,
};

let installed = false;
let applyingStoredSelection = false;
const initializationTimers: number[] = [];

function findSourceInput(key: SourceKey): HTMLInputElement | null {
  const expected = SOURCE_INPUT_LABELS[key].toLowerCase();
  return Array.from(document.querySelectorAll<HTMLInputElement>(".workflow-layer input[type='checkbox']"))
    .find((input) => (input.getAttribute("aria-label") || "").trim().toLowerCase() === expected) || null;
}

function currentSelection(): Record<SourceKey, boolean> {
  return Object.fromEntries((Object.keys(SOURCE_INPUT_LABELS) as SourceKey[]).map((key) => [key, Boolean(findSourceInput(key)?.checked)])) as Record<SourceKey, boolean>;
}

function readStoredSelection(): Record<SourceKey, boolean> {
  try {
    const parsed = JSON.parse(localStorage.getItem(SOURCE_SELECTION_KEY) || "null") as Partial<Record<SourceKey, boolean>> | null;
    if (!parsed) return { ...DEFAULT_SOURCE_SELECTION };
    return Object.fromEntries((Object.keys(SOURCE_INPUT_LABELS) as SourceKey[]).map((key) => [key, parsed[key] === true])) as Record<SourceKey, boolean>;
  } catch {
    return { ...DEFAULT_SOURCE_SELECTION };
  }
}

function persistSelection(): void {
  if (applyingStoredSelection) return;
  try { localStorage.setItem(SOURCE_SELECTION_KEY, JSON.stringify(currentSelection())); } catch {}
}

function initializeSelection(): boolean {
  const keys = Object.keys(SOURCE_INPUT_LABELS) as SourceKey[];
  const inputs = keys.map(findSourceInput);
  if (inputs.some((input) => !input)) return false;
  const desired = readStoredSelection();
  applyingStoredSelection = true;
  keys.forEach((key) => {
    const input = findSourceInput(key);
    if (!input || input.disabled || input.checked === desired[key]) return;
    input.click();
  });
  applyingStoredSelection = false;
  persistSelection();
  return true;
}

function handleChange(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const label = (target.getAttribute("aria-label") || "").trim().toLowerCase();
  if (!(Object.values(SOURCE_INPUT_LABELS) as string[]).some((value) => value.toLowerCase() === label)) return;
  persistSelection();
}

function cleanupTimersOnly(): void {
  initializationTimers.forEach((timer) => window.clearTimeout(timer));
  initializationTimers.length = 0;
}

function cleanup(): void {
  cleanupTimersOnly();
  document.removeEventListener("change", handleChange);
}

function install(): void {
  if (installed) return;
  if (!registerRuntimeOwner("provider-source-selection-persistence", "Persist source-owned React provider-layer checkbox selections")) return;
  installed = true;
  document.addEventListener("change", handleChange);
  for (const delay of [0, 120, 400, 1000]) {
    initializationTimers.push(window.setTimeout(() => { if (initializeSelection()) cleanupTimersOnly(); }, delay));
  }
  window.addEventListener("beforeunload", cleanup, { once: true });
}

install();
export {};
`;
fs.writeFileSync(persistencePath, persistenceRuntime);
if (!fs.existsSync(oldRuntimePath)) throw new Error("unifiedProviderToolsRuntime.ts is already missing unexpectedly");
fs.unlinkSync(oldRuntimePath);

let main = fs.readFileSync(mainPath, "utf8");
const oldLoad = 'safeLoad("provider tools", () => import("./unifiedProviderToolsRuntime"))';
if (!main.includes(oldLoad)) throw new Error("Old provider tools optional runtime import not found");
main = main.replace(oldLoad, 'safeLoad("provider source selection persistence", () => import("./providerSourceSelectionPersistenceRuntime"))');
fs.writeFileSync(mainPath, main);

let smoke = fs.readFileSync(ownershipSmokePath, "utf8");
smoke = smoke.replace('  "unifiedProviderToolsRuntime.ts": "unified-provider-tools",\n', '  "providerSourceSelectionPersistenceRuntime.ts": "provider-source-selection-persistence",\n');
smoke = smoke.replace('  "unifiedProviderToolsRuntime.ts",\n', "");
smoke = smoke.replace('for (const file of ["sidebarWorkspaceControllerRuntime.ts", "unifiedProviderToolsRuntime.ts"]) {', 'for (const file of ["sidebarWorkspaceControllerRuntime.ts"]) {');
if (smoke.includes("unifiedProviderToolsRuntime")) throw new Error("Runtime ownership smoke still references retired unified provider tools runtime");
fs.writeFileSync(ownershipSmokePath, smoke);

let ownershipDoc = fs.readFileSync(ownershipDocPath, "utf8");
ownershipDoc = ownershipDoc.replace(
  "| Provider-tool compatibility while controls move into React source ownership | `unified-provider-tools` | `unifiedProviderToolsRuntime.ts` |",
  "| Provider source-selection persistence for source-owned checkboxes | `provider-source-selection-persistence` | `providerSourceSelectionPersistenceRuntime.ts` |",
);
ownershipDoc = ownershipDoc.replace(
  "DOM-mutating compatibility controllers such as the sidebar workspace controller and unified provider-tools layer execute synchronous reconciliation through `runWithoutSharedDomObservation`, which temporarily pauses the shared observer so their own writes do not feed back into another scan cycle.",
  "The sidebar workspace controller is the remaining DOM-mutating compatibility controller and executes synchronous reconciliation through `runWithoutSharedDomObservation`, which temporarily pauses the shared observer so its own writes do not feed back into another scan cycle. Finder/NPI/Explorer controls and presentation state are now owned by React source; provider-source persistence uses ordinary change listeners and does not observe or rewrite the DOM.",
);
fs.writeFileSync(ownershipDocPath, ownershipDoc);

let inventory = fs.readFileSync(inventoryPath, "utf8");
inventory = inventory.replace(
  "| Finder launcher / mode | Live Finder / Live Places | React `App.tsx`; compatibility runtime only synchronizes mode presentation | source-owned launcher | open/close; correct selected workspace; no hidden duplicate launcher dependency |",
  "| Finder launcher / mode | Live Finder / Live Places | React `App.tsx` | source-owned launcher and presentation mode | open/close; correct selected workspace; no hidden duplicate launcher dependency |",
);
inventory = inventory.replace(
  "Finder, NPI Registry, and Provider Explorer launchers now exist directly in React source and the duplicate hidden header Explorer launcher is retired. `unifiedProviderToolsRuntime.ts` remains only as a compatibility synchronizer for Finder/NPI presentation state; the final cleanup target is to move that presentation state fully into React and delete the runtime.",
  "Finder, NPI Registry, Provider Explorer launchers, Finder/NPI section visibility, titles, and mode prompt are now owned directly by React source. `unifiedProviderToolsRuntime.ts` is retired. The only remaining provider-tool helper is source-selection persistence, which does not create, hide, rename, or restyle controls.",
);
fs.writeFileSync(inventoryPath, inventory);

if (fs.existsSync(oldRuntimePath)) throw new Error("Retired unifiedProviderToolsRuntime.ts still exists");
if (main.includes("unifiedProviderToolsRuntime")) throw new Error("Retired unified provider tools runtime is still imported");
if (!app.includes("providerToolMode") || !app.includes("provider-tool-live-only") || !app.includes("provider-tool-npi-only")) {
  throw new Error("React Finder/NPI mode ownership was not written into App.tsx");
}

console.log("Finder/NPI presentation state migrated into React; unified provider tools runtime retired; provider source persistence isolated.");

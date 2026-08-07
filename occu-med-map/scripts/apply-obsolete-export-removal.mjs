import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const write = (relative, content) => fs.writeFileSync(path.join(root, relative), content);

function requireOnce(content, needle, label) {
  const first = content.indexOf(needle);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (content.indexOf(needle, first + needle.length) >= 0) throw new Error(`Expected one ${label}`);
  return first;
}

const appPath = "src/App.tsx";
let app = read(appPath);
const symbol = ["export", "Leadership", "Package"].join("");
const functionStartNeedle = `  function ${symbol}() {`;
const nextFunctionNeedle = "  async function runAutomatedPriceHunt() {";
const functionStart = requireOnce(app, functionStartNeedle, "obsolete export function");
const functionEnd = requireOnce(app, nextFunctionNeedle, "next function marker");
if (functionEnd <= functionStart) throw new Error("Obsolete export function markers are out of order");
app = app.slice(0, functionStart) + app.slice(functionEnd);

const clickNeedle = `onClick={${symbol}}`;
const clickIndex = requireOnce(app, clickNeedle, "obsolete export button handler");
const wrapperNeedle = "\n              <div style={{display:'flex',gap:6}}>";
const wrapperStart = app.lastIndexOf(wrapperNeedle, clickIndex);
if (wrapperStart < 0) throw new Error("Could not locate obsolete export button wrapper");
const wrapperEndNeedle = "\n              </div>";
const wrapperEndStart = app.indexOf(wrapperEndNeedle, clickIndex);
if (wrapperEndStart < 0) throw new Error("Could not locate obsolete export button wrapper end");
app = app.slice(0, wrapperStart) + app.slice(wrapperEndStart + wrapperEndNeedle.length);
write(appPath, app);

const cleanupModule = ["liveFinder", "ControlCleanupRuntime"].join("");
const obsoleteLabel = ["leadership", " export"].join("");

const mainPath = "src/main.tsx";
let main = read(mainPath);
const cleanupImport = `import "./${cleanupModule}";\n`;
requireOnce(main, cleanupImport, "cleanup runtime import");
main = main.replace(cleanupImport, "");
write(mainPath, main);

const unifiedPath = "src/unifiedProviderToolsRuntime.ts";
let unified = read(unifiedPath);
const obsoleteLabelExpression = ` || text.includes("${obsoleteLabel}")`;
requireOnce(unified, obsoleteLabelExpression, "obsolete label classifier");
unified = unified.replace(obsoleteLabelExpression, "");
write(unifiedPath, unified);

const sidebarSmokePath = "scripts/sidebar-workspace-hardening-smoke.ts";
let sidebarSmoke = read(sidebarSmokePath);
const sidebarBeforeCleanupLines = sidebarSmoke;
sidebarSmoke = sidebarSmoke
  .split("\n")
  .filter((line) => !line.includes(cleanupModule) && !line.toLowerCase().includes(obsoleteLabel))
  .join("\n");
if (sidebarSmoke === sidebarBeforeCleanupLines) throw new Error("Expected obsolete sidebar smoke references were not found");
const cleanupAssertionStart = "\nassert.doesNotMatch(cleanupRuntime,";
const cleanupAssertionEnd = 'assert.match(cleanupRuntime, /beforeunload/, "Finder cleanup timers and listeners must be cleaned up");';
const cleanupAssertionIndex = sidebarSmoke.indexOf(cleanupAssertionStart);
if (cleanupAssertionIndex >= 0) {
  const cleanupAssertionEndIndex = sidebarSmoke.indexOf(cleanupAssertionEnd, cleanupAssertionIndex);
  if (cleanupAssertionEndIndex < 0) throw new Error("Missing cleanup smoke assertion block end");
  sidebarSmoke = sidebarSmoke.slice(0, cleanupAssertionIndex) + "\n" + sidebarSmoke.slice(cleanupAssertionEndIndex + cleanupAssertionEnd.length);
}
const sourceAnchor = 'const main = source("src/main.tsx");\n';
if (!sidebarSmoke.includes('const appSource = source("src/App.tsx");')) {
  sidebarSmoke = sidebarSmoke.replace(sourceAnchor, sourceAnchor + 'const appSource = source("src/App.tsx");\n');
}
const retiredSymbolAssertion = `assert.doesNotMatch(appSource, new RegExp(["export", "Leadership", "Package"].join("")), "obsolete export function must stay removed");\n`;
const retiredCleanupAssertion = `assert.doesNotMatch(main, new RegExp(["liveFinder", "ControlCleanupRuntime"].join("")), "obsolete Finder cleanup runtime must stay retired");\n`;
if (!sidebarSmoke.includes(retiredSymbolAssertion)) {
  sidebarSmoke = sidebarSmoke.replace('assert.doesNotMatch(indexHtml, /sidebarWorkspacePersistence/, "duplicate public persistence observer must remain removed");\n', 'assert.doesNotMatch(indexHtml, /sidebarWorkspacePersistence/, "duplicate public persistence observer must remain removed");\n' + retiredSymbolAssertion + retiredCleanupAssertion);
}
write(sidebarSmokePath, sidebarSmoke);

const productionPath = "scripts/production-ui-smoke.mjs";
let production = read(productionPath);
const productionLabelNeedle = `hasText: /${obsoleteLabel}/i`;
const productionLabelIndex = requireOnce(production, productionLabelNeedle, "obsolete production UI assertion");
const productionBlockStart = production.lastIndexOf("\n  assert.equal(", productionLabelIndex);
const productionBlockEndNeedle = "\n  );";
const productionBlockEndStart = production.indexOf(productionBlockEndNeedle, productionLabelIndex);
if (productionBlockStart < 0 || productionBlockEndStart < 0) throw new Error("Could not isolate obsolete production UI assertion block");
production = production.slice(0, productionBlockStart) + production.slice(productionBlockEndStart + productionBlockEndNeedle.length);
write(productionPath, production);

const cleanupPath = path.join(root, `src/${cleanupModule}.ts`);
if (!fs.existsSync(cleanupPath)) throw new Error("Cleanup runtime file is already missing unexpectedly");
fs.unlinkSync(cleanupPath);

const forbidden = [
  ["export", "Leadership", "Package"].join(""),
  ["Leadership", " export"].join(""),
  ["leadership", "_package_"].join(""),
  ["liveFinder", "ControlCleanupRuntime"].join(""),
];
const scanRoots = ["src", "scripts"];
const offenders = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    const relative = path.relative(root, full);
    if (relative === "scripts/apply-obsolete-export-removal.mjs") continue;
    if (!/\.(ts|tsx|js|mjs|css|html|json)$/.test(entry.name)) continue;
    const content = fs.readFileSync(full, "utf8");
    for (const token of forbidden) {
      if (content.includes(token)) offenders.push(`${relative}:${token}`);
    }
  }
}
for (const scanRoot of scanRoots) walk(path.join(root, scanRoot));
if (offenders.length) throw new Error(`Obsolete export references remain: ${offenders.join(", ")}`);

console.log("Obsolete export and cleanup runtime removed at source level.");

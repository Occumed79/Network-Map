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

const mainPath = "src/main.tsx";
let main = read(mainPath);
const cleanupModule = ["liveFinder", "ControlCleanupRuntime"].join("");
const cleanupImport = `import "./${cleanupModule}";\n`;
requireOnce(main, cleanupImport, "cleanup runtime import");
main = main.replace(cleanupImport, "");
write(mainPath, main);

const unifiedPath = "src/unifiedProviderToolsRuntime.ts";
let unified = read(unifiedPath);
const obsoleteLabel = ["leadership", " export"].join("");
const obsoleteLabelExpression = ` || text.includes("${obsoleteLabel}")`;
requireOnce(unified, obsoleteLabelExpression, "obsolete label classifier");
unified = unified.replace(obsoleteLabelExpression, "");
write(unifiedPath, unified);

const sidebarSmokePath = "scripts/sidebar-workspace-hardening-smoke.ts";
let sidebarSmoke = read(sidebarSmokePath);
sidebarSmoke = sidebarSmoke.replace(`const cleanupRuntime = source("src/${cleanupModule}.ts");\n`, "");
sidebarSmoke = sidebarSmoke.replace(new RegExp(`assert\\.match\\(main, /import \\\"\\\\\\.\\\\\\/${cleanupModule}\\\\\\\";/, \\\"obsolete Finder controls must be removed\\\"\\);\\n`), "");
sidebarSmoke = sidebarSmoke.replace(/\nassert\.doesNotMatch\(cleanupRuntime,[\s\S]*?assert\.match\(cleanupRuntime, \/beforeunload\/, "Finder cleanup timers and listeners must be cleaned up"\);\n/, "\n");
sidebarSmoke = sidebarSmoke.replace(/\nassert\.match\(productionUi, \/leadership export\/i, "production UI smoke must reject the obsolete report control"\);/, "");
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
production = production.replace(/\n\s*const leadershipExport = Array\.from\([\s\S]*?assert\.equal\(leadershipExport, false, [^\n]*\);/g, "");
production = production.replace(/\n\s*assert\.equal\([^\n]*leadership export[^\n]*\);/gi, "");
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

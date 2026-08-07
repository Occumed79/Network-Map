import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const mainPath = path.join(root, "src/main.tsx");
const cssPath = path.join(root, "src/sidebar-control-fixes.css");
let main = fs.readFileSync(mainPath, "utf8");
const importLine = 'import "./sidebar-control-fixes.css";\n';
if (!main.includes(importLine)) throw new Error("sidebar-control-fixes.css import is missing");
if (!fs.existsSync(cssPath)) throw new Error("sidebar-control-fixes.css file is missing");
main = main.replace(importLine, "");
fs.writeFileSync(mainPath, main);
fs.unlinkSync(cssPath);
if (fs.readFileSync(mainPath, "utf8").includes("sidebar-control-fixes.css") || fs.existsSync(cssPath)) {
  throw new Error("sidebar-control-fixes.css was not fully retired");
}

// The later one-time Finder/NPI source migration wraps source-owned no-argument
// launch handlers. Preserve their actual signature instead of forwarding a
// synthetic event, which TypeScript correctly rejects for those handlers.
const providerModeMigrationPath = path.join(root, "scripts/apply-provider-mode-source-state.mjs");
let providerModeMigration = fs.readFileSync(providerModeMigrationPath, "utf8");
const eventWrapper = "onClick={(event)=>{setProviderToolMode";
const noArgWrapper = "onClick={()=>{setProviderToolMode";
const eventInvocation = "(${originalExpression})(event);}}`";
const noArgInvocation = "(${originalExpression})();}}`";
if (!providerModeMigration.includes(eventWrapper) || !providerModeMigration.includes(eventInvocation)) {
  throw new Error("Expected Finder/NPI event-forwarding migration markers are missing");
}
providerModeMigration = providerModeMigration
  .replace(eventWrapper, noArgWrapper)
  .replace(eventInvocation, noArgInvocation);
fs.writeFileSync(providerModeMigrationPath, providerModeMigration);

console.log("Retired superseded sidebar-control-fixes.css layer and preserved no-argument Finder/NPI launcher signatures.");

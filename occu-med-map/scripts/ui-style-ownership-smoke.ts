import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const srcRoot = path.join(projectRoot, "src");
const main = fs.readFileSync(path.join(srcRoot, "main.tsx"), "utf8");
const uiSystem = fs.readFileSync(path.join(srcRoot, "ui-system.css"), "utf8");

const cssImports = [...main.matchAll(/import\s+["']([^"']+\.css)["'];/g)].map((match) => match[1]);
const applicationCssImports = cssImports.filter((value) => value.startsWith("./"));
assert.ok(applicationCssImports.length <= 25, `application CSS import count must not grow above the consolidation baseline of 25; found ${applicationCssImports.length}`);
assert.equal(applicationCssImports.filter((value) => value === "./ui-system.css").length, 1, "authoritative ui-system.css must be imported exactly once");

for (const retired of [
  "general-ui-hardening.css",
  "general-ui-visual-consistency.css",
  "pdf-preview-hardening.css",
  "modal-popup-fixes.css",
  "modal-content-polish.css",
  "ui-cascade-stabilization.css",
  "sidebar-control-fixes.css",
]) {
  assert.equal(fs.existsSync(path.join(srcRoot, retired)), false, `retired stylesheet must stay deleted: ${retired}`);
  assert.equal(main.includes(retired), false, `retired stylesheet must not be re-imported: ${retired}`);
}

// These are the remaining known compatibility/feature fix styles present at
// the consolidation baseline. The guard permits this explicit shrinking set
// while prohibiting any new broad override/fix/hardening stylesheet.
const transitionalBroadStyleFiles = new Set([
  "professional-overrides.css",
  "professional-hardening.css",
  "luminous-shell-fixes.css",
  "map-engine-final-fixes.css",
  "modal-command-polish.css",
  "sidebar-workspace-final-fixes.css",
  "core-app-p2-fixes.css",
  "phase-two-control-fix.css",
]);
const broadNamePattern = /(override|fix|hardening|polish|stabilization)/i;
for (const file of fs.readdirSync(srcRoot).filter((name) => name.endsWith(".css") && broadNamePattern.test(name))) {
  assert.ok(transitionalBroadStyleFiles.has(file), `new broad override/fix stylesheet is prohibited; move rules into ui-system.css or the owning feature stylesheet: ${file}`);
}

assert.match(uiSystem, /--ui-bg-panel:/, "ui-system.css must own panel design tokens");
assert.match(uiSystem, /--ui-text-primary:/, "ui-system.css must own typography color tokens");
assert.match(uiSystem, /--ui-focus-ring:/, "ui-system.css must own focus tokens");
assert.match(uiSystem, /\.modal-backdrop/, "ui-system.css must own modal geometry");
assert.match(uiSystem, /\.leaflet-popup-content-wrapper/, "ui-system.css must own Leaflet popup presentation");
assert.match(uiSystem, /\.mapboxgl-popup-content/, "ui-system.css must own Mapbox popup presentation");
assert.match(uiSystem, /\.pdf-modal-wrap/, "ui-system.css must own report preview geometry");

let importantCount = 0;
for (const file of fs.readdirSync(srcRoot).filter((name) => name.endsWith(".css"))) {
  const content = fs.readFileSync(path.join(srcRoot, file), "utf8");
  importantCount += (content.match(/!important/g) || []).length;
}
assert.ok(importantCount <= 2000, `!important usage exceeded the hardening ceiling: ${importantCount}`);

const sidebarController = fs.readFileSync(path.join(srcRoot, "sidebarWorkspaceControllerRuntime.ts"), "utf8");
assert.doesNotMatch(sidebarController, /createElement\("style"\)|style\.textContent/, "runtime controllers must not recreate global stylesheet ownership");

console.log(`UI style ownership smoke passed: ${applicationCssImports.length} application stylesheet imports; ${importantCount} !important declarations; authoritative UI system intact.`);
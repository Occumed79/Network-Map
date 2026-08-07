import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const srcRoot = path.join(root, "src");
const mainPath = path.join(srcRoot, "main.tsx");

function renameOwnedStylesheet(fromName, toName) {
  const fromPath = path.join(srcRoot, fromName);
  const toPath = path.join(srcRoot, toName);
  if (!fs.existsSync(fromPath)) return;
  if (fs.existsSync(toPath)) throw new Error(`${toName} already exists while legacy ${fromName} remains`);
  fs.renameSync(fromPath, toPath);
  let main = fs.readFileSync(mainPath, "utf8");
  const fromImport = `./${fromName}`;
  const toImport = `./${toName}`;
  if (!main.includes(fromImport)) throw new Error(`Legacy stylesheet reference missing from main.tsx: ${fromName}`);
  main = main.replaceAll(fromImport, toImport);
  fs.writeFileSync(mainPath, main);
}

renameOwnedStylesheet("core-app-p2-fixes.css", "core-app-p2.css");
renameOwnedStylesheet("phase-two-control-fix.css", "phase-two-controls.css");

const smokePath = path.join(root, "scripts/ui-style-ownership-smoke.ts");
let smoke = fs.readFileSync(smokePath, "utf8");
smoke = smoke.replace(
  'assert.ok(applicationCssImports.length <= 25, `application CSS import count must not grow above the consolidation baseline of 25; found ${applicationCssImports.length}`);',
  'assert.ok(applicationCssImports.length <= 22, `application CSS import count must not grow above the consolidation baseline of 22; found ${applicationCssImports.length}`);',
);
for (const file of ["professional-overrides.css", "professional-hardening.css", "luminous-shell-fixes.css"]) {
  const retiredAnchor = '  "sidebar-control-fixes.css",\n';
  if (!smoke.includes(`  "${file}",\n`)) {
    smoke = smoke.replace(retiredAnchor, retiredAnchor + `  "${file}",\n`);
  }
  smoke = smoke.replace(`  "${file}",\n`, "", 1);
}
const retiredListAnchor = '  "sidebar-control-fixes.css",\n';
const retiredInsert = [
  '  "professional-overrides.css",',
  '  "professional-hardening.css",',
  '  "luminous-shell-fixes.css",',
  '  "core-app-p2-fixes.css",',
  '  "phase-two-control-fix.css",',
  "",
].join("\n");
if (!smoke.includes('  "phase-two-control-fix.css",')) smoke = smoke.replace(retiredListAnchor, retiredListAnchor + retiredInsert);

const transitionalBlockStart = smoke.indexOf("const transitionalBroadStyleFiles = new Set([");
const transitionalBlockEnd = smoke.indexOf("]);", transitionalBlockStart);
if (transitionalBlockStart < 0 || transitionalBlockEnd < 0) throw new Error("Transitional stylesheet allow-list not found");
let block = smoke.slice(transitionalBlockStart, transitionalBlockEnd + 3);
for (const file of ["professional-overrides.css", "professional-hardening.css", "luminous-shell-fixes.css"]) {
  block = block.replace(`  "${file}",\n`, "");
}
smoke = smoke.slice(0, transitionalBlockStart) + block + smoke.slice(transitionalBlockEnd + 3);
fs.writeFileSync(smokePath, smoke);

const ownershipDocPath = path.join(root, "RUNTIME_OWNERSHIP.md");
let ownership = fs.readFileSync(ownershipDocPath, "utf8");
const styleHeading = "## Stylesheet direction\n";
if (!ownership.includes(styleHeading)) throw new Error("Stylesheet direction section missing");
if (!ownership.includes("Current consolidation progress:")) {
  const consolidationProgress = [
    styleHeading,
    "",
    "Current consolidation progress:",
    "",
    "- `ui-system.css` now owns shared design tokens, global geometry/interactions, dialog/popup presentation, and report-preview behavior.",
    "- Retired superseded layers: `general-ui-hardening.css`, `general-ui-visual-consistency.css`, `pdf-preview-hardening.css`, `modal-popup-fixes.css`, `modal-content-polish.css`, `ui-cascade-stabilization.css`, `sidebar-control-fixes.css`, `professional-overrides.css`, `professional-hardening.css`, and `luminous-shell-fixes.css`.",
    "- Renamed retained feature styles from `core-app-p2-fixes.css` to `core-app-p2.css` and from `phase-two-control-fix.css` to `phase-two-controls.css` without changing their rules.",
    "- The application stylesheet-import ceiling is now 22; CI prevents that count from growing during the consolidation.",
    "",
    "",
  ].join("\n");
  ownership = ownership.replace(styleHeading, consolidationProgress);
}
fs.writeFileSync(ownershipDocPath, ownership);

const inventoryPath = path.join(root, "UI_CONTROL_INVENTORY.md");
let inventory = fs.readFileSync(inventoryPath, "utf8");
inventory = inventory.replace(
  "The second major blocker is stylesheet ownership. `main.tsx` still imports a large compatibility cascade. The CSS consolidation must establish tokens/primitives, move required rules into authoritative component/feature files, delete superseded override files, and reduce `!important` rather than adding another final override layer.",
  "Stylesheet ownership is now materially consolidated: `ui-system.css` owns shared design tokens/global UI/dialog/popup/report behavior, ten superseded override layers have been deleted, retained P2 feature rules live in `core-app-p2.css` and `phase-two-controls.css`, and the app stylesheet-import ceiling is 22. Remaining work is limited to explicitly documented map/sidebar compatibility layers while rendered behavior is preserved.",
);
fs.writeFileSync(inventoryPath, inventory);

console.log("Tightened stylesheet no-growth guard, retired legacy theme layers, and renamed retained P2/Phase Two styles to feature ownership.");

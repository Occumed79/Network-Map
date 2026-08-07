import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
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
// The previous loop deliberately removes any allow-list occurrence first; now add all three to the retired-file list.
const retiredListAnchor = '  "sidebar-control-fixes.css",\n';
const retiredInsert = '  "professional-overrides.css",\n  "professional-hardening.css",\n  "luminous-shell-fixes.css",\n';
if (!smoke.includes(retiredInsert)) smoke = smoke.replace(retiredListAnchor, retiredListAnchor + retiredInsert);

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
  ownership = ownership.replace(
    styleHeading,
    `${styleHeading}\nCurrent consolidation progress:\n\n- `ui-system.css` now owns shared design tokens, global geometry/interactions, dialog/popup presentation, and report-preview behavior.\n- Retired superseded layers: `general-ui-hardening.css`, `general-ui-visual-consistency.css`, `pdf-preview-hardening.css`, `modal-popup-fixes.css`, `modal-content-polish.css`, `ui-cascade-stabilization.css`, `sidebar-control-fixes.css`, `professional-overrides.css`, `professional-hardening.css`, and `luminous-shell-fixes.css`.\n- The application stylesheet-import ceiling is now 22; CI prevents that count from growing during the consolidation.\n\n`,
  );
}
fs.writeFileSync(ownershipDocPath, ownership);

const inventoryPath = path.join(root, "UI_CONTROL_INVENTORY.md");
let inventory = fs.readFileSync(inventoryPath, "utf8");
inventory = inventory.replace(
  "The second major blocker is stylesheet ownership. `main.tsx` still imports a large compatibility cascade. The CSS consolidation must establish tokens/primitives, move required rules into authoritative component/feature files, delete superseded override files, and reduce `!important` rather than adding another final override layer.",
  "Stylesheet ownership is now materially consolidated: `ui-system.css` owns shared design tokens/global UI/dialog/popup/report behavior, ten superseded override layers have been deleted, and the app stylesheet-import ceiling is 22. Remaining work is to reconcile the smaller set of transitional map/modal/sidebar compatibility files into their owning feature or `ui-system.css` without changing rendered behavior.",
);
fs.writeFileSync(inventoryPath, inventory);

console.log("Tightened stylesheet no-growth guard to 22 imports and permanently retired three additional legacy theme layers.");

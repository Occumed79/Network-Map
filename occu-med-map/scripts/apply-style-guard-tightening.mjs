import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const smokePath = path.join(root, "scripts/ui-style-ownership-smoke.ts");
let smoke = fs.readFileSync(smokePath, "utf8");

smoke = smoke.replace(
  /applicationCssImports\.length <= \d+/,
  "applicationCssImports.length <= 22",
).replace(
  /application CSS import count must not grow above the consolidation baseline of \d+/,
  "application CSS import count must not grow above the consolidation baseline of 22",
);

const retiredFiles = [
  "professional-overrides.css",
  "professional-hardening.css",
  "luminous-shell-fixes.css",
];

const retiredListStart = smoke.indexOf("for (const retired of [");
const retiredListEnd = smoke.indexOf("]) {", retiredListStart);
if (retiredListStart < 0 || retiredListEnd < 0) throw new Error("Retired stylesheet guard list not found");
let retiredBlock = smoke.slice(retiredListStart, retiredListEnd);
for (const file of retiredFiles) {
  if (!retiredBlock.includes(`  \"${file}\",`)) retiredBlock += `  \"${file}\",\n`;
}
smoke = smoke.slice(0, retiredListStart) + retiredBlock + smoke.slice(retiredListEnd);

const transitionalBlockStart = smoke.indexOf("const transitionalBroadStyleFiles = new Set([");
const transitionalBlockEnd = smoke.indexOf("]);", transitionalBlockStart);
if (transitionalBlockStart < 0 || transitionalBlockEnd < 0) throw new Error("Transitional stylesheet allow-list not found");
let transitionalBlock = smoke.slice(transitionalBlockStart, transitionalBlockEnd + 3);
for (const file of retiredFiles) {
  transitionalBlock = transitionalBlock.replace(new RegExp(`\\s*\"${file.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\",\\n?`), "\n");
}
smoke = smoke.slice(0, transitionalBlockStart) + transitionalBlock + smoke.slice(transitionalBlockEnd + 3);
fs.writeFileSync(smokePath, smoke);

const ownershipDocPath = path.join(root, "RUNTIME_OWNERSHIP.md");
let ownership = fs.readFileSync(ownershipDocPath, "utf8");
const styleHeading = "## Stylesheet direction\n";
if (!ownership.includes(styleHeading)) throw new Error("Stylesheet direction section missing");
if (!ownership.includes("Current consolidation progress:")) {
  const progress = [
    styleHeading,
    "",
    "Current consolidation progress:",
    "",
    "- `ui-system.css` now owns shared design tokens, global geometry/interactions, dialog/popup presentation, and report-preview behavior.",
    "- Retired superseded layers: `general-ui-hardening.css`, `general-ui-visual-consistency.css`, `pdf-preview-hardening.css`, `modal-popup-fixes.css`, `modal-content-polish.css`, `ui-cascade-stabilization.css`, `sidebar-control-fixes.css`, `professional-overrides.css`, `professional-hardening.css`, and `luminous-shell-fixes.css`.",
    "- The application stylesheet-import ceiling is now 22; CI prevents that count from growing during the consolidation.",
    "",
  ].join("\n");
  ownership = ownership.replace(styleHeading, progress);
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

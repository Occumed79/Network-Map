import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

function source(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const main = source("src/main.tsx");
const uiSystem = source("src/ui-system.css");
const css = uiSystem;
const visualCss = uiSystem;
const pdfCss = uiSystem;
const runtime = source("src/generalUiIntegrityRuntime.ts");
const dialogController = source("src/dialogControllerRuntime.ts");
const productionSmoke = source("scripts/production-ui-smoke.mjs");
const productionPdfSmoke = source("scripts/production-pdf-ui-smoke.mjs");
const packageJson = source("package.json");

assert.match(main, /import "\.\/ui-system\.css";/, "authoritative UI system CSS must load");
assert.doesNotMatch(main, /general-ui-hardening\.css|general-ui-visual-consistency\.css|pdf-preview-hardening\.css/, "retired final override layers must not be imported");
assert.match(main, /import "\.\/dialogControllerRuntime";/, "authoritative dialog controller must load");
assert.match(main, /import "\.\/generalUiIntegrityRuntime";/, "general UI integrity runtime must load");
assert.ok(
  main.indexOf('import "./ui-system.css";') > main.indexOf('import "./sidebar-workspace-final-fixes.css";'),
  "authoritative UI system must load after feature-specific compatibility styling",
);
assert.ok(
  main.indexOf('import "./dialogControllerRuntime";') < main.indexOf('import "./generalUiIntegrityRuntime";'),
  "dialog behavior owner must load before the read-only integrity monitor",
);

assert.match(uiSystem, /--ui-bg-panel:/, "authoritative UI system must define shared design tokens");
assert.match(uiSystem, /--ui-focus-ring:/, "authoritative UI system must define focus tokens");
assert.match(css, /html,\s*body,\s*#root,\s*\.app-wrap\s*\{[^}]*overflow: hidden !important;/s, "document shell must prohibit horizontal overflow");
assert.match(css, /\.command-search-results\s*\{[^}]*max-height:/s, "search suggestions must be viewport constrained");
assert.match(css, /\.modal-backdrop,\s*\.modal-backdrop\.open\s*\{[^}]*position: fixed !important;/s, "modal backdrops must own the viewport");
assert.match(css, /\.modal-box\s*\{[^}]*max-height: min\(88dvh, 900px\) !important;/s, "desktop modals must be height constrained");
assert.match(css, /@media \(max-width: 768px\)[\s\S]*\.modal-box\s*\{[^}]*height: 100dvh !important;/, "mobile modals must use a full-height layout");
assert.match(css, /\.leaflet-popup-content\s*\{[^}]*overflow-y: auto !important;/s, "Leaflet popup content must scroll instead of escaping the viewport");
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, "reduced-motion preferences must be respected");
assert.match(css, /button:focus-visible[\s\S]*outline:/, "interactive controls must retain visible keyboard focus");

assert.match(visualCss, /\.local-pop-card\s*\{[^}]*right:/s, "map information cards must stay on the map side");
assert.match(visualCss, /\.modal-box,\s*\.modal-box \*/, "legacy pale modal text rules must be overridden");
assert.match(visualCss, /background: linear-gradient\(180deg, #091827 0%, #050d16 100%\)/, "dialogs must use the shared navy shell");
assert.match(visualCss, /\.leaflet-popup-content-wrapper,[\s\S]*\.mapboxgl-popup-content/, "both map engines must share popup styling");

assert.match(pdfCss, /\.pdf-modal-wrap\s*\{[^}]*position: fixed !important;/s, "report preview must own the viewport");
assert.match(pdfCss, /\.pdf-toolbar\s*\{[^}]*position: sticky !important;/s, "report actions must remain accessible while scrolling");
assert.match(pdfCss, /\.pdf-modal-wrap iframe\s*\{[^}]*max-width: 100% !important;/s, "report iframe must remain inside the viewport");
assert.match(pdfCss, /@media \(max-width: 768px\)[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/, "mobile report actions must reflow");

assert.doesNotMatch(runtime, /new MutationObserver/, "general UI integrity must not own an observer");
assert.doesNotMatch(runtime, /addEventListener\("keydown"/, "general UI integrity must not own dialog keyboard behavior");
assert.doesNotMatch(runtime, /dispatchEvent\(new Event\("resize"\)\)/, "general UI integrity recovery must not repair layout by forcing resize events");
assert.match(runtime, /registerRuntimeOwner\("general-ui-integrity"/, "general UI integrity must declare diagnostic ownership");
assert.match(runtime, /subscribeToSharedDomObserver/, "general UI integrity must use the shared observer for audit triggers");
assert.match(runtime, /Recovery is now diagnostic-only/, "general UI recovery API must be explicitly diagnostic-only");
assert.doesNotMatch(runtime, /setInterval\s*\(/, "general UI integrity must not poll continuously");
assert.match(runtime, /__NETWORK_MAP_GENERAL_UI__/, "general UI runtime must expose diagnostics");
assert.match(runtime, /document\.documentElement\.dataset\.occumedGeneralUi/, "general UI health must be externally inspectable");
assert.match(runtime, /\.pdf-modal-wrap/, "report preview must participate in dialog integrity checks");
assert.match(runtime, /visible modal missing dialog role/, "integrity monitor must detect missing dialog semantics instead of repairing them");
assert.match(runtime, /document overflow/, "runtime must detect viewport overflow");
assert.match(runtime, /offscreen overlay/, "runtime must detect offscreen overlays");
assert.match(runtime, /removeEventListener\("resize", scheduleAudit\)/, "runtime resize listener must be removed during cleanup");
assert.match(runtime, /beforeunload.*cleanup/s, "runtime listeners must be cleaned up");

assert.match(dialogController, /registerRuntimeOwner\("dialog-controller"/, "dialog behavior must have one explicit owner");
assert.match(dialogController, /subscribeToSharedDomObserver/, "dialog owner must use the shared observer");
assert.doesNotMatch(dialogController, /new MutationObserver/, "dialog owner must not create an independent observer");
assert.match(dialogController, /aria-modal/, "dialog owner must provide dialog semantics");
assert.match(dialogController, /event\.key === "Escape"/, "dialog owner must handle Escape dismissal");
assert.match(dialogController, /event\.key !== "Tab"/, "dialog owner must contain keyboard focus");
assert.match(dialogController, /state\.opener\?\.isConnected/, "dialog owner must restore focus to the opener");
assert.match(dialogController, /__NETWORK_MAP_DIALOG_CONTROLLER__/, "dialog owner must expose diagnostics");

assert.match(productionSmoke, /__NETWORK_MAP_GENERAL_UI__/, "production UI smoke must inspect general UI health");
assert.match(productionSmoke, /modal-backdrop open/, "production UI smoke must exercise modal geometry");
assert.match(productionSmoke, /Escape/, "production UI smoke must exercise dialog keyboard closing");
assert.match(productionSmoke, /width: 390, height: 844/, "production UI smoke must include a mobile viewport");
assert.match(productionSmoke, /smoke-search-results/, "production UI smoke must exercise long search results");

assert.match(productionPdfSmoke, /pdf-modal-wrap smoke-pdf-preview/, "production smoke must exercise report preview geometry");
assert.match(productionPdfSmoke, /desktop report preview/, "report preview must be checked on desktop");
assert.match(productionPdfSmoke, /mobile report preview/, "report preview must be checked on mobile");
assert.match(productionPdfSmoke, /keyboard focus must remain inside preview/, "report preview must trap focus");
assert.match(packageJson, /production-ui-smoke\.mjs && node scripts\/production-pdf-ui-smoke\.mjs/, "post-deployment UI suite must include report preview acceptance");

console.log("General UI hardening smoke test passed.");

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
const css = source("src/general-ui-hardening.css");
const visualCss = source("src/general-ui-visual-consistency.css");
const pdfCss = source("src/pdf-preview-hardening.css");
const runtime = source("src/generalUiIntegrityRuntime.ts");
const dialogController = source("src/dialogControllerRuntime.ts");
const productionSmoke = source("scripts/production-ui-smoke.mjs");
const pdfSmoke = source("scripts/production-pdf-ui-smoke.mjs");
const app = source("src/App.tsx");

assert.match(main, /import "\.\/general-ui-hardening\.css";/, "general UI CSS must load");
assert.match(main, /import "\.\/general-ui-visual-consistency\.css";/, "final visual consistency CSS must load");
assert.match(main, /import "\.\/pdf-preview-hardening\.css";/, "report preview hardening must load");
assert.match(main, /import "\.\/dialogControllerRuntime";/, "authoritative dialog controller must load");
assert.match(main, /import "\.\/generalUiIntegrityRuntime";/, "general UI integrity runtime must load");
assert.ok(
  main.indexOf('import "./general-ui-hardening.css";') < main.indexOf('import "./general-ui-visual-consistency.css";'),
  "visual consistency must load after geometry/interaction hardening",
);
assert.ok(
  main.indexOf('import "./general-ui-visual-consistency.css";') < main.indexOf('import "./pdf-preview-hardening.css";'),
  "report preview hardening must load after general visual consistency",
);
assert.ok(
  main.indexOf('import "./dialogControllerRuntime";') < main.indexOf('import "./generalUiIntegrityRuntime";'),
  "dialog behavior owner must load before read-only integrity diagnostics",
);

assert.match(css, /html,\s*body,\s*#root,\s*\.app-wrap\s*\{[^}]*overflow: hidden !important;/s, "document shell must prohibit horizontal overflow");
assert.match(css, /\.command-search-results[\s\S]*max-width: calc\(100vw - 16px\) !important;/, "search results must remain viewport bounded");
assert.match(css, /button:not\(:disabled\):focus-visible/, "buttons must expose visible keyboard focus");
assert.match(css, /input:focus-visible/, "fields must expose visible keyboard focus");
assert.match(css, /button:disabled[\s\S]*cursor: not-allowed !important;/, "disabled controls must look disabled");
assert.match(css, /\.modal-backdrop[\s\S]*position: fixed !important;/, "modal backdrop must own the viewport");
assert.match(css, /\.modal-box[\s\S]*max-height: calc\(100dvh - 24px\) !important;/, "modal boxes must remain vertically bounded");
assert.match(css, /\.leaflet-popup-content-wrapper/, "Leaflet popups must be hardened");
assert.match(css, /\.mapboxgl-popup-content/, "Mapbox popups must be hardened");
assert.match(css, /@media \(max-width: 768px\)/, "tablet/mobile layout must have an explicit breakpoint");
assert.match(css, /@media \(max-width: 520px\)/, "narrow mobile layout must have an explicit breakpoint");

assert.match(visualCss, /\.modal-box[\s\S]*background:/, "dialogs must share the final navy surface treatment");
assert.match(visualCss, /\.leaflet-popup-content-wrapper[\s\S]*background:/, "Leaflet popup presentation must be finalized");
assert.match(visualCss, /\.mapboxgl-popup-content[\s\S]*background:/, "Mapbox popup presentation must be finalized");

assert.match(pdfCss, /\.pdf-modal-wrap[\s\S]*position: fixed !important;/, "report preview must stay viewport owned");
assert.match(pdfCss, /\.pdf-modal-wrap[\s\S]*height: calc\(100dvh - 24px\) !important;/, "report preview must use dynamic viewport height");
assert.match(pdfCss, /\.pdf-toolbar[\s\S]*flex-wrap: wrap !important;/, "report toolbar must wrap instead of overflowing");
assert.match(pdfCss, /\.pdf-modal-body[\s\S]*overflow: hidden !important;/, "report body must own iframe overflow");
assert.match(pdfCss, /@media \(max-width: 520px\)/, "report preview must include narrow-mobile hardening");

assert.match(runtime, /registerRuntimeOwner\("general-ui-integrity"/, "general UI integrity diagnostics must have one explicit owner");
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
assert.match(dialogController, /restoreOpener\(state\.opener\)/, "dialog owner must restore focus to the opener when a dialog disappears");
assert.match(dialogController, /queueMicrotask\(\(\) => restoreOpener\(opener\)\)/, "Escape dismissal must restore opener focus deterministically after the focused close control is detached");
assert.match(dialogController, /__NETWORK_MAP_DIALOG_CONTROLLER__/, "dialog owner must expose diagnostics");

assert.match(productionSmoke, /__NETWORK_MAP_GENERAL_UI__/, "production UI smoke must inspect general UI health");
assert.match(productionSmoke, /modal-backdrop open/, "production UI smoke must exercise modal geometry");
assert.match(productionSmoke, /provider-explorer-drawer/, "production UI smoke must exercise Provider Explorer geometry");
assert.match(productionSmoke, /setViewportSize\(\{ width: 390, height: 844 \}\)/, "production smoke must cover narrow mobile");
assert.match(pdfSmoke, /pdf-modal-wrap/, "production report smoke must exercise the report preview surface");
assert.match(pdfSmoke, /setViewportSize\(\{ width: 390, height: 844 \}\)/, "report preview smoke must cover narrow mobile");
assert.doesNotMatch(app, new RegExp(["export", "Leadership", "Package"].join("")), "obsolete Leadership export function must be removed from App source");
assert.doesNotMatch(app, new RegExp(["Leadership", " export"].join("")), "obsolete Leadership export control must be removed from App source");

console.log("General UI hardening smoke test passed.");

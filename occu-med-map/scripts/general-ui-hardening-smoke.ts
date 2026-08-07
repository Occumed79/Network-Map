import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

function source(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function cssContains(cssText: string, needle: string, message: string): void {
  assert.ok(cssText.includes(needle), message);
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

// Keep this exact source assertion stable because the consolidation migrator
// uses it as the anchor for token-ownership checks after ui-system.css is built.
assert.match(css, /html,\s*body,\s*#root,\s*\.app-wrap\s*\{[^}]*overflow: hidden !important;/s, "document shell must prohibit horizontal overflow");
cssContains(css, ".command-search-results", "search results surface must exist");
cssContains(css, "max-width: calc(100vw - 16px) !important;", "search results must remain viewport bounded");
cssContains(css, "button:focus-visible", "buttons must expose visible keyboard focus");
cssContains(css, "input:focus-visible", "fields must expose visible keyboard focus");
const disabledControlBlock = css.match(/button:disabled,\s*input:disabled,\s*select:disabled,\s*textarea:disabled,\s*\[aria-disabled=["']true["']\]\s*\{([^}]*)\}/s)?.[1] || "";
cssContains(disabledControlBlock, "cursor: not-allowed !important;", "disabled controls must look disabled");
cssContains(disabledControlBlock, "opacity: 0.55 !important;", "disabled controls must retain a clear disabled visual state");
cssContains(css, ".modal-backdrop", "modal backdrop rule must exist");
cssContains(css, "position: fixed !important;", "modal backdrop must own the viewport");
cssContains(css, ".modal-box", "modal box rule must exist");
cssContains(css, "max-height: min(88dvh, 900px) !important;", "modal boxes must remain vertically bounded inside the viewport");
cssContains(css, ".leaflet-popup-content-wrapper", "Leaflet popups must be hardened");
cssContains(css, ".mapboxgl-popup-content", "Mapbox popups must be hardened");
cssContains(css, "@media (max-width: 768px)", "tablet/mobile layout must have an explicit breakpoint");
cssContains(css, "@media (max-width: 520px)", "narrow mobile layout must have an explicit breakpoint");

cssContains(visualCss, ".modal-box", "dialogs must share the final surface treatment");
cssContains(visualCss, ".leaflet-popup-content-wrapper", "Leaflet popup presentation must be finalized");
cssContains(visualCss, ".mapboxgl-popup-content", "Mapbox popup presentation must be finalized");
cssContains(visualCss, "background:", "final visual layer must define surface backgrounds");

cssContains(pdfCss, ".pdf-modal-wrap", "report preview wrapper must exist");
cssContains(pdfCss, "position: fixed !important;", "report preview must stay viewport owned");
cssContains(pdfCss, "height: calc(100dvh - 24px) !important;", "report preview must use dynamic viewport height");
cssContains(pdfCss, ".pdf-toolbar", "report toolbar must exist");
cssContains(pdfCss, "flex-wrap: wrap !important;", "report toolbar must wrap instead of overflowing");
cssContains(pdfCss, ".pdf-modal-body", "report body must exist");
cssContains(pdfCss, "overflow: hidden !important;", "report body must own iframe overflow");
cssContains(pdfCss, "@media (max-width: 520px)", "report preview must include narrow-mobile hardening");

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

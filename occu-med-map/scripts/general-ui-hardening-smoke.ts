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
const productionSmoke = source("scripts/production-ui-smoke.mjs");

assert.match(main, /import "\.\/general-ui-hardening\.css";/, "general UI CSS must load");
assert.match(main, /import "\.\/general-ui-visual-consistency\.css";/, "final visual consistency CSS must load");
assert.match(main, /import "\.\/pdf-preview-hardening\.css";/, "report preview hardening must load");
assert.match(main, /import "\.\/generalUiIntegrityRuntime";/, "general UI integrity runtime must load");
assert.ok(
  main.indexOf('import "./general-ui-hardening.css";') > main.indexOf('import "./sidebar-workspace-final-fixes.css";'),
  "general UI CSS must load after feature-specific styling",
);
assert.ok(
  main.indexOf('import "./general-ui-visual-consistency.css";') > main.indexOf('import "./general-ui-hardening.css";'),
  "visual consistency CSS must load after the geometry layer",
);
assert.ok(
  main.indexOf('import "./pdf-preview-hardening.css";') > main.indexOf('import "./general-ui-visual-consistency.css";'),
  "report preview hardening must load after shared visual styling",
);

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

assert.equal((runtime.match(/new MutationObserver/g) || []).length, 1, "general UI integrity must use one lifecycle observer");
assert.doesNotMatch(runtime, /setInterval\s*\(/, "general UI integrity must not poll continuously");
assert.match(runtime, /__NETWORK_MAP_GENERAL_UI__/, "general UI runtime must expose diagnostics");
assert.match(runtime, /document\.documentElement\.dataset\.occumedGeneralUi/, "general UI health must be externally inspectable");
assert.match(runtime, /\.pdf-modal-wrap/, "report preview must participate in dialog integrity checks");
assert.match(runtime, /aria-modal/, "visible modals must receive dialog semantics");
assert.match(runtime, /event\.key === "Escape"/, "Escape must close the top visible dialog");
assert.match(runtime, /event\.key !== "Tab"/, "modal keyboard focus must remain contained");
assert.match(runtime, /document overflow/, "runtime must detect viewport overflow");
assert.match(runtime, /offscreen overlay/, "runtime must detect offscreen overlays");
assert.match(runtime, /removeEventListener\("resize", scheduleAudit\)/, "runtime resize listener must be removed during cleanup");
assert.match(runtime, /beforeunload.*cleanup/s, "runtime observers and listeners must be cleaned up");

assert.match(productionSmoke, /__NETWORK_MAP_GENERAL_UI__/, "production UI smoke must inspect general UI health");
assert.match(productionSmoke, /modal-backdrop open/, "production UI smoke must exercise modal geometry");
assert.match(productionSmoke, /Escape/, "production UI smoke must exercise dialog keyboard closing");
assert.match(productionSmoke, /width: 390, height: 844/, "production UI smoke must include a mobile viewport");
assert.match(productionSmoke, /smoke-search-results/, "production UI smoke must exercise long search results");

console.log("General UI hardening smoke test passed.");

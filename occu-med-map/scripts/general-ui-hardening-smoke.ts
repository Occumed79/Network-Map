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
const runtime = source("src/generalUiIntegrityRuntime.ts");
const productionSmoke = source("scripts/production-ui-smoke.mjs");

assert.match(main, /import "\.\/general-ui-hardening\.css";/, "general UI CSS must load last");
assert.match(main, /import "\.\/generalUiIntegrityRuntime";/, "general UI integrity runtime must load");
assert.ok(
  main.indexOf('import "./general-ui-hardening.css";') > main.indexOf('import "./sidebar-workspace-final-fixes.css";'),
  "general UI CSS must load after feature-specific styling",
);

assert.match(css, /html,\s*body,\s*#root,\s*\.app-wrap\s*\{[^}]*overflow: hidden !important;/s, "document shell must prohibit horizontal overflow");
assert.match(css, /\.command-search-results\s*\{[^}]*max-height:/s, "search suggestions must be viewport constrained");
assert.match(css, /\.modal-backdrop,\s*\.modal-backdrop\.open\s*\{[^}]*position: fixed !important;/s, "modal backdrops must own the viewport");
assert.match(css, /\.modal-box\s*\{[^}]*max-height: min\(88dvh, 900px\) !important;/s, "desktop modals must be height constrained");
assert.match(css, /@media \(max-width: 768px\)[\s\S]*\.modal-box\s*\{[^}]*height: 100dvh !important;/, "mobile modals must use a full-height layout");
assert.match(css, /\.leaflet-popup-content\s*\{[^}]*overflow-y: auto !important;/s, "Leaflet popup content must scroll instead of escaping the viewport");
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, "reduced-motion preferences must be respected");
assert.match(css, /button:focus-visible[\s\S]*outline:/, "interactive controls must retain visible keyboard focus");

assert.equal((runtime.match(/new MutationObserver/g) || []).length, 1, "general UI integrity must use one lifecycle observer");
assert.doesNotMatch(runtime, /setInterval\s*\(/, "general UI integrity must not poll continuously");
assert.match(runtime, /__NETWORK_MAP_GENERAL_UI__/, "general UI runtime must expose diagnostics");
assert.match(runtime, /document\.documentElement\.dataset\.occumedGeneralUi/, "general UI health must be externally inspectable");
assert.match(runtime, /aria-modal/, "visible modals must receive dialog semantics");
assert.match(runtime, /event\.key === "Escape"/, "Escape must close the top visible dialog");
assert.match(runtime, /event\.key !== "Tab"/, "modal keyboard focus must remain contained");
assert.match(runtime, /document overflow/, "runtime must detect viewport overflow");
assert.match(runtime, /offscreen overlay/, "runtime must detect offscreen overlays");
assert.match(runtime, /beforeunload.*cleanup/s, "runtime observers and listeners must be cleaned up");

assert.match(productionSmoke, /__NETWORK_MAP_GENERAL_UI__/, "production UI smoke must inspect general UI health");
assert.match(productionSmoke, /modal-backdrop open/, "production UI smoke must exercise modal geometry");
assert.match(productionSmoke, /Escape/, "production UI smoke must exercise dialog keyboard closing");

console.log("General UI hardening smoke test passed.");

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const frontendAssets = path.join(root, "occu-med-map", "dist", "public", "assets");
const apiBundle = path.join(root, "api-server", "dist", "index.mjs");

function bytes(file) { return fs.statSync(file).size; }
function kb(value) { return Math.round(value / 1024); }

assert.ok(fs.existsSync(frontendAssets), "frontend build assets are missing");
const assets = fs.readdirSync(frontendAssets).map((name) => ({ name, path: path.join(frontendAssets, name) })).filter((item) => fs.statSync(item.path).isFile());
const js = assets.filter((item) => item.name.endsWith(".js"));
const css = assets.filter((item) => item.name.endsWith(".css"));
const totalJs = js.reduce((sum, item) => sum + bytes(item.path), 0);
const totalCss = css.reduce((sum, item) => sum + bytes(item.path), 0);
const largestJs = Math.max(0, ...js.map((item) => bytes(item.path)));
const largestCss = Math.max(0, ...css.map((item) => bytes(item.path)));
const apiBytes = fs.existsSync(apiBundle) ? bytes(apiBundle) : 0;

const budgets = {
  totalJs: 8 * 1024 * 1024,
  largestJs: 4 * 1024 * 1024,
  totalCss: 2 * 1024 * 1024,
  largestCss: 1500 * 1024,
  api: 8 * 1024 * 1024,
};

assert.ok(totalJs <= budgets.totalJs, `frontend JS budget exceeded: ${kb(totalJs)} KB > ${kb(budgets.totalJs)} KB`);
assert.ok(largestJs <= budgets.largestJs, `largest frontend JS chunk budget exceeded: ${kb(largestJs)} KB > ${kb(budgets.largestJs)} KB`);
assert.ok(totalCss <= budgets.totalCss, `frontend CSS budget exceeded: ${kb(totalCss)} KB > ${kb(budgets.totalCss)} KB`);
assert.ok(largestCss <= budgets.largestCss, `largest frontend CSS budget exceeded: ${kb(largestCss)} KB > ${kb(budgets.largestCss)} KB`);
assert.ok(apiBytes <= budgets.api, `API bundle budget exceeded: ${kb(apiBytes)} KB > ${kb(budgets.api)} KB`);
console.log(`Bundle budgets passed: JS ${kb(totalJs)} KB (largest ${kb(largestJs)}), CSS ${kb(totalCss)} KB (largest ${kb(largestCss)}), API ${kb(apiBytes)} KB.`);

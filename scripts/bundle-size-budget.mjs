import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const frontendDir = path.join(root, "occu-med-map/dist/public");
const apiDir = path.join(root, "api-server/dist");

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const frontendFiles = walk(frontendDir);
const jsFiles = frontendFiles.filter((file) => /\.m?js$/i.test(file));
const cssFiles = frontendFiles.filter((file) => /\.css$/i.test(file));
const apiFiles = walk(apiDir);

const size = (files) => files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const largestJs = jsFiles.reduce((largest, file) => Math.max(largest, fs.statSync(file).size), 0);
const budgets = {
  frontendJsTotal: 8 * 1024 * 1024,
  frontendLargestChunk: 4 * 1024 * 1024,
  frontendCssTotal: 2 * 1024 * 1024,
  apiBundleTotal: 8 * 1024 * 1024,
};
const actual = {
  frontendJsTotal: size(jsFiles),
  frontendLargestChunk: largestJs,
  frontendCssTotal: size(cssFiles),
  apiBundleTotal: size(apiFiles),
};

console.log(JSON.stringify({ actual, budgets }, null, 2));
for (const [name, budget] of Object.entries(budgets)) {
  const value = actual[name];
  if (value > budget) {
    console.error(`${name} exceeds budget: ${value} > ${budget}`);
    process.exitCode = 1;
  }
}

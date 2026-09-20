import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const srcRoot = path.join(projectRoot, "src");

function filesUnder(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(absolute));
    else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name)) out.push(absolute);
  }
  return out;
}

const sourceFiles = filesUnder(srcRoot);
const source = sourceFiles.map((file) => ({
  file: path.relative(projectRoot, file).replaceAll(path.sep, "/"),
  text: readFileSync(file, "utf8"),
}));

for (const { file, text } of source) {
  assert.doesNotMatch(text, /from\s+["']leaflet["']|import\s+["']leaflet["']|\bL\.(?:marker|circleMarker|map|geoJSON|layerGroup)\b/,
    `${file}: provider/map production code must not use Leaflet`);
  assert.doesNotMatch(text, /new\s+mapboxgl\.Marker\s*\(/,
    `${file}: provider points must use GeoJSON sources/layers, not DOM-backed Mapbox Marker objects`);
}

const dataset = readFileSync(path.join(srcRoot, "providerDatasetNativeMapRuntime.ts"), "utf8");
const live = readFileSync(path.join(srcRoot, "liveFinderNativeMapRuntime.ts"), "utf8");
const explorer = readFileSync(path.join(srcRoot, "providerExplorerNativeMapRuntime.ts"), "utf8");
const location = readFileSync(path.join(srcRoot, "providerLocationFinderRuntime.ts"), "utf8");

for (const [name, text] of [
  ["providerDatasetNativeMapRuntime", dataset],
  ["liveFinderNativeMapRuntime", live],
  ["providerExplorerNativeMapRuntime", explorer],
  ["providerLocationFinderRuntime", location],
] as const) {
  assert.match(text, /map\.addSource\(|addSource\(/, `${name} must create Mapbox GeoJSON sources`);
  assert.match(text, /map\.addLayer\(|addLayer\(/, `${name} must render through Mapbox style layers`);
}

assert.match(dataset, /type:\s*["']geojson["']/, "stored/uploaded provider channels must use GeoJSON sources");
assert.match(live, /type:\s*["']geojson["']/, "live finder provider results must use GeoJSON sources");
assert.match(explorer, /type:\s*["']geojson["']/, "Provider Explorer provider results must use GeoJSON sources");
assert.match(location, /type:\s*["']geojson["']/, "Provider Location Finder results must use GeoJSON sources");

console.log("Provider rendering authority gate passed: provider points are Mapbox-native GeoJSON layers.");

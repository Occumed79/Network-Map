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

const nativeOwner = readFileSync(path.join(srcRoot, "providerPointNativeRuntime.ts"), "utf8");
const dataset = readFileSync(path.join(srcRoot, "providerDatasetNativeMapRuntime.ts"), "utf8");
const live = readFileSync(path.join(srcRoot, "liveFinderNativeMapRuntime.ts"), "utf8");
const explorer = readFileSync(path.join(srcRoot, "providerExplorerNativeMapRuntime.ts"), "utf8");
const location = readFileSync(path.join(srcRoot, "providerLocationFinderRuntime.ts"), "utf8");

assert.match(nativeOwner, /map\.addSource\(/, "authoritative provider point owner must create Mapbox GeoJSON sources");
assert.match(nativeOwner, /map\.addLayer\(/, "authoritative provider point owner must create Mapbox circle layers");
assert.match(nativeOwner, /type:\s*["']geojson["']/, "authoritative provider point owner must use GeoJSON sources");
assert.match(nativeOwner, /type:\s*["']circle["']/, "authoritative provider point owner must use Mapbox-native circle layers");

for (const [name, text] of [
  ["providerDatasetNativeMapRuntime", dataset],
  ["liveFinderNativeMapRuntime", live],
  ["providerExplorerNativeMapRuntime", explorer],
  ["providerLocationFinderRuntime", location],
] as const) {
  assert.match(text, /ensureProviderPointLayer/, `${name} must delegate provider point rendering to providerPointNativeRuntime`);
}

assert.match(dataset, /buildProviderPointFeature/, "stored/uploaded provider records must use the canonical provider point feature builder");
assert.match(live, /buildProviderPointFeature/, "live finder provider results must use the canonical provider point feature builder");
assert.match(explorer, /buildProviderPointFeature/, "Provider Explorer provider results must use the canonical provider point feature builder");
assert.match(location, /buildProviderPointFeature/, "Provider Location Finder results must use the canonical provider point feature builder");

console.log("Provider rendering authority gate passed: one Mapbox-native provider point owner is authoritative.");

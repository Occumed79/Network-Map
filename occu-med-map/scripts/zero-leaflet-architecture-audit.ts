import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const srcRoot = path.join(projectRoot, "src");

type Finding = { file: string; line: number; kind: string; text: string };

function filesUnder(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(absolute));
    else if (/\.(?:ts|tsx|js|jsx|d\.ts)$/.test(entry.name)) out.push(absolute);
  }
  return out;
}

const findings: Finding[] = [];
const rules: Array<[string, RegExp]> = [
  ["leaflet-import", /from\s+["']leaflet["']|import\s+["']leaflet["']/],
  ["leaflet-lifecycle", /leafletMapLifecycleRuntime|registerLeafletMapInitializer|getTrackedLeafletMaps|__NETWORK_MAP_LEAFLET_LIFECYCLE__/],
  ["leaflet-controller", /canonicalMap\s*:\s*L\.Map|syncMapboxCameraFromLeaflet|syncLeafletCameraFromMapbox|lastEngineDrivenLeafletMove/],
  ["leaflet-symbol", /\bL\.(?:map|Map|Layer|LayerGroup|FeatureGroup|Marker|CircleMarker|Circle|Polyline|Polygon|GeoJSON|LatLng|LatLngBounds|Popup|Tooltip|Control|GridLayer|TileLayer|latLng|latLngBounds|layerGroup|featureGroup|marker|circleMarker|circle|polyline|polygon|geoJSON|popup|tooltip|control|tileLayer)\b/],
  ["leaflet-name", /leaflet/i],
];

for (const absolute of filesUnder(srcRoot)) {
  const relative = path.relative(projectRoot, absolute).replaceAll(path.sep, "/");
  const lines = readFileSync(absolute, "utf8").split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    for (const [kind, pattern] of rules) {
      if (pattern.test(lines[index])) {
        findings.push({ file: relative, line: index + 1, kind, text: lines[index].trim().slice(0, 220) });
      }
    }
  }
}

const byKind = new Map<string, number>();
for (const finding of findings) byKind.set(finding.kind, (byKind.get(finding.kind) || 0) + 1);

console.log("Zero-Leaflet architecture audit");
console.log(`Production source findings: ${findings.length}`);
for (const [kind, count] of [...byKind.entries()].sort()) console.log(`  ${kind}: ${count}`);
for (const finding of findings) console.log(`${finding.kind}\t${finding.file}:${finding.line}\t${finding.text}`);

// This starts as an inventory gate while the migration is in progress. The final
// migration commit flips this to a hard failure if any production finding remains.
process.exitCode = 0;

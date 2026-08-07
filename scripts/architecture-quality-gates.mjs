import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const sourceRoots = ["api-server/src", "occu-med-map/src"];
const extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs"];

function walk(relativeDir) {
  const absolute = path.join(repoRoot, relativeDir);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(relativeDir.replaceAll("\\", "/"), entry.name);
    if (entry.isDirectory()) return walk(relative);
    return extensions.includes(path.extname(entry.name)) ? [relative] : [];
  });
}

const files = sourceRoots.flatMap(walk).sort();
const fileSet = new Set(files);
const graph = new Map(files.map((file) => [file, new Set()]));
const unresolvedLocal = [];

function resolveLocal(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), specifier));
  const candidates = [
    base,
    ...extensions.map((extension) => `${base}${extension}`),
    ...extensions.map((extension) => path.posix.join(base, `index${extension}`)),
  ];
  return candidates.find((candidate) => fileSet.has(candidate)) || null;
}

const importPatterns = [
  /\b(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g,
  /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  /new\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)/g,
];

for (const file of files) {
  const source = fs.readFileSync(path.join(repoRoot, file), "utf8");
  for (const pattern of importPatterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (!specifier.startsWith(".")) continue;
      const resolved = resolveLocal(file, specifier);
      if (resolved) graph.get(file).add(resolved);
      else unresolvedLocal.push({ file, specifier });
    }
  }
}

if (unresolvedLocal.length) {
  console.error("Unresolved local imports:", unresolvedLocal.slice(0, 30));
  process.exitCode = 1;
}

const cycles = [];
const visiting = new Set();
const visited = new Set();
const stack = [];
function visit(node) {
  if (visiting.has(node)) {
    const start = stack.indexOf(node);
    const cycle = [...stack.slice(start), node];
    const canonical = cycle.slice(0, -1).sort().join("|");
    if (!cycles.some((item) => item.canonical === canonical)) cycles.push({ canonical, cycle });
    return;
  }
  if (visited.has(node)) return;
  visiting.add(node);
  stack.push(node);
  for (const target of graph.get(node) || []) visit(target);
  stack.pop();
  visiting.delete(node);
  visited.add(node);
}
for (const file of files) visit(file);

const entrypoints = [
  "api-server/src/index.ts",
  "occu-med-map/src/main.tsx",
].filter((file) => fileSet.has(file));
const reachable = new Set();
function mark(node) {
  if (reachable.has(node)) return;
  reachable.add(node);
  for (const target of graph.get(node) || []) mark(target);
}
entrypoints.forEach(mark);

const orphanExclusions = [
  /\/components\/ui\//,
  /\/types\//,
  /\.d\.ts$/,
  /\/scripts\//,
];
const orphans = files.filter((file) => !reachable.has(file) && !orphanExclusions.some((pattern) => pattern.test(file)));
const suspiciousDead = orphans.filter((file) => /(?:old|obsolete|unused|dead|backup|bak|legacy)/i.test(path.basename(file)));

console.log(JSON.stringify({ files: files.length, edges: [...graph.values()].reduce((sum, edges) => sum + edges.size, 0), cycles: cycles.map((item) => item.cycle), orphanCount: orphans.length, suspiciousDead }, null, 2));

if (cycles.length > 0) {
  console.error(`Circular dependency gate failed with ${cycles.length} cycle(s).`);
  process.exitCode = 1;
}
if (suspiciousDead.length > 0) {
  console.error("Suspicious orphan/dead source files must be removed or explicitly renamed/re-integrated:", suspiciousDead);
  process.exitCode = 1;
}
if (orphans.length > 75) {
  console.error(`Dead-code reachability debt exceeded ceiling: ${orphans.length} > 75`);
  process.exitCode = 1;
}

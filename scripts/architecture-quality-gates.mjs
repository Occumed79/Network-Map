import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoots = [
  path.join(root, "occu-med-map", "src"),
  path.join(root, "api-server", "src"),
  path.join(root, "lib", "db", "src"),
  path.join(root, "lib", "api-zod", "src"),
  path.join(root, "lib", "api-client-react", "src"),
];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const allowUnreachable = new Set([
  "occu-med-map/src/vite-env.d.ts",
  "api-server/src/types/express.d.ts",
]);

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return extensions.has(path.extname(entry.name)) || entry.name.endsWith(".d.ts") ? [full] : [];
  });
}

const files = sourceRoots.flatMap(walk).map((file) => path.resolve(file));
const fileSet = new Set(files);
const graph = new Map();
const importPattern = /(?:import\s+(?:[^"'`]*?\s+from\s+)?|export\s+[^"'`]*?\s+from\s+|import\()\s*["'`]([^"'`]+)["'`]/g;

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  const raw = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    raw,
    ...[".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].map((extension) => `${raw}${extension}`),
    ...[".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].map((extension) => path.join(raw, `index${extension}`)),
  ];
  return candidates.find((candidate) => fileSet.has(candidate)) || null;
}

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const dependencies = [];
  for (const match of source.matchAll(importPattern)) {
    const resolved = resolveImport(file, match[1]);
    if (resolved) dependencies.push(resolved);
  }
  graph.set(file, dependencies);
}

const cycles = [];
const visiting = new Set();
const visited = new Set();
function visit(file, stack) {
  if (visiting.has(file)) {
    const index = stack.indexOf(file);
    cycles.push([...stack.slice(index), file].map((item) => path.relative(root, item)).join(" -> "));
    return;
  }
  if (visited.has(file)) return;
  visiting.add(file);
  stack.push(file);
  for (const dependency of graph.get(file) || []) visit(dependency, stack);
  stack.pop();
  visiting.delete(file);
  visited.add(file);
}
for (const file of files) visit(file, []);
assert.deepEqual([...new Set(cycles)], [], `circular source dependencies detected:\n${[...new Set(cycles)].join("\n")}`);

const roots = [
  path.join(root, "occu-med-map", "src", "main.tsx"),
  path.join(root, "api-server", "src", "index.ts"),
  path.join(root, "lib", "db", "src", "index.ts"),
  path.join(root, "lib", "api-zod", "src", "index.ts"),
  path.join(root, "lib", "api-client-react", "src", "index.ts"),
].filter((file) => fileSet.has(file));
const reachable = new Set();
function markReachable(file) {
  if (reachable.has(file)) return;
  reachable.add(file);
  for (const dependency of graph.get(file) || []) markReachable(dependency);
}
roots.forEach(markReachable);
const unreachable = files
  .map((file) => path.relative(root, file).replaceAll(path.sep, "/"))
  .filter((file) => !reachable.has(path.resolve(root, file)) && !allowUnreachable.has(file));
assert.deepEqual(unreachable, [], `unreachable source files require removal or explicit justification:\n${unreachable.join("\n")}`);

const forbiddenFiles = [
  "occu-med-map/src/features/liveFinder/liveFinderSearch.ts",
  "api-server/src/routes/providerSearch.ts",
];
for (const relative of forbiddenFiles) assert.equal(fs.existsSync(path.join(root, relative)), false, `retired architecture file returned: ${relative}`);

console.log(`Architecture quality gate passed across ${files.length} source files.`);

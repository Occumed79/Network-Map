import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const sourceRoots = ["api-server/src", "occu-med-map/src", "lib/db/src", "lib/api-zod/src", "lib/api-client-react/src"];
const sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts", ".cts"];
const assetExtensions = new Set([".css", ".scss", ".sass", ".less", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".json"]);

function walk(relativeDir) {
  const absolute = path.join(repoRoot, relativeDir);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(relativeDir.replaceAll("\\", "/"), entry.name);
    if (entry.isDirectory()) return walk(relative);
    return sourceExtensions.includes(path.extname(entry.name)) || entry.name.endsWith(".d.ts") ? [relative] : [];
  });
}

const files = sourceRoots.flatMap(walk).sort();
const fileSet = new Set(files);
const graph = new Map(files.map((file) => [file, new Set()]));
const unresolvedLocal = [];

function resolveLocalSource(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), specifier));
  const explicitExtension = path.posix.extname(base);
  const hasKnownSourceExtension = sourceExtensions.includes(explicitExtension);
  const candidates = [base];

  if (explicitExtension === ".js" || explicitExtension === ".jsx" || explicitExtension === ".mjs" || explicitExtension === ".cjs") {
    const withoutRuntimeExtension = base.slice(0, -explicitExtension.length);
    candidates.push(...sourceExtensions.map((extension) => `${withoutRuntimeExtension}${extension}`));
    candidates.push(...sourceExtensions.map((extension) => path.posix.join(withoutRuntimeExtension, `index${extension}`)));
  }

  // A dot in a module basename (for example api.schemas) is not necessarily a
  // file extension. If the suffix is not a known source extension, still try
  // the normal TypeScript/JavaScript extensions.
  if (!explicitExtension || !hasKnownSourceExtension) {
    candidates.push(...sourceExtensions.map((extension) => `${base}${extension}`));
    candidates.push(...sourceExtensions.map((extension) => path.posix.join(base, `index${extension}`)));
  }

  return candidates.find((candidate) => fileSet.has(candidate)) || null;
}

function localAssetExists(fromFile, specifier) {
  const extension = path.posix.extname(specifier).toLowerCase();
  if (!assetExtensions.has(extension)) return false;
  const absolute = path.resolve(repoRoot, path.posix.dirname(fromFile), specifier);
  return fs.existsSync(absolute);
}

const importPatterns = [
  /\b(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g,
  /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  /new\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)/g,
];

function runtimeRelevantSource(source) {
  return source
    // Remove comments before import scanning so commented examples never become
    // fake dependency edges.
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    // Type-only imports/exports are erased by TypeScript and cannot create
    // executable runtime cycles.
    .replace(/\bimport\s+type\b[\s\S]*?\bfrom\s+["'][^"']+["']\s*;?/g, "")
    .replace(/\bexport\s+type\b[\s\S]*?\bfrom\s+["'][^"']+["']\s*;?/g, "");
}

for (const file of files) {
  const source = runtimeRelevantSource(fs.readFileSync(path.join(repoRoot, file), "utf8"));
  for (const pattern of importPatterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (!specifier.startsWith(".")) continue;
      if (localAssetExists(file, specifier)) continue;
      const resolved = resolveLocalSource(file, specifier);
      if (resolved) graph.get(file).add(resolved);
      else unresolvedLocal.push({ file, specifier });
    }
  }
}

if (unresolvedLocal.length) {
  console.error("Unresolved local source imports:", unresolvedLocal.slice(0, 30));
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
  "lib/db/src/index.ts",
  "lib/api-zod/src/index.ts",
  "lib/api-client-react/src/index.ts",
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
  /\.worker\.(?:ts|tsx|js|jsx)$/,
  /\/jobs\//,
];
const orphans = files.filter((file) => !reachable.has(file) && !orphanExclusions.some((pattern) => pattern.test(file)));
const suspiciousDead = orphans.filter((file) => /(?:old|obsolete|unused|dead|backup|bak)/i.test(path.basename(file)));

const forbiddenFiles = [
  "occu-med-map/src/features/liveFinder/liveFinderSearch.ts",
  "api-server/src/routes/providerSearch.ts",
];
const returnedRetiredFiles = forbiddenFiles.filter((file) => fs.existsSync(path.join(repoRoot, file)));

console.log(JSON.stringify({
  files: files.length,
  edges: [...graph.values()].reduce((sum, edges) => sum + edges.size, 0),
  runtimeCycles: cycles.map((item) => item.cycle),
  unresolvedLocalCount: unresolvedLocal.length,
  orphanCount: orphans.length,
  orphanSample: orphans.slice(0, 50),
  suspiciousDead,
  returnedRetiredFiles,
}, null, 2));

if (unresolvedLocal.length > 0) {
  console.error(`Import resolution gate failed with ${unresolvedLocal.length} unresolved local source import(s).`);
  process.exitCode = 1;
}
if (cycles.length > 0) {
  console.error(`Circular dependency gate failed with ${cycles.length} executable runtime cycle(s).`);
  process.exitCode = 1;
}
if (suspiciousDead.length > 0) {
  console.error("Suspicious orphan/dead source files must be removed, renamed, or explicitly re-integrated:", suspiciousDead);
  process.exitCode = 1;
}
if (returnedRetiredFiles.length > 0) {
  console.error("Retired architecture files have returned:", returnedRetiredFiles);
  process.exitCode = 1;
}
if (orphans.length > 50) {
  console.error(`Dead-code reachability debt exceeded ceiling: ${orphans.length} > 50`);
  process.exitCode = 1;
}

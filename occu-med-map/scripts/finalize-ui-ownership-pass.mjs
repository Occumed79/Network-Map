import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());

function updateFile(relative, mutate) {
  const absolute = path.join(root, relative);
  const before = fs.readFileSync(absolute, "utf8");
  const after = mutate(before);
  if (after === before) throw new Error(`No change produced for ${relative}`);
  fs.writeFileSync(absolute, after);
}

function normalizeTextFile(relative) {
  const absolute = path.join(root, relative);
  const before = fs.readFileSync(absolute, "utf8");
  const after = `${before.replace(/[ \t]+$/gm, "").replace(/\n+$/g, "")}\n`;
  fs.writeFileSync(absolute, after);
}

updateFile("scripts/ui-style-ownership-smoke.ts", (source) => {
  let next = source.replace(
    "application CSS import count must not grow above the consolidation baseline of 22",
    "application CSS import count must not grow above the consolidation baseline of 21",
  ).replace(
    "applicationCssImports.length <= 22",
    "applicationCssImports.length <= 21",
  );
  const retiredAnchor = '  "luminous-shell-fixes.css",\n';
  if (!next.includes('  "modal-command-polish.css",\n')) {
    if (!next.includes(retiredAnchor)) throw new Error("Retired stylesheet list anchor missing");
    next = next.replace(retiredAnchor, retiredAnchor + '  "modal-command-polish.css",\n');
  }
  const transitionalLine = '  "modal-command-polish.css",\n';
  const blockStart = next.indexOf("const transitionalBroadStyleFiles = new Set([");
  const blockEnd = next.indexOf("]);", blockStart);
  if (blockStart >= 0 && blockEnd > blockStart) {
    const beforeBlock = next.slice(0, blockStart);
    let block = next.slice(blockStart, blockEnd + 3);
    const afterBlock = next.slice(blockEnd + 3);
    block = block.replace(transitionalLine, "");
    next = beforeBlock + block + afterBlock;
  }
  return next;
});

updateFile("RUNTIME_OWNERSHIP.md", (source) => {
  let next = source.replace(
    "The application stylesheet-import ceiling is now 22; CI prevents that count from growing during the consolidation.",
    "The application stylesheet-import ceiling is now 21; CI prevents that count from growing during the consolidation.",
  );
  if (next.includes("`modal-command-polish.css`")) return next;
  next = next.replace(
    "`professional-hardening.css`, and `luminous-shell-fixes.css`.",
    "`professional-hardening.css`, `luminous-shell-fixes.css`, and `modal-command-polish.css`.",
  );
  return next;
});

updateFile("UI_CONTROL_INVENTORY.md", (source) => source.replace(
  "the app stylesheet-import ceiling is 22.",
  "the app stylesheet-import ceiling is 21; the superseded modal-command polish layer is also retired.",
));

const requiredAbsent = [
  "src/modal-command-polish.css",
  "src/general-ui-hardening.css",
  "src/general-ui-visual-consistency.css",
  "src/pdf-preview-hardening.css",
  "src/modal-popup-fixes.css",
  "src/modal-content-polish.css",
  "src/ui-cascade-stabilization.css",
  "src/sidebar-control-fixes.css",
  "src/professional-overrides.css",
  "src/professional-hardening.css",
  "src/luminous-shell-fixes.css",
  "src/liveFinderControlCleanupRuntime.ts",
  "src/unifiedProviderToolsRuntime.ts",
];
for (const relative of requiredAbsent) {
  if (fs.existsSync(path.join(root, relative))) throw new Error(`Retired file reappeared: ${relative}`);
}

const main = fs.readFileSync(path.join(root, "src/main.tsx"), "utf8");
const applicationCssImports = [...main.matchAll(/import\s+["']\.\/([^"']+\.css)["'];/g)].map((match) => match[1]);
if (applicationCssImports.length > 21) {
  throw new Error(`Application stylesheet import ceiling exceeded: ${applicationCssImports.length}`);
}

const forbidden = [
  ["export", "Leadership", "Package"].join(""),
  ["Leadership", " export"].join(""),
  ["leadership", "_package_"].join(""),
  ["liveFinder", "ControlCleanupRuntime"].join(""),
  ["unifiedProvider", "ToolsRuntime"].join(""),
];
for (const relative of ["src/App.tsx", "src/main.tsx", "scripts/runtime-ownership-smoke.ts"]) {
  const content = fs.readFileSync(path.join(root, relative), "utf8");
  for (const token of forbidden) {
    if (content.includes(token)) throw new Error(`Retired symbol ${token} reappeared in ${relative}`);
  }
}

// Deterministic migrations may leave whitespace-only JSX lines or extra EOF
// blank lines. Normalize only the generated final source files so git diff --check
// is a real correctness gate rather than a formatting trap.
normalizeTextFile("src/App.tsx");
normalizeTextFile("src/ui-system.css");

console.log(`UI ownership finalization applied. Application CSS imports: ${applicationCssImports.length}.`);

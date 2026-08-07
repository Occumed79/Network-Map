import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const src = path.join(root, "src");
const mainPath = path.join(src, "main.tsx");
const smokePath = path.join(root, "scripts/general-ui-hardening-smoke.ts");

let main = fs.readFileSync(mainPath, "utf8");
const oldImports = 'import "./general-ui-hardening.css";\nimport "./general-ui-visual-consistency.css";\nimport "./pdf-preview-hardening.css";\n';
if (!main.includes(oldImports)) throw new Error("Expected final UI stylesheet import block is missing");
main = main.replace(oldImports, 'import "./ui-system.css";\n');
fs.writeFileSync(mainPath, main);

const migrated = [
  "general-ui-hardening.css",
  "general-ui-visual-consistency.css",
  "pdf-preview-hardening.css",
];
const tokenHeader = `/* Network Map authoritative UI system: tokens -> geometry/interactions -> visual consistency -> report preview. */
:root {
  --ui-bg-canvas: #020814;
  --ui-bg-shell: #050d16;
  --ui-bg-panel: #091827;
  --ui-bg-card: rgba(9, 24, 39, 0.92);
  --ui-border-subtle: rgba(148, 163, 184, 0.22);
  --ui-border-strong: rgba(148, 163, 184, 0.38);
  --ui-text-primary: #e6edf6;
  --ui-text-secondary: #9fb0c4;
  --ui-text-muted: #6f849b;
  --ui-accent: #1d4ed8;
  --ui-focus-ring: rgba(96, 165, 250, 0.38);
  --ui-radius-sm: 6px;
  --ui-radius-md: 10px;
  --ui-radius-lg: 14px;
  --ui-font-sans: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --ui-font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}

`;
const parts = [tokenHeader];
for (const file of migrated) {
  const absolute = path.join(src, file);
  if (!fs.existsSync(absolute)) throw new Error(`Expected source stylesheet is missing: ${file}`);
  parts.push(`/* migrated from ${file} */\n`);
  parts.push(fs.readFileSync(absolute, "utf8"));
  parts.push("\n");
}
fs.writeFileSync(path.join(src, "ui-system.css"), parts.join(""));
for (const file of migrated) fs.unlinkSync(path.join(src, file));

let smoke = fs.readFileSync(smokePath, "utf8");
smoke = smoke.replace(
  'const css = source("src/general-ui-hardening.css");\nconst visualCss = source("src/general-ui-visual-consistency.css");\nconst pdfCss = source("src/pdf-preview-hardening.css");\n',
  'const uiSystem = source("src/ui-system.css");\nconst css = uiSystem;\nconst visualCss = uiSystem;\nconst pdfCss = uiSystem;\n',
);
smoke = smoke.replace(
  'assert.match(main, /import "\\.\\/general-ui-hardening\\.css";/, "general UI CSS must load");\nassert.match(main, /import "\\.\\/general-ui-visual-consistency\\.css";/, "final visual consistency CSS must load");\nassert.match(main, /import "\\.\\/pdf-preview-hardening\\.css";/, "report preview hardening must load");\n',
  'assert.match(main, /import "\\.\\/ui-system\\.css";/, "authoritative UI system CSS must load");\nassert.doesNotMatch(main, /general-ui-hardening\\.css|general-ui-visual-consistency\\.css|pdf-preview-hardening\\.css/, "retired final override layers must not be imported");\n',
);
const orderStart = smoke.indexOf('assert.ok(\n  main.indexOf(\'import "./general-ui-hardening.css";\')');
const orderEnd = smoke.indexOf('assert.ok(\n  main.indexOf(\'import "./dialogControllerRuntime";\')', orderStart);
if (orderStart < 0 || orderEnd <= orderStart) throw new Error("Expected UI stylesheet order assertions were not found");
smoke = smoke.slice(0, orderStart)
  + `assert.ok(\n  main.indexOf('import "./ui-system.css";') > main.indexOf('import "./sidebar-workspace-final-fixes.css";'),\n  "authoritative UI system must load after feature-specific compatibility styling",\n);\n`
  + smoke.slice(orderEnd);
const geometryAnchor = 'assert.match(css, /html,\\s*body,\\s*#root,\\s*\\.app-wrap\\s*\\{[^}]*overflow: hidden !important;/s, "document shell must prohibit horizontal overflow");\n';
if (!smoke.includes(geometryAnchor)) throw new Error("Expected general UI geometry assertion was not found");
smoke = smoke.replace(
  geometryAnchor,
  'assert.match(uiSystem, /--ui-bg-panel:/, "authoritative UI system must define shared design tokens");\nassert.match(uiSystem, /--ui-focus-ring:/, "authoritative UI system must define focus tokens");\n' + geometryAnchor,
);
fs.writeFileSync(smokePath, smoke);

if (!fs.existsSync(path.join(src, "ui-system.css"))) throw new Error("ui-system.css was not created");
for (const file of migrated) {
  if (fs.existsSync(path.join(src, file))) throw new Error(`Retired stylesheet still exists: ${file}`);
  if (main.includes(file)) throw new Error(`Retired stylesheet is still imported: ${file}`);
}

console.log("Consolidated final UI geometry, visual, report-preview, and token ownership into ui-system.css.");

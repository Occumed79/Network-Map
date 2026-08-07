import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(process.cwd());
const appPath = path.join(root, "src/App.tsx");
let app = fs.readFileSync(appPath, "utf8");
const sourceFile = ts.createSourceFile(appPath, app, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const removals = [];

function attributeText(node, name) {
  const attributes = node.openingElement?.attributes?.properties || node.attributes?.properties || [];
  const attribute = attributes.find((property) => ts.isJsxAttribute(property) && property.name.text === name);
  return attribute ? attribute.getText(sourceFile) : "";
}

function hasClass(node, className) {
  return attributeText(node, "className").includes(className);
}

function visit(node, parents = []) {
  if (ts.isJsxElement(node)) {
    const tag = node.openingElement.tagName.getText(sourceFile);
    const raw = node.getText(sourceFile);
    if (tag === "button" && /\bDirectories\b/.test(raw)) {
      removals.push([node.getFullStart(), node.getEnd(), "directories-button"]);
    }
    if (hasClass(node, "workflow-directory-modal")) {
      const backdrop = [...parents].reverse().find((parent) => ts.isJsxElement(parent) && hasClass(parent, "modal-backdrop"));
      const target = backdrop || node;
      removals.push([target.getFullStart(), target.getEnd(), "directories-modal"]);
    }
  }
  ts.forEachChild(node, (child) => visit(child, [...parents, node]));
}

visit(sourceFile);
const unique = [];
const seen = new Set();
for (const removal of removals) {
  const key = `${removal[0]}:${removal[1]}`;
  if (!seen.has(key)) {
    seen.add(key);
    unique.push(removal);
  }
}
if (!unique.some((removal) => removal[2] === "directories-button")) throw new Error("Directories button was not found in React source");
if (!unique.some((removal) => removal[2] === "directories-modal")) throw new Error("Directories modal was not found in React source");
unique.sort((left, right) => right[0] - left[0]);
for (const [start, end] of unique) app = app.slice(0, start) + app.slice(end);
if (/>\s*Directories\s*</.test(app) || app.includes("workflow-directory-modal")) throw new Error("Directories UI remains in App.tsx");
fs.writeFileSync(appPath, app);

const runtimePath = path.join(root, "src/unifiedProviderToolsRuntime.ts");
let runtime = fs.readFileSync(runtimePath, "utf8");
const functionStart = runtime.indexOf("function removeDirectoriesTool(): void {");
const nextFunction = runtime.indexOf("function makeSourceButton", functionStart);
if (functionStart < 0 || nextFunction < 0) throw new Error("Directories compatibility function markers were not found");
runtime = runtime.slice(0, functionStart) + runtime.slice(nextFunction);
const call = "  removeDirectoriesTool();\n";
if (!runtime.includes(call)) throw new Error("Directories compatibility call was not found");
runtime = runtime.replace(call, "");
if (runtime.includes("removeDirectoriesTool") || runtime.includes("workflow-directory-modal")) throw new Error("Directories compatibility runtime remains");
fs.writeFileSync(runtimePath, runtime);

console.log("Directories control and modal retired directly from React source; compatibility hide path removed.");

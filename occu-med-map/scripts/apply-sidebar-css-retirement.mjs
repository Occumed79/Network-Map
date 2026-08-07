import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const mainPath = path.join(root, "src/main.tsx");
const cssPath = path.join(root, "src/sidebar-control-fixes.css");
let main = fs.readFileSync(mainPath, "utf8");
const importLine = 'import "./sidebar-control-fixes.css";\n';
if (!main.includes(importLine)) throw new Error("sidebar-control-fixes.css import is missing");
if (!fs.existsSync(cssPath)) throw new Error("sidebar-control-fixes.css file is missing");
main = main.replace(importLine, "");
fs.writeFileSync(mainPath, main);
fs.unlinkSync(cssPath);
if (fs.readFileSync(mainPath, "utf8").includes("sidebar-control-fixes.css") || fs.existsSync(cssPath)) {
  throw new Error("sidebar-control-fixes.css was not fully retired");
}
console.log("Retired superseded sidebar-control-fixes.css layer.");

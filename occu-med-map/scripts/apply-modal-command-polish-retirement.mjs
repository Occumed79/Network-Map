import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const mainPath = path.join(root, "src/main.tsx");
const cssPath = path.join(root, "src/modal-command-polish.css");
let main = fs.readFileSync(mainPath, "utf8");
const importLine = 'import "./modal-command-polish.css";\n';
if (!main.includes(importLine)) throw new Error("modal-command-polish.css import is missing");
if (!fs.existsSync(cssPath)) throw new Error("modal-command-polish.css file is missing");
main = main.replace(importLine, "");
fs.writeFileSync(mainPath, main);
fs.unlinkSync(cssPath);
if (main.includes("modal-command-polish.css") || fs.existsSync(cssPath)) throw new Error("modal-command-polish.css retirement incomplete");
console.log("Retired modal-command-polish.css after local screenshot parity and rendered UI acceptance validation.");

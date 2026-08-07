import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const mainPath = path.join(root, "src/main.tsx");
let main = fs.readFileSync(mainPath, "utf8");

const retire = [
  "modal-popup-fixes.css",
  "modal-content-polish.css",
  "ui-cascade-stabilization.css",
];

for (const file of retire) {
  const importLine = `import "./${file}";\n`;
  if (!main.includes(importLine)) throw new Error(`Expected stylesheet import is missing: ${file}`);
  main = main.replace(importLine, "");
  const absolute = path.join(root, "src", file);
  if (!fs.existsSync(absolute)) throw new Error(`Expected stylesheet file is missing: ${file}`);
  fs.unlinkSync(absolute);
}

fs.writeFileSync(mainPath, main);

for (const file of retire) {
  if (main.includes(file)) throw new Error(`Retired stylesheet is still imported: ${file}`);
  if (fs.existsSync(path.join(root, "src", file))) throw new Error(`Retired stylesheet still exists: ${file}`);
}

console.log(`Retired ${retire.length} superseded stylesheet layers: ${retire.join(", ")}`);

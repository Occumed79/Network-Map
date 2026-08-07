import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const mainPath = path.join(root, "src/main.tsx");
let main = fs.readFileSync(mainPath, "utf8");
const retire = [
  "professional-overrides.css",
  "professional-hardening.css",
  "luminous-shell-fixes.css",
];
for (const file of retire) {
  const importLine = `import "./${file}";\n`;
  if (!main.includes(importLine)) throw new Error(`Expected stylesheet import missing: ${file}`);
  const absolute = path.join(root, "src", file);
  if (!fs.existsSync(absolute)) throw new Error(`Expected stylesheet file missing: ${file}`);
  main = main.replace(importLine, "");
  fs.unlinkSync(absolute);
}
fs.writeFileSync(mainPath, main);
for (const file of retire) {
  if (main.includes(file) || fs.existsSync(path.join(root, "src", file))) throw new Error(`Stylesheet retirement incomplete: ${file}`);
}
console.log(`Retired visually redundant legacy theme layers: ${retire.join(", ")}`);

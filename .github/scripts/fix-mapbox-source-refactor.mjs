import fs from "node:fs";

const file = ".github/scripts/refactor-mapbox-source-pipeline.mjs";
let content = fs.readFileSync(file, "utf8");
const before = '/\\nfunction wrapFinderSource\\(map: mapboxgl\\.Map\\): void \\{[\\s\\S]*?\\n\\}\\n\\nfunction patchSourceRegistration\\(\\): void \\{[\\s\\S]*?\\n\\}\\n\\nfunction popupHtml/';
const after = '/\\nfunction wrapFinderSource\\([\\s\\S]*?\\n\\}\\n\\nfunction patchSourceRegistration\\(\\): void \\{[\\s\\S]*?\\n\\}\\n\\nfunction popupHtml/';
const count = content.split(before).length - 1;
if (count !== 1) throw new Error("Expected one provider normalization matcher; found " + count);
content = content.replace(before, after);
fs.writeFileSync(file, content);
console.log("Mapbox source refactor matcher corrected.");

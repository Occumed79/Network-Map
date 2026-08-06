import fs from "node:fs";

const file = ".github/scripts/refactor-leaflet-lifecycle.mjs";
let content = fs.readFileSync(file, "utf8");

const replacements = [
  [
    '    console.error(`Leaflet initializer failed: ${initializer.id}`, error);',
    '    console.error("Leaflet initializer failed: " + initializer.id, error);',
  ],
  [
    '        console.warn(`Leaflet initializer cleanup failed: ${id}`, error);',
    '        console.warn("Leaflet initializer cleanup failed: " + id, error);',
  ],
  [
    '        try { cleanup(); } catch (error) { console.warn(`Leaflet initializer cleanup failed: ${id}`, error); }',
    '        try { cleanup(); } catch (error) { console.warn("Leaflet initializer cleanup failed: " + id, error); }',
  ],
  [
    '  assert.match(content, /registerLeafletMapInitializer/, `${file} must use the lifecycle registry`);',
    '  assert.match(content, /registerLeafletMapInitializer/, file + " must use the lifecycle registry");',
  ],
  [
    '  assert.match(content, new RegExp(`id: ["\']${id}["\']`), `${file} must retain a stable initializer id`);',
    '  assert.match(content, new RegExp("id: [\\\"\']" + id + "[\\\"\']"), file + " must retain a stable initializer id");',
  ],
];

for (const [before, after] of replacements) {
  const count = content.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected one generator fix match, found ${count}: ${before}`);
  content = content.replace(before, after);
}

fs.writeFileSync(file, content);
console.log("Refactor generator syntax corrected.");

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(process.cwd());
const appPath = path.join(root, "src/App.tsx");
const inventoryPath = path.join(root, "UI_CONTROL_INVENTORY.md");

let app = fs.readFileSync(appPath, "utf8");
const oldLauncher = `<button className={activeTool==='myClinics'?'active':''} onClick={()=>toggleCommandTool('myClinics')}><Upload size={16}/><span>My Clinics</span></button>`;
const previousMigratedLauncher = `<button className={activeTool==='myClinics'?'active':''} aria-label="Upload Clinics" onClick={()=>toggleCommandTool('myClinics')}><Upload size={16}/><span>Upload Clinics</span></button>`;
const helperBoundLauncher = `<button className={activeTool==='myClinics'?'active':''} aria-label="Upload Clinics" onClick={toggleMyClinicsWorkflow}><Upload size={16}/><span>Upload Clinics</span></button>`;
const newLauncher = `<button className={activeTool==='myClinics'?'active':''} aria-label="Upload Clinics" onClick={()=>setActiveTool(activeTool==='myClinics'?null:'myClinics')}><Upload size={16}/><span>Upload Clinics</span></button>`;

if (!app.includes(oldLauncher) && !app.includes(previousMigratedLauncher) && !app.includes(helperBoundLauncher) && !app.includes(newLauncher)) {
  throw new Error("Expected My Clinics / Upload Clinics workflow launcher was not found in App.tsx");
}
for (const candidate of [oldLauncher, previousMigratedLauncher, helperBoundLauncher]) {
  if (app.includes(candidate)) app = app.replace(candidate, newLauncher);
}

const legacyLabel = `GROUP NAME (e.g. "East Coast Partners")`;
const sourceOwnedLabel = "DATASET LABEL (shown on map and filters)";
if (app.includes(legacyLabel)) app = app.replace(legacyLabel, sourceOwnedLabel);
const legacyPlaceholder = 'placeholder="Leave blank for auto-name"';
const sourceOwnedPlaceholder = 'placeholder="e.g. U.S. Embassy Medical Providers" aria-label="Dataset label shown on map and filters"';
if (app.includes(legacyPlaceholder)) app = app.replace(legacyPlaceholder, sourceOwnedPlaceholder);

if (!app.includes("{activeTool === 'myClinics' && (")) {
  throw new Error("Upload Clinics modal is no longer owned by activeTool=myClinics in React source");
}
if (!app.includes('<span className="modal-title">Upload Clinics</span>')) {
  throw new Error("Upload Clinics modal title is missing from React source");
}
if (!/ref=\{clinicFileInputRef\}\s+type="file"\s+accept="\.xlsx,\.xls,\.csv"/.test(app)) {
  throw new Error("Upload Clinics source-owned file input is missing from React source");
}
if (!app.includes(sourceOwnedLabel) || !app.includes("Dataset label shown on map and filters")) {
  throw new Error("Dataset label copy was not migrated into React source");
}
fs.writeFileSync(appPath, app);

let inventory = fs.readFileSync(inventoryPath, "utf8");
if (!inventory.includes("| Upload Clinics |")) {
  inventory += `\n| Upload Clinics | CSV / Excel provider dataset import | React \`App.tsx\` | source-owned workflow launcher + modal, both controlled by \`activeTool='myClinics'\`; dataset label copy is source-owned | validation, write failure, success, repeated open/close |\n`;
}
fs.writeFileSync(inventoryPath, inventory);

fs.unlinkSync(fileURLToPath(import.meta.url));
console.log("Upload Clinics workflow and dataset-label controls are source-owned in React; popup dataset relabeling remains isolated; one-time migration retired.");

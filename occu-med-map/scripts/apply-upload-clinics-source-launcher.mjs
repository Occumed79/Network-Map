import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const appPath = path.join(root, "src/App.tsx");
const inventoryPath = path.join(root, "UI_CONTROL_INVENTORY.md");

let app = fs.readFileSync(appPath, "utf8");
const oldLauncher = `<button className={activeTool==='myClinics'?'active':''} onClick={()=>toggleCommandTool('myClinics')}><Upload size={16}/><span>My Clinics</span></button>`;
const newLauncher = `<button className={activeTool==='myClinics'?'active':''} aria-label="Upload Clinics" onClick={()=>toggleCommandTool('myClinics')}><Upload size={16}/><span>Upload Clinics</span></button>`;

if (!app.includes(oldLauncher) && !app.includes(newLauncher)) {
  throw new Error("Expected My Clinics / Upload Clinics workflow launcher was not found in App.tsx");
}
if (app.includes(oldLauncher)) app = app.replace(oldLauncher, newLauncher);

if (!app.includes('<span className="modal-title">Upload Clinics</span>')) {
  throw new Error("Upload Clinics modal title is missing from React source");
}
if (!/ref=\{clinicFileInputRef\}\s+type="file"\s+accept="\.xlsx,\.xls,\.csv"/.test(app)) {
  throw new Error("Upload Clinics source-owned file input is missing from React source");
}
fs.writeFileSync(appPath, app);

let inventory = fs.readFileSync(inventoryPath, "utf8");
if (!inventory.includes("Upload Clinics")) {
  inventory += `\n| Upload Clinics | CSV / Excel provider dataset import | React \`App.tsx\` | source-owned workflow launcher + modal | validation, write failure, success, repeated open/close |\n`;
}
fs.writeFileSync(inventoryPath, inventory);

console.log("Upload Clinics workflow launcher is source-owned in React; My Clinics remains a separate provider layer label.");

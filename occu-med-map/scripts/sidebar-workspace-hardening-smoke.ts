import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const source = (relativePath: string) => readFileSync(path.join(projectRoot, relativePath), "utf8");

const main = source("src/main.tsx");
const app = source("src/App.tsx");

// React owns the sidebar and Finder lifecycle. The retired workspace controller
// moved React nodes, hid whole sections, and could click launchers behind React's
// back, leaving buttons inert or making Finder disappear after reconciliation.
assert.doesNotMatch(main, /sidebarWorkspaceControllerRuntime/, "an imperative runtime must not mutate the React sidebar");
assert.doesNotMatch(main, /sidebarWorkspacePanelGuardRuntime/, "a second runtime must not manage Finder visibility");
assert.doesNotMatch(main, /sidebar-workspace-final-fixes\.css/, "workspace CSS must not hide native sidebar content");
assert.match(app, /<aside className={`sidebar/, "the application must render the sidebar declaratively");
assert.match(app, /unified-live-tool/, "the native sidebar must retain its Live Finder launcher");
assert.match(app, /unified-npi-tool/, "the native sidebar must retain its NPI launcher");
assert.match(app, /unified-explorer-tool/, "the native sidebar must retain its Provider Explorer launcher");
assert.match(app, /Radius Tool/, "the native sidebar must retain the radius workflow");
assert.match(app, /Upload Clinics/, "the native sidebar must retain clinic upload");
assert.match(app, /activeTool === 'liveFinder'/, "Finder visibility must follow React state");

console.log("Native React sidebar ownership smoke test passed.");

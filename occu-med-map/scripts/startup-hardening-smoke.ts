import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

function source(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const main = source("src/main.tsx");
const diagnostics = source("src/startupDiagnostics.ts");
const boundary = source("src/AppErrorBoundary.tsx");
const css = source("src/startup-hardening.css");

assert.match(main, /AppErrorBoundary/, "the application must render inside an error boundary");
assert.match(main, /ApplicationFailureScreen/, "asynchronous boot failures must render a recovery screen");
assert.match(main, /installGlobalBootDiagnostics\(\)/, "startup diagnostics must install before rendering");
assert.match(main, /aria-busy/, "the root must expose startup busy state");
assert.match(main, /requestIdleCallback/, "optional runtimes must defer until idle time");
assert.match(main, /timeout: 1600/, "idle loading must include a bounded fallback");
assert.match(main, /boot\(\)\.catch/, "asynchronous boot failures must be handled");
assert.match(main, /markApplicationInteractive/, "the first interactive frame must be recorded");
assert.match(main, /markOptionalRuntimesComplete/, "optional runtime completion must be recorded");
assert.match(main, /import "\.\/startup-hardening\.css";/, "recovery styles must load");
assert.doesNotMatch(main, /import\("\.\/dualMapTransitionRuntime"\)/, "startup resilience must not restore the renderer-blocking transition runtime");

assert.match(diagnostics, /__NETWORK_MAP_BOOT__/, "boot diagnostics must be externally inspectable");
assert.match(diagnostics, /runtimeRecords/, "optional runtime timing and state must be recorded");
assert.match(diagnostics, /unhandledrejection/, "unhandled promise rejections must be captured");
assert.match(diagnostics, /window-error/, "global runtime errors must be captured");
assert.match(diagnostics, /duplicate/, "repeated identical failures must be deduplicated");
assert.doesNotMatch(diagnostics, /setInterval\s*\(/, "startup diagnostics must not poll");

assert.match(boundary, /componentDidCatch/, "React render failures must be recorded");
assert.match(boundary, /role="alert"/, "the recovery screen must be announced to assistive technology");
assert.match(boundary, /Reload application/, "the recovery screen must provide a deterministic reload action");
assert.match(boundary, /Copy diagnostics/, "diagnostics must be easy to capture");

assert.match(css, /min-height: 100vh/, "the recovery screen must fill the desktop viewport");
assert.match(css, /max-height: calc\(100vh - 64px\)/, "recovery content must remain viewport constrained");
assert.match(css, /@media \(forced-colors: active\)/, "recovery controls must support forced-colors mode");

console.log("Startup hardening smoke test passed.");

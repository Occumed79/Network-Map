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
const transition = source("src/dualMapTransitionRuntime.ts");
const blackHole = source("src/blackHoleWebGLRuntime.ts");
const mapEngineCss = source("src/dual-map-engines.css");

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
assert.match(main, /import \{ switchMapModeWithTransition \} from "\.\/dualMapTransitionRuntime"/, "the cinematic map transition must remain wired");
assert.match(main, /document\.addEventListener\("click"[\s\S]*switchMapModeWithTransition\(mode, control\)/, "map controls must invoke the cinematic transition from a user gesture");
assert.match(transition, /transitionAudio \|\| new Audio\(\)/, "transition audio must be created lazily on the user's click");
assert.match(transition, /audio\.src = TRANSITION_SOUND_DATA_URI/, "the embedded transition sound must remain wired");
assert.match(transition, /void audio\.play\(\)/, "transition sound playback must start synchronously from the click path");
assert.doesNotMatch(transition, /const transitionAudio = new Audio/, "transition audio must not initialize during application startup");
assert.doesNotMatch(transition, /createMediaElementSource|webkitAudioContext/, "Safari playback must not depend on a suspended Web Audio graph");
assert.match(transition, /import\("\.\/blackHoleWebGLRuntime"\)/, "the GPU renderer must stay lazy-loaded");
assert.match(blackHole, /UnrealBloomPass/, "the accretion disk must use a real HDR bloom pass");
assert.match(blackHole, /traceBlackHole/, "the transition must ray trace the black-hole scene");
assert.match(blackHole, /geodesicAcceleration/, "the transition must bend light instead of drawing flat concentric arcs");
assert.doesNotMatch(mapEngineCss, /dual-engine-vortex-rings|vortex-core-pulse|vortex-burst/, "legacy geometric vortex CSS must not return");

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

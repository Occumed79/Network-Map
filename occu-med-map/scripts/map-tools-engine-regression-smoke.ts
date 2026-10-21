// Regression coverage for the Map Tools engine defects that do not need a
// browser. Browser-level coverage of every control lives in
// ci-map-tools-engine-acceptance.mjs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

Object.assign(globalThis, { window: new EventTarget() });

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath: string) => readFileSync(path.join(projectRoot, relativePath), "utf8");

// A map whose style document can be "loading" (as during initial load or a
// setStyle swap) while tiles stream in, mirroring Mapbox GL: addSource throws
// until the style document loads, while isStyleLoaded() stays false for as
// long as any tile is pending.
class FakeMap {
  documentLoaded = false;
  tilesPending = true;
  sources = new Map<string, unknown>();
  listeners = new Map<string, Set<() => void>>();
  isStyleLoaded() { return this.documentLoaded && !this.tilesPending; }
  addSource(id: string, data: unknown) {
    if (!this.documentLoaded) throw new Error("Style is not done loading");
    this.sources.set(id, data);
  }
  on(event: string, listener: () => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
  }
  off(event: string, listener: () => void) { this.listeners.get(event)?.delete(listener); }
  fire(event: string) { [...(this.listeners.get(event) || [])].forEach((listener) => listener()); }
  asMap() { return this as any; }
}

const { runWhenStyleReady, isStyleNotReadyError } = await import("../src/mapboxMapLifecycleRuntime");

// Defect D1: overlay writes were skipped whenever isStyleLoaded() was false,
// which is the normal state while tiles load after any pan or zoom.
{
  const map = new FakeMap();
  map.documentLoaded = true;
  map.tilesPending = true;
  assert.equal(map.isStyleLoaded(), false);
  runWhenStyleReady(map.asMap(), "zones", () => map.addSource("zones", "cleared"));
  assert.equal(map.sources.get("zones"), "cleared", "writes must apply while tiles are still loading");
}

// Work refused during a style swap is replayed on style.load; the latest
// request per key wins so a clear issued mid-swap is not undone.
{
  const map = new FakeMap();
  runWhenStyleReady(map.asMap(), "zones", () => map.addSource("zones", "drawn"));
  runWhenStyleReady(map.asMap(), "zones", () => map.addSource("zones", "cleared"));
  runWhenStyleReady(map.asMap(), "origin", () => map.addSource("origin", "set"));
  assert.equal(map.sources.size, 0, "nothing can be written before the style document loads");
  map.documentLoaded = true;
  map.fire("style.load");
  assert.equal(map.sources.get("zones"), "cleared", "the latest deferred write for a key must win");
  assert.equal(map.sources.get("origin"), "set", "independent keys must all replay");

  map.sources.clear();
  map.documentLoaded = false;
  runWhenStyleReady(map.asMap(), "zones", () => map.addSource("zones", "after-swap"));
  map.documentLoaded = true;
  map.fire("style.load");
  assert.equal(map.sources.get("zones"), "after-swap", "replay must keep working across repeated style swaps");
}

// Unrelated failures must surface instead of being deferred forever.
{
  const map = new FakeMap();
  map.documentLoaded = true;
  assert.throws(() => runWhenStyleReady(map.asMap(), "bad", () => { throw new Error("invalid layer"); }), /invalid layer/);
  assert.equal(isStyleNotReadyError(new Error("Style is not done loading")), true);
  assert.equal(isStyleNotReadyError(new Error("invalid layer")), false);
}

// Defect D2: the Map Tools panel was only created for the 2D map.
const commandPanel = source("src/mapToolsCommandPanel.ts");
assert.doesNotMatch(commandPanel, /context\.mode === "2d"/, "Map Tools must not be restricted to the 2D map");
assert.match(commandPanel, /function releasePanel/, "Map Tools must move to a surviving map when its owner is removed");

// Defect D3: "Apply to Results" dispatched an event nobody listened to.
assert.match(commandPanel, /setProviderEtaResult\(latestRankingResult\)/, "Apply to Results must publish to the ETA store read by result cards");

// Defect D4 / D6: basemap switches only reached the 2D map and used diffing
// setStyle, which strips runtime overlays without firing style.load.
const bridge = source("src/mapControlsBridgeRuntime.ts");
assert.match(bridge, /\{ diff: false \}/, "basemap switches must rebuild the style so overlays are restored");
assert.doesNotMatch(commandPanel, /\.setStyle\(/, "the map controls bridge must be the single basemap owner");
assert.doesNotMatch(bridge, /addEventListener\("click", handleBasemapClick/, "basemap clicks must not be handled twice");

// Defect D5: route planner and basemap status writes clobbered other sections.
for (const file of ["src/routePlannerControlsRuntime.ts", "src/mapControlsBridgeRuntime.ts"]) {
  assert.doesNotMatch(source(file), /querySelectorAll<HTMLElement>\("\.occumed-mapbox-status"\)/, `${file} must only write the panel's own status line`);
}

// Finding 2: ETA ranking batches through the Matrix API instead of sequential
// Directions requests, and respects the per-profile coordinate limits.
const engine = source("src/features/driveTime/providerEtaEngine.ts");
assert.match(engine, /mapboxMatrix\(origin, prepared/, "ETA ranking must use one Matrix request");
assert.doesNotMatch(engine, /for \(const candidate of prepared\)[\s\S]*await mapboxDirections/, "ETA ranking must not await Directions sequentially");
const services = source("src/mapboxServices.ts");
assert.match(services, /profile === "driving-traffic" \? 10 : 25/, "Matrix batches must respect Mapbox coordinate limits");
assert.match(services, /from "@mapbox\/mapbox-sdk\/services\/matrix"/, "Mapbox services must use the official SDK");
assert.doesNotMatch(services, /reverseGeocode\(\{[^}]*limit/, "reverse geocoding must not send limit without a single type (HTTP 422)");

console.log("Map Tools engine regression smoke passed: style-readiness deferral, panel ownership, ETA publishing, basemap ownership, status scoping, Matrix ranking.");

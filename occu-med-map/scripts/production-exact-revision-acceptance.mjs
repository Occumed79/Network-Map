import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.PRODUCTION_URL || "https://network-map-tool-mqib.onrender.com";
const expectedRevision = process.env.EXPECTED_REVISION || "";
if (!/^[a-f0-9]{7,40}$/i.test(expectedRevision)) throw new Error("EXPECTED_REVISION must be a Git commit SHA");
const artifactDir = path.resolve(process.cwd(), "test-results", "production-exact-revision");
fs.mkdirSync(artifactDir, { recursive: true });

async function fetchJson(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  const body = await response.json().catch(() => null);
  return { response, body };
}

const diagnostics = await fetchJson("/api/diagnostics/export");
assert.equal(diagnostics.response.ok, true, `diagnostics endpoint failed: ${diagnostics.response.status}`);
const deployedRevision = String(diagnostics.body?.application?.revision || "");
assert.ok(deployedRevision, "deployed diagnostics did not expose a Git revision");
assert.ok(deployedRevision.startsWith(expectedRevision) || expectedRevision.startsWith(deployedRevision), `stale deployment: expected ${expectedRevision}, deployed ${deployedRevision}`);

const ready = await fetchJson("/api/ready");
assert.equal(ready.response.status, 200, `production readiness failed: ${JSON.stringify(ready.body)}`);
assert.equal(ready.body?.ok, true, "production dependencies are not ready");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: undefined });
const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
const requestFailures = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("requestfailed", (request) => requestFailures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || "failed"}`));

async function verifyRoute(suffix, name) {
  await page.goto(`${baseUrl}/${suffix}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.locator(".app-wrap").waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1500);
  const geometry = await page.evaluate(() => ({
    width: innerWidth,
    docWidth: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0),
    app: Boolean(document.querySelector(".app-wrap")),
    map: Boolean(document.querySelector(".leaflet-container,.mapboxgl-map,.map-shell,.map-area")),
    selectedProviderSources: Array.from(document.querySelectorAll("input[type=checkbox]")).filter((node) => {
      const label = node.getAttribute("aria-label") || "";
      return ["BlueHive Providers", "Indexed Providers", "Dental Examiner Presence", "My Clinics"].includes(label) && node.checked;
    }).map((node) => node.getAttribute("aria-label")),
  }));
  assert.equal(geometry.app, true, `${name}: app shell missing`);
  assert.equal(geometry.map, true, `${name}: map surface missing`);
  assert.ok(geometry.docWidth <= geometry.width + 4, `${name}: horizontal overflow ${geometry.docWidth} > ${geometry.width}`);
  assert.deepEqual(geometry.selectedProviderSources, [], `${name}: provider sources must stay opt-in during production smoke`);
  await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true });
}

try {
  await verifyRoute("", "standard");
  await verifyRoute("?p2-preview=1", "p2-preview");
  const fatalConsole = consoleErrors.filter((message) => !/favicon|ResizeObserver loop|Failed to load resource/i.test(message));
  assert.deepEqual(pageErrors, [], `production page errors: ${pageErrors.join("; ")}`);
  assert.deepEqual(fatalConsole, [], `production console errors: ${fatalConsole.join("; ")}`);
  fs.writeFileSync(path.join(artifactDir, "network-failures.txt"), requestFailures.join("\n"));
  fs.writeFileSync(path.join(artifactDir, "deployment.json"), JSON.stringify({ expectedRevision, deployedRevision, ready: ready.body }, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(artifactDir, "failure.png"), fullPage: true }).catch(() => undefined);
  fs.writeFileSync(path.join(artifactDir, "failure.txt"), `${error instanceof Error ? error.stack || error.message : String(error)}\n\nPage errors:\n${pageErrors.join("\n")}\n\nConsole errors:\n${consoleErrors.join("\n")}\n\nRequest failures:\n${requestFailures.join("\n")}`);
  throw error;
} finally {
  await context.close();
  await browser.close();
}

console.log(`Production exact-revision acceptance passed for ${deployedRevision}.`);

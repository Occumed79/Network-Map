import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = (process.env.NETWORK_MAP_PRODUCTION_URL || "").replace(/\/$/, "");
const expectedSha = process.env.EXPECTED_GIT_SHA || "";
const previousSha = process.env.PREVIOUS_GIT_SHA || "";
if (!baseUrl) throw new Error("NETWORK_MAP_PRODUCTION_URL is required");
if (!expectedSha) throw new Error("EXPECTED_GIT_SHA is required");

const artifactDir = path.resolve(process.cwd(), "test-results", "production-acceptance");
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(path.join(artifactDir, "rollback-target.txt"), previousSha
  ? `Automatic Render rollback is not available to this workflow. Manual rollback target: ${previousSha}\n`
  : "Automatic Render rollback is not available to this workflow. No previous revision was supplied.\n");

async function fetchJson(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, { headers: { Accept: "application/json" }, cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function waitForRevision() {
  let last = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const result = await fetchJson("/api/revision").catch((error) => ({ error }));
    last = result;
    if (result?.response?.ok) {
      const revision = String(result.body?.revision || "");
      if (revision === expectedSha || revision.startsWith(expectedSha) || expectedSha.startsWith(revision)) return result;
    }
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  throw new Error(`Production never reported expected revision ${expectedSha}. Last result: ${JSON.stringify(last?.body || String(last?.error || "unknown"))}`);
}

const revision = await waitForRevision();
fs.writeFileSync(path.join(artifactDir, "revision.json"), JSON.stringify(revision.body, null, 2));
const ready = await fetchJson("/api/ready");
assert.equal(ready.response.status, 200, `production readiness failed: ${JSON.stringify(ready.body)}`);
assert.equal(ready.body.ok, true);

const browser = await chromium.launch({ headless: true });
try {
  for (const route of ["", "?p2-preview=1"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    const writes = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    page.on("request", (request) => {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) && request.url().includes("/api/")) writes.push(`${request.method()} ${request.url()}`);
    });
    await page.goto(`${baseUrl}/${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.locator(".app-wrap").waitFor({ state: "visible", timeout: 30_000 });
    await page.waitForTimeout(1_500);
    const geometry = await page.evaluate(() => ({ width: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0), viewport: innerWidth }));
    assert.ok(geometry.width <= geometry.viewport + 3, `production ${route || "standard"} has horizontal overflow`);
    assert.deepEqual(writes, [], `production smoke must never mutate data: ${writes.join("; ")}`);
    assert.deepEqual(pageErrors, [], `production page errors: ${pageErrors.join("; ")}`);
    fs.writeFileSync(path.join(artifactDir, `${route ? "p2" : "standard"}-console.txt`), consoleErrors.join("\n"));
    await page.screenshot({ path: path.join(artifactDir, `${route ? "p2" : "standard"}.png`), fullPage: true });
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`Production exact-revision acceptance passed for ${expectedSha}.`);

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = (process.env.NETWORK_MAP_PRODUCTION_URL || "").replace(/\/$/, "");
const expectedSha = (process.env.EXPECTED_GIT_SHA || "").trim();
const previousSha = process.env.PREVIOUS_GIT_SHA || "";
const revisionAttempts = Math.max(1, Number.parseInt(process.env.PRODUCTION_REVISION_ATTEMPTS || "30", 10) || 30);
const revisionDelayMs = Math.max(0, Number.parseInt(process.env.PRODUCTION_REVISION_DELAY_MS || "10000", 10) || 10_000);
if (!baseUrl) throw new Error("NETWORK_MAP_PRODUCTION_URL is required");
if (!expectedSha) throw new Error("EXPECTED_GIT_SHA is required");

const artifactDir = path.resolve(process.cwd(), "test-results", "production-acceptance");
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(path.join(artifactDir, "rollback-target.txt"), previousSha
  ? `Automatic Render rollback is not available to this workflow. Manual rollback target: ${previousSha}\n`
  : "Automatic Render rollback is not available to this workflow. No previous revision was supplied.\n");

async function fetchJson(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, { headers: { Accept: "application/json" }, cache: "no-store" });
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  return {
    response,
    body,
    contentType,
    textPreview: text.slice(0, 240),
  };
}

function revisionMatches(revision) {
  const deployed = String(revision || "").trim();
  if (deployed.length < 7) return false;
  return deployed === expectedSha || deployed.startsWith(expectedSha) || expectedSha.startsWith(deployed);
}

function resultSummary(result) {
  if (result?.error) return { error: String(result.error) };
  return {
    status: result?.response?.status ?? null,
    contentType: result?.contentType ?? "",
    body: result?.body ?? null,
    textPreview: result?.textPreview ?? "",
  };
}

async function waitForRevision() {
  let last = null;
  for (let attempt = 0; attempt < revisionAttempts; attempt += 1) {
    const result = await fetchJson("/api/revision").catch((error) => ({ error }));
    last = result;
    if (result?.response?.ok && result.body && revisionMatches(result.body.revision)) return result;
    if (attempt + 1 < revisionAttempts && revisionDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, revisionDelayMs));
    }
  }
  fs.writeFileSync(path.join(artifactDir, "revision-last-response.json"), JSON.stringify(resultSummary(last), null, 2));
  throw new Error(`Production never reported expected revision ${expectedSha}. Last result: ${JSON.stringify(resultSummary(last))}`);
}

const revision = await waitForRevision();
fs.writeFileSync(path.join(artifactDir, "revision.json"), JSON.stringify(revision.body, null, 2));
const ready = await fetchJson("/api/ready");
fs.writeFileSync(path.join(artifactDir, "ready.json"), JSON.stringify(resultSummary(ready), null, 2));
assert.match(ready.contentType, /application\/json/i, `production readiness did not return JSON: ${JSON.stringify(resultSummary(ready))}`);
assert.equal(ready.response.status, 200, `production readiness failed: ${JSON.stringify(resultSummary(ready))}`);
assert.equal(ready.body?.ok, true, `production readiness body was not ready: ${JSON.stringify(resultSummary(ready))}`);

const readinessDependencies = new Map(
  (Array.isArray(ready.body?.dependencies) ? ready.body.dependencies : []).map((dependency) => [dependency?.name, dependency]),
);
for (const name of ["overpass-project-1", "overpass-project-2"]) {
  const dependency = readinessDependencies.get(name);
  assert.ok(dependency, `production readiness is missing ${name}; Render does not have that Overture shard configured: ${JSON.stringify(resultSummary(ready))}`);
  assert.equal(dependency.ok, true, `production ${name} is configured but unavailable: ${JSON.stringify(dependency)}`);
}
fs.writeFileSync(
  path.join(artifactDir, "overture-shards.json"),
  JSON.stringify(["overpass-project-1", "overpass-project-2"].map((name) => readinessDependencies.get(name)), null, 2),
);

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

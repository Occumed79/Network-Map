import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium, firefox, webkit } from "playwright";

const baseUrl = process.env.NETWORK_MAP_CI_UI_URL || "http://127.0.0.1:4173";
const browserName = process.env.NETWORK_MAP_BROWSER || "chromium";
const artifactDir = path.resolve(process.cwd(), "test-results", "hardening-browser", browserName);
fs.mkdirSync(artifactDir, { recursive: true });

const browsers = { chromium, firefox, webkit };
const browserType = browsers[browserName];
if (!browserType) throw new Error(`Unsupported browser ${browserName}`);

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1366, height: 768 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

const routes = [
  { name: "standard", suffix: "" },
  { name: "p2", suffix: "?p2-preview=1" },
];

function json(route, payload, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(payload) });
}

async function mockApi(page) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    if (request.method() !== "GET") return json(route, { ok: true, id: "hardening-mock", providers: [], records: [] });
    if (pathname.endsWith("/revision")) return json(route, { revision: "ci-browser" });
    if (pathname.includes("provider-layers")) return json(route, { providers: [], total: 0, page: 1, hasMore: false });
    if (pathname.includes("provider-explorer/density") || pathname.includes("provider-explorer/hex")) return json(route, { cells: [], total: 0 });
    if (pathname.includes("provider-explorer")) return json(route, { providers: [], total: 0, page: 1, hasMore: false, stored_count: 0, live_count: 0, live_only: [] });
    if (pathname.includes("health") || pathname.includes("ready") || pathname.includes("live")) return json(route, { ok: true, status: "ok" });
    if (pathname.includes("search") || pathname.includes("finder") || pathname.includes("npi")) return json(route, { providers: [], results: [], items: [], total: 0 });
    if (pathname.includes("inventory") || pathname.includes("coverage")) return json(route, { providers: [], total: 0, cells: [] });
    if (pathname.includes("diagnostics/export")) return json(route, { schemaVersion: 1, fingerprint: "ci", generatedAt: new Date().toISOString() });
    return json(route, {});
  });
}

function visibleInViewport(element) {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return !element.hidden && style.display !== "none" && style.visibility !== "hidden" && rect.width > 2 && rect.height > 2 && rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight;
}

async function ensureWorkspaceVisible(page) {
  const tab = page.locator(".occumed-sidebar-workspace-tab").first();
  await tab.waitFor({ state: "attached", timeout: 15_000 });
  if (await tab.evaluate(visibleInViewport)) return;
  const menu = page.locator(".mobile-menu-button:visible").first();
  if (await menu.count()) {
    await menu.click();
    await page.waitForTimeout(220);
  }
  assert.equal(await tab.evaluate(visibleInViewport), true, "workspace tabs must become reachable from the mobile menu");
}

async function assertNoGeometryFailure(page, label) {
  const geometry = await page.evaluate(() => {
    const docWidth = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
    const selectedTabs = document.querySelectorAll(".occumed-sidebar-workspace-tab[aria-selected='true']").length;
    const audit = window.__NETWORK_MAP_GENERAL_UI__?.audit?.() || null;
    const visible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return !element.hidden && style.display !== "none" && style.visibility !== "hidden" && rect.width > 2 && rect.height > 2;
    };
    const offscreen = Array.from(document.querySelectorAll(
      ".command-search-results,.local-pop-card,.tz-legend,.modal-box,.pdf-modal-wrap,.leaflet-popup,.mapboxgl-popup",
    )).filter(visible).map((element) => {
      const rect = element.getBoundingClientRect();
      return { className: String(element.className || element.tagName), left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    }).filter((rect) => rect.left < -12 || rect.top < -12 || rect.right > innerWidth + 12 || rect.bottom > innerHeight + 12);
    return { docWidth, viewportWidth: innerWidth, selectedTabs, audit, offscreen };
  });
  assert.ok(geometry.docWidth <= geometry.viewportWidth + 3, `${label}: horizontal overflow ${geometry.docWidth} > ${geometry.viewportWidth}`);
  assert.deepEqual(geometry.offscreen, [], `${label}: visible overlays extend outside viewport`);
  assert.equal(geometry.selectedTabs, 1, `${label}: exactly one workspace tab must be selected`);
  if (geometry.audit) {
    const hardFailures = geometry.audit.failures.filter((failure) => !failure.includes("application workspace collapsed"));
    assert.deepEqual(hardFailures, [], `${label}: UI integrity failures: ${hardFailures.join("; ")}`);
  }
}

async function assertWorkspace(page, label) {
  await ensureWorkspaceVisible(page);
  const tab = page.getByRole("tab", { name: new RegExp(label, "i") });
  await tab.waitFor({ state: "visible", timeout: 10_000 });
  await tab.click();
  await page.waitForTimeout(180);
  assert.equal(await tab.getAttribute("aria-selected"), "true", `${label} tab must become active`);
}

async function runCase(browser, viewport, routeVariant) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const requestFailures = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/favicon|ResizeObserver loop|Failed to load resource/i.test(text)) return;
    consoleErrors.push(text);
  });
  page.on("requestfailed", (request) => {
    if (request.url().includes("/api/") || request.url().includes("localhost") || request.url().includes("127.0.0.1")) requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || "failed"}`);
  });
  await mockApi(page);
  const label = `${browserName}/${routeVariant.name}/${viewport.name}`;
  try {
    await page.goto(`${baseUrl}/${routeVariant.suffix}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.locator("#root").waitFor({ state: "attached", timeout: 20_000 });
    await page.locator(".app-wrap").waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForFunction(() => Boolean(window.__NETWORK_MAP_LEAFLET_LIFECYCLE__) && Boolean(window.__NETWORK_MAP_MAPBOX_LIFECYCLE__) && Boolean(window.__NETWORK_MAP_NETWORK_PIPELINE__), null, { timeout: 20_000 });
    await page.waitForTimeout(700);

    await assertNoGeometryFailure(page, `${label}/initial`);
    for (const workspace of ["Providers", "Map Tools", "Finder", "Explorer", "Providers"]) {
      await assertWorkspace(page, workspace);
      await assertNoGeometryFailure(page, `${label}/${workspace}`);
    }

    const providerChecks = await page.locator("#sidebar input[type='checkbox'].layer-check").count();
    if (providerChecks > 0) {
      const checked = await page.locator("#sidebar input[type='checkbox'].layer-check:checked").count();
      assert.equal(checked, 0, `${label}: provider sources must remain opt-in by default`);
    }

    const externalPanels = await page.locator("body > .occumed-external-panel, body > [data-occumed-external-panel]").count();
    assert.equal(externalPanels, 0, `${label}: sidebar workspaces must not spawn stray top-level panels`);

    if (routeVariant.name === "p2") {
      assert.ok((await page.locator(".phase-two-shell").count()) > 0, `${label}: P2 shell must render`);
    }

    assert.deepEqual(pageErrors, [], `${label}: uncaught page errors: ${pageErrors.join("; ")}`);
    assert.deepEqual(consoleErrors, [], `${label}: console errors: ${consoleErrors.join("; ")}`);
    assert.deepEqual(requestFailures, [], `${label}: same-origin request failures: ${requestFailures.join("; ")}`);
  } catch (error) {
    const base = path.join(artifactDir, `${routeVariant.name}-${viewport.name}`);
    await page.screenshot({ path: `${base}-failure.png`, fullPage: true }).catch(() => undefined);
    fs.writeFileSync(`${base}-error.txt`, `${error instanceof Error ? error.stack || error.message : String(error)}\n\nPage errors:\n${pageErrors.join("\n")}\n\nConsole errors:\n${consoleErrors.join("\n")}\n\nRequest failures:\n${requestFailures.join("\n")}`);
    throw error;
  } finally {
    await context.close();
  }
}

const browser = await browserType.launch({ headless: true });
try {
  for (const routeVariant of routes) {
    for (const viewport of viewports) await runCase(browser, viewport, routeVariant);
  }
} finally {
  await browser.close();
}

console.log(`Cross-browser acceptance passed for ${browserName}.`);

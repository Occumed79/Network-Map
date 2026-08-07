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

async function mockMapbox(page) {
  const emptyStyle = {
    version: 8,
    name: "Network Map deterministic CI style",
    sources: {},
    layers: [
      {
        id: "ci-background",
        type: "background",
        paint: { "background-color": "#e7edf3" },
      },
    ],
  };
  await page.route("https://api.mapbox.com/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes("/styles/v1/")) return json(route, emptyStyle);
    return route.fulfill({ status: 204, body: "" });
  });
  await page.route("https://events.mapbox.com/**", (route) => route.fulfill({ status: 204, body: "" }));
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

async function workspaceTab(page, label) {
  return page.locator(".occumed-sidebar-workspace-tab").filter({ hasText: label }).first();
}

async function assertWorkspace(page, label) {
  await ensureWorkspaceVisible(page);
  const tab = await workspaceTab(page, label);
  await tab.waitFor({ state: "visible", timeout: 10_000 });
  await tab.click();
  await page.waitForTimeout(180);
  assert.equal(await tab.getAttribute("aria-selected"), "true", `${label} tab must become active`);
}

async function waitForRuntimeOwners(page, label) {
  try {
    await page.waitForFunction(() => Boolean(window.__NETWORK_MAP_LEAFLET_LIFECYCLE__)
      && Boolean(window.__NETWORK_MAP_MAPBOX_LIFECYCLE__)
      && Boolean(window.__NETWORK_MAP_REQUEST_PIPELINE__), null, { timeout: 20_000 });
  } catch (error) {
    const runtimeSnapshot = await page.evaluate(() => ({
      leaflet: Boolean(window.__NETWORK_MAP_LEAFLET_LIFECYCLE__),
      mapbox: Boolean(window.__NETWORK_MAP_MAPBOX_LIFECYCLE__),
      requests: Boolean(window.__NETWORK_MAP_REQUEST_PIPELINE__),
      mapboxSurface: Boolean(document.querySelector(".mapboxgl-map")),
      leafletSurface: Boolean(document.querySelector(".leaflet-container")),
    }));
    throw new Error(`${label}: runtime owners did not initialize: ${JSON.stringify(runtimeSnapshot)}\n${error instanceof Error ? error.message : String(error)}`);
  }
}

async function waitForWorkspaceReady(page, label) {
  try {
    await page.waitForFunction(() => document.documentElement.dataset.occumedWorkspaceReady === "true"
      && document.querySelectorAll(".occumed-sidebar-workspace-tab[aria-selected='true']").length === 1, null, { timeout: 20_000 });
  } catch (error) {
    const workspaceSnapshot = await page.evaluate(() => ({
      ready: document.documentElement.dataset.occumedWorkspaceReady || null,
      active: document.documentElement.dataset.occumedworkspace || null,
      tabs: Array.from(document.querySelectorAll(".occumed-sidebar-workspace-tab")).map((tab) => ({
        text: tab.textContent?.trim() || "",
        selected: tab.getAttribute("aria-selected"),
      })),
      owner: Boolean(window.__NETWORK_MAP_SIDEBAR_WORKSPACES__),
    }));
    throw new Error(`${label}: sidebar workspace controller did not become ready: ${JSON.stringify(workspaceSnapshot)}\n${error instanceof Error ? error.message : String(error)}`);
  }
}

async function waitForVisibleMapSurface(page, label) {
  const selector = ".mapboxgl-map,.leaflet-container,.map-shell,.map-area";
  try {
    await page.waitForFunction((surfaceSelector) => {
      const visible = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return !element.hidden
          && style.display !== "none"
          && style.visibility !== "hidden"
          && Number(style.opacity || "1") > 0
          && rect.width > 2
          && rect.height > 2
          && rect.right > 0
          && rect.bottom > 0
          && rect.left < innerWidth
          && rect.top < innerHeight;
      };
      return Array.from(document.querySelectorAll(surfaceSelector)).some(visible);
    }, selector, { timeout: 20_000 });
  } catch (error) {
    const surfaceSnapshot = await page.evaluate((surfaceSelector) => Array.from(document.querySelectorAll(surfaceSelector)).map((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        className: String(element.className || element.tagName),
        hidden: element instanceof HTMLElement ? element.hidden : null,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
      };
    }), selector);
    throw new Error(`${label}: no usable map surface became visible: ${JSON.stringify(surfaceSnapshot)}\n${error instanceof Error ? error.message : String(error)}`);
  }
}

async function teardownTrackedMapboxMaps(page, label) {
  if (page.isClosed()) return;
  const result = await page.evaluate(() => {
    const lifecycle = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__;
    const maps = lifecycle?.getMaps?.() || [];
    const errors = [];
    let removed = 0;
    for (const map of [...maps]) {
      try {
        map.remove();
        removed += 1;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
    return {
      removed,
      errors,
      remaining: lifecycle?.getDiagnostics?.().mapCount ?? 0,
    };
  }).catch((error) => ({ removed: 0, errors: [error instanceof Error ? error.message : String(error)], remaining: -1 }));
  if (result.errors.length || result.remaining > 0) {
    console.warn(`${label}: Mapbox teardown diagnostics ${JSON.stringify(result)}`);
  }
  await page.waitForTimeout(60).catch(() => undefined);
}

function isExpectedSupersessionAbort(request) {
  if (request.method() !== "GET") return false;
  const errorText = request.failure()?.errorText || "";
  if (!/ERR_ABORTED|NS_BINDING_ABORTED|cancelled|canceled/i.test(errorText)) return false;
  try {
    const pathname = new URL(request.url()).pathname;
    return pathname === "/api/map-inventory"
      || pathname === "/api/provider-explorer/density"
      || pathname === "/api/provider-explorer/hex";
  } catch {
    return false;
  }
}

async function assertConsoleHealth(page, consoleErrors, label) {
  if (!consoleErrors.length) return;
  if (browserName !== "firefox") {
    assert.deepEqual(consoleErrors, [], `${label}: console errors: ${consoleErrors.join("; ")}`);
    return;
  }
  const unexpected = consoleErrors.filter((text) => !/^Error$|^Mapbox 2D map failed Error$/i.test(text.trim()));
  const leafletAlive = await page.locator(".leaflet-container").count();
  assert.equal(leafletAlive > 0, true, `${label}: Firefox Mapbox fallback is acceptable only when Leaflet remains mounted`);
  assert.deepEqual(unexpected, [], `${label}: unexpected Firefox console errors: ${unexpected.join("; ")}`);
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
  const expectedAborts = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/favicon|ResizeObserver loop|Failed to load resource/i.test(text)) return;
    consoleErrors.push(text);
  });
  page.on("requestfailed", (request) => {
    if (isExpectedSupersessionAbort(request)) {
      expectedAborts.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || "aborted"}`);
      return;
    }
    if (request.url().includes("/api/") || request.url().includes("localhost") || request.url().includes("127.0.0.1")) requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || "failed"}`);
  });
  await mockMapbox(page);
  await mockApi(page);
  const label = `${browserName}/${routeVariant.name}/${viewport.name}`;
  console.log(`START ${label}`);
  try {
    await page.goto(`${baseUrl}/${routeVariant.suffix}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.locator("#root").waitFor({ state: "attached", timeout: 20_000 });
    await page.locator(".app-wrap").waitFor({ state: "visible", timeout: 20_000 });
    await waitForRuntimeOwners(page, label);
    await waitForWorkspaceReady(page, label);
    await waitForVisibleMapSurface(page, label);
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
    await assertConsoleHealth(page, consoleErrors, label);
    assert.deepEqual(requestFailures, [], `${label}: same-origin request failures: ${requestFailures.join("; ")}`);
    if (expectedAborts.length) {
      fs.writeFileSync(path.join(artifactDir, `${routeVariant.name}-${viewport.name}-expected-aborts.txt`), expectedAborts.join("\n"));
    }
    console.log(`PASS ${label}`);
  } catch (error) {
    const base = path.join(artifactDir, `${routeVariant.name}-${viewport.name}`);
    await page.screenshot({ path: `${base}-failure.png`, fullPage: true, timeout: 5_000 }).catch(() => undefined);
    fs.writeFileSync(`${base}-error.txt`, `${error instanceof Error ? error.stack || error.message : String(error)}\n\nPage errors:\n${pageErrors.join("\n")}\n\nConsole errors:\n${consoleErrors.join("\n")}\n\nRequest failures:\n${requestFailures.join("\n")}\n\nExpected supersession aborts:\n${expectedAborts.join("\n")}`);
    throw error;
  } finally {
    await teardownTrackedMapboxMaps(page, label);
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

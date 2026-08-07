import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium, firefox, webkit } from "playwright";

const browserName = process.env.BROWSER || "chromium";
const baseUrl = process.env.NETWORK_MAP_CI_UI_URL || "http://127.0.0.1:4173";
const browserType = { chromium, firefox, webkit }[browserName];
if (!browserType) throw new Error(`Unsupported BROWSER=${browserName}`);
const artifactDir = path.resolve(process.cwd(), "test-results", `cross-browser-${browserName}`);
fs.mkdirSync(artifactDir, { recursive: true });

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];
const routes = [
  { name: "standard", suffix: "" },
  { name: "p2-preview", suffix: "?p2-preview=1" },
];

function json(route, payload, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(payload) });
}

async function installMocks(page) {
  // CI must never depend on a real Mapbox key or external network. Mapbox GL
  // receives a valid empty style so the map lifecycle can initialize and the
  // browser tests exercise our UI/engine integration deterministically.
  await page.route("https://api.mapbox.com/styles/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (/\/sprite(?:@\dx)?\.json$/i.test(url.pathname)) return json(route, {});
    if (/\/tilejson(?:\.json)?$/i.test(url.pathname)) return json(route, { tilejson: "3.0.0", tiles: [] });
    return json(route, { version: 8, name: "CI empty map style", sources: {}, layers: [] });
  });
  // Mapbox session/config endpoints can parse their response as JSON even when
  // the body is informational. Return an empty JSON object rather than 204 so
  // deterministic CI does not manufacture an Unexpected end of JSON error.
  await page.route("https://api.mapbox.com/**", async (route) => json(route, {}));
  await page.route("https://events.mapbox.com/**", async (route) => {
    await route.fulfill({ status: 204, body: "" });
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith("/health") || pathname.endsWith("/live") || pathname.endsWith("/ready")) return json(route, { ok: true, status: "ok", dependencies: [] });
    if (pathname.includes("provider-layers")) return json(route, { providers: [], count: 0, total: 0, page: 1, hasMore: false });
    if (pathname.includes("provider-explorer")) return json(route, { providers: [], cells: [], results: [], count: 0, total: 0, page: 1, hasMore: false });
    if (pathname.includes("map-inventory")) return json(route, { providers: [], count: 0, total: 0, generation: new URL(request.url()).searchParams.get("generation") || "ci", budget: { zoomBand: "metro", maxFeatures: 1500, limit: 1500, detail: "compact" } });
    if (pathname.includes("provider-sources/search") || pathname.includes("live-finder") || pathname.includes("npi-custom")) return json(route, { params: {}, results: [], providers: [], sourceResults: [], audit: { activeAdapters: [], rawResultCounts: {}, normalizedCount: 0, dedupedCount: 0, geocodedCount: 0, finalMarkerCount: 0, errorsBySource: {}, durationMs: 1 }, incomplete: false, degradedSources: [] });
    if (request.method() === "GET") return json(route, {});
    return json(route, { ok: true, success: true, id: "ci-write", uploadId: "ci-upload", accepted: 0, rejected: 0, quarantined: 0, duplicate: 0 });
  });
}

async function assertGeometry(page, label) {
  const state = await page.evaluate(() => {
    const rendered = (node) => {
      if (!(node instanceof HTMLElement)) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return !node.hidden && style.display !== "none" && style.visibility !== "hidden" && rect.width > 2 && rect.height > 2;
    };
    const intersectsViewport = (rect) => rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight;
    const surfaces = Array.from(document.querySelectorAll(".sidebar,.live-panel.open,.provider-explorer-drawer.open,.modal-box,.leaflet-popup,.mapboxgl-popup,.occumed-map-tools-panel,.command-search-results"))
      .filter(rendered)
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          name: String(node.className || node.tagName),
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          scrollWidth: node.scrollWidth,
          clientWidth: node.clientWidth,
          intersectsViewport: intersectsViewport(rect),
        };
      });
    // Responsive sidebars/drawers are intentionally translated completely
    // off-canvas while closed. They remain rendered for transition/focus
    // continuity, but they are not visible surfaces and therefore must not be
    // treated as geometry failures. Partially visible/offscreen surfaces still
    // intersect the viewport and remain subject to the strict bounds checks.
    const activeSurfaces = surfaces.filter((surface) => surface.intersectsViewport);
    return {
      innerWidth,
      innerHeight,
      docWidth: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0),
      appVisible: rendered(document.querySelector(".app-wrap")),
      mapVisible: rendered(document.querySelector(".leaflet-container,.mapboxgl-map,.map-shell,.map-area")),
      badSurfaces: activeSurfaces.filter((surface) => surface.left < -12 || surface.top < -12 || surface.right > innerWidth + 12 || surface.bottom > innerHeight + 12 || surface.scrollWidth > surface.clientWidth + 4),
    };
  });
  assert.equal(state.appVisible, true, `${label}: application shell must be visible`);
  assert.ok(state.docWidth <= state.innerWidth + 4, `${label}: document horizontal overflow ${state.docWidth} > ${state.innerWidth}`);
  assert.deepEqual(state.badSurfaces, [], `${label}: visible surface overflow/offscreen failure`);
  assert.equal(state.mapVisible, true, `${label}: a map surface must be visible`);
}

async function assertSourceDefaults(page, label) {
  const sourceLabels = ["BlueHive Providers", "Indexed Providers", "Dental Examiner Presence", "My Clinics"];
  const state = await page.evaluate((labels) => labels.map((label) => {
    const input = Array.from(document.querySelectorAll("input[type=checkbox]")).find((node) => node.getAttribute("aria-label") === label);
    return { label, found: Boolean(input), checked: input instanceof HTMLInputElement ? input.checked : null };
  }), sourceLabels);
  for (const item of state) {
    if (!item.found) continue;
    assert.equal(item.checked, false, `${label}: ${item.label} must remain opt-in`);
  }
}

async function exerciseVisibleControls(page, label) {
  const buttons = page.locator("button:visible");
  const count = await buttons.count();
  assert.ok(count > 0, `${label}: application must expose controls`);
  const iconOnlyWithoutName = await page.evaluate(() => Array.from(document.querySelectorAll("button")).filter((button) => {
    const style = getComputedStyle(button);
    const rect = button.getBoundingClientRect();
    const intersectsViewport = rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight;
    if (button.hidden || style.display === "none" || style.visibility === "hidden" || !intersectsViewport) return false;
    const text = (button.textContent || "").trim();
    const hasGraphic = Boolean(button.querySelector("svg,img"));
    return hasGraphic && !text && !button.getAttribute("aria-label") && !button.getAttribute("title");
  }).length);
  assert.equal(iconOnlyWithoutName, 0, `${label}: visible icon-only buttons need accessible names`);

  const disabledFire = await page.evaluate(() => {
    const disabled = Array.from(document.querySelectorAll("button:disabled"))[0];
    if (!(disabled instanceof HTMLButtonElement)) return false;
    let clicked = false;
    disabled.addEventListener("click", () => { clicked = true; }, { once: true });
    disabled.click();
    return clicked;
  });
  assert.equal(disabledFire, false, `${label}: disabled button must not fire action`);
}

async function runCase(browser, viewport, route) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await installMocks(page);
  const label = `${browserName}/${route.name}/${viewport.name}`;
  try {
    await page.goto(`${baseUrl}/${route.suffix}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.locator(".app-wrap").waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(800);
    await assertGeometry(page, label);
    await assertSourceDefaults(page, label);
    await exerciseVisibleControls(page, label);
    assert.deepEqual(pageErrors, [], `${label}: uncaught page errors: ${pageErrors.join("; ")}`);
    const fatalConsole = consoleErrors.filter((message) => !/favicon|ResizeObserver loop|Failed to load resource/i.test(message));
    assert.deepEqual(fatalConsole, [], `${label}: browser console errors: ${fatalConsole.join("; ")}`);
  } catch (error) {
    await page.screenshot({ path: path.join(artifactDir, `${route.name}-${viewport.name}-failure.png`), fullPage: true }).catch(() => undefined);
    fs.writeFileSync(path.join(artifactDir, `${route.name}-${viewport.name}-failure.txt`), `${error instanceof Error ? error.stack || error.message : String(error)}\n\nPage errors:\n${pageErrors.join("\n")}\n\nConsole errors:\n${consoleErrors.join("\n")}`);
    throw error;
  } finally {
    await context.close();
  }
}

const browser = await browserType.launch({ headless: true });
try {
  for (const route of routes) for (const viewport of viewports) await runCase(browser, viewport, route);
} finally {
  await browser.close();
}

console.log(`${browserName} acceptance passed for ${routes.length} routes × ${viewports.length} viewports.`);
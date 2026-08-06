import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.NETWORK_MAP_SMOKE_URL || "http://127.0.0.1:4173";
const expectHardening = process.env.NETWORK_MAP_EXPECT_HARDENING === "1";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  extraHTTPHeaders: { "Cache-Control": "no-cache" },
});
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
const providerRequests = [];
const failedRequests = [];

page.on("console", message => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", error => pageErrors.push(error.message));
page.on("request", request => {
  const requestUrl = request.url();
  if (/\/api\/(provider-layers|provider-explorer)\//.test(requestUrl)) providerRequests.push(requestUrl);
});
page.on("requestfailed", request => {
  const failure = request.failure()?.errorText || "unknown failure";
  failedRequests.push(`${request.method()} ${request.url()} — ${failure}`);
});

await page.addInitScript(() => {
  window.__smoke = { mutations: 0, longTasks: 0 };
  new MutationObserver(records => { window.__smoke.mutations += records.length; })
    .observe(document.documentElement, { subtree: true, childList: true, attributes: true });
  try {
    new PerformanceObserver(list => { window.__smoke.longTasks += list.getEntries().length; })
      .observe({ type: "longtask", buffered: true });
  } catch { /* Long Task API is optional. */ }
});

function attemptUrl(attempt) {
  const target = new URL(baseUrl);
  target.searchParams.set("production-smoke", `${Date.now()}-${attempt}`);
  return target.toString();
}

async function hardeningIsReady() {
  return page.evaluate(() => {
    const leaflet = window.__NETWORK_MAP_LEAFLET_LIFECYCLE__?.getDiagnostics?.();
    const mapbox = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getDiagnostics?.();
    const sources = window.__NETWORK_MAP_MAPBOX_SOURCE_PIPELINE__?.getDiagnostics?.();
    const requests = window.__NETWORK_MAP_REQUEST_PIPELINE__?.getStats?.();
    const sourceIds = new Set(sources?.middlewares?.map(item => item.id) || []);
    return Boolean(
      leaflet?.mapCount >= 1
      && mapbox?.mapCount >= 1
      && requests?.middleware?.some(item => item.id === "admin-auth")
      && requests?.middleware?.some(item => item.id === "provider-explorer-stability")
      && sourceIds.has("network-overlay-authority")
      && sourceIds.has("provider-type-normalization")
      && sourceIds.has("network-overlay-density-filter")
      && window.__NETWORK_MAP_OVERLAY_SYNC__
      && window.__NETWORK_MAP_SIDEBAR_WORKSPACES__,
    );
  });
}

async function openApplication() {
  const attempts = expectHardening ? 6 : 1;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    consoleErrors.length = 0;
    pageErrors.length = 0;
    providerRequests.length = 0;
    failedRequests.length = 0;
    try {
      await page.goto(attemptUrl(attempt), { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.locator(".mapbox-2d-host .mapboxgl-map").waitFor({ state: "visible", timeout: 60_000 });
      await page.locator(".mapbox-2d-host canvas").first().waitFor({ state: "visible", timeout: 60_000 });
      if (!expectHardening) return;
      await page.waitForFunction(() => {
        const sources = window.__NETWORK_MAP_MAPBOX_SOURCE_PIPELINE__?.getDiagnostics?.();
        const sourceIds = new Set(sources?.middlewares?.map(item => item.id) || []);
        return Boolean(
          window.__NETWORK_MAP_LEAFLET_LIFECYCLE__?.getDiagnostics?.().mapCount >= 1
          && window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getDiagnostics?.().mapCount >= 1
          && window.__NETWORK_MAP_REQUEST_PIPELINE__?.getStats?.().middleware?.length >= 2
          && sourceIds.has("network-overlay-authority")
          && sourceIds.has("provider-type-normalization")
          && sourceIds.has("network-overlay-density-filter")
          && window.__NETWORK_MAP_OVERLAY_SYNC__
          && window.__NETWORK_MAP_SIDEBAR_WORKSPACES__
        );
      }, undefined, { timeout: 25_000 });
      if (await hardeningIsReady()) return;
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await page.waitForTimeout(30_000);
  }
  throw lastError || new Error("Production hardening diagnostics did not become ready");
}

try {
  await openApplication();
  await page.waitForTimeout(2_000);

  assert.equal(
    await page.locator(".mapbox-2d-host .dual-engine-loading").count(),
    0,
    "Mapbox loading panel must be removed after the 2D map is ready",
  );
  assert.equal(await page.locator(".leaflet-tile:visible").count(), 0, "Leaflet raster tiles must not be visible");
  assert.deepEqual(providerRequests, [], "provider APIs must remain lazy at startup");

  const runtime = await page.evaluate(() => ({
    leaflet: window.__NETWORK_MAP_LEAFLET_LIFECYCLE__?.getDiagnostics?.(),
    mapbox: window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getDiagnostics?.(),
    sources: window.__NETWORK_MAP_MAPBOX_SOURCE_PIPELINE__?.getDiagnostics?.(),
    requests: window.__NETWORK_MAP_REQUEST_PIPELINE__?.getStats?.(),
    sidebar: window.__NETWORK_MAP_SIDEBAR_WORKSPACES__?.getActiveTab?.(),
    overlay: window.__NETWORK_MAP_OVERLAY_SYNC__?.getStats?.(),
  }));

  if (expectHardening) {
    assert.ok(runtime.leaflet?.mapCount >= 1, "Leaflet lifecycle must track the canonical map");
    assert.ok(runtime.mapbox?.mapCount >= 1, "Mapbox lifecycle must track the active map");
    assert.equal(runtime.mapbox?.initializationErrors, 0, "Mapbox lifecycle initializers must not fail");
    assert.equal(runtime.leaflet?.initializationErrors, 0, "Leaflet lifecycle initializers must not fail");
    assert.ok(runtime.sources?.sourceCount >= 1, "Mapbox source pipeline must track active GeoJSON sources");
    assert.equal(runtime.requests?.failures, 0, "request pipeline must not fail during startup");
    assert.equal(runtime.sidebar, "providers", "Providers must remain the default workspace");
  }

  const mapHost = page.locator(".mapbox-2d-host");
  const box = await mapHost.boundingBox();
  assert.ok(box && box.width > 500 && box.height > 300, "map must fill its grid cell");

  const zoomBefore = await page.evaluate(() =>
    window.__NETWORK_MAP_MAPBOX_LIFECYCLE__.getMaps()[0].getZoom(),
  );
  await page.locator(".mapbox-2d-host .mapboxgl-ctrl-zoom-in").first().click({ timeout: 10_000 });
  await page.waitForFunction(previous =>
    window.__NETWORK_MAP_MAPBOX_LIFECYCLE__.getMaps()[0].getZoom() > previous,
  zoomBefore, { timeout: 10_000 });

  const centerBefore = await page.evaluate(() => {
    const center = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__.getMaps()[0].getCenter();
    return { lat: center.lat, lng: center.lng };
  });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 35, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(750);
  const centerAfter = await page.evaluate(() => {
    const center = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__.getMaps()[0].getCenter();
    return { lat: center.lat, lng: center.lng };
  });
  assert.ok(
    Math.abs(centerAfter.lat - centerBefore.lat) > 0.00001
      || Math.abs(centerAfter.lng - centerBefore.lng) > 0.00001,
    "map drag must change the camera center",
  );

  const mapToolsTab = page.locator(".occumed-sidebar-workspace-tab[data-workspace-tab='mapTools']");
  await mapToolsTab.click({ timeout: 10_000 });
  await page.waitForFunction(() =>
    window.__NETWORK_MAP_SIDEBAR_WORKSPACES__?.getActiveTab?.() === "mapTools",
  undefined, { timeout: 10_000 });
  assert.equal(
    await page.locator(".sidebar > .occumed-sidebar-workspace-host > .occumed-map-tools-panel").count(),
    1,
    "Map Tools must remain physically docked inside the sidebar host",
  );
  const mapToolsPointerEvents = await page.locator(".occumed-map-tools-panel").evaluate(node =>
    getComputedStyle(node).pointerEvents,
  );
  assert.notEqual(mapToolsPointerEvents, "none", "Map Tools must accept pointer interaction");

  const providersTab = page.locator(".occumed-sidebar-workspace-tab[data-workspace-tab='providers']");
  await providersTab.click({ timeout: 10_000 });
  await page.waitForFunction(() =>
    window.__NETWORK_MAP_SIDEBAR_WORKSPACES__?.getActiveTab?.() === "providers",
  undefined, { timeout: 10_000 });

  const twoD = page.locator(".map-dimension-toggle button[data-map-mode='2d']");
  assert.equal(await twoD.isEnabled(), true, "2D map control must remain enabled");
  assert.equal(await page.locator(".dual-engine-vortex.active").count(), 0, "transition overlay must not trap the UI");

  const mutationsBeforeSettle = await page.evaluate(() => window.__smoke.mutations);
  await page.waitForTimeout(15_000);
  const settled = await page.evaluate(() => ({ ...window.__smoke }));
  assert.ok(settled.mutations - mutationsBeforeSettle < 100, "DOM mutations must settle after interaction");
  assert.ok(settled.longTasks < 20, "page must not accumulate excessive long tasks");
  assert.deepEqual(providerRequests, [], "provider APIs must remain idle without an enabled source");
  assert.equal(pageErrors.length, 0, `page errors: ${pageErrors.join("\n")}`);
  assert.equal(consoleErrors.length, 0, `console errors: ${consoleErrors.join("\n")}`);

  const relevantFailures = failedRequests.filter(entry =>
    !entry.includes("ERR_ABORTED")
    && !entry.includes("mapbox.com/events/v2"),
  );
  assert.equal(relevantFailures.length, 0, `failed requests: ${relevantFailures.join("\n")}`);
} finally {
  await browser.close();
}

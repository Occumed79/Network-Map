import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.env.NETWORK_MAP_SMOKE_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on("console", message => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

await page.addInitScript(() => {
  window.__smoke = { providerRequests: [], mutations: 0, longTasks: 0 };
  const originalFetch = window.fetch;
  window.fetch = function smokeFetch(input, init) {
    const requestUrl = input instanceof Request ? input.url : String(input);
    if (/\/api\/(provider-layers|provider-explorer)\//.test(requestUrl)) window.__smoke.providerRequests.push(requestUrl);
    if (/\/api\/map-tiles\//.test(requestUrl)) window.__smoke.tileProxyRequests = (window.__smoke.tileProxyRequests || []).concat(requestUrl);
    return originalFetch.call(this, input, init);
  };
  new MutationObserver(records => { window.__smoke.mutations += records.length; })
    .observe(document.documentElement, { subtree: true, childList: true, attributes: true });
  try {
    new PerformanceObserver(list => { window.__smoke.longTasks += list.getEntries().length; })
      .observe({ type: "longtask", buffered: true });
  } catch { /* Long Task API is optional. */ }
});

function rectValue(rect) {
  if (!rect) return null;
  return {
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

async function workspaceSnapshot(tab, panelSelector = "") {
  return page.evaluate(({ tab, panelSelector }) => {
    const sidebar = document.querySelector(".sidebar.occumed-sidebar-workspace-scope");
    const tabs = document.querySelector(".occumed-sidebar-workspace-tabs");
    const map = document.querySelector(".map-wrap");
    const panel = panelSelector ? document.querySelector(panelSelector) : null;
    const selected = Array.from(document.querySelectorAll(".occumed-sidebar-workspace-tab[aria-selected='true']"));
    const visible = element => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) !== 0 && rect.width > 40 && rect.height > 40;
    };
    const toRect = element => {
      if (!(element instanceof HTMLElement)) return null;
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    return {
      expectedTab: tab,
      reportedTab: document.documentElement.dataset.occumedworkspace || "",
      integrity: document.documentElement.dataset.occumedUiIntegrity || "",
      sidebar: toRect(sidebar),
      tabs: toRect(tabs),
      map: toRect(map),
      panel: toRect(panel),
      panelVisible: visible(panel),
      activeCount: selected.length,
      activeTab: selected[0] instanceof HTMLElement ? selected[0].dataset.workspaceTab || "" : "",
      liveVisible: visible(document.querySelector(".live-panel")),
      explorerVisible: visible(document.querySelector(".provider-explorer-drawer")),
      panelScrollOverflow: panel instanceof HTMLElement ? panel.scrollWidth - panel.clientWidth : 0,
      viewportWidth: window.innerWidth,
      runtimeAudit: window.__NETWORK_MAP_UI_INTEGRITY__?.audit?.() || null,
    };
  }, { tab, panelSelector });
}

async function assertWorkspace(tab, panelSelector = "") {
  const button = page.locator(`.occumed-sidebar-workspace-tab[data-workspace-tab='${tab}']`);
  await button.waitFor({ state: "visible", timeout: 15_000 });
  await button.click();
  await page.waitForFunction(expectedTab => {
    const selected = document.querySelector(`.occumed-sidebar-workspace-tab[data-workspace-tab='${expectedTab}']`);
    return selected?.getAttribute("aria-selected") === "true" && document.documentElement.dataset.occumedworkspace === expectedTab;
  }, tab, { timeout: 8_000 });

  if (panelSelector) {
    await page.waitForFunction(selector => {
      const panel = document.querySelector(selector);
      if (!(panel instanceof HTMLElement)) return false;
      const style = getComputedStyle(panel);
      const rect = panel.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 200 && rect.height > 200;
    }, panelSelector, { timeout: 8_000 });
  }

  await page.waitForTimeout(450);
  const snapshot = await workspaceSnapshot(tab, panelSelector);
  assert.equal(snapshot.reportedTab, tab, `${tab} must own the workspace dataset`);
  assert.equal(snapshot.activeCount, 1, `${tab} must leave exactly one selected tab`);
  assert.equal(snapshot.activeTab, tab, `${tab} must remain the selected tab`);
  assert.ok(snapshot.sidebar, `${tab} sidebar must exist`);
  assert.ok(snapshot.tabs, `${tab} tab strip must exist`);
  assert.ok(snapshot.map, `${tab} map must exist`);
  assert.ok(snapshot.sidebar.width >= 275 && snapshot.sidebar.width <= 345, `${tab} sidebar width must remain stable`);
  assert.ok(snapshot.tabs.left >= snapshot.sidebar.left - 2 && snapshot.tabs.right <= snapshot.sidebar.right + 2, `${tab} tabs must not overflow the sidebar`);
  assert.ok(snapshot.map.width > 420, `${tab} map must retain usable width`);
  assert.ok(snapshot.map.right >= snapshot.viewportWidth - 18, `${tab} must not leave a phantom right-side column`);
  assert.ok(snapshot.map.left >= snapshot.sidebar.right + 4, `${tab} map must not overlap the sidebar`);
  assert.equal(snapshot.panelScrollOverflow <= 2, true, `${tab} panel must not overflow horizontally`);

  if (tab === "liveFinder") {
    assert.equal(snapshot.liveVisible, true, "Finder panel must be visible");
    assert.equal(snapshot.explorerVisible, false, "Explorer must be hidden while Finder is active");
  } else if (tab === "explorer") {
    assert.equal(snapshot.explorerVisible, true, "Explorer panel must be visible");
    assert.equal(snapshot.liveVisible, false, "Finder must be hidden while Explorer is active");
  } else {
    assert.equal(snapshot.liveVisible, false, `${tab} must hide Finder`);
    assert.equal(snapshot.explorerVisible, false, `${tab} must hide Explorer`);
  }

  if (panelSelector) {
    assert.equal(snapshot.panelVisible, true, `${tab} content panel must be visible`);
    assert.ok(Math.abs(snapshot.panel.left - snapshot.sidebar.left) <= 6, `${tab} panel must align to sidebar left`);
    assert.ok(Math.abs(snapshot.panel.width - snapshot.sidebar.width) <= 6, `${tab} panel must match sidebar width`);
    assert.ok(Math.abs(snapshot.panel.top - snapshot.tabs.bottom) <= 8, `${tab} panel must begin below tabs`);
    assert.ok(Math.abs(snapshot.panel.bottom - snapshot.sidebar.bottom) <= 8, `${tab} panel must end with sidebar`);
  }

  if (snapshot.runtimeAudit) {
    assert.equal(snapshot.runtimeAudit.healthy, true, `${tab} runtime UI audit failed: ${snapshot.runtimeAudit.failures?.join(", ")}`);
  }
}

try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  await page.locator(".mapbox-2d-host .mapboxgl-map").waitFor({ state: "visible", timeout: 45_000 });
  await page.locator(".mapbox-2d-host canvas").first().waitFor({ state: "visible", timeout: 45_000 });
  await page.locator(".occumed-sidebar-workspace-tabs").waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForTimeout(2_000);

  assert.equal(
    await page.locator(".mapbox-2d-host .dual-engine-loading").count(),
    0,
    "Mapbox loading panel must be removed after the 2D map is ready",
  );

  const initial = await page.evaluate(() => ({ ...window.__smoke }));
  assert.deepEqual(initial.providerRequests, [], "provider APIs must be lazy at startup");
  assert.deepEqual(initial.tileProxyRequests || [], [], "2D must not request raster proxy tiles");
  assert.equal(await page.locator(".leaflet-tile:visible").count(), 0, "Leaflet raster tiles must not be visible");

  await assertWorkspace("providers");
  await assertWorkspace("mapTools", ".occumed-sidebar-workspace-host > .occumed-map-tools-panel");
  await assertWorkspace("liveFinder", ".live-panel.open");
  assert.equal(
    await page.locator(".live-panel button", { hasText: /leadership export/i }).count(),
    0,
    "obsolete Leadership export control must remain removed",
  );
  await assertWorkspace("explorer", ".provider-explorer-drawer.open");
  await assertWorkspace("liveFinder", ".live-panel.open");
  await assertWorkspace("providers");

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(500);
  await assertWorkspace("mapTools", ".occumed-sidebar-workspace-host > .occumed-map-tools-panel");
  await assertWorkspace("liveFinder", ".live-panel.open");
  await assertWorkspace("explorer", ".provider-explorer-drawer.open");
  await assertWorkspace("providers");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(500);
  const map = page.locator(".mapbox-2d-host");
  await page.locator(".mapbox-2d-host .mapboxgl-ctrl-zoom-in").first().click();
  await map.hover();
  await page.mouse.wheel(0, -300);
  const box = await map.boundingBox();
  assert.ok(box && box.width > 500 && box.height > 300, "map must fill its grid cell");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 30, { steps: 8 });
  await page.mouse.up();

  const threeD = page.locator(".map-dimension-toggle button[data-map-mode='3d']");
  await threeD.click();
  await page.waitForFunction(() => {
    const button = document.querySelector(".map-dimension-toggle button[data-map-mode='3d']");
    return button instanceof HTMLButtonElement && !button.disabled;
  }, { timeout: 45_000 });
  assert.equal(await threeD.isEnabled(), true, "3D toggle must recover after success or failure");
  const twoD = page.locator(".map-dimension-toggle button[data-map-mode='2d']");
  await twoD.click();
  await page.waitForTimeout(1_500);
  assert.equal(await twoD.isEnabled(), true);
  assert.equal(await page.locator(".dual-engine-vortex.active").count(), 0, "transition overlay must close");

  const mutationsBeforeSettle = await page.evaluate(() => window.__smoke.mutations);
  await page.waitForTimeout(30_000);
  const settled = await page.evaluate(() => ({ ...window.__smoke }));
  assert.ok(settled.mutations - mutationsBeforeSettle < 70, "DOM mutations must settle");
  assert.ok(settled.longTasks < 10, "page must not accumulate long tasks");
  assert.deepEqual(settled.providerRequests, [], "provider APIs must remain idle without an enabled source");
  assert.equal(consoleErrors.length, 0, `console errors: ${consoleErrors.join("\n")}`);
} finally {
  await browser.close();
}

import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const baseUrl = process.env.NETWORK_MAP_CI_UI_URL || "http://127.0.0.1:4173";
const browserName = process.env.NETWORK_MAP_BROWSER || "chromium";
const browserType = { chromium, webkit }[browserName];
if (!browserType) throw new Error(`Unsupported browser ${browserName}`);

function json(route, payload, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(payload) });
}

async function installMocks(page) {
  const emptyStyle = {
    version: 8,
    name: "Sidebar regression CI",
    sources: {},
    layers: [{ id: "ci-background", type: "background", paint: { "background-color": "#e7edf3" } }],
  };

  await page.route("https://api.mapbox.com/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes("/styles/v1/")) return json(route, emptyStyle);
    return route.fulfill({ status: 204, body: "" });
  });
  await page.route("https://events.mapbox.com/**", (route) => route.fulfill({ status: 204, body: "" }));
  await page.route("https://nominatim.openstreetmap.org/**", (route) => json(route, []));
  await page.route("https://maps.googleapis.com/**", (route) => json(route, { results: [], status: "ZERO_RESULTS" }));

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") return json(route, { ok: true, success: true, id: "sidebar-ci" });
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (pathname.endsWith("/revision")) return json(route, { revision: "sidebar-regression-ci" });
    if (pathname.includes("provider-explorer/density") || pathname.includes("provider-explorer/hex")) {
      return json(route, {
        total: 28,
        cells: [
          { lat: 34.05, lng: -118.24, count: 18 },
          { lat: 36.17, lng: -115.14, count: 10 },
        ],
      });
    }
    if (pathname.includes("provider-explorer/map")) {
      return json(route, { providers: [], total: 0, page: 1, hasMore: false });
    }
    if (pathname.includes("provider-explorer")) {
      return json(route, { providers: [], total: 0, page: 1, hasMore: false, stored_count: 0, live_count: 0, live_only: [] });
    }
    if (pathname.includes("provider-category-layers")) {
      return json(route, { providers: [], total: 0, count: 0, loaded: 0, page: 1, limit: 2000, hasMore: false, visibleCapped: false });
    }
    if (pathname.includes("naccho-lhd") || pathname.includes("provider-layers")) {
      return json(route, { providers: [], total: 0, count: 0, loaded: 0, page: 1, hasMore: false, visibleCapped: false });
    }
    if (pathname.includes("health") || pathname.includes("ready")) return json(route, { ok: true, status: "ok" });
    if (pathname.includes("search") || pathname.includes("finder") || pathname.includes("npi")) {
      return json(route, { providers: [], results: [], items: [], total: 0 });
    }
    if (pathname.includes("inventory") || pathname.includes("coverage")) return json(route, { providers: [], total: 0, cells: [] });
    return json(route, {});
  });
}

async function activateWorkspace(page, label) {
  const tab = page.locator(".occumed-sidebar-workspace-tab").filter({ hasText: label }).first();
  await tab.waitFor({ state: "visible", timeout: 15_000 });
  await tab.click();
  await page.waitForFunction((expected) => Array.from(document.querySelectorAll(".occumed-sidebar-workspace-tab"))
    .some((candidate) => candidate.textContent?.includes(expected) && candidate.getAttribute("aria-selected") === "true"), label, { timeout: 10_000 });
}

async function assertButtonsHittable(page, selector, label) {
  const root = page.locator(selector);
  const buttons = root.locator("button:not(:disabled)");
  const failures = [];
  const count = await buttons.count();

  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    if (!(await button.isVisible())) continue;

    // Sidebar workspaces intentionally scroll. A control that is below the
    // fold is not a dead control, so first bring the entire target into the
    // actual clipped viewport and only then test the pointer hit target.
    await button.scrollIntoViewIfNeeded();
    await page.waitForTimeout(20);

    const result = await button.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const x = Math.min(innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
      const y = Math.min(innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
      const hit = document.elementFromPoint(x, y);
      const ok = style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity || "1") > 0
        && rect.width > 2
        && rect.height > 2
        && rect.left >= 0
        && rect.top >= 0
        && rect.right <= innerWidth
        && rect.bottom <= innerHeight
        && (hit === element || Boolean(hit && element.contains(hit)));
      return ok ? null : {
        label: `${element.textContent || element.getAttribute("aria-label") || "button"}`.replace(/\s+/g, " ").trim(),
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
        hit: hit instanceof HTMLElement ? `${hit.tagName}.${hit.className}` : String(hit),
      };
    });
    if (result) failures.push(result);
  }

  assert.deepEqual(failures, [], `${label}: enabled buttons must be reachable and real pointer hit targets`);
}

async function explorerCounts(page) {
  return page.evaluate(() => ({
    pins: window.__NETWORK_MAP_PROVIDER_EXPLORER_NATIVE__?.getSnapshot?.("pins")?.featureCount || 0,
    aggregate: window.__NETWORK_MAP_PROVIDER_EXPLORER_NATIVE__?.getSnapshot?.("aggregate")?.featureCount || 0,
    dots: window.__NETWORK_MAP_PROVIDER_EXPLORER_NATIVE__?.getSnapshot?.("dots")?.featureCount || 0,
    live: window.__NETWORK_MAP_PROVIDER_EXPLORER_NATIVE__?.getSnapshot?.("live")?.featureCount || 0,
    gaps: window.__NETWORK_MAP_PROVIDER_EXPLORER_NATIVE__?.getSnapshot?.("gaps")?.featureCount || 0,
  }));
}

async function assertWorkspaceButtons(page, label) {
  await activateWorkspace(page, label);
  const selector = label === "Providers"
    ? ".sidebar.occumed-sidebar-workspace-scope"
    : label === "Map Tools"
      ? ".occumed-map-tools-panel"
      : label === "Finder"
        ? ".live-panel.open"
        : ".provider-explorer-drawer.open";
  await page.locator(selector).waitFor({ state: "visible", timeout: 10_000 });
  await assertButtonsHittable(page, selector, `${label} workspace`);
}

async function switchMode(page, mode) {
  const button = page.locator(`.map-dimension-toggle button[data-map-mode="${mode}"]`).first();
  await button.waitFor({ state: "visible", timeout: 10_000 });
  if (await page.evaluate((expected) => window.__NETWORK_MAP_GLOBE__?.getMode?.() === expected, mode)) return;
  await button.click();
  await page.waitForFunction((expected) => window.__NETWORK_MAP_GLOBE__?.getMode?.() === expected, mode, { timeout: 35_000 });
}

const browser = await browserType.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const page = await context.newPage();
page.setDefaultTimeout(10_000);

try {
  await installMocks(page);
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(() => document.documentElement.dataset.occumedWorkspaceReady === "true", null, { timeout: 20_000 });
  await page.waitForFunction(() => Boolean(window.__NETWORK_MAP_PROVIDER_EXPLORER_INTENT__), null, { timeout: 20_000 });
  await page.waitForTimeout(900);

  await assertWorkspaceButtons(page, "Providers");
  const expectedLabels = [
    "Urgent Cares", "Occupational Health Clinics", "Dentists", "Blue Hive", "FAA Examiners", "DOT Examiners",
    "Labs", "Imaging", "Audiology", "General Practitioners", "Pharmacy", "International Providers",
    "U.S. Embassy Recommended", "Uploaded Clinics", "NACCHO Local Health Departments",
  ];
  for (const label of expectedLabels) {
    await page.locator(`input[aria-label="${label}"]`).waitFor({ state: "visible", timeout: 10_000 });
  }
  assert.equal(await page.locator('input[aria-label="Indexed Providers"]:visible').count(), 0, "Legacy Indexed Providers toggle must not remain visible");

  await assertWorkspaceButtons(page, "Map Tools");
  await assertWorkspaceButtons(page, "Finder");
  await assertWorkspaceButtons(page, "Explorer");

  await page.waitForTimeout(750);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.providerExplorerVisualizationActive), "false", "Explorer visualization must begin explicitly off");
  assert.deepEqual(await explorerCounts(page), { pins: 0, aggregate: 0, dots: 0, live: 0, gaps: 0 }, "Provider Explorer must not render data before a visualization is selected");

  const close = page.getByRole("button", { name: "Close Provider Explorer" });
  const closeGeometry = await close.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    return { width: rect.width, height: rect.height, scrollWidth: button.scrollWidth, clientWidth: button.clientWidth };
  });
  assert.ok(closeGeometry.width >= 60, `Explorer Close width is too small: ${closeGeometry.width}`);
  assert.ok(closeGeometry.height >= 28, `Explorer Close height is too small: ${closeGeometry.height}`);
  assert.ok(closeGeometry.scrollWidth <= closeGeometry.clientWidth + 2, "Explorer Close text must not wrap or overflow");

  const explorer = page.locator(".provider-explorer-drawer.open");
  await explorer.locator(".provider-visualization-grid button").filter({ hasText: /^Density$/ }).click();
  await page.waitForFunction(() => document.documentElement.dataset.providerExplorerVisualizationActive === "true");
  await page.waitForFunction(() => (window.__NETWORK_MAP_PROVIDER_EXPLORER_NATIVE__?.getSnapshot?.("aggregate")?.featureCount || 0) === 2, null, { timeout: 10_000 });

  await close.click();
  await page.waitForFunction(() => document.documentElement.dataset.occumedworkspace === "providers", null, { timeout: 10_000 });
  assert.deepEqual(await explorerCounts(page), { pins: 0, aggregate: 0, dots: 0, live: 0, gaps: 0 }, "Closing Explorer must clear Explorer-owned map overlays");

  await switchMode(page, "3d");
  for (const workspace of ["Providers", "Map Tools", "Finder", "Explorer"]) await assertWorkspaceButtons(page, workspace);
  await switchMode(page, "2d");
  for (const workspace of ["Providers", "Map Tools", "Finder", "Explorer"]) await assertWorkspaceButtons(page, workspace);

  console.log(`Sidebar regression acceptance passed for ${browserName}.`);
} finally {
  await context.close();
  await browser.close();
}

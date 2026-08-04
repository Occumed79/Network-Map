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
    const url = input instanceof Request ? input.url : String(input);
    if (/\/api\/(provider-layers|provider-explorer)\//.test(url)) window.__smoke.providerRequests.push(url);
    return originalFetch.call(this, input, init);
  };
  new MutationObserver(records => { window.__smoke.mutations += records.length; })
    .observe(document.documentElement, { subtree: true, childList: true, attributes: true });
  try {
    new PerformanceObserver(list => { window.__smoke.longTasks += list.getEntries().length; })
      .observe({ type: "longtask", buffered: true });
  } catch { /* Long Task API is optional. */ }
});

try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  await page.locator(".leaflet-container").waitFor({ state: "visible" });
  await page.waitForTimeout(2_000);

  const initial = await page.evaluate(() => ({ ...window.__smoke }));
  assert.deepEqual(initial.providerRequests, [], "provider APIs must be lazy at startup");

  const map = page.locator(".leaflet-container");
  const sidebarButton = page.locator(".sidebar button:visible").first();
  await sidebarButton.click({ timeout: 5_000 });
  await page.locator(".leaflet-control-zoom-in").click();
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
  assert.ok(settled.mutations - mutationsBeforeSettle < 50, "DOM mutations must settle");
  assert.ok(settled.longTasks < 10, "page must not accumulate long tasks");
  assert.deepEqual(settled.providerRequests, [], "provider APIs must remain idle without an enabled source");
  assert.equal(consoleErrors.length, 0, `console errors: ${consoleErrors.join("\n")}`);
} finally {
  await browser.close();
}

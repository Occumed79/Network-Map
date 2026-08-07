import { chromium, webkit } from "playwright";

const browserName = process.env.NETWORK_MAP_BROWSER || "chromium";
const browserType = { chromium, webkit }[browserName];
if (!browserType) throw new Error(`Unsupported browser ${browserName}`);
const baseUrl = process.env.NETWORK_MAP_CI_UI_URL || "http://127.0.0.1:4173";
const mark = (stage, detail = "") => process.stdout.write(`POSTIDLE ${browserName} ${stage}${detail ? ` ${detail}` : ""}\n`);
const json = (route, payload, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(payload) });

const browser = await browserType.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: "reduce" });
const page = await context.newPage();
page.setDefaultTimeout(10_000);

await page.route("https://api.mapbox.com/**", async (route) => {
  const pathname = new URL(route.request().url()).pathname;
  if (pathname.includes("/styles/v1/")) {
    return json(route, { version: 8, name: "post-idle-probe", sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": "#e7edf3" } }] });
  }
  return route.fulfill({ status: 204, body: "" });
});
await page.route("https://events.mapbox.com/**", route => route.fulfill({ status: 204, body: "" }));
await page.route("**/api/**", async (route) => {
  const pathname = new URL(route.request().url()).pathname;
  if (pathname.includes("provider-layers")) return json(route, { providers: [], total: 0, page: 1, hasMore: false });
  if (pathname.includes("provider-explorer/density") || pathname.includes("provider-explorer/hex")) return json(route, { cells: [], total: 0 });
  if (pathname.includes("provider-explorer")) return json(route, { providers: [], total: 0, page: 1, hasMore: false, stored_count: 0, live_count: 0, live_only: [] });
  if (pathname.includes("health") || pathname.includes("ready") || pathname.includes("live")) return json(route, { ok: true, status: "ok" });
  return json(route, {});
});

await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
await page.locator(".app-wrap").waitFor({ state: "visible", timeout: 20_000 });
await page.waitForFunction(() => Boolean(window.__NETWORK_MAP_MAPBOX_LIFECYCLE__) && document.documentElement.dataset.occumedWorkspaceReady === "true", null, { timeout: 20_000 });
mark("ready");

await page.waitForTimeout(700);
mark("after-700ms");

const basic = await page.evaluate(() => ({
  width: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0),
  viewport: innerWidth,
  selected: document.querySelectorAll(".occumed-sidebar-workspace-tab[aria-selected='true']").length,
  generalState: document.documentElement.dataset.occumedGeneralUi || null,
  lastAudit: window.__NETWORK_MAP_GENERAL_UI__?.lastResult?.() || null,
  owners: window.__NETWORK_MAP_RUNTIME_OWNERSHIP__?.snapshot?.().owners.map(owner => owner.id) || [],
}));
mark("basic-returned", JSON.stringify(basic));

mark("audit-start");
const audit = await page.evaluate(() => window.__NETWORK_MAP_GENERAL_UI__?.audit?.() || null);
mark("audit-returned", JSON.stringify(audit));

mark("overlay-start");
const overlays = await page.evaluate(() => Array.from(document.querySelectorAll(
  ".command-search-results,.local-pop-card,.tz-legend,.modal-box,.pdf-modal-wrap,.leaflet-popup,.mapboxgl-popup",
)).map(element => {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return { className: String(element.className || element.tagName), display: style.display, visibility: style.visibility, width: rect.width, height: rect.height };
}));
mark("overlay-returned", JSON.stringify(overlays));

process.exit(0);

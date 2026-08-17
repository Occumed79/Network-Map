import { chromium, webkit } from "playwright";

const browserName = process.env.NETWORK_MAP_BROWSER || "chromium";
const baseUrl = process.env.NETWORK_MAP_CI_UI_URL || "http://127.0.0.1:4173";
const browserType = { chromium, webkit }[browserName];
if (!browserType) throw new Error(`Unsupported probe browser: ${browserName}`);

const mark = (stage, detail = "") => {
  process.stdout.write(`PROBE ${browserName} ${stage}${detail ? ` ${detail}` : ""}\n`);
};

function json(route, payload, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(payload) });
}

const browser = await browserType.launch({ headless: true });
mark("browser-launched");
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const page = await context.newPage();
page.setDefaultTimeout(8_000);
page.setDefaultNavigationTimeout(20_000);

await page.route("https://api.mapbox.com/**", async (route) => {
  const url = new URL(route.request().url());
  if (url.pathname.includes("/styles/v1/")) {
    return json(route, {
      version: 8,
      name: "Network Map CI probe",
      sources: {},
      layers: [{ id: "ci-background", type: "background", paint: { "background-color": "#e7edf3" } }],
    });
  }
  return route.fulfill({ status: 204, body: "" });
});
await page.route("https://events.mapbox.com/**", (route) => route.fulfill({ status: 204, body: "" }));
await page.route("**/api/**", async (route) => {
  const request = route.request();
  const pathname = new URL(request.url()).pathname;
  if (request.method() !== "GET") return json(route, { ok: true, providers: [], records: [] });
  if (pathname.includes("provider-layers")) return json(route, { providers: [], total: 0, page: 1, hasMore: false });
  if (pathname.includes("provider-explorer/density") || pathname.includes("provider-explorer/hex")) return json(route, { cells: [], total: 0 });
  if (pathname.includes("provider-explorer")) return json(route, { providers: [], total: 0, page: 1, hasMore: false, stored_count: 0, live_count: 0, live_only: [] });
  if (pathname.includes("health") || pathname.includes("ready") || pathname.includes("live")) return json(route, { ok: true, status: "ok" });
  if (pathname.includes("search") || pathname.includes("finder") || pathname.includes("npi")) return json(route, { providers: [], results: [], items: [], total: 0 });
  if (pathname.includes("inventory") || pathname.includes("coverage")) return json(route, { providers: [], total: 0, cells: [] });
  return json(route, {});
});
mark("routes-installed");

await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
mark("domcontentloaded");
await page.locator(".app-wrap").waitFor({ state: "visible" });
mark("app-visible");
await page.waitForFunction(() => Boolean(window.__NETWORK_MAP_MAPBOX_LIFECYCLE__)
  && Boolean(window.__NETWORK_MAP_REQUEST_PIPELINE__));
mark("runtime-owners-ready");
await page.waitForFunction(() => document.documentElement.dataset.occumedWorkspaceReady === "true"
  && document.querySelectorAll(".occumed-sidebar-workspace-tab[aria-selected='true']").length === 1);
mark("workspace-ready");
await page.waitForFunction(() => {
  const visible = (element) => {
    if (!(element instanceof HTMLElement)) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return !element.hidden && style.display !== "none" && style.visibility !== "hidden"
      && Number(style.opacity || "1") > 0 && rect.width > 2 && rect.height > 2;
  };
  return Array.from(document.querySelectorAll(".mapboxgl-map,.map-shell,.map-area")).some(visible);
});
mark("map-surface-visible");

const snapshot = await page.evaluate(() => ({
  mapbox: window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getDiagnostics?.(),
  selected: document.querySelectorAll(".occumed-sidebar-workspace-tab[aria-selected='true']").length,
  width: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0),
  viewport: innerWidth,
}));
mark("snapshot-returned", JSON.stringify(snapshot));

for (const workspace of ["Providers", "Map Tools", "Finder", "Explorer", "Providers"]) {
  const tab = page.locator(".occumed-sidebar-workspace-tab").filter({ hasText: workspace }).first();
  mark("workspace-click-start", workspace);
  await tab.waitFor({ state: "visible" });
  await tab.click({ timeout: 8_000 });
  mark("workspace-click-returned", workspace);
  const selected = await tab.getAttribute("aria-selected");
  mark("workspace-selected-read", `${workspace}=${selected}`);
}

mark("assertions-finished");
process.exit(0);

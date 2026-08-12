import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const browserName = process.env.NETWORK_MAP_BROWSER || "chromium";
const browserType = { chromium, webkit }[browserName];
if (!browserType) throw new Error(`Unsupported browser ${browserName}`);
const baseUrl = process.env.NETWORK_MAP_CI_UI_URL || "http://127.0.0.1:4173";
const mark = (stage, detail = "") => process.stdout.write(`POSTIDLE ${browserName} ${stage}${detail ? ` ${detail}` : ""}\n`);
const json = (route, payload, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(payload) });

const workspaces = [
  { tab: "providers", selector: ".sidebar > .occumed-sidebar-provider-content" },
  { tab: "mapTools", selector: ".occumed-sidebar-workspace-host > .occumed-map-tools-panel" },
  { tab: "liveFinder", selector: ".live-panel.open" },
  { tab: "explorer", selector: ".provider-explorer-drawer.open" },
];

async function assertFourWorkspaceCycle(page, stage) {
  for (const definition of workspaces) {
    const tab = page.locator(`.occumed-sidebar-workspace-tab[data-workspace-tab='${definition.tab}']`);
    await tab.click();
    await page.waitForFunction((expected) => {
      const selected = document.querySelector(`.occumed-sidebar-workspace-tab[data-workspace-tab='${expected}']`);
      return document.documentElement.dataset.occumedworkspace === expected
        && selected?.getAttribute("aria-selected") === "true";
    }, definition.tab);
    await page.waitForTimeout(650);

    const snapshot = await page.evaluate(({ tabName, panelSelector }) => {
      const visible = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden"
          && Number(style.opacity || "1") > 0 && rect.width > 40 && rect.height > 40;
      };
      const panels = Array.from(document.querySelectorAll(panelSelector));
      const text = panels.map((panel) => panel.textContent || "").join(" ").replace(/\s+/g, " ").trim();
      const actionCount = panels.reduce((total, panel) => total + panel.querySelectorAll(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)",
      ).length, 0);
      const sidebar = document.querySelector(".sidebar");
      const map = document.querySelector(".map-wrap");
      const sidebarRect = sidebar?.getBoundingClientRect();
      const mapRect = map?.getBoundingClientRect();
      const liveVisible = visible(document.querySelector(".live-panel"));
      const explorerVisible = visible(document.querySelector(".provider-explorer-drawer"));
      return {
        tabName,
        reported: document.documentElement.dataset.occumedworkspace || "",
        selectedCount: document.querySelectorAll(".occumed-sidebar-workspace-tab[aria-selected='true']").length,
        panelCount: panels.length,
        panelVisible: panels.some(visible),
        textLength: text.length,
        actionCount,
        providerTool: document.body.dataset.providerTool || "",
        mapToolsDocked: tabName !== "mapTools" || Boolean(panels[0]?.closest(".occumed-sidebar-workspace-host")),
        inactiveFinderHidden: tabName === "liveFinder" || !liveVisible,
        inactiveExplorerHidden: tabName === "explorer" || !explorerVisible,
        separated: Boolean(sidebarRect && mapRect && mapRect.left >= sidebarRect.right + 4),
        audit: window.__NETWORK_MAP_UI_INTEGRITY__?.audit?.() || null,
        duplicateOwners: window.__NETWORK_MAP_RUNTIME_OWNERSHIP__?.snapshot?.().duplicateAttempts || [],
      };
    }, { tabName: definition.tab, panelSelector: definition.selector });
    mark(`${stage}-workspace`, JSON.stringify(snapshot));

    assert.equal(snapshot.reported, definition.tab, `${stage}: ${definition.tab} must own the workspace dataset`);
    assert.equal(snapshot.selectedCount, 1, `${stage}: ${definition.tab} must leave one selected tab`);
    assert.ok(snapshot.panelCount > 0, `${stage}: ${definition.tab} must mount content`);
    assert.equal(snapshot.panelVisible, true, `${stage}: ${definition.tab} content must be visible`);
    assert.ok(snapshot.textLength >= 24, `${stage}: ${definition.tab} content must not be blank`);
    assert.ok(snapshot.actionCount > 0, `${stage}: ${definition.tab} must expose an enabled control`);
    assert.equal(snapshot.mapToolsDocked, true, `${stage}: Map Tools must remain docked in the sidebar`);
    assert.equal(snapshot.inactiveFinderHidden, true, `${stage}: inactive Finder must stay hidden`);
    assert.equal(snapshot.inactiveExplorerHidden, true, `${stage}: inactive Explorer must stay hidden`);
    assert.equal(snapshot.separated, true, `${stage}: sidebar must not overlap the map`);
    assert.deepEqual(snapshot.duplicateOwners, [], `${stage}: runtime owners must remain unique`);
    if (snapshot.audit) {
      assert.equal(snapshot.audit.healthy, true, `${stage}: ${definition.tab} audit failed: ${snapshot.audit.failures?.join(", ")}`);
    }
    if (definition.tab === "providers") {
      assert.equal(snapshot.providerTool, "", `${stage}: Providers must not retain stale Finder state`);
    }
  }
}

const browser = await browserType.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: "reduce" });
const page = await context.newPage();
page.setDefaultTimeout(10_000);
let traceActive = false;
page.on("console", (message) => {
  const text = message.text();
  if (text.startsWith("OWNERTRACE ")) mark("owner-trace", text.slice("OWNERTRACE ".length));
});
page.on("request", (request) => {
  if (!traceActive) return;
  const url = new URL(request.url());
  if (url.origin !== new URL(baseUrl).origin || !/\.(?:js|css)$/.test(url.pathname)) return;
  mark("asset-request", url.pathname.split("/").pop() || url.pathname);
});
page.on("response", (response) => {
  if (!traceActive) return;
  const url = new URL(response.url());
  if (url.origin !== new URL(baseUrl).origin || !/\.(?:js|css)$/.test(url.pathname)) return;
  mark("asset-response", `${response.status()} ${url.pathname.split("/").pop() || url.pathname}`);
});

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

await page.evaluate(() => {
  let lastSignature = "";
  const emit = () => {
    const owners = window.__NETWORK_MAP_RUNTIME_OWNERSHIP__?.snapshot?.().owners.map(owner => owner.id) || [];
    const signature = owners.join(",");
    if (signature !== lastSignature) {
      lastSignature = signature;
      console.log(`OWNERTRACE ${signature}`);
    }
  };
  emit();
  window.setInterval(emit, 25);
});
traceActive = true;
mark("trace-installed");

await page.waitForTimeout(700);
mark("after-700ms");
await assertFourWorkspaceCycle(page, "before-idle");

mark("idle-start");
await page.waitForTimeout(10_000);
mark("idle-finished");
await assertFourWorkspaceCycle(page, "after-idle");

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

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
      generalIntegrity: document.documentElement.dataset.occumedGeneralUi || "",
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
      panelTextLength: panel instanceof HTMLElement ? (panel.textContent || "").replace(/\s+/g, " ").trim().length : 0,
      panelActionCount: panel instanceof HTMLElement
        ? panel.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)").length
        : 0,
      viewportWidth: window.innerWidth,
      runtimeAudit: window.__NETWORK_MAP_UI_INTEGRITY__?.audit?.() || null,
      generalAudit: window.__NETWORK_MAP_GENERAL_UI__?.audit?.() || null,
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
      const textLength = (panel.textContent || "").replace(/\s+/g, " ").trim().length;
      const actionCount = panel.querySelectorAll(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)",
      ).length;
      return style.display !== "none" && style.visibility !== "hidden"
        && rect.width > 200 && rect.height > 40 && textLength >= 24 && actionCount > 0;
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
    assert.ok(snapshot.panelTextLength >= 24, `${tab} content panel must not be empty`);
    assert.ok(snapshot.panelActionCount > 0, `${tab} content panel must expose an enabled control`);
    if (tab === "mapTools") {
      assert.ok(snapshot.panel.left >= snapshot.sidebar.left - 2, "Map Tools must remain inside the sidebar left edge");
      assert.ok(snapshot.panel.right <= snapshot.sidebar.right + 2, "Map Tools must remain inside the sidebar right edge");
      assert.ok(snapshot.panel.top >= snapshot.tabs.bottom - 3, "Map Tools must begin below the tabs");
      assert.ok(snapshot.panel.bottom <= snapshot.sidebar.bottom + 3, "Map Tools must remain inside sidebar height");
    } else {
      assert.ok(Math.abs(snapshot.panel.left - snapshot.sidebar.left) <= 6, `${tab} panel must align to sidebar left`);
      assert.ok(Math.abs(snapshot.panel.width - snapshot.sidebar.width) <= 6, `${tab} panel must match sidebar width`);
      assert.ok(Math.abs(snapshot.panel.top - snapshot.tabs.bottom) <= 8, `${tab} panel must begin below tabs`);
      assert.ok(Math.abs(snapshot.panel.bottom - snapshot.sidebar.bottom) <= 8, `${tab} panel must end with sidebar`);
    }
  }

  if (snapshot.runtimeAudit) {
    assert.equal(snapshot.runtimeAudit.healthy, true, `${tab} runtime UI audit failed: ${snapshot.runtimeAudit.failures?.join(", ")}`);
  }
  if (snapshot.generalAudit) {
    assert.equal(snapshot.generalAudit.healthy, true, `${tab} general UI audit failed: ${snapshot.generalAudit.failures?.join(", ")}`);
  }
}

async function generalSnapshot() {
  return page.evaluate(() => {
    const rect = element => {
      if (!(element instanceof HTMLElement)) return null;
      const value = element.getBoundingClientRect();
      return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height };
    };
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      header: rect(document.querySelector(".command-header")),
      search: rect(document.querySelector(".command-search")),
      audit: window.__NETWORK_MAP_GENERAL_UI__?.audit?.() || null,
    };
  });
}

async function assertGeneralGeometry(label) {
  await page.waitForTimeout(300);
  const snapshot = await generalSnapshot();
  assert.ok(snapshot.header, `${label}: header must exist`);
  assert.ok(snapshot.search, `${label}: map search must exist`);
  assert.ok(snapshot.header.left >= -2 && snapshot.header.right <= snapshot.viewport.width + 2, `${label}: header must fit viewport`);
  assert.ok(snapshot.search.left >= -2 && snapshot.search.right <= snapshot.viewport.width + 2, `${label}: search must fit viewport`);
  assert.ok(snapshot.search.height >= 38, `${label}: search must remain usable`);
  assert.ok(snapshot.documentWidth <= snapshot.viewport.width + 3, `${label}: document must not overflow horizontally`);
  assert.ok(snapshot.audit, `${label}: general UI runtime must be available`);
  assert.equal(snapshot.audit.healthy, true, `${label}: general UI audit failed: ${snapshot.audit.failures?.join(", ")}`);
}

async function exerciseSearchDropdown() {
  await page.evaluate(() => {
    document.querySelector(".smoke-search-results")?.remove();
    const host = document.querySelector(".command-search");
    if (!(host instanceof HTMLElement)) throw new Error("Search host missing");
    const results = document.createElement("div");
    results.className = "command-search-results smoke-search-results";
    for (let index = 0; index < 30; index += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.innerHTML = `<strong>Result ${index + 1}</strong><span>Long address content used to verify constrained scrolling and viewport geometry</span>`;
      results.appendChild(button);
    }
    host.appendChild(results);
  });
  await page.waitForTimeout(200);
  const result = await page.evaluate(() => {
    const element = document.querySelector(".smoke-search-results");
    if (!(element instanceof HTMLElement)) return null;
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      scrollable: element.scrollHeight > element.clientHeight,
      overflow: element.scrollWidth - element.clientWidth,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });
  assert.ok(result, "synthetic search results must render");
  assert.ok(result.left >= -2 && result.right <= result.viewportWidth + 2, "search results must remain inside viewport width");
  assert.ok(result.top >= -2 && result.bottom <= result.viewportHeight + 2, "search results must remain inside viewport height");
  assert.equal(result.scrollable, true, "long search results must scroll vertically");
  assert.ok(result.overflow <= 2, "search results must not overflow horizontally");
  await page.evaluate(() => document.querySelector(".smoke-search-results")?.remove());
}

async function exerciseSyntheticDialog(expectMobile = false) {
  await page.evaluate(() => {
    document.querySelector(".smoke-dialog-backdrop")?.remove();
    document.querySelector(".smoke-dialog-opener")?.remove();

    const opener = document.createElement("button");
    opener.type = "button";
    opener.className = "smoke-dialog-opener";
    opener.textContent = "Open test dialog";
    document.body.appendChild(opener);
    opener.focus();

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop open smoke-dialog-backdrop";
    const dialog = document.createElement("div");
    dialog.className = "modal-box smoke-dialog";
    const header = document.createElement("div");
    header.className = "modal-header";
    const title = document.createElement("h2");
    title.textContent = "UI hardening dialog";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "modal-close";
    close.setAttribute("aria-label", "Close test dialog");
    close.textContent = "Close";
    close.addEventListener("click", () => backdrop.remove());
    header.append(title, close);
    const body = document.createElement("div");
    body.className = "modal-body";
    for (let index = 0; index < 80; index += 1) {
      const row = document.createElement("p");
      row.textContent = `Scrollable dialog row ${index + 1} with deliberately long content to verify wrapping and vertical containment.`;
      body.appendChild(row);
    }
    dialog.append(header, body);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
  });

  await page.waitForFunction(() => {
    const dialog = document.querySelector(".smoke-dialog");
    return dialog?.getAttribute("role") === "dialog" && dialog?.getAttribute("aria-modal") === "true";
  }, { timeout: 4_000 });

  const geometry = await page.evaluate(() => {
    const dialog = document.querySelector(".smoke-dialog");
    const body = document.querySelector(".smoke-dialog .modal-body");
    if (!(dialog instanceof HTMLElement) || !(body instanceof HTMLElement)) return null;
    const rect = dialog.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      scrollable: body.scrollHeight > body.clientHeight,
      overflow: dialog.scrollWidth - dialog.clientWidth,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      activeInside: dialog.contains(document.activeElement),
    };
  });

  assert.ok(geometry, "synthetic modal must render");
  assert.ok(geometry.left >= -2 && geometry.right <= geometry.viewportWidth + 2, "modal must remain inside viewport width");
  assert.ok(geometry.top >= -2 && geometry.bottom <= geometry.viewportHeight + 2, "modal must remain inside viewport height");
  assert.ok(geometry.overflow <= 2, "modal must not overflow horizontally");
  assert.equal(geometry.scrollable, true, "long modal content must scroll inside the modal");
  assert.equal(geometry.activeInside, true, "new modal must receive keyboard focus");
  if (expectMobile) {
    assert.ok(Math.abs(geometry.width - geometry.viewportWidth) <= 3, "mobile modal must use full viewport width");
    assert.ok(Math.abs(geometry.height - geometry.viewportHeight) <= 3, "mobile modal must use full viewport height");
  } else {
    assert.ok(geometry.width <= 925, "desktop modal must retain a readable maximum width");
    assert.ok(geometry.height <= geometry.viewportHeight * 0.9, "desktop modal must retain viewport breathing room");
  }

  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.querySelector(".smoke-dialog")?.contains(document.activeElement) || false),
    true,
    "Tab focus must remain inside the modal",
  );
  await page.keyboard.press("Escape");
  await page.locator(".smoke-dialog-backdrop").waitFor({ state: "detached", timeout: 4_000 });
  await page.waitForTimeout(150);
  assert.equal(
    await page.evaluate(() => document.activeElement?.classList.contains("smoke-dialog-opener") || false),
    true,
    "closing a modal must restore focus to its opener",
  );
  await page.evaluate(() => document.querySelector(".smoke-dialog-opener")?.remove());
}

try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  await page.locator(".mapbox-2d-host .mapboxgl-map").waitFor({ state: "visible", timeout: 45_000 });
  await page.locator(".mapbox-2d-host canvas").first().waitFor({ state: "visible", timeout: 45_000 });
  await page.locator(".occumed-sidebar-workspace-tabs").waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForFunction(() => Boolean(window.__NETWORK_MAP_GENERAL_UI__), { timeout: 10_000 });
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

  await assertGeneralGeometry("desktop startup");
  await exerciseSearchDropdown();
  await exerciseSyntheticDialog(false);

  await assertWorkspace("providers");
  await assertWorkspace("mapTools", ".occumed-sidebar-workspace-host > .occumed-map-tools-panel");
  await assertWorkspace("liveFinder", ".live-panel.open");
  await assertWorkspace("explorer", ".provider-explorer-drawer.open");
  await assertWorkspace("liveFinder", ".live-panel.open");
  await assertWorkspace("providers");

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(500);
  await assertGeneralGeometry("compact desktop");
  await assertWorkspace("mapTools", ".occumed-sidebar-workspace-host > .occumed-map-tools-panel");
  await assertWorkspace("liveFinder", ".live-panel.open");
  await assertWorkspace("explorer", ".provider-explorer-drawer.open");
  await assertWorkspace("providers");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  await assertGeneralGeometry("mobile");
  await exerciseSearchDropdown();
  await exerciseSyntheticDialog(true);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(500);
  await assertGeneralGeometry("desktop restored");
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
  assert.ok(settled.mutations - mutationsBeforeSettle < 90, "DOM mutations must settle");
  assert.ok(settled.longTasks < 10, "page must not accumulate long tasks");
  assert.deepEqual(settled.providerRequests, [], "provider APIs must remain idle without an enabled source");
  await assertGeneralGeometry("settled production UI");
  assert.equal(consoleErrors.length, 0, `console errors: ${consoleErrors.join("\n")}`);
} finally {
  await browser.close();
}
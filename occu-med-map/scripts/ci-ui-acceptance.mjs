import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const baseUrl = process.env.NETWORK_MAP_CI_UI_URL || "http://127.0.0.1:4173";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const artifactDir = path.resolve(scriptDir, "../test-results/ui-acceptance");
fs.mkdirSync(artifactDir, { recursive: true });

const viewports = [
  { name: "wide-desktop", width: 1920, height: 1080 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "small-laptop", width: 1366, height: 768 },
  { name: "compact-laptop", width: 1024, height: 768 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

function json(route, payload, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

async function mockApi(page) {
  const emptyMapboxStyle = {
    version: 8,
    name: "Standalone UI acceptance",
    sources: {},
    layers: [{ id: "ci-background", type: "background", paint: { "background-color": "#e7edf3" } }],
  };

  await page.route("https://api.mapbox.com/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes("/styles/v1/")) return json(route, emptyMapboxStyle);
    return route.fulfill({ status: 204, body: "" });
  });
  await page.route("https://events.mapbox.com/**", (route) => route.fulfill({ status: 204, body: "" }));

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (request.method() !== "GET") {
      return json(route, { ok: true, id: "ci-ui-mock", providers: [], records: [] });
    }

    if (pathname.includes("provider-layers")) {
      return json(route, { providers: [], total: 0, page: 1, hasMore: false });
    }
    if (pathname.includes("provider-explorer/density") || pathname.includes("provider-explorer/hex")) {
      return json(route, { cells: [], total: 0 });
    }
    if (pathname.includes("provider-explorer")) {
      return json(route, {
        providers: [],
        total: 0,
        page: 1,
        hasMore: false,
        stored_count: 0,
        live_count: 0,
        live_only: [],
      });
    }
    if (pathname.includes("health") || pathname.includes("ready")) {
      return json(route, { ok: true, status: "ok" });
    }
    if (pathname.includes("search") || pathname.includes("finder") || pathname.includes("npi")) {
      return json(route, { providers: [], results: [], items: [], total: 0 });
    }
    if (pathname.includes("inventory") || pathname.includes("coverage")) {
      return json(route, { providers: [], total: 0, cells: [] });
    }
    return json(route, {});
  });
}

async function waitForApplication(page) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator("#root").waitFor({ state: "attached", timeout: 20_000 });
  await page.locator(".app-wrap").waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForFunction(() => Boolean(window.__NETWORK_MAP_RUNTIME_OWNERSHIP__), null, { timeout: 20_000 });
  await page.waitForTimeout(700);
}

async function assertRuntimeOwnership(page) {
  const snapshot = await page.evaluate(() => window.__NETWORK_MAP_RUNTIME_OWNERSHIP__?.snapshot());
  assert.ok(snapshot, "runtime ownership diagnostics must be available");
  assert.deepEqual(snapshot.duplicateAttempts, [], `duplicate runtime registrations: ${snapshot.duplicateAttempts.join(", ")}`);
  const ids = snapshot.owners.map((owner) => owner.id);
  assert.equal(new Set(ids).size, ids.length, "runtime owner ids must be unique");
  for (const required of [
      "mapbox-map-lifecycle",
    "network-request-pipeline",
    "dialog-controller",
    "general-ui-integrity",
  ]) {
    assert.ok(ids.includes(required), `required runtime owner missing: ${required}`);
  }
}

async function assertGeometry(page, viewportName) {
  const result = await page.evaluate(() => {
    const docWidth = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
    const visible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return !element.hidden && style.display !== "none" && style.visibility !== "hidden" && rect.width > 2 && rect.height > 2;
    };
    const offscreen = Array.from(document.querySelectorAll(
      ".command-search-results, .local-pop-card, .tz-legend, .modal-box, .pdf-modal-wrap, .mapboxgl-popup",
    )).filter(visible).map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        className: String(element.className || element.tagName),
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      };
    }).filter((rect) => rect.left < -12 || rect.top < -12 || rect.right > innerWidth + 12 || rect.bottom > innerHeight + 12);
    const selectedTabs = document.querySelectorAll(".occumed-sidebar-workspace-tab[aria-selected='true']").length;
    const audit = window.__NETWORK_MAP_GENERAL_UI__?.audit();
    return { docWidth, viewportWidth: innerWidth, offscreen, selectedTabs, audit };
  });

  assert.ok(result.docWidth <= result.viewportWidth + 3, `${viewportName}: document horizontal overflow (${result.docWidth} > ${result.viewportWidth})`);
  assert.deepEqual(result.offscreen, [], `${viewportName}: visible overlays are outside the viewport`);
  assert.equal(result.selectedTabs, 1, `${viewportName}: exactly one sidebar workspace must be selected`);
  if (result.audit) {
    const hardFailures = result.audit.failures.filter((failure) => !failure.includes("application workspace collapsed"));
    assert.deepEqual(hardFailures, [], `${viewportName}: UI integrity audit failures: ${hardFailures.join("; ")}`);
  }
}

async function elementViewportState(locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      inViewport: rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight,
      rect: {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      viewport: { width: innerWidth, height: innerHeight },
      display: style.display,
      visibility: style.visibility,
      transform: style.transform,
      className: String(element.className || ""),
      sidebarClassName: String(element.closest(".sidebar")?.className || ""),
    };
  });
}

async function ensureWorkspaceNavigationVisible(page, target, label) {
  await target.waitFor({ state: "attached", timeout: 10_000 });
  const menu = page.locator(".mobile-menu-button:visible").first();
  const sidebar = page.locator(".sidebar").first();

  if (await menu.count()) {
    let open = await sidebar.evaluate((element) => element.classList.contains("mobile-open")).catch(() => false);
    if (!open) {
      await menu.click();
      await page.waitForFunction(
        () => document.querySelector(".sidebar")?.classList.contains("mobile-open") === true,
        null,
        { timeout: 5_000 },
      );
    }
    // A workspace action can close the sidebar with a 200ms transform. Wait for
    // the explicit reopened state to settle instead of trusting a mid-transition rect.
    await page.waitForTimeout(240);
    open = await sidebar.evaluate((element) => element.classList.contains("mobile-open"));
    assert.equal(open, true, `${label}: mobile workspace navigation must remain open before interaction`);
  }

  const state = await elementViewportState(target);
  assert.equal(
    state.inViewport,
    true,
    `${label} workspace navigation must be reachable in the current viewport; state=${JSON.stringify(state)}`,
  );
}

async function workspaceButton(page, label) {
  const button = page.getByRole("tab", { name: new RegExp(label, "i") });
  await ensureWorkspaceNavigationVisible(page, button, label);
  await button.waitFor({ state: "visible", timeout: 10_000 });
  return button;
}

async function workspaceContentState(page, label) {
  return page.evaluate((workspaceLabel) => {
    const normalized = workspaceLabel.toLowerCase();
    // Phase-2 visible tabs: Providers | Map Tools | Find | Results
    const panels = normalized === "providers"
      ? Array.from(document.querySelectorAll(".sidebar > .occumed-sidebar-provider-content"))
      : [document.querySelector(
        normalized === "map tools"
          ? ".occumed-sidebar-workspace-host > .occumed-map-tools-panel"
          : normalized === "find"
            ? "#sidebar-find-panel"
            : normalized === "results"
              ? "#sidebar-results-panel"
              : null
      )].filter(Boolean);
    const text = panels.map((panel) => panel.textContent || "").join(" ").replace(/\s+/g, " ").trim();
    const actionCount = panels.reduce((total, panel) => total + panel.querySelectorAll(
      "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)",
    ).length, 0);
    const visible = panels.some((panel) => {
      if (!(panel instanceof HTMLElement)) return false;
      const style = getComputedStyle(panel);
      const rect = panel.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 40 && rect.height > 40;
    });
    return { panelCount: panels.length, textLength: text.length, actionCount, visible };
  }, label);
}

async function assertWorkspaceReady(page, label, viewportName) {
  await page.waitForFunction((workspaceLabel) => {
    const normalized = workspaceLabel.toLowerCase();
    // Phase-2 visible tabs: Providers | Map Tools | Find | Results
    const panels = normalized === "providers"
      ? Array.from(document.querySelectorAll(".sidebar > .occumed-sidebar-provider-content"))
      : [document.querySelector(
        normalized === "map tools"
          ? ".occumed-sidebar-workspace-host > .occumed-map-tools-panel"
          : normalized === "find"
            ? "#sidebar-find-panel"
            : normalized === "results"
              ? "#sidebar-results-panel"
              : null
      )].filter(Boolean);
    const text = panels.map((panel) => panel.textContent || "").join(" ").replace(/\s+/g, " ").trim();
    const actionCount = panels.reduce((total, panel) => total + panel.querySelectorAll(
      "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)",
    ).length, 0);
    return panels.length > 0 && text.length >= 24 && actionCount > 0;
  }, label, { timeout: 4_000 });
  const state = await workspaceContentState(page, label);
  assert.ok(state.panelCount > 0, `${viewportName}: ${label} must mount a content panel`);
  assert.ok(state.textLength >= 24, `${viewportName}: ${label} content must not be empty`);
  assert.ok(state.actionCount > 0, `${viewportName}: ${label} must expose an enabled control`);
  assert.equal(state.visible, true, `${viewportName}: ${label} content must be visible`);
}

async function assertWorkspaceSwitching(page, viewportName) {
  // Phase-2 visible tabs: Providers | Map Tools | Find | Results
  for (const label of ["Map Tools", "Find", "Results", "Providers", "Find", "Providers"]) {
    const button = await workspaceButton(page, label);
    await button.click();
    await assertWorkspaceReady(page, label, viewportName);
    await assertGeometry(page, `${viewportName}/${label}`);
    assert.equal(await button.getAttribute("aria-selected"), "true", `${viewportName}: ${label} must become selected`);
  }
}

async function assertSidebarControlsInteractive(page, viewportName) {
  const mapTools = await workspaceButton(page, "Map Tools");
  await mapTools.click();
  await assertWorkspaceReady(page, "Map Tools", viewportName);
  const mapToolsPanel = page.locator(".occumed-sidebar-workspace-host > .occumed-map-tools-panel");
  const routeFrom = mapToolsPanel.getByRole("textbox", { name: "Route starting location" });
  const routeTo = mapToolsPanel.getByRole("textbox", { name: "Route destination" });
  await routeFrom.fill("Alpha Clinic");
  await routeTo.fill("Beta Clinic");
  await mapToolsPanel.locator(".occumed-route-swap").click();
  assert.equal(await routeFrom.inputValue(), "Beta Clinic", `${viewportName}: Map Tools must swap the route origin`);
  assert.equal(await routeTo.inputValue(), "Alpha Clinic", `${viewportName}: Map Tools must swap the route destination`);
  await mapToolsPanel.locator(".occumed-route-clear").click();
  assert.equal(await routeFrom.inputValue(), "", `${viewportName}: Map Tools must clear the route origin`);
  assert.equal(await routeTo.inputValue(), "", `${viewportName}: Map Tools must clear the route destination`);

  const density = mapToolsPanel.getByRole("button", { name: "Density", exact: true });
  const densityBefore = await density.getAttribute("aria-pressed");
  await density.click();
  assert.notEqual(await density.getAttribute("aria-pressed"), densityBefore, `${viewportName}: Map Tools controls must react to clicks`);
  const densityAfter = await density.getAttribute("aria-pressed");

  // Phase-2: Find tab replaces Finder + Explorer
  const find = await workspaceButton(page, "Find");
  await find.click();
  await assertWorkspaceReady(page, "Find", viewportName);
  const findPanel = page.locator("#sidebar-find-panel");
  // Nearby submode has a radius range input
  const radius = findPanel.locator("input[type='range']").first();
  await radius.fill("25");
  assert.equal(await radius.inputValue(), "25", `${viewportName}: Find radius must accept user changes`);
  assert.match((await findPanel.textContent()) || "", /Radius|Find|Nearby/i, `${viewportName}: Find panel must display search controls`);
  const textFilter = findPanel.locator("input[placeholder*='Filter providers']").first();
  await textFilter.fill("occupational");
  assert.equal(await textFilter.inputValue(), "occupational", `${viewportName}: Find text filtering must accept input`);
  await mapTools.click();
  await assertWorkspaceReady(page, "Map Tools", viewportName);
  assert.equal(await density.getAttribute("aria-pressed"), densityAfter, `${viewportName}: Map Tools control state must survive a tab round trip`);
  await density.click();
  await find.click();
  await assertWorkspaceReady(page, "Find", viewportName);
  assert.equal(await radius.inputValue(), "25", `${viewportName}: Find radius must survive a tab round trip`);
  assert.equal(await textFilter.inputValue(), "occupational", `${viewportName}: Find input must survive a tab round trip`);
  await radius.fill("30");
  assert.equal(await radius.inputValue(), "30", `${viewportName}: Find controls must remain interactive after returning`);

  // Database submode: switch to it and verify provider-type select is present
  const dbPill = findPanel.getByRole("button", { name: "Database", exact: true });
  await dbPill.click();
  const dbSelect = findPanel.locator("select").first();
  await dbSelect.selectOption("occupational_health_clinic");
  assert.equal(await dbSelect.inputValue(), "occupational_health_clinic", `${viewportName}: Find → Database provider type must be selectable`);
  // Reset back to Nearby
  const nearbyPill = findPanel.getByRole("button", { name: "Nearby", exact: true });
  await nearbyPill.click();

  const providers = await workspaceButton(page, "Providers");
  await providers.click();
  await assertWorkspaceReady(page, "Providers", viewportName);
  assert.equal(await page.evaluate(() => document.body.dataset.providerTool || ""), "", `${viewportName}: Providers must clear stale Finder state`);
  const luminous = page.locator('input[aria-label="Luminous Density"]');
  const luminousToggle = page.locator('.workflow-layer:has(input[aria-label="Luminous Density"]) .tog-switch');
  await luminousToggle.click();
  assert.equal(await luminous.isChecked(), true, `${viewportName}: Providers must enable Luminous Density`);
  await luminousToggle.click();
  assert.equal(await luminous.isChecked(), false, `${viewportName}: Providers must disable Luminous Density`);
  const mapView = page.getByRole("button", { name: "Map View", exact: true });
  const mapViewBefore = await mapView.getAttribute("aria-expanded");
  await mapView.click();
  assert.notEqual(await mapView.getAttribute("aria-expanded"), mapViewBefore, `${viewportName}: Providers sections must expand and collapse`);

  const sidebar = page.locator(".sidebar.occumed-sidebar-workspace-scope");
  await sidebar.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  const scrolled = await sidebar.evaluate((element) => ({ top: element.scrollTop, max: element.scrollHeight - element.clientHeight }));
  if (scrolled.max > 2) assert.ok(scrolled.top > 0, `${viewportName}: Providers workspace must scroll`);
  await mapTools.click();
  await assertWorkspaceReady(page, "Map Tools", viewportName);
  await providers.click();
  await assertWorkspaceReady(page, "Providers", viewportName);
  await sidebar.evaluate((element) => { element.scrollTop = 0; });
  assert.equal(await sidebar.evaluate((element) => element.scrollTop), 0, `${viewportName}: sidebar scrolling must remain attached after switching`);
}

async function assertRapidSidebarStress(page, viewportName) {
  // Phase-2 visible tabs: Providers | Map Tools | Find | Results
  const sequence = ["Providers", "Map Tools", "Find", "Results", "Providers"];
  for (let repetition = 0; repetition < 4; repetition += 1) {
    for (const label of sequence) {
      const button = await workspaceButton(page, label);
      await button.click({ delay: 0 });
    }
  }
  await assertWorkspaceReady(page, "Providers", viewportName);
  const state = await page.evaluate(() => {
    const visible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && style.pointerEvents !== "none"
        && rect.width > 0 && rect.height > 0;
    };
    return {
      selected: document.querySelectorAll(".occumed-sidebar-workspace-tab[aria-selected='true']").length,
      active: document.querySelector(".occumed-sidebar-workspace-tab[aria-selected='true']")?.getAttribute("data-workspace-tab"),
      finderInteractive: visible(document.querySelector(".live-panel")),
      explorerInteractive: visible(document.querySelector(".provider-explorer-drawer")),
      providers: visible(document.querySelector(".occumed-sidebar-provider-content")),
    };
  });
  assert.deepEqual(state, {
    selected: 1,
    active: "providers",
    finderInteractive: false,
    explorerInteractive: false,
    providers: true,
  }, `${viewportName}: rapid switching must finish with one interactive Providers workspace`);
}

async function assertSidebarResizeStress(page, viewportName) {
  for (const size of [{ width: 1180, height: 720 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    await assertWorkspaceReady(page, "Providers", viewportName);
    await assertGeometry(page, `${viewportName}/resize-${size.width}x${size.height}`);
    const tabs = page.locator(".occumed-sidebar-workspace-tab");
    assert.equal(await tabs.count(), 4, `${viewportName}: all four tabs must remain available after resize`);
    // Phase-2: 4th tab is Results (index 3)
    await tabs.nth(3).click();
    await assertWorkspaceReady(page, "Results", viewportName);
    await tabs.nth(0).click();
  }
}

async function assertKeyboardTabs(page, viewportName) {
  const providers = await workspaceButton(page, "Providers");
  await providers.click();
  await providers.focus();
  // Phase-2 tabs: Providers(0) | Map Tools(1) | Find(2) | Results(3)
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(120);
  const mapToolsSelected = await page.locator(".occumed-sidebar-workspace-tab[aria-selected='true']").textContent();
  assert.match(mapToolsSelected || "", /map tools/i, `${viewportName}: first ArrowRight must select Map Tools`);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(120);
  const findSelected = await page.locator(".occumed-sidebar-workspace-tab[aria-selected='true']").textContent();
  assert.match(findSelected || "", /find/i, `${viewportName}: second ArrowRight must select Find`);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(120);
  const resultsSelected = await page.locator(".occumed-sidebar-workspace-tab[aria-selected='true']").textContent();
  assert.match(resultsSelected || "", /results/i, `${viewportName}: third ArrowRight must select Results`);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(120);
  const wrappedSelected = await page.locator(".occumed-sidebar-workspace-tab[aria-selected='true']").textContent();
  assert.match(wrappedSelected || "", /providers/i, `${viewportName}: fourth ArrowRight must wrap to Providers`);
  await page.keyboard.press("End");
  await page.waitForTimeout(120);
  const endSelected = await page.locator(".occumed-sidebar-workspace-tab[aria-selected='true']").textContent();
  assert.match(endSelected || "", /results/i, `${viewportName}: End must select Results`);
  await page.keyboard.press("Home");
  await page.waitForTimeout(120);
  const homeSelected = await page.locator(".occumed-sidebar-workspace-tab[aria-selected='true']").textContent();
  assert.match(homeSelected || "", /providers/i, `${viewportName}: Home must select Providers`);
}

async function assertDialogBehavior(page, viewportName) {
  await page.evaluate(() => {
    const opener = document.createElement("button");
    opener.id = "ci-dialog-opener";
    opener.textContent = "Open test dialog";
    document.body.appendChild(opener);
    opener.focus();

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop open";
    const dialog = document.createElement("div");
    dialog.className = "modal-box ci-dialog";
    dialog.innerHTML = '<div class="modal-header"><h2>CI dialog</h2></div><button id="ci-dialog-first">First</button><button class="modal-close">Close</button>';
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
    dialog.querySelector(".modal-close")?.addEventListener("click", () => backdrop.remove());
    window.__NETWORK_MAP_DIALOG_CONTROLLER__?.sync();
  });

  const dialog = page.locator(".ci-dialog");
  await dialog.waitFor({ state: "visible" });
  assert.equal(await dialog.getAttribute("role"), "dialog", `${viewportName}: dialog role missing`);
  assert.equal(await dialog.getAttribute("aria-modal"), "true", `${viewportName}: aria-modal missing`);
  const focusedInside = await page.evaluate(() => Boolean(document.querySelector(".ci-dialog")?.contains(document.activeElement)));
  assert.equal(focusedInside, true, `${viewportName}: focus must enter the dialog`);
  await page.keyboard.press("Escape");
  await page.locator(".ci-dialog").waitFor({ state: "detached" });
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "ci-dialog-opener", `${viewportName}: focus must return to the opener`);
  await page.evaluate(() => document.querySelector("#ci-dialog-opener")?.remove());
}

async function runViewport(browser, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await mockApi(page);

  try {
    await waitForApplication(page);
    await assertRuntimeOwnership(page);
    await assertGeometry(page, viewport.name);
    await assertWorkspaceSwitching(page, viewport.name);
    await assertRapidSidebarStress(page, viewport.name);
    if (viewport.name === "desktop") {
      await assertSidebarControlsInteractive(page, viewport.name);
      await assertSidebarResizeStress(page, viewport.name);
    }
    await assertKeyboardTabs(page, viewport.name);
    await assertDialogBehavior(page, viewport.name);
    await assertGeometry(page, `${viewport.name}/final`);
    assert.deepEqual(pageErrors, [], `${viewport.name}: uncaught page errors: ${pageErrors.join("; ")}`);
  } catch (error) {
    await page.screenshot({ path: path.join(artifactDir, `${viewport.name}-failure.png`), fullPage: true }).catch(() => undefined);
    fs.writeFileSync(
      path.join(artifactDir, `${viewport.name}-error.txt`),
      `${error instanceof Error ? error.stack || error.message : String(error)}\n\nPage errors:\n${pageErrors.join("\n")}`,
    );
    throw error;
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) await runViewport(browser, viewport);
} finally {
  await browser.close();
}

console.log(`CI UI acceptance passed for ${viewports.map((viewport) => viewport.name).join(", ")}.`);

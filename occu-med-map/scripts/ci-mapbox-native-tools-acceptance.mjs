import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium, webkit } from "playwright";

const baseUrl = process.env.NETWORK_MAP_CI_UI_URL || "http://127.0.0.1:4173";
const browserName = process.env.NETWORK_MAP_BROWSER || "chromium";
const browserType = { chromium, webkit }[browserName];
if (!browserType) throw new Error(`Unsupported browser ${browserName}`);
const artifactDir = path.resolve(process.cwd(), "test-results", "mapbox-native-tools", browserName);
fs.mkdirSync(artifactDir, { recursive: true });

function json(route, payload, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(payload) });
}

async function mockMapbox(page) {
  const emptyStyle = {
    version: 8,
    name: "Network Map native tools CI",
    sources: {},
    layers: [{ id: "ci-background", type: "background", paint: { "background-color": "#e7edf3" } }],
  };
  await page.route("https://api.mapbox.com/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes("/styles/v1/")) return json(route, emptyStyle);
    return route.fulfill({ status: 204, body: "" });
  });
  await page.route("https://events.mapbox.com/**", (route) => route.fulfill({ status: 204, body: "" }));
}

async function mockExternalGeocoding(page) {
  await page.route("https://nominatim.openstreetmap.org/**", (route) => json(route, {
    display_name: "CI City, Test Region",
    address: { city: "CI City", state: "Test Region", state_code: "CI" },
  }));
  await page.route("https://maps.googleapis.com/**", (route) => json(route, { results: [], status: "ZERO_RESULTS" }));
}

async function mockApi(page) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    if (request.method() !== "GET") return json(route, { ok: true, success: true, id: "ci-native" });
    if (pathname.endsWith("/revision")) return json(route, { revision: "ci-native-tools" });
    if (pathname === "/api/live-finder/search") {
      return json(route, {
        results: [{
          id: "osm-ci-live-1",
          lat: 20.05,
          lng: 0.05,
          name: "CI Live Clinic",
          cat: "clinic",
          dist: 4.2,
          addr: "1 Live Finder Way",
          phone: "+1 555 0100",
          website: "https://example.invalid/live",
          source: "OpenStreetMap",
          sourceDetail: "CI Overpass",
        }],
        facets: { clinic: 1 },
        priorityCounts: { clinical: 1 },
        providers: [{ source: "OpenStreetMap", endpoint: "CI Overpass", ok: true, count: 1 }],
      });
    }
    if (pathname === "/api/enhanced-search") {
      return json(route, { results: [], facets: {}, sourceSummary: { googlePlaces: 0, universalDiscovery: 0, savedToNeon: 0 } });
    }
    if (pathname.includes("provider-explorer/density") || pathname.includes("provider-explorer/hex")) {
      return json(route, {
        cells: [
          { lat: 20.0, lng: 0.0, count: 12 },
          { lat: 20.2, lng: 0.2, count: 5 },
        ],
        total: 17,
      });
    }
    if (pathname.includes("provider-explorer/map")) {
      return json(route, {
        providers: [{
          id: "stored-ci-1",
          source: "CI Stored",
          source_kind: "stored",
          name: "CI Stored Clinic",
          normalized_name: "ci stored clinic",
          clinic_type: "general_practitioner",
          services: ["primary care"],
          categories: ["primary care"],
          address: "2 Provider Way",
          city: "CI City",
          admin_area: "CI",
          country: "US",
          postal_code: "00000",
          lat: 20,
          lng: 0,
          phone: "+1 555 0200",
          website: "https://example.invalid/stored",
          source_url: null,
          confidence_score: 0.9,
          trust_tier: "verified",
          last_seen: null,
          imported_at: null,
        }],
        total: 1,
        page: 1,
        hasMore: false,
      });
    }
    if (pathname.includes("provider-explorer")) return json(route, { providers: [], total: 0, page: 1, hasMore: false, stored_count: 0, live_count: 0, live_only: [] });
    if (pathname === "/api/provider-layers/indexed") {
      return json(route, {
        providers: [
          { clinic_name: "CI Indexed Clinic One", name: "CI Indexed Clinic One", lat: 20.0, lng: 0.0, address_1: "10 Indexed Way", city: "CI City", state: "CI", zip: "00001", phone: "+1 555 0301", website: "https://example.invalid/indexed-one", source_id: "indexed-ci-1", data_source: "indexed", category: "clinic", clinic_type: "general_practitioner", providerType: "general_practitioner", services: "primary care", types: ["primary care"] },
          { clinic_name: "CI Indexed Clinic Two", name: "CI Indexed Clinic Two", lat: 20.03, lng: 0.03, address_1: "20 Indexed Way", city: "CI City", state: "CI", zip: "00002", phone: "+1 555 0302", website: "https://example.invalid/indexed-two", source_id: "indexed-ci-2", data_source: "indexed", category: "clinic", clinic_type: "general_practitioner", providerType: "general_practitioner", services: "primary care", types: ["primary care"] },
        ],
        count: 2,
        loaded: 2,
        total: 2,
        source: "indexed",
        page: 1,
        limit: 2000,
        hasMore: false,
        all: false,
        storage: "provider_master",
        visibleCapped: false,
      });
    }
    if (pathname.includes("provider-layers")) return json(route, { providers: [], count: 0, loaded: 0, total: 0, page: 1, hasMore: false, visibleCapped: false });
    if (pathname.includes("health") || pathname.includes("ready")) return json(route, { ok: true, status: "ok" });
    if (pathname.includes("inventory") || pathname.includes("coverage")) return json(route, { providers: [], total: 0, cells: [] });
    if (pathname.includes("search") || pathname.includes("finder") || pathname.includes("npi")) return json(route, { providers: [], results: [], items: [], total: 0 });
    return json(route, {});
  });
}

async function clickByText(page, pattern, scope = page) {
  const buttons = scope.locator("button:visible");
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    const text = `${(await button.textContent()) || ""} ${(await button.getAttribute("aria-label")) || ""}`.replace(/\s+/g, " ").trim();
    if (pattern.test(text)) {
      await button.evaluate((element) => element.click());
      return button;
    }
  }
  throw new Error(`Button not found: ${pattern}`);
}

async function active2dMapPoint(page, lng, lat) {
  return page.evaluate(({ lng, lat }) => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => Boolean(candidate.getContainer().closest(".mapbox-2d-host")));
    if (!map) throw new Error("2D Mapbox map not available");
    const point = map.project([lng, lat]);
    const rect = map.getCanvas().getBoundingClientRect();
    return { x: rect.left + point.x, y: rect.top + point.y };
  }, { lng, lat });
}

async function mapCanvasClick(page, ratioX = 0.68, ratioY = 0.55, double = false) {
  const point = await page.evaluate(({ ratioX, ratioY }) => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => Boolean(candidate.getContainer().closest(".mapbox-2d-host")));
    if (!map) throw new Error("2D Mapbox map not available");
    const rect = map.getCanvas().getBoundingClientRect();
    return { x: rect.left + rect.width * ratioX, y: rect.top + rect.height * ratioY };
  }, { ratioX, ratioY });
  if (double) await page.mouse.dblclick(point.x, point.y, { delay: 70 });
  else await page.mouse.click(point.x, point.y);
}

async function nativeCompatLayerCount(page, mode = "2d") {
  return page.evaluate((requestedMode) => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => Boolean(candidate.getContainer().closest(requestedMode === "3d" ? ".mapbox-globe-host" : ".mapbox-2d-host")));
    if (!map) return -1;
    return (map.getStyle()?.layers || []).filter((layer) => String(layer.id).startsWith("leaflet-compat-")).length;
  }, mode);
}

async function waitForMode(page, mode) {
  await page.waitForFunction((expected) => window.__NETWORK_MAP_GLOBE__?.getMode?.() === expected, mode, { timeout: 35_000 });
}

const browser = await browserType.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));

await mockMapbox(page);
await mockExternalGeocoding(page);
await mockApi(page);

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator(".app-wrap").waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForFunction(() => (window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || []).some((map) => map.getContainer().closest(".mapbox-2d-host")), null, { timeout: 20_000 });
  await page.locator(".mapbox-2d-host .mapboxgl-canvas").waitFor({ state: "visible", timeout: 15_000 });

  // Indexed Providers must make the full API -> provider layer -> native Mapbox path visible.
  const indexedToggle = page.getByRole("checkbox", { name: "Indexed Providers" });
  await indexedToggle.check();
  await page.waitForFunction(() => /2 loaded.*visible/i.test(document.body.innerText), null, { timeout: 12_000 });
  await page.evaluate(() => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => candidate.getContainer().closest(".mapbox-2d-host"));
    if (!map) throw new Error("2D Mapbox map unavailable for indexed-provider test");
    map.jumpTo({ center: [0.015, 20.015], zoom: 9 });
  });
  await page.waitForFunction(() => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => candidate.getContainer().closest(".mapbox-2d-host"));
    if (!map) return false;
    const sourceIds = Object.keys(map.getStyle()?.sources || {}).filter((id) => id.startsWith("leaflet-compat-"));
    return sourceIds.some((id) => {
      try {
        return map.querySourceFeatures(id).some((feature) => String(feature.properties?.__popupHtml || "").includes("CI Indexed Clinic One"));
      } catch { return false; }
    });
  }, null, { timeout: 12_000 });
  const indexedPoint = await active2dMapPoint(page, 0, 20);
  await page.mouse.click(indexedPoint.x, indexedPoint.y);
  await page.getByText("CI Indexed Clinic One").first().waitFor({ state: "visible", timeout: 8_000 });

  // Radius must create real Mapbox layers from the transitional geometry facade.
  const beforeRadiusLayers = await nativeCompatLayerCount(page, "2d");
  const radiusButton = await clickByText(page, /Radius Tool/i);
  await page.waitForFunction((button) => button.classList.contains("active"), await radiusButton.elementHandle(), { timeout: 5_000 });
  await page.waitForFunction(() => window.__NETWORK_MAP_TOOL_STATE__?.getActiveTool?.() === "radius", null, { timeout: 5_000 });
  await mapCanvasClick(page, 0.68, 0.55, false);
  const radiusCard = page.locator(".local-pop-card:visible").filter({ hasText: "Radius extractor" }).first();
  await radiusCard.waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForFunction((before) => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => candidate.getContainer().closest(".mapbox-2d-host"));
    const count = (map?.getStyle()?.layers || []).filter((layer) => String(layer.id).startsWith("leaflet-compat-")).length;
    return count > before;
  }, beforeRadiusLayers, { timeout: 10_000 });
  const radiusCenterBefore = ((await radiusCard.textContent()) || "").match(/Center:\s*[-\d.]+,\s*[-\d.]+/)?.[0] || "";
  assert.ok(radiusCenterBefore, "Radius center must be visible after clicking the native Mapbox canvas");

  // 2D -> 3D must preserve native compatibility geometry, then return to 2D.
  await page.locator(".map-dimension-toggle button[data-map-mode='3d']").evaluate((element) => element.click());
  await waitForMode(page, "3d");
  await page.locator(".mapbox-globe-host .mapboxgl-canvas").waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForFunction(() => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => candidate.getContainer().closest(".mapbox-globe-host"));
    return (map?.getStyle()?.layers || []).some((layer) => String(layer.id).startsWith("leaflet-compat-"));
  }, null, { timeout: 10_000 });
  assert.ok(await nativeCompatLayerCount(page, "3d") > 0, "3D Mapbox globe must receive the same logical overlay geometry");
  await page.locator(".map-dimension-toggle button[data-map-mode='2d']").evaluate((element) => element.click());
  await waitForMode(page, "2d");
  await page.waitForFunction(() => !document.querySelector(".dual-engine-vortex.active"), null, { timeout: 20_000 });
  await radiusCard.waitFor({ state: "visible", timeout: 10_000 });

  const saveRing = radiusCard.getByRole("button", { name: /Save ring/i });
  await saveRing.waitFor({ state: "visible", timeout: 10_000 });
  assert.equal(await saveRing.isDisabled(), false, "Save ring must enable after a native Mapbox radius click");
  await saveRing.click();
  await radiusCard.getByText(/Ring 1/i).waitFor({ state: "visible", timeout: 5_000 });

  // Density and hex must render into native Mapbox layers and report aggregate counts.
  await page.getByRole("tab", { name: /Explorer workspace/i }).click();
  const explorer = page.locator(".provider-explorer-drawer.open:visible");
  await explorer.waitFor({ state: "visible", timeout: 10_000 });
  await clickByText(page, /^Density$/i, explorer);
  await page.locator(".provider-map-status").waitFor({ state: "visible", timeout: 5_000 });
  await page.waitForFunction(() => /density view.*17 matching records.*2 aggregated cells/i.test(document.querySelector(".provider-map-status")?.textContent || ""), null, { timeout: 10_000 });
  const densityLayerCount = await nativeCompatLayerCount(page, "2d");
  assert.ok(densityLayerCount > 0, "Density cells must exist as native Mapbox compatibility layers");

  await clickByText(page, /Hex field/i, explorer);
  await page.waitForFunction(() => /hex view.*17 matching records.*2 aggregated cells/i.test(document.querySelector(".provider-map-status")?.textContent || ""), null, { timeout: 10_000 });

  // Provider pin click must open its popup but must NOT move the still-active Radius center.
  await clickByText(page, /8px points/i, explorer);
  await page.waitForFunction(() => /showing 1 visible pins of 1 matching records/i.test(document.querySelector(".provider-map-status")?.textContent || ""), null, { timeout: 10_000 });
  const providerPoint = await active2dMapPoint(page, 0, 20);
  await page.mouse.click(providerPoint.x, providerPoint.y);
  await page.getByText("CI Stored Clinic").first().waitFor({ state: "visible", timeout: 8_000 });
  const radiusCenterAfterProviderClick = ((await radiusCard.textContent()) || "").match(/Center:\s*[-\d.]+,\s*[-\d.]+/)?.[0] || "";
  assert.equal(radiusCenterAfterProviderClick, radiusCenterBefore, "Provider clicks must not fall through into Radius map-click ownership");

  // Live Finder must survive Leaflet removal: native double-click -> OSM API -> Mapbox result marker + result UI.
  await page.getByRole("tab", { name: /Finder workspace/i }).click();
  await page.locator(".live-panel.open:visible").waitFor({ state: "visible", timeout: 10_000 });
  await mapCanvasClick(page, 0.52, 0.5, true);
  await page.getByText("CI Live Clinic").first().waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForFunction(() => /1 facilities from OSM/i.test(document.querySelector(".live-panel.open")?.textContent || ""), null, { timeout: 15_000 });

  assert.deepEqual(pageErrors, [], `Mapbox native tool acceptance saw page errors: ${pageErrors.join("; ")}`);
  console.log(`Mapbox native tool acceptance passed in ${browserName}: radius, 2D/3D, density, hex, provider click ownership, and OSM Live Finder.`);
} catch (error) {
  await page.screenshot({ path: path.join(artifactDir, "failure.png"), fullPage: true }).catch(() => undefined);
  fs.writeFileSync(path.join(artifactDir, "error.txt"), `${error instanceof Error ? error.stack || error.message : String(error)}\n\nPage errors:\n${pageErrors.join("\n")}`);
  throw error;
} finally {
  await context.close();
  await browser.close();
}

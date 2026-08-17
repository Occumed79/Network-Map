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

const expectedProviderLayerLabels = [
  "Urgent Cares",
  "Occupational Health Clinics",
  "Dentists",
  "Blue Hive",
  "FAA Examiners",
  "DOT Examiners",
  "Labs",
  "Imaging",
  "Audiology",
  "General Practitioners",
  "Pharmacy",
  "International Providers",
  "U.S. Embassy Recommended",
  "Uploaded Clinics",
  "NACCHO Local Health Departments",
];

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
    if (pathname === "/api/provider-category-layers/general-practitioners") {
      return json(route, {
        providers: [
          { clinic_name: "CI Indexed Clinic One", name: "CI Indexed Clinic One", lat: 20.4, lng: 0.4, address_1: "10 Indexed Way", city: "CI City", state: "CI", zip: "00001", phone: "+1 555 0301", website: "https://example.invalid/indexed-one", source_id: "indexed-ci-1", data_source: "indexed", category: "clinic", clinic_type: "general_practitioner", providerType: "general_practitioner", services: ["primary care"], types: ["primary care"] },
          { clinic_name: "CI Indexed Clinic Two", name: "CI Indexed Clinic Two", lat: 20.43, lng: 0.43, address_1: "20 Indexed Way", city: "CI City", state: "CI", zip: "00002", phone: "+1 555 0302", website: "https://example.invalid/indexed-two", source_id: "indexed-ci-2", data_source: "indexed", category: "clinic", clinic_type: "general_practitioner", providerType: "general_practitioner", services: ["primary care"], types: ["primary care"] },
        ],
        count: 2,
        loaded: 2,
        total: 2,
        category: "general-practitioners",
        page: 1,
        limit: 2000,
        hasMore: false,
        visibleCapped: false,
      });
    }
    if (pathname === "/api/naccho-lhd") {
      const requestedPage = Math.max(Number(url.searchParams.get("page") || 1), 1);
      const requestedLimit = Math.max(Number(url.searchParams.get("limit") || 2000), 1);
      const total = 2501;
      const offset = (requestedPage - 1) * requestedLimit;
      const pageCount = Math.max(0, Math.min(requestedLimit, total - offset));
      const providers = Array.from({ length: pageCount }, (_, localIndex) => {
        const index = offset + localIndex;
        return {
          id: `naccho-ci-${index}`,
          source_id: `naccho-ci-${index}`,
          name: `CI Health Department ${index + 1}`,
          lat: 20.6 + (index % 50) * 0.0002,
          lng: 0.6 + (Math.floor(index / 50) % 50) * 0.0002,
          address: `${index + 1} Public Health Way`,
          city: "CI City",
          admin_area: "CI",
          country: "US",
          postal_code: "00000",
          phone: null,
          website: null,
          clinic_type: "local_health_department",
          public_health_services: ["public health"],
          services: ["public health"],
          categories: ["public_health", "local_health_department"],
          source: "NACCHO Local Health Department Directory",
          source_kind: "stored",
          trust_tier: "directory",
        };
      });
      return json(route, {
        providers,
        count: providers.length,
        loaded: providers.length,
        total,
        page: requestedPage,
        limit: requestedLimit,
        hasMore: offset + providers.length < total,
        source: "NACCHO Local Health Department Directory",
        visibleCapped: false,
      });
    }
    if (pathname.includes("provider-category-layers")) return json(route, { providers: [], count: 0, loaded: 0, total: 0, page: 1, hasMore: false, visibleCapped: false });
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

async function liveFinderSnapshotFeatureCount(page, channel) {
  return page.evaluate((requestedChannel) => (
    window.__NETWORK_MAP_LIVE_FINDER_NATIVE__?.getSnapshot?.(requestedChannel)?.featureCount || 0
  ), channel);
}

async function providerExplorerSnapshotPoint(page, needle) {
  return page.evaluate((popupNeedle) => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => Boolean(candidate.getContainer().closest(".mapbox-2d-host")));
    if (!map) throw new Error("2D Mapbox map not available");
    const snapshot = window.__NETWORK_MAP_PROVIDER_EXPLORER_NATIVE__?.getSnapshot?.("pins");
    const feature = snapshot?.features?.find((candidate) =>
      Array.isArray(candidate.coordinates)
      && String(candidate.popupHtml || "").includes(popupNeedle)
    );
    if (!feature?.coordinates) {
      return { x: null, y: null, coordinates: null, snapshot: snapshot || null };
    }
    const point = map.project(feature.coordinates);
    const rect = map.getCanvas().getBoundingClientRect();
    return {
      x: rect.left + point.x,
      y: rect.top + point.y,
      coordinates: feature.coordinates,
      snapshot,
    };
  }, needle);
}

async function waitForMode(page, mode) {
  await page.waitForFunction((expected) => window.__NETWORK_MAP_GLOBE__?.getMode?.() === expected, mode, { timeout: 35_000 });
}

async function waitForActiveMapIdle(page, mode = "2d") {
  await page.evaluate(async (requestedMode) => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const selector = requestedMode === "3d" ? ".mapbox-globe-host" : ".mapbox-2d-host";
    const map = maps.find((candidate) => candidate.getContainer().closest(selector));
    if (!map) throw new Error(`Mapbox ${requestedMode} map not available`);
    if (map.loaded() && !map.isMoving()) return;
    await Promise.race([
      new Promise((resolve) => map.once("idle", resolve)),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  }, mode);
}

async function categoryProviderDiagnostics(page) {
  return page.evaluate(() => {
    const lifecycle = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getDiagnostics?.() || null;
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => candidate.getContainer().closest(".mapbox-2d-host"));
    const toggle = document.querySelector('input[aria-label="General Practitioners"]');
    const row = toggle?.closest(".workflow-layer");
    const snapshot = window.__NETWORK_MAP_PROVIDER_DATASET_NATIVE__?.getSnapshot?.("category-general-practitioners") || null;
    if (!map) return { lifecycle, snapshot, noMap: true, categoryRow: row?.textContent || "" };
    const style = map.getStyle();
    const nativeLayers = (style?.layers || [])
      .filter((layer) => String(layer.id).startsWith("provider-dataset-native-category-general-practitioners"))
      .map((layer) => ({ id: layer.id, type: layer.type, source: layer.source || null }));
    const features = snapshot?.features || [];
    return {
      lifecycle,
      categoryChecked: Boolean(toggle?.checked),
      categoryRow: String(row?.textContent || "").replace(/\s+/g, " ").trim(),
      styleLoaded: map.isStyleLoaded(),
      loaded: map.loaded(),
      moving: map.isMoving(),
      center: { lng: map.getCenter().lng, lat: map.getCenter().lat },
      zoom: map.getZoom(),
      nativeLayers,
      sourceId: "provider-dataset-native-category-general-practitioners",
      sourceFeatureCount: snapshot?.featureCount || 0,
      clinicOneCount: features.filter((feature) => String(feature.popupHtml || "").includes("CI Indexed Clinic One")).length,
      popupPreviews: features.slice(0, 20).map((feature) => String(feature.popupHtml || "").slice(0, 180)),
    };
  });
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

  for (const label of expectedProviderLayerLabels) {
    await page.getByRole("checkbox", { name: label }).waitFor({ state: "visible", timeout: 10_000 });
  }
  assert.equal(await page.locator('input[aria-label="Indexed Providers"]:visible').count(), 0, "Generic Indexed Providers toggle must no longer be visible");
  assert.equal(await page.getByRole("checkbox", { name: "Luminous Density" }).isVisible(), true, "Luminous Density visualization control must remain available");

  const categoryToggle = page.getByRole("checkbox", { name: "General Practitioners" });
  const categoryResponsePredicate = (response) => {
    try {
      const url = new URL(response.url());
      return url.pathname === "/api/provider-category-layers/general-practitioners" && response.request().method() === "GET";
    } catch { return false; }
  };
  const categoryResponsePromise = page.waitForResponse(categoryResponsePredicate, { timeout: 12_000 });
  await categoryToggle.check();
  const categoryResponse = await categoryResponsePromise;
  assert.equal(categoryResponse.ok(), true, `General Practitioners request failed with HTTP ${categoryResponse.status()}`);
  const categoryPayload = await categoryResponse.json();
  assert.equal(categoryPayload.providers?.length, 2, "General Practitioners API must return both CI clinics");

  const viewportRefreshPromise = page.waitForResponse(categoryResponsePredicate, { timeout: 6000 }).catch(() => null);
  await page.evaluate(() => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => candidate.getContainer().closest(".mapbox-2d-host"));
    if (!map) throw new Error("2D Mapbox map unavailable for categorized-provider test");
    map.jumpTo({ center: [0.415, 20.415], zoom: 9 });
  });
  const viewportRefresh = await viewportRefreshPromise;
  if (viewportRefresh) {
    assert.equal(viewportRefresh.ok(), true, `Categorized provider viewport refresh failed with HTTP ${viewportRefresh.status()}`);
    const refreshPayload = await viewportRefresh.json();
    assert.equal(refreshPayload.providers?.length, 2, "Categorized provider viewport refresh must keep both CI clinics");
  }
  await page.waitForFunction(() => Boolean(
    document.querySelector('input[aria-label="General Practitioners"]')?.checked
  ), null, { timeout: 15_000 });
  await waitForActiveMapIdle(page, "2d");
  await page.waitForFunction(() => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => candidate.getContainer().closest(".mapbox-2d-host"));
    const snapshot = window.__NETWORK_MAP_PROVIDER_DATASET_NATIVE__?.getSnapshot?.("category-general-practitioners");
    return Boolean(
      map?.getLayer("provider-dataset-native-category-general-practitioners-points")
      && map.getSource("provider-dataset-native-category-general-practitioners")
      && snapshot?.featureCount >= 2
      && snapshot.features.some((feature) => String(feature.popupHtml || "").includes("CI Indexed Clinic One"))
    );
  }, null, { timeout: 10_000 });

  const beforeCategoryClick = await categoryProviderDiagnostics(page);
  console.log("CATEGORY_PROVIDER_DIAGNOSTICS_BEFORE_CLICK", JSON.stringify(beforeCategoryClick));
  assert.ok(
    beforeCategoryClick.lifecycle?.initializers?.some((initializer) => initializer.id === "provider-dataset-native-map"),
    "Native provider dataset interaction owner must be registered before provider clicks",
  );
  assert.equal(beforeCategoryClick.sourceFeatureCount, 2, "First-party categorized provider state must contain both CI clinics");

  const categoryPoint = await active2dMapPoint(page, 0.4, 20.4);
  await page.mouse.click(categoryPoint.x, categoryPoint.y);
  try {
    await page.getByText("CI Indexed Clinic One").first().waitFor({ state: "visible", timeout: 8_000 });
  } catch (error) {
    const afterCategoryClick = await categoryProviderDiagnostics(page);
    console.error("CATEGORY_PROVIDER_DIAGNOSTICS_AFTER_CLICK", JSON.stringify(afterCategoryClick));
    throw error;
  }

  const nacchoToggle = page.getByRole("checkbox", { name: "NACCHO Local Health Departments" });
  await nacchoToggle.check();
  await page.waitForFunction(() => (
    window.__NETWORK_MAP_PROVIDER_DATASET_NATIVE__?.getSnapshot?.("naccho")?.featureCount === 2501
  ), null, { timeout: 15_000 });
  const nacchoFeatureCount = await page.evaluate(() => (
    window.__NETWORK_MAP_PROVIDER_DATASET_NATIVE__?.getSnapshot?.("naccho")?.featureCount || 0
  ));
  assert.equal(nacchoFeatureCount, 2501, "NACCHO layer must auto-paginate and render more than the old 1,000-record ceiling");
  await nacchoToggle.uncheck();
  await page.waitForFunction(() => (
    window.__NETWORK_MAP_PROVIDER_DATASET_NATIVE__?.getSnapshot?.("naccho")?.featureCount === 0
  ), null, { timeout: 10_000 });

  const beforeRadiusFeatures = await liveFinderSnapshotFeatureCount(page, "drop");
  const radiusButton = await clickByText(page, /Radius Tool/i);
  await page.waitForFunction((button) => button.classList.contains("active"), await radiusButton.elementHandle(), { timeout: 5_000 });
  await page.waitForFunction(() => window.__NETWORK_MAP_TOOL_STATE__?.getActiveTool?.() === "radius", null, { timeout: 5_000 });
  await mapCanvasClick(page, 0.68, 0.55, false);
  const radiusCard = page.locator(".local-pop-card:visible").filter({ hasText: "Radius extractor" }).first();
  await radiusCard.waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForFunction((before) => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => candidate.getContainer().closest(".mapbox-2d-host"));
    const snapshot = window.__NETWORK_MAP_LIVE_FINDER_NATIVE__?.getSnapshot?.("drop");
    return Boolean(
      map?.getLayer("radius-extractor-native-fill")
      && map.getSource("radius-extractor-native")
      && snapshot?.featureCount > before
      && snapshot.geometryTypes.includes("Polygon")
      && snapshot.geometryTypes.includes("Point")
    );
  }, beforeRadiusFeatures, { timeout: 10_000 });
  await page.waitForFunction(() => /Center:\s*[-\d.]+,\s*[-\d.]+/.test(
    document.querySelector(".radius-extractor-card")?.textContent || ""
  ), null, { timeout: 8_000 });
  const radiusCenterBefore = ((await radiusCard.textContent()) || "").match(/Center:\s*[-\d.]+,\s*[-\d.]+/)?.[0] || "";
  assert.ok(radiusCenterBefore, "Radius center must be visible after clicking the native Mapbox canvas");

  await page.locator(".map-dimension-toggle button[data-map-mode='3d']").evaluate((element) => element.click());
  await waitForMode(page, "3d");
  await page.locator(".mapbox-globe-host .mapboxgl-canvas").waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForFunction(() => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => candidate.getContainer().closest(".mapbox-globe-host"));
    const snapshot = window.__NETWORK_MAP_LIVE_FINDER_NATIVE__?.getSnapshot?.("drop");
    return Boolean(
      map?.getLayer("radius-extractor-native-fill")
      && map.getSource("radius-extractor-native")
      && snapshot?.featureCount > 0
    );
  }, null, { timeout: 10_000 });
  assert.ok(await liveFinderSnapshotFeatureCount(page, "drop") > 0, "3D Mapbox globe must retain the same native radius runtime geometry");
  await page.locator(".map-dimension-toggle button[data-map-mode='2d']").evaluate((element) => element.click());
  await waitForMode(page, "2d");
  await page.waitForFunction(() => !document.querySelector(".dual-engine-vortex.active"), null, { timeout: 35_000 });
  await radiusCard.waitFor({ state: "visible", timeout: 10_000 });

  const saveRing = radiusCard.getByRole("button", { name: /Save ring/i });
  await saveRing.waitFor({ state: "visible", timeout: 10_000 });
  assert.equal(await saveRing.isDisabled(), false, "Save ring must enable after a native Mapbox radius click");
  await saveRing.click();
  await radiusCard.getByText(/Ring 1/i).waitFor({ state: "visible", timeout: 5_000 });

  await page.getByRole("tab", { name: /Explorer workspace/i }).click();
  const explorer = page.locator(".provider-explorer-drawer.open:visible");
  await explorer.waitFor({ state: "visible", timeout: 10_000 });
  await clickByText(page, /^Density$/i, explorer);
  await page.locator(".provider-map-status").waitFor({ state: "visible", timeout: 5_000 });
  await page.waitForFunction(() => /density view.*17 matching records.*2 aggregated cells/i.test(document.querySelector(".provider-map-status")?.textContent || ""), null, { timeout: 10_000 });
  await page.waitForFunction(() => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => candidate.getContainer().closest(".mapbox-2d-host"));
    const snapshot = window.__NETWORK_MAP_PROVIDER_EXPLORER_NATIVE__?.getSnapshot?.("aggregate");
    return Boolean(
      map?.getLayer("provider-explorer-native-density")
      && map.getSource("provider-explorer-native-aggregate")
      && snapshot?.featureCount === 2
      && snapshot.geometryTypes.every((type) => type === "Point")
    );
  }, null, { timeout: 10_000 });
  const densityFeatureCount = await page.evaluate(() => (
    window.__NETWORK_MAP_PROVIDER_EXPLORER_NATIVE__?.getSnapshot?.("aggregate")?.featureCount || 0
  ));
  assert.equal(densityFeatureCount, 2, "Density cells must exist in first-party Provider Explorer aggregate state");

  await clickByText(page, /Hex field/i, explorer);
  await page.waitForFunction(() => /hex view.*17 matching records.*2 aggregated cells/i.test(document.querySelector(".provider-map-status")?.textContent || ""), null, { timeout: 10_000 });
  await page.waitForFunction(() => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => candidate.getContainer().closest(".mapbox-2d-host"));
    const snapshot = window.__NETWORK_MAP_PROVIDER_EXPLORER_NATIVE__?.getSnapshot?.("aggregate");
    return Boolean(
      map?.getLayer("provider-explorer-native-hex-fill")
      && map.getSource("provider-explorer-native-aggregate")
      && snapshot?.featureCount === 2
      && snapshot.geometryTypes.every((type) => type === "Polygon")
    );
  }, null, { timeout: 10_000 });

  await clickByText(page, /8px points/i, explorer);
  await page.waitForFunction(() => /showing 1 visible pins of 1 matching records/i.test(document.querySelector(".provider-map-status")?.textContent || ""), null, { timeout: 10_000 });
  await waitForActiveMapIdle(page, "2d");
  const providerPoint = await providerExplorerSnapshotPoint(page, "CI Stored Clinic");
  assert.ok(
    providerPoint && Number.isFinite(providerPoint.x) && Number.isFinite(providerPoint.y),
    `Stored Provider Explorer pin must exist in first-party Provider Explorer state: ${JSON.stringify(providerPoint?.snapshot || null)}`
  );
  console.log("STORED_PROVIDER_FEATURE_BEFORE_CLICK", JSON.stringify(providerPoint));
  await page.mouse.click(providerPoint.x, providerPoint.y);
  await page.getByText("CI Stored Clinic").first().waitFor({ state: "visible", timeout: 10_000 });
  const radiusCenterAfterProviderClick = ((await radiusCard.textContent()) || "").match(/Center:\s*[-\d.]+,\s*[-\d.]+/)?.[0] || "";
  assert.equal(radiusCenterAfterProviderClick, radiusCenterBefore, "Provider clicks must not fall through into Radius map-click ownership");

  await page.getByRole("tab", { name: /Finder workspace/i }).click();
  await page.locator(".live-panel.open:visible").waitFor({ state: "visible", timeout: 10_000 });
  await mapCanvasClick(page, 0.52, 0.5, true);
  await page.getByText("CI Live Clinic").first().waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForFunction(() => /1 facilities from OSM/i.test(document.querySelector(".live-panel.open")?.textContent || ""), null, { timeout: 15_000 });

  assert.deepEqual(pageErrors, [], `Mapbox native tool acceptance saw page errors: ${pageErrors.join("; ")}`);
  console.log(`Mapbox native tool acceptance passed in ${browserName}: categorized providers, uncapped NACCHO pagination, radius, 2D/3D, density, hex, provider click ownership, and OSM Live Finder.`);
} catch (error) {
  await page.screenshot({ path: path.join(artifactDir, "failure.png"), fullPage: true }).catch(() => undefined);
  fs.writeFileSync(path.join(artifactDir, "error.txt"), `${error instanceof Error ? error.stack || error.message : String(error)}\n\nPage errors:\n${pageErrors.join("\n")}`);
  throw error;
} finally {
  await context.close();
  await browser.close();
}
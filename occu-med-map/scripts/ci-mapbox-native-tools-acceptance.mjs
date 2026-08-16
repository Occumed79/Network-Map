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
          { clinic_name: "CI Indexed Clinic One", name: "CI Indexed Clinic One", lat: 20.4, lng: 0.4, address_1: "10 Indexed Way", city: "CI City", state: "CI", zip: "00001", phone: "+1 555 0301", website: "https://example.invalid/indexed-one", source_id: "indexed-ci-1", data_source: "indexed", category: "clinic", clinic_type: "general_practitioner", providerType: "general_practitioner", services: "primary care", types: ["primary care"] },
          { clinic_name: "CI Indexed Clinic Two", name: "CI Indexed Clinic Two", lat: 20.43, lng: 0.43, address_1: "20 Indexed Way", city: "CI City", state: "CI", zip: "00002", phone: "+1 555 0302", website: "https://example.invalid/indexed-two", source_id: "indexed-ci-2", data_source: "indexed", category: "clinic", clinic_type: "general_practitioner", providerType: "general_practitioner", services: "primary care", types: ["primary care"] },
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

async function nativeSourceFeatureCount(page, sourceId, mode = "2d") {
  return page.evaluate(({ requestedSourceId, requestedMode }) => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const selector = requestedMode === "3d" ? ".mapbox-globe-host" : ".mapbox-2d-host";
    const map = maps.find((candidate) => Boolean(candidate.getContainer().closest(selector)));
    if (!map?.getSource(requestedSourceId)) return 0;
    try {
      return map.querySourceFeatures(requestedSourceId).length;
    } catch {
      return 0;
    }
  }, { requestedSourceId: sourceId, requestedMode: mode });
}

async function nativePopupFeaturePoint(page, needle) {
  return page.evaluate((popupNeedle) => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => Boolean(candidate.getContainer().closest(".mapbox-2d-host")));
    if (!map) throw new Error("2D Mapbox map not available");
    const sourceIds = Object.keys(map.getStyle()?.sources || {})
      .filter((id) => id.startsWith("provider-explorer-native-") || id.startsWith("provider-dataset-native-"));
    const diagnostics = [];
    for (const sourceId of sourceIds) {
      let features = [];
      try {
        features = map.querySourceFeatures(sourceId);
      } catch {
        features = [];
      }
      diagnostics.push({
        sourceId,
        count: features.length,
        popupPreviews: features.map((feature) => String(feature.properties?.popupHtml || "").slice(0, 120)),
      });
      const feature = features.find((candidate) =>
        candidate.geometry?.type === "Point"
        && String(candidate.properties?.popupHtml || "").includes(popupNeedle)
      );
      if (!feature) continue;
      const coordinates = feature.geometry.coordinates;
      const point = map.project(coordinates);
      const rect = map.getCanvas().getBoundingClientRect();
      return { x: rect.left + point.x, y: rect.top + point.y, sourceId, coordinates, diagnostics };
    }
    return { x: null, y: null, sourceId: null, coordinates: null, diagnostics };
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

async function indexedProviderDiagnostics(page) {
  return page.evaluate(() => {
    const lifecycle = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getDiagnostics?.() || null;
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => candidate.getContainer().closest(".mapbox-2d-host"));
    const toggle = document.querySelector('input[aria-label="Indexed Providers"]');
    const row = toggle?.closest(".workflow-layer");
    if (!map) return { lifecycle, noMap: true, indexedRow: row?.textContent || "" };
    const style = map.getStyle();
    const nativeLayers = (style?.layers || [])
      .filter((layer) => String(layer.id).startsWith("provider-dataset-native-indexed"))
      .map((layer) => ({ id: layer.id, type: layer.type, source: layer.source || null }));
    const sourceId = "provider-dataset-native-indexed";
    let sourceFeatures = [];
    try {
      sourceFeatures = map.querySourceFeatures(sourceId);
    } catch {
      sourceFeatures = [];
    }
    return {
      lifecycle,
      indexedChecked: Boolean(toggle?.checked),
      indexedRow: String(row?.textContent || "").replace(/\s+/g, " ").trim(),
      styleLoaded: map.isStyleLoaded(),
      loaded: map.loaded(),
      moving: map.isMoving(),
      center: { lng: map.getCenter().lng, lat: map.getCenter().lat },
      zoom: map.getZoom(),
      nativeLayers,
      sourceId,
      sourceFeatureCount: sourceFeatures.length,
      clinicOneCount: sourceFeatures.filter((feature) => String(feature.properties?.popupHtml || "").includes("CI Indexed Clinic One")).length,
      popupPreviews: sourceFeatures.slice(0, 20).map((feature) => String(feature.properties?.popupHtml || "").slice(0, 180)),
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

  const indexedToggle = page.getByRole("checkbox", { name: "Indexed Providers" });
  const indexedResponsePredicate = (response) => {
    try {
      const url = new URL(response.url());
      return url.pathname === "/api/provider-layers/indexed" && response.request().method() === "GET";
    } catch { return false; }
  };
  const indexedResponsePromise = page.waitForResponse(indexedResponsePredicate, { timeout: 12_000 });
  await indexedToggle.check();
  const indexedResponse = await indexedResponsePromise;
  assert.equal(indexedResponse.ok(), true, `Indexed Providers request failed with HTTP ${indexedResponse.status()}`);
  const indexedPayload = await indexedResponse.json();
  assert.equal(indexedPayload.providers?.length, 2, "Indexed Providers API must return both CI clinics");

  // Camera movement deliberately exercises the real viewport-refresh path. Wait
  // for that second fetch (when emitted), the source row to settle, and Mapbox to
  // reach idle before asking the provider point to own a click.
  const viewportRefreshPromise = page.waitForResponse(indexedResponsePredicate, { timeout: 6000 }).catch(() => null);
  await page.evaluate(() => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => candidate.getContainer().closest(".mapbox-2d-host"));
    if (!map) throw new Error("2D Mapbox map unavailable for indexed-provider test");
    map.jumpTo({ center: [0.415, 20.415], zoom: 9 });
  });
  const viewportRefresh = await viewportRefreshPromise;
  if (viewportRefresh) {
    assert.equal(viewportRefresh.ok(), true, `Indexed viewport refresh failed with HTTP ${viewportRefresh.status()}`);
    const refreshPayload = await viewportRefresh.json();
    assert.equal(refreshPayload.providers?.length, 2, "Indexed viewport refresh must keep both CI clinics");
  }
  // The sidebar wording is presentation-only and has changed between
  // "loaded" and "rendered in viewport". Functional readiness is proved by
  // the checked source plus the native Mapbox layer assertion immediately below.
  await page.waitForFunction(() => Boolean(
    document.querySelector('input[aria-label="Indexed Providers"]')?.checked
  ), null, { timeout: 15_000 });
  await waitForActiveMapIdle(page, "2d");
  await page.waitForFunction(() => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => candidate.getContainer().closest(".mapbox-2d-host"));
    if (!map || !map.isStyleLoaded()) return false;
    if (!map.getLayer("provider-dataset-native-indexed-points") || !map.getSource("provider-dataset-native-indexed")) return false;
    try {
      return map.querySourceFeatures("provider-dataset-native-indexed").length >= 2;
    } catch {
      return false;
    }
  }, null, { timeout: 10_000 });

  const beforeIndexedClick = await indexedProviderDiagnostics(page);
  console.log("INDEXED_PROVIDER_DIAGNOSTICS_BEFORE_CLICK", JSON.stringify(beforeIndexedClick));
  assert.ok(
    beforeIndexedClick.lifecycle?.initializers?.some((initializer) => initializer.id === "provider-dataset-native-map"),
    "Native provider dataset interaction owner must be registered before provider clicks",
  );

  const indexedPoint = await active2dMapPoint(page, 0.4, 20.4);
  await page.mouse.click(indexedPoint.x, indexedPoint.y);
  try {
    await page.getByText("CI Indexed Clinic One").first().waitFor({ state: "visible", timeout: 8_000 });
  } catch (error) {
    const afterIndexedClick = await indexedProviderDiagnostics(page);
    console.error("INDEXED_PROVIDER_DIAGNOSTICS_AFTER_CLICK", JSON.stringify(afterIndexedClick));
    throw error;
  }

  const beforeRadiusFeatures = await nativeSourceFeatureCount(page, "radius-extractor-native", "2d");
  const radiusButton = await clickByText(page, /Radius Tool/i);
  await page.waitForFunction((button) => button.classList.contains("active"), await radiusButton.elementHandle(), { timeout: 5_000 });
  await page.waitForFunction(() => window.__NETWORK_MAP_TOOL_STATE__?.getActiveTool?.() === "radius", null, { timeout: 5_000 });
  await mapCanvasClick(page, 0.68, 0.55, false);
  const radiusCard = page.locator(".local-pop-card:visible").filter({ hasText: "Radius extractor" }).first();
  await radiusCard.waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForFunction((before) => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => candidate.getContainer().closest(".mapbox-2d-host"));
    if (!map?.getLayer("radius-extractor-native-fill") || !map.getSource("radius-extractor-native")) return false;
    try {
      return map.querySourceFeatures("radius-extractor-native").length > before;
    } catch {
      return false;
    }
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
    if (!map?.getLayer("radius-extractor-native-fill") || !map.getSource("radius-extractor-native")) return false;
    try {
      return map.querySourceFeatures("radius-extractor-native").length > 0;
    } catch {
      return false;
    }
  }, null, { timeout: 10_000 });
  assert.ok(await nativeSourceFeatureCount(page, "radius-extractor-native", "3d") > 0, "3D Mapbox globe must receive the same native radius geometry");
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
    if (!map?.getLayer("provider-explorer-native-density") || !map.getSource("provider-explorer-native-aggregate")) return false;
    try {
      return map.querySourceFeatures("provider-explorer-native-aggregate").length === 2;
    } catch {
      return false;
    }
  }, null, { timeout: 10_000 });
  const densityFeatureCount = await nativeSourceFeatureCount(page, "provider-explorer-native-aggregate", "2d");
  assert.equal(densityFeatureCount, 2, "Density cells must exist in the native Provider Explorer aggregate source");

  await clickByText(page, /Hex field/i, explorer);
  await page.waitForFunction(() => /hex view.*17 matching records.*2 aggregated cells/i.test(document.querySelector(".provider-map-status")?.textContent || ""), null, { timeout: 10_000 });
  await page.waitForFunction(() => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => candidate.getContainer().closest(".mapbox-2d-host"));
    if (!map?.getLayer("provider-explorer-native-hex-fill") || !map.getSource("provider-explorer-native-aggregate")) return false;
    try {
      const features = map.querySourceFeatures("provider-explorer-native-aggregate");
      return features.length === 2 && features.every((feature) => feature.geometry?.type === "Polygon");
    } catch {
      return false;
    }
  }, null, { timeout: 10_000 });

  await clickByText(page, /8px points/i, explorer);
  await page.waitForFunction(() => /showing 1 visible pins of 1 matching records/i.test(document.querySelector(".provider-map-status")?.textContent || ""), null, { timeout: 10_000 });
  await waitForActiveMapIdle(page, "2d");
  const providerPoint = await nativePopupFeaturePoint(page, "CI Stored Clinic");
  assert.ok(
    providerPoint && Number.isFinite(providerPoint.x) && Number.isFinite(providerPoint.y),
    `Stored Provider Explorer pin must exist in native Provider Explorer popup metadata: ${JSON.stringify(providerPoint?.diagnostics || [])}`
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
  console.log(`Mapbox native tool acceptance passed in ${browserName}: indexed providers, radius, 2D/3D, density, hex, provider click ownership, and OSM Live Finder.`);
} catch (error) {
  await page.screenshot({ path: path.join(artifactDir, "failure.png"), fullPage: true }).catch(() => undefined);
  fs.writeFileSync(path.join(artifactDir, "error.txt"), `${error instanceof Error ? error.stack || error.message : String(error)}\n\nPage errors:\n${pageErrors.join("\n")}`);
  throw error;
} finally {
  await context.close();
  await browser.close();
}

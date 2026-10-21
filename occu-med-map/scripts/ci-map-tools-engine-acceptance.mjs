// Map Tools functional-engine acceptance.
//
// Drives every Map Tools sidebar control in the real application against
// mocked Mapbox Geocoding, Directions, Matrix, Isochrone, style, and tile
// endpoints (no billable Mapbox traffic), in the 2D map, the 3D globe, and the
// "2D unavailable, globe available" path. Every check records pass/fail plus
// an in-page latency measurement so the same script reports the defect matrix
// on an old revision (NETWORK_MAP_REPORT_ONLY=1) and gates the fixed one.
//
// Raster tiles are served slowly on purpose: while tiles stream in, Mapbox GL
// reports isStyleLoaded() === false, which is the production condition that
// silently dropped overlay updates.
import { enterNetworkMap } from "./enter-network-map.mjs";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.NETWORK_MAP_CI_UI_URL || "http://127.0.0.1:4173";
const reportOnly = process.env.NETWORK_MAP_REPORT_ONLY === "1";
const reportPath = process.env.NETWORK_MAP_REPORT_PATH || "";
const API_LATENCY_MS = Number(process.env.NETWORK_MAP_MOCK_API_LATENCY_MS || 150);
const TILE_LATENCY_MS = Number(process.env.NETWORK_MAP_MOCK_TILE_LATENCY_MS || 1200);
const artifactDir = path.resolve(process.cwd(), "test-results", "map-tools-engine");
fs.mkdirSync(artifactDir, { recursive: true });

const ORIGIN = { lng: 0.35, lat: 20.35 };
const DESTINATION = { lng: 0.6, lat: 20.6 };
const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const json = (route, payload, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(payload) });

function haversineMeters(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.sqrt(h));
}

function parseCoordinates(text) {
  return decodeURIComponent(text).split(";").map((pair) => {
    const [lng, lat] = pair.split(",").map(Number);
    return { lng, lat };
  });
}

function styleFor(name) {
  return {
    version: 8,
    name,
    sources: {
      "ci-slow-raster": {
        type: "raster",
        tiles: ["https://api.mapbox.com/ci-slow-tiles/{z}/{x}/{y}.png"],
        tileSize: 256,
      },
    },
    layers: [
      { id: "ci-background", type: "background", paint: { "background-color": "#e7edf3" } },
      { id: "ci-slow-raster", type: "raster", source: "ci-slow-raster", paint: { "raster-opacity": 0.01 } },
    ],
  };
}

function createMapboxMock(stats, options = {}) {
  return async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    if (pathname.startsWith("/ci-slow-tiles/")) {
      stats.tiles += 1;
      await sleep(TILE_LATENCY_MS);
      return route.fulfill({ status: 200, contentType: "image/png", body: PNG_1PX }).catch(() => undefined);
    }
    if (pathname.includes("/styles/v1/")) {
      const styleName = pathname.split("/styles/v1/")[1] || "unknown";
      stats.styles.push(styleName);
      if (options.failStyles?.()) return json(route, { message: "CI forced 2D style failure" }, 503);
      return json(route, styleFor(styleName));
    }
    await sleep(API_LATENCY_MS);
    if (pathname.startsWith("/geocoding/v5/mapbox.places/")) {
      const query = decodeURIComponent(pathname.slice("/geocoding/v5/mapbox.places/".length).replace(/\.json$/, ""));
      const reverse = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(query);
      stats.geocoding += 1;
      const center = reverse
        ? query.split(",").map(Number)
        : /destination/i.test(query) ? [DESTINATION.lng, DESTINATION.lat] : [ORIGIN.lng, ORIGIN.lat];
      const label = reverse ? "CI Reverse Place" : /destination/i.test(query) ? "CI Destination" : "CI Origin";
      return json(route, {
        type: "FeatureCollection",
        features: [{
          id: "place.ci",
          type: "Feature",
          text: label,
          place_name: `${label}, CI Region, United States`,
          place_type: ["place"],
          center,
          geometry: { type: "Point", coordinates: center },
          properties: {},
          context: [{ id: "country.ci", text: "United States", short_code: "us" }],
        }],
      });
    }
    if (pathname.startsWith("/directions-matrix/v1/mapbox/")) {
      stats.matrix += 1;
      const coordinates = parseCoordinates(pathname.split("/").pop());
      const sources = (url.searchParams.get("sources") || coordinates.map((_, index) => index).join(";")).split(";").map(Number);
      const destinations = (url.searchParams.get("destinations") || coordinates.map((_, index) => index).join(";")).split(";").map(Number);
      stats.matrixElements += sources.length * destinations.length;
      const distances = sources.map((source) => destinations.map((destination) => haversineMeters(coordinates[source], coordinates[destination]) * 1.3));
      const durations = distances.map((row) => row.map((meters) => meters / 20));
      return json(route, {
        code: "Ok",
        durations,
        distances,
        sources: sources.map((index) => ({ location: [coordinates[index].lng, coordinates[index].lat] })),
        destinations: destinations.map((index) => ({ location: [coordinates[index].lng, coordinates[index].lat] })),
      });
    }
    if (pathname.startsWith("/directions/v5/mapbox/")) {
      stats.directions += 1;
      const [start, end] = parseCoordinates(pathname.split("/").pop());
      const meters = haversineMeters(start, end) * 1.3;
      return json(route, {
        code: "Ok",
        routes: [{
          distance: meters,
          duration: meters / 20,
          geometry: {
            type: "LineString",
            coordinates: [[start.lng, start.lat], [(start.lng + end.lng) / 2, start.lat], [end.lng, end.lat]],
          },
        }],
        waypoints: [],
      });
    }
    if (pathname.startsWith("/isochrone/v1/mapbox/")) {
      stats.isochrone += 1;
      const [center] = parseCoordinates(pathname.split("/").pop());
      const contours = (url.searchParams.get("contours_minutes") || "15").split(",").map(Number);
      return json(route, {
        type: "FeatureCollection",
        features: [...contours].reverse().map((minutes) => {
          const d = minutes / 200;
          return {
            type: "Feature",
            properties: { contour: minutes, color: "#000000", fillColor: "#000000" },
            geometry: {
              type: "Polygon",
              coordinates: [[[center.lng - d, center.lat - d], [center.lng + d, center.lat - d], [center.lng + d, center.lat + d], [center.lng - d, center.lat + d], [center.lng - d, center.lat - d]]],
            },
          };
        }),
      });
    }
    return route.fulfill({ status: 204, body: "" });
  };
}

async function mockNetwork(page, stats, options = {}) {
  await page.route("https://api.mapbox.com/**", createMapboxMock(stats, options));
  await page.route("https://events.mapbox.com/**", (route) => route.fulfill({ status: 204, body: "" }));
  await page.route("https://nominatim.openstreetmap.org/**", (route) => json(route, { display_name: "CI City", address: { city: "CI City", state: "CI" } }));
  await page.route("https://maps.googleapis.com/**", (route) => json(route, { results: [], status: "ZERO_RESULTS" }));
  await page.route("https://tigerweb.geo.census.gov/**", (route) => json(route, {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { NAME: "CI County", BASENAME: "CI", STATE: "06", GEOID: "06999" },
      geometry: { type: "Polygon", coordinates: [[[0.2, 20.2], [0.7, 20.2], [0.7, 20.7], [0.2, 20.7], [0.2, 20.2]]] },
    }],
  }));
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    if (request.method() !== "GET") return json(route, { ok: true, success: true, id: "ci-map-tools" });
    if (pathname.endsWith("/revision")) return json(route, { revision: "ci-map-tools" });
    if (pathname === "/api/live-finder/search") {
      const lat = Number(url.searchParams.get("lat")) || 20;
      const lng = Number(url.searchParams.get("lng")) || 0;
      const results = [[0.05, 0.05, "CI Live Clinic A"], [0.1, 0.12, "CI Live Clinic B"], [-0.15, 0.08, "CI Live Clinic C"]].map(([dLat, dLng, name], index) => ({
        id: `osm-ci-live-${index}`, lat: lat + dLat, lng: lng + dLng, name, cat: "clinic", dist: 4 + index, addr: `${index + 1} Live Way`,
        phone: "", website: "", source: "OpenStreetMap", sourceDetail: "CI Overpass",
      }));
      return json(route, { results, facets: { clinic: results.length }, priorityCounts: { clinical: results.length }, providers: [{ source: "OpenStreetMap", endpoint: "CI", ok: true, count: results.length }] });
    }
    if (pathname === "/api/provider-category-layers/general-practitioners") {
      return json(route, {
        providers: [
          { clinic_name: "CI Indexed Clinic One", name: "CI Indexed Clinic One", lat: 20.4, lng: 0.4, city: "CI City", state: "CI", source_id: "indexed-ci-1", data_source: "indexed", clinic_type: "general_practitioner", providerType: "general_practitioner" },
          { clinic_name: "CI Indexed Clinic Two", name: "CI Indexed Clinic Two", lat: 20.43, lng: 0.43, city: "CI City", state: "CI", source_id: "indexed-ci-2", data_source: "indexed", clinic_type: "general_practitioner", providerType: "general_practitioner" },
        ],
        count: 2, loaded: 2, total: 2, page: 1, limit: 2000, hasMore: false, visibleCapped: false,
      });
    }
    if (pathname === "/api/provider-explorer") {
      return json(route, {
        providers: [{ id: "explorer-ci-1", name: "CI Explorer Clinic", lat: 20.41, lng: 0.41, city: "CI City", country: "United States", source: "CI Stored", source_kind: "stored" }],
        total: 1, page: 1, hasMore: false,
      });
    }
    if (pathname.includes("provider-category-layers") || pathname.includes("provider-layers")) return json(route, { providers: [], count: 0, loaded: 0, total: 0, page: 1, hasMore: false, visibleCapped: false });
    if (pathname.includes("provider-explorer")) return json(route, { providers: [], total: 0, page: 1, hasMore: false, cells: [] });
    if (pathname.includes("health") || pathname.includes("ready")) return json(route, { ok: true, status: "ok" });
    return json(route, { providers: [], results: [], items: [], total: 0, cells: [] });
  });
}

// ── In-page measurement helpers ────────────────────────────────────────────

const PAGE_HELPERS = `
  window.__mt = {
    map(mode) {
      const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
      const selector = (mode || window.__NETWORK_MAP_GLOBE__?.getMode?.()) === "3d" ? ".mapbox-globe-host" : ".mapbox-2d-host";
      return maps.find((map) => map.getContainer().closest(selector)) || null;
    },
    count(mode, sourceId, geometryType) {
      const map = this.map(mode);
      if (!map) return -1;
      let data;
      try { data = map.getStyle()?.sources?.[sourceId]?.data; } catch { return -1; }
      if (!data || typeof data !== "object") return -1;
      const features = data.type === "FeatureCollection" ? data.features : [];
      return geometryType ? features.filter((feature) => feature.geometry?.type === geometryType).length : features.length;
    },
    panel() { return document.querySelector("#sidebar-map-tools-panel .occumed-map-tools-panel"); },
    status() { return this.panel()?.querySelector(":scope > .occumed-mapbox-status")?.textContent || ""; },
    section(id) { return this.panel()?.querySelector('[data-map-tools-section="' + id + '"]'); },
    coreButton(sectionTitle, label) {
      const section = Array.from(this.panel()?.querySelectorAll(".occumed-map-tools-section") || [])
        .find((node) => node.querySelector(":scope > .occumed-map-tools-section-title")?.textContent?.trim() === sectionTitle);
      return this.button(section, label);
    },
    button(scope, label) {
      const root = typeof scope === "string" ? (this.section(scope) || this.panel()?.querySelector(scope)) : scope;
      return Array.from((root || document).querySelectorAll("button")).find((button) => button.textContent.trim() === label) || null;
    },
  };
`;

// Click-to-result latency. Completion is detected from DOM mutations plus a
// 4 ms timer rather than animation frames, so the number reflects when the
// result reached the sidebar/map state, not how long the (software-rendered
// in CI) WebGL frame took to paint.
async function measure(page, action, predicateSource, timeoutMs = 8000) {
  return page.evaluate(({ action, predicateSource, timeoutMs }) => new Promise((resolve) => {
    const predicate = new Function(`return (${predicateSource});`);
    const act = new Function(`return (${action});`);
    const started = performance.now();
    let done = false;
    let observer = null;
    let timer = 0;
    const finish = (ok) => {
      if (done) return;
      done = true;
      observer?.disconnect();
      window.clearInterval(timer);
      resolve({ ok, ms: Math.round(performance.now() - started) });
    };
    const test = () => {
      let value = false;
      try { value = Boolean(predicate()); } catch { value = false; }
      if (value) finish(true);
      else if (performance.now() - started > timeoutMs) finish(false);
    };
    observer = new MutationObserver(test);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    timer = window.setInterval(test, 4);
    act();
    test();
  }), { action, predicateSource, timeoutMs });
}

async function waitIdle(page, mode) {
  await page.evaluate(async (requestedMode) => {
    const map = window.__mt.map(requestedMode);
    if (!map) return;
    await Promise.race([
      new Promise((resolve) => map.once("idle", resolve)),
      new Promise((resolve) => setTimeout(resolve, 6000)),
    ]);
  }, mode);
}

const results = [];
let diagnosticsPage = null;
async function diagnostics() {
  if (!diagnosticsPage) return "";
  return diagnosticsPage.evaluate(() => {
    const mode = window.__NETWORK_MAP_GLOBE__?.getMode?.();
    const map = window.__mt?.map(mode);
    const ids = ["map-tools-native-origin", "map-tools-native-zones", "map-tools-native-route", "map-tools-native-density", "map-tools-native-planner", "map-tools-geographic-focus", "provider-location-search-results"];
    const counts = ids.map((id) => `${id.replace(/^map-tools-(native-)?/, "")}=${window.__mt?.count(mode, id)}`).join(" ");
    const providerLayer = "provider-dataset-native-category-general-practitioners-points";
    let rendered = -1;
    try { rendered = map?.getLayer(providerLayer) ? map.queryRenderedFeatures({ layers: [providerLayer] }).length : -2; } catch {}
    const coverage = window.__mt?.section("provider-coverage-radius")?.querySelector(".occumed-mapbox-status")?.textContent;
    return `coverage="${coverage}" providerLayerRendered=${rendered} mode=${mode} styleLoaded=${map?.isStyleLoaded?.()} style=${map?.getStyle?.()?.name} status="${window.__mt?.status?.()}" ${counts}`;
  }).catch((error) => `diagnostics failed: ${error.message}`);
}
async function check(name, run) {
  const started = Date.now();
  try {
    const outcome = await run();
    const ok = outcome?.ok !== false;
    results.push({ name, ok, ms: outcome?.ms ?? Date.now() - started, detail: outcome?.detail || "" });
  } catch (error) {
    results.push({ name, ok: false, ms: Date.now() - started, detail: error instanceof Error ? error.message.split("\n")[0] : String(error) });
  }
  const last = results[results.length - 1];
  if (!last.ok) last.detail = `${last.detail} [${await diagnostics()}]`.trim();
  console.log(`${last.ok ? "PASS" : "FAIL"} ${name} (${last.ms} ms)${last.detail ? ` — ${last.detail}` : ""}`);
}

async function openMapTools(page) {
  await page.getByRole("tab", { name: /^Map Tools workspace\b/ }).click();
  await page.waitForFunction(() => Boolean(window.__mt?.panel()?.isConnected), null, { timeout: 15_000 });
}

async function boot(page) {
  await page.addInitScript(PAGE_HELPERS);
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await enterNetworkMap(page);
  await page.locator(".app-wrap").waitFor({ state: "visible", timeout: 20_000 });
}

async function switchMode(page, mode) {
  await page.locator(`.map-dimension-toggle button[data-map-mode='${mode}']`).click();
  await page.waitForFunction((expected) => window.__NETWORK_MAP_GLOBE__?.getMode?.() === expected, mode, { timeout: 40_000 });
  await page.waitForFunction(() => !document.querySelector(".dual-engine-vortex.active"), null, { timeout: 40_000 });
}

// Exercises the core Map Tools controls against whichever map is active.
async function exerciseCoreControls(page, mode, stats) {
  const tag = `[${mode}]`;
  const src = (id) => JSON.stringify(id);

  await check(`${tag} Search sets origin on the visible map`, async () => {
    await page.evaluate(() => { const input = window.__mt.panel().querySelector("input.occumed-mapbox-search:not(.occumed-route-from):not(.occumed-route-to)"); input.value = ""; });
    const input = page.locator("#sidebar-map-tools-panel .occumed-map-tools-section input.occumed-mapbox-search[placeholder='Search address or place']");
    await input.fill("CI Origin");
    return measure(page,
      `window.__mt.button(window.__mt.panel(), "Search").click()`,
      `/Origin set: CI Origin/.test(window.__mt.status()) && window.__mt.count(${src(mode)}, "map-tools-native-origin") === 1`);
  });

  await waitIdle(page, mode);
  await check(`${tag} Service Zones draws four isochrone contours`, async () => measure(page,
    `window.__mt.button(window.__mt.panel(), "Service Zones").click()`,
    `/Service zones shown/.test(window.__mt.status()) && window.__mt.count(${src(mode)}, "map-tools-native-zones") === 4`));

  // Pan away so tiles stream in (isStyleLoaded() === false) and clear while they load.
  await check(`${tag} Clear removes routes and zones while tiles are loading`, async () => {
    await page.evaluate((requestedMode) => { const map = window.__mt.map(requestedMode); map.jumpTo({ center: [map.getCenter().lng + 0.3, map.getCenter().lat + 0.3] }); }, mode);
    const styleLoaded = await page.evaluate((requestedMode) => window.__mt.map(requestedMode).isStyleLoaded(), mode);
    const outcome = await measure(page,
      `window.__mt.coreButton("Routes and Zones", "Clear").click()`,
      `/Routes and zones cleared/.test(window.__mt.status()) && window.__mt.count(${src(mode)}, "map-tools-native-zones") === 0`, 3000);
    return { ...outcome, detail: `isStyleLoaded at click=${styleLoaded}` };
  });

  await check(`${tag} Service Zones redraws while tiles are loading`, async () => {
    await page.evaluate((requestedMode) => { const map = window.__mt.map(requestedMode); map.jumpTo({ center: [map.getCenter().lng - 0.3, map.getCenter().lat - 0.3] }); }, mode);
    return measure(page,
      `window.__mt.button(window.__mt.panel(), "Service Zones").click()`,
      `/Service zones shown/.test(window.__mt.status()) && window.__mt.count(${src(mode)}, "map-tools-native-zones") === 4`);
  });

  await waitIdle(page, mode);
  await check(`${tag} Rank Visible ranks visible provider pins`, async () => {
    const before = { directions: stats.directions, matrix: stats.matrix };
    await page.evaluate((requestedMode) => { window.__mt.map(requestedMode).jumpTo({ center: [0.39, 20.39], zoom: 10 }); }, mode);
    await waitIdle(page, mode);
    const outcome = await measure(page,
      `window.__mt.button(window.__mt.panel(), "Rank Visible").click()`,
      `/Ranked [1-9]\\d* provider pins/.test(window.__mt.status()) && window.__mt.panel().querySelectorAll(".occumed-eta-results .occumed-eta-row").length >= 2`, 12_000);
    return { ...outcome, detail: `directions=${stats.directions - before.directions} matrix=${stats.matrix - before.matrix}` };
  });

  await check(`${tag} Apply to Results publishes rankings to result ETA badges`, async () => measure(page,
    `(window.__etaResults = [], window.addEventListener("occumed:provider-eta-result", (event) => window.__etaResults.push(event.detail)), window.__mt.button(window.__mt.panel(), "Apply to Results").click())`,
    `window.__etaResults.some((result) => result && result.rankings && result.rankings.length >= 2 && result.rankings[0].rank === 1)`, 3000));

  await check(`${tag} Copy ETA copies ranking text`, async () => measure(page,
    `window.__mt.button(window.__mt.panel(), "Copy ETA").click()`,
    `/ETA ranking copied/.test(window.__mt.status())`, 3000));

  await check(`${tag} Ranked row draws its route`, async () => measure(page,
    `window.__mt.panel().querySelector(".occumed-eta-results .occumed-eta-row").click()`,
    `/min\\.$/.test(window.__mt.status()) && window.__mt.count(${src(mode)}, "map-tools-native-route", "LineString") === 1`));

  await check(`${tag} Density samples visible provider pins`, async () => {
    const outcome = await measure(page,
      `window.__mt.button(window.__mt.panel(), "Density").click()`,
      `(() => { const sampled = Number((window.__mt.status().match(/Density field: (\\d+)/) || [])[1]); return sampled >= 1 && window.__mt.count(${src(mode)}, "map-tools-native-density") === sampled; })()`);
    await page.evaluate(() => window.__mt.button(window.__mt.panel(), "Density").click());
    return outcome;
  });

  await check(`${tag} Basemap switch applies to the visible map and keeps overlays`, async () => {
    const styleCount = stats.styles.length;
    const outcome = await measure(page,
      `window.__mt.button(window.__mt.panel(), "Satellite").click()`,
      `(() => { try { return window.__mt.map(${src(mode)}).getStyle()?.name?.includes("satellite-streets-v12"); } catch { return false; } })() && window.__mt.count(${src(mode)}, "map-tools-native-origin") === 1 && window.__mt.count(${src(mode)}, "map-tools-native-zones") === 4 && Boolean(window.__mt.map(${src(mode)}).getLayer("map-tools-native-zones-fill"))`, 10_000);
    const requested = stats.styles.slice(styleCount);
    await page.evaluate(() => window.__mt.button(window.__mt.panel(), "Dark").click());
    await page.waitForFunction((requestedMode) => { try { return window.__mt.map(requestedMode).getStyle()?.name?.includes("dark-v11"); } catch { return false; } }, mode, { timeout: 10_000 }).catch(() => undefined);
    return { ...outcome, detail: `styles requested: ${requested.join(", ") || "none"}` };
  });

  await check(`${tag} From/To route draws planner route without clobbering other statuses`, async () => {
    await page.locator("#sidebar-map-tools-panel input.occumed-route-from").fill("CI Origin");
    await page.locator("#sidebar-map-tools-panel input.occumed-route-to").fill("CI Destination");
    const outcome = await measure(page,
      `window.__mt.panel().querySelector(".occumed-route-go").click()`,
      `/mi · \\d+ min with traffic/.test(window.__mt.status()) && window.__mt.count(${src(mode)}, "map-tools-native-planner", "LineString") === 1`);
    const clobbered = await page.evaluate(() => Array.from(window.__mt.panel().querySelectorAll(".occumed-mapbox-status"))
      .filter((node) => node.parentElement !== window.__mt.panel() && /with traffic/.test(node.textContent || "")).length);
    if (clobbered) return { ok: false, ms: outcome.ms, detail: `${clobbered} unrelated section status line(s) overwritten with the route result` };
    return outcome;
  });

  await check(`${tag} Route planner Clear removes planner overlay`, async () => measure(page,
    `window.__mt.panel().querySelector(".occumed-route-clear").click()`,
    `window.__mt.count(${src(mode)}, "map-tools-native-planner") === 0`));

  await check(`${tag} Coverage radius ring follows selected pin`, async () => {
    await page.evaluate(() => window.__mt.button("provider-coverage-radius", "10 mi").click());
    await page.evaluate((requestedMode) => { window.__mt.map(requestedMode).jumpTo({ center: [0.4, 20.4], zoom: 11 }); }, mode);
    await waitIdle(page, mode);
    const point = await page.evaluate((requestedMode) => {
      const map = window.__mt.map(requestedMode);
      const projected = map.project([0.4, 20.4]);
      const rect = map.getCanvas().getBoundingClientRect();
      return { x: rect.left + projected.x, y: rect.top + projected.y };
    }, mode);
    const under = await page.evaluate(({ x, y, requestedMode }) => {
      const map = window.__mt.map(requestedMode);
      const rect = map.getCanvas().getBoundingClientRect();
      const px = [x - rect.left, y - rect.top];
      const hits = map.queryRenderedFeatures([[px[0] - 12, px[1] - 12], [px[0] + 12, px[1] + 12]]).map((feature) => feature.layer?.id);
      const element = document.elementFromPoint(x, y);
      return `element=${element?.className} hits=${[...new Set(hits)].join(",")}`;
    }, { ...point, requestedMode: mode });
    const started = Date.now();
    await page.mouse.click(point.x, point.y);
    await page.waitForFunction((requestedMode) => window.__mt.count(requestedMode, "map-tools-provider-coverage-radius", "Polygon") >= 1, mode, { timeout: 10_000 })
      .catch((error) => { throw new Error(`${error.message.split("\n")[0]} ${under}`); });
    const ms = Date.now() - started;
    await page.evaluate(() => { window.__mt.button("provider-coverage-radius", "Clear pins").click(); window.__mt.button("provider-coverage-radius", "Off").click(); });
    await page.keyboard.press("Escape");
    return { ok: true, ms };
  });

  await check(`${tag} Geographic Focus search, select, and clear`, async () => {
    await page.locator("#sidebar-map-tools-panel [data-map-tools-section='geographic-focus'] input").fill("CI");
    await page.evaluate(() => window.__mt.button("geographic-focus", "Search").click());
    await page.waitForFunction(() => window.__mt.section("geographic-focus").querySelector(".occumed-eta-results button"), null, { timeout: 5000 });
    const selected = await measure(page,
      `window.__mt.section("geographic-focus").querySelector(".occumed-eta-results button").click()`,
      `window.__mt.count(${src(mode)}, "map-tools-geographic-focus", "Polygon") === 1`);
    if (!selected.ok) return { ...selected, detail: "boundary not drawn" };
    const cleared = await measure(page,
      `window.__mt.button("geographic-focus", "Clear areas").click()`,
      `window.__mt.count(${src(mode)}, "map-tools-geographic-focus") === 0`);
    return { ok: cleared.ok, ms: selected.ms, detail: cleared.ok ? "" : "boundary not cleared" };
  });

  await check(`${tag} Provider Location Finder shows provider dots`, async () => {
    await page.locator("#sidebar-map-tools-panel .occumed-provider-location-country").fill("United States");
    await page.locator("#sidebar-map-tools-panel .occumed-provider-location-city").fill("CI City");
    const outcome = await measure(page,
      `window.__mt.panel().querySelector(".occumed-provider-location-submit").click()`,
      `/individual providers? shown/.test(window.__mt.panel().querySelector(".occumed-provider-location-status")?.textContent || "") && window.__mt.count(${src(mode)}, "provider-location-search-results") >= 1`, 10_000);
    await page.evaluate(() => window.__mt.panel().querySelector(".occumed-provider-location-clear")?.click());
    return outcome;
  });
}

async function sidebarLatency(page, label) {
  // Tab switches while the map is busy animating must not wait on the map.
  await page.evaluate(() => {
    const map = window.__mt.map();
    map.flyTo({ center: [map.getCenter().lng + 2, map.getCenter().lat + 1], zoom: 6, duration: 4000, essential: true });
  });
  const samples = [];
  for (let index = 0; index < 4; index += 1) {
    const toProviders = await measure(page,
      `document.querySelector('[data-workspace-tab="providers"]').click()`,
      `document.querySelector('[data-workspace-tab="providers"]').getAttribute("aria-selected") === "true"`);
    const toMapTools = await measure(page,
      `document.querySelector('[data-workspace-tab="mapTools"]').click()`,
      `document.querySelector('[data-workspace-tab="mapTools"]').getAttribute("aria-selected") === "true" && window.__mt.panel()?.getBoundingClientRect().height > 0`);
    samples.push(toProviders.ms, toMapTools.ms);
  }
  samples.sort((a, b) => a - b);
  const p50 = samples[Math.floor(samples.length / 2)];
  const max = samples[samples.length - 1];
  results.push({ name: `${label} sidebar tab switch during map flight`, ok: max < 500, ms: p50, detail: `p50=${p50}ms max=${max}ms n=${samples.length}` });
  console.log(`${max < 500 ? "PASS" : "FAIL"} ${label} sidebar tab switch during map flight — p50=${p50}ms max=${max}ms`);
}

const browser = await chromium.launch({ headless: true });
const pageErrors = [];
let failed = false;
try {
  // ── Scenario A: 2D map, then the 3D globe ──────────────────────────────
  {
    const stats = { styles: [], tiles: 0, geocoding: 0, directions: 0, matrix: 0, matrixElements: 0, isochrone: 0 };
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", permissions: ["clipboard-read", "clipboard-write"] });
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(`A: ${error.message} @ ${(error.stack || "").split("\n").slice(3, 9).map((line) => line.trim().replace(/\?v=\w+/, "")).join(" | ")}`));
    diagnosticsPage = page;
    await mockNetwork(page, stats);
    await page.addInitScript(() => {
      window.__longTasks = [];
      try { new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__longTasks.push(entry.duration); }).observe({ type: "longtask", buffered: true }); } catch {}
    });
    await boot(page);
    await page.waitForFunction(() => Boolean(window.__mt.map("2d")), null, { timeout: 20_000 });
    await page.locator(".mapbox-2d-host .mapboxgl-canvas").waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("checkbox", { name: "General Practitioners" }).check();
    await page.waitForFunction(() => (window.__NETWORK_MAP_PROVIDER_DATASET_NATIVE__?.getSnapshot?.("category-general-practitioners")?.featureCount || 0) >= 2, null, { timeout: 15_000 });

    await check("[2d] Map Tools panel is docked in the sidebar", async () => {
      const started = Date.now();
      await openMapTools(page);
      return { ok: true, ms: Date.now() - started };
    });
    await sidebarLatency(page, "[2d]");
    await openMapTools(page);
    await exerciseCoreControls(page, "2d", stats);

    await switchMode(page, "3d");
    await page.waitForFunction(() => Boolean(window.__mt.map("3d")?.loaded()), null, { timeout: 20_000 });
    await openMapTools(page);
    await check("[3d] Map Tools panel stays available on the globe", async () => ({ ok: Boolean(await page.evaluate(() => window.__mt.panel()?.getBoundingClientRect().height > 0)), ms: 0 }));
    await sidebarLatency(page, "[3d]");
    await openMapTools(page);
    await exerciseCoreControls(page, "3d", stats);

    const longTasks = await page.evaluate(() => window.__longTasks || []);
    console.log(`MOCK_REQUESTS ${JSON.stringify({ ...stats, styles: stats.styles.length })}`);
    console.log(`LONG_TASKS count=${longTasks.length} total=${Math.round(longTasks.reduce((sum, value) => sum + value, 0))}ms max=${Math.round(Math.max(0, ...longTasks))}ms`);
    results.push({ name: "request totals", ok: true, ms: 0, detail: JSON.stringify({ ...stats, styles: stats.styles.length }) });
    await page.screenshot({ path: path.join(artifactDir, "map-tools-globe.png") }).catch(() => undefined);
    await context.close();
  }

  // ── Scenario C: Find workspace drive-time ranking and Results ETA badges ─
  {
    const stats = { styles: [], tiles: 0, geocoding: 0, directions: 0, matrix: 0, matrixElements: 0, isochrone: 0 };
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(`C: ${error.message}`));
    diagnosticsPage = page;
    await mockNetwork(page, stats);
    await boot(page);
    await page.waitForFunction(() => Boolean(window.__mt.map("2d")?.loaded()), null, { timeout: 20_000 });
    await page.getByRole("tab", { name: /^Find workspace\b/ }).click();
    const find = page.getByRole("tabpanel", { name: "Find workspace", exact: true });
    await find.getByRole("button", { name: "Nearby", exact: true }).click();
    const center = await page.evaluate(() => {
      const rect = window.__mt.map("2d").getCanvas().getBoundingClientRect();
      return { x: rect.left + rect.width * 0.55, y: rect.top + rect.height * 0.5 };
    });
    await page.mouse.dblclick(center.x, center.y, { delay: 70 });
    const rankButton = find.getByRole("button", { name: "Rank by Drive Time", exact: true });
    await rankButton.waitFor({ state: "visible", timeout: 15_000 });
    await page.waitForFunction(() => {
      const button = Array.from(document.querySelectorAll("button")).find((node) => node.textContent?.trim() === "Rank by Drive Time");
      return button && !button.disabled;
    }, null, { timeout: 10_000 });
    await check("[find] Rank by Drive Time ranks live results with one Matrix request", async () => {
      const before = { directions: stats.directions, matrix: stats.matrix };
      const outcome = await measure(page,
        `Array.from(document.querySelectorAll("button")).find((node) => node.textContent.trim() === "Rank by Drive Time").click()`,
        `/3 providers ranked by drive time/.test(document.querySelector(".drive-time-control-strip")?.textContent || "")`, 10_000);
      const detail = `directions=${stats.directions - before.directions} matrix=${stats.matrix - before.matrix}`;
      return { ...outcome, ok: outcome.ok && stats.matrix - before.matrix === 1 && stats.directions === before.directions, detail };
    });
    await check("[results] ETA badges render and Route draws the drive-time route", async () => {
      await find.getByRole("button", { name: "View 3 results", exact: true }).click();
      const results = page.getByRole("tabpanel", { name: "Results workspace", exact: true });
      await results.locator(".provider-eta-badge").first().waitFor({ state: "visible", timeout: 10_000 });
      const badges = await results.locator(".provider-eta-badge").count();
      if (badges !== 3) return { ok: false, ms: 0, detail: `${badges} ETA badges` };
      const before = stats.directions;
      const outcome = await measure(page,
        `document.querySelector(".provider-eta-badge button").click()`,
        `window.__mt.count("2d", "drive-time-eta-route", "LineString") === 1`);
      return { ...outcome, detail: `badges=${badges} directions=${stats.directions - before}` };
    });
    await context.close();
  }

  // ── Scenario B: 2D unavailable, globe available ─────────────────────────
  {
    const stats = { styles: [], tiles: 0, geocoding: 0, directions: 0, matrix: 0, matrixElements: 0, isochrone: 0 };
    let failStyles = true;
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(`B: ${error.message}`));
    diagnosticsPage = page;
    await mockNetwork(page, stats, { failStyles: () => failStyles });
    await boot(page);
    await page.locator(".mapbox-load-error").waitFor({ state: "visible", timeout: 40_000 });
    failStyles = false;
    await switchMode(page, "3d");
    await page.waitForFunction(() => Boolean(window.__mt.map("3d")?.loaded()), null, { timeout: 20_000 });
    await check("[3d-only] Map Tools panel mounts when only the globe is available", async () => {
      const started = Date.now();
      await openMapTools(page);
      return { ok: true, ms: Date.now() - started };
    });
    await check("[3d-only] Search sets origin on the globe", async () => {
      await page.locator("#sidebar-map-tools-panel input.occumed-mapbox-search[placeholder='Search address or place']").fill("CI Origin");
      return measure(page,
        `window.__mt.button(window.__mt.panel(), "Search").click()`,
        `/Origin set: CI Origin/.test(window.__mt.status()) && window.__mt.count("3d", "map-tools-native-origin") === 1`);
    });
    await context.close();
  }
} catch (error) {
  failed = true;
  console.error(error);
} finally {
  await browser.close();
}

const failures = results.filter((result) => !result.ok);
if (pageErrors.length) console.log(`PAGE_ERRORS ${JSON.stringify(pageErrors.slice(0, 10))}`);
if (reportPath) fs.writeFileSync(reportPath, JSON.stringify({ results, pageErrors }, null, 2));
console.log(`\n${results.length - failures.length}/${results.length} Map Tools checks passed.`);
if (!reportOnly && (failed || failures.length || pageErrors.length)) process.exit(1);

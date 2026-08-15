from pathlib import Path

path = Path('occu-med-map/scripts/ci-mapbox-native-tools-acceptance.mjs')
text = path.read_text()

old_route = '''    if (pathname.includes("provider-explorer")) return json(route, { providers: [], total: 0, page: 1, hasMore: false, stored_count: 0, live_count: 0, live_only: [] });
    if (pathname.includes("provider-layers")) return json(route, { providers: [], total: 0, page: 1, hasMore: false });'''
new_route = '''    if (pathname.includes("provider-explorer")) return json(route, { providers: [], total: 0, page: 1, hasMore: false, stored_count: 0, live_count: 0, live_only: [] });
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
    if (pathname.includes("provider-layers")) return json(route, { providers: [], count: 0, loaded: 0, total: 0, page: 1, hasMore: false, visibleCapped: false });'''
if old_route not in text:
    raise SystemExit('provider-layers mock target not found')
text = text.replace(old_route, new_route)

anchor = '''  await page.locator(".mapbox-2d-host .mapboxgl-canvas").waitFor({ state: "visible", timeout: 15_000 });

  // Radius must create real Mapbox layers from the transitional geometry facade.'''
insert = '''  await page.locator(".mapbox-2d-host .mapboxgl-canvas").waitFor({ state: "visible", timeout: 15_000 });

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

  // Radius must create real Mapbox layers from the transitional geometry facade.'''
if anchor not in text:
    raise SystemExit('indexed-provider test insertion anchor not found')
text = text.replace(anchor, insert)
path.write_text(text)
print('Added indexed-provider API-to-native-Mapbox visibility acceptance.')

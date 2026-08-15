from pathlib import Path

path = Path('occu-med-map/scripts/ci-mapbox-native-tools-acceptance.mjs')
text = path.read_text()

old = '''  await indexedToggle.check();
  await page.evaluate(() => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => candidate.getContainer().closest(".mapbox-2d-host"));
    if (!map) throw new Error("2D Mapbox map unavailable for indexed-provider test");
    map.jumpTo({ center: [0.015, 20.015], zoom: 9 });
  });
  await page.waitForFunction(() => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => candidate.getContainer().closest(".mapbox-2d-host"));
    if (!map || !map.isStyleLoaded()) return false;
    try {
      return map.queryRenderedFeatures().some((feature) =>
        String(feature.properties?.__popupHtml || "").includes("CI Indexed Clinic One")
      );
    } catch { return false; }
  }, null, { timeout: 15_000 });
  const indexedPoint = await active2dMapPoint(page, 0, 20);
  await page.mouse.click(indexedPoint.x, indexedPoint.y);
  await page.getByText("CI Indexed Clinic One").first().waitFor({ state: "visible", timeout: 8_000 });'''

new = '''  const indexedResponsePromise = page.waitForResponse((response) => {
    try {
      const url = new URL(response.url());
      return url.pathname === "/api/provider-layers/indexed" && response.request().method() === "GET";
    } catch { return false; }
  }, { timeout: 12_000 });
  await indexedToggle.check();
  const indexedResponse = await indexedResponsePromise;
  assert.equal(indexedResponse.ok(), true, `Indexed Providers request failed with HTTP ${indexedResponse.status()}`);
  const indexedPayload = await indexedResponse.json();
  assert.equal(indexedPayload.providers?.length, 2, "Indexed Providers API must return both CI clinics");

  await page.evaluate(() => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => candidate.getContainer().closest(".mapbox-2d-host"));
    if (!map) throw new Error("2D Mapbox map unavailable for indexed-provider test");
    map.jumpTo({ center: [0.015, 20.015], zoom: 9 });
  });

  // GeoJSON source membership is the deterministic proof that React provider data
  // crossed the Mapbox-native compatibility boundary. Headless WebKit can report
  // an empty global queryRenderedFeatures() result even while the same circle layer
  // is visibly drawn, so source data + the real Mapbox hit-test popup is the stronger
  // cross-browser functional assertion here.
  await page.waitForFunction(() => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => candidate.getContainer().closest(".mapbox-2d-host"));
    if (!map || !map.isStyleLoaded()) return false;
    const sourceIds = Object.keys(map.getStyle()?.sources || {}).filter((id) => id.startsWith("leaflet-compat-"));
    return sourceIds.some((id) => {
      try {
        return map.querySourceFeatures(id).some((feature) =>
          String(feature.properties?.__popupHtml || "").includes("CI Indexed Clinic One")
        );
      } catch { return false; }
    });
  }, null, { timeout: 15_000 });

  const indexedPoint = await active2dMapPoint(page, 0, 20);
  await page.mouse.click(indexedPoint.x, indexedPoint.y);
  await page.getByText("CI Indexed Clinic One").first().waitFor({ state: "visible", timeout: 8_000 });'''

if old not in text:
    raise SystemExit('indexed provider rendered-feature acceptance block not found')

path.write_text(text.replace(old, new, 1))
print('Indexed-provider acceptance now proves API response, native source membership, and Mapbox popup hit-testing.')

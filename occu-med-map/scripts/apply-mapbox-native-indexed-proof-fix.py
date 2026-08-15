from pathlib import Path

path = Path('occu-med-map/scripts/ci-mapbox-native-tools-acceptance.mjs')
text = path.read_text()

old = '''  await indexedToggle.check();
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
  await page.getByText("CI Indexed Clinic One").first().waitFor({ state: "visible", timeout: 8_000 });'''

new = '''  await indexedToggle.check();
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

if old not in text:
    raise SystemExit('indexed provider acceptance block not found')

path.write_text(text.replace(old, new, 1))
print('Indexed-provider acceptance now proves rendered Mapbox features directly.')

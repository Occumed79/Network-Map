from pathlib import Path

path = Path('occu-med-map/scripts/ci-mapbox-native-tools-acceptance.mjs')
text = path.read_text()

anchor = '''async function nativeCompatLayerCount(page, mode = "2d") {
  return page.evaluate((requestedMode) => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => Boolean(candidate.getContainer().closest(requestedMode === "3d" ? ".mapbox-globe-host" : ".mapbox-2d-host")));
    if (!map) return -1;
    return (map.getStyle()?.layers || []).filter((layer) => String(layer.id).startsWith("leaflet-compat-")).length;
  }, mode);
}
'''
helper = anchor + '''
async function compatPopupFeaturePoint(page, needle) {
  return page.evaluate((popupNeedle) => {
    const maps = window.__NETWORK_MAP_MAPBOX_LIFECYCLE__?.getMaps?.() || [];
    const map = maps.find((candidate) => Boolean(candidate.getContainer().closest(".mapbox-2d-host")));
    if (!map) throw new Error("2D Mapbox map not available");
    const sourceIds = Object.keys(map.getStyle()?.sources || {})
      .filter((id) => id.startsWith("leaflet-compat-") && id.endsWith("-source"));
    const diagnostics = [];
    for (const sourceId of sourceIds) {
      let features = [];
      try { features = map.querySourceFeatures(sourceId) || []; } catch {}
      diagnostics.push({
        sourceId,
        count: features.length,
        popupPreviews: features.map((feature) => String(feature.properties?.__popupHtml || "").slice(0, 120)),
      });
      const feature = features.find((candidate) =>
        String(candidate.properties?.__popupHtml || "").includes(popupNeedle)
      );
      if (!feature || feature.geometry?.type !== "Point") continue;
      const coordinates = feature.geometry.coordinates;
      const point = map.project(coordinates);
      const rect = map.getCanvas().getBoundingClientRect();
      return {
        x: rect.left + point.x,
        y: rect.top + point.y,
        sourceId,
        coordinates,
        diagnostics,
      };
    }
    return { x: null, y: null, sourceId: null, coordinates: null, diagnostics };
  }, needle);
}
'''
if anchor not in text:
    raise SystemExit('nativeCompatLayerCount helper anchor not found')
text = text.replace(anchor, helper, 1)

old_transition = '''  await page.waitForFunction(() => !document.querySelector(".dual-engine-vortex.active"), null, { timeout: 20_000 });'''
new_transition = '''  await page.waitForFunction(() => !document.querySelector(".dual-engine-vortex.active"), null, { timeout: 35_000 });'''
if old_transition not in text:
    raise SystemExit('2D return vortex wait target not found')
text = text.replace(old_transition, new_transition, 1)

old_click = '''  const providerPoint = await active2dMapPoint(page, 0, 20);
  await page.mouse.click(providerPoint.x, providerPoint.y);
  await page.getByText("CI Stored Clinic").first().waitFor({ state: "visible", timeout: 8_000 });'''
new_click = '''  await waitForActiveMapIdle(page, "2d");
  const providerPoint = await compatPopupFeaturePoint(page, "CI Stored Clinic");
  assert.ok(
    providerPoint && Number.isFinite(providerPoint.x) && Number.isFinite(providerPoint.y),
    `Stored Provider Explorer pin must exist in native Mapbox popup metadata: ${JSON.stringify(providerPoint?.diagnostics || [])}`
  );
  console.log("STORED_PROVIDER_FEATURE_BEFORE_CLICK", JSON.stringify(providerPoint));
  await page.mouse.click(providerPoint.x, providerPoint.y);
  await page.getByText("CI Stored Clinic").first().waitFor({ state: "visible", timeout: 10_000 });'''
if old_click not in text:
    raise SystemExit('stored provider hard-coded click target not found')
text = text.replace(old_click, new_click, 1)

path.write_text(text)
print('Applied authoritative stored-provider feature click and cross-browser transition wait.')

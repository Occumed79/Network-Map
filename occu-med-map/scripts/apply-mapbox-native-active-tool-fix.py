from pathlib import Path

app = Path('occu-med-map/src/App.tsx')
text = app.read_text()
old = '''  const activeToolRef = React.useRef(activeTool);
  React.useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);'''
new = '''  const activeToolRef = React.useRef(activeTool);
  React.useLayoutEffect(() => {
    activeToolRef.current = activeTool;
    (window as any).__NETWORK_MAP_TOOL_STATE__ = {
      getActiveTool: () => activeToolRef.current,
    };
    return () => {
      if ((window as any).__NETWORK_MAP_TOOL_STATE__?.getActiveTool) {
        delete (window as any).__NETWORK_MAP_TOOL_STATE__;
      }
    };
  }, [activeTool]);'''
if old not in text:
    raise SystemExit('missing activeToolRef passive-effect target')
app.write_text(text.replace(old, new))

test = Path('occu-med-map/scripts/ci-mapbox-native-tools-acceptance.mjs')
text = test.read_text()
old_radius = '''  const radiusButton = await clickByText(page, /Radius Tool/i);
  await page.waitForFunction((button) => button.classList.contains("active"), await radiusButton.elementHandle(), { timeout: 5_000 });
  await mapCanvasClick(page, 0.68, 0.55, false);'''
new_radius = '''  const radiusButton = await clickByText(page, /Radius Tool/i);
  await page.waitForFunction((button) => button.classList.contains("active"), await radiusButton.elementHandle(), { timeout: 5_000 });
  await page.waitForFunction(() => window.__NETWORK_MAP_TOOL_STATE__?.getActiveTool?.() === "radius", null, { timeout: 5_000 });
  await mapCanvasClick(page, 0.68, 0.55, false);'''
if old_radius not in text:
    raise SystemExit('missing Radius tool-state assertion target')
text = text.replace(old_radius, new_radius)
old_return = '''  await page.locator(".map-dimension-toggle button[data-map-mode='2d']").evaluate((element) => element.click());
  await waitForMode(page, "2d");

  const saveRing = radiusCard.getByRole("button", { name: /Save ring/i });
  await saveRing.waitFor({ state: "visible", timeout: 5_000 });'''
new_return = '''  await page.locator(".map-dimension-toggle button[data-map-mode='2d']").evaluate((element) => element.click());
  await waitForMode(page, "2d");
  await page.waitForFunction(() => !document.querySelector(".dual-engine-vortex.active"), null, { timeout: 20_000 });
  await radiusCard.waitFor({ state: "visible", timeout: 10_000 });

  const saveRing = radiusCard.getByRole("button", { name: /Save ring/i });
  await saveRing.waitFor({ state: "visible", timeout: 10_000 });'''
if old_return not in text:
    raise SystemExit('missing post-transition Radius wait target')
test.write_text(text.replace(old_return, new_return))

print('Applied layout-phase active tool ownership and deterministic Radius transition assertions.')

from pathlib import Path

interaction = Path('occu-med-map/src/mapboxCompatInteractionRuntime.ts')
text = interaction.read_text()
old = '''    const onClick = (event: mapboxgl.MapMouseEvent) => {
      const hit = findCompatPopupHit(map, event.point, event.lngLat);
      if (!hit || hit.exactRenderedHit) return;

      markCompatibilityClickHandled(event.originalEvent);
      new mapboxgl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "380px" })
        .setLngLat(hit.lngLat)
        .setHTML(hit.popupHtml)
        .addTo(map);
    };'''
new = '''    const onClick = (event: mapboxgl.MapMouseEvent) => {
      const hit = findCompatPopupHit(map, event.point, event.lngLat);
      if (!hit) return;

      // This owner is authoritative for compatibility popups. Delegated
      // layer-click delivery can be inconsistent for dynamically replaced
      // GeoJSON layers in WebKit, so both exact and near hits are handled here.
      markCompatibilityClickHandled(event.originalEvent);
      new mapboxgl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "380px" })
        .setLngLat(hit.lngLat)
        .setHTML(hit.popupHtml)
        .addTo(map);
    };'''
if old not in text:
    raise SystemExit('compat popup owner target not found')
interaction.write_text(text.replace(old, new, 1))

compat = Path('occu-med-map/src/mapboxNativeCompat.ts')
text = compat.read_text()
import_target = 'import { getTrackedMapboxMaps, registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";\n'
import_replacement = import_target + 'import { wasCompatibilityClickHandled } from "./mapboxCompatInteractionRuntime";\n'
if import_target not in text:
    raise SystemExit('mapboxNativeCompat import target not found')
text = text.replace(import_target, import_replacement, 1)
old_popup = '''      const popup = layer.getPopup?.();
      if (popup?.getContent?.()) {
        popup.setLatLng?.(event.lngLat);
        popup.openOnNative(map, event.lngLat, layer);
      }'''
new_popup = '''      const popup = layer.getPopup?.();
      if (popup?.getContent?.() && !wasCompatibilityClickHandled(event.originalEvent)) {
        popup.setLatLng?.(event.lngLat);
        popup.openOnNative(map, event.lngLat, layer);
      }'''
if old_popup not in text:
    raise SystemExit('delegated compatibility popup target not found')
compat.write_text(text.replace(old_popup, new_popup, 1))

acceptance = Path('occu-med-map/scripts/ci-mapbox-native-tools-acceptance.mjs')
text = acceptance.read_text()
old_radius = '''  const radiusCenterBefore = ((await radiusCard.textContent()) || "").match(/Center:\\s*[-\\d.]+,\\s*[-\\d.]+/)?.[0] || "";
  assert.ok(radiusCenterBefore, "Radius center must be visible after clicking the native Mapbox canvas");'''
new_radius = '''  await page.waitForFunction(() => /Center:\\s*[-\\d.]+,\\s*[-\\d.]+/.test(
    document.querySelector(".radius-extractor-card")?.textContent || ""
  ), null, { timeout: 8_000 });
  const radiusCenterBefore = ((await radiusCard.textContent()) || "").match(/Center:\\s*[-\\d.]+,\\s*[-\\d.]+/)?.[0] || "";
  assert.ok(radiusCenterBefore, "Radius center must be visible after clicking the native Mapbox canvas");'''
if old_radius not in text:
    raise SystemExit('Radius center timing target not found')
acceptance.write_text(text.replace(old_radius, new_radius, 1))

print('Applied authoritative compatibility popup ownership and deterministic Radius state wait.')

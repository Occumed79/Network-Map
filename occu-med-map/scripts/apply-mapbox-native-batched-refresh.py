from pathlib import Path

compat = Path('occu-med-map/src/mapboxNativeCompat.ts')
text = compat.read_text()

old_signature = '''function renderVectorRoot(root: L.Layer, native: mapboxgl.Map): void {
  if (!native.isStyleLoaded()) return;
  const ids = sourceIds(root);
  const collection = featureCollectionForRoot(root);'''
new_signature = '''function renderVectorRoot(root: L.Layer, native: mapboxgl.Map, preparedCollection?: GeoJSON.FeatureCollection): void {
  if (!native.isStyleLoaded()) return;
  const ids = sourceIds(root);
  const collection = preparedCollection || featureCollectionForRoot(root);'''
if old_signature not in text:
    raise SystemExit('missing renderVectorRoot signature target')
text = text.replace(old_signature, new_signature, 1)

old_refresh = '''function refreshRoot(root: L.Layer): void {
  const attached = root._map;
  if (!attached || !attached.hasLayer(root)) return;
  eachNativeMap((native) => {
    try { renderVectorRoot(root, native); } catch (error) { console.warn("Mapbox compatibility layer refresh failed", error); }
  });
}'''
new_refresh = '''const pendingVectorRefreshRoots = new Set<L.Layer>();
let vectorRefreshScheduled = false;

function flushVectorRefreshes(): void {
  vectorRefreshScheduled = false;
  const roots = [...pendingVectorRefreshRoots];
  pendingVectorRefreshRoots.clear();

  for (const root of roots) {
    const attached = root._map;
    if (!attached || !attached.hasLayer(root)) continue;

    // Build the feature collection once per logical root, not once per native map.
    // A 1,000-provider layer can add/clear hundreds of children synchronously; the
    // queue below collapses that burst into one GeoJSON setData per 2D/3D map.
    const collection = featureCollectionForRoot(root);
    eachNativeMap((native) => {
      try { renderVectorRoot(root, native, collection); } catch (error) { console.warn("Mapbox compatibility layer refresh failed", error); }
    });
  }
}

function refreshRoot(root: L.Layer): void {
  pendingVectorRefreshRoots.add(root);
  if (vectorRefreshScheduled) return;
  vectorRefreshScheduled = true;
  queueMicrotask(flushVectorRefreshes);
}'''
if old_refresh not in text:
    raise SystemExit('missing refreshRoot batching target')
text = text.replace(old_refresh, new_refresh, 1)
compat.write_text(text)

app = Path('occu-med-map/src/App.tsx')
text = app.read_text()
old_comment = '''    // Leaflet remains a hidden controller for the existing tools. The visible
    // basemap is rendered exclusively by the ArcGIS MapView runtime.
'''
new_comment = '''    // This logical map object is supplied by the temporary Mapbox-native
    // compatibility facade. No Leaflet renderer is created; both visible 2D and
    // 3D surfaces are owned by Mapbox GL.
'''
if old_comment in text:
    text = text.replace(old_comment, new_comment, 1)
app.write_text(text)

print('Applied batched Mapbox GeoJSON refreshes and corrected renderer ownership documentation.')

from pathlib import Path

app_path = Path('occu-med-map/src/App.tsx')
dual_path = Path('occu-med-map/src/dualMapEngineRuntime.ts')
services_path = Path('occu-med-map/src/lib/mapServices.ts')
helper_path = Path('occu-med-map/src/features/networkMap/mapLayerHelpers.ts')
runtime_path = Path('occu-med-map/src/mapSceneRuntime.ts')

app = app_path.read_text()
dual = dual_path.read_text()
services = services_path.read_text()

# App imports and dead refs.
app = app.replace('import MapScene from "./mapSceneRuntime";\n', '', 1)
old_dual_import = "import { initializeDualMapEngines, cleanupDualMapEngines } from './dualMapEngineRuntime';"
new_dual_import = "import { initializeDualMapEngines, cleanupDualMapEngines, getActiveMapboxMap } from './dualMapEngineRuntime';"
if old_dual_import not in app:
    raise SystemExit('dual engine import anchor missing')
app = app.replace(old_dual_import, new_dual_import, 1)
app = app.replace('  const mapRef = useRef<MapScene.Map|null>(null);\n', '', 1)
app = app.replace('  const multiDropLayerRef = useRef<MapScene.LayerGroup|null>(null);\n', '', 1)

# Replace the temporary scene-root initialization with the native dual-engine lifecycle.
start = app.index('  // ── Init Map ───────────────────────────────────────────────────────────────')
end = app.index('\n\n  const getProviderExplorerBounds = useCallback', start)
new_init = """  // ── Init Map ───────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!mapDivRef.current || getActiveMapboxMap()) return;
    let disposed = false;

    void initializeDualMapEngines(mapDivRef.current, { center:[0,20], zoom:2 })
      .then(()=>{ if(!disposed) setMapReady(true); })
      .catch((error)=>{
        console.error('Native Mapbox initialization failed', error);
        if(!disposed) setMapReady(false);
      });

    // Load U.S. diagnostic GeoJSON only if the diagnostics workspace is enabled.
    if (showUsDiagnostics) void loadStateGeo();

    const onNativeMapClick = (rawEvent: Event) => {
      const detail = (rawEvent as CustomEvent<{ lat:number; lng:number; originalEvent?: Event }>).detail;
      if (!detail) return;
      const { lat, lng } = detail;
      const tool = activeToolRef.current;

      if (tool === 'radius') {
        setDropCenter({ lat, lng });
        setDropUi(prev=>({ ...prev, panelOpen:true, status:'' }));
        drawDropRadius(lat, lng, dropRadiusMilesRef.current);
        return;
      }

      if (tool === 'coverage' && isUsPoint(lat, lng)) {
        const est = estimateLocalPopulationDensity(lat, lng);
        setLocalPopInfo(est ?? null);
      }
    };

    const onNativeMapDoubleClick = (rawEvent: Event) => {
      const detail = (rawEvent as CustomEvent<{ lat:number; lng:number; originalEvent?: Event }>).detail;
      if (!detail) return;
      const tool = activeToolRef.current;
      if (tool !== null && tool !== 'liveFinder') return;
      const { lat, lng } = detail;
      setLocalPopInfo(null);
      setDropCenter({ lat, lng });
      activeToolRef.current = 'liveFinder';
      setActiveTool('liveFinder');
      doLiveSearch(lat, lng, undefined, undefined, 'live_finder_double_click');
    };

    window.addEventListener('network-map:native-click', onNativeMapClick);
    window.addEventListener('network-map:native-dblclick', onNativeMapDoubleClick);

    return ()=>{
      disposed = true;
      window.removeEventListener('network-map:native-click', onNativeMapClick);
      window.removeEventListener('network-map:native-dblclick', onNativeMapDoubleClick);
      cleanupDualMapEngines();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
"""
app = app[:start] + new_init + app[end:]

# All remaining mapRef reads now resolve the currently visible Mapbox engine.
app = app.replace('const map = mapRef.current;', 'const map = getActiveMapboxMap();')
app = app.replace('const map=mapRef.current;', 'const map=getActiveMapboxMap();')
app = app.replace('const map = mapRef.current', 'const map = getActiveMapboxMap()')
app = app.replace('const map=mapRef.current', 'const map=getActiveMapboxMap()')

# Mapbox getBounds() may be null; guard every direct bounds read introduced above.
old_bounds = """    const bounds = map.getBounds();
    return { north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest() };
"""
new_bounds = """    const bounds = map.getBounds();
    if(!bounds) return null;
    return { north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest() };
"""
if old_bounds not in app:
    raise SystemExit('provider bounds anchor missing')
app = app.replace(old_bounds, new_bounds, 1)

old_dataset_bounds = """        if(map) {
          const bounds = map.getBounds();
          params.set('north',String(bounds.getNorth()));
          params.set('south',String(bounds.getSouth()));
          params.set('east',String(bounds.getEast()));
          params.set('west',String(bounds.getWest()));
        }
"""
new_dataset_bounds = """        if(map) {
          const bounds = map.getBounds();
          if(bounds) {
            params.set('north',String(bounds.getNorth()));
            params.set('south',String(bounds.getSouth()));
            params.set('east',String(bounds.getEast()));
            params.set('west',String(bounds.getWest()));
          }
        }
"""
if old_dataset_bounds not in app:
    raise SystemExit('dataset bounds anchor missing')
app = app.replace(old_dataset_bounds, new_dataset_bounds, 1)

# Provider dataset refresh follows whichever native engine is active, including 3D.
old_provider_effect_start = """  useEffect(()=>{
    const map = getActiveMapboxMap();
    if(!map || !mapReady) return;
    let moveTimer: ReturnType<typeof setTimeout>|null = null;
"""
new_provider_effect_start = """  useEffect(()=>{
    if(!mapReady) return;
    let moveTimer: ReturnType<typeof setTimeout>|null = null;
"""
if old_provider_effect_start not in app:
    raise SystemExit('provider refresh effect start missing')
app = app.replace(old_provider_effect_start, new_provider_effect_start, 1)
old_provider_events = """    map.on('moveend', refreshOnMove);
    return ()=>{
      if(moveTimer) clearTimeout(moveTimer);
      startupTimers.forEach(clearTimeout);
      map.off('moveend', refreshOnMove);
    };
"""
new_provider_events = """    window.addEventListener('network-map:native-camera', refreshOnMove);
    return ()=>{
      if(moveTimer) clearTimeout(moveTimer);
      startupTimers.forEach(clearTimeout);
      window.removeEventListener('network-map:native-camera', refreshOnMove);
    };
"""
if old_provider_events not in app:
    raise SystemExit('provider refresh event anchor missing')
app = app.replace(old_provider_events, new_provider_events, 1)

# Inventory follows active 2D/3D camera instead of a captured legacy map.
old_inventory_start = """  useEffect(()=>{
    const map = getActiveMapboxMap();
    if (!map || !mapReady || !serviceInventoryEnabled) return;

    let debounceTimer: ReturnType<typeof setTimeout>|null = null;
"""
new_inventory_start = """  useEffect(()=>{
    if (!mapReady || !serviceInventoryEnabled) return;

    let debounceTimer: ReturnType<typeof setTimeout>|null = null;
"""
if old_inventory_start not in app:
    raise SystemExit('inventory effect start missing')
app = app.replace(old_inventory_start, new_inventory_start, 1)
old_inventory_bounds = """      debounceTimer = setTimeout(()=>{
        const bounds = map!.getBounds();
        if(inventoryFetchRef.current) inventoryFetchRef.current.abort();
"""
new_inventory_bounds = """      debounceTimer = setTimeout(()=>{
        const activeMap = getActiveMapboxMap();
        const bounds = activeMap?.getBounds();
        if(!bounds) return;
        if(inventoryFetchRef.current) inventoryFetchRef.current.abort();
"""
if old_inventory_bounds not in app:
    raise SystemExit('inventory bounds anchor missing')
app = app.replace(old_inventory_bounds, new_inventory_bounds, 1)
app = app.replace("    map.on('moveend', loadInventory);", "    window.addEventListener('network-map:native-camera', loadInventory);", 1)
app = app.replace("      map.off('moveend', loadInventory);", "      window.removeEventListener('network-map:native-camera', loadInventory);", 1)

# NACCHO refresh also follows the active native camera.
old_naccho_start = """  useEffect(()=>{
    const map=getActiveMapboxMap();
    if(!map||!mapReady) return;
    if(!showNacchoLayer) {
"""
new_naccho_start = """  useEffect(()=>{
    if(!mapReady) return;
    if(!showNacchoLayer) {
"""
if old_naccho_start not in app:
    raise SystemExit('NACCHO effect start missing')
app = app.replace(old_naccho_start, new_naccho_start, 1)
old_naccho_bounds = """          const bounds=map.getBounds();
          const params=new URLSearchParams({
"""
new_naccho_bounds = """          const activeMap=getActiveMapboxMap();
          const bounds=activeMap?.getBounds();
          if(!bounds) return;
          const params=new URLSearchParams({
"""
if old_naccho_bounds not in app:
    raise SystemExit('NACCHO bounds anchor missing')
app = app.replace(old_naccho_bounds, new_naccho_bounds, 1)
# Replace the first remaining NACCHO moveend pair after its reload function.
naccho_marker = "// ── NACCHO LHD layer: native Mapbox source + heatmap"
naccho_index = app.index(naccho_marker)
tail = app[naccho_index:]
tail = tail.replace("    map.on('moveend',reload);", "    window.addEventListener('network-map:native-camera',reload);", 1)
tail = tail.replace("      map.off('moveend',reload);", "      window.removeEventListener('network-map:native-camera',reload);", 1)
app = app[:naccho_index] + tail

# Old facade flyTo signature is replaced by the existing native camera helper.
app = app.replace("    const map=getActiveMapboxMap();\n    if(map) { map.flyTo([lat,lng],tier<=2?9:11,{duration:1.2}); drawRadiusCircle(lat,lng); }", "    flyNativeMap(lat,lng,tier<=2?9:11,1200);\n    drawRadiusCircle(lat,lng);", 1)
app = app.replace("    const map=getActiveMapboxMap();\n    if(map){ map.flyTo([lat,lng],11,{duration:1.2}); drawRadiusCircle(lat,lng); }", "    flyNativeMap(lat,lng,11,1200);\n    drawRadiusCircle(lat,lng);", 2)

# Dual runtime exposes the visible native engine and owns double-click zoom behavior.
getter_anchor = 'export async function initializeDualMapEngines(container: HTMLElement, initial: InitialCamera = {}): Promise<void> {'
getter = """export function getActiveMapboxMap(): mapboxgl.Map | null {
  return currentMode === "3d" ? mapboxGlobeMap : mapbox2dMap;
}

"""
if getter_anchor not in dual:
    raise SystemExit('dual runtime getter anchor missing')
dual = dual.replace(getter_anchor, getter + getter_anchor, 1)
create_anchor = '  registerMapboxMap(instance, { mode });\n'
if create_anchor not in dual:
    raise SystemExit('Mapbox map registration anchor missing')
dual = dual.replace(create_anchor, create_anchor + '  instance.doubleClickZoom.disable();\n', 1)

# mapServices keeps geocoding/routing, loses only the dead scene tile factory.
services = services.replace('import MapScene from "../mapSceneRuntime";\n\n', '', 1)
create_start = services.index('export function createTileLayer(key: TileProviderKey)')
create_end = services.index('\nexport type GeocodeSource', create_start)
services = services[:create_start] + services[create_end + 1:]

# Final hard compatibility files are dead after the App root cut.
for dead in (helper_path, runtime_path):
    if not dead.exists():
        raise SystemExit(f'expected dead compatibility file missing: {dead}')
    dead.unlink()

# Fail the migration if any production App/dual/services MapScene dependency survived.
for label, text in [('App.tsx', app), ('dualMapEngineRuntime.ts', dual), ('mapServices.ts', services)]:
    for forbidden in ('MapScene', 'mapSceneRuntime', 'mapRef.current', 'multiDropLayerRef'):
        if forbidden in text:
            raise SystemExit(f'{label}: remaining compatibility symbol {forbidden}')

app_path.write_text(app)
dual_path.write_text(dual)
services_path.write_text(services)
print('Removed final MapScene root ownership and dead compatibility helpers.')

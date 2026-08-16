from pathlib import Path

path = Path('occu-med-map/src/PhaseTwoShell.tsx')
text = path.read_text()

text = text.replace('import MapScene from "./mapSceneRuntime";\n', '', 1)
text = text.replace('  gridCellBounds,\n', '', 1)
anchor = "import './phase-two-shell.css';\n"
native_import = """import {
  clearPhaseTwoOverlay,
  renderPhaseTwoDensity,
  renderPhaseTwoGrid,
  renderPhaseTwoPins,
} from './phaseTwoNativeMapRuntime';
import './phase-two-shell.css';
"""
if anchor not in text:
    raise SystemExit('Phase Two CSS import anchor missing')
text = text.replace(anchor, native_import, 1)

# Old popup DOM factory is now owned by the native renderer.
start = text.index('function createProviderPopup(')
end = text.index('\nfunction modeLabel(', start)
text = text[:start] + text[end + 1:]

text = text.replace('  const overlayRef = useRef<MapScene.LayerGroup | null>(null);\n', '', 1)

start = text.index('  const clearOverlay = useCallback(() => {')
end = text.index('\n  const fetchAllPins = useCallback(', start)
replacement = """  const clearOverlay = useCallback(() => {
    clearPhaseTwoOverlay();
  }, []);

  const drawPins = useCallback((rows: ProviderFeature[]) => {
    renderPhaseTwoPins(rows);
  }, []);

  const drawDensity = useCallback((cells: Array<{ lat: number; lng: number; count: number }>) => {
    renderPhaseTwoDensity(cells);
  }, []);

  const drawGrid = useCallback((cells: Array<{ lat: number; lng: number; count: number }>, precision: number) => {
    renderPhaseTwoGrid(cells, precision);
  }, []);
"""
text = text[:start] + replacement + text[end:]

old_fly = """  const flyToProvider = (provider: ProviderFeature) => {
    if (!validCoordinate(provider)) return;
    const map = window.__occumedPhaseTwoMap;
    map?.flyTo([provider.lat, provider.lng], Math.max(map.getZoom(), 13), { duration: 0.6 });
  };
"""
new_fly = """  const flyToProvider = (provider: ProviderFeature) => {
    if (!validCoordinate(provider)) return;
    const map = window.__occumedPhaseTwoMap;
    if (!map) return;
    map.flyTo({ center: [provider.lng, provider.lat], zoom: Math.max(map.getZoom(), 13), duration: 600 });
  };
"""
if old_fly not in text:
    raise SystemExit('Phase Two fly-to anchor missing')
text = text.replace(old_fly, new_fly, 1)

for forbidden in ['MapScene', 'overlayRef', 'createProviderPopup(', 'gridCellBounds']:
    if forbidden in text:
        raise SystemExit(f'Remaining Phase Two compatibility symbol: {forbidden}')

path.write_text(text)
print('Migrated Phase Two shell rendering to native Mapbox.')

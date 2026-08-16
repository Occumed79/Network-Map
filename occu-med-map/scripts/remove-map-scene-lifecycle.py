from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
src = root / "src"

scene = src / "mapSceneRuntime.ts"
text = scene.read_text()
anchor = 'const logicalMaps = new Set<MapScene.Map>();\n'
addition = '''const logicalMaps = new Set<MapScene.Map>();
type SceneRootSubscriber = (map: MapScene.Map) => void;
const sceneRootSubscribers = new Set<SceneRootSubscriber>();

export function subscribeSceneRoots(subscriber: SceneRootSubscriber): () => void {
  sceneRootSubscribers.add(subscriber);
  for (const map of logicalMaps) queueMicrotask(() => subscriber(map));
  return () => sceneRootSubscribers.delete(subscriber);
}

function announceSceneRoot(map: MapScene.Map): void {
  for (const subscriber of sceneRootSubscribers) {
    try { subscriber(map); } catch (error) { console.error("Map scene root subscriber failed", error); }
  }
}
'''
if anchor not in text:
    raise SystemExit('mapSceneRuntime logicalMaps anchor missing')
text = text.replace(anchor, addition, 1)
constructor_anchor = '      logicalMaps.add(this);\n\n      const onSceneClick = (rawEvent: Event) => {'
constructor_replace = '      logicalMaps.add(this);\n      queueMicrotask(() => announceSceneRoot(this));\n\n      const onSceneClick = (rawEvent: Event) => {'
if constructor_anchor not in text:
    raise SystemExit('mapSceneRuntime constructor announce anchor missing')
text = text.replace(constructor_anchor, constructor_replace, 1)
scene.write_text(text)

# Exact lifecycle registrations are converted to a lightweight root subscription.
files = {
    'mapToolsCommandPanel.ts': (
        'import { registerMapSceneInitializer } from "./mapSceneLifecycleRuntime";\n',
        'import { subscribeSceneRoots } from "./mapSceneRuntime";\n',
        r'''  registerMapSceneInitializer\(\{\n    id: "map-tools-command-panel",\n    priority: 40,\n    initialize: \(map\) => \{\n      let cleanup: \(\(\) => void\) \| null = null;\n      const timer = window\.setTimeout\(\(\) => \{ cleanup = installOnMap\(map\); \}, 0\);\n      return \(\) => \{\n        window\.clearTimeout\(timer\);\n        cleanup\?\.\(\);\n      \};\n    \},\n  \}\);''',
        '''  subscribeSceneRoots((map) => {
    window.setTimeout(() => { installOnMap(map); }, 0);
  });'''
    ),
    'providerDensityField.ts': (
        'import { registerMapSceneInitializer } from "./mapSceneLifecycleRuntime";\n',
        'import { subscribeSceneRoots } from "./mapSceneRuntime";\n',
        r'''  registerMapSceneInitializer\(\{\n    id: "provider-density-field",\n    priority: 70,\n    initialize: \(map\) => \{ window\.setTimeout\(\(\) => installOnMap\(map\), 0\); \},\n  \}\);''',
        '''  subscribeSceneRoots((map) => {
    window.setTimeout(() => installOnMap(map), 0);
  });'''
    ),
    'mapboxAdvancedControls.ts': (
        'import { registerMapSceneInitializer } from "./mapSceneLifecycleRuntime";\n',
        'import { subscribeSceneRoots } from "./mapSceneRuntime";\n',
        r'''  registerMapSceneInitializer\(\{\n    id: "mapbox-advanced-controls",\n    priority: 90,\n    initialize: \(map\) => \{ window\.setTimeout\(\(\) => installOnMap\(map\), 0\); \},\n  \}\);''',
        '''  subscribeSceneRoots((map) => {
    window.setTimeout(() => installOnMap(map), 0);
  });'''
    ),
    'mapboxProviderRanking.ts': (
        'import { registerMapSceneInitializer } from "./mapSceneLifecycleRuntime";\n',
        'import { subscribeSceneRoots } from "./mapSceneRuntime";\n',
        r'''  registerMapSceneInitializer\(\{\n    id: "mapbox-provider-ranking",\n    priority: 80,\n    initialize: \(map\) => \{ window\.setTimeout\(\(\) => installOnMap\(map\), 0\); \},\n  \}\);''',
        '''  subscribeSceneRoots((map) => {
    window.setTimeout(() => installOnMap(map), 0);
  });'''
    ),
    'features/driveTime/nativeDriveTimeRuntime.ts': (
        'import { registerMapSceneInitializer } from "../../mapSceneLifecycleRuntime";\n',
        'import { subscribeSceneRoots } from "../../mapSceneRuntime";\n',
        r'''  registerMapSceneInitializer\(\{\n    id: "native-drive-time",\n    priority: 60,\n    initialize: \(map\) => \{ window\.setTimeout\(\(\) => installOnMap\(map\), 0\); \},\n  \}\);''',
        '''  subscribeSceneRoots((map) => {
    window.setTimeout(() => installOnMap(map), 0);
  });'''
    ),
}

for relative, (old_import, new_import, pattern, replacement) in files.items():
    path = src / relative
    data = path.read_text()
    if old_import not in data:
        raise SystemExit(f'{relative}: lifecycle import missing')
    data = data.replace(old_import, new_import, 1)
    data, count = re.subn(pattern, replacement, data, count=1)
    if count != 1:
        raise SystemExit(f'{relative}: initializer block did not match')
    path.write_text(data)

# Phase Two bridge only needs the current scene root during the remaining UI migration.
phase = src / 'phaseTwoMapBridge.ts'
data = phase.read_text()
data = data.replace("import { registerMapSceneInitializer } from './mapSceneLifecycleRuntime';\n", "import { subscribeSceneRoots } from './mapSceneRuntime';\n", 1)
data = data.replace('const leafletRuntime = MapScene as typeof MapScene & Record<string, unknown>;', 'const sceneRuntime = MapScene as typeof MapScene & Record<string, unknown>;')
data = data.replace('if (leafletRuntime[INSTALL_KEY]) return;', 'if (sceneRuntime[INSTALL_KEY]) return;')
data = data.replace('leafletRuntime[INSTALL_KEY] = true;', 'sceneRuntime[INSTALL_KEY] = true;')
pattern = r'''  registerMapSceneInitializer\(\{\n    id: 'phase-two-map-bridge',\n    priority: 0,\n    initialize: registerMap,\n  \}\);'''
data, count = re.subn(pattern, '  subscribeSceneRoots(registerMap);', data, count=1)
if count != 1:
    raise SystemExit('phaseTwoMapBridge initializer block did not match')
phase.write_text(data)

# Remove boot-time lifecycle owner.
main = src / 'main.tsx'
data = main.read_text().replace('import "./mapSceneLifecycleRuntime";\n', '')
main.write_text(data)

# Telemetry/diagnostics no longer report a scene lifecycle because it no longer exists.
telemetry = src / 'mapPerformanceTelemetryRuntime.ts'
data = telemetry.read_text()
data = re.sub(r'''function sceneLifecycleDiagnostics\(\): any \{.*?\n\}''', 'function sceneLifecycleDiagnostics(): any { return null; }', data, flags=re.S)
data = data.replace('return mapbox ? "mapbox" : "leaflet";', 'return mapbox ? "mapbox" : "none";')
telemetry.write_text(data)

diag = src / 'technicalDiagnosticsExport.ts'
data = diag.read_text()
data = re.sub(r'\n\s*sceneLifecycle:\s*safeValue\(runtime\.__NETWORK_MAP_SCENE_LIFECYCLE__\?\.getDiagnostics\?\.\(\) \|\| null\),?', '', data)
diag.write_text(data)

# Delete the separate lifecycle registry completely.
lifecycle = src / 'mapSceneLifecycleRuntime.ts'
if lifecycle.exists(): lifecycle.unlink()

print('Removed MapScene lifecycle registry; temporary geometry roots now self-announce.')

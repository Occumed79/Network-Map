from __future__ import annotations

from pathlib import Path
import json
import os
import re

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"


def rel_import(source_file: Path, target: Path) -> str:
    rel = os.path.relpath(target.with_suffix(""), source_file.parent).replace(os.sep, "/")
    if not rel.startswith("."):
        rel = "./" + rel
    return rel


def write_generated(source_name: str, target_name: str, transforms: list[tuple[str, str]]) -> None:
    text = (SRC / source_name).read_text()
    for old, new in transforms:
        text = text.replace(old, new)
    (SRC / target_name).write_text(text)


write_generated(
    "mapboxNativeCompat.ts",
    "mapSceneRuntime.ts",
    [
        ("TEMPORARY MIGRATION FACADE", "MAPBOX SCENE RUNTIME"),
        ("Network Map was born as a Leaflet app, then Mapbox GL became the visible 2D\n * and 3D renderer. This module preserves the small Leaflet-shaped API surface\n * still used by legacy application code while rendering every geometry through\n * native Mapbox GL sources/layers/markers. It is NOT Leaflet and it does not\n * create a hidden map renderer.\n *\n * The facade exists so we can remove the Leaflet runtime immediately without a\n * risky 5k-line App.tsx rewrite. Call sites can then be migrated incrementally\n * to direct Mapbox APIs and this file can ultimately disappear as well.",
         "This internal scene runtime is backed entirely by Mapbox GL. It owns temporary\n * scene/layer helpers used while the remaining call sites are converted to direct\n * Mapbox sources, layers, markers, popups, and camera APIs. It never creates a\n * second renderer."),
        ("namespace L {", "namespace MapScene {"),
        ("export default L;", "export default MapScene;"),
        ("_leaflet_id", "_scene_id"),
        ("leaflet-compat-", "map-scene-"),
        ("leaflet-${position}", "map-scene-${position}"),
        ("mapbox-native-leaflet-compat", "mapbox-native-scene"),
        ("LeafletMouseEvent", "MapPointerEvent"),
        ("LeafletEventHandlerFn", "MapEventHandlerFn"),
        ("LeafletEvent", "MapEvent"),
    ],
)

write_generated(
    "leafletMapLifecycleRuntime.ts",
    "mapSceneLifecycleRuntime.ts",
    [
        ('import L from "leaflet";', 'import MapScene from "./mapSceneRuntime";'),
        ("LeafletMapInitializer", "MapSceneInitializer"),
        ("registerLeafletMapInitializer", "registerMapSceneInitializer"),
        ("getTrackedLeafletMaps", "getTrackedMapScenes"),
        ("leafletRuntime", "mapSceneRuntime"),
        ("__occumedLeafletLifecycleFactoryPatched", "__occumedMapSceneLifecycleFactoryPatched"),
        ("__NETWORK_MAP_LEAFLET_LIFECYCLE__", "__NETWORK_MAP_SCENE_LIFECYCLE__"),
        ("network-map:leaflet-lifecycle", "network-map:scene-lifecycle"),
        ("leaflet-map-lifecycle", "map-scene-lifecycle"),
        ("Leaflet initializer", "Map scene initializer"),
        ("Leaflet map initializer", "Map scene initializer"),
        ("Authoritative Leaflet map lifecycle and initializer registry", "Mapbox scene lifecycle and initializer registry"),
    ],
)

write_generated(
    "leafletInteractionDefaults.ts",
    "mapSceneInteractionDefaults.ts",
    [
        ('import L from "leaflet";', 'import MapScene from "./mapSceneRuntime";'),
        ("Leaflet's", "The scene runtime's"),
        ("Leaflet waits", "The prior runtime waited"),
    ],
)

# Generated files may contain both property references (L.foo) and bare namespace
# references (`L as typeof L`). Use a token-aware replacement so URL.* never
# becomes URMapScene.*.
for generated in [
    SRC / "mapSceneRuntime.ts",
    SRC / "mapSceneLifecycleRuntime.ts",
    SRC / "mapSceneInteractionDefaults.ts",
]:
    text = generated.read_text()
    text = re.sub(r"\bL\b", "MapScene", text)
    generated.write_text(text)

# Production source imports/call sites.
for file in SRC.rglob("*"):
    if not file.is_file() or file.suffix not in {".ts", ".tsx"}:
        continue
    if file.name in {
        "mapboxNativeCompat.ts",
        "leafletMapLifecycleRuntime.ts",
        "leafletInteractionDefaults.ts",
        "mapSceneRuntime.ts",
        "mapSceneLifecycleRuntime.ts",
        "mapSceneInteractionDefaults.ts",
        "mapboxLeafletRuntime.ts",
    }:
        continue

    text = file.read_text()
    scene_path = rel_import(file, SRC / "mapSceneRuntime.ts")
    lifecycle_path = rel_import(file, SRC / "mapSceneLifecycleRuntime.ts")
    defaults_path = rel_import(file, SRC / "mapSceneInteractionDefaults.ts")

    text = re.sub(r'import\s+L\s+from\s+["\']leaflet["\'];', f'import MapScene from "{scene_path}";', text)
    text = re.sub(r'import\s+type\s+L\s+from\s+["\']leaflet["\'];', f'import type MapScene from "{scene_path}";', text)
    if "import MapScene from" in text or "import type MapScene from" in text:
        text = re.sub(r"\bL\b", "MapScene", text)
    text = text.replace("MapScene.LeafletMouseEvent", "MapScene.MapPointerEvent")
    text = text.replace("MapScene.LeafletEvent", "MapScene.MapEvent")
    text = text.replace("URMapScene.", "URL.")

    text = re.sub(r'(["\'])((?:\.\./|\./)*)leafletMapLifecycleRuntime(["\'])', lambda m: f'{m.group(1)}{lifecycle_path}{m.group(3)}', text)
    text = re.sub(r'(["\'])((?:\.\./|\./)*)leafletInteractionDefaults(["\'])', lambda m: f'{m.group(1)}{defaults_path}{m.group(3)}', text)
    text = text.replace("registerLeafletMapInitializer", "registerMapSceneInitializer")
    text = text.replace("getTrackedLeafletMaps", "getTrackedMapScenes")
    text = text.replace("__NETWORK_MAP_LEAFLET_LIFECYCLE__", "__NETWORK_MAP_SCENE_LIFECYCLE__")
    text = text.replace("leafletLifecycle", "sceneLifecycle")
    text = text.replace("Leaflet-shaped", "scene")
    text = text.replace("Leaflet renderer", "secondary renderer")
    text = text.replace("leaflet-compat-", "map-scene-")
    text = text.replace(".leaflet-popup-content", ".mapboxgl-popup-content")
    text = text.replace(".leaflet-popup", ".mapboxgl-popup")
    text = text.replace("canonical-leaflet-controller", "canonical-map-scene-controller")
    file.write_text(text)

# Rename drive-time files/functions so imports and diagnostics stop encoding the
# removed engine in their public names.
renames = {
    SRC / "features/driveTime/leafletProviderAdapter.ts": SRC / "features/driveTime/mapSceneProviderAdapter.ts",
    SRC / "features/driveTime/leafletEtaRouteLayer.ts": SRC / "features/driveTime/mapSceneEtaRouteLayer.ts",
}
for old, new in renames.items():
    if old.exists():
        text = old.read_text()
        scene_path = rel_import(new, SRC / "mapSceneRuntime.ts")
        defaults_path = rel_import(new, SRC / "mapSceneInteractionDefaults.ts")
        text = re.sub(r'import\s+L\s+from\s+["\']leaflet["\'];', f'import MapScene from "{scene_path}";', text)
        if "import MapScene from" in text:
            text = re.sub(r"\bL\b", "MapScene", text)
        text = text.replace("leafletInteractionDefaults", Path(defaults_path).name)
        text = text.replace("installLeafletEtaRouteLayer", "installMapSceneEtaRouteLayer")
        text = text.replace("collectVisibleLeafletProviderCandidates", "collectVisibleMapSceneProviderCandidates")
        text = text.replace("leaflet:", "scene:")
        text = text.replace("URMapScene.", "URL.")
        new.write_text(text)
        old.unlink()

for file in SRC.rglob("*"):
    if not file.is_file() or file.suffix not in {".ts", ".tsx"}:
        continue
    text = file.read_text()
    text = text.replace("./leafletProviderAdapter", "./mapSceneProviderAdapter")
    text = text.replace("./leafletEtaRouteLayer", "./mapSceneEtaRouteLayer")
    text = text.replace("leafletProviderAdapter", "mapSceneProviderAdapter")
    text = text.replace("leafletEtaRouteLayer", "mapSceneEtaRouteLayer")
    text = text.replace("installLeafletEtaRouteLayer", "installMapSceneEtaRouteLayer")
    text = text.replace("collectVisibleLeafletProviderCandidates", "collectVisibleMapSceneProviderCandidates")
    text = text.replace("URMapScene.", "URL.")
    file.write_text(text)

# Remove the compiler/runtime redirect. From this point onward, a Leaflet import
# is an error instead of silently resolving to an internal file.
tsconfig = ROOT / "tsconfig.json"
config = json.loads(tsconfig.read_text())
paths = config.get("compilerOptions", {}).get("paths", {})
paths.pop("leaflet", None)
tsconfig.write_text(json.dumps(config, indent=2) + "\n")

vite = ROOT / "vite.config.ts"
text = vite.read_text()
text = re.sub(r'\n\s*"leaflet":\s*path\.resolve\(import\.meta\.dirname,\s*"src/mapboxNativeCompat\.ts"\),?', "", text)
vite.write_text(text)

# Retired files. Keep the dormant overlay-sync controller for this first compiler
# slice because it still owns a Window type declaration used by dualMapEngineRuntime;
# it will be deleted in the controller-removal slice.
for dead in [
    SRC / "mapboxNativeCompat.ts",
    SRC / "leafletMapLifecycleRuntime.ts",
    SRC / "leafletInteractionDefaults.ts",
    SRC / "leaflet-runtime-extensions.d.ts",
    SRC / "mapboxLeafletRuntime.ts",
]:
    if dead.exists():
        dead.unlink()

print("Migrated production imports from the Leaflet module alias to Mapbox scene runtime.")

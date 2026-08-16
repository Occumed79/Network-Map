from pathlib import Path

root = Path(__file__).resolve().parents[1]
app = root / "src/App.tsx"
scene = root / "src/mapSceneRuntime.ts"
main = root / "src/main.tsx"

text = app.read_text()
import_target = 'import MapScene from "./mapSceneRuntime";\n'
import_replacement = import_target + "import { initializeDualMapEngines, cleanupDualMapEngines } from './dualMapEngineRuntime';\n"
if import_target not in text:
    raise SystemExit("App map scene import target missing")
text = text.replace(import_target, import_replacement, 1)

init_target = '''    map.doubleClickZoom.disable();
    mapRef.current = map;

    // This logical map object is supplied by the temporary Mapbox-native
    // compatibility facade. No secondary renderer is created; both visible 2D and
    // 3D surfaces are owned by Mapbox GL.
'''
init_replacement = '''    map.doubleClickZoom.disable();
    mapRef.current = map;
    void initializeDualMapEngines(mapDivRef.current, { center:[0,20], zoom:2 });

    // The scene root below is only a temporary layer registry for call sites that
    // have not yet moved to direct Mapbox sources. It no longer owns the camera,
    // engine lifecycle, or 2D/3D synchronization.
'''
if init_target not in text:
    raise SystemExit("App initialization target missing")
text = text.replace(init_target, init_replacement, 1)

cleanup_target = '''      resizeObserver.disconnect();
      map.remove();
      mapRef.current=null;
'''
cleanup_replacement = '''      resizeObserver.disconnect();
      cleanupDualMapEngines();
      map.remove();
      mapRef.current=null;
'''
if cleanup_target not in text:
    raise SystemExit("App cleanup target missing")
text = text.replace(cleanup_target, cleanup_replacement, 1)
app.write_text(text)

text = scene.read_text()
fields_target = '''    private layers = new Set<Layer>();
    private removed = false;
    dragging = { enable() {}, disable() {}, enabled: () => true };
'''
fields_replacement = '''    private layers = new Set<Layer>();
    private removed = false;
    private nativeEventDisposers: Array<() => void> = [];
    dragging = { enable() {}, disable() {}, enabled: () => true };
'''
if fields_target not in text:
    raise SystemExit("MapScene fields target missing")
text = text.replace(fields_target, fields_replacement, 1)

constructor_target = '''      this.center = normalizeLatLng(resolvedOptions.center || [20, 0]);
      this.zoom = Number(resolvedOptions.zoom ?? resolvedOptions.minZoom ?? 2);
      logicalMaps.add(this);
      queueMicrotask(() => this.fire("load"));
    }
'''
constructor_replacement = '''      this.center = normalizeLatLng(resolvedOptions.center || [20, 0]);
      this.zoom = Number(resolvedOptions.zoom ?? resolvedOptions.minZoom ?? 2);
      logicalMaps.add(this);

      const onSceneClick = (rawEvent: Event) => {
        const detail = (rawEvent as CustomEvent<{ lat:number; lng:number; originalEvent?: Event }>).detail;
        if (!detail) return;
        this.fire("click", { latlng: new LatLng(detail.lat, detail.lng), originalEvent: detail.originalEvent });
      };
      const onSceneDoubleClick = (rawEvent: Event) => {
        const detail = (rawEvent as CustomEvent<{ lat:number; lng:number; originalEvent?: Event }>).detail;
        if (!detail) return;
        this.fire("dblclick", { latlng: new LatLng(detail.lat, detail.lng), originalEvent: detail.originalEvent });
      };
      const onNativeCamera = (rawEvent: Event) => {
        const detail = (rawEvent as CustomEvent<{ lat:number; lng:number; zoom:number }>).detail;
        if (!detail) return;
        this.center = new LatLng(detail.lat, detail.lng);
        this.zoom = Number(detail.zoom);
        this.fire("moveend");
        this.fire("zoomend");
      };
      window.addEventListener("network-map:scene-click", onSceneClick);
      window.addEventListener("network-map:scene-dblclick", onSceneDoubleClick);
      window.addEventListener("network-map:native-camera", onNativeCamera);
      this.nativeEventDisposers.push(
        () => window.removeEventListener("network-map:scene-click", onSceneClick),
        () => window.removeEventListener("network-map:scene-dblclick", onSceneDoubleClick),
        () => window.removeEventListener("network-map:native-camera", onNativeCamera),
      );
      queueMicrotask(() => this.fire("load"));
    }
'''
if constructor_target not in text:
    raise SystemExit("MapScene constructor target missing")
text = text.replace(constructor_target, constructor_replacement, 1)

remove_target = '''      logicalMaps.delete(this);
      this.fire("unload");
      this.off();
      return this;
'''
remove_replacement = '''      logicalMaps.delete(this);
      for (const dispose of this.nativeEventDisposers.splice(0)) dispose();
      this.fire("unload");
      this.off();
      return this;
'''
if remove_target not in text:
    raise SystemExit("MapScene remove target missing")
text = text.replace(remove_target, remove_replacement, 1)
scene.write_text(text)

# dualMapEngineRuntime is now imported explicitly by App; keeping the side-effect
# import in main is harmless but redundant and obscures ownership.
text = main.read_text()
text = text.replace('import "./dualMapEngineRuntime";\n', '')
main.write_text(text)

# Dormant pre-native overlay mirror is no longer required even for type declarations.
dead = root / "src/mapOverlaySynchronizationControllerRuntime.ts"
if dead.exists():
    dead.unlink()

print("Mapbox now owns dual-engine camera state directly; scene root receives neutral events only.")

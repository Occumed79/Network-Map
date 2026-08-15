from pathlib import Path

app = Path('occu-med-map/src/App.tsx')
text = app.read_text()
state_target = "  const [dropRadiusMiles, setDropRadiusMiles] = useState(25);\n"
state_replacement = "  const [dropRadiusMiles, setDropRadiusMiles] = useState(25);\n  const dropRadiusMilesRef = useRef(dropRadiusMiles);\n  useLayoutEffect(()=>{ dropRadiusMilesRef.current = dropRadiusMiles; },[dropRadiusMiles]);\n"
if state_target not in text:
    raise SystemExit('missing Radius state ref target')
text = text.replace(state_target, state_replacement, 1)

old = '''    // Single clicks remain reserved for tools that explicitly use them.
    map.on('click',(e:L.LeafletMouseEvent)=>{
      const { lat, lng } = e.latlng;
      const tool = activeToolRef.current;

      if (tool === 'radius') {
        // Radius tool is explicit and separate: set center, open UI, draw ring.
        setDropCenter({ lat, lng });
        setDropUi(prev=>({ ...prev, panelOpen:true, status:'' }));
        drawDropRadius(lat, lng, dropRadiusMiles);
        return;
      }

      if (tool === 'coverage' && isUsPoint(lat, lng)) {
        // U.S. coverage diagnostics only inside the U.S.
        const est = estimateLocalPopulationDensity(lat, lng);
        setLocalPopInfo(est ?? null);
        return;
      }
    });

    map.on('dblclick',(e:L.LeafletMouseEvent)=>{
      const tool = activeToolRef.current;
      if (tool !== null && tool !== 'liveFinder') return;
      const { lat, lng } = e.latlng;
      setLocalPopInfo(null);
      setDropCenter({ lat, lng });
      setActiveTool('liveFinder');
      doLiveSearch(lat, lng, undefined, undefined, 'live_finder_double_click');
    });'''
new = '''    // User-facing map tools consume Mapbox-native input directly. The temporary
    // Leaflet-shaped facade remains only for legacy geometry/control APIs; Radius,
    // Coverage, and Live Finder no longer depend on its event bus.
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
    window.addEventListener('network-map:native-dblclick', onNativeMapDoubleClick);'''
if old not in text:
    raise SystemExit('missing App map-input migration target')
text = text.replace(old, new)
old_cleanup = '''    return ()=>{ resizeObserver.disconnect(); map.remove(); mapRef.current=null; cityLayerRef.current=null; };'''
new_cleanup = '''    return ()=>{
      window.removeEventListener('network-map:native-click', onNativeMapClick);
      window.removeEventListener('network-map:native-dblclick', onNativeMapDoubleClick);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current=null;
      cityLayerRef.current=null;
    };'''
if old_cleanup not in text:
    raise SystemExit('missing App map cleanup target')
app.write_text(text.replace(old_cleanup, new_cleanup))

dual = Path('occu-med-map/src/dualMapEngineRuntime.ts')
text = dual.read_text()
old_click = '''    canonicalMap.fire("click", {
      latlng: L.latLng(event.lngLat.lat, event.lngLat.lng),
      originalEvent: event.originalEvent,
    });'''
new_click = '''    window.dispatchEvent(new CustomEvent("network-map:native-click", {
      detail: { lat: event.lngLat.lat, lng: event.lngLat.lng, originalEvent: event.originalEvent, mode },
    }));
    canonicalMap.fire("click", {
      latlng: L.latLng(event.lngLat.lat, event.lngLat.lng),
      originalEvent: event.originalEvent,
    });'''
if old_click not in text:
    raise SystemExit('missing dual native-click dispatch target')
text = text.replace(old_click, new_click, 1)
old_dbl = '''    canonicalMap.fire("dblclick", {
      latlng: L.latLng(event.lngLat.lat, event.lngLat.lng),
      originalEvent: event.originalEvent,
    });'''
new_dbl = '''    window.dispatchEvent(new CustomEvent("network-map:native-dblclick", {
      detail: { lat: event.lngLat.lat, lng: event.lngLat.lng, originalEvent: event.originalEvent, mode },
    }));
    canonicalMap.fire("dblclick", {
      latlng: L.latLng(event.lngLat.lat, event.lngLat.lng),
      originalEvent: event.originalEvent,
    });'''
if old_dbl not in text:
    raise SystemExit('missing dual native-dblclick dispatch target')
dual.write_text(text.replace(old_dbl, new_dbl, 1))

print('Migrated Radius/Coverage/Live Finder input to direct Mapbox-native events.')

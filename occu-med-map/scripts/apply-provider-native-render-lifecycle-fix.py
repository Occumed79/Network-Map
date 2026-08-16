from pathlib import Path

path = Path('occu-med-map/src/App.tsx')
text = path.read_text()

replacements = [
    (
        "  const group = L.layerGroup().addTo(map);\n",
        "  // Build the provider geometry before attaching the root so the first\n  // Mapbox GeoJSON source is never born empty. Provider API requests are already\n  // viewport-bounded, so the returned records are the authoritative render set.\n  const group = L.layerGroup();\n",
    ),
    (
        "    const zoom = map.getZoom();\n    const bounds = map.getBounds().pad(0.35);\n    const visible = valid.filter(p => bounds.contains([p.lat, p.lng] as L.LatLngTuple));\n",
        "    const zoom = map.getZoom();\n    // Do not re-filter API-bounded providers through the temporary Leaflet-shaped\n    // camera facade. That second viewport gate could disagree with the native\n    // Mapbox camera and silently erase otherwise valid provider points.\n    const visible = valid;\n",
    ),
    (
        "  render();\n  map.on('moveend zoomend', render);\n",
        "  render();\n  group.addTo(map);\n  map.on('moveend zoomend', render);\n",
    ),
]
for old, new in replacements:
    if old not in text:
        raise SystemExit(f'missing provider renderer target: {old[:80]!r}')
    text = text.replace(old, new, 1)

state_target = "  const datasetRequestsRef = useRef<Partial<Record<DatasetKey, Promise<void>>>>({});\n"
state_replacement = """  const datasetRequestsRef = useRef<Partial<Record<DatasetKey, Promise<void>>>>({});
  const providerLayerVisibilityRef = useRef({
    indexed: showIndexedProviders,
    bluehive: showBlueHive,
    dentists: showDentists,
    myClinics: showMyClinicsLayer,
  });
  useLayoutEffect(() => {
    providerLayerVisibilityRef.current = {
      indexed: showIndexedProviders,
      bluehive: showBlueHive,
      dentists: showDentists,
      myClinics: showMyClinicsLayer,
    };
  }, [showIndexedProviders, showBlueHive, showDentists, showMyClinicsLayer]);
"""
if state_target not in text:
    raise SystemExit('missing provider visibility ref insertion target')
text = text.replace(state_target, state_replacement, 1)

move_target = """      moveTimer = setTimeout(()=>{
        if(showIndexedProviders) void loadProviderDataset('indexed');
        if(showBlueHive) void loadProviderDataset('bluehive');
        if(showDentists) void loadProviderDataset('dentists');
        if(showMyClinicsLayer) void loadProviderDataset('myClinics');
      }, 300);
"""
move_replacement = """      moveTimer = setTimeout(()=>{
        const visibility = providerLayerVisibilityRef.current;
        if(visibility.indexed) void loadProviderDataset('indexed');
        if(visibility.bluehive) void loadProviderDataset('bluehive');
        if(visibility.dentists) void loadProviderDataset('dentists');
        if(visibility.myClinics) void loadProviderDataset('myClinics');
      }, 300);
"""
if move_target not in text:
    raise SystemExit('missing provider moveend refresh target')
text = text.replace(move_target, move_replacement, 1)

toggle_target = """    else if(key==='dentists') setShowDentists(checked);
    else setShowMyClinicsLayer(checked);
    if(checked && !datasetStatus[key].loaded && !datasetStatus[key].loading) {
      void loadProviderDataset(key);
    }
"""
toggle_replacement = """    else if(key==='dentists') setShowDentists(checked);
    else setShowMyClinicsLayer(checked);
    // The per-toggle effects below are the single owner of initial loading.
    // Keeping network ownership out of the UI event handler prevents duplicate
    // requests racing the state transition that makes the layer visible.
"""
if toggle_target not in text:
    raise SystemExit('missing provider toggle ownership target')
text = text.replace(toggle_target, toggle_replacement, 1)

path.write_text(text)
print('Applied provider-native render lifecycle fixes.')

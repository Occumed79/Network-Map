from pathlib import Path

path = Path('occu-med-map/src/App.tsx')
text = path.read_text()

old_refs = '''  const providerExplorerLayerRef = useRef<L.LayerGroup | null>(null);
  const providerExplorerDensityLayerRef = useRef<L.LayerGroup | null>(null);
  const providerExplorerLiveLayerRef = useRef<L.LayerGroup | null>(null);
  const providerExplorerGapLayerRef = useRef<L.LayerGroup | null>(null);
  const [providerExplorerFilters, setProviderExplorerFilters] = useState<ProviderExplorerFilters>(INITIAL_PROVIDER_EXPLORER_FILTERS);
  const [providerExplorerMode, setProviderExplorerMode] = useState<ProviderExplorerMode>('density');'''
new_refs = '''  const providerExplorerLayerRef = useRef<L.LayerGroup | null>(null);
  const providerExplorerDensityLayerRef = useRef<L.LayerGroup | null>(null);
  const providerExplorerLiveLayerRef = useRef<L.LayerGroup | null>(null);
  const providerExplorerGapLayerRef = useRef<L.LayerGroup | null>(null);
  const providerExplorerRenderGenerationRef = useRef(0);
  const providerExplorerModeRef = useRef<ProviderExplorerMode>('density');
  const [providerExplorerFilters, setProviderExplorerFilters] = useState<ProviderExplorerFilters>(INITIAL_PROVIDER_EXPLORER_FILTERS);
  const [providerExplorerMode, setProviderExplorerMode] = useState<ProviderExplorerMode>('density');
  useLayoutEffect(() => { providerExplorerModeRef.current = providerExplorerMode; }, [providerExplorerMode]);'''
if old_refs not in text:
    raise SystemExit('Provider Explorer refs target not found')
text = text.replace(old_refs, new_refs, 1)

old_clear = '''  const clearProviderExplorerMap = useCallback(() => {
    providerExplorerLayerRef.current?.clearLayers();
    providerExplorerDensityLayerRef.current?.clearLayers();
    providerExplorerLiveLayerRef.current?.clearLayers();
    providerExplorerGapLayerRef.current?.clearLayers();
  },[]);'''
new_clear = '''  const clearProviderExplorerMap = useCallback(() => {
    // Invalidate every in-flight map render before clearing so a stale response
    // can never repopulate or replace a newer/cleared Explorer visualization.
    providerExplorerRenderGenerationRef.current += 1;
    providerExplorerLayerRef.current?.remove();
    providerExplorerLayerRef.current = null;
    providerExplorerDensityLayerRef.current?.clearLayers();
    providerExplorerLiveLayerRef.current?.clearLayers();
    providerExplorerGapLayerRef.current?.clearLayers();
  },[]);'''
if old_clear not in text:
    raise SystemExit('Provider Explorer clear target not found')
text = text.replace(old_clear, new_clear, 1)

old_render = '''  const renderProviderExplorerMap = useCallback(async (mode: ProviderExplorerMode = providerExplorerMode, filters: ProviderExplorerFilters = providerExplorerFilters) => {
    const map = mapRef.current;
    if(!map) return;
    setProviderExplorerMode(mode);
    providerExplorerLayerRef.current?.clearLayers();
    providerExplorerDensityLayerRef.current?.clearLayers();
    const aggregateMode = mode === 'hex' ? 'hex' : 'density';
    try {
      let aggregateStatus = '';
      if(mode === 'density' || mode === 'hex' || mode === 'density-pins' || mode === 'dot-density') {
        const resp = await fetch(`/api/provider-explorer/${aggregateMode}?${providerExplorerParams(filters, aggregateMode)}`);
        const data = await resp.json();
        const cells = Array.isArray(data.cells) ? data.cells as ProviderDensityCell[] : [];
        const rendered = mode === 'dot-density' ? drawProviderDotDensity(cells) : drawProviderDensity(cells, aggregateMode);
        aggregateStatus = mode === 'dot-density'
          ? `dot-density view · ${Number(data.total || 0).toLocaleString()} matching records · ${rendered.toLocaleString()} density dots`
          : `${aggregateMode} view · ${Number(data.total || 0).toLocaleString()} matching records · ${rendered.toLocaleString()} aggregated cells`;
        setProviderExplorerStatus(`${aggregateStatus} · filters: ${filterSummary(filters).join(', ') || 'none'}`);
      }
      if(mode === 'pins' || mode === 'density-pins') {
        const resp = await fetch(`/api/provider-explorer/map?${providerExplorerParams({...filters,useMapBounds:true}, 'pins')}`);
        const data = await resp.json();
        const providers = Array.isArray(data.providers) ? data.providers as ProviderFeature[] : [];
        const rendered = drawProviderPins(providers, mode === 'pins');
        const pinStatus = `showing ${rendered.toLocaleString()} visible pins of ${Number(data.total || 0).toLocaleString()} matching records`;
        setProviderExplorerStatus(`${mode} · ${aggregateStatus ? `${aggregateStatus} · ` : ''}${pinStatus} · filters: ${filterSummary(filters).join(', ') || 'none'}`);
      }
    } catch(error) {
      setProviderExplorerStatus(error instanceof Error ? error.message : 'Provider map explorer failed');
    }
  },[drawProviderDensity, drawProviderDotDensity, drawProviderPins, providerExplorerFilters, providerExplorerMode, providerExplorerParams]);'''
new_render = '''  const renderProviderExplorerMap = useCallback(async (mode: ProviderExplorerMode = providerExplorerModeRef.current, filters: ProviderExplorerFilters = providerExplorerFilters) => {
    const map = mapRef.current;
    if(!map) return;
    const generation = ++providerExplorerRenderGenerationRef.current;
    providerExplorerModeRef.current = mode;
    setProviderExplorerMode(mode);

    // A new density-only visualization can hide old pins immediately. A pin
    // refresh keeps the last good provider root visible until its replacement
    // payload is ready, eliminating the empty-source window during fetches.
    if(mode !== 'pins' && mode !== 'density-pins') {
      providerExplorerLayerRef.current?.remove();
      providerExplorerLayerRef.current = null;
    }
    if(mode !== 'density' && mode !== 'hex' && mode !== 'density-pins' && mode !== 'dot-density') {
      providerExplorerDensityLayerRef.current?.clearLayers();
    }

    const isCurrent = () => generation === providerExplorerRenderGenerationRef.current;
    const aggregateMode = mode === 'hex' ? 'hex' : 'density';
    try {
      let aggregateStatus = '';
      if(mode === 'density' || mode === 'hex' || mode === 'density-pins' || mode === 'dot-density') {
        const resp = await fetch(`/api/provider-explorer/${aggregateMode}?${providerExplorerParams(filters, aggregateMode)}`);
        const data = await resp.json();
        if(!isCurrent()) return;
        const cells = Array.isArray(data.cells) ? data.cells as ProviderDensityCell[] : [];
        const rendered = mode === 'dot-density' ? drawProviderDotDensity(cells) : drawProviderDensity(cells, aggregateMode);
        aggregateStatus = mode === 'dot-density'
          ? `dot-density view · ${Number(data.total || 0).toLocaleString()} matching records · ${rendered.toLocaleString()} density dots`
          : `${aggregateMode} view · ${Number(data.total || 0).toLocaleString()} matching records · ${rendered.toLocaleString()} aggregated cells`;
        if(!isCurrent()) return;
        setProviderExplorerStatus(`${aggregateStatus} · filters: ${filterSummary(filters).join(', ') || 'none'}`);
      }
      if(mode === 'pins' || mode === 'density-pins') {
        const resp = await fetch(`/api/provider-explorer/map?${providerExplorerParams({...filters,useMapBounds:true}, 'pins')}`);
        const data = await resp.json();
        if(!isCurrent()) return;
        const providers = Array.isArray(data.providers) ? data.providers as ProviderFeature[] : [];
        const rendered = drawProviderPins(providers, mode === 'pins');
        if(!isCurrent()) return;
        const pinStatus = `showing ${rendered.toLocaleString()} visible pins of ${Number(data.total || 0).toLocaleString()} matching records`;
        setProviderExplorerStatus(`${mode} · ${aggregateStatus ? `${aggregateStatus} · ` : ''}${pinStatus} · filters: ${filterSummary(filters).join(', ') || 'none'}`);
      }
    } catch(error) {
      if(!isCurrent()) return;
      setProviderExplorerStatus(error instanceof Error ? error.message : 'Provider map explorer failed');
    }
  },[drawProviderDensity, drawProviderDotDensity, drawProviderPins, providerExplorerFilters, providerExplorerParams]);'''
if old_render not in text:
    raise SystemExit('Provider Explorer async render target not found')
text = text.replace(old_render, new_render, 1)

old_effect = '''  useEffect(()=>{
    if(!mapReady) return;
    const timeout = window.setTimeout(() => {
      void renderProviderExplorerMap(providerExplorerMode, providerExplorerFilters);
    }, 350);
    return () => window.clearTimeout(timeout);
  },[mapReady, providerExplorerFilters, providerExplorerMode, renderProviderExplorerMap]);'''
new_effect = '''  useEffect(()=>{
    if(!mapReady) return;
    const timeout = window.setTimeout(() => {
      void renderProviderExplorerMap(providerExplorerModeRef.current, providerExplorerFilters);
    }, 350);
    return () => window.clearTimeout(timeout);
  },[mapReady, providerExplorerFilters, renderProviderExplorerMap]);'''
if old_effect not in text:
    raise SystemExit('Provider Explorer duplicate mode-effect target not found')
text = text.replace(old_effect, new_effect, 1)

path.write_text(text)
print('Applied single-owner Provider Explorer rendering with stale-response protection.')

from pathlib import Path

path = Path('occu-med-map/src/App.tsx')
text = path.read_text()
old = '''  const drawProviderPins = useCallback((providers: ProviderFeature[], fit = false) => {
    const map = mapRef.current;
    if(!map) return 0;
    if(!providerExplorerLayerRef.current) providerExplorerLayerRef.current = L.layerGroup().addTo(map);
    const layer = providerExplorerLayerRef.current;
    layer.clearLayers();
    const drawable = providers.filter((provider): provider is ProviderFeature & {lat:number; lng:number} => typeof provider.lat === 'number' && typeof provider.lng === 'number');
    drawable.slice(0,1000).forEach(provider=>{
      const style = providerCategoryStyle(provider);
      const location = [provider.address,provider.city,provider.admin_area,provider.country].filter(Boolean).join(', ');
      L.circleMarker([provider.lat, provider.lng], { radius: 4, color: '#ffffff', weight: 1, fillColor: style.color, fillOpacity: 0.92, opacity: 0.95, className:'provider-point provider-point-glow' })
        .bindPopup(`<strong>${escapeHtml(provider.name)}</strong><br/>${escapeHtml(provider.source)} · ${escapeHtml(provider.source_kind)}<br/>${escapeHtml(style.label)} · ${escapeHtml(provider.clinic_type)}<br/>${escapeHtml(location)}${provider.website ? `<br/><a href="${escapeHtml(provider.website)}" target="_blank" rel="noreferrer">Website</a>` : ''}`)
        .addTo(layer);
    });
    if(fit && drawable.length) map.fitBounds(L.latLngBounds(drawable.map(provider=>[provider.lat,provider.lng] as [number,number])), { padding:[28,28], maxZoom: 11 });
    return Math.min(drawable.length,1000);
  },[]);'''
new = '''  const drawProviderPins = useCallback((providers: ProviderFeature[], fit = false) => {
    const map = mapRef.current;
    if(!map) return 0;
    // Provider Explorer owns a dynamic Mapbox compatibility root. Rebuild that
    // root off-map so its first GeoJSON payload already contains the provider
    // features and popup metadata. Mutating an already-attached empty root can
    // leave the native source empty across browser engines.
    providerExplorerLayerRef.current?.remove();
    const layer = L.layerGroup();
    const drawable = providers.filter((provider): provider is ProviderFeature & {lat:number; lng:number} => typeof provider.lat === 'number' && typeof provider.lng === 'number');
    drawable.slice(0,1000).forEach(provider=>{
      const style = providerCategoryStyle(provider);
      const location = [provider.address,provider.city,provider.admin_area,provider.country].filter(Boolean).join(', ');
      L.circleMarker([provider.lat, provider.lng], { radius: 4, color: '#ffffff', weight: 1, fillColor: style.color, fillOpacity: 0.92, opacity: 0.95, className:'provider-point provider-point-glow' })
        .bindPopup(`<strong>${escapeHtml(provider.name)}</strong><br/>${escapeHtml(provider.source)} · ${escapeHtml(provider.source_kind)}<br/>${escapeHtml(style.label)} · ${escapeHtml(provider.clinic_type)}<br/>${escapeHtml(location)}${provider.website ? `<br/><a href="${escapeHtml(provider.website)}" target="_blank" rel="noreferrer">Website</a>` : ''}`)
        .addTo(layer);
    });
    layer.addTo(map);
    providerExplorerLayerRef.current = layer;
    if(fit && drawable.length) map.fitBounds(L.latLngBounds(drawable.map(provider=>[provider.lat,provider.lng] as [number,number])), { padding:[28,28], maxZoom: 11 });
    return Math.min(drawable.length,1000);
  },[]);'''
if old not in text:
    raise SystemExit('Provider Explorer drawProviderPins lifecycle target not found')
path.write_text(text.replace(old, new, 1))
print('Rebuilt Provider Explorer native compatibility root with children before attachment.')

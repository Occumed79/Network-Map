from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
src = root / "src"
app = src / "App.tsx"
text = app.read_text()

import_anchor = "import { fetchProviderLayer } from './providerLayerRequestRuntime';\n"
import_block = '''import { fetchProviderLayer } from './providerLayerRequestRuntime';
import {
  clearProviderExplorerNative,
  renderProviderExplorerPins,
  renderProviderExplorerDensity,
  renderProviderExplorerDotDensity,
  renderProviderExplorerLive,
  renderProviderExplorerGaps,
} from './providerExplorerNativeMapRuntime';
'''
if import_anchor not in text:
    raise SystemExit('App Provider Explorer import anchor missing')
text = text.replace(import_anchor, import_block, 1)

refs = '''  const providerExplorerLayerRef = useRef<MapScene.LayerGroup | null>(null);
  const providerExplorerDensityLayerRef = useRef<MapScene.LayerGroup | null>(null);
  const providerExplorerLiveLayerRef = useRef<MapScene.LayerGroup | null>(null);
  const providerExplorerGapLayerRef = useRef<MapScene.LayerGroup | null>(null);
'''
if refs not in text:
    raise SystemExit('Provider Explorer layer refs missing')
text = text.replace(refs, '', 1)

clear_pattern = re.compile(r'''  const clearProviderExplorerMap = useCallback\(\(\) => \{.*?\n  \},\[\]\);''', re.S)
clear_replacement = '''  const clearProviderExplorerMap = useCallback(() => {
    providerExplorerRenderGenerationRef.current += 1;
    clearProviderExplorerNative();
  },[]);'''
text, count = clear_pattern.subn(clear_replacement, text, count=1)
if count != 1:
    raise SystemExit('clearProviderExplorerMap block did not match')

pins_start = text.index('  const drawProviderPins = useCallback(')
density_start = text.index('  const drawProviderDensity = useCallback(', pins_start)
pins_block = text[pins_start:density_start]
pins_replacement = '''  const drawProviderPins = useCallback((providers: ProviderFeature[], fit = false) => {
    return renderProviderExplorerPins(providers, {
      fit,
      color: (provider) => providerCategoryStyle(provider).color,
      popupHtml: (provider) => {
        const style = providerCategoryStyle(provider);
        const location = [provider.address,provider.city,provider.admin_area,provider.country].filter(Boolean).join(', ');
        return `<strong>${escapeHtml(provider.name)}</strong><br/>${escapeHtml(provider.source)} · ${escapeHtml(provider.source_kind)}<br/>${escapeHtml(style.label)} · ${escapeHtml(provider.clinic_type)}<br/>${escapeHtml(location)}${provider.website ? `<br/><a href="${escapeHtml(provider.website)}" target="_blank" rel="noreferrer">Website</a>` : ''}`;
      },
    });
  },[]);

'''
text = text[:pins_start] + pins_replacement + text[density_start:]

density_start = text.index('  const drawProviderDensity = useCallback(')
dot_start = text.index('  const drawProviderDotDensity = useCallback(', density_start)
density_replacement = '''  const drawProviderDensity = useCallback((cells: ProviderDensityCell[], mode: 'density'|'hex') => {
    return renderProviderExplorerDensity(cells, mode);
  },[]);

'''
text = text[:density_start] + density_replacement + text[dot_start:]

dot_start = text.index('  const drawProviderDotDensity = useCallback(')
render_start = text.index('  const renderProviderExplorerMap = useCallback(', dot_start)
dot_replacement = '''  const drawProviderDotDensity = useCallback((cells: ProviderDensityCell[]) => {
    return renderProviderExplorerDotDensity(cells);
  },[]);

'''
text = text[:dot_start] + dot_replacement + text[render_start:]

# Replace immediate LayerGroup clearing inside the render coordinator with native source clears.
old = '''    if(mode !== 'pins' && mode !== 'density-pins') {
      providerExplorerLayerRef.current?.remove();
      providerExplorerLayerRef.current = null;
    }
    if(mode !== 'density' && mode !== 'hex' && mode !== 'density-pins' && mode !== 'dot-density') {
      providerExplorerDensityLayerRef.current?.clearLayers();
    }
'''
new = '''    if(mode !== 'pins' && mode !== 'density-pins') clearProviderExplorerNative(['pins']);
    if(mode !== 'density' && mode !== 'hex' && mode !== 'density-pins' && mode !== 'dot-density') {
      clearProviderExplorerNative(['aggregate','dots']);
    }
'''
if old not in text:
    raise SystemExit('Provider Explorer mode clearing block missing')
text = text.replace(old, new, 1)

# Live layer becomes one native source update.
live_start = text.index('  const renderProviderExplorerLiveLayer = useCallback(')
compare_start = text.index('  const compareProviderExplorerArea = useCallback(', live_start)
live_replacement = '''  const renderProviderExplorerLiveLayer = useCallback(async () => {
    if(!providerExplorerLiveEnabled) {
      clearProviderExplorerNative(['live']);
      return;
    }
    let providers = mapLiveResultsAsProviderFeatures();
    try {
      const resp = await fetch(`/api/provider-explorer/live?${providerExplorerParams({...providerExplorerFilters, includeLive:true}, 'live')}`);
      const data = await resp.json();
      if(Array.isArray(data.providers) && data.providers.length) providers = data.providers as ProviderFeature[];
    } catch {}
    const rendered = renderProviderExplorerLive(providers, {
      color: (provider) => providerCategoryStyle(provider).color,
      popupHtml: (provider) => {
        const style = providerCategoryStyle(provider);
        return `<strong>${escapeHtml(provider.name)}</strong><br/>Live discovery · not stored<br/>${escapeHtml(style.label)} · ${escapeHtml(provider.clinic_type)}<br/><button class="provider-popup-save" data-provider-id="${escapeHtml(provider.id)}">Save candidate</button>`;
      },
      onAction: (provider) => { void saveProviderExplorerCandidate(provider); },
    });
    setProviderExplorerStatus(prev=>`${prev} · live layer: ${rendered.toLocaleString()} not-stored results`);
  },[mapLiveResultsAsProviderFeatures, providerExplorerLiveEnabled, providerExplorerFilters, providerExplorerParams]);


'''
text = text[:live_start] + live_replacement + text[compare_start:]

compare_start = text.index('  const compareProviderExplorerArea = useCallback(')
load_start = text.index('  const loadProviderDataset = useCallback(', compare_start)
compare_replacement = '''  const compareProviderExplorerArea = useCallback(async (filters: ProviderExplorerFilters = providerExplorerFilters) => {
    try {
      const resp = await fetch(`/api/provider-explorer/compare?${providerExplorerParams({...filters, includeLive:true}, 'compare')}`);
      const data = await resp.json();
      const liveOnly = Array.isArray(data.live_only) ? data.live_only as ProviderFeature[] : [];
      renderProviderExplorerGaps(liveOnly, {
        color: (provider) => providerCategoryStyle(provider).color,
        popupHtml: (provider) => {
          const style = providerCategoryStyle(provider);
          return `<strong>${escapeHtml(provider.name)}</strong><br/>Live-only gap<br/>${escapeHtml(style.label)} · ${escapeHtml(provider.clinic_type)}<br/>${escapeHtml(provider.match_reason || '')}`;
        },
      });
      setProviderExplorerStatus(`compare · stored ${Number(data.stored_count||0).toLocaleString()} · live ${Number(data.live_count||0).toLocaleString()} · live-only gaps ${liveOnly.length.toLocaleString()}`);
    } catch(error) {
      setProviderExplorerStatus(error instanceof Error ? error.message : 'Compare failed');
    }
  },[providerExplorerFilters, providerExplorerParams]);

'''
text = text[:compare_start] + compare_replacement + text[load_start:]

app.write_text(text)

# Request stability remains, but the LayerGroup monkeypatch is gone.
main = src / 'main.tsx'
data = main.read_text().replace('import "./providerExplorerStabilityRuntime";', 'import "./providerExplorerRequestStabilityRuntime";')
main.write_text(data)

old_stability = src / 'providerExplorerStabilityRuntime.ts'
if old_stability.exists(): old_stability.unlink()

print('Migrated Provider Explorer rendering to native Mapbox sources/layers.')

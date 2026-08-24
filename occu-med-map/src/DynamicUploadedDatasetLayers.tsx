import { useEffect, useRef, useState } from 'react';
import { getActiveMapboxMap } from './dualMapEngineRuntime';
import { fetchProviderLayer } from './providerLayerRequestRuntime';
import { clearProviderDataset, renderProviderDataset } from './providerDatasetNativeMapRuntime';

type UploadedCategory = {
  id: string;
  label: string;
  sourceKey: string;
  total: number;
};

type LayerState = {
  enabled: boolean;
  loading: boolean;
  count: number;
  total: number;
  error: string;
};

const EMPTY_STATE: LayerState = { enabled: false, loading: false, count: 0, total: 0, error: '' };
const COLORS = ['#f59e0b', '#22d3ee', '#a78bfa', '#34d399', '#fb7185', '#60a5fa', '#f472b6', '#facc15', '#2dd4bf', '#818cf8'];

function colorFor(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

function channelFor(sourceKey: string): string {
  return `uploaded-${sourceKey.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 90)}`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char] || char));
}

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function popup(provider: any, category: UploadedCategory): string {
  const name = escapeHtml(provider?.name || category.label);
  const address = escapeHtml([
    provider?.address || provider?.address_1,
    provider?.city,
    provider?.admin_area || provider?.state,
    provider?.postal_code || provider?.zip,
  ].filter(Boolean).join(', ') || 'Address unavailable');
  const phone = typeof provider?.phone === 'string' && provider.phone.trim() ? provider.phone.trim() : '';
  const website = safeHttpUrl(provider?.website);
  const type = escapeHtml(provider?.clinic_type || provider?.providerType || provider?.category || '');
  return `<div style="font-family:Inter,sans-serif;padding:10px 12px;max-width:290px;">
    <div style="font-size:12px;font-weight:700;color:#e2f0ff;">${name}</div>
    <div style="font-size:9px;color:#7dd3fc;letter-spacing:.06em;text-transform:uppercase;margin:2px 0 4px;">${escapeHtml(category.label)}</div>
    <div style="font-size:9px;color:#7f9dbb;margin-bottom:5px;">${address}</div>
    ${type ? `<div style="font-size:8.5px;color:#a7c7e7;margin-bottom:4px;">${type}</div>` : ''}
    ${phone ? `<div style="font-size:9px;margin-bottom:3px;"><a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></div>` : ''}
    ${website ? `<div style="font-size:9px;margin-bottom:3px;"><a href="${escapeHtml(website)}" target="_blank" rel="noreferrer">Website</a></div>` : ''}
    <div style="font-size:8px;color:#64748b;margin-top:5px;border-top:1px solid rgba(255,255,255,.08);padding-top:4px;">Uploaded dataset</div>
  </div>`;
}

function statusText(state: LayerState): string {
  if (state.loading) return 'Loading all records in view…';
  if (state.error) return state.error;
  if (!state.enabled) return `${state.total.toLocaleString()} total · off`;
  const total = state.total > state.count ? ` · ${state.total.toLocaleString()} matching` : '';
  return `${state.count.toLocaleString()} mapped${total}`;
}

export default function DynamicUploadedDatasetLayers() {
  const [categories, setCategories] = useState<UploadedCategory[]>([]);
  const [layers, setLayers] = useState<Record<string, LayerState>>({});
  const [catalogError, setCatalogError] = useState('');
  const controllers = useRef(new Map<string, AbortController>());
  const categoriesRef = useRef<UploadedCategory[]>([]);
  const layerStateRef = useRef(layers);
  const reloadTimer = useRef<number>(0);
  categoriesRef.current = categories;
  layerStateRef.current = layers;

  async function refreshCatalog(signal?: AbortSignal): Promise<void> {
    try {
      const response = await fetch('/api/provider-upload-categories', { signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error) throw new Error(data?.error || `HTTP ${response.status}`);
      const next = (Array.isArray(data?.categories) ? data.categories : [])
        .map((entry: any) => ({
          id: String(entry?.id || ''),
          label: String(entry?.label || 'Uploaded dataset'),
          sourceKey: String(entry?.sourceKey || ''),
          total: Number(entry?.total || 0),
        }))
        .filter((entry: UploadedCategory) => entry.id && entry.sourceKey);
      setCategories(next);
      setLayers((current) => {
        const nextState: Record<string, LayerState> = {};
        for (const category of next) {
          nextState[category.id] = { ...(current[category.id] || EMPTY_STATE), total: category.total };
        }
        return nextState;
      });
      setCatalogError('');
    } catch (error) {
      if (signal?.aborted) return;
      setCatalogError(error instanceof Error ? error.message : 'Could not load uploaded dataset categories');
    }
  }

  async function loadLayer(category: UploadedCategory): Promise<void> {
    controllers.current.get(category.id)?.abort();
    const controller = new AbortController();
    controllers.current.set(category.id, controller);
    setLayers((current) => ({
      ...current,
      [category.id]: { ...(current[category.id] || EMPTY_STATE), loading: true, error: '' },
    }));

    try {
      const map = getActiveMapboxMap();
      if (!map) throw new Error('Map is not ready');
      const bounds = map.getBounds();
      if (!bounds) throw new Error('Map bounds are not ready');
      const params = new URLSearchParams({
        useBounds: 'true',
        north: String(bounds.getNorth()),
        south: String(bounds.getSouth()),
        east: String(bounds.getEast()),
        west: String(bounds.getWest()),
        limit: '2000',
      });
      const endpoint = `/api/provider-upload-categories/${encodeURIComponent(category.sourceKey)}?${params.toString()}`;
      const response = await fetchProviderLayer(endpoint, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error || data?.transientFailure) {
        throw new Error(data?.error || `HTTP ${response.status}`);
      }
      const providers = Array.isArray(data?.providers) ? data.providers : [];
      const mapped = renderProviderDataset(channelFor(category.sourceKey), providers, {
        baseColor: colorFor(category.sourceKey),
        glow: false,
        buildPopup: (provider: any) => popup(provider, category),
      });
      setLayers((current) => ({
        ...current,
        [category.id]: {
          ...(current[category.id] || EMPTY_STATE),
          loading: false,
          count: mapped,
          total: Number(data?.total ?? providers.length) || providers.length,
          error: '',
        },
      }));
    } catch (error) {
      if (controller.signal.aborted) return;
      clearProviderDataset(channelFor(category.sourceKey));
      setLayers((current) => ({
        ...current,
        [category.id]: {
          ...(current[category.id] || EMPTY_STATE),
          loading: false,
          count: 0,
          error: error instanceof Error ? error.message : 'Layer load failed',
        },
      }));
    } finally {
      if (controllers.current.get(category.id) === controller) controllers.current.delete(category.id);
    }
  }

  function setEnabled(category: UploadedCategory, enabled: boolean): void {
    setLayers((current) => ({
      ...current,
      [category.id]: { ...(current[category.id] || EMPTY_STATE), enabled, error: enabled ? '' : current[category.id]?.error || '' },
    }));
    if (!enabled) {
      controllers.current.get(category.id)?.abort();
      controllers.current.delete(category.id);
      clearProviderDataset(channelFor(category.sourceKey));
      setLayers((current) => ({
        ...current,
        [category.id]: { ...(current[category.id] || EMPTY_STATE), enabled: false, loading: false, count: 0 },
      }));
      return;
    }
    void loadLayer(category);
  }

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => { void refreshCatalog(controller.signal); };
    refresh();
    const interval = window.setInterval(refresh, 4000);
    window.addEventListener('focus', refresh);
    window.addEventListener('network-map:provider-dataset-uploaded', refresh);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('network-map:provider-dataset-uploaded', refresh);
    };
  // Catalog refresh is intentionally polling so a newly uploaded Dataset Label becomes a toggle without a page reload.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const reloadVisible = () => {
      window.clearTimeout(reloadTimer.current);
      reloadTimer.current = window.setTimeout(() => {
        for (const category of categoriesRef.current) {
          if (layerStateRef.current[category.id]?.enabled) void loadLayer(category);
        }
      }, 350);
    };
    window.addEventListener('network-map:native-camera', reloadVisible);
    return () => {
      window.removeEventListener('network-map:native-camera', reloadVisible);
      window.clearTimeout(reloadTimer.current);
      controllers.current.forEach((controller) => controller.abort());
      controllers.current.clear();
      categoriesRef.current.forEach((category) => clearProviderDataset(channelFor(category.sourceKey)));
    };
  // loadLayer intentionally reads current map state for each camera-triggered refresh.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>
    <div style={{ margin: '8px 0 4px', fontSize: 8, letterSpacing: '.12em', color: '#64748b', fontFamily: "'IBM Plex Mono',monospace" }}>
      CUSTOM / UPLOADED DATASETS
    </div>
    <div style={{ margin: '0 0 6px', fontSize: 8, lineHeight: 1.35, color: '#526b89' }}>
      The Dataset Label you enter during upload becomes its own map toggle automatically.
    </div>
    {catalogError && <div className="provider-map-status warning" style={{ marginBottom: 5 }}>{catalogError}</div>}
    {!catalogError && categories.length === 0 && <div style={{ fontSize: 8, color: '#526b89', marginBottom: 5 }}>No custom dataset toggles yet.</div>}
    {categories.map((category) => {
      const state = layers[category.id] || { ...EMPTY_STATE, total: category.total };
      return <div key={category.id} className={`workflow-layer${state.enabled ? ' active' : ''}${state.loading ? ' disabled' : ''}`}>
        <div className="workflow-layer-copy">
          <span className="workflow-layer-name">{category.label}</span>
          <span className="workflow-layer-status">{statusText(state)}</span>
        </div>
        <label className="tog-switch">
          <input
            aria-label={category.label}
            type="checkbox"
            checked={state.enabled}
            disabled={state.loading && !state.enabled}
            onChange={(event) => setEnabled(category, event.target.checked)}
          />
          <span className="tog-slider" />
        </label>
      </div>;
    })}
  </>;
}

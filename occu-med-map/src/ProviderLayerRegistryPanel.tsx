import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getActiveMapboxMap } from './dualMapEngineRuntime';
import { fetchProviderLayer } from './providerLayerRequestRuntime';
import { clearProviderDataset, renderProviderDataset } from './providerDatasetNativeMapRuntime';
import { subscribeToSharedDomObserver } from './runtimeControllerRegistry';
import DynamicUploadedDatasetLayers from './DynamicUploadedDatasetLayers';
import {
  PROVIDER_LAYER_CATEGORIES,
  PUBLIC_HEALTH_LAYER,
  type ProviderLayerCategory,
} from './providerLayerRegistry';

type LayerDefinition = ProviderLayerCategory | typeof PUBLIC_HEALTH_LAYER;
type LayerState = {
  enabled: boolean;
  loading: boolean;
  count: number;
  total: number;
  error: string;
  warning: string;
};

type LayerStateMap = Record<string, LayerState>;

const EMPTY_LAYER_STATE: LayerState = {
  enabled: false,
  loading: false,
  count: 0,
  total: 0,
  error: '',
  warning: '',
};

function initialState(): LayerStateMap {
  return Object.fromEntries(
    [...PROVIDER_LAYER_CATEGORIES, PUBLIC_HEALTH_LAYER].map((entry) => [entry.id, { ...EMPTY_LAYER_STATE }]),
  );
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

function providerPopup(provider: any, layer: LayerDefinition): string {
  const name = escapeHtml(provider?.name || provider?.clinic_name || layer.label);
  const address = escapeHtml([
    provider?.address || provider?.address_1,
    provider?.city,
    provider?.admin_area || provider?.state,
    provider?.postal_code || provider?.zip,
  ].filter(Boolean).join(', ') || 'Address unavailable');
  const phone = typeof provider?.phone === 'string' && provider.phone.trim() ? provider.phone.trim() : '';
  const website = safeHttpUrl(provider?.website);
  const source = escapeHtml(provider?.source || provider?.data_source || layer.label);
  const type = escapeHtml(provider?.clinic_type || provider?.providerType || provider?.category || '');
  return `<div style="font-family:Inter,sans-serif;padding:10px 12px;max-width:290px;">
    <div style="font-size:12px;font-weight:700;color:#e2f0ff;">${name}</div>
    <div style="font-size:9px;color:#7dd3fc;letter-spacing:.06em;text-transform:uppercase;margin:2px 0 4px;">${escapeHtml(layer.label)}</div>
    <div style="font-size:9px;color:#7f9dbb;margin-bottom:5px;">${address}</div>
    ${type ? `<div style="font-size:8.5px;color:#a7c7e7;margin-bottom:4px;">${type}</div>` : ''}
    ${phone ? `<div style="font-size:9px;margin-bottom:3px;"><a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></div>` : ''}
    ${website ? `<div style="font-size:9px;margin-bottom:3px;"><a href="${escapeHtml(website)}" target="_blank" rel="noreferrer">Website</a></div>` : ''}
    <div style="font-size:8px;color:#64748b;margin-top:5px;border-top:1px solid rgba(255,255,255,.08);padding-top:4px;">${source}</div>
  </div>`;
}

function layerStatus(state: LayerState): string {
  if (state.loading) return 'Loading all records in view…';
  if (state.error) return state.error;
  if (!state.enabled) return state.total > 0 ? `${state.total.toLocaleString()} total · off` : 'Off';
  const loaded = `${state.count.toLocaleString()} mapped`;
  const total = state.total > state.count ? ` · ${state.total.toLocaleString()} matching` : '';
  return `${loaded}${total}${state.warning ? ' · partial result' : ''}`;
}

function Toggle({ definition, state, onChange }: {
  definition: LayerDefinition;
  state: LayerState;
  onChange: (enabled: boolean) => void;
}) {
  return <div className={`workflow-layer${state.enabled ? ' active' : ''}${state.loading ? ' disabled' : ''}`}>
    <div className="workflow-layer-copy">
      <span className="workflow-layer-name">{definition.label}</span>
      <span className="workflow-layer-status">{layerStatus(state)}</span>
    </div>
    <label className="tog-switch">
      <input
        aria-label={definition.label}
        type="checkbox"
        checked={state.enabled}
        disabled={state.loading && !state.enabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="tog-slider" />
    </label>
  </div>;
}

function findLegacyProviderLayerList(): HTMLElement | null {
  for (const section of Array.from(document.querySelectorAll<HTMLElement>('section.command-section'))) {
    const title = section.querySelector<HTMLElement>('.command-section-title span')?.textContent?.trim();
    if (title !== 'Provider Layers') continue;
    return section.querySelector<HTMLElement>('.workflow-layer-list');
  }
  return null;
}

export default function ProviderLayerRegistryPanel() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [layers, setLayers] = useState<LayerStateMap>(initialState);
  const controllers = useRef(new Map<string, AbortController>());
  const loadedProviders = useRef(new Map<string, any[]>());
  const reloadTimer = useRef<number>(0);
  const layerStateRef = useRef(layers);
  layerStateRef.current = layers;

  function renderCombinedProviderLayers(): void {
    const unique = new Map<string, { provider: any; definition: ProviderLayerCategory }>();
    for (const definition of PROVIDER_LAYER_CATEGORIES) {
      if (!layerStateRef.current[definition.id]?.enabled) continue;
      for (const provider of loadedProviders.current.get(definition.id) || []) {
        const key = String(provider?.id || provider?.source_id || `${provider?.lat}:${provider?.lng}:${provider?.name}`);
        if (!unique.has(key)) unique.set(key, { provider, definition });
      }
    }
    const entries = [...unique.values()];
    renderProviderDataset('provider-categories', entries, {
      baseColor: '#38bdf8',
      getColor: (entry) => entry.definition.color,
      buildPopup: (entry) => providerPopup(entry.provider, entry.definition),
    });
  }

  const definitions = useMemo<LayerDefinition[]>(
    () => [...PROVIDER_LAYER_CATEGORIES, PUBLIC_HEALTH_LAYER],
    [],
  );

  useEffect(() => {
    let disposed = false;
    const suppressLegacyControls = () => {
      const list = findLegacyProviderLayerList();
      if (!list) return;
      for (const child of Array.from(list.children)) {
        if (!(child instanceof HTMLElement)) continue;
        if (child.dataset.providerRegistryOwned === 'true') continue;
        const label = child.querySelector<HTMLElement>('.workflow-layer-name')?.textContent?.trim();
        // Luminous Density is a visualization control, not a provider dataset.
        // Keep it available while replacing only the old provider-source toggles.
        if (label === 'Luminous Density') {
          child.style.removeProperty('display');
          delete child.dataset.providerRegistrySuppressed;
          continue;
        }
        child.dataset.providerRegistrySuppressed = 'true';
        child.style.display = 'none';
      }
      if (!disposed) setHost((current) => current === list ? current : list);
    };
    suppressLegacyControls();
    const unsubscribe = subscribeToSharedDomObserver('provider-layer-registry-panel', suppressLegacyControls);
    return () => {
      disposed = true;
      unsubscribe();
      document.querySelectorAll<HTMLElement>('[data-provider-registry-suppressed="true"]').forEach((element) => {
        element.style.removeProperty('display');
        delete element.dataset.providerRegistrySuppressed;
      });
    };
  }, []);

  async function loadLayer(definition: LayerDefinition): Promise<void> {
    controllers.current.get(definition.id)?.abort();
    const controller = new AbortController();
    controllers.current.set(definition.id, controller);
    setLayers((current) => ({
      ...current,
      [definition.id]: { ...current[definition.id], loading: true, error: '', warning: '' },
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
        // Use the common transport page size. The request runtime auto-paginates
        // until every matching viewport record has been assembled.
        limit: '2000',
      });
      const response = await fetchProviderLayer(`${definition.endpoint}?${params.toString()}`, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error || data?.transientFailure) {
        throw new Error(data?.warning || data?.error || `HTTP ${response.status}`);
      }
      const providers = Array.isArray(data?.providers) ? data.providers : [];
      const isCategory = 'section' in definition;
      if (isCategory) {
        loadedProviders.current.set(definition.id, providers);
        renderCombinedProviderLayers();
      }
      const mapped = isCategory ? providers.length : renderProviderDataset(definition.channel, providers, {
        baseColor: definition.color, glow: false, buildPopup: (provider: any) => providerPopup(provider, definition),
      });
      setLayers((current) => ({
        ...current,
        [definition.id]: {
          ...current[definition.id],
          loading: false,
          count: mapped,
          total: Number(data?.total ?? providers.length) || providers.length,
          error: '',
          warning: String(data?.warning || ''),
        },
      }));
    } catch (error) {
      if (controller.signal.aborted) return;
      clearProviderDataset(definition.channel);
      setLayers((current) => ({
        ...current,
        [definition.id]: {
          ...current[definition.id],
          loading: false,
          count: 0,
          total: 0,
          error: error instanceof Error ? error.message : 'Layer load failed',
          warning: '',
        },
      }));
    } finally {
      if (controllers.current.get(definition.id) === controller) controllers.current.delete(definition.id);
    }
  }

  function setEnabled(definition: LayerDefinition, enabled: boolean): void {
    setLayers((current) => ({
      ...current,
      [definition.id]: { ...current[definition.id], enabled, error: enabled ? '' : current[definition.id].error },
    }));
    if (!enabled) {
      controllers.current.get(definition.id)?.abort();
      controllers.current.delete(definition.id);
      if ('section' in definition) {
        loadedProviders.current.delete(definition.id);
        // State refs update on the next render; remove this category immediately.
        layerStateRef.current = { ...layerStateRef.current, [definition.id]: { ...layerStateRef.current[definition.id], enabled: false } };
        renderCombinedProviderLayers();
      } else clearProviderDataset(definition.channel);
      setLayers((current) => ({
        ...current,
        [definition.id]: { ...current[definition.id], loading: false, count: 0, warning: '' },
      }));
      return;
    }
    void loadLayer(definition);
  }

  useEffect(() => {
    const reloadVisible = () => {
      window.clearTimeout(reloadTimer.current);
      reloadTimer.current = window.setTimeout(() => {
        for (const definition of definitions) {
          if (layerStateRef.current[definition.id]?.enabled) void loadLayer(definition);
        }
      }, 350);
    };
    window.addEventListener('network-map:native-camera', reloadVisible);
    return () => {
      window.removeEventListener('network-map:native-camera', reloadVisible);
      window.clearTimeout(reloadTimer.current);
      controllers.current.forEach((controller) => controller.abort());
      controllers.current.clear();
      definitions.forEach((definition) => clearProviderDataset(definition.channel));
    };
  // Definitions are registry constants; loadLayer intentionally reads current map state per call.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definitions]);

  if (!host) return null;
  return createPortal(
    <div data-provider-registry-owned="true">
      {PROVIDER_LAYER_CATEGORIES.map((definition, index) => <div key={definition.id}>
        {(index === 0 || PROVIDER_LAYER_CATEGORIES[index - 1].section !== definition.section) &&
          <div style={{ margin: '8px 0 4px', fontSize: 8, letterSpacing: '.12em', color: '#64748b', fontFamily: "'IBM Plex Mono',monospace" }}>{definition.section}</div>}
        <Toggle definition={definition} state={layers[definition.id] || EMPTY_LAYER_STATE}
          onChange={(enabled) => setEnabled(definition, enabled)} />
      </div>)}
      <DynamicUploadedDatasetLayers />
      <div style={{ margin: '8px 0 4px', fontSize: 8, letterSpacing: '.12em', color: '#64748b', fontFamily: "'IBM Plex Mono',monospace" }}>
        PUBLIC HEALTH DATA
      </div>
      <Toggle
        definition={PUBLIC_HEALTH_LAYER}
        state={layers[PUBLIC_HEALTH_LAYER.id] || EMPTY_LAYER_STATE}
        onChange={(enabled) => setEnabled(PUBLIC_HEALTH_LAYER, enabled)}
      />
    </div>,
    host,
  );
}

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { ChevronLeft, ChevronRight, Layers3, ListFilter, LocateFixed, RefreshCw, Search, X } from 'lucide-react';
import type { ProviderFeature } from './DatasetBrowser';
import type { PhaseTwoMapSnapshot } from './phaseTwoMapBridge';
import {
  buildViewportParams,
  effectiveVisualization,
  gridCellBounds,
  providerMatchesTrustTier,
  sourceColor,
  uniqueProviders,
  type PhaseTwoLayerFilters,
  type PhaseTwoVisualization,
  type ViewportBounds,
} from './phaseTwoLayerModel';
import './phase-two-shell.css';

type PhaseTwoShellProps = {
  children: ReactNode;
};

type ExplorerResponse = {
  providers?: ProviderFeature[];
  records?: ProviderFeature[];
  cells?: Array<{ lat: number; lng: number; count: number }>;
  total?: number;
  count?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
  precision?: number;
  warning?: string;
  error?: string;
};

type RequestedVisualization = 'auto' | PhaseTwoVisualization;

const LIST_PAGE_SIZE = 100;
const PIN_PAGE_SIZE = 5000;

const DEFAULT_FILTERS: PhaseTwoLayerFilters = {
  source: 'all',
  query: '',
  country: '',
  adminArea: '',
  city: '',
  service: '',
  trustTier: 'all',
  includeStored: true,
  includeSaved: true,
  includeCandidates: false,
  includeLive: false,
};

const SOURCE_OPTIONS = [
  ['all', 'All sources'],
  ['bluehive', 'BlueHive'],
  ['dentists', 'Dentists'],
  ['indexed', 'Indexed'],
  ['my-clinics', 'My Clinics'],
  ['live', 'Live discovery'],
  ['saved', 'Saved'],
  ['candidates', 'Candidates'],
] as const;

const TRUST_OPTIONS = [
  ['all', 'All trust tiers'],
  ['verified', 'Verified'],
  ['registry', 'Registry'],
  ['directory', 'Directory'],
  ['lead', 'Lead'],
  ['saved', 'Saved'],
  ['live-not-stored', 'Live—not stored'],
] as const;

function currentSnapshot(): PhaseTwoMapSnapshot | null {
  const map = window.__occumedPhaseTwoMap;
  if (!map) return null;
  const bounds = map.getBounds();
  return {
    zoom: map.getZoom(),
    bounds: {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    },
  };
}

function validCoordinate(provider: ProviderFeature): provider is ProviderFeature & { lat: number; lng: number } {
  return Number.isFinite(provider.lat) && Number.isFinite(provider.lng);
}

function createProviderPopup(provider: ProviderFeature): HTMLElement {
  const root = document.createElement('div');
  root.className = 'p2-provider-popup';

  const name = document.createElement('strong');
  name.textContent = provider.name || 'Provider';
  root.appendChild(name);

  const location = document.createElement('span');
  location.textContent = [provider.address, provider.city, provider.admin_area, provider.country]
    .filter(Boolean)
    .join(', ') || 'Location unavailable';
  root.appendChild(location);

  const meta = document.createElement('span');
  meta.textContent = `${provider.source || 'Unknown source'} · ${provider.trust_tier || provider.source_kind || 'unrated'}`;
  root.appendChild(meta);

  if (provider.website) {
    const website = document.createElement('a');
    website.href = provider.website;
    website.target = '_blank';
    website.rel = 'noreferrer';
    website.textContent = 'Open website';
    root.appendChild(website);
  }
  return root;
}

function modeLabel(mode: PhaseTwoVisualization): string {
  if (mode === 'grid') return 'Geographic grid';
  if (mode === 'density') return 'Density';
  return 'Individual providers';
}

function viewportParams(
  snapshot: PhaseTwoMapSnapshot,
  filters: PhaseTwoLayerFilters,
  mode: string,
  page: number,
  limit: number,
): URLSearchParams {
  return buildViewportParams(snapshot.bounds, filters, mode, page, limit);
}

function retitleLegacyMapTools(): void {
  document.querySelectorAll<HTMLElement>('.occumed-map-tools-panel .occumed-basemap-title').forEach((node) => {
    node.textContent = 'Navigation & Routing';
    node.closest('.occumed-map-tools-panel')?.classList.add('p2-navigation-tools');
  });

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let current = walker.nextNode();
  while (current) {
    const element = current as HTMLElement;
    const text = element.children.length === 0 ? (element.textContent || '').trim() : '';
    if (/map tools/i.test(text) && /hover\s*\/\s*focus/i.test(text)) {
      element.textContent = 'Navigation & routing';
      element.classList.add('p2-repurposed-map-tools-label');
    }
    current = walker.nextNode();
  }
}

export default function PhaseTwoShell({ children }: PhaseTwoShellProps) {
  const [snapshot, setSnapshot] = useState<PhaseTwoMapSnapshot | null>(() => currentSnapshot());
  const [panelOpen, setPanelOpen] = useState(true);
  const [layersEnabled, setLayersEnabled] = useState(true);
  const [requestedMode, setRequestedMode] = useState<RequestedVisualization>('auto');
  const [filters, setFilters] = useState<PhaseTwoLayerFilters>(DEFAULT_FILTERS);
  const [providers, setProviders] = useState<ProviderFeature[]>([]);
  const [total, setTotal] = useState(0);
  const [listPage, setListPage] = useState(1);
  const [listHasMore, setListHasMore] = useState(false);
  const [status, setStatus] = useState('Waiting for the map…');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const overlayRef = useRef<L.LayerGroup | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const visualization = useMemo(
    () => effectiveVisualization(requestedMode, snapshot?.zoom ?? 4, filters.trustTier),
    [filters.trustTier, requestedMode, snapshot?.zoom],
  );

  const clearOverlay = useCallback(() => {
    const map = window.__occumedPhaseTwoMap;
    if (map && overlayRef.current) {
      try { map.removeLayer(overlayRef.current); } catch { /* map may be unloading */ }
    }
    overlayRef.current = null;
  }, []);

  const resetViewportResults = useCallback((nextStatus: string) => {
    clearOverlay();
    setProviders([]);
    setTotal(0);
    setListHasMore(false);
    setWarning('');
    setStatus(nextStatus);
  }, [clearOverlay]);

  const installOverlay = useCallback((layers: L.Layer[]) => {
    const map = window.__occumedPhaseTwoMap;
    if (!map) return;
    clearOverlay();
    overlayRef.current = L.layerGroup(layers).addTo(map);
  }, [clearOverlay]);

  const drawPins = useCallback((rows: ProviderFeature[]) => {
    const renderer = L.canvas({ padding: 0.5 });
    const layers = rows.filter(validCoordinate).map((provider) => {
      const color = sourceColor(provider.source, provider.source_kind);
      const marker = L.circleMarker([provider.lat, provider.lng], {
        renderer,
        radius: 4,
        weight: 1,
        color: '#f8fbff',
        opacity: 0.9,
        fillColor: color,
        fillOpacity: 0.9,
      });
      marker.bindTooltip(provider.name || 'Provider', { direction: 'top', opacity: 0.94 });
      marker.bindPopup(createProviderPopup(provider), { maxWidth: 300 });
      return marker;
    });
    installOverlay(layers);
  }, [installOverlay]);

  const drawDensity = useCallback((cells: Array<{ lat: number; lng: number; count: number }>) => {
    const renderer = L.canvas({ padding: 0.5 });
    const layers = cells
      .filter((cell) => Number.isFinite(cell.lat) && Number.isFinite(cell.lng) && cell.count > 0)
      .map((cell) => {
        const radius = Math.max(5, Math.min(32, 4 + Math.log2(cell.count + 1) * 3));
        const marker = L.circleMarker([cell.lat, cell.lng], {
          renderer,
          radius,
          weight: 0,
          fillColor: '#8b5cf6',
          fillOpacity: Math.max(0.12, Math.min(0.58, 0.13 + Math.log10(cell.count + 1) * 0.13)),
          interactive: true,
        });
        marker.bindTooltip(`${cell.count.toLocaleString()} providers`, { direction: 'top' });
        return marker;
      });
    installOverlay(layers);
  }, [installOverlay]);

  const drawGrid = useCallback((cells: Array<{ lat: number; lng: number; count: number }>, precision: number) => {
    const renderer = L.canvas({ padding: 0.5 });
    const maxCount = Math.max(1, ...cells.map((cell) => cell.count));
    const layers = cells
      .filter((cell) => Number.isFinite(cell.lat) && Number.isFinite(cell.lng) && cell.count > 0)
      .map((cell) => {
        const ratio = Math.log1p(cell.count) / Math.log1p(maxCount);
        const rectangle = L.rectangle(gridCellBounds(cell.lat, cell.lng, precision), {
          renderer,
          color: '#c4b5fd',
          weight: 0.6,
          opacity: 0.55,
          fillColor: '#7c3aed',
          fillOpacity: 0.08 + ratio * 0.46,
        });
        rectangle.bindTooltip(`${cell.count.toLocaleString()} providers in grid cell`, { direction: 'top' });
        return rectangle;
      });
    installOverlay(layers);
  }, [installOverlay]);

  const fetchAllPins = useCallback(async (
    current: PhaseTwoMapSnapshot,
    signal: AbortSignal,
  ): Promise<{ rows: ProviderFeature[]; warning: string }> => {
    const collected: ProviderFeature[] = [];
    const seen = new Set<string>();
    let page = 1;
    let hasMore = true;
    let lastWarning = '';

    while (hasMore) {
      const params = viewportParams(current, filters, 'pins', page, PIN_PAGE_SIZE);
      const response = await fetch(`/api/provider-explorer/map?${params.toString()}`, { signal });
      const data = await response.json() as ExplorerResponse;
      if (!response.ok || data.error) throw new Error(data.error || `Provider map request failed (${response.status})`);
      lastWarning = data.warning || lastWarning;
      const batch = data.providers || data.records || [];
      let added = 0;
      for (const provider of batch) {
        const id = String(provider.id || '');
        if (!id || seen.has(id)) continue;
        seen.add(id);
        collected.push(provider);
        added += 1;
      }
      hasMore = Boolean(data.hasMore);
      if (hasMore && added === 0) {
        lastWarning = lastWarning || 'Pagination stopped because the server returned no new provider IDs.';
        break;
      }
      page += 1;
    }

    return { rows: uniqueProviders(collected), warning: lastWarning };
  }, [filters]);

  const fetchRecordPage = useCallback(async (
    current: PhaseTwoMapSnapshot,
    signal: AbortSignal,
  ): Promise<ExplorerResponse> => {
    const params = viewportParams(current, filters, 'records', listPage, LIST_PAGE_SIZE);
    const response = await fetch(`/api/provider-explorer?${params.toString()}`, { signal });
    const data = await response.json() as ExplorerResponse;
    if (!response.ok || data.error) throw new Error(data.error || `Provider results request failed (${response.status})`);
    return data;
  }, [filters, listPage]);

  const refreshViewport = useCallback(async (current: PhaseTwoMapSnapshot) => {
    requestRef.current?.abort();
    requestRef.current = null;

    if (!layersEnabled) {
      setLoading(false);
      resetViewportResults('P2 provider layers are paused.');
      return;
    }
    if (!filters.includeStored && !filters.includeSaved && !filters.includeCandidates && !filters.includeLive) {
      setLoading(false);
      resetViewportResults('Enable at least one data layer.');
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setWarning('');
    setStatus(`Loading ${modeLabel(visualization).toLowerCase()} for the current viewport…`);

    try {
      if (visualization === 'pins') {
        const pinResult = await fetchAllPins(current, controller.signal);
        const trustedRows = pinResult.rows.filter((provider) => providerMatchesTrustTier(provider, filters.trustTier));
        drawPins(trustedRows);
        const start = (listPage - 1) * LIST_PAGE_SIZE;
        setProviders(trustedRows.slice(start, start + LIST_PAGE_SIZE));
        setTotal(trustedRows.length);
        setListHasMore(start + LIST_PAGE_SIZE < trustedRows.length);
        setWarning(pinResult.warning);
        setStatus(`${trustedRows.length.toLocaleString()} providers rendered in the current viewport.`);
        return;
      }

      const endpointMode = visualization === 'grid' ? 'hex' : 'density';
      const precision = visualization === 'grid'
        ? (current.zoom <= 7 ? 1 : current.zoom <= 10 ? 2 : 3)
        : (current.zoom <= 5 ? 1 : 2);
      const aggregateParams = viewportParams(current, filters, endpointMode, 1, 2000);
      aggregateParams.set('precision', String(precision));
      const [aggregateResponse, recordData] = await Promise.all([
        fetch(`/api/provider-explorer/${endpointMode}?${aggregateParams.toString()}`, { signal: controller.signal }),
        fetchRecordPage(current, controller.signal),
      ]);
      const aggregateData = await aggregateResponse.json() as ExplorerResponse;
      if (!aggregateResponse.ok || aggregateData.error) {
        throw new Error(aggregateData.error || `Provider ${endpointMode} request failed (${aggregateResponse.status})`);
      }
      const cells = Array.isArray(aggregateData.cells) ? aggregateData.cells : [];
      if (visualization === 'grid') drawGrid(cells, Number(aggregateData.precision ?? precision));
      else drawDensity(cells);

      const pageRows = (recordData.providers || recordData.records || [])
        .filter((provider) => providerMatchesTrustTier(provider, filters.trustTier));
      setProviders(pageRows);
      setTotal(Number(aggregateData.total || recordData.total || 0));
      setListHasMore(Boolean(recordData.hasMore));
      setWarning(aggregateData.warning || recordData.warning || '');
      setStatus(`${Number(aggregateData.total || 0).toLocaleString()} providers represented by ${cells.length.toLocaleString()} viewport cells.`);
    } catch (error) {
      if (controller.signal.aborted) return;
      resetViewportResults('P2 provider layer request failed.');
      setWarning(error instanceof Error ? error.message : 'Unknown provider layer error');
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  }, [drawDensity, drawGrid, drawPins, fetchAllPins, fetchRecordPage, filters, layersEnabled, listPage, resetViewportResults, visualization]);

  const toggleProviderIntelligence = useCallback(() => {
    const nextEnabled = !layersEnabled;
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setLayersEnabled(nextEnabled);

    if (!nextEnabled) {
      resetViewportResults('P2 provider layers are paused.');
      return;
    }

    setStatus(snapshot ? 'Starting provider intelligence for the current viewport…' : 'Waiting for the map…');
    setWarning('');
    setRefreshToken((token) => token + 1);
  }, [layersEnabled, resetViewportResults, snapshot]);

  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<PhaseTwoMapSnapshot>).detail;
      if (detail) setSnapshot(detail);
    };
    window.addEventListener('occumed:p2-map-ready', receive);
    window.addEventListener('occumed:p2-map-change', receive);
    const existing = currentSnapshot();
    if (existing) setSnapshot(existing);
    return () => {
      window.removeEventListener('occumed:p2-map-ready', receive);
      window.removeEventListener('occumed:p2-map-change', receive);
    };
  }, []);

  useEffect(() => {
    retitleLegacyMapTools();
    const observer = new MutationObserver(() => retitleLegacyMapTools());
    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer.disconnect(), 10_000);
    return () => {
      window.clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!snapshot) return;
    if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      void refreshViewport(snapshot);
    }, 320);
    return () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    };
  }, [refreshToken, refreshViewport, snapshot]);

  useEffect(() => () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    clearOverlay();
  }, [clearOverlay]);

  useEffect(() => {
    setListPage(1);
  }, [filters, requestedMode]);

  const updateFilter = <K extends keyof PhaseTwoLayerFilters>(key: K, value: PhaseTwoLayerFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const flyToProvider = (provider: ProviderFeature) => {
    if (!validCoordinate(provider)) return;
    const map = window.__occumedPhaseTwoMap;
    map?.flyTo([provider.lat, provider.lng], Math.max(map.getZoom(), 13), { duration: 0.6 });
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setRequestedMode('auto');
    setListPage(1);
  };

  const displayedMode = modeLabel(visualization);
  const listPageCount = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));

  return <div className="phase-two-shell">
    {children}

    <button
      type="button"
      className={`p2-console-launch${panelOpen ? ' active' : ''}`}
      onClick={() => setPanelOpen((open) => !open)}
      aria-label={panelOpen ? 'Close unified layer manager' : 'Open unified layer manager'}
    >
      <Layers3 size={17} />
      <span>Layers & Results</span>
    </button>

    {panelOpen && <aside className="p2-layer-console" aria-label="Unified Layer Manager and provider results">
      <header className="p2-console-header">
        <div>
          <span className="p2-eyebrow">PHASE 2 · GIS LAYER CONSOLE</span>
          <h2>Provider Explorer</h2>
          <p>One viewport-scoped layer manager, filter set, legend, and result list.</p>
        </div>
        <button type="button" className="p2-icon-button" onClick={() => setPanelOpen(false)} aria-label="Close layer console"><X size={17} /></button>
      </header>

      <section className="p2-console-section p2-layer-section">
        <div className="p2-section-heading"><Layers3 size={15} /><strong>Layer Manager</strong><span>{snapshot ? `Zoom ${snapshot.zoom}` : 'Map connecting'}</span></div>
        <button
          type="button"
          className={`p2-master-toggle${layersEnabled ? ' enabled' : ' paused'}`}
          aria-pressed={layersEnabled}
          onClick={toggleProviderIntelligence}
        >
          <span className="p2-master-toggle-copy"><strong>Provider intelligence</strong><small>{layersEnabled ? `${displayedMode} enabled` : 'Paused'}</small></span>
          <span className="p2-master-toggle-action">{loading && layersEnabled ? 'Loading…' : layersEnabled ? 'Pause' : 'Start'}</span>
        </button>
        <div className="p2-toggle-grid">
          <label><input type="checkbox" checked={filters.includeStored} onChange={(event) => updateFilter('includeStored', event.target.checked)} /><span className="p2-dot stored" />Stored</label>
          <label><input type="checkbox" checked={filters.includeSaved} onChange={(event) => updateFilter('includeSaved', event.target.checked)} /><span className="p2-dot saved" />My Clinics</label>
          <label><input type="checkbox" checked={filters.includeCandidates} onChange={(event) => updateFilter('includeCandidates', event.target.checked)} /><span className="p2-dot candidate" />Candidates</label>
          <label><input type="checkbox" checked={filters.includeLive} onChange={(event) => updateFilter('includeLive', event.target.checked)} /><span className="p2-dot live" />Live</label>
        </div>
        <div className="p2-mode-row" role="group" aria-label="Map visualization">
          {(['auto', 'density', 'grid', 'pins'] as RequestedVisualization[]).map((mode) => <button
            type="button"
            key={mode}
            className={requestedMode === mode ? 'active' : ''}
            onClick={() => setRequestedMode(mode)}
          >{mode === 'auto' ? 'Auto by zoom' : mode === 'grid' ? 'Grid' : mode === 'pins' ? 'Providers' : 'Density'}</button>)}
        </div>
        {filters.trustTier !== 'all' && <div className="p2-inline-note">Trust filters use individual provider mode so no aggregate cell hides record-level trust.</div>}
      </section>

      <section className="p2-console-section p2-filter-section">
        <div className="p2-section-heading"><ListFilter size={15} /><strong>Filters</strong><button type="button" onClick={resetFilters}>Reset</button></div>
        <div className="p2-search-field"><Search size={15} /><input value={filters.query} onChange={(event) => updateFilter('query', event.target.value)} placeholder="Provider, service, or city" /></div>
        <div className="p2-filter-grid">
          <label><span>Source</span><select value={filters.source} onChange={(event) => updateFilter('source', event.target.value)}>{SOURCE_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label><span>Trust</span><select value={filters.trustTier} onChange={(event) => updateFilter('trustTier', event.target.value)}>{TRUST_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label><span>Service</span><input value={filters.service} onChange={(event) => updateFilter('service', event.target.value)} placeholder="e.g. dental" /></label>
          <label><span>Country</span><input value={filters.country} onChange={(event) => updateFilter('country', event.target.value)} placeholder="US, CA, DE…" /></label>
          <label><span>Region</span><input value={filters.adminArea} onChange={(event) => updateFilter('adminArea', event.target.value)} placeholder="State / province" /></label>
          <label><span>City</span><input value={filters.city} onChange={(event) => updateFilter('city', event.target.value)} placeholder="City" /></label>
        </div>
      </section>

      <section className="p2-console-section p2-results-section">
        <div className="p2-section-heading">
          <LocateFixed size={15} />
          <strong>Viewport Results</strong>
          <button type="button" onClick={() => setRefreshToken((token) => token + 1)} disabled={loading && layersEnabled} aria-label="Refresh viewport results"><RefreshCw size={14} className={loading && layersEnabled ? 'spin' : ''} /></button>
        </div>
        <div className="p2-result-summary">
          <strong>{total.toLocaleString()}</strong>
          <span>{displayedMode} · current map viewport</span>
        </div>
        <div className={`p2-status${warning ? ' warning' : ''}`} aria-live="polite"><span>{status}</span>{warning && <small>{warning}</small>}</div>
        <div className="p2-results-list">
          {!loading && providers.length === 0 && <div className="p2-empty">No matching providers in this viewport.</div>}
          {providers.map((provider) => <button type="button" className="p2-result-card" key={provider.id} onClick={() => flyToProvider(provider)}>
            <span className="p2-result-source" style={{ backgroundColor: sourceColor(provider.source, provider.source_kind) }} />
            <span className="p2-result-copy">
              <strong>{provider.name || 'Unnamed provider'}</strong>
              <small>{[provider.city, provider.admin_area, provider.country].filter(Boolean).join(', ') || provider.address || 'Location unavailable'}</small>
              <em>{provider.source || provider.source_kind} · {provider.trust_tier || 'unrated'}</em>
            </span>
          </button>)}
        </div>
        <footer className="p2-results-footer">
          <button type="button" disabled={listPage <= 1 || loading} onClick={() => setListPage((page) => Math.max(1, page - 1))}><ChevronLeft size={14} />Previous</button>
          <span>Page {listPage} of {listPageCount}</span>
          <button type="button" disabled={!listHasMore || loading} onClick={() => setListPage((page) => page + 1)}>Next<ChevronRight size={14} /></button>
        </footer>
      </section>
    </aside>}

    <div className="p2-visible-legend" aria-label="Provider layer legend">
      <strong>{displayedMode}</strong>
      <span><i className="stored" />Stored / indexed</span>
      <span><i className="dentist" />Dentists</span>
      <span><i className="saved" />My Clinics</span>
      <span><i className="live" />Live</span>
      <span><i className="candidate" />Candidates</span>
      {visualization === 'grid' && <small>Grid cells are coordinate bins—not hexagons.</small>}
    </div>
  </div>;
}

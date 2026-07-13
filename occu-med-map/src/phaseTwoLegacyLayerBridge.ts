const P2_REQUEST_MARKER = 'p2';
const P2_REQUEST_VALUE = '1';
const LEGACY_PROVIDER_LABELS = [
  'Indexed Providers',
  'BlueHive Providers',
  'Dental Examiner Presence',
  'My Clinics',
  'Upload Preview',
  'Luminous Density',
];

type P2SourceKind = 'stored' | 'saved' | 'candidate' | 'live';

type P2ExplorerPayload = {
  providers?: Array<Record<string, unknown>>;
  records?: Array<Record<string, unknown>>;
  total?: number;
  count?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
  warning?: string;
  error?: string;
  [key: string]: unknown;
};

let fetchInstalled = false;

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (input instanceof Request) return input.method.toUpperCase();
  return 'GET';
}

function requestUrl(input: RequestInfo | URL): URL | null {
  try {
    const raw = input instanceof Request ? input.url : String(input);
    return new URL(raw, window.location.origin);
  } catch {
    return null;
  }
}

function emptyExplorerPayload(url: URL): Record<string, unknown> {
  const pathname = url.pathname;
  if (pathname.endsWith('/status')) {
    return {
      persistenceConfigured: true,
      schema: 'superseded-by-p2-layer-console',
      spatialEngine: 'viewport-console',
      candidatePersistence: true,
      savedPersistence: true,
      liveAdapters: [],
    };
  }
  if (pathname.endsWith('/density') || pathname.endsWith('/hex') || pathname.endsWith('/grid')) {
    return { mode: pathname.split('/').pop(), total: 0, count: 0, cells: [], precision: 1 };
  }
  return {
    mode: url.searchParams.get('mode') || 'records',
    providers: [],
    records: [],
    facets: [],
    total: 0,
    count: 0,
    page: 1,
    limit: 0,
    hasMore: false,
    status: { supersededBy: 'p2-layer-console' },
  };
}

function enabledKinds(url: URL): P2SourceKind[] {
  const explicitKind = url.searchParams.get('source_kind');
  if (explicitKind && ['stored', 'saved', 'candidate', 'live'].includes(explicitKind)) {
    return [explicitKind as P2SourceKind];
  }

  const source = url.searchParams.get('source') || 'all';
  if (source === 'live') return ['live'];
  if (source === 'saved' || source === 'my-clinics') return ['saved'];
  if (source === 'candidates') return ['candidate'];
  if (source !== 'all') return ['stored'];

  const result: P2SourceKind[] = [];
  if (url.searchParams.get('includeStored') !== 'false') result.push('stored');
  if (url.searchParams.get('includeSaved') !== 'false') result.push('saved');
  if (url.searchParams.get('includeCandidates') === 'true') result.push('candidate');
  if (url.searchParams.get('includeLive') === 'true') result.push('live');
  return result;
}

function urlForKind(url: URL, kind: P2SourceKind): URL {
  const next = new URL(url.toString());
  next.searchParams.set('source_kind', kind);
  next.searchParams.set('includeStored', String(kind === 'stored'));
  next.searchParams.set('includeSaved', String(kind === 'saved'));
  next.searchParams.set('includeCandidates', String(kind === 'candidate'));
  next.searchParams.set('includeLive', String(kind === 'live'));

  if (kind === 'saved') next.searchParams.set('source', 'saved');
  else if (kind === 'candidate') next.searchParams.set('source', 'candidates');
  else if (kind === 'live') next.searchParams.set('source', 'live');
  else if (next.searchParams.get('source') === 'all') next.searchParams.delete('source');
  return next;
}

function uniqueRows(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const seen = new Set<string>();
  const result: Array<Record<string, unknown>> = [];
  for (const row of rows) {
    const key = String(row.id || `${row.source || ''}|${row.name || ''}|${row.lat || ''}|${row.lng || ''}`);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }
  return result;
}

async function splitP2PinRequest(
  originalFetch: typeof window.fetch,
  url: URL,
  init?: RequestInit,
): Promise<Response> {
  const kinds = enabledKinds(url);
  if (kinds.length <= 1) return originalFetch(url.toString(), init);

  const responses = await Promise.all(kinds.map(async (kind) => {
    const response = await originalFetch(urlForKind(url, kind).toString(), init);
    const payload = await response.json().catch(() => ({})) as P2ExplorerPayload;
    return { kind, response, payload };
  }));

  const failed = responses.find(({ response, payload }) => !response.ok || payload.error);
  if (failed) {
    return new Response(JSON.stringify(failed.payload), {
      status: failed.response.status,
      headers: { 'content-type': 'application/json' },
    });
  }

  const providers = uniqueRows(responses.flatMap(({ payload }) => payload.providers || payload.records || []));
  const total = responses.reduce((sum, { payload }) => sum + Number(payload.total || 0), 0);
  const warnings = responses.map(({ payload }) => payload.warning).filter(Boolean);
  const page = Number(url.searchParams.get('page') || 1);
  const limit = Number(url.searchParams.get('limit') || 5000);
  const hasMore = responses.some(({ payload }) => Boolean(payload.hasMore));

  return new Response(JSON.stringify({
    mode: 'pins',
    providers,
    records: providers,
    total,
    count: providers.length,
    page,
    limit,
    hasMore,
    warning: warnings.join(' · ') || undefined,
    sourceKinds: kinds,
    visibleCapped: false,
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function installFetchGuard(): void {
  if (fetchInstalled) return;
  fetchInstalled = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = requestUrl(input);
    const method = requestMethod(input, init);
    const isProviderExplorerRead = method === 'GET' && url?.pathname.startsWith('/api/provider-explorer');

    if (url && isProviderExplorerRead && url.searchParams.get(P2_REQUEST_MARKER) !== P2_REQUEST_VALUE) {
      return new Response(JSON.stringify(emptyExplorerPayload(url)), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (url && isProviderExplorerRead
      && url.searchParams.get(P2_REQUEST_MARKER) === P2_REQUEST_VALUE
      && url.pathname.endsWith('/map')) {
      return splitP2PinRequest(originalFetch, url, init);
    }

    return originalFetch(input, init);
  };
}

function hide(node: HTMLElement | null): void {
  if (!node || node.dataset.p2Retired === 'true') return;
  node.dataset.p2Retired = 'true';
  node.hidden = true;
  node.setAttribute('aria-hidden', 'true');
  node.classList.add('p2-legacy-provider-controls');
}

function forceIndividualModeForDynamicSources(): void {
  const dynamicToggleEnabled = Array.from(document.querySelectorAll<HTMLLabelElement>('.p2-toggle-grid label')).some((label) => {
    const text = (label.textContent || '').trim();
    const input = label.querySelector<HTMLInputElement>('input[type="checkbox"]');
    return Boolean(input?.checked && (text.includes('Candidates') || text.includes('Live')));
  });
  const sourceSelect = Array.from(document.querySelectorAll<HTMLLabelElement>('.p2-filter-grid label'))
    .find((label) => (label.querySelector('span')?.textContent || '').trim() === 'Source')
    ?.querySelector<HTMLSelectElement>('select');
  const dynamicSourceSelected = sourceSelect?.value === 'live' || sourceSelect?.value === 'candidates';
  if (!dynamicToggleEnabled && !dynamicSourceSelected) return;

  const providerMode = Array.from(document.querySelectorAll<HTMLButtonElement>('.p2-mode-row button'))
    .find((button) => (button.textContent || '').trim() === 'Providers');
  if (providerMode && !providerMode.classList.contains('active')) providerMode.click();
}

function retireLegacyProviderControls(): void {
  for (const label of LEGACY_PROVIDER_LABELS) {
    const input = document.querySelector<HTMLInputElement>(`input[type="checkbox"][aria-label="${label}"]`);
    if (input?.checked && !input.disabled) input.click();
  }

  document.querySelectorAll<HTMLElement>('.command-section-title').forEach((heading) => {
    if ((heading.textContent || '').includes('Provider Layers')) {
      hide(heading.closest<HTMLElement>('.command-section'));
    }
  });

  document.querySelectorAll<HTMLButtonElement>('.command-action, .provider-explorer-launch').forEach((button) => {
    if ((button.textContent || '').includes('Provider Explorer')) hide(button);
  });

  document.querySelectorAll<HTMLElement>('.provider-explorer-drawer, .provider-drawer-backdrop').forEach(hide);
  forceIndividualModeForDynamicSources();
}

export function installPhaseTwoLegacyLayerBridge(): void {
  installFetchGuard();

  const run = () => retireLegacyProviderControls();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else window.setTimeout(run, 0);

  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['checked', 'disabled', 'class', 'value'],
    childList: true,
    subtree: true,
  });
  window.setTimeout(() => observer.disconnect(), 30_000);
}

installPhaseTwoLegacyLayerBridge();

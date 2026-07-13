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

function installFetchGuard(): void {
  if (fetchInstalled) return;
  fetchInstalled = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = requestUrl(input);
    const method = requestMethod(input, init);
    const isLegacyExplorerRead = method === 'GET'
      && url?.pathname.startsWith('/api/provider-explorer')
      && url.searchParams.get(P2_REQUEST_MARKER) !== P2_REQUEST_VALUE;

    if (url && isLegacyExplorerRead) {
      return new Response(JSON.stringify(emptyExplorerPayload(url)), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return originalFetch(input, init);
  };
}

function hide(node: HTMLElement | null): void {
  if (!node) return;
  node.hidden = true;
  node.setAttribute('aria-hidden', 'true');
  node.classList.add('p2-legacy-provider-controls');
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
}

export function installPhaseTwoLegacyLayerBridge(): void {
  installFetchGuard();

  const run = () => retireLegacyProviderControls();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else window.setTimeout(run, 0);

  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['checked', 'disabled', 'class'],
    childList: true,
    subtree: true,
  });
  window.setTimeout(() => observer.disconnect(), 30_000);
}

installPhaseTwoLegacyLayerBridge();

const P2_PREVIEW_PARAM = 'p2-preview';

export function isPhaseTwoPreview(): boolean {
  return new URLSearchParams(window.location.search).get(P2_PREVIEW_PARAM) === '1';
}

export function installPhaseTwoPreviewIsolation(): void {
  if (!isPhaseTwoPreview()) return;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const raw = input instanceof Request ? input.url : String(input);
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    let url: URL;
    try {
      url = new URL(raw, window.location.origin);
    } catch {
      return originalFetch(input, init);
    }

    const sameOrigin = url.origin === window.location.origin;
    const legacyProviderRead = sameOrigin && method === 'GET' && url.pathname.startsWith('/api/provider-layers/');
    const legacyExplorerRead = sameOrigin
      && method === 'GET'
      && url.pathname.startsWith('/api/provider-explorer')
      && url.searchParams.get('p2') !== '1';

    if (legacyProviderRead || legacyExplorerRead) {
      return new Response(JSON.stringify({
        providers: [],
        records: [],
        data: [],
        cells: [],
        total: 0,
        count: 0,
        page: 1,
        limit: 0,
        hasMore: false,
        visibleCapped: false,
        previewIsolation: true,
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    return originalFetch(input, init);
  };
}

installPhaseTwoPreviewIsolation();

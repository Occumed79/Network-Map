const P2_PREVIEW_PARAM = 'p2-preview';

export function isPhaseTwoPreview(): boolean {
  return new URLSearchParams(window.location.search).get(P2_PREVIEW_PARAM) === '1';
}

/**
 * PhaseTwoShell still contains an old cosmetic MutationObserver that scans the
 * entire document and then mutates nodes from inside its own callback. That
 * creates a self-feeding DOM loop in Chromium and freezes the preview before
 * the map can finish painting. Production does not mount the shell, so this
 * guard is intentionally preview-only until that cosmetic code is removed
 * during the in-App Phase 2 integration.
 */
function disablePreviewMutationObservers(): void {
  class PreviewNoopMutationObserver implements MutationObserver {
    constructor(_callback: MutationCallback) {}
    disconnect(): void {}
    observe(_target: Node, _options?: MutationObserverInit): void {}
    takeRecords(): MutationRecord[] { return []; }
  }

  (window as Window & { MutationObserver: typeof MutationObserver }).MutationObserver = PreviewNoopMutationObserver;
}

export function installPhaseTwoPreviewIsolation(): void {
  if (!isPhaseTwoPreview()) return;

  disablePreviewMutationObservers();

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

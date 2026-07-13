const TOKEN_STORAGE_KEY = "network-map-admin-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const PROTECTED_PREFIXES = [
  "/api/my-clinics",
  "/api/provider-explorer",
  "/api/indexing",
  "/api/provider-sources/import",
  "/api/vector-index",
  "/api/browser-extraction",
  "/api/google-places",
];

function requestUrl(input: RequestInfo | URL): URL | null {
  try {
    if (input instanceof Request) return new URL(input.url, window.location.origin);
    return new URL(input.toString(), window.location.origin);
  } catch {
    return null;
  }
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  return String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
}

function isProtected(url: URL | null, method: string): boolean {
  if (!url || url.origin !== window.location.origin || SAFE_METHODS.has(method)) return false;
  return PROTECTED_PREFIXES.some((prefix) =>
    url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
  );
}

function askForToken(): string {
  const existing = window.localStorage.getItem(TOKEN_STORAGE_KEY)?.trim() || "";
  if (existing) return existing;
  const supplied = window.prompt("Enter the Network Map admin token to complete this write operation:")?.trim() || "";
  if (supplied) window.localStorage.setItem(TOKEN_STORAGE_KEY, supplied);
  return supplied;
}

function withToken(init: RequestInit | undefined, token: string): RequestInit {
  const headers = new Headers(init?.headers || undefined);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
}

const nativeFetch = window.fetch.bind(window);

window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = requestUrl(input);
  const method = requestMethod(input, init);
  if (!isProtected(url, method)) return nativeFetch(input, init);

  let token = askForToken();
  let response = await nativeFetch(input, withToken(init, token));

  if ((response.status === 401 || response.status === 403) && token) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    token = askForToken();
    if (token) response = await nativeFetch(input, withToken(init, token));
  }

  return response;
}) as typeof window.fetch;

export {};

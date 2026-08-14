import { registerNetworkRequestMiddleware } from "./networkRequestPipelineRuntime";

const TOKEN_STORAGE_KEY = "network-map-admin-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const PROTECTED_PREFIXES = [
  "/api/provider-explorer",
  "/api/indexing",
  "/api/provider-sources/import",
  "/api/vector-index",
  "/api/browser-extraction",
  "/api/google-places",
];

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

registerNetworkRequestMiddleware("admin-auth", async (context, next) => {
  if (!isProtected(context.url, context.method)) return next();

  let token = askForToken();
  let response = await next({ init: withToken(context.init, token) });

  if ((response.status === 401 || response.status === 403) && token) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    token = askForToken();
    if (token) response = await next({ init: withToken(context.init, token) });
  }

  return response;
}, 100);

export {};

import { registerRuntimeOwner } from "./runtimeControllerRegistry";

export type NetworkRequestContext = {
  input: RequestInfo | URL;
  init?: RequestInit;
  url: URL | null;
  method: string;
};

export type NetworkRequestNext = (
  override?: Partial<Pick<NetworkRequestContext, "input" | "init">>,
) => Promise<Response>;

export type NetworkRequestMiddleware = (
  context: NetworkRequestContext,
  next: NetworkRequestNext,
) => Promise<Response>;

type MiddlewareRegistration = {
  id: string;
  priority: number;
  middleware: NetworkRequestMiddleware;
};

type PipelineStats = {
  requests: number;
  failures: number;
  active: number;
  middleware: Array<{ id: string; priority: number }>;
};

declare global {
  interface Window {
    __NETWORK_MAP_REQUEST_PIPELINE__?: {
      register: typeof registerNetworkRequestMiddleware;
      getStats: () => PipelineStats;
    };
  }
}

const registrations: MiddlewareRegistration[] = [];
const nativeFetch = window.fetch.bind(window);
let requestCount = 0;
let failureCount = 0;
let activeCount = 0;

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

function contextFor(input: RequestInfo | URL, init?: RequestInit): NetworkRequestContext {
  return {
    input,
    init,
    url: requestUrl(input),
    method: requestMethod(input, init),
  };
}

function mergeContext(
  previous: NetworkRequestContext,
  override?: Partial<Pick<NetworkRequestContext, "input" | "init">>,
): NetworkRequestContext {
  if (!override) return previous;
  const input = override.input ?? previous.input;
  const init = override.init ?? previous.init;
  return contextFor(input, init);
}

async function dispatch(index: number, context: NetworkRequestContext): Promise<Response> {
  const registration = registrations[index];
  if (!registration) return nativeFetch(context.input, context.init);
  return registration.middleware(
    context,
    (override) => dispatch(index + 1, mergeContext(context, override)),
  );
}

export function registerNetworkRequestMiddleware(
  id: string,
  middleware: NetworkRequestMiddleware,
  priority = 0,
): () => void {
  const normalizedId = id.trim();
  if (!normalizedId) throw new Error("Network request middleware requires a stable id");
  if (registrations.some((item) => item.id === normalizedId)) {
    throw new Error(`Network request middleware is already registered: ${normalizedId}`);
  }
  registrations.push({ id: normalizedId, priority, middleware });
  registrations.sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));

  return () => {
    const index = registrations.findIndex((item) => item.id === normalizedId && item.middleware === middleware);
    if (index >= 0) registrations.splice(index, 1);
  };
}

function installPipeline(): void {
  if (!registerRuntimeOwner("network-request-pipeline", "Authoritative browser network request middleware pipeline")) return;

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requestCount += 1;
    activeCount += 1;
    try {
      return await dispatch(0, contextFor(input, init));
    } catch (error) {
      failureCount += 1;
      throw error;
    } finally {
      activeCount = Math.max(0, activeCount - 1);
    }
  }) as typeof window.fetch;

  window.__NETWORK_MAP_REQUEST_PIPELINE__ = {
    register: registerNetworkRequestMiddleware,
    getStats: () => ({
      requests: requestCount,
      failures: failureCount,
      active: activeCount,
      middleware: registrations.map(({ id, priority }) => ({ id, priority })),
    }),
  };
}

installPipeline();

export {};

import { registerNetworkRequestMiddleware } from "./networkRequestPipelineRuntime";

const REQUEST_TIMEOUT_MS = 25_000;
type RequestChannel = "aggregate" | "pins" | "live" | "compare";
type ActiveRequest = {
  id: number;
  channel: RequestChannel;
  url: string;
  controller: AbortController;
  timeoutId: number;
  completed: boolean;
};

type RuntimeSnapshot = {
  requestId: number;
  requestActive: boolean;
  lastCompletedRequestId: number;
};

declare global {
  interface Window {
    __OCCUMED_PROVIDER_EXPLORER_STABILITY__?: RuntimeSnapshot;
  }
}

const runtime: RuntimeSnapshot = window.__OCCUMED_PROVIDER_EXPLORER_STABILITY__ || {
  requestId: 0,
  requestActive: false,
  lastCompletedRequestId: 0,
};
window.__OCCUMED_PROVIDER_EXPLORER_STABILITY__ = runtime;

const active = new Map<RequestChannel, ActiveRequest>();
let sequence = 0;

function channelFor(input: RequestInfo | URL): RequestChannel | null {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  try {
    const pathname = new URL(raw, window.location.href).pathname;
    if (pathname.endsWith("/api/provider-explorer/density") || pathname.endsWith("/api/provider-explorer/hex")) return "aggregate";
    if (pathname.endsWith("/api/provider-explorer/map")) return "pins";
    if (pathname.endsWith("/api/provider-explorer/live")) return "live";
    if (pathname.endsWith("/api/provider-explorer/compare")) return "compare";
  } catch {}
  return null;
}

function requestUrl(input: RequestInfo | URL): string {
  return typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
}

function abortError(message: string): DOMException {
  return new DOMException(message, "AbortError");
}

function finish(record: ActiveRequest): void {
  if (record.completed) return;
  record.completed = true;
  window.clearTimeout(record.timeoutId);
  if (active.get(record.channel)?.id === record.id) active.delete(record.channel);
  if (runtime.requestId === record.id) {
    runtime.requestActive = false;
    runtime.lastCompletedRequestId = record.id;
  }
}

registerNetworkRequestMiddleware("provider-explorer-request-stability", async (context, next) => {
  const channel = channelFor(context.input);
  if (!channel) return next();

  const previous = active.get(channel);
  if (previous && !previous.completed) {
    previous.controller.abort(abortError(`Superseded by a newer Provider Explorer ${channel} request.`));
    finish(previous);
  }

  const id = ++sequence;
  const controller = new AbortController();
  const record: ActiveRequest = {
    id,
    channel,
    url: requestUrl(context.input),
    controller,
    timeoutId: 0,
    completed: false,
  };
  record.timeoutId = window.setTimeout(() => {
    if (record.completed) return;
    controller.abort(new DOMException(`Provider Explorer request timed out after 25 seconds: ${record.url}`, "TimeoutError"));
    finish(record);
  }, REQUEST_TIMEOUT_MS);
  active.set(channel, record);
  runtime.requestId = id;
  runtime.requestActive = true;

  try {
    const response = await next({ init: { ...context.init, signal: controller.signal } });
    if (active.get(channel)?.id !== id) throw abortError(`Ignored stale Provider Explorer ${channel} response.`);
    if (!response.ok) throw new Error(`Provider Explorer ${channel} request failed with HTTP ${response.status}.`);

    const originalJson = response.json.bind(response);
    const wrapped = new Proxy(response, {
      get(target, property) {
        if (property === "json") {
          return async () => {
            const payload = await originalJson();
            if (active.get(channel)?.id !== id) throw abortError(`Ignored stale Provider Explorer ${channel} response.`);
            finish(record);
            return payload;
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    return wrapped;
  } catch (error) {
    finish(record);
    throw error;
  }
}, 200);

export {};

type SourcePolicy = {
  timeoutMs: number;
  maxAttempts: number;
  concurrency: number;
  circuitFailureThreshold: number;
  circuitCooldownMs: number;
  cacheTtlMs: number;
};

type SourceHealth = {
  sourceId: string;
  state: "closed" | "open" | "half_open";
  inFlight: number;
  queued: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  cancellationCount: number;
  retryCount: number;
  consecutiveFailures: number;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastError?: string;
  lastLatencyMs?: number;
  circuitOpenedAt?: string;
  circuitOpenUntil?: string;
};

type CacheEntry<T> = { expiresAt: number; value: T };
type SourceState = {
  policy: SourcePolicy;
  health: SourceHealth;
  queue: Array<() => void>;
  cache: Map<string, CacheEntry<unknown>>;
};

export class ExternalSourceError extends Error {
  constructor(
    message: string,
    public readonly sourceId: string,
    public readonly code: "timeout" | "cancelled" | "circuit_open" | "http_error" | "network_error" | "malformed_response",
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ExternalSourceError";
  }
}

const DEFAULT_POLICY: SourcePolicy = {
  timeoutMs: 8_000,
  maxAttempts: 2,
  concurrency: 4,
  circuitFailureThreshold: 3,
  circuitCooldownMs: 60_000,
  cacheTtlMs: 60_000,
};

const POLICIES: Record<string, Partial<SourcePolicy>> = {
  npi: { timeoutMs: 10_000, maxAttempts: 2, concurrency: 4, circuitFailureThreshold: 4, circuitCooldownMs: 45_000, cacheTtlMs: 10 * 60_000 },
  overpass: { timeoutMs: 9_000, maxAttempts: 2, concurrency: 3, circuitFailureThreshold: 3, circuitCooldownMs: 60_000, cacheTtlMs: 2 * 60_000 },
  geocodio: { timeoutMs: 7_000, maxAttempts: 2, concurrency: 3, circuitFailureThreshold: 3, circuitCooldownMs: 60_000, cacheTtlMs: 24 * 60 * 60_000 },
  nominatim: { timeoutMs: 7_000, maxAttempts: 1, concurrency: 1, circuitFailureThreshold: 3, circuitCooldownMs: 90_000, cacheTtlMs: 24 * 60 * 60_000 },
  rapidapi: { timeoutMs: 8_000, maxAttempts: 2, concurrency: 3, circuitFailureThreshold: 3, circuitCooldownMs: 60_000, cacheTtlMs: 5 * 60_000 },
  webevidence: { timeoutMs: 12_000, maxAttempts: 2, concurrency: 2, circuitFailureThreshold: 3, circuitCooldownMs: 90_000, cacheTtlMs: 10 * 60_000 },
};

const states = new Map<string, SourceState>();
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function stateFor(sourceId: string): SourceState {
  let state = states.get(sourceId);
  if (state) return state;
  const policy = { ...DEFAULT_POLICY, ...(POLICIES[sourceId] || {}) };
  state = {
    policy,
    queue: [],
    cache: new Map(),
    health: {
      sourceId,
      state: "closed",
      inFlight: 0,
      queued: 0,
      successCount: 0,
      failureCount: 0,
      timeoutCount: 0,
      cancellationCount: 0,
      retryCount: 0,
      consecutiveFailures: 0,
    },
  };
  states.set(sourceId, state);
  return state;
}

function circuitAllows(state: SourceState): boolean {
  const until = state.health.circuitOpenUntil ? Date.parse(state.health.circuitOpenUntil) : 0;
  if (state.health.state === "open" && Date.now() < until) return false;
  if (state.health.state === "open" && Date.now() >= until) state.health.state = "half_open";
  return true;
}

function openCircuit(state: SourceState) {
  const now = Date.now();
  state.health.state = "open";
  state.health.circuitOpenedAt = new Date(now).toISOString();
  state.health.circuitOpenUntil = new Date(now + state.policy.circuitCooldownMs).toISOString();
}

function markSuccess(state: SourceState, latencyMs: number) {
  state.health.successCount += 1;
  state.health.consecutiveFailures = 0;
  state.health.state = "closed";
  state.health.circuitOpenedAt = undefined;
  state.health.circuitOpenUntil = undefined;
  state.health.lastSuccessAt = new Date().toISOString();
  state.health.lastLatencyMs = latencyMs;
  state.health.lastError = undefined;
}

function markFailure(state: SourceState, error: ExternalSourceError, latencyMs: number) {
  state.health.failureCount += 1;
  state.health.consecutiveFailures += 1;
  state.health.lastFailureAt = new Date().toISOString();
  state.health.lastLatencyMs = latencyMs;
  state.health.lastError = `${error.code}: ${error.message}`;
  if (error.code === "timeout") state.health.timeoutCount += 1;
  if (error.code === "cancelled") state.health.cancellationCount += 1;
  if (error.code !== "cancelled" && state.health.consecutiveFailures >= state.policy.circuitFailureThreshold) openCircuit(state);
}

async function acquire(state: SourceState, signal?: AbortSignal): Promise<() => void> {
  if (state.health.inFlight < state.policy.concurrency) {
    state.health.inFlight += 1;
    return () => release(state);
  }
  return new Promise<() => void>((resolve, reject) => {
    const enter = () => {
      signal?.removeEventListener("abort", abort);
      state.health.queued = Math.max(0, state.health.queued - 1);
      state.health.inFlight += 1;
      resolve(() => release(state));
    };
    const abort = () => {
      const index = state.queue.indexOf(enter);
      if (index >= 0) state.queue.splice(index, 1);
      state.health.queued = Math.max(0, state.health.queued - 1);
      reject(new ExternalSourceError("Source request cancelled while queued", state.health.sourceId, "cancelled"));
    };
    state.queue.push(enter);
    state.health.queued += 1;
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function release(state: SourceState) {
  state.health.inFlight = Math.max(0, state.health.inFlight - 1);
  const next = state.queue.shift();
  if (next) queueMicrotask(next);
}

function linkedSignal(parent: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new ExternalSourceError(`Source timeout after ${timeoutMs}ms`, "external", "timeout")), timeoutMs);
  const onAbort = () => controller.abort(parent?.reason || new DOMException("Cancelled", "AbortError"));
  if (parent?.aborted) onAbort(); else parent?.addEventListener("abort", onAbort, { once: true });
  return {
    signal: controller.signal,
    cleanup() { clearTimeout(timeout); parent?.removeEventListener("abort", onAbort); },
  };
}

function cacheKey(url: string, init?: RequestInit): string {
  const body = typeof init?.body === "string" ? init.body : "";
  return `${init?.method || "GET"}:${url}:${body}`;
}

function transientDelay(attempt: number, retryAfter: string | null): number {
  const retrySeconds = Number(retryAfter);
  if (Number.isFinite(retrySeconds) && retrySeconds > 0) return Math.min(retrySeconds * 1000, 5_000);
  return Math.min(250 * 2 ** Math.max(0, attempt - 1), 2_000);
}

function sourceError(sourceId: string, error: unknown, timedOut: boolean): ExternalSourceError {
  if (error instanceof ExternalSourceError) return error;
  if (timedOut) return new ExternalSourceError("Source request timed out", sourceId, "timeout");
  if (error instanceof DOMException && error.name === "AbortError") return new ExternalSourceError("Source request cancelled", sourceId, "cancelled");
  return new ExternalSourceError(error instanceof Error ? error.message : String(error), sourceId, "network_error");
}

export async function fetchExternalJson<T>(
  sourceId: string,
  url: string,
  init: RequestInit = {},
  options: { signal?: AbortSignal; cache?: boolean; validate?: (value: unknown) => value is T } = {},
): Promise<T> {
  const state = stateFor(sourceId);
  if (!circuitAllows(state)) throw new ExternalSourceError(`Circuit is open until ${state.health.circuitOpenUntil}`, sourceId, "circuit_open");
  const key = cacheKey(url, init);
  if (options.cache !== false) {
    const cached = state.cache.get(key) as CacheEntry<T> | undefined;
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (cached) state.cache.delete(key);
  }

  const releaseSlot = await acquire(state, options.signal);
  const startedAt = Date.now();
  let lastError: ExternalSourceError | null = null;
  try {
    for (let attempt = 1; attempt <= state.policy.maxAttempts; attempt += 1) {
      if (options.signal?.aborted) throw new ExternalSourceError("Source request cancelled", sourceId, "cancelled");
      const linked = linkedSignal(options.signal, state.policy.timeoutMs);
      try {
        const response = await fetch(url, { ...init, signal: linked.signal });
        if (!response.ok) {
          const error = new ExternalSourceError(`HTTP ${response.status}`, sourceId, "http_error", response.status);
          if (attempt < state.policy.maxAttempts && RETRYABLE_STATUS.has(response.status)) {
            state.health.retryCount += 1;
            await new Promise((resolve) => setTimeout(resolve, transientDelay(attempt, response.headers.get("retry-after"))));
            continue;
          }
          throw error;
        }
        let payload: unknown;
        try { payload = await response.json(); }
        catch { throw new ExternalSourceError("Malformed JSON response", sourceId, "malformed_response"); }
        if (options.validate && !options.validate(payload)) throw new ExternalSourceError("Malformed source response contract", sourceId, "malformed_response");
        const latency = Date.now() - startedAt;
        markSuccess(state, latency);
        if (options.cache !== false) state.cache.set(key, { expiresAt: Date.now() + state.policy.cacheTtlMs, value: payload });
        return payload as T;
      } catch (error) {
        const timedOut = linked.signal.aborted && !options.signal?.aborted;
        lastError = sourceError(sourceId, error, timedOut);
        if (lastError.code === "cancelled") throw lastError;
        if (attempt < state.policy.maxAttempts && (lastError.code === "network_error" || lastError.code === "timeout")) {
          state.health.retryCount += 1;
          await new Promise((resolve) => setTimeout(resolve, transientDelay(attempt, null)));
          continue;
        }
        throw lastError;
      } finally {
        linked.cleanup();
      }
    }
    throw lastError || new ExternalSourceError("Source request failed", sourceId, "network_error");
  } catch (error) {
    const normalized = sourceError(sourceId, error, false);
    markFailure(state, normalized, Date.now() - startedAt);
    throw normalized;
  } finally {
    releaseSlot();
  }
}

export function getExternalSourceHealth(): SourceHealth[] {
  return [...states.values()].map((state) => ({ ...state.health }));
}

export function clearExternalSourceRuntimeForTests() {
  states.clear();
}

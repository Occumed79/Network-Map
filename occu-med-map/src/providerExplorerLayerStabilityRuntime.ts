import L from "leaflet";

const PATCH_FLAG = "__occumedProviderExplorerLayerStabilityPatched";
const EVENT_NAME = "occumed:provider-explorer-stability";
const REQUEST_TIMEOUT_MS = 25_000;
const EXPLICIT_CLEAR_GRACE_MS = 180;
const COMMIT_IDLE_MS = 36;

const AGGREGATE_CLASSES = new Set([
  "provider-density-field",
  "provider-hex-field",
  "provider-dot-density-point",
]);

type RequestChannel = "aggregate" | "pins" | "live" | "compare";

type RuntimeSnapshot = {
  requestId: number;
  requestActive: boolean;
  commitDepth: number;
  lastCompletedRequestId: number;
};

type GroupState = {
  replacing: boolean;
  replacementToken: number;
  requestId: number | null;
  requestSettled: boolean;
  expectedCellCount: number | null;
  stagedLayers: L.Layer[];
  fallbackClearTimer: number | null;
  commitTimer: number | null;
};

type StableLayerGroup = L.LayerGroup & {
  __occumedAggregateGroup?: boolean;
  __occumedAggregateState?: GroupState;
};

type ActiveRequest = {
  id: number;
  channel: RequestChannel;
  url: string;
  controller: AbortController;
  timeoutId: number;
  callerSignal?: AbortSignal;
  callerAbortHandler?: () => void;
  completed: boolean;
};

declare global {
  interface Window {
    __OCCUMED_PROVIDER_EXPLORER_STABILITY__?: RuntimeSnapshot;
  }
}

const runtime: RuntimeSnapshot = window.__OCCUMED_PROVIDER_EXPLORER_STABILITY__ || {
  requestId: 0,
  requestActive: false,
  commitDepth: 0,
  lastCompletedRequestId: 0,
};
window.__OCCUMED_PROVIDER_EXPLORER_STABILITY__ = runtime;

const aggregateGroups = new Set<StableLayerGroup>();
const activeRequests = new Map<RequestChannel, ActiveRequest>();
let requestSequence = 0;
let activeAggregateDrawRequestId: number | null = null;

function emit(phase: string, detail: Record<string, unknown> = {}): void {
  document.dispatchEvent(new CustomEvent(EVENT_NAME, {
    detail: {
      phase,
      requestId: runtime.requestId,
      requestActive: runtime.requestActive,
      commitDepth: runtime.commitDepth,
      ...detail,
    },
  }));
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function requestChannel(input: RequestInfo | URL): RequestChannel | null {
  try {
    const pathname = new URL(requestUrl(input), window.location.href).pathname;
    if (pathname.endsWith("/api/provider-explorer/density") || pathname.endsWith("/api/provider-explorer/hex")) return "aggregate";
    if (pathname.endsWith("/api/provider-explorer/map")) return "pins";
    if (pathname.endsWith("/api/provider-explorer/live")) return "live";
    if (pathname.endsWith("/api/provider-explorer/compare")) return "compare";
    return null;
  } catch {
    return null;
  }
}

function layerClassNames(layer: unknown): string[] {
  const value = (layer as { options?: { className?: unknown } } | null)?.options?.className;
  return typeof value === "string" ? value.split(/\s+/).filter(Boolean) : [];
}

function isAggregateLayer(layer: unknown): boolean {
  return layerClassNames(layer).some((name) => AGGREGATE_CLASSES.has(name));
}

function createGroupState(): GroupState {
  return {
    replacing: false,
    replacementToken: 0,
    requestId: null,
    requestSettled: false,
    expectedCellCount: null,
    stagedLayers: [],
    fallbackClearTimer: null,
    commitTimer: null,
  };
}

function groupState(group: StableLayerGroup): GroupState {
  if (!group.__occumedAggregateState) group.__occumedAggregateState = createGroupState();
  return group.__occumedAggregateState;
}

function clearTimer(timer: number | null): void {
  if (timer !== null) window.clearTimeout(timer);
}

function clearGroupTimers(state: GroupState): void {
  clearTimer(state.fallbackClearTimer);
  clearTimer(state.commitTimer);
  state.fallbackClearTimer = null;
  state.commitTimer = null;
}

function resetReplacementState(state: GroupState): void {
  clearGroupTimers(state);
  state.replacing = false;
  state.requestId = null;
  state.requestSettled = false;
  state.expectedCellCount = null;
  state.stagedLayers = [];
}

function abortError(message: string): DOMException {
  return new DOMException(message, "AbortError");
}

function timeoutError(url: string): DOMException {
  return new DOMException(`Provider Explorer request timed out after ${Math.round(REQUEST_TIMEOUT_MS / 1000)} seconds: ${url}`, "TimeoutError");
}

function hasVisibleLayers(group: StableLayerGroup): boolean {
  return group.getLayers().length > 0;
}

function installProviderExplorerLayerStability(): void {
  const prototype = L.LayerGroup.prototype as any;
  if (prototype[PATCH_FLAG]) return;

  const originalAddLayer = prototype.addLayer as (this: L.LayerGroup, layer: L.Layer) => L.LayerGroup;
  const originalClearLayers = prototype.clearLayers as (this: L.LayerGroup) => L.LayerGroup;
  const originalFetch = window.fetch.bind(window);

  function commitGroup(group: StableLayerGroup, reason: string): void {
    const state = groupState(group);
    if (!state.replacing) return;

    const stagedLayers = state.stagedLayers.slice();
    const requestId = state.requestId;
    const expectedCellCount = state.expectedCellCount;
    clearGroupTimers(state);

    runtime.commitDepth += 1;
    emit("commit-start", {
      reason,
      groupLayerCount: group.getLayers().length,
      stagedLayerCount: stagedLayers.length,
      expectedCellCount,
      committingRequestId: requestId,
    });

    try {
      originalClearLayers.call(group);
      for (const layer of stagedLayers) originalAddLayer.call(group, layer);
    } finally {
      resetReplacementState(state);
      runtime.commitDepth = Math.max(0, runtime.commitDepth - 1);
      emit("commit-end", {
        reason,
        renderedLayerCount: group.getLayers().length,
        committedRequestId: requestId,
      });
    }
  }

  function scheduleCommit(group: StableLayerGroup, reason: string, delay = COMMIT_IDLE_MS): void {
    const state = groupState(group);
    clearTimer(state.commitTimer);
    state.commitTimer = window.setTimeout(() => {
      state.commitTimer = null;
      if (!state.replacing) return;
      if (state.requestId !== null && !state.requestSettled) return;
      commitGroup(group, reason);
    }, delay);
  }

  function beginReplacement(group: StableLayerGroup): void {
    const state = groupState(group);
    clearGroupTimers(state);
    state.replacing = true;
    state.replacementToken += 1;
    state.requestId = null;
    state.requestSettled = false;
    state.expectedCellCount = null;
    state.stagedLayers = [];

    // A switch to pins or an explicit clear has no aggregate request following it.
    // Wait briefly for a density/hex request; otherwise commit the empty state.
    state.fallbackClearTimer = window.setTimeout(() => {
      state.fallbackClearTimer = null;
      if (state.replacing && state.requestId === null) commitGroup(group, "explicit-clear");
    }, EXPLICIT_CLEAR_GRACE_MS);
  }

  function bindPendingAggregateGroups(requestId: number): void {
    aggregateGroups.forEach((group) => {
      const state = groupState(group);
      if (!state.replacing || state.requestId !== null) return;
      clearTimer(state.fallbackClearTimer);
      state.fallbackClearTimer = null;
      state.requestId = requestId;
      state.requestSettled = false;
      state.expectedCellCount = null;
      state.stagedLayers = [];
    });
  }

  function cancelAggregateReplacement(requestId: number, reason: string): void {
    aggregateGroups.forEach((group) => {
      const state = groupState(group);
      if (!state.replacing || state.requestId !== requestId) return;
      // Keep the last known-good visualization visible on errors, aborts, and timeouts.
      resetReplacementState(state);
    });
    emit("request-cancelled", { cancelledRequestId: requestId, reason });
  }

  function markAggregateResponseReady(requestId: number, payload: unknown): void {
    const cells = payload && typeof payload === "object" && Array.isArray((payload as { cells?: unknown }).cells)
      ? (payload as { cells: unknown[] }).cells
      : null;

    activeAggregateDrawRequestId = requestId;
    aggregateGroups.forEach((group) => {
      const state = groupState(group);
      if (!state.replacing || state.requestId !== requestId) return;
      state.requestSettled = true;
      state.expectedCellCount = cells?.length ?? null;
      scheduleCommit(group, "aggregate-response", COMMIT_IDLE_MS);
    });

    // The caller resumes from response.json() in a microtask and draws all cells
    // synchronously. This timer runs only after that drawing pass has completed.
    window.setTimeout(() => {
      if (activeAggregateDrawRequestId === requestId) activeAggregateDrawRequestId = null;
      aggregateGroups.forEach((group) => {
        const state = groupState(group);
        if (state.replacing && state.requestId === requestId) scheduleCommit(group, "aggregate-draw-complete", COMMIT_IDLE_MS);
      });
    }, 0);
  }

  function cleanupRequest(record: ActiveRequest): boolean {
    if (record.completed) return false;
    record.completed = true;
    window.clearTimeout(record.timeoutId);
    if (record.callerSignal && record.callerAbortHandler) {
      record.callerSignal.removeEventListener("abort", record.callerAbortHandler);
    }
    if (activeRequests.get(record.channel)?.id === record.id) activeRequests.delete(record.channel);
    return true;
  }

  function completeRequest(record: ActiveRequest): void {
    if (!cleanupRequest(record)) return;
    if (record.channel === "aggregate" && runtime.requestId === record.id) {
      runtime.requestActive = false;
      runtime.lastCompletedRequestId = record.id;
      emit("request-complete", { completedRequestId: record.id, url: record.url });
    }
  }

  function failRequest(record: ActiveRequest, error: unknown): void {
    if (!cleanupRequest(record)) return;
    if (record.channel === "aggregate") {
      cancelAggregateReplacement(record.id, error instanceof Error ? error.message : String(error));
      if (runtime.requestId === record.id) {
        runtime.requestActive = false;
        emit("request-error", {
          failedRequestId: record.id,
          url: record.url,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  function abortActiveChannel(channel: RequestChannel): void {
    const previous = activeRequests.get(channel);
    if (!previous || previous.completed) return;
    const error = abortError(`Superseded by a newer Provider Explorer ${channel} request.`);
    previous.controller.abort(error);
    failRequest(previous, error);
  }

  function startRequest(
    channel: RequestChannel,
    input: RequestInfo | URL,
    init?: RequestInit,
  ): { record: ActiveRequest; init: RequestInit } {
    abortActiveChannel(channel);

    const id = ++requestSequence;
    const url = requestUrl(input);
    const controller = new AbortController();
    const callerSignal = init?.signal;
    const callerAbortHandler = callerSignal
      ? () => controller.abort(callerSignal.reason || abortError("Provider Explorer request was cancelled."))
      : undefined;

    if (callerSignal && callerAbortHandler) {
      if (callerSignal.aborted) callerAbortHandler();
      else callerSignal.addEventListener("abort", callerAbortHandler, { once: true });
    }

    const record: ActiveRequest = {
      id,
      channel,
      url,
      controller,
      timeoutId: 0,
      callerSignal,
      callerAbortHandler,
      completed: false,
    };

    record.timeoutId = window.setTimeout(() => {
      if (record.completed) return;
      const error = timeoutError(url);
      controller.abort(error);
      failRequest(record, error);
    }, REQUEST_TIMEOUT_MS);

    activeRequests.set(channel, record);

    if (channel === "aggregate") {
      runtime.requestId = id;
      runtime.requestActive = true;
      bindPendingAggregateGroups(id);
      emit("request-start", { startedRequestId: id, url });
    }

    return {
      record,
      init: { ...init, signal: controller.signal },
    };
  }

  function wrapResponse(response: Response, record: ActiveRequest): Response {
    const wrappedJson = async (): Promise<unknown> => {
      try {
        if (activeRequests.get(record.channel)?.id !== record.id) {
          throw abortError(`Ignored stale Provider Explorer ${record.channel} response.`);
        }
        if (!response.ok) {
          throw new Error(`Provider Explorer ${record.channel} request failed with HTTP ${response.status}.`);
        }

        const payload = await response.json();
        if (activeRequests.get(record.channel)?.id !== record.id) {
          throw abortError(`Ignored stale Provider Explorer ${record.channel} response.`);
        }

        if (record.channel === "aggregate") markAggregateResponseReady(record.id, payload);
        completeRequest(record);
        return payload;
      } catch (error) {
        failRequest(record, error);
        throw error;
      }
    };

    return new Proxy(response, {
      get(target, property) {
        if (property === "json") return wrappedJson;
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }

  prototype.addLayer = function patchedAddLayer(this: StableLayerGroup, layer: L.Layer): L.LayerGroup {
    if (isAggregateLayer(layer)) {
      this.__occumedAggregateGroup = true;
      aggregateGroups.add(this);
    }

    const state = this.__occumedAggregateState;
    if (!this.__occumedAggregateGroup || !state?.replacing) return originalAddLayer.call(this, layer);

    // A stale response must never contaminate a newer replacement transaction.
    if (
      state.requestId !== null
      && activeAggregateDrawRequestId !== null
      && state.requestId !== activeAggregateDrawRequestId
    ) {
      return this;
    }

    state.stagedLayers.push(layer);
    if (state.requestSettled) scheduleCommit(this, "staged-layer-idle", COMMIT_IDLE_MS);
    return this;
  };

  prototype.clearLayers = function patchedClearLayers(this: StableLayerGroup): L.LayerGroup {
    if (!this.__occumedAggregateGroup || (!hasVisibleLayers(this) && !this.__occumedAggregateState?.replacing)) {
      return originalClearLayers.call(this);
    }

    const state = this.__occumedAggregateState;
    if (
      state?.replacing
      && activeAggregateDrawRequestId !== null
      && state.requestId === activeAggregateDrawRequestId
    ) {
      // drawProviderDensity/drawProviderDotDensity clears the group again after
      // response.json(). Keep the visible field, discard only staged remnants,
      // and preserve the active request transaction.
      clearTimer(state.commitTimer);
      state.commitTimer = null;
      state.stagedLayers = [];
      return this;
    }

    beginReplacement(this);
    return this;
  };

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const channel = requestChannel(input);
    if (!channel) return originalFetch(input, init);

    const started = startRequest(channel, input, init);
    return originalFetch(input, started.init)
      .then((response) => {
        if (activeRequests.get(channel)?.id !== started.record.id) {
          throw abortError(`Ignored stale Provider Explorer ${channel} response.`);
        }
        return wrapResponse(response, started.record);
      })
      .catch((error) => {
        failRequest(started.record, error);
        throw error;
      });
  }) as typeof window.fetch;

  prototype[PATCH_FLAG] = true;
  emit("installed");
}

installProviderExplorerLayerStability();

export {};

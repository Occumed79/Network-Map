export type BootPhase =
  | "initializing"
  | "rendering"
  | "interactive"
  | "optional-runtimes"
  | "ready"
  | "degraded"
  | "failed";

type RuntimeState = "loading" | "loaded" | "failed";

type RuntimeRecord = {
  name: string;
  state: RuntimeState;
  startedAt: number;
  finishedAt?: number;
  durationMs?: number;
  error?: string;
};

type BootFailure = {
  scope: string;
  message: string;
  fatal: boolean;
  recordedAt: number;
};

export type BootSnapshot = {
  phase: BootPhase;
  startedAt: number;
  readyAt: number | null;
  elapsedMs: number;
  runtimes: RuntimeRecord[];
  failures: BootFailure[];
};

declare global {
  interface Window {
    __NETWORK_MAP_BOOT__?: {
      snapshot: () => BootSnapshot;
      reload: () => void;
    };
  }
}

const bootStartedAt = performance.now();
const runtimeRecords = new Map<string, RuntimeRecord>();
const failures: BootFailure[] = [];
let phase: BootPhase = "initializing";
let readyAt: number | null = null;
let globalListenersInstalled = false;

function elapsed(): number {
  return Math.max(0, performance.now() - bootStartedAt);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown startup error";
  }
}

function publishState(): void {
  const root = document.documentElement;
  root.dataset.occumedBootPhase = phase;
  root.dataset.occumedBootHealth = failures.some((failure) => failure.fatal)
    ? "failed"
    : failures.length
      ? "degraded"
      : "healthy";
}

export function bootSnapshot(): BootSnapshot {
  return {
    phase,
    startedAt: bootStartedAt,
    readyAt,
    elapsedMs: elapsed(),
    runtimes: Array.from(runtimeRecords.values()).map((record) => ({ ...record })),
    failures: failures.map((failure) => ({ ...failure })),
  };
}

export function setBootPhase(nextPhase: BootPhase): void {
  phase = nextPhase;
  publishState();
  try {
    performance.mark(`network-map:${nextPhase}`);
  } catch {
    // Performance marks are diagnostic-only.
  }
}

export function recordBootFailure(scope: string, error: unknown, fatal = false): void {
  const message = errorMessage(error);
  const duplicate = failures.some((failure) => failure.scope === scope && failure.message === message);
  if (!duplicate) {
    failures.push({ scope, message, fatal, recordedAt: elapsed() });
  }
  if (fatal) phase = "failed";
  else if (phase === "ready" || phase === "interactive") phase = "degraded";
  publishState();
}

export async function loadOptionalRuntime(
  name: string,
  loader: () => Promise<unknown>,
): Promise<boolean> {
  const startedAt = elapsed();
  runtimeRecords.set(name, { name, state: "loading", startedAt });
  try {
    await loader();
    const finishedAt = elapsed();
    runtimeRecords.set(name, {
      name,
      state: "loaded",
      startedAt,
      finishedAt,
      durationMs: Math.max(0, finishedAt - startedAt),
    });
    return true;
  } catch (error) {
    const finishedAt = elapsed();
    const message = errorMessage(error);
    runtimeRecords.set(name, {
      name,
      state: "failed",
      startedAt,
      finishedAt,
      durationMs: Math.max(0, finishedAt - startedAt),
      error: message,
    });
    recordBootFailure(`runtime:${name}`, error, false);
    console.error(`Network Map optional runtime failed: ${name}`, error);
    return false;
  }
}

export function markApplicationInteractive(rootElement: HTMLElement): void {
  rootElement.setAttribute("aria-busy", "false");
  if (readyAt === null) readyAt = elapsed();
  setBootPhase(failures.length ? "degraded" : "interactive");
}

export function markOptionalRuntimesComplete(): void {
  setBootPhase(failures.length ? "degraded" : "ready");
}

function handleWindowError(event: ErrorEvent): void {
  recordBootFailure("window-error", event.error || event.message, false);
}

function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  recordBootFailure("unhandled-rejection", event.reason, false);
}

export function installGlobalBootDiagnostics(): void {
  if (globalListenersInstalled) return;
  globalListenersInstalled = true;
  window.addEventListener("error", handleWindowError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);
  window.__NETWORK_MAP_BOOT__ = {
    snapshot: bootSnapshot,
    reload: () => window.location.reload(),
  };
  publishState();
}

export {};

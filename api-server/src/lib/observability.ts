import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { getDatabaseConfigurationSummary, getPoolDiagnostics } from "@workspace/db";

const MAX_EVENTS = 200;
const SLOW_QUERY_MS = Math.max(100, Number(process.env.SLOW_QUERY_MS) || 1_000);

type RequestContext = { requestId: string; startedAt: number; method: string; path: string };
type TimingEvent = { requestId?: string; at: string; kind: string; name: string; durationMs: number; ok: boolean; slow?: boolean; detail?: Record<string, unknown> };
type ErrorEvent = { requestId?: string; at: string; name: string; message: string; code?: string };
type UploadMetric = { requestId?: string; at: string; uploadId?: string; status: string; accepted?: number; quarantined?: number; rejected?: number; duplicate?: number };

const storage = new AsyncLocalStorage<RequestContext>();
const timingEvents: TimingEvent[] = [];
const errorEvents: ErrorEvent[] = [];
const uploadMetrics: UploadMetric[] = [];
const bootStartedAt = Date.now();

function pushBounded<T>(target: T[], value: T) {
  target.push(value);
  if (target.length > MAX_EVENTS) target.splice(0, target.length - MAX_EVENTS);
}

function safeRequestId(value: unknown): string | undefined {
  const text = String(value || "").trim();
  return /^[A-Za-z0-9._:-]{8,128}$/.test(text) ? text : undefined;
}

export function currentRequestContext(): RequestContext | undefined { return storage.getStore(); }
export function currentRequestId(): string | undefined { return storage.getStore()?.requestId; }

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = safeRequestId(req.get("x-request-id")) || randomUUID();
  // Security, logger, route timing, DB timing, and external-source timing must
  // all observe the same ID. Stamp the request header so downstream middleware
  // reuses rather than regenerates correlation identity.
  req.headers["x-request-id"] = requestId;
  res.setHeader("X-Request-ID", requestId);
  const context: RequestContext = { requestId, startedAt: Date.now(), method: req.method, path: req.path };
  storage.run(context, () => {
    res.on("finish", () => {
      recordTiming("route", `${req.method} ${req.path}`, Date.now() - context.startedAt, res.statusCode < 500, { statusCode: res.statusCode });
    });
    next();
  });
}

export function recordTiming(kind: string, name: string, durationMs: number, ok: boolean, detail?: Record<string, unknown>) {
  const rounded = Math.max(0, Math.round(durationMs));
  pushBounded(timingEvents, {
    requestId: currentRequestId(),
    at: new Date().toISOString(),
    kind,
    name,
    durationMs: rounded,
    ok,
    slow: kind === "database" && rounded >= SLOW_QUERY_MS,
    detail,
  });
}

export function recordError(name: string, error: unknown, code?: string) {
  const message = error instanceof Error ? error.message : String(error);
  pushBounded(errorEvents, { requestId: currentRequestId(), at: new Date().toISOString(), name, message: redactText(message), code });
}

export function recordUploadMetric(metric: Omit<UploadMetric, "requestId" | "at">) {
  pushBounded(uploadMetrics, { requestId: currentRequestId(), at: new Date().toISOString(), ...metric });
}

export function redactText(value: string): string {
  return value
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/(?:sk|sk-proj)-[A-Za-z0-9_-]+/g, "[REDACTED_TOKEN]")
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REDACTED]")
    .replace(/([?&](?:api_?key|token|key)=)[^&\s]+/gi, "$1[REDACTED]");
}

function sanitizeDetail(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[TRUNCATED]";
  if (typeof value === "string") return redactText(value).slice(0, 1000);
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeDetail(item, depth + 1));
  if (!value || typeof value !== "object") return value;
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (/authorization|cookie|secret|token|password|api.?key|connection|string/i.test(key)) {
      result[key] = "[REDACTED]";
      continue;
    }
    result[key] = sanitizeDetail(nested, depth + 1);
  }
  return result;
}

export function diagnosticsSnapshot(extra: Record<string, unknown> = {}) {
  const recentTimings = timingEvents.slice(-100).map((event) => ({ ...event, detail: sanitizeDetail(event.detail) as Record<string, unknown> | undefined }));
  const recentErrors = errorEvents.slice(-50).map((event) => ({ ...event, message: redactText(event.message) }));
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    application: {
      uptimeMs: Date.now() - bootStartedAt,
      revision: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT_SHA || process.env.COMMIT_SHA || null,
      nodeEnv: process.env.NODE_ENV || "unknown",
    },
    database: {
      configuration: getDatabaseConfigurationSummary(),
      pools: getPoolDiagnostics(),
      slowQueryThresholdMs: SLOW_QUERY_MS,
    },
    recentTimings,
    recentErrors,
    recentUploads: uploadMetrics.slice(-50),
    ...sanitizeDetail(extra) as Record<string, unknown>,
  };
}

export function diagnosticsFingerprint(snapshot: unknown): string {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex").slice(0, 16);
}

export function clearObservabilityForTests() {
  timingEvents.length = 0;
  errorEvents.length = 0;
  uploadMetrics.length = 0;
}

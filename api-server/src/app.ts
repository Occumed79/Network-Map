import express, { type Express, type RequestHandler } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";
import { saveSearchSnapshot } from "./lib/networkMapPersistence";
import { apiSecurity } from "./middleware/apiSecurity";
import { recordError, recordUploadMetric, requestContextMiddleware } from "./lib/observability";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app: Express = express();
const SNAPSHOT_ROUTES = new Set(["/api/price-finder", "/api/price-hunt", "/api/occ-hunt"]);
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
const REQUEST_DEADLINE_MS = Math.min(Math.max(Number(process.env.API_REQUEST_DEADLINE_MS) || 30_000, 5_000), 180_000);

function getResultCount(body: unknown): number {
  if (!body || typeof body !== "object") return 0;
  const candidate = body as Record<string, unknown>;
  if (typeof candidate.clinicCount === "number") return candidate.clinicCount;
  if (typeof candidate.count === "number") return candidate.count;
  if (Array.isArray(candidate.clinics)) return candidate.clinics.length;
  if (Array.isArray(candidate.results)) return candidate.results.length;
  if (Array.isArray(candidate.partners)) return candidate.partners.length;
  return 0;
}

function stripSensitiveResponse(pathname: string, body: unknown): unknown {
  if (!body || typeof body !== "object" || pathname !== "/api/price-hunt") return body;
  const candidate = body as Record<string, unknown>;
  const { debug: _debug, ...safeBody } = candidate;
  return safeBody;
}

function snapshotPayload(body: unknown): Record<string, unknown> {
  return { omitted: true, reason: "Full response payload omitted from persistence to reduce lead-data exposure.", resultCount: getResultCount(body), savedAt: new Date().toISOString() };
}

const requestDeadline: RequestHandler = (req, res, next) => {
  req.setTimeout(REQUEST_DEADLINE_MS);
  res.setTimeout(REQUEST_DEADLINE_MS, () => {
    if (!res.headersSent) res.status(504).json({ error: "Request deadline exceeded.", code: "request_timeout" });
  });
  next();
};

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  next();
});
app.use(requestContextMiddleware);
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { return { id: req.id, requestId: req.headers?.["x-request-id"], method: req.method, url: req.url?.split("?")[0] }; },
      res(res) { return { statusCode: res.statusCode }; },
    },
    redact: {
      paths: ["req.headers.authorization", "req.headers.x-admin-token", "req.headers.cookie", "req.body.password", "req.body.token", "req.body.apiKey", "req.body.api_key"],
      censor: "[REDACTED]",
    },
  }),
);
// CORS is an API boundary, not a site-wide request filter. Applying it to the
// frontend makes ordinary asset requests fail before express.static can serve
// them when a browser or proxy supplies an Origin header.
app.use("/api", (req, res, next) => {
  const sameOrigin = `${req.protocol}://${req.get("host")}`;
  return cors({
    origin(origin, callback) {
      if (!origin || origin === sameOrigin || CLIENT_ORIGINS.includes(origin)) return callback(null, true);
      if (process.env.NODE_ENV !== "production" && CLIENT_ORIGINS.length === 0) return callback(null, true);
      callback(new Error("Origin is not allowed by CORS"));
    },
    allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Token", "X-Actor-ID", "X-Request-ID", "Idempotency-Key"],
    exposedHeaders: ["X-Request-ID", "Retry-After"],
  })(req, res, next);
});
app.use(requestDeadline);
// Body parsing is globally bounded; endpoint-specific lower ceilings are enforced
// by apiSecurity using Content-Length before expensive route work is performed.
app.use(express.json({ limit: "16mb" }));
app.use(express.urlencoded({ extended: true, limit: "16mb" }));

// Upload observability is response-metadata only. It never captures raw rows or
// provider payloads and therefore stays bounded even for 5,000-row chunks.
app.use((req, res, next) => {
  if (!req.path.startsWith("/api/provider-uploads")) return next();
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (body && typeof body === "object") {
      const value = body as Record<string, unknown>;
      const summary = value.summary && typeof value.summary === "object" ? value.summary as Record<string, unknown> : null;
      const byDisposition = summary?.byDisposition && typeof summary.byDisposition === "object" ? summary.byDisposition as Record<string, unknown> : null;
      recordUploadMetric({
        uploadId: typeof value.uploadId === "string" ? value.uploadId : undefined,
        status: typeof value.status === "string" ? value.status : res.statusCode >= 400 ? "error" : "response",
        accepted: Number(value.accepted ?? byDisposition?.accepted ?? 0) || undefined,
        quarantined: Number(value.quarantined ?? byDisposition?.quarantined ?? 0) || undefined,
        rejected: Number(value.rejected ?? byDisposition?.rejected ?? 0) || undefined,
        duplicate: Number(value.duplicate ?? byDisposition?.duplicate ?? 0) || undefined,
      });
    }
    return originalJson(body);
  }) as typeof res.json;
  next();
});
app.use(apiSecurity);

app.get("/api/health", (_req, res) => {
  // Public liveness intentionally exposes no environment/auth configuration.
  res.status(200).json({ ok: true });
});
app.head("/api/health", (_req, res) => res.status(200).end());

app.use((req, res, next) => {
  if (req.method !== "GET" || !SNAPSHOT_ROUTES.has(req.path)) return next();
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    const safeBody = stripSensitiveResponse(req.path, body);
    if (res.statusCode < 400) {
      const query = req.query as Record<string, unknown>;
      const route = req.path.replace(/^\/api\//, "");
      const city = typeof query.city === "string" ? query.city : "";
      const state = typeof query.state === "string" ? query.state : null;
      const serviceType = typeof query.serviceType === "string" ? query.serviceType : null;
      void saveSearchSnapshot({ route, city, state, serviceType, resultCount: getResultCount(safeBody), requestParams: { city, state, serviceType, ...query }, responsePayload: snapshotPayload(safeBody) });
    }
    return originalJson(safeBody);
  }) as typeof res.json;
  next();
});

app.use("/api", router);

// Normalize errors without leaking stacks, tokens, raw connection strings, or
// implementation details to clients. The structured logger retains the request ID.
app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  recordError(`${req.method} ${req.path}`, error, "internal_error");
  logger.error({ requestId: res.getHeader("X-Request-ID"), path: req.path, error: error instanceof Error ? error.message : String(error) }, "API request failed");
  if (res.headersSent) return;
  res.status(500).json({ error: "The request could not be completed.", code: "internal_error", requestId: res.getHeader("X-Request-ID") });
});

const frontendDist = path.resolve(__dirname, "../../occu-med-map/dist/public");
app.use(express.static(frontendDist, {
  setHeaders(res, filePath) {
    if (path.basename(filePath) === "index.html") {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      return;
    }
    if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  },
}));
app.get("/{*path}", (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.sendFile(path.join(frontendDist, "index.html"));
});

export default app;

import express, { type Express, type RequestHandler } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";
import { saveSearchSnapshot } from "./lib/networkMapPersistence";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();
const SNAPSHOT_ROUTES = new Set([
  "/api/price-finder",
  "/api/price-hunt",
  "/api/occ-hunt",
]);
const CLIENT_ORIGINS = (process.env["CLIENT_ORIGIN"] ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

type RateLimitBucket = { count: number; resetAt: number };
const rateLimitBuckets = new Map<string, RateLimitBucket>();

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
  return {
    omitted: true,
    reason: "Full response payload omitted from persistence to reduce lead-data exposure.",
    resultCount: getResultCount(body),
    savedAt: new Date().toISOString(),
  };
}

function rateLimit({ windowMs, max }: { windowMs: number; max: number }): RequestHandler {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.path}:${req.ip || req.socket.remoteAddress || "unknown"}`;
    const current = rateLimitBuckets.get(key);
    if (!current || current.resetAt <= now) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    current.count += 1;
    if (current.count > max) {
      res.status(429).json({ error: "Too many requests. Please wait and try again." });
      return;
    }
    next();
  };
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || CLIENT_ORIGINS.length === 0 || CLIENT_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed by CORS"));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use("/api/price-hunt", rateLimit({ windowMs: 10 * 60 * 1000, max: 20 }));
app.use("/api/occ-hunt", rateLimit({ windowMs: 10 * 60 * 1000, max: 30 }));
app.use("/api/price-finder", rateLimit({ windowMs: 10 * 60 * 1000, max: 60 }));

app.use((req, res, next) => {
  if (req.method !== "GET" || !SNAPSHOT_ROUTES.has(req.path)) {
    next();
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    const safeBody = stripSensitiveResponse(req.path, body);
    if (res.statusCode < 400) {
      const query = req.query as Record<string, unknown>;
      const route = req.path.replace(/^\/api\//, "");
      const city = typeof query.city === "string" ? query.city : "";
      const state = typeof query.state === "string" ? query.state : null;
      const serviceType = typeof query.serviceType === "string" ? query.serviceType : null;
      void saveSearchSnapshot({
        route,
        city,
        state,
        serviceType,
        resultCount: getResultCount(safeBody),
        requestParams: { city, state, serviceType, ...query },
        responsePayload: snapshotPayload(safeBody),
      });
    }
    return originalJson(safeBody);
  }) as typeof res.json;

  next();
});

app.use("/api", router);

const frontendDist = path.resolve(__dirname, "../../occu-med-map/dist/public");
app.use(express.static(frontendDist));
app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

export default app;

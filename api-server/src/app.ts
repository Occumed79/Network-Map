import express, { type Express, type RequestHandler } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";
import { saveSearchSnapshot } from "./lib/networkMapPersistence";
import { requireWriteAuth } from "./middleware/writeAuth";

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
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}, RATE_LIMIT_CLEANUP_INTERVAL_MS).unref();

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
    allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Token"],
  }),
);
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "network-map",
    awake: true,
    commit: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || "unknown",
    environment: process.env.NODE_ENV || "development",
    writeAuthConfigured: Boolean(process.env.WRITE_API_TOKEN?.trim()),
  });
});

app.head("/api/health", (_req, res) => {
  res.status(200).end();
});

app.get("/api/map-tiles/:z/:y/:x", async (req, res) => {
  const z = Number(req.params.z);
  const y = Number(req.params.y);
  const x = Number(req.params.x);
  const tileLimit = Number.isInteger(z) && z >= 0 && z <= 19 ? 2 ** z : 0;

  if (
    !tileLimit ||
    !Number.isInteger(x) || x < 0 || x >= tileLimit ||
    !Number.isInteger(y) || y < 0 || y >= tileLimit
  ) {
    res.status(400).json({ error: "Invalid map tile coordinates" });
    return;
  }

  try {
    const tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${z}/${y}/${x}`;
    const tileResponse = await fetch(tileUrl, {
      headers: { "User-Agent": "Occu-Med-Network-Map/1.0" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!tileResponse.ok) {
      res.status(tileResponse.status).end();
      return;
    }

    const contentType = tileResponse.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.status(200).send(Buffer.from(await tileResponse.arrayBuffer()));
  } catch (error) {
    logger.warn({ error, z, y, x }, "ArcGIS map tile proxy failed");
    res.status(502).end();
  }
});

app.use("/api/price-hunt", rateLimit({ windowMs: 10 * 60 * 1000, max: 20 }));
app.use("/api/occ-hunt", rateLimit({ windowMs: 10 * 60 * 1000, max: 30 }));
app.use("/api/price-finder", rateLimit({ windowMs: 10 * 60 * 1000, max: 60 }));
app.use("/api/provider-sources/search", rateLimit({ windowMs: 10 * 60 * 1000, max: 40 }));
app.use("/api/provider-sources/npi-custom", rateLimit({ windowMs: 10 * 60 * 1000, max: 30 }));
app.use("/api/live-finder/search", rateLimit({ windowMs: 10 * 60 * 1000, max: 60 }));
app.use("/api/enhanced-search", rateLimit({ windowMs: 10 * 60 * 1000, max: 60 }));
app.use("/api/map-inventory", rateLimit({ windowMs: 10 * 60 * 1000, max: 120 }));
app.use("/api/provider-layers", rateLimit({ windowMs: 10 * 60 * 1000, max: 120 }));
app.use("/api/provider-explorer", rateLimit({ windowMs: 10 * 60 * 1000, max: 180 }));
app.use("/api/my-clinics", rateLimit({ windowMs: 10 * 60 * 1000, max: 80 }));
app.use(requireWriteAuth);

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
app.use(express.static(frontendDist, {
  setHeaders(res, filePath) {
    if (path.basename(filePath) === "index.html") {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      return;
    }
    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  },
}));
app.get("/{*path}", (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.sendFile(path.join(frontendDist, "index.html"));
});

export default app;

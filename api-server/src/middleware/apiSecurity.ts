import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { Request, RequestHandler, Response } from "express";
import { getPool } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";

export type ApiCapability = "read" | "upload" | "write" | "destructive" | "admin";

type RoutePolicy = {
  prefix: string;
  methods?: string[];
  capability: ApiCapability;
  maxBytes?: number;
  rateLimit?: { windowSeconds: number; max: number };
  idempotent?: boolean;
};

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const DEFAULT_WRITE_MAX_BYTES = 2 * 1024 * 1024;
const UPLOAD_MAX_BYTES = 16 * 1024 * 1024;
type RateLimitAvailability = "fail-open-read" | "fail-closed";

let lastReadRateLimitFailure = "";

export const ROUTE_POLICIES: RoutePolicy[] = [
  { prefix: "/api/provider-sources/search", methods: ["POST"], capability: "read", maxBytes: 512 * 1024, rateLimit: { windowSeconds: 600, max: 80 } },
  { prefix: "/api/provider-sources/npi-custom", methods: ["POST"], capability: "read", maxBytes: 512 * 1024, rateLimit: { windowSeconds: 600, max: 60 } },
  { prefix: "/api/diagnostics/export", methods: ["GET"], capability: "admin", rateLimit: { windowSeconds: 600, max: 60 } },
  { prefix: "/api/admin", methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], capability: "admin", rateLimit: { windowSeconds: 600, max: 60 }, idempotent: false },
  { prefix: "/api/provider-uploads", methods: ["GET"], capability: "admin", rateLimit: { windowSeconds: 600, max: 60 } },
  { prefix: "/api/provider-uploads", methods: ["POST"], capability: "upload", maxBytes: UPLOAD_MAX_BYTES, rateLimit: { windowSeconds: 600, max: 60 }, idempotent: true },
  { prefix: "/api/my-clinics", methods: ["POST", "PUT", "PATCH"], capability: "upload", maxBytes: UPLOAD_MAX_BYTES, rateLimit: { windowSeconds: 600, max: 80 }, idempotent: true },
  { prefix: "/api/provider-sources/import", methods: ["POST"], capability: "upload", maxBytes: UPLOAD_MAX_BYTES, rateLimit: { windowSeconds: 600, max: 30 }, idempotent: true },
  { prefix: "/api/provider-explorer", methods: ["POST", "PUT", "PATCH"], capability: "write", rateLimit: { windowSeconds: 600, max: 120 }, idempotent: true },
  { prefix: "/api/indexing", methods: ["POST", "PUT", "PATCH"], capability: "write", rateLimit: { windowSeconds: 600, max: 30 }, idempotent: true },
  { prefix: "/api/vector-index", methods: ["POST", "PUT", "PATCH"], capability: "write", rateLimit: { windowSeconds: 600, max: 30 }, idempotent: true },
  { prefix: "/api/browser-extraction", methods: ["POST", "PUT", "PATCH"], capability: "write", rateLimit: { windowSeconds: 600, max: 30 }, idempotent: true },
  { prefix: "/api/google-places", methods: ["POST", "PUT", "PATCH"], capability: "write", rateLimit: { windowSeconds: 600, max: 60 }, idempotent: true },
  { prefix: "/api/price-discovery", methods: ["POST", "PUT", "PATCH"], capability: "write", rateLimit: { windowSeconds: 600, max: 30 }, idempotent: true },
  { prefix: "/api/provider-uploads", methods: ["DELETE"], capability: "destructive", rateLimit: { windowSeconds: 600, max: 20 }, idempotent: true },
  { prefix: "/api", methods: ["DELETE"], capability: "destructive", rateLimit: { windowSeconds: 600, max: 20 }, idempotent: true },
];

const READ_RATE_LIMITS: Array<{ prefix: string; windowSeconds: number; max: number }> = [
  { prefix: "/api/provider-sources/search", windowSeconds: 600, max: 80 },
  { prefix: "/api/provider-sources/npi-custom", windowSeconds: 600, max: 60 },
  { prefix: "/api/live-finder/search", windowSeconds: 600, max: 120 },
  { prefix: "/api/map-inventory", windowSeconds: 600, max: 240 },
  { prefix: "/api/provider-layers", windowSeconds: 600, max: 240 },
  { prefix: "/api/provider-explorer", windowSeconds: 600, max: 240 },
  { prefix: "/api/price-hunt", windowSeconds: 600, max: 30 },
  { prefix: "/api/occ-hunt", windowSeconds: 600, max: 40 },
];

function policyFor(req: Request): RoutePolicy | null {
  const method = req.method.toUpperCase();
  const matches = ROUTE_POLICIES.filter((policy) =>
    (req.path === policy.prefix || req.path.startsWith(`${policy.prefix}/`))
    && (!policy.methods || policy.methods.includes(method)),
  );
  return matches.sort((a, b) => b.prefix.length - a.prefix.length)[0] || null;
}

function readLimitFor(req: Request) {
  return READ_RATE_LIMITS.find((policy) => req.path === policy.prefix || req.path.startsWith(`${policy.prefix}/`)) || null;
}

function extractBearer(req: Request): string {
  const adminHeader = req.get("x-admin-token")?.trim();
  if (adminHeader) return adminHeader;
  const auth = req.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function safeEqual(expected: string, supplied: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

function tokenFor(capability: ApiCapability): string {
  const write = process.env.WRITE_API_TOKEN?.trim() || "";
  const upload = process.env.UPLOAD_API_TOKEN?.trim() || write;
  const destructive = process.env.ADMIN_API_TOKEN?.trim() || write;
  if (capability === "upload") return upload;
  if (capability === "destructive" || capability === "admin") return destructive;
  if (capability === "write") return write;
  return "";
}

function requestId(req: Request): string {
  const incoming = req.get("x-request-id")?.trim();
  return incoming && /^[A-Za-z0-9._:-]{8,128}$/.test(incoming) ? incoming : randomUUID();
}

function canonicalRequestPath(req: Request): string {
  const original = String(req.originalUrl || req.url || req.path || "");
  return original.split("?", 1)[0] || req.path || "/";
}

function bodyHash(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body ?? null)).digest("hex");
}

function allowDegradedReadRateLimit(res: Response, scope: string, reason: string): true {
  res.setHeader("X-RateLimit-Status", "degraded");
  const failure = `${scope}:${reason}`;
  if (failure !== lastReadRateLimitFailure) {
    lastReadRateLimitFailure = failure;
    console.warn(`read rate limiting degraded for ${scope}`, reason);
  }
  return true;
}

async function distributedRateLimit(
  req: Request,
  res: Response,
  policy: { windowSeconds: number; max: number },
  scope: string,
  availability: RateLimitAvailability = "fail-closed",
): Promise<boolean> {
  const now = new Date();
  const clientIdentity = req.ip || req.socket.remoteAddress || "unknown";
  const bucketKey = createHash("sha256").update(`${scope}|${clientIdentity}`).digest("hex");

  if (!isPersistenceConfigured()) {
    if (availability === "fail-open-read") {
      return allowDegradedReadRateLimit(res, scope, "rate-limit persistence is not configured");
    }
    if (process.env.NODE_ENV === "production") {
      res.status(503).json({ error: "Request limiting is temporarily unavailable.", code: "rate_limit_store_unavailable" });
      return false;
    }
    return true;
  }

  let result;
  try {
    result = await getPool().query(
      `INSERT INTO public.api_rate_limit_buckets (bucket_key,window_started_at,window_seconds,request_count,updated_at)
       VALUES ($1,$2,$3,1,now())
       ON CONFLICT (bucket_key) DO UPDATE SET
         window_started_at = CASE WHEN public.api_rate_limit_buckets.window_started_at + make_interval(secs=>public.api_rate_limit_buckets.window_seconds) <= $2 THEN $2 ELSE public.api_rate_limit_buckets.window_started_at END,
         window_seconds = $3,
         request_count = CASE WHEN public.api_rate_limit_buckets.window_started_at + make_interval(secs=>public.api_rate_limit_buckets.window_seconds) <= $2 THEN 1 ELSE public.api_rate_limit_buckets.request_count + 1 END,
         updated_at = now()
       RETURNING request_count,window_started_at,window_seconds`,
      [bucketKey, now, policy.windowSeconds],
    );
    if (availability === "fail-open-read") lastReadRateLimitFailure = "";
  } catch (error) {
    if (availability === "fail-open-read") {
      return allowDegradedReadRateLimit(
        res,
        scope,
        error instanceof Error ? error.message : "rate-limit store query failed",
      );
    }
    throw error;
  }
  const count = Number(result.rows[0]?.request_count || 0);
  if (count <= policy.max) return true;
  const resetAt = new Date(result.rows[0].window_started_at).getTime() + Number(result.rows[0].window_seconds) * 1000;
  res.setHeader("Retry-After", String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))));
  res.status(429).json({ error: "Too many requests. Please wait and try again.", code: "rate_limit_exceeded" });
  return false;
}

async function auditWrite(req: Request, res: Response, capability: ApiCapability, startedAt: number, statusCode: number): Promise<void> {
  if (!isPersistenceConfigured()) return;
  try {
    await getPool().query(
      `INSERT INTO public.api_write_audit (request_id,method,path,capability,actor,idempotency_key,status_code,duration_ms,body_hash,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
      [
        String(res.getHeader("X-Request-ID") || "unknown"), req.method, canonicalRequestPath(req), capability,
        req.get("x-actor-id")?.slice(0, 128) || null, req.get("idempotency-key")?.slice(0, 200) || null,
        statusCode, Date.now() - startedAt, bodyHash(req.body), JSON.stringify({ ipPresent: Boolean(req.ip) }),
      ],
    );
  } catch (error) {
    console.warn("api write audit failed", error instanceof Error ? error.message : String(error));
  }
}

async function reserveIdempotency(req: Request, res: Response): Promise<boolean> {
  const key = req.get("idempotency-key")?.trim() || "";
  if (!key) {
    res.status(400).json({ error: "Idempotency-Key is required for this bulk/write operation.", code: "idempotency_key_required" });
    return false;
  }
  if (!/^[A-Za-z0-9._:-]{8,200}$/.test(key)) {
    res.status(400).json({ error: "Idempotency-Key format is invalid.", code: "invalid_idempotency_key" });
    return false;
  }
  if (!isPersistenceConfigured()) return process.env.NODE_ENV !== "production";
  const routeKey = `${req.method}:${req.path}`;
  const hash = bodyHash(req.body);
  const inserted = await getPool().query(
    `INSERT INTO public.api_idempotency_keys (idempotency_key,route_key,request_hash,state)
     VALUES ($1,$2,$3,'processing') ON CONFLICT DO NOTHING RETURNING idempotency_key`,
    [key, routeKey, hash],
  );
  if (inserted.rows.length) return true;
  const existing = await getPool().query("SELECT * FROM public.api_idempotency_keys WHERE idempotency_key=$1", [key]);
  const row = existing.rows[0];
  if (!row || row.route_key !== routeKey || row.request_hash !== hash) {
    res.status(409).json({ error: "Idempotency key was already used for a different request.", code: "idempotency_conflict" });
    return false;
  }
  if (row.state === "completed") {
    res.status(Number(row.response_status) || 200).json(row.response_body || { idempotent: true });
    return false;
  }
  res.status(409).json({ error: "A request with this idempotency key is already processing.", code: "idempotency_in_progress" });
  return false;
}

async function persistIdempotentResponse(req: Request, statusCode: number, body: unknown): Promise<void> {
  const key = req.get("idempotency-key")?.trim();
  if (!key || !isPersistenceConfigured()) return;
  try {
    await getPool().query(
      `UPDATE public.api_idempotency_keys SET state=$2,response_status=$3,response_body=$4::jsonb,completed_at=now() WHERE idempotency_key=$1`,
      [key, statusCode < 500 ? "completed" : "failed", statusCode, JSON.stringify(body ?? null)],
    );
  } catch (error) {
    console.warn("api idempotency response persistence failed", error instanceof Error ? error.message : String(error));
  }
}

/**
 * Protected responses persist idempotency completion and the write-audit row
 * before the JSON response is finalized. This removes the old fire-and-forget
 * `finish` listener race where the mutation could succeed but its audit record
 * never become durable.
 */
function captureProtectedJsonResponse(
  req: Request,
  res: Response,
  capability: ApiCapability,
  startedAt: number,
  idempotent: boolean,
): void {
  const originalJson = res.json.bind(res);
  let captured = false;
  res.json = ((body: unknown) => {
    if (captured) return res;
    captured = true;
    const statusCode = res.statusCode;
    void (async () => {
      if (idempotent) await persistIdempotentResponse(req, statusCode, body);
      await auditWrite(req, res, capability, startedAt, statusCode);
      originalJson(body);
    })();
    return res;
  }) as typeof res.json;
}

export const apiSecurity: RequestHandler = async (req, res, next) => {
  const startedAt = Date.now();
  const id = requestId(req);
  res.setHeader("X-Request-ID", id);

  try {
    const policy = policyFor(req);
    const safeMethod = SAFE_METHODS.has(req.method.toUpperCase());
    const readLimit = safeMethod && !policy ? readLimitFor(req) : null;
    if (readLimit && !(await distributedRateLimit(req, res, readLimit, `read:${readLimit.prefix}`, "fail-open-read"))) return;

    if (!policy) {
      if (safeMethod) {
        next();
        return;
      }
      if (process.env.NODE_ENV === "production") {
        res.status(403).json({ error: "This write route has no explicit authorization policy.", code: "route_policy_missing" });
        return;
      }
      next();
      return;
    }

    const maxBytes = policy.maxBytes || DEFAULT_WRITE_MAX_BYTES;
    const contentLength = Number(req.get("content-length") || 0);
    if (contentLength > maxBytes) {
      res.status(413).json({ error: "Request body is too large for this endpoint.", code: "request_too_large", maxBytes });
      return;
    }

    const rateLimitAvailability: RateLimitAvailability = policy.capability === "read" ? "fail-open-read" : "fail-closed";
    if (policy.rateLimit && !(await distributedRateLimit(req, res, policy.rateLimit, `${policy.capability}:${policy.prefix}`, rateLimitAvailability))) return;
    if (policy.capability === "read") {
      next();
      return;
    }

    const expected = tokenFor(policy.capability);
    if (!expected) {
      if (process.env.NODE_ENV !== "production") {
        next();
        return;
      }
      res.status(503).json({ error: "Write authorization is not configured for this capability.", code: "write_auth_not_configured" });
      return;
    }
    const supplied = extractBearer(req);
    if (!supplied || !safeEqual(expected, supplied)) {
      res.status(401).json({ error: "Authentication is required for this operation.", code: "write_auth_required" });
      return;
    }

    if (policy.idempotent) {
      const reserved = await reserveIdempotency(req, res);
      if (!reserved) return;
    }
    captureProtectedJsonResponse(req, res, policy.capability, startedAt, Boolean(policy.idempotent));
    next();
  } catch (error) {
    console.error("api security middleware failure", error instanceof Error ? error.message : String(error));
    res.status(503).json({ error: "Security controls are temporarily unavailable.", code: "security_control_unavailable" });
  }
};

export const apiSecurityInternals = { policyFor, readLimitFor, extractBearer, safeEqual, tokenFor, bodyHash };

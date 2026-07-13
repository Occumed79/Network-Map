import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const PROTECTED_WRITE_PREFIXES = [
  "/api/my-clinics",
  "/api/provider-explorer",
  "/api/indexing",
  "/api/provider-sources/import",
  "/api/vector-index",
  "/api/browser-extraction",
  "/api/google-places",
];

function isProtectedWrite(pathname: string, method: string): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return false;
  return PROTECTED_WRITE_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function extractToken(authorization: string | undefined, adminHeader: string | undefined): string {
  if (adminHeader?.trim()) return adminHeader.trim();
  if (!authorization) return "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function tokensMatch(expected: string, supplied: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (expectedBuffer.length !== suppliedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export const requireWriteAuth: RequestHandler = (req, res, next) => {
  if (!isProtectedWrite(req.path, req.method)) {
    next();
    return;
  }

  const configuredToken = process.env.WRITE_API_TOKEN?.trim() || "";
  if (!configuredToken) {
    if (process.env.NODE_ENV !== "production") {
      next();
      return;
    }
    res.status(503).json({
      error: "Write operations are temporarily unavailable because WRITE_API_TOKEN is not configured.",
      code: "write_auth_not_configured",
    });
    return;
  }

  const suppliedToken = extractToken(
    req.get("authorization"),
    req.get("x-admin-token"),
  );

  if (!suppliedToken || !tokensMatch(configuredToken, suppliedToken)) {
    res.status(401).json({
      error: "Authentication is required for this write operation.",
      code: "write_auth_required",
    });
    return;
  }

  next();
};

export const writeAuthInternals = {
  isProtectedWrite,
  extractToken,
  tokensMatch,
};

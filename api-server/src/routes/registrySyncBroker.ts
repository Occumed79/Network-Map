import { createPublicKey, verify } from "node:crypto";
import { Router, type Request, type Response } from "express";
import {
  REGISTRY_DATABASE_CONFIG,
  type RegistryDatabaseId,
} from "@workspace/db";

const router = Router();
const OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const OIDC_AUDIENCE = "network-map-registry-sync";
const OIDC_JWKS_URL = `${OIDC_ISSUER}/.well-known/jwks`;
const EXPECTED_REPOSITORY = "Occumed79/Network-Map";
const ALLOWED_WORKFLOWS = new Set([
  "sync-live-country-registries.yml",
  "sync-europe-dedicated-registries.yml",
  "sync-argentina-refes.yml",
  "sync-brazil-cnes.yml",
  "sync-czechia-nrpzs.yml",
  "sync-finland-ptv.yml",
]);

type JwtHeader = { alg?: string; kid?: string; typ?: string };
type JwtClaims = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  repository?: string;
  ref?: string;
  workflow_ref?: string;
  job_workflow_ref?: string;
};

type RegistryJwk = { kid?: string; [key: string]: unknown };\n\nlet jwksCache: { expiresAt: number; keys: RegistryJwk[] } | null = null;

function decodeSegment<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function bearer(req: Request): string {
  const value = req.get("authorization") || "";
  return value.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
}

function audienceMatches(value: JwtClaims["aud"]): boolean {
  return Array.isArray(value) ? value.includes(OIDC_AUDIENCE) : value === OIDC_AUDIENCE;
}

function workflowAllowed(value: string | undefined): boolean {
  if (!value) return false;
  return [...ALLOWED_WORKFLOWS].some(
    (name) => value === `${EXPECTED_REPOSITORY}/.github/workflows/${name}@refs/heads/main`,
  );
}

async function jwks(): Promise<RegistryJwk[]> {
  if (jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.keys;
  const response = await fetch(OIDC_JWKS_URL, {
    headers: { accept: "application/json", "user-agent": "Occu-Med-Network-Map/registry-sync" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`GitHub OIDC JWKS returned HTTP ${response.status}`);
  const payload = await response.json() as { keys?: RegistryJwk[] };
  if (!Array.isArray(payload.keys) || payload.keys.length === 0) throw new Error("GitHub OIDC JWKS contained no keys");
  jwksCache = { keys: payload.keys, expiresAt: Date.now() + 60 * 60 * 1000 };
  return payload.keys;
}

async function verifyGithubActionsToken(token: string): Promise<JwtClaims> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed GitHub Actions OIDC token");
  const header = decodeSegment<JwtHeader>(parts[0]);
  const claims = decodeSegment<JwtClaims>(parts[1]);
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported GitHub Actions OIDC token");
  let key = (await jwks()).find((candidate) => candidate.kid === header.kid);
  if (!key) {
    jwksCache = null;
    key = (await jwks()).find((candidate) => candidate.kid === header.kid);
  }
  if (!key) throw new Error("GitHub Actions OIDC signing key was not found");
  const verified = verify(
    "RSA-SHA256",
    Buffer.from(`${parts[0]}.${parts[1]}`),
    createPublicKey({ key: key as never, format: "jwk" }),
    Buffer.from(parts[2], "base64url"),
  );
  if (!verified) throw new Error("Invalid GitHub Actions OIDC signature");

  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== OIDC_ISSUER) throw new Error("Unexpected GitHub Actions OIDC issuer");
  if (!audienceMatches(claims.aud)) throw new Error("Unexpected GitHub Actions OIDC audience");
  if (!claims.exp || claims.exp < now - 30) throw new Error("Expired GitHub Actions OIDC token");
  if (claims.nbf && claims.nbf > now + 30) throw new Error("GitHub Actions OIDC token is not active yet");
  if (claims.repository !== EXPECTED_REPOSITORY) throw new Error("Unexpected GitHub repository");
  if (claims.ref !== "refs/heads/main") throw new Error("Registry synchronization is restricted to main");
  if (!workflowAllowed(claims.workflow_ref) && !workflowAllowed(claims.job_workflow_ref)) {
    throw new Error("Workflow is not authorized for registry synchronization");
  }
  return claims;
}

router.post("/registry-sync/connection/:source", async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  const source = String(Array.isArray(req.params.source) ? req.params.source[0] : req.params.source || "") as RegistryDatabaseId;
  if (!(source in REGISTRY_DATABASE_CONFIG)) {
    res.status(404).json({ error: "Unknown registry source.", code: "unknown_registry_source" });
    return;
  }

  try {
    const token = bearer(req);
    if (!token) {
      res.status(401).json({ error: "GitHub Actions OIDC authentication is required.", code: "registry_sync_auth_required" });
      return;
    }
    await verifyGithubActionsToken(token);
    const environmentVariable = REGISTRY_DATABASE_CONFIG[source];
    const connectionString = process.env[environmentVariable]?.trim() || "";
    if (!connectionString.startsWith("postgres")) {
      res.status(503).json({
        error: "The dedicated registry database is not configured.",
        code: "registry_database_not_configured",
        source,
        environmentVariable,
      });
      return;
    }
    res.json({ source, environmentVariable, connectionString });
  } catch (error) {
    console.warn("[RegistrySyncBroker] denied", error instanceof Error ? error.message : String(error));
    res.status(401).json({ error: "Registry synchronization authorization failed.", code: "registry_sync_auth_failed" });
  }
});

export default router;

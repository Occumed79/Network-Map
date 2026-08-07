import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { apiSecurityInternals, ROUTE_POLICIES } from "../src/middleware/apiSecurity";

const root = path.resolve(process.cwd());
const app = fs.readFileSync(path.join(root, "src/app.ts"), "utf8");
const security = fs.readFileSync(path.join(root, "src/middleware/apiSecurity.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "src/db/migrations/20260806_api_security.sql"), "utf8");
const clinicSync = fs.readFileSync(path.join(root, "../occu-med-map/src/myClinicsBackendSync.ts"), "utf8");
const providerSearchRoute = fs.readFileSync(path.join(root, "src/routes/universalDiscovery.ts"), "utf8");

assert.match(app, /origin === sameOrigin \|\| CLIENT_ORIGINS\.includes\(origin\)/, "CORS must explicitly allow only same-origin or configured origins");
assert.match(app, /process\.env\.NODE_ENV !== "production" && CLIENT_ORIGINS\.length === 0/, "open CORS fallback must be development-only");
assert.doesNotMatch(app, /CLIENT_ORIGINS\.length === 0 \|\| CLIENT_ORIGINS\.includes/, "production must not allow every origin when allowlist is empty");
assert.doesNotMatch(app, /rateLimitBuckets = new Map/, "process-local rate limiter must stay retired");
assert.doesNotMatch(app, /writeAuthConfigured|environment: process\.env/, "public health must not expose auth/environment configuration");
assert.match(app, /app\.disable\("x-powered-by"\)/, "Express implementation header must be disabled");
assert.match(app, /redact:/, "structured logging must redact sensitive request material");
assert.match(app, /REQUEST_DEADLINE_MS/, "requests must have a bounded deadline");
assert.match(app, /app\.use\(apiSecurity\)/, "explicit API policy must guard the API before routing");

for (const capability of ["read", "upload", "write", "destructive", "admin"] as const) {
  assert.ok(ROUTE_POLICIES.some((policy) => policy.capability === capability), `route policy must define ${capability} capability`);
}
const providerSearchPolicy = ROUTE_POLICIES.find((policy) => policy.prefix === "/api/provider-sources/search" && policy.methods?.includes("POST"));
assert.equal(providerSearchPolicy?.capability, "read", "read-only provider search POST must have an explicit read policy");
assert.doesNotMatch(providerSearchRoute, /upsertProvider|getDb\(|searchRunsTable|searchRunResultsTable|\.insert\(/, "read-policy provider search must not silently mutate provider/search tables");
assert.match(providerSearchRoute, /persisted:\s*false/, "provider search compatibility metadata must explicitly report that search does not persist");

const providerUploadPolicy = ROUTE_POLICIES.find((policy) => policy.prefix === "/api/provider-uploads" && policy.methods?.includes("POST"));
assert.equal(providerUploadPolicy?.capability, "upload", "provider upload lifecycle must be protected by upload capability");
assert.equal(providerUploadPolicy?.idempotent, true, "provider upload lifecycle writes must require idempotency protection");
const clinicUploadPolicy = ROUTE_POLICIES.find((policy) => policy.prefix === "/api/my-clinics" && policy.methods?.includes("POST"));
assert.equal(clinicUploadPolicy?.capability, "upload", "clinic dataset writes must remain under upload capability");
assert.equal(clinicUploadPolicy?.idempotent, true, "clinic dataset writes must retain replay protection");
const priceDiscoveryPolicy = ROUTE_POLICIES.find((policy) => policy.prefix === "/api/price-discovery" && policy.methods?.includes("POST"));
assert.equal(priceDiscoveryPolicy?.capability, "write", "price-discovery persistence must be explicitly write-protected");
assert.equal(priceDiscoveryPolicy?.idempotent, true, "price-discovery writes must have replay protection");
assert.equal(ROUTE_POLICIES.some((policy) => policy.prefix === "/api/live-finder" && policy.methods?.includes("POST")), false, "nonexistent live-finder POST must not pre-authorize future routes");
assert.equal(ROUTE_POLICIES.some((policy) => policy.prefix === "/api/enhanced-search" && policy.methods?.includes("POST")), false, "nonexistent enhanced-search POST must not pre-authorize future routes");

assert.match(security, /route_policy_missing/, "unclassified production write routes must fail closed");
assert.match(security, /policy.capability === "read"/, "read policies must bypass write-token authentication after rate/size enforcement");
assert.match(security, /prefix: "\/api\/admin"/, "administrative GET/write routes must have an explicit admin policy");
assert.equal((security.match(/distributedRateLimit\(req, res, policy\.rateLimit/g) || []).length, 1, "each explicit route policy must consume its rate-limit bucket only once");
assert.match(security, /api_rate_limit_buckets/, "rate limiting must use a shared database store");
assert.match(security, /Idempotency-Key is required/, "bulk/write operations must require replay protection");
assert.match(security, /api_idempotency_keys/, "idempotency must be persisted across instances/restarts");
assert.match(security, /api_write_audit/, "writes must produce a durable audit record");
assert.match(security, /request_too_large/, "endpoint-specific request size limits must be enforced");
assert.match(security, /security_control_unavailable/, "security store failures must fail closed");

assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.api_rate_limit_buckets/, "distributed rate-limit table must exist");
assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.api_idempotency_keys/, "idempotency table must exist");
assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.api_write_audit/, "write audit table must exist");
assert.match(clinicSync, /idempotency-key/, "frontend bulk uploads must send idempotency keys");

const hashA = apiSecurityInternals.bodyHash({ a: 1 });
const hashB = apiSecurityInternals.bodyHash({ a: 1 });
const hashC = apiSecurityInternals.bodyHash({ a: 2 });
assert.equal(hashA, hashB, "same request body must hash deterministically");
assert.notEqual(hashA, hashC, "different request body must not reuse request hash");

console.log("API authorization, read/write separation, CORS, rate-limit, idempotency and audit hardening smoke passed.");

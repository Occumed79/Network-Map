import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  clearObservabilityForTests,
  diagnosticsFingerprint,
  diagnosticsSnapshot,
  recordError,
  recordTiming,
  recordUploadMetric,
  redactText,
} from "../src/lib/observability";

const root = path.resolve(process.cwd());
const repoRoot = path.resolve(root, "..");

clearObservabilityForTests();
recordTiming("database", "SELECT provider_master", 1_200, true, { parameterCount: 3 });
recordError("external:npi", new Error("request failed for postgresql://user:password@db.example/neondb?sslmode=require and Bearer secret-token"), "external_failed");
recordUploadMetric({ uploadId: "test-upload", status: "committed", accepted: 4, quarantined: 1, rejected: 2, duplicate: 1 });

const snapshot = diagnosticsSnapshot({
  testToken: "sk-proj-this-must-never-survive",
  authorization: "Bearer this-must-never-survive",
  connectionString: "postgresql://owner:password@host/db",
});
const serialized = JSON.stringify(snapshot);
assert.doesNotMatch(serialized, /sk-proj-this-must-never-survive/, "diagnostics must redact OpenAI-style tokens");
assert.doesNotMatch(serialized, /owner:password@host/, "diagnostics must redact database URLs");
assert.doesNotMatch(serialized, /this-must-never-survive/, "diagnostics must redact authorization values");
assert.match(serialized, /\[REDACTED/, "diagnostics must retain explicit redaction markers");
assert.equal(typeof diagnosticsFingerprint(snapshot), "string");
assert.ok(diagnosticsFingerprint(snapshot).length >= 12, "diagnostics fingerprint must be stable enough for support correlation");
assert.equal(redactText("postgresql://u:p@h/db"), "[REDACTED_DATABASE_URL]");
assert.match(redactText("https://example.test/?api_key=secret"), /api_key=\[REDACTED\]/);

const app = fs.readFileSync(path.join(root, "src/app.ts"), "utf8");
const routes = fs.readFileSync(path.join(root, "src/routes/index.ts"), "utf8");
const diagnosticsRoute = fs.readFileSync(path.join(root, "src/routes/diagnostics.ts"), "utf8");
const health = fs.readFileSync(path.join(root, "src/routes/health.ts"), "utf8");
const queryTiming = fs.readFileSync(path.join(root, "src/lib/queryWithStatementTimeout.ts"), "utf8");
const frontendExport = fs.readFileSync(path.join(repoRoot, "occu-med-map/src/technicalDiagnosticsExport.ts"), "utf8");
const frontendMain = fs.readFileSync(path.join(repoRoot, "occu-med-map/src/main.tsx"), "utf8");
const performanceTelemetry = fs.readFileSync(path.join(repoRoot, "occu-med-map/src/mapPerformanceTelemetryRuntime.ts"), "utf8");
const sourceHealth = fs.readFileSync(path.join(root, "src/providerSources/externalSourceRuntime.ts"), "utf8");

assert.match(app, /requestContextMiddleware/, "request IDs must enter async request context before routing");
assert.match(app, /req\.headers\["x-request-id"\]/, "request context must stamp the shared request ID for downstream security/logging");
assert.match(app, /recordUploadMetric/, "upload responses must emit bounded count/status telemetry");
assert.match(app, /recordError/, "unhandled API failures must be captured with correlation context");
assert.match(queryTiming, /recordTiming\('database'/, "database operations must emit timing telemetry");
assert.match(queryTiming, /'slow query'/, "slow database queries must be explicitly logged without parameter values");
assert.doesNotMatch(queryTiming, /params[^\n]*logger\.warn|logger\.warn\([^\n]*params/, "slow-query logging must not include raw parameter values");
assert.match(health, /router\.get\("\/live"/, "liveness must remain distinct from readiness");
assert.match(health, /router\.get\("\/ready"/, "readiness must remain distinct from liveness");
assert.match(diagnosticsRoute, /\/diagnostics\/export/, "one support diagnostics export route is required");
assert.match(diagnosticsRoute, /recentUploadSummary/, "diagnostics export must include bounded import/upload metrics");
assert.match(diagnosticsRoute, /getExternalSourceHealth/, "diagnostics export must include external-source health");
assert.match(routes, /diagnosticsRouter/, "diagnostics export route must actually be mounted");
assert.match(frontendExport, /__NETWORK_MAP_TECHNICAL_DIAGNOSTICS__/, "browser diagnostics export must be explicitly accessible");
assert.match(frontendExport, /__NETWORK_MAP_PERFORMANCE__/, "browser diagnostics export must include map performance state");
assert.match(frontendExport, /\/api\/diagnostics\/export/, "browser diagnostics must correlate with backend report");
assert.match(frontendMain, /technical diagnostics export/, "technical diagnostics module must actually load");
assert.match(performanceTelemetry, /longtask/, "browser diagnostics must include long-task measurements");
assert.match(performanceTelemetry, /usedJSHeapSize/, "browser diagnostics must include memory when exposed");
assert.match(sourceHealth, /successCount/, "external-source health must track successes");
assert.match(sourceHealth, /failureCount/, "external-source health must track failures");
assert.match(sourceHealth, /lastLatencyMs/, "external-source health must track latency");
assert.match(sourceHealth, /lastRequestId/, "external-source health must correlate the last source call to the triggering request");
assert.match(sourceHealth, /recordTiming\("external_source"/, "external-source latency must enter shared timing telemetry");

const unboundedProviderDump = /SELECT\s+\*\s+FROM\s+public\.provider_master/i;
assert.doesNotMatch(diagnosticsRoute, unboundedProviderDump, "technical diagnostics must never dump unbounded provider inventory");
assert.doesNotMatch(frontendExport, /localStorage|sessionStorage/, "technical diagnostics must not dump browser storage contents");

console.log("Observability/request-correlation/diagnostics export smoke passed.");

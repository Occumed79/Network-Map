import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.CI_API_BASE_URL || "http://127.0.0.1:3000";
const writeToken = process.env.WRITE_API_TOKEN || "ci-write-token";
const expectedOrigin = process.env.CLIENT_ORIGIN || "http://127.0.0.1:4173";
const providerDbUrl = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL || "";

function buildApi() {
  execFileSync("pnpm", ["--filter", "@workspace/api-server", "build"], {
    env: process.env,
    stdio: "inherit",
  });
}

function spawnApi() {
  const child = spawn(process.execPath, ["--enable-source-maps", "api-server/dist/index.mjs"], {
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => process.stdout.write(`[api] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[api] ${chunk}`));
  return child;
}

async function request(pathname, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, init);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  return { response, body };
}

async function waitForApi() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const { response } = await request("/api/live");
      if (response.ok) return;
    } catch {}
    await delay(500);
  }
  throw new Error("API did not become live in time");
}

function sqlValue(sql) {
  if (!providerDbUrl) throw new Error("DATABASE_URL or DATABASE_URL_POOLED is required for disposable API acceptance");
  return execFileSync("psql", [providerDbUrl, "-At", "-v", "ON_ERROR_STOP=1", "-c", sql], {
    encoding: "utf8",
    env: process.env,
  }).trim();
}

async function waitForAuditRows(minimum) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const count = Number(sqlValue("SELECT count(*) FROM public.api_write_audit WHERE path LIKE '/api/provider-uploads%';"));
    if (count >= minimum) return count;
    await delay(100);
  }
  return Number(sqlValue("SELECT count(*) FROM public.api_write_audit WHERE path LIKE '/api/provider-uploads%';"));
}

buildApi();
const child = spawnApi();
try {
  await waitForApi();

  const live = await request("/api/live");
  assert.equal(live.response.status, 200);
  assert.deepEqual(live.body, { ok: true });
  assert.ok(live.response.headers.get("x-request-id"), "liveness must carry a request correlation ID");

  const revision = await request("/api/revision");
  assert.equal(revision.response.status, 200);
  assert.deepEqual(Object.keys(revision.body).sort(), ["revision"], "public revision endpoint must expose deployment identity only");

  const ready = await request("/api/ready");
  assert.equal(ready.response.status, 200, `readiness failed: ${JSON.stringify(ready.body)}`);
  assert.equal(ready.body.ok, true);
  assert.equal(ready.body.dependencies.length, 2, "both provider and scoring databases must be checked");

  const allowedCors = await fetch(`${baseUrl}/api/live`, { headers: { Origin: expectedOrigin } });
  assert.equal(allowedCors.headers.get("access-control-allow-origin"), expectedOrigin);
  const blockedCors = await fetch(`${baseUrl}/api/live`, { headers: { Origin: "https://evil.example" } });
  assert.equal(blockedCors.headers.get("access-control-allow-origin"), null, "unknown production origin must not receive CORS permission");

  const staticAsset = await fetch(`${baseUrl}/favicon.svg`, { headers: { Origin: "https://evil.example" } });
  assert.equal(staticAsset.status, 200, "CORS policy must not prevent the browser from loading frontend assets");
  assert.match(staticAsset.headers.get("content-type") || "", /image\/svg\+xml/, "frontend asset must retain its static content type");

  const unauthenticated = await request("/api/provider-uploads/preview", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": "ci-unauth-001" },
    body: JSON.stringify({ sourceLabel: "CI", rows: [{ name: "CI Clinic" }] }),
  });
  assert.equal(unauthenticated.response.status, 401, "upload write must require auth");

  const missingIdempotency = await request("/api/provider-uploads/preview", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${writeToken}` },
    body: JSON.stringify({ sourceLabel: "CI", rows: [{ name: "CI Clinic" }] }),
  });
  assert.equal(missingIdempotency.response.status, 400, "bulk write must require idempotency key");

  const logicalUploadKey = "ci-acceptance-upload";
  const contentHash = "a".repeat(64);
  const preview = await request("/api/provider-uploads/preview", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${writeToken}`,
      "idempotency-key": "ci-preview-001",
    },
    body: JSON.stringify({
      sourceLabel: "CI Acceptance",
      logicalUploadKey,
      contentHash,
      filename: "ci-acceptance.csv",
      chunkIndex: 0,
      chunkCount: 1,
      rows: [{
        facility_name: "CI Acceptance Clinic",
        formatted_address: "100 Test Ave, Fresno, CA 93721",
        city: "Fresno",
        state_region: "CA",
        country_code: "US",
        lat: 36.7378,
        lng: -119.7871,
        phone: "5595550100",
        provider_type: "clinic",
      }],
    }),
  });
  assert.equal(preview.response.status, 201, `preview failed: ${JSON.stringify(preview.body)}`);
  assert.equal(preview.body.commitReady, true);
  assert.equal(preview.body.summary?.byDisposition?.accepted, 1, "valid exact-address row must be accepted for commit");
  const uploadId = preview.body.uploadId;
  assert.ok(uploadId, "preview must return immutable upload ID");

  const beforeCommit = Number(sqlValue("SELECT count(*) FROM public.provider_master WHERE name='CI Acceptance Clinic';"));
  assert.equal(beforeCommit, 0, "preview must not write provider master rows");

  const commit = await request(`/api/provider-uploads/${encodeURIComponent(uploadId)}/commit`, {
    method: "POST",
    headers: { authorization: `Bearer ${writeToken}`, "idempotency-key": "ci-commit-001" },
    body: "{}",
  });
  assert.equal(commit.response.status, 200, `commit failed: ${JSON.stringify(commit.body)}`);
  assert.equal(commit.body.status, "committed");
  assert.equal(commit.body.inserted, 1);

  const afterCommit = Number(sqlValue("SELECT count(*) FROM public.provider_master WHERE name='CI Acceptance Clinic';"));
  assert.equal(afterCommit, 1, "commit must write provider master row transactionally");

  const rollback = await request(`/api/provider-uploads/${encodeURIComponent(uploadId)}/rollback`, {
    method: "POST",
    headers: { authorization: `Bearer ${writeToken}`, "idempotency-key": "ci-rollback-001" },
    body: "{}",
  });
  assert.equal(rollback.response.status, 200, `rollback failed: ${JSON.stringify(rollback.body)}`);
  assert.equal(rollback.body.status, "rolled_back");

  const afterRollback = Number(sqlValue("SELECT count(*) FROM public.provider_master WHERE name='CI Acceptance Clinic';"));
  assert.equal(afterRollback, 0, "rollback must restore pre-upload provider master state");

  const auditCount = await waitForAuditRows(3);
  assert.ok(auditCount >= 3, `preview/commit/rollback writes must be durably audited; found ${auditCount}`);

  console.log("Disposable PostgreSQL API/auth/idempotency/preview/commit/rollback/audit acceptance passed.");
} finally {
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    delay(5_000).then(() => child.kill("SIGKILL")),
  ]);
}

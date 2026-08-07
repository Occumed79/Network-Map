import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import pg from "pg";

const { Pool } = pg;
const baseUrl = process.env.CI_API_BASE_URL || "http://127.0.0.1:3000";
const writeToken = process.env.WRITE_API_TOKEN || "ci-write-token";
const expectedOrigin = process.env.CLIENT_ORIGIN || "http://127.0.0.1:4173";
const apiCommand = process.env.CI_API_COMMAND || "pnpm --filter @workspace/api-server dev";

function spawnApi() {
  const child = spawn("bash", ["-lc", apiCommand], {
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => process.stdout.write(`[api] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[api] ${chunk}`));
  return child;
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
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

const child = spawnApi();
try {
  await waitForApi();

  const live = await request("/api/live");
  assert.equal(live.response.status, 200);
  assert.deepEqual(live.body, { ok: true });

  const revision = await request("/api/revision");
  assert.equal(revision.response.status, 200);
  assert.ok(Object.hasOwn(revision.body, "revision"), "public revision endpoint must expose only deployment identity");

  const ready = await request("/api/ready");
  assert.equal(ready.response.status, 200, `readiness failed: ${JSON.stringify(ready.body)}`);
  assert.equal(ready.body.ok, true);
  assert.equal(ready.body.dependencies.length, 2, "both provider and scoring databases must be checked");

  const allowedCors = await fetch(`${baseUrl}/api/live`, { headers: { Origin: expectedOrigin } });
  assert.equal(allowedCors.headers.get("access-control-allow-origin"), expectedOrigin);
  const blockedCors = await fetch(`${baseUrl}/api/live`, { headers: { Origin: "https://evil.example" } });
  assert.equal(blockedCors.headers.get("access-control-allow-origin"), null, "unknown production origin must not receive CORS permission");

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
        coordinate_status: "verified_address",
        phone: "5595550100",
        provider_type: "clinic",
      }],
    }),
  });
  assert.equal(preview.response.status, 200, JSON.stringify(preview.body));
  assert.equal(preview.body.commitReady, true);
  const uploadId = preview.body.uploadId;
  assert.ok(uploadId);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL });
  try {
    const beforeCommit = await pool.query("SELECT count(*)::int AS count FROM public.provider_master WHERE display_name='CI Acceptance Clinic'");
    assert.equal(beforeCommit.rows[0].count, 0, "preview must not write provider master rows");

    const commit = await request(`/api/provider-uploads/${encodeURIComponent(uploadId)}/commit`, {
      method: "POST",
      headers: { authorization: `Bearer ${writeToken}`, "idempotency-key": "ci-commit-001" },
    });
    assert.equal(commit.response.status, 200, JSON.stringify(commit.body));
    assert.equal(commit.body.status, "committed");

    const afterCommit = await pool.query("SELECT count(*)::int AS count FROM public.provider_master WHERE display_name='CI Acceptance Clinic'");
    assert.equal(afterCommit.rows[0].count, 1, "commit must write provider master row transactionally");

    const rollback = await request(`/api/provider-uploads/${encodeURIComponent(uploadId)}/rollback`, {
      method: "POST",
      headers: { authorization: `Bearer ${writeToken}`, "idempotency-key": "ci-rollback-001" },
    });
    assert.equal(rollback.response.status, 200, JSON.stringify(rollback.body));
    assert.equal(rollback.body.status, "rolled_back");

    const afterRollback = await pool.query("SELECT count(*)::int AS count FROM public.provider_master WHERE display_name='CI Acceptance Clinic'");
    assert.equal(afterRollback.rows[0].count, 0, "rollback must remove the upload's new provider master row");

    const audit = await pool.query("SELECT method,path,status_code FROM public.api_write_audit WHERE path LIKE '/api/provider-uploads%' ORDER BY id");
    assert.ok(audit.rows.length >= 3, "preview/commit/rollback writes must be durably audited");
  } finally {
    await pool.end();
  }

  console.log("Disposable database/API/write/rollback acceptance passed.");
} finally {
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    delay(5_000).then(() => { child.kill("SIGKILL"); }),
  ]);
}

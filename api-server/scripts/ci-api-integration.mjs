import assert from "node:assert/strict";
import { getPool, closeDatabasePools } from "@workspace/db";
import app from "../src/app.ts";

const server = app.listen(0, "127.0.0.1");
await new Promise((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});
const address = server.address();
if (!address || typeof address === "string") throw new Error("API test server failed to bind");
const base = `http://127.0.0.1:${address.port}`;
const writeToken = process.env.WRITE_API_TOKEN || "ci-write-token";

async function request(path, init = {}) {
  const response = await fetch(`${base}${path}`, init);
  const body = await response.json().catch(() => null);
  return { response, body };
}

try {
  const live = await request("/api/live");
  assert.equal(live.response.status, 200);
  assert.equal(live.body?.ok, true);
  assert.ok(live.response.headers.get("x-request-id"), "liveness response must carry request ID");

  const ready = await request("/api/ready");
  assert.equal(ready.response.status, 200, `readiness failed: ${JSON.stringify(ready.body)}`);
  assert.equal(ready.body?.ok, true);
  assert.equal(ready.body?.dependencies?.length, 2, "both provider and scoring databases must be checked");

  const health = await request("/api/health");
  assert.deepEqual(health.body, { ok: true }, "public health response must not expose implementation configuration");

  const badCors = await request("/api/health", { headers: { Origin: "https://evil.example" } });
  assert.ok(badCors.response.status >= 400, "production CORS must reject unlisted cross-origin requests");

  const deniedWrite = await request("/api/provider-uploads/preview", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": "ci-preview-denied-0001" },
    body: JSON.stringify({ sourceLabel: "CI", rows: [{ name: "CI Clinic" }] }),
  });
  assert.equal(deniedWrite.response.status, 401, "upload write must require capability token");

  const missingIdempotency = await request("/api/provider-uploads/preview", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${writeToken}` },
    body: JSON.stringify({ sourceLabel: "CI", rows: [{ name: "CI Clinic" }] }),
  });
  assert.equal(missingIdempotency.response.status, 400, "bulk writes must require replay protection");

  const previewPayload = {
    logicalUploadKey: "ci-logical-upload",
    contentHash: "ci-content-hash-0000000000000001",
    sourceLabel: "CI Provider Dataset",
    filename: "ci-providers.csv",
    chunkIndex: 0,
    chunkCount: 1,
    rows: [{ name: "CI Clinic", address: "123 Main St", city: "Fresno", state: "CA", country: "US", lat: 36.7378, lng: -119.7871 }],
  };
  const preview = await request("/api/provider-uploads/preview", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${writeToken}`, "idempotency-key": "ci-preview-success-0001" },
    body: JSON.stringify(previewPayload),
  });
  assert.equal(preview.response.status, 201, `preview failed: ${JSON.stringify(preview.body)}`);
  assert.ok(preview.body?.uploadId, "preview must return immutable upload ID");
  assert.equal(preview.body?.commitReady, true);

  const masterBefore = await getPool().query("SELECT count(*)::int AS total FROM public.provider_master");
  assert.equal(Number(masterBefore.rows[0].total), 0, "preview must not write master inventory");

  const uploadId = preview.body.uploadId;
  const commit = await request(`/api/provider-uploads/${uploadId}/commit`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${writeToken}`, "idempotency-key": `commit:${uploadId}` },
    body: "{}",
  });
  assert.equal(commit.response.status, 200, `commit failed: ${JSON.stringify(commit.body)}`);
  const masterCommitted = await getPool().query("SELECT count(*)::int AS total FROM public.provider_master");
  assert.equal(Number(masterCommitted.rows[0].total), 1, "commit must atomically create accepted provider inventory");

  const rollback = await request(`/api/provider-uploads/${uploadId}/rollback`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${writeToken}`, "idempotency-key": `rollback:${uploadId}` },
    body: "{}",
  });
  assert.equal(rollback.response.status, 200, `rollback failed: ${JSON.stringify(rollback.body)}`);
  const masterRolledBack = await getPool().query("SELECT count(*)::int AS total FROM public.provider_master");
  assert.equal(Number(masterRolledBack.rows[0].total), 0, "rollback must restore pre-upload provider inventory");

  const audit = await getPool().query("SELECT count(*)::int AS total FROM public.api_write_audit");
  assert.ok(Number(audit.rows[0].total) >= 2, "successful writes must create durable audit records");

  console.log("Disposable-Postgres API/upload/security/readiness integration acceptance passed.");
} finally {
  await new Promise((resolve) => server.close(resolve));
  await closeDatabasePools();
}

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { clearExternalSourceRuntimeForTests, fetchExternalJson, getExternalSourceHealth, ExternalSourceError } from "../src/providerSources/externalSourceRuntime";

const originalFetch = globalThis.fetch;
const root = path.resolve(process.cwd());

try {
  clearExternalSourceRuntimeForTests();
  let attempts = 0;
  globalThis.fetch = (async () => {
    attempts += 1;
    if (attempts === 1) return new Response(JSON.stringify({ error: "busy" }), { status: 503, headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const recovered = await fetchExternalJson<{ ok: boolean }>("npi", "https://example.test/retry", {}, { cache: false });
  assert.equal(recovered.ok, true, "safe transient source error should retry once and recover");
  assert.equal(attempts, 2);
  assert.equal(getExternalSourceHealth().find((source) => source.sourceId === "npi")?.retryCount, 1);

  clearExternalSourceRuntimeForTests();
  globalThis.fetch = (async () => new Response("not-json", { status: 200 })) as typeof fetch;
  await assert.rejects(
    () => fetchExternalJson("nominatim", "https://example.test/malformed", {}, { cache: false }),
    (error: unknown) => error instanceof ExternalSourceError && error.code === "malformed_response",
  );

  clearExternalSourceRuntimeForTests();
  globalThis.fetch = (async () => { throw new TypeError("DNS failed"); }) as typeof fetch;
  for (let index = 0; index < 3; index += 1) {
    await assert.rejects(() => fetchExternalJson("nominatim", `https://example.test/fail-${index}`, {}, { cache: false }));
  }
  const openHealth = getExternalSourceHealth().find((source) => source.sourceId === "nominatim");
  assert.equal(openHealth?.state, "open", "repeated failures must open source circuit");
  await assert.rejects(
    () => fetchExternalJson("nominatim", "https://example.test/circuit", {}, { cache: false }),
    (error: unknown) => error instanceof ExternalSourceError && error.code === "circuit_open",
  );

  clearExternalSourceRuntimeForTests();
  let active = 0;
  let maxActive = 0;
  globalThis.fetch = (async (_input: any, init?: RequestInit) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 25);
      init?.signal?.addEventListener("abort", () => { clearTimeout(timer); reject(init.signal?.reason); }, { once: true });
    });
    active -= 1;
    return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  await Promise.all(Array.from({ length: 5 }, (_, index) => fetchExternalJson("nominatim", `https://example.test/concurrency-${index}`, {}, { cache: false })));
  assert.equal(maxActive, 1, "Nominatim source concurrency limit must be one");

  const npi = fs.readFileSync(path.join(root, "src/providerSources/adapters/npi.ts"), "utf8");
  const osm = fs.readFileSync(path.join(root, "src/providerSources/adapters/openStreetMap.ts"), "utf8");
  const geocode = fs.readFileSync(path.join(root, "src/providerSources/geocode.ts"), "utf8");
  const orchestrator = fs.readFileSync(path.join(root, "src/providerSources/orchestrator.ts"), "utf8");
  const sourceStatus = fs.readFileSync(path.join(root, "src/routes/sourceStatus.ts"), "utf8");
  assert.match(npi, /fetchExternalJson/, "NPI must use shared external-source runtime");
  assert.match(osm, /fetchExternalJson/, "Overpass must use shared external-source runtime");
  assert.match(geocode, /fetchExternalJson/, "geocoders must use shared external-source runtime");
  assert.match(orchestrator, /degradedSources/, "partial searches must explicitly report degraded sources");
  assert.match(sourceStatus, /source-health/, "source health must be separate from application liveness/readiness");
} finally {
  globalThis.fetch = originalFetch;
  clearExternalSourceRuntimeForTests();
}

console.log("External source timeout/retry/circuit/concurrency/degraded-state hardening smoke passed.");

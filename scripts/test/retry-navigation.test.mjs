import assert from "node:assert/strict";
import test from "node:test";

import { navigateWithRetry } from "../lib/retry-navigation.mjs";

test("retries a transient browser navigation before succeeding", async () => {
  let calls = 0;
  const page = {
    async goto() {
      calls += 1;
      if (calls === 1) throw new Error("net::ERR_EMPTY_RESPONSE");
      return { ok: () => true };
    },
  };

  const response = await navigateWithRetry(page, "https://registry.example", { timeout: 1 }, {
    attempts: 2,
    delay: async () => {},
  });

  assert.equal(calls, 2);
  assert.equal(response.ok(), true);
});

test("returns the final navigation error after all retries fail", async () => {
  const page = { async goto() { throw new Error("temporary outage"); } };

  await assert.rejects(
    navigateWithRetry(page, "https://registry.example", { timeout: 1 }, {
      attempts: 2,
      delay: async () => {},
    }),
    /temporary outage/,
  );
});

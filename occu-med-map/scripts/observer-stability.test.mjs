import assert from "node:assert/strict";
import test from "node:test";
import { runWithoutObserverFeedback } from "../src/settledMutationObserver.ts";

test("observer-owned mutations settle without recursively scheduling scans", () => {
  let connected = true;
  let scans = 0;
  let queuedCallbacks = 0;
  const target = {};
  const options = { childList: true, subtree: true };
  const observer = {
    disconnect() { connected = false; },
    observe(actualTarget, actualOptions) {
      assert.equal(actualTarget, target);
      assert.equal(actualOptions, options);
      connected = true;
    },
  };

  const mutate = () => {
    if (connected) queuedCallbacks += 1;
  };
  const scan = () => runWithoutObserverFeedback(observer, target, options, () => {
    scans += 1;
    mutate();
    mutate();
  });

  // One external React mutation schedules one scan. Writes made by that scan
  // occur while disconnected and therefore cannot schedule another scan.
  mutate();
  while (queuedCallbacks > 0 && scans < 100) {
    queuedCallbacks -= 1;
    scan();
  }

  assert.equal(scans, 1);
  assert.equal(queuedCallbacks, 0);
  assert.equal(connected, true);
});


import assert from "node:assert/strict";
import test from "node:test";

import {
  payloadsFromText,
  selectPayload,
  uniqueFacilityIds,
} from "../lib/armenia-uhif-payload.mjs";

test("selects the exact UHIF facility payload instead of a larger unrelated array", () => {
  const unrelated = Array.from({ length: 640 }, (_, index) => ({
    id: `catalog-${index}`,
    name: `Catalog item ${index}`,
  }));
  const facilities = Array.from({ length: 579 }, (_, index) => ({
    id: `facility-${index}`,
    name: `Medical organization ${index}`,
    address: `Address ${index}`,
  }));
  const rsc = `1:${JSON.stringify({ unrelated, nested: { hospitals: facilities } })}\n`;
  const hydration = `<script>self.__next_f.push([1,${JSON.stringify(rsc)}])</script>`;

  const arrays = payloadsFromText(hydration);
  assert.ok(arrays.some((candidate) => candidate.length === 640));
  assert.ok(arrays.some((candidate) => candidate.length === 579));

  const selected = selectPayload(
    arrays.map((hospitals) => ({ hospitals, url: "fixture", bytes: hydration.length })),
    579,
  );
  assert.ok(selected);
  assert.equal(selected.hospitals.length, 579);
  assert.equal(uniqueFacilityIds(selected.hospitals), 579);
  assert.equal(selected.hospitals[0].id, "facility-0");
});

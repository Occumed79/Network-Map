import assert from "node:assert/strict";
import test from "node:test";

import {
  expandOrganizationBranches,
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

test("expands UHIF parent organizations into physical branch facilities", () => {
  const expanded = expandOrganizationBranches([
    {
      id: "org-1",
      name: "First Medical Group",
      legalName: "First Medical Group LLC",
      branches: [
        { id: "branch-1", name: "First Clinic", address: "1 Main Street", lat: 40.1, lng: 44.5 },
        { id: "branch-2", address: "2 Main Street", lat: 40.2, lng: 44.6 },
      ],
    },
    {
      id: "org-2",
      name: "Second Clinic",
      legalName: "Second Clinic LLC",
      branches: [{ id: "branch-3", address: "3 Main Street", lat: 40.3, lng: 44.7 }],
    },
  ]);

  assert.equal(expanded.length, 3);
  assert.equal(uniqueFacilityIds(expanded), 3);
  assert.deepEqual(expanded.map((facility) => facility.id), ["branch-1", "branch-2", "branch-3"]);
  assert.equal(expanded[1].name, "First Medical Group");
  assert.equal(expanded[2].legalName, "Second Clinic LLC");
  assert.equal(expanded[0].organizationId, "org-1");
});

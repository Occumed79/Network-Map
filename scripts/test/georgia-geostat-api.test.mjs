import test from "node:test";
import assert from "node:assert/strict";
import {
  documentCoordinates,
  documentSearchUrl,
  publicRegistryUrl,
} from "../lib/georgia-geostat-api.mjs";

test("builds the official active NACE registry query", () => {
  const url = new URL(documentSearchUrl({ activityCode: "86.10.0", page: 2 }));
  assert.equal(url.origin, "https://br-api.geostat.ge");
  assert.equal(url.searchParams.get("activityCode"), "86.10.0");
  assert.equal(url.searchParams.get("isActive"), "true");
  assert.equal(url.searchParams.get("page"), "2");
});

test("uses GeoStat X/Y only when they are Georgian map coordinates", () => {
  assert.deepEqual(documentCoordinates({ X: 41.6134148, Y: 44.9083572 }), { lat: 41.6134148, lng: 44.9083572 });
  assert.equal(documentCoordinates({ X: 0, Y: 0 }), null);
  assert.equal(publicRegistryUrl({ Legal_Code: "102251545" }), "https://br.geostat.ge/register_geo/?identificationNumber=102251545");
});

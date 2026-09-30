import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildProviderKey, buildSearchKey, isPersistableSource, shardForKey } from "../src/lib/autosaveCache";

const params = { sourceMode:"liveFinder", serviceCategory:"dental", centerLat:36.7378, centerLng:-119.7871, radiusMiles:25 };
assert.equal(buildSearchKey(params), buildSearchKey({...params}), "same effective search must keep one cache key");
assert.notEqual(buildSearchKey(params), buildSearchKey({...params, serviceCategory:"lab"}), "service category must affect cache key");

assert.equal(isPersistableSource("OpenStreetMap"), true);
assert.equal(isPersistableSource("NPI Registry"), true);
assert.equal(isPersistableSource("Google Places"), false);
assert.equal(isPersistableSource("Google Places API"), false);
assert.equal(isPersistableSource("google_maps"), false);

const candidate:any = {
  id:"provider-1", name:"Example Clinic", address:"123 Main St", city:"Fresno", state:"CA",
  postalCode:"93711", lat:36.8, lng:-119.8, source:"OpenStreetMap", phone:"5595551212",
  website:"https://example.org", services:["dental"], providerCategory:"clinic",
};
const key1=buildProviderKey(candidate);
const key2=buildProviderKey({...candidate});
assert.equal(key1,key2,"provider key must be deterministic");
assert.equal(shardForKey(key1),shardForKey(key1),"provider shard must be deterministic");

const apiRoot=path.resolve(process.cwd());
const liveFinder=readFileSync(path.join(apiRoot,"src/routes/liveFinder.ts"),"utf8");
const app=readFileSync(path.join(apiRoot,"../occu-med-map/src/App.tsx"),"utf8");
const indexSql=readFileSync(path.join(apiRoot,"src/db/autosave/20261001_autosave_search_cache.sql"),"utf8");
const shardSql=readFileSync(path.join(apiRoot,"src/db/autosave/20261001_autosave_provider_shard.sql"),"utf8");

assert.match(indexSql,/CREATE TABLE IF NOT EXISTS autosave_search_cache/);
assert.doesNotMatch(indexSql,/autosave_providers/,"index DB schema must not create provider shard tables");
assert.match(shardSql,/CREATE TABLE IF NOT EXISTS autosave_providers/);
assert.doesNotMatch(shardSql,/autosave_search_cache/,"provider shard schema must not create the cache index");
assert.match(liveFinder,/unified\.results\.length > 0 && !unified\.incomplete/,"degraded searches must not be cached");
assert.match(app,/const autosaveHit=Boolean\(backendData\?\.cacheHit\) && !forceRefresh/,"frontend must recognize autosave hits");
assert.match(app,/if\(!autosaveHit\)[\s\S]*\/api\/enhanced-search/,"Google/enhanced search must be skipped on a fresh cache hit");
assert.match(app,/forceRefresh:'true'/,"Nearby force refresh must bypass autosave cache");

console.log("Autosave cache contract smoke passed.");

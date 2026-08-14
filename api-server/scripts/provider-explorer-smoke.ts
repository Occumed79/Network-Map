import assert from 'node:assert/strict';
import { classifyProvider } from '../src/lib/providerClassifier';
import { hasValidCoordinates, parseOptionalNumber } from '../src/lib/providerCoordinates';
import { buildLiveCacheKeyForTest, buildStoredWhereForTest, legacyProviderSelectForTest } from '../src/routes/providerExplorer';
import { mergeMyClinicsLayerProviders } from '../src/routes/providerLayers';

assert.equal(classifyProvider({ name: 'AFC Urgent Care' }), 'urgentCare');
assert.equal(classifyProvider({ services: ['Audiogram testing'] }), 'audiogram');

const blueHive = buildStoredWhereForTest({ source: 'bluehive', includeLive: false, includeStored: true, includeSaved: true, includeCandidates: true }, 'legacy', 'numeric-fallback');
assert.match(blueHive.where, /LOWER\(COALESCE\(mp\.data_source/);
assert.deepEqual(blueHive.params, ['BlueHive']);

const radius = buildStoredWhereForTest({ lat: 49.2827, lng: -123.1207, radiusMiles: 25, includeLive: false, includeStored: true, includeSaved: true, includeCandidates: true }, 'legacy', 'numeric-fallback');
assert.match(radius.where, /3959 \* acos/);
assert.ok(radius.params.includes(25));

const bounds = buildStoredWhereForTest({ bounds: { north: 50, south: 49, east: -122, west: -124 }, includeLive: false, includeStored: true, includeSaved: true, includeCandidates: true }, 'legacy', 'numeric-fallback');
assert.match(bounds.where, /mp\.lat BETWEEN/);
assert.match(bounds.where, /mp\.lng BETWEEN/);

const liveGuard = buildStoredWhereForTest({ source: 'live', includeLive: true, includeStored: true, includeSaved: true, includeCandidates: true }, 'legacy', 'numeric-fallback');
assert.match(liveGuard.where, /FALSE/);

const canonicalIndexed = buildStoredWhereForTest({ source: 'indexed', includeLive: false, includeStored: true, includeSaved: false, includeCandidates: false }, 'canonical', 'numeric-fallback');
assert.match(canonicalIndexed.where, /pmv\.source_kind = 'stored'/);
assert.match(canonicalIndexed.where, /dentist_dataset/);
assert.match(canonicalIndexed.where, /my_clinics_upload/);

const liveScope = { lat: 34.0522, lng: -118.2437, radiusMiles: 10 };
assert.notEqual(
  buildLiveCacheKeyForTest({ ...liveScope, q: 'urgent care' }),
  buildLiveCacheKeyForTest({ ...liveScope, q: 'dentist' }),
  'live cache keys must isolate text queries',
);

assert.equal(parseOptionalNumber(''), null);
assert.equal(parseOptionalNumber('   '), null);
assert.equal(parseOptionalNumber('0'), 0);
assert.equal(hasValidCoordinates(parseOptionalNumber(''), parseOptionalNumber('-118.25')), false);

const legacyProjection = legacyProviderSelectForTest();
assert.match(legacyProjection, /COALESCE\(mp\.scraped_at, mp\.updated_at\) AS imported_at/);
assert.doesNotMatch(legacyProjection, /mp\.created_at/);
assert.match(legacyProjection, /COALESCE\(NULLIF\(mp\.source_id, ''\), 'legacy:' \|\| mp\.id::text\) AS id/);

const mergedMyClinics = mergeMyClinicsLayerProviders(
  [{ name: 'Uploaded Clinic', lat: 34.05, lng: -118.24, source_id: 'upload:1' }],
  [{ name: 'Saved Candidate', lat: 34.06, lng: -118.25, source_id: 'candidate:1' }],
);
assert.deepEqual(mergedMyClinics.map((provider) => provider.name), ['Saved Candidate', 'Uploaded Clinic']);

console.log('provider explorer smoke tests passed');

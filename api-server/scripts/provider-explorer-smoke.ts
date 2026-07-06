import assert from 'node:assert/strict';
import { classifyProvider } from '../src/lib/providerClassifier';
import { buildStoredWhereForTest } from '../src/routes/providerExplorer';

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

console.log('provider explorer smoke tests passed');

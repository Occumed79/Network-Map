import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  autoVisualizationForZoom,
  buildViewportParams,
  effectiveVisualization,
  gridCellBounds,
  providerMatchesTrustTier,
  uniqueProviders,
  type PhaseTwoLayerFilters,
} from '../src/phaseTwoLayerModel';

assert.equal(autoVisualizationForZoom(3), 'density');
assert.equal(autoVisualizationForZoom(6), 'density');
assert.equal(autoVisualizationForZoom(7), 'grid');
assert.equal(autoVisualizationForZoom(10), 'grid');
assert.equal(autoVisualizationForZoom(11), 'pins');
assert.equal(effectiveVisualization('auto', 5, 'all'), 'density');
assert.equal(effectiveVisualization('auto', 8, 'verified'), 'pins');
assert.equal(effectiveVisualization('grid', 13, 'all'), 'grid');

const filters: PhaseTwoLayerFilters = {
  source: 'bluehive',
  query: 'occupational medicine',
  country: 'US',
  adminArea: 'CA',
  city: 'Fresno',
  service: 'physical exam',
  trustTier: 'all',
  includeStored: true,
  includeSaved: true,
  includeCandidates: false,
  includeLive: false,
};
const params = buildViewportParams(
  { north: 37, south: 36, east: -119, west: -120 },
  filters,
  'pins',
  2,
  5000,
);
assert.equal(params.get('north'), '37');
assert.equal(params.get('south'), '36');
assert.equal(params.get('east'), '-119');
assert.equal(params.get('west'), '-120');
assert.equal(params.get('useBounds'), 'true');
assert.equal(params.get('source'), 'bluehive');
assert.equal(params.get('service'), 'physical exam');
assert.equal(params.get('page'), '2');
assert.equal(params.get('limit'), '5000');
assert.equal(params.get('includeCandidates'), 'false');

assert.equal(providerMatchesTrustTier({ id: '1', trust_tier: 'verified' }, 'verified'), true);
assert.equal(providerMatchesTrustTier({ id: '2', trust_tier: 'directory' }, 'verified'), false);
assert.equal(providerMatchesTrustTier({ id: '3', trust_tier: 'lead' }, 'all'), true);

assert.deepEqual(
  uniqueProviders([
    { id: 'a', source: 'one' },
    { id: 'a', source: 'two' },
    { id: 'b', source: 'three' },
  ]).map((provider) => provider.id),
  ['a', 'b'],
);

assert.deepEqual(gridCellBounds(36.75, -119.75, 2), [
  [36.745, -119.755],
  [36.755, -119.745],
]);

const here = dirname(fileURLToPath(import.meta.url));
const shell = readFileSync(resolve(here, '../src/PhaseTwoShell.tsx'), 'utf8');
assert.match(shell, /One viewport-scoped layer manager/);
assert.match(shell, /while \(hasMore\)/);
assert.match(shell, /Pagination stopped because the server returned no new provider IDs/);
assert.match(shell, /Grid cells are coordinate bins—not hexagons/);
assert.match(shell, /Trust filters use individual provider mode/);
assert.match(shell, /Viewport Results/);
assert.doesNotMatch(shell, /slice\(0,\s*1000\)/);
assert.doesNotMatch(shell, /visibleCapped:\s*true/);

const bridge = readFileSync(resolve(here, '../src/phaseTwoMapBridge.ts'), 'utf8');
assert.match(bridge, /occumed:p2-map-change/);
assert.match(bridge, /moveend zoomend resize/);

console.log('P2 map and unified layer-manager smoke tests passed');

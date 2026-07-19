import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  autoVisualizationForZoom,
  buildViewportParams,
  effectiveVisualization,
  gridCellBounds,
  providerMatchesSourceKind,
  providerMatchesTrustTier,
  selectedSourceKinds,
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
assert.equal(effectiveVisualization('density', 4, 'all', ['live']), 'pins');
assert.equal(effectiveVisualization('grid', 8, 'all', ['candidate']), 'pins');

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
assert.equal(params.get('p2'), null);
assert.equal(params.get('north'), '37');
assert.equal(params.get('south'), '36');
assert.equal(params.get('east'), '-119');
assert.equal(params.get('west'), '-120');
assert.equal(params.get('useBounds'), 'true');
assert.equal(params.get('source'), 'bluehive');
assert.equal(params.get('source_kind'), 'stored');
assert.equal(params.get('service'), 'physical exam');
assert.equal(params.get('page'), '2');
assert.equal(params.get('limit'), '5000');
assert.equal(params.get('includeCandidates'), 'false');

assert.deepEqual(selectedSourceKinds({ ...filters, source: 'all' }), ['stored', 'saved']);
assert.deepEqual(selectedSourceKinds({ ...filters, source: 'all', includeStored: false, includeSaved: false, includeLive: true }), ['live']);
assert.deepEqual(selectedSourceKinds({ ...filters, source: 'candidates' }), ['candidate']);

assert.equal(providerMatchesTrustTier({ id: '1', trust_tier: 'verified' }, 'verified'), true);
assert.equal(providerMatchesTrustTier({ id: '2', trust_tier: 'directory' }, 'verified'), false);
assert.equal(providerMatchesTrustTier({ id: '3', trust_tier: 'lead' }, 'all'), true);
assert.equal(providerMatchesSourceKind({ id: '4', source_kind: 'saved', source: 'My Clinics' }, 'saved'), true);
assert.equal(providerMatchesSourceKind({ id: '5', source_kind: 'stored', source: 'BlueHive' }, 'stored'), true);
assert.equal(providerMatchesSourceKind({ id: '6', source_kind: 'candidate' }, 'stored'), false);

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
assert.match(shell, /const toggleProviderIntelligence = useCallback/);
assert.match(shell, /aria-pressed=\{layersEnabled\}/);
assert.match(shell, /layersEnabled \? 'Pause' : 'Start'/);
assert.match(shell, /setLoading\(false\);\s+resetViewportResults\('P2 provider layers are paused\.'/);
assert.match(shell, /if \(requestRef\.current === controller\)/);
assert.match(shell, /requestRef\.current = null;\s+setLoading\(false\);/);
assert.doesNotMatch(shell, /<label className="p2-master-toggle">/);
assert.doesNotMatch(shell, /slice\(0,\s*1000\)/);
assert.doesNotMatch(shell, /visibleCapped:\s*true/);
assert.doesNotMatch(shell, /retitleLegacyMapTools/);
assert.doesNotMatch(shell, /createTreeWalker/);
assert.doesNotMatch(shell, /new MutationObserver/);

const bridge = readFileSync(resolve(here, '../src/phaseTwoMapBridge.ts'), 'utf8');
assert.match(bridge, /occumed:p2-map-change/);
assert.match(bridge, /moveend zoomend resize/);
assert.match(bridge, /registerMap\(map\);/);
assert.doesNotMatch(bridge, /setTimeout\(\(\) => registerMap\(map\),\s*0\)/);


const main = readFileSync(resolve(here, '../src/main.tsx'), 'utf8');
assert.match(main, /p2-preview/);
// providerLayerRequestRuntime is now statically imported by App.tsx (not dynamic-imported by main.tsx)
assert.doesNotMatch(main, /window\.fetch\s*=/); // must not monkey-patch fetch
assert.match(main, /import\("\.\/providerLayerTelemetryRuntime"\)/);
assert.doesNotMatch(main, /phaseTwoPreviewIsolation/);
assert.match(main, /import\("\.\/phaseTwoMapBridge"\)/);
assert.match(main, /import\("\.\/phase-two-control-fix\.css"\)/);
assert.match(main, /import\("\.\/PhaseTwoShell"\)/);
assert.doesNotMatch(main, /phaseTwoLegacyLayerBridge/);
assert.match(main, /root\.render\(<App \/>\)/);

const app = readFileSync(resolve(here, '../src/App.tsx'), 'utf8');
assert.match(app, /from ['"]\.\/providerLayerRequestRuntime['"]/);
assert.match(app, /fetchProviderLayer/);

const routeIndex = readFileSync(resolve(here, '../../api-server/src/routes/index.ts'), 'utf8');
assert.doesNotMatch(routeIndex, /providerExplorerP2Read/);

const providerExplorer = readFileSync(resolve(here, '../../api-server/src/routes/providerExplorer.ts'), 'utf8');
assert.match(providerExplorer, /COALESCE\(mp\.scraped_at, mp\.updated_at\) AS imported_at/);
assert.doesNotMatch(providerExplorer, /mp\.created_at AS imported_at/);

const diagnosticsGate = readFileSync(resolve(here, '../src/usDiagnosticsGate.ts'), 'utf8');
assert.match(diagnosticsGate, /scheduleDiagnosticsSync/);
assert.match(diagnosticsGate, /clearTimeout\(syncTimer\)/);

console.log('P2 preview uses the unified provider route, avoids global runtime patches, and keeps loading and pagination stable');

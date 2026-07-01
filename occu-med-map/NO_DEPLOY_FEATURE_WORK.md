# No-Deploy Feature Work

Branch: `no-deploy-feature-work`

This branch is for continuing feature/architecture work without triggering Render production redeploys from `main`.

## Why this branch exists

Main is currently deployed on Render and runtime minutes are a concern. Continue work here until the next batch is ready for a single intentional merge/deploy.

## Current focus

### 1. Native drive-time result integration

Goal: replace the temporary DOM/MutationObserver ETA card injection with real React state and result-card rendering.

New branch foundation:

- `src/features/driveTime/providerEtaTypes.ts`
- `src/features/driveTime/providerEtaEngine.ts`
- `src/features/driveTime/providerEtaStore.ts`
- `src/features/driveTime/providerEtaExport.ts`
- `src/features/driveTime/leafletProviderAdapter.ts`
- `src/features/driveTime/useProviderEta.ts`
- `src/features/driveTime/ProviderEtaBadge.tsx`
- `src/features/driveTime/DriveTimeControlStrip.tsx`
- `src/features/driveTime/index.ts`

Target behavior:

```text
Live Finder results
  → convert to EtaProviderCandidate[]
  → rankProvidersByEta(origin, candidates)
  → store result in providerEtaStore
  → React result cards render ETA / Route / Copy natively
```

Native pieces now available:

```text
ETA types
ETA ranking engine
ETA global store contract
Leaflet marker adapter
Live Finder result adapter
React ETA hook
ETA badge component
Drive-time control strip component
CSV/text export helpers
```

### 2. Remove temporary DOM bridges

Eventually remove or retire:

- `rightPanelCompactor.ts` ETA card injection logic
- `liveFinderDriveTools.ts` click-proxy behavior
- name-based matching from DOM text

These were useful to ship quickly but should not be the final architecture.

### 3. MapLibre migration

Keep renderer/package work off main until the lockfile is regenerated and a branch build is verified.

Existing migration branch:

```text
maplibre-start
```

Existing draft PR:

```text
#52 — Draft: MapLibre renderer migration scaffold
```

Next MapLibre branch steps:

```text
1. Add maplibre-gl dependency on the migration branch only.
2. Regenerate and commit pnpm-lock.yaml.
3. Add VITE_MAP_RENDERER=leaflet|maplibre feature flag.
4. Move providers into GeoJSON source/layers.
5. Move routes and isochrones into vector layers.
6. Add GPU heatmap/density layer.
7. Build/test branch before merging.
```

## Do not do from this branch

- Do not merge to main until Alex explicitly approves.
- Do not trigger Render deploys.
- Do not add dependencies on main.
- Do not replace the current stable deployed app without a build check.

# Native Drive-Time Feature

This folder contains the native replacement for the temporary DOM-based ETA ranking integration.

## Purpose

Move drive-time ranking into reusable app code:

```text
provider results -> ETA candidates -> Mapbox Directions -> ranked ETA result -> React cards
```

## Feature flag

The no-deploy branch imports a dormant runtime through `main.tsx`.

It activates only when:

```text
VITE_NATIVE_DRIVE_TIME=true
```

Without that flag, the runtime exits immediately and does not add controls or map listeners.

## Main modules

- `providerEtaTypes.ts` — shared types
- `providerEtaEngine.ts` — ranking engine and distance prep
- `providerEtaStore.ts` — lightweight app-level result store
- `providerEtaExport.ts` — CSV/text export helpers
- `leafletProviderAdapter.ts` — converts Leaflet markers and Live Finder results into ETA candidates
- `useProviderEta.ts` — React hook for ranking/clearing/copying ETA results
- `ProviderEtaBadge.tsx` — card-level ETA badge and actions
- `DriveTimeControlStrip.tsx` — native result-panel control strip
- `etaRouteEvents.ts` — route request event bridge
- `leafletEtaRouteLayer.ts` — Leaflet route drawing helper
- `nativeDriveTimeRuntime.ts` — feature-flagged Leaflet runtime for branch testing

## Replacement target

Eventually replace or retire:

- `rightPanelCompactor.ts` ETA card injection
- `liveFinderDriveTools.ts` click-proxy behavior
- DOM text matching for provider cards

## Merge rule

Do not merge to `main` until this is wired into `App.tsx`, built, and visually checked on a non-production branch.

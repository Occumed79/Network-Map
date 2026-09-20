# Native Drive-Time Feature

Drive-time ranking is owned by React and Mapbox GL.

## Flow

```text
provider results -> ETA candidates -> Mapbox Directions -> ranked ETA result -> React cards -> Mapbox route
```

## Main modules

- `providerEtaTypes.ts` — shared types
- `providerEtaEngine.ts` — ranking engine and distance prep
- `providerEtaStore.ts` — app-level result store
- `providerEtaExport.ts` — CSV/text export helpers
- `providerCandidateAdapter.ts` — converts normalized provider results into ETA candidates
- `useProviderEta.ts` — React hook for ranking/clearing/copying ETA results
- `ProviderEtaBadge.tsx` — card-level ETA badge and actions
- `DriveTimeControlStrip.tsx` — native result-panel control strip
- `etaRouteEvents.ts` — route request event bridge
- `mapboxEtaRouteLayer.ts` — Mapbox route drawing
- `nativeDriveTimeRuntime.ts` — Mapbox route-layer lifecycle owner

There is no DOM-injection fallback and no drive-time feature flag. The native implementation is the only Live Finder ETA path.

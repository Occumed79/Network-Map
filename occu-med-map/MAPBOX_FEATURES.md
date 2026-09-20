# Mapbox Feature Rollout

This app currently uses Mapbox in a deploy-safe way: no new runtime packages and no lockfile changes.

## Environment

Render must provide:

```text
VITE_MAPBOX_TOKEN=<Mapbox public token>
```

The token must not be committed to the repository.

## Current Mapbox features

These features now sit behind one consolidated `Map Tools` command panel instead of separate stacked controls.

- Mapbox GL is the authoritative map engine for both the flat 2D map and optional globe
- Basemap switcher: Streets, Light, Terrain, Satellite
- Mapbox geocoding search
- Mapbox reverse geocoding when clicking the map
- Origin selection from clicked locations
- Alt-click route drawing from selected origin
- Drive/service-zone isochrone polygons
- Provider ETA Ranking: ranks visible pins by Mapbox drive-time and draws a selected route
- Live Finder ETA card integration: applies ranked ETA badges and Route buttons directly inside result cards
- Live Finder Drive-Time Tools strip: Rank by Drive Time, Apply ETA, Copy ETA, and Clear actions directly inside the results panel
- Copy ETA output for notes, emails, or internal case updates
- Provider Density Field: draws native Mapbox density overlays over visible provider pins
- Live Finder panel compactor: pushes result blocks higher and collapses secondary filter/source controls

## Deploy constraint

Render has been using a dashboard build command with:

```bash
pnpm install --frozen-lockfile
```

Do not add dependencies to `package.json` unless `pnpm-lock.yaml` is regenerated and committed. A previous attempt to add `@mapbox/mapbox-gl-style-spec` broke deploys because the lockfile was not updated.

## Next phase

The MapLibre migration has started on branch `maplibre-start` and draft PR #52. Keep renderer/package changes isolated there until the lockfile and Render build are verified.


## Provider point rendering authority

All provider points render through Mapbox GL GeoJSON sources and native style layers. The authoritative low-level owner is `providerPointNativeRuntime.ts`.

Logical datasets remain separate so users can toggle them independently. A provider being rendered by Mapbox does **not** mean Mapbox supplied that provider record. Examples include stored Neon providers, Overture, Healthsites, U.S. Embassy data, BlueHive, uploaded datasets, Provider Explorer, and live discovery results.

Production code must not introduce Leaflet provider markers, DOM-backed `mapboxgl.Marker` provider pins, or a second provider-point rendering engine. CI enforces this with the zero-Leaflet and provider-rendering-authority gates.

## Mapbox token resilience

`VITE_MAPBOX_TOKEN_2` is preferred for the 2D map with `VITE_MAPBOX_TOKEN` as fallback. The 3D map uses the reverse preference. If the preferred token cannot initialize the map, the runtime retries with the other configured token.

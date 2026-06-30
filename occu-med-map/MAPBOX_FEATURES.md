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

- Mapbox basemap upgrade for the default Leaflet/OpenStreetMap tile layer
- Basemap switcher: Streets, Light, Terrain, Satellite
- Mapbox geocoding search
- Mapbox reverse geocoding when clicking the map
- Origin selection from clicked locations
- Alt-click route drawing from selected origin
- Drive/service-zone isochrone polygons
- Provider ETA Ranking: ranks visible pins by Mapbox drive-time and draws a selected route
- Live Finder ETA card integration: applies ranked ETA badges and Route buttons directly inside result cards
- Copy ETA output for notes, emails, or internal case updates
- Provider Density Field: draws lightweight Leaflet density halos over visible provider pins
- Live Finder panel compactor: pushes result blocks higher and collapses secondary filter/source controls

## Deploy constraint

Render has been using a dashboard build command with:

```bash
pnpm install --frozen-lockfile
```

Do not add dependencies to `package.json` unless `pnpm-lock.yaml` is regenerated and committed. A previous attempt to add `@mapbox/mapbox-gl-style-spec` broke deploys because the lockfile was not updated.

## Next phase

The MapLibre migration has started on branch `maplibre-start` and draft PR #52. Keep renderer/package changes isolated there until the lockfile and Render build are verified.

# Mapbox Feature Rollout

This app currently uses Mapbox in a deploy-safe way: no new runtime packages and no lockfile changes.

## Environment

Render must provide:

```text
VITE_MAPBOX_TOKEN=<Mapbox public token>
```

The token must not be committed to the repository.

## Current Mapbox features

- Mapbox basemap upgrade for the default Leaflet/OpenStreetMap tile layer
- Basemap switcher: Streets, Light, Terrain, Satellite
- Mapbox geocoding search in the Mapbox Intelligence control
- Mapbox reverse geocoding when clicking the map
- Origin selection from clicked locations
- Mapbox route drawing from selected origin
- Drive/service-zone isochrone polygons
- Route profile controls: Traffic, Drive, Walk
- Zone presets: 15/30, 15/30/45, 15/30/45/60

## Deploy constraint

Render has been using a dashboard build command with:

```bash
pnpm install --frozen-lockfile
```

Do not add dependencies to `package.json` unless `pnpm-lock.yaml` is regenerated and committed. A previous attempt to add `@mapbox/mapbox-gl-style-spec` broke deploys because the lockfile was not updated.

## Next phase

The next major upgrade is a true Mapbox GL or MapLibre renderer migration for native vector styling, globe, heatmaps, and high-performance GeoJSON layers. That should be done in a branch with a regenerated lockfile and verified build.

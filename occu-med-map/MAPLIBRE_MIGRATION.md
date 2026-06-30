# MapLibre Renderer Migration

Branch: `maplibre-start`

This branch starts the isolated architecture phase for moving the map renderer from Leaflet-raster behavior toward a MapLibre/Mapbox-GL-style vector renderer.

## Why this is isolated from main

The production app currently deploys with a frozen pnpm lockfile. Adding MapLibre or Mapbox GL dependencies directly on main risks breaking Render again unless the lockfile is regenerated and committed.

This branch is the safe place to introduce:

- `maplibre-gl`
- `react-map-gl` or a custom MapLibre bridge if needed
- native vector styles
- GeoJSON provider sources
- GPU heatmaps
- density layers
- globe/international mode
- route and service-zone layers

## Target architecture

```text
Live Finder / provider data
        ↓
Provider GeoJSON source
        ↓
MapLibre map source/layers
        ↓
Style layers:
  - provider pins
  - selected provider
  - route line
  - isochrone polygons
  - density/heatmap
  - network coverage field
```

## Migration phases

### Phase 1 — Adapter boundary

Create a renderer boundary so the app does not call Leaflet directly everywhere.

Planned adapter methods:

```ts
setCenter(lat, lng, zoom?)
setProviderSource(features)
setRouteLine(feature)
setServiceZones(featureCollection)
setDensityVisible(enabled)
setBasemap(styleId)
```

### Phase 2 — Package and lockfile work

Run local install on this branch, commit both `package.json` and `pnpm-lock.yaml`, then verify:

```bash
pnpm install
pnpm --filter @workspace/occu-med-map build
```

### Phase 3 — Parallel renderer

Add the MapLibre renderer behind a feature flag:

```text
VITE_MAP_RENDERER=leaflet | maplibre
```

### Phase 4 — Move data layers

Move these from DOM/Leaflet overlay behavior into vector/GeoJSON layers:

- live providers
- Provider ETA ranking route lines
- isochrone zones
- provider density field
- highlighted search/origin marker

### Phase 5 — Promote to main

Only merge when Render build is verified and the Leaflet fallback still works.

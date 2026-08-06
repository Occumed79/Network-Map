# Network Map runtime ownership

This document defines the authoritative owners for global browser behavior. New runtimes must register a stable owner ID through `runtimeControllerRegistry.ts`. Duplicate owner IDs are blocked and CI fails if source declares the same owner ID more than once.

## Authoritative owners

| Responsibility | Owner ID | Source |
| --- | --- | --- |
| Leaflet map lifecycle and initializer execution | `leaflet-map-lifecycle` | `leafletMapLifecycleRuntime.ts` |
| Mapbox map lifecycle and initializer execution | `mapbox-map-lifecycle` | `mapboxMapLifecycleRuntime.ts` |
| Browser request middleware / `window.fetch` interception | `network-request-pipeline` | `networkRequestPipelineRuntime.ts` |
| Map Tools / Mapbox basemap bridge | `map-controls-bridge` | `mapControlsBridgeRuntime.ts` |
| Uploaded dataset labels in upload controls and provider popups | `uploaded-dataset-labels` | `uploadedDatasetLabelRuntime.ts` |
| Provider inventory and viewport telemetry | `provider-layer-telemetry` | `providerLayerTelemetryRuntime.ts` |
| Finder result-card ETA decoration | `right-panel-compactor` | `rightPanelCompactor.ts` |
| Finder drive-time action strip | `live-finder-drive-tools` | `liveFinderDriveTools.ts` |
| U.S. diagnostics visibility/synchronization | `us-diagnostics-gate` | `usDiagnosticsGate.ts` |

## DOM observation policy

`runtimeControllerRegistry.ts` owns the shared application `MutationObserver`. Legacy or third-party DOM integrations subscribe to it through `subscribeToSharedDomObserver` rather than creating another full-document observer.

Direct `MutationObserver` ownership is temporarily allow-listed only for runtimes not yet migrated. `scripts/runtime-ownership-smoke.ts` contains that explicit migration list and fails when a new independent observer appears outside it. The allow-list must shrink over time; adding new entries requires justification in the pull request.

The integrity monitor is diagnostic. It must not become the authority that repeatedly repairs ownership conflicts after render.

## Required eager runtime order

`main.tsx` must load these foundational owners before feature runtimes:

1. `leafletMapLifecycleRuntime`
2. `mapboxMapLifecycleRuntime`
3. `mapboxSourcePipelineRuntime`
4. `networkRequestPipelineRuntime`
5. feature/request consumers such as uploaded dataset labeling and admin API integration
6. map controls and diagnostics integrations
7. React `App`
8. optional runtime integrations after first render

Map/provider integrations must register with the lifecycle/request owners rather than patching the underlying map factory, source API, or `window.fetch` independently.

## Stylesheet direction

The current stylesheet stack still contains legacy and overlapping files. Until the component/design-token consolidation is finished, stylesheet order is treated as compatibility-sensitive and must not be casually reordered. The target state is:

1. third-party Leaflet/Mapbox CSS
2. design tokens / typography primitives
3. application shell/layout primitives
4. reusable controls (buttons, fields, tabs, cards, dialogs, overlays)
5. feature-specific styles
6. narrowly scoped third-party integration fixes only

Broad `!important` override layers are transitional. New global override files are prohibited; required changes should move into the authoritative primitive or feature stylesheet and obsolete files should then be removed.

## CI guard

`pnpm --filter @workspace/occu-med-map test:runtime-ownership` verifies:

- required global owners are registered;
- duplicate owner IDs are absent;
- foundational runtimes are imported exactly once;
- migrated DOM integrations use the shared observer;
- no new independent `MutationObserver` appears outside the explicit legacy migration allow-list.

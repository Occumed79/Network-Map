# Network Map runtime ownership

This document defines the authoritative owners for global browser behavior. New runtimes must register a stable owner ID through `runtimeControllerRegistry.ts`. Duplicate owner IDs are blocked and CI fails if source declares the same owner ID more than once.

## Authoritative owners

| Responsibility | Owner ID | Source |
| --- | --- | --- |
| Leaflet map lifecycle and initializer execution | `leaflet-map-lifecycle` | `leafletMapLifecycleRuntime.ts` |
| Mapbox map lifecycle and initializer execution | `mapbox-map-lifecycle` | `mapboxMapLifecycleRuntime.ts` |
| Browser request middleware / `window.fetch` interception | `network-request-pipeline` | `networkRequestPipelineRuntime.ts` |
| Map Tools panel and core actions | `map-tools-command-panel` | `mapToolsCommandPanel.ts` |
| Map Tools feature-section registry | `map-tools-section-registry` | `mapToolsPanelRegistry.ts` |
| Map Tools / Mapbox basemap bridge | `map-controls-bridge` | `mapControlsBridgeRuntime.ts` |
| Map Tools From/To route planner | `route-planner-controls` | `routePlannerControlsRuntime.ts` |
| Healthsites map layer and Map Tools section | `healthsites-flat-dots` | `healthsitesFlatDotsRuntime.ts` |
| Country/city provider finder and Map Tools section | `provider-location-finder` | `providerLocationFinderRuntime.ts` |
| Uploaded dataset labels in upload controls and provider popups | `uploaded-dataset-labels` | `uploadedDatasetLabelRuntime.ts` |
| Provider inventory and viewport telemetry | `provider-layer-telemetry` | `providerLayerTelemetryRuntime.ts` |
| Finder result-card ETA decoration | `right-panel-compactor` | `rightPanelCompactor.ts` |
| Finder drive-time action strip | `live-finder-drive-tools` | `liveFinderDriveTools.ts` |
| U.S. diagnostics visibility/synchronization | `us-diagnostics-gate` | `usDiagnosticsGate.ts` |
| Dialog semantics, focus trap, dismissal, and focus restoration | `dialog-controller` | `dialogControllerRuntime.ts` |
| Read-only application UI integrity diagnostics | `general-ui-integrity` | `generalUiIntegrityRuntime.ts` |
| Read-only sidebar workspace integrity diagnostics | `sidebar-workspace-integrity` | `sidebarWorkspacePanelGuardRuntime.ts` |
| Legacy modal label cleanup | `modal-label-scrubber` | `modalLabelScrubber.ts` |
| Map engine loading-state cleanup | `map-engine-loading-cleanup` | `mapEngineLoadingCleanupRuntime.ts` |
| Final map-engine transition/loading reconciliation and density filtering | `map-engine-final-fixes` | `mapEngineFinalFixRuntime.ts` |
| Mapbox globe preload and transition preparation | `mapbox-globe-load-hardening` | `mapboxGlobeLoadHardeningRuntime.ts` |

## Map Tools ownership

`mapToolsCommandPanel.ts` owns creation and lifecycle of the Map Tools panel. Feature sections do not scan the DOM waiting for that panel. They register once through `registerMapToolsSection` and receive the authoritative panel and Leaflet map when mounted.

Current registry consumers include the From/To route planner, Healthsites, and the country/city Provider Location Finder. This removes three independent panel-scanning/observer paths and gives panel cleanup one lifecycle owner.

## DOM observation policy

`runtimeControllerRegistry.ts` owns the single shared application `MutationObserver`. Legacy or third-party DOM integrations subscribe to it through `subscribeToSharedDomObserver` rather than creating another full-document observer.

Direct `MutationObserver` ownership is temporarily allow-listed only for runtimes not yet migrated. `scripts/runtime-ownership-smoke.ts` contains that explicit migration list and fails when a new independent observer appears outside it. The allow-list must shrink over time; adding new entries requires justification in the pull request.

The remaining direct-observer migration allow-list is now limited to:

- `sidebarWorkspaceControllerRuntime.ts`
- `unifiedProviderToolsRuntime.ts`

These are migration targets, not examples for new code.

Both integrity monitors are diagnostic-only. They detect geometry, overflow, selection, dialog, or panel-state failures but do not click hidden launchers, synchronize competing controllers, force resize events, or mutate ownership state to repair symptoms.

## Required eager runtime order

`main.tsx` must load these foundational owners before feature runtimes:

1. `leafletMapLifecycleRuntime`
2. `mapboxMapLifecycleRuntime`
3. `mapboxSourcePipelineRuntime`
4. `networkRequestPipelineRuntime`
5. feature/request consumers such as uploaded dataset labeling and admin API integration
6. Map Tools, diagnostics, and map integrations
7. React `App`
8. authoritative dialog behavior
9. read-only integrity diagnostics
10. optional runtime integrations after first render

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

- the shared registry owns exactly one application-level `MutationObserver`;
- required global owners are registered;
- duplicate owner IDs are absent;
- foundational runtimes are imported exactly once;
- migrated DOM integrations use the shared observer;
- Map Tools feature modules use the Map Tools section registry instead of DOM scanning;
- integrity monitors remain read-only;
- no new independent `MutationObserver` appears outside the two-file migration allow-list.

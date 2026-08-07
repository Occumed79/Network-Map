# Network Map visible UI and control inventory

This inventory is part of #168. It records the visible surface, its authoritative behavior owner, the states that must remain supported, and the acceptance coverage expected before the PR can leave draft.

Status legend:
- **source-owned** — behavior is owned directly by React or a single explicit runtime/controller.
- **compatibility-owned** — one explicit controller owns the behavior, but it still adapts legacy DOM and should move into React/source markup.
- **diagnostic-only** — observes/reports state and does not repair or own behavior.
- **pending** — still needs source consolidation or rendered acceptance coverage.

## Application shell

| Surface | Visible controls / states | Behavior owner | Current status | Required acceptance |
| --- | --- | --- | --- | --- |
| Command header | logo/title, global search, search results, header actions | React `App.tsx` | source-owned; duplicate Provider Explorer launcher still hidden by compatibility layer | search open/results/select/clear/error; no overflow at all required viewports |
| Sidebar workspace tabs | Providers, Map Tools, Finder, Explorer | `sidebarWorkspaceControllerRuntime.ts` | compatibility-owned; one controller, one shared observer, no runtime CSS | click + keyboard arrows/Home/End; exactly one selected tab; repeated switching; no map compression |
| Sidebar layout geometry | sidebar width, tab strip, workspace host, external Finder/Explorer panel alignment | source CSS + sidebar controller measurements | source CSS / compatibility behavior | desktop/laptop/tablet/mobile geometry; no phantom column/overlap/horizontal overflow |
| General UI integrity | overflow, offscreen overlays, dialog semantics, multiple selected workspaces | `generalUiIntegrityRuntime.ts` | diagnostic-only | must detect failures without mutating ownership state |
| Sidebar integrity | workspace geometry, hidden/visible panel correctness | `sidebarWorkspacePanelGuardRuntime.ts` | diagnostic-only | must detect failures without clicking launchers or forcing resize |

## Providers workspace

| Surface | Visible controls / states | Behavior owner | Current status | Required acceptance |
| --- | --- | --- | --- | --- |
| Provider source controls | BlueHive, Indexed Providers, Dental Examiners, My Clinics | React checkboxes in `App.tsx`; runtime only persists opt-in selection | source-owned controls; opt-in defaults enforced | off by default; loading, loaded, failed, cached; repeated toggle stability |
| Provider source telemetry | database totals vs viewport rendered count | `providerLayerTelemetryRuntime.ts` | source-owned runtime, shared observer | totals must not be presented as viewport counts; failure/cached states |
| Service / overlay controls | service presence, NACCHO/other existing provider overlays | React `App.tsx` | source-owned | disabled preconditions; loading/error/empty; clear actions |
| Manage Clinics | clinic list / saved providers workflow | React `App.tsx` | source-owned | open/close, empty/results, action feedback |
| Provider cards | name, source/type, contact/actions, save/route actions | React / feature runtimes | mixed source-owned | accurate labels; disabled/loading/saved/error; no dead buttons |

## Map Tools workspace

| Surface | Visible controls / states | Behavior owner | Current status | Required acceptance |
| --- | --- | --- | --- | --- |
| Map Tools panel lifecycle | panel creation, mounting and cleanup | `mapToolsCommandPanel.ts` | source-owned runtime | panel appears once; no duplicate controls after repeated map/sidebar transitions |
| Map Tools feature sections | feature section mount/unmount | `mapToolsPanelRegistry.ts` | source-owned registry | duplicate section IDs rejected; cleanup on panel removal |
| Search | address/place search | Map Tools panel | source-owned runtime | empty query, loading, not found, result, API failure |
| Routes / Zones | service zones, clear | Map Tools panel | source-owned runtime | origin precondition, loading/success/error, clear |
| ETA Ranking | rank visible, apply results, copy | Map Tools panel + Finder ETA runtime | source-owned runtime | no visible pins, loading, partial routing failure, ranked results, copy failure |
| Density | density toggle | Map Tools panel | source-owned runtime | off by default; repeated toggle; pan/zoom stability |
| Basemap | Streets, Light, Terrain, Satellite | `mapControlsBridgeRuntime.ts` | source-owned runtime | selected state; Mapbox style load/error; overlays restored |
| From / To | From, To, Route, Swap, Clear | `routePlannerControlsRuntime.ts` registered through Map Tools registry | source-owned runtime | empty fields, geocode failure, route success/error, swap/clear, selected-provider destination |
| Healthsites | on/off plus individual dots | `healthsitesFlatDotsRuntime.ts` registered through Map Tools registry | source-owned runtime | off by default; zoom precondition; loading/capped/error; no clustering |
| Provider Location Finder | country, optional city, show, clear | `providerLocationFinderRuntime.ts` registered through Map Tools registry | source-owned runtime | country required; city narrowing; partial Healthsites failure; capped/empty/error/result states |

## Finder / NPI workspace

| Surface | Visible controls / states | Behavior owner | Current status | Required acceptance |
| --- | --- | --- | --- | --- |
| Finder launcher / mode | Live Finder / Live Places | React `App.tsx` | source-owned launcher and presentation mode | open/close; correct selected workspace; no hidden duplicate launcher dependency |
| NPI launcher / mode | NPI Registry | React `App.tsx` | source-owned launcher | open Finder in NPI mode; selected state; NPI initial/error/results states |
| Live source filters | clinical, occ-med, hospital, clinic, doctor, urgent, lab, pharmacy, dental, eye, DOT, FAA, all | React `App.tsx` | source-owned | initial/selected/loading/empty/error/results |
| Radius control | live search radius | React `App.tsx` | source-owned | updates results without stale-request replacement |
| Text / region filters | text, U.S./international and related filters | React `App.tsx` | source-owned | deterministic filtering; empty result state |
| Finder result cards | provider details/actions | React + Finder ETA adapter | mixed | no dead actions; save/route/copy feedback; long content containment |
| Export CSV | Finder result export | React `App.tsx` | source-owned | enabled only with usable data; spreadsheet-safe export is tracked separately in upload/data hardening |
| Obsolete Leadership export | removed | none | **retired at source level** | function/button/output path/cleanup runtime must remain absent |

## Provider Explorer / Dataset Browser

| Surface | Visible controls / states | Behavior owner | Current status | Required acceptance |
| --- | --- | --- | --- | --- |
| Provider Explorer launcher | React `App.tsx` source button + sidebar workspace controller | source-owned React action; sidebar reuses the visible source launcher | repeated open/close; no hidden header launcher dependency |
| Visualization modes | pins, density, hex/dot-density and compare/live modes | React `App.tsx` + stability runtime | mixed source-owned | request cancellation, stable replacement, no flicker/blank state |
| Database scope / filters | current bounds/radius, country/city/type/source filters | React `App.tsx` | source-owned | missing precondition messaging; deterministic refresh/clear |
| Dataset Browser | records/pagination/filter actions | React `App.tsx` | source-owned | loading/empty/error/results; long rows contained |

## Diagnostics

| Surface | Visible controls / states | Behavior owner | Current status | Required acceptance |
| --- | --- | --- | --- | --- |
| U.S. Diagnostics gate | collapsed/expanded diagnostics visibility | `usDiagnosticsGate.ts` + React controls | source-owned runtime | on/off, map remains stable, no auto-enable |
| State labels | checkbox | React / diagnostics reliability runtime | source-owned | dependency readiness, on/off, repeated toggles |
| Timezone overlay | checkbox | React / diagnostics reliability runtime | source-owned | dependency readiness, on/off, repeated toggles |
| Population density | checkbox | React / diagnostics reliability runtime | source-owned | dependency readiness, on/off, repeated toggles |
| State color fill | checkbox | React / diagnostics reliability runtime | source-owned | dependency readiness, on/off, repeated toggles |
| City dots | checkbox | React / diagnostics reliability runtime | source-owned | dependency readiness, on/off, repeated toggles |
| Local population card / timezone legend | informational overlays | React | source-owned | viewport containment; diagnostics gate visibility |

## Modals, overlays, and reports

| Surface | Visible controls / states | Behavior owner | Current status | Required acceptance |
| --- | --- | --- | --- | --- |
| Modal semantics/focus | every `.modal-box` / report preview | `dialogControllerRuntime.ts` | source-owned global behavior | role/aria, initial focus, Tab trap, Escape, focus restoration |
| Upload Clinics | file, mapping/label/upload actions and status | React `App.tsx` / upload APIs | source-owned UI; upload transaction hardening tracked in #173 | open/close; invalid file; loading/progress/error/success with mocked network |
| Coverage modal | existing coverage controls | React `App.tsx` | source-owned | open/close; disabled/loading/error/results; responsive containment |
| Radius extractor | radius, facility type, include facilities, save/clear/export/hide | React `App.tsx` | source-owned | center precondition; save/clear; export loading/error; viewport containment |
| Compare / pricing workflows | existing comparison controls | React `App.tsx` | source-owned | open/close; empty/loading/error/results; no dead actions |
| PDF/report preview | toolbar, iframe, close | report preview source + `dialogControllerRuntime.ts` | source-owned global behavior | desktop/mobile geometry, toolbar wrapping, keyboard focus, Escape, focus restoration |
| Leaflet / Mapbox popups | provider/location details and actions | map feature owners | source-owned per feature | viewport containment, scrolling, links/actions, long-content behavior |

## Map lifecycle and global infrastructure

| Responsibility | Authoritative owner | Guard |
| --- | --- | --- |
| Leaflet map creation / initializer order | `leafletMapLifecycleRuntime.ts` | duplicate initializer IDs rejected + lifecycle smoke |
| Mapbox map registration / initializer order | `mapboxMapLifecycleRuntime.ts` | duplicate initializer IDs rejected + lifecycle smoke |
| Mapbox source transforms | `mapboxSourcePipelineRuntime.ts` | pipeline hardening smoke |
| Browser fetch middleware | `networkRequestPipelineRuntime.ts` | duplicate middleware IDs rejected + request hardening smoke |
| Global DOM mutation observation | `runtimeControllerRegistry.ts` | runtime ownership smoke requires it to be the only `new MutationObserver` owner |
| Dialog behavior | `dialogControllerRuntime.ts` | general UI hardening smoke |

## Remaining #168 source-ownership blockers

Runtime-observer consolidation is complete: the registry is the sole application MutationObserver owner. `unifiedProviderToolsRuntime.ts` no longer creates replacement provider-source buttons, hides source rows, or relabels Manage Clinics. Finder, NPI Registry, Provider Explorer launchers, Finder/NPI section visibility, titles, and mode prompt are now owned directly by React source. `unifiedProviderToolsRuntime.ts` is retired. The only remaining provider-tool helper is source-selection persistence, which does not create, hide, rename, or restyle controls.

Stylesheet ownership is now materially consolidated: `ui-system.css` owns shared design tokens/global UI/dialog/popup/report behavior, ten superseded override layers have been deleted, retained P2 feature rules live in `core-app-p2.css` and `phase-two-controls.css`, and the app stylesheet-import ceiling is 21; the superseded modal-command polish layer is also retired. Remaining work is limited to explicitly documented map/sidebar compatibility layers while rendered behavior is preserved.

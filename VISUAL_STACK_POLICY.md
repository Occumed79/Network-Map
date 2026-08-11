# Occumed79 Visualization Stack Policy

## Account-wide approved preload stack

The account-wide preload is limited to the free/open visualization libraries maintained in `.github/scripts/install-visual-arsenal-v2.sh`, including the approved map, chart, relationship/flow, 3D, animation, physics/graphics, and medical/scientific libraries.

Important distinction: `sigma` / Sigma.js is approved. Sigma Computing Embed is a separate commercial BI product and is excluded.

## Optional external integrations

These are not preloaded into every repository and should only be connected when an app specifically needs them:

- Grafana Cloud / API
- Metabase API / self-hosted Metabase

## Explicitly excluded

Do not add these to the account-wide visualization preload:

- Tableau Embedding API
- Power BI Embedded
- Looker Embed SDK
- ThoughtSpot Visual Embed SDK
- Sisense Compose SDK
- Sigma Computing Embed
- Qlik Embedded Analytics
- Preset embedded analytics
- Cube Cloud embedded dashboards
- FullCalendar Premium
- Syncfusion Scheduler
- Syncfusion Grid

## Not packages

These remain usable browser/data technologies but are not npm packages to preload:

- GeoJSON
- WebGL
- WebGPU
- GLSL
- WGSL

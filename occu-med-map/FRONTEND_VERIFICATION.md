# Frontend layout verification

Run the app locally and verify each target viewport with Live Finder both closed and open.

## Viewports

- 1920 × 1080 desktop
- 1440 × 900 laptop
- 1366 × 768 short laptop

## Checklist

- The page uses the viewport height and has no body-level horizontal or vertical scrolling.
- The left command sidebar scrolls with the mouse wheel or trackpad.
- Network Tools, Service Presence, View Presets, Layers, and lower controls are reachable.
- World, US, East, Central, and West presets still move the map.
- The center map remains pannable and wheel-zoomable.
- Scrolling either sidebar does not zoom the map.
- Live Finder stays inside the viewport without overlapping the browser edge.
- Live Finder controls scroll independently when needed.
- Live Finder results scroll independently from the filters and header.
- Search, radius, source filters, region, sort, and result actions remain usable.
- The initial Live Finder state clearly asks the user to choose a location.
- The native drive-time strip renders once when `VITE_NATIVE_DRIVE_TIME=true`.
- There is no page-level horizontal overflow and no layout-related console error.

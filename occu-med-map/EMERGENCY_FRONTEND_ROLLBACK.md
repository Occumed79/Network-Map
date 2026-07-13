# Emergency frontend rollback

The Phase 2 GIS shell remains in the repository for repair and isolated testing, but it is not mounted in production.

Production now boots the last known working App frontend directly, with the P0 provider paging and telemetry runtimes restored. P1 data-quality code and P3 backend NPI centralization remain intact.

This rollback changes no Neon schema, data, provider records, Render environment variables, or API routes.

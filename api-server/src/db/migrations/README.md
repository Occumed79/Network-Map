# Network Map database migrations

Apply the P1 data-stabilization files in lexical order:

1. `20260713_p1_data_stabilization_01_schema.sql`
2. `20260713_p1_data_stabilization_02_quarantine_function.sql`
3. `20260713_p1_data_stabilization_03_migrate_function.sql`
4. `20260713_p1_data_stabilization_04_query_monitoring.sql`

The files are intentionally split so each dollar-quoted PostgreSQL function is a single top-level migration statement. This avoids migration tools incorrectly splitting a function body at internal semicolons.

## Safety gates

- Applying the migrations does not delete or rewrite `medical_providers` rows.
- `provider_schema_state.canonical_read_enabled` remains `false` after installation.
- Run `network_map_refresh_quarantine(...)` in bounded batches.
- Run `network_map_migrate_legacy_batch(...)` in bounded batches and verify counts and source lineage.
- Enable canonical reads only after map-eligible counts, source membership, and My Clinics behavior are verified.

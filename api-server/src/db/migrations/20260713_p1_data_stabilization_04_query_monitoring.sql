-- P1 data stabilization, step 4 of 4.
-- Neon supports pg_stat_statements for this project. Keeping this in a separate
-- migration makes the optional monitoring dependency explicit and independently testable.

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

CREATE OR REPLACE VIEW public.network_map_query_monitoring AS
SELECT
  queryid,
  calls,
  total_exec_time,
  mean_exec_time,
  rows,
  query
FROM pg_stat_statements
WHERE query ILIKE '%provider_%'
   OR query ILIKE '%medical_providers%'
ORDER BY total_exec_time DESC;

COMMENT ON VIEW public.network_map_query_monitoring IS
  'Provider-related statements ordered by total execution time from pg_stat_statements.';

-- P1 data stabilization, step 2 of 4.
-- One top-level function statement so migration tooling does not split a dollar-quoted body.

CREATE OR REPLACE FUNCTION public.network_map_refresh_quarantine(
  p_limit integer DEFAULT 10000
)
RETURNS integer
LANGUAGE plpgsql
AS $network_map_refresh_quarantine$
DECLARE
  affected integer := 0;
BEGIN
  WITH candidates AS (
    SELECT c.source_table, c.source_pk, c.reason_codes, c.record_snapshot
    FROM public.provider_quarantine_candidates c
    WHERE cardinality(c.reason_codes) > 0
      AND NOT EXISTS (
        SELECT 1
        FROM public.provider_quarantine q
        WHERE q.source_table = c.source_table
          AND q.source_pk = c.source_pk
      )
    ORDER BY c.source_pk::bigint
    LIMIT GREATEST(COALESCE(p_limit, 10000), 1)
  )
  INSERT INTO public.provider_quarantine (
    source_table,
    source_pk,
    reason_codes,
    record_snapshot,
    last_quarantined_at
  )
  SELECT source_table, source_pk, reason_codes, record_snapshot, now()
  FROM candidates
  ON CONFLICT (source_table, source_pk) DO UPDATE
  SET reason_codes = EXCLUDED.reason_codes,
      record_snapshot = EXCLUDED.record_snapshot,
      last_quarantined_at = now();

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END
$network_map_refresh_quarantine$;

COMMENT ON FUNCTION public.network_map_refresh_quarantine(integer) IS
  'Copies map-ineligible legacy providers into provider_quarantine in bounded idempotent batches.';

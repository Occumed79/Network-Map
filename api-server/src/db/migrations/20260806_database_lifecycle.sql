-- Database lifecycle/version tracking (#175). Safe metadata only.

CREATE TABLE IF NOT EXISTS public.schema_migration_versions (
  version text PRIMARY KEY,
  checksum text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  application text NOT NULL DEFAULT 'network-map'
);

INSERT INTO public.schema_migration_versions(version,checksum)
VALUES ('20260806_database_lifecycle','tracked-by-repository')
ON CONFLICT (version) DO NOTHING;

-- Common integrity/index checks used by provider upload/search paths.
CREATE INDEX IF NOT EXISTS provider_master_country_city_idx
  ON public.provider_master(country_code, city)
  WHERE active = true;
CREATE INDEX IF NOT EXISTS provider_master_source_type_idx
  ON public.provider_master(primary_source_key, primary_provider_type)
  WHERE active = true;
CREATE INDEX IF NOT EXISTS provider_master_identity_idx
  ON public.provider_master(normalized_name, city, state_region)
  WHERE active = true;
CREATE INDEX IF NOT EXISTS provider_master_bounds_idx
  ON public.provider_master(lat, lng)
  WHERE active = true AND lat IS NOT NULL AND lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS provider_raw_records_source_idx
  ON public.provider_raw_records(source_key, ingest_batch_id);
CREATE INDEX IF NOT EXISTS provider_stage_records_status_idx
  ON public.provider_stage_records(ingest_batch_id, stage_status);
CREATE INDEX IF NOT EXISTS provider_master_sources_source_idx
  ON public.provider_master_sources(source_key, source_record_id);

CREATE OR REPLACE VIEW public.provider_orphan_audit AS
SELECT 'provider_master_source_missing_master'::text AS finding, pms.id::text AS record_id
FROM public.provider_master_sources pms
LEFT JOIN public.provider_master pm ON pm.id=pms.master_provider_id
WHERE pm.id IS NULL
UNION ALL
SELECT 'provider_master_type_missing_master', pmt.id::text
FROM public.provider_master_types pmt
LEFT JOIN public.provider_master pm ON pm.id=pmt.master_provider_id
WHERE pm.id IS NULL
UNION ALL
SELECT 'stage_missing_raw', psr.id::text
FROM public.provider_stage_records psr
LEFT JOIN public.provider_raw_records prr ON prr.id=psr.raw_record_id
WHERE prr.id IS NULL;

COMMENT ON VIEW public.provider_orphan_audit IS
  'Read-only lifecycle audit. Expected row count is zero; never deletes records automatically.';

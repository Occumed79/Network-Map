-- Database lifecycle/version tracking (#175). Additive schema ownership only.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.schema_migration_versions (
  version text PRIMARY KEY,
  checksum text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  application text NOT NULL DEFAULT 'network-map'
);

INSERT INTO public.schema_migration_versions(version,checksum)
VALUES ('20260806_database_lifecycle','tracked-by-repository')
ON CONFLICT (version) DO NOTHING;

-- Provider Explorer persistence is migration-owned. Request handlers must not
-- create these tables or indexes on demand.
CREATE TABLE IF NOT EXISTS public.provider_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_kind text NOT NULL DEFAULT 'candidate',
  source_label text NOT NULL DEFAULT 'Live discovery',
  name text NOT NULL,
  normalized_name text,
  clinic_type text DEFAULT 'unknown',
  services text[] DEFAULT ARRAY[]::text[],
  categories text[] DEFAULT ARRAY[]::text[],
  address text,
  city text,
  admin_area text,
  country text,
  postal_code text,
  lat double precision,
  lng double precision,
  phone text,
  website text,
  source_url text,
  confidence_score numeric,
  trust_tier text DEFAULT 'lead',
  status text NOT NULL DEFAULT 'candidate',
  notes text,
  raw_source_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  saved_at timestamptz,
  dismissed_at timestamptz,
  last_seen timestamptz
);

CREATE INDEX IF NOT EXISTS idx_provider_candidates_status
  ON public.provider_candidates(status);
CREATE INDEX IF NOT EXISTS idx_provider_candidates_source_kind
  ON public.provider_candidates(source_kind);
CREATE INDEX IF NOT EXISTS idx_provider_candidates_country_admin_city
  ON public.provider_candidates(country, admin_area, city);
CREATE INDEX IF NOT EXISTS idx_provider_candidates_lat_lng
  ON public.provider_candidates(lat, lng);
CREATE INDEX IF NOT EXISTS idx_provider_candidates_normalized_name
  ON public.provider_candidates(normalized_name);

CREATE TABLE IF NOT EXISTS public.provider_outreach_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_candidate_id uuid REFERENCES public.provider_candidates(id) ON DELETE SET NULL,
  provider_source_id text,
  source_kind text,
  source_label text,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'outreach_target',
  notes text,
  raw_source_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_outreach_status
  ON public.provider_outreach_targets(status);

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

-- Required by source promotion lookups on bulk provider datasets.
CREATE INDEX IF NOT EXISTS idx_provider_stage_records_source_record
  ON public.provider_stage_records(source_key, source_record_id);

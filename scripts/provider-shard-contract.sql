-- Provider shard schema contract.
-- Apply only to source-specific provider shards (Overpass, Healthsites, U.S. Embassy).
-- This script is intentionally NOT a primary DATABASE_URL migration.

CREATE TABLE IF NOT EXISTS public.provider_schema_state (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  canonical_schema text NOT NULL DEFAULT 'provider_master',
  canonical_read_enabled boolean NOT NULL DEFAULT true,
  migration_after_legacy_id bigint NOT NULL DEFAULT 0,
  expected_eligible_rows bigint,
  migrated_eligible_rows bigint NOT NULL DEFAULT 0,
  migration_completed_at timestamptz,
  verification_notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.provider_schema_state (
  id,
  canonical_schema,
  canonical_read_enabled,
  verification_notes,
  updated_at
)
VALUES (
  1,
  'provider_master',
  true,
  'Source provider shard: canonical provider_master reads are authoritative',
  now()
)
ON CONFLICT (id) DO UPDATE
SET canonical_schema = 'provider_master',
    canonical_read_enabled = true,
    verification_notes = 'Source provider shard: canonical provider_master reads are authoritative',
    updated_at = now();

ALTER TABLE public.provider_type_catalog
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.provider_type_catalog
SET updated_at = COALESCE(updated_at, created_at, now());

CREATE TABLE IF NOT EXISTS public.schema_migration_versions (
  version text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  application text NOT NULL DEFAULT 'network-map'
);

INSERT INTO public.schema_migration_versions (version, checksum, application)
VALUES (
  '20260920_provider_shard_contract_v2',
  'provider-shard-canonical-contract-v2',
  'network-map'
)
ON CONFLICT (version) DO UPDATE
SET checksum = EXCLUDED.checksum,
    application = EXCLUDED.application,
    applied_at = now();

DO $$
DECLARE
  relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'provider_raw_records',
    'provider_stage_records',
    'provider_master',
    'provider_master_sources',
    'provider_master_types',
    'provider_type_catalog',
    'medical_providers',
    'provider_schema_state',
    'schema_migration_versions',
    'provider_master_map_view'
  ] LOOP
    IF to_regclass('public.' || relation_name) IS NULL THEN
      RAISE EXCEPTION 'Required provider shard relation is missing: %', relation_name;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM public.provider_schema_state
    WHERE id = 1
      AND canonical_schema = 'provider_master'
      AND canonical_read_enabled = true
  ) THEN
    RAISE EXCEPTION 'Provider shard canonical read authority is not enabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'provider_type_catalog'
      AND column_name = 'updated_at'
      AND data_type = 'timestamp with time zone'
  ) THEN
    RAISE EXCEPTION 'provider_type_catalog.updated_at is missing';
  END IF;
END $$;

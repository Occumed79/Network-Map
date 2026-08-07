CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Disposable CI schema mirrors the live contracts exercised by the hardening
-- migrations and upload lifecycle. It intentionally contains no production data.
CREATE TABLE IF NOT EXISTS public.providers (
  id serial PRIMARY KEY,
  npi text,
  name text NOT NULL,
  normalized_name text NOT NULL,
  provider_type text DEFAULT 'unknown',
  quarantine_status text DEFAULT 'accepted',
  integrity_findings jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS providers_npi_unique_ci ON public.providers(npi) WHERE npi IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.provider_locations (
  id serial PRIMARY KEY,
  provider_id integer NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  address text,
  city text,
  state varchar(2),
  country text,
  postal_code text,
  lat double precision,
  lng double precision,
  coordinate_status text NOT NULL DEFAULT 'unverified',
  coordinate_source text,
  is_primary boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_contacts (
  id serial PRIMARY KEY,
  provider_id integer NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  phone text,
  fax text,
  website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_services (
  id serial PRIMARY KEY,
  provider_id integer NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  taxonomy text,
  taxonomy_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_id, service_type)
);

CREATE TABLE IF NOT EXISTS public.provider_sources (
  id serial PRIMARY KEY,
  provider_id integer NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  source_id text NOT NULL,
  source_label text NOT NULL,
  source_url text,
  trust_tier text NOT NULL DEFAULT 'lead',
  external_id text,
  raw_data jsonb DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_evidence (
  id serial PRIMARY KEY,
  provider_id integer NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  service_detected text NOT NULL,
  evidence_url text,
  evidence_text_snippet text,
  confidence numeric,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_source_catalog (
  source_key text PRIMARY KEY,
  display_name text NOT NULL,
  source_kind text NOT NULL,
  trust_tier text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_ingest_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL,
  status text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  records_read integer NOT NULL DEFAULT 0,
  records_inserted integer NOT NULL DEFAULT 0,
  records_updated integer NOT NULL DEFAULT 0,
  records_rejected integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.provider_master (
  id bigserial PRIMARY KEY,
  master_key text NOT NULL UNIQUE,
  name text NOT NULL,
  normalized_name text NOT NULL,
  address_line1 text,
  formatted_address text,
  city text,
  state_region text,
  postal_code text,
  country_code text,
  lat double precision,
  lng double precision,
  phone text,
  email text,
  website text,
  npi text,
  primary_provider_type text,
  capability_tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  primary_source_key text,
  quality_score double precision,
  active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_master_sources (
  id bigserial PRIMARY KEY,
  master_provider_id bigint NOT NULL REFERENCES public.provider_master(id) ON DELETE CASCADE,
  source_key text NOT NULL,
  source_record_id text,
  source_confidence_score double precision,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS provider_master_sources_unique_ci
  ON public.provider_master_sources(master_provider_id, source_key, (COALESCE(source_record_id,'')));

CREATE TABLE IF NOT EXISTS public.provider_master_types (
  id bigserial PRIMARY KEY,
  master_provider_id bigint NOT NULL REFERENCES public.provider_master(id) ON DELETE CASCADE,
  type_key text NOT NULL,
  source_key text NOT NULL,
  confidence_score double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(master_provider_id, type_key, source_key)
);

CREATE TABLE IF NOT EXISTS public.provider_raw_records (
  id bigserial PRIMARY KEY,
  source_key text NOT NULL,
  source_record_id text,
  ingest_batch_id text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_hash text,
  source_updated_at timestamptz,
  ingested_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_stage_records (
  id bigserial PRIMARY KEY,
  raw_record_id bigint REFERENCES public.provider_raw_records(id),
  ingest_batch_id text,
  normalized_data jsonb DEFAULT '{}'::jsonb,
  provider_type text,
  canonical_provider_type text,
  quality_score numeric(5,2) NOT NULL DEFAULT 0,
  stage_status text,
  rejection_reason text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.geocode_cache (
  id serial PRIMARY KEY,
  query_normalized text NOT NULL UNIQUE,
  lat double precision,
  lng double precision,
  provider text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.medical_providers (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  formatted_address text,
  lat double precision,
  lng double precision,
  phone text,
  website text,
  locality text,
  administrative_area_level_1 text,
  postal_code text,
  country_code text,
  data_source text,
  source_id text,
  category text,
  source_type text,
  confidence_score numeric,
  types text[] DEFAULT ARRAY[]::text[],
  raw_data jsonb DEFAULT '{}'::jsonb,
  scraped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_source_catalog (
  source_key text PRIMARY KEY,
  source_name text NOT NULL,
  source_type text,
  last_refreshed_at timestamptz,
  refresh_status text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.provider_ingest_batches (
  id uuid PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS public.provider_raw_records (
  id bigserial PRIMARY KEY,
  source_key text NOT NULL,
  source_record_id text NOT NULL,
  ingest_batch_id uuid NOT NULL,
  raw_data jsonb NOT NULL,
  raw_hash text NOT NULL,
  source_updated_at timestamptz,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_key, source_record_id, raw_hash)
);

CREATE TABLE IF NOT EXISTS public.provider_master (
  id uuid PRIMARY KEY,
  normalized_name text NOT NULL,
  display_name text NOT NULL,
  address_line1 text,
  address_line2 text,
  city text,
  state_region text,
  postal_code text,
  country_code text,
  phone text,
  email text,
  website text,
  lat double precision,
  lng double precision,
  coordinate_status text,
  coordinate_source text,
  source_trust_level text,
  primary_source_key text,
  primary_provider_type text,
  capability_tags text[] DEFAULT ARRAY[]::text[],
  npi text,
  active boolean NOT NULL DEFAULT true,
  quality_score numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_master_sources (
  id bigserial PRIMARY KEY,
  master_provider_id uuid NOT NULL,
  source_key text NOT NULL,
  source_record_id text NOT NULL,
  ingest_batch_id uuid,
  match_type text,
  match_confidence numeric(5,2),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_master_types (
  id bigserial PRIMARY KEY,
  master_provider_id uuid NOT NULL,
  provider_type text NOT NULL,
  source_key text NOT NULL,
  confidence numeric(5,2),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(master_provider_id, provider_type, source_key)
);

CREATE TABLE IF NOT EXISTS public.provider_stage_records (
  id bigserial PRIMARY KEY,
  ingest_batch_id uuid NOT NULL,
  raw_record_id bigint NOT NULL,
  normalized_data jsonb NOT NULL,
  provider_type text,
  canonical_provider_type text,
  quality_score numeric(5,2) NOT NULL DEFAULT 0,
  stage_status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.providers (
  id serial PRIMARY KEY,
  npi text,
  name text NOT NULL,
  normalized_name text NOT NULL,
  provider_type text,
  quarantine_status text DEFAULT 'accepted',
  integrity_findings jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS providers_npi_unique ON public.providers(npi) WHERE npi IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.provider_locations (
  id serial PRIMARY KEY,
  provider_id integer NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  address text,
  city text,
  state text,
  country text,
  postal_code text,
  lat double precision,
  lng double precision,
  coordinate_status text,
  coordinate_source text,
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

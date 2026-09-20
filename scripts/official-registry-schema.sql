\set ON_ERROR_STOP on

CREATE TABLE IF NOT EXISTS public.official_registry_providers (
  source_record_id text PRIMARY KEY,
  source_url text,
  name text NOT NULL,
  normalized_name text,
  address_line1 text,
  formatted_address text,
  city text,
  state_region text,
  postal_code text,
  country_code text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  phone text,
  website text,
  email text,
  primary_provider_type text,
  capability_tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  quality_score real,
  master_key text NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT official_registry_valid_coordinates
    CHECK (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
);

CREATE INDEX IF NOT EXISTS official_registry_providers_name_idx
  ON public.official_registry_providers (name, source_record_id);

CREATE TABLE IF NOT EXISTS public.official_registry_metadata (
  source_key text PRIMARY KEY,
  country_code text NOT NULL,
  record_count bigint NOT NULL,
  synchronized_at timestamptz NOT NULL DEFAULT now()
);

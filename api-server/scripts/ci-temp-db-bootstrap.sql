CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS providers (
  id serial PRIMARY KEY,
  npi text,
  name text NOT NULL,
  normalized_name text NOT NULL,
  provider_type text DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS provider_locations (
  id serial PRIMARY KEY,
  provider_id integer NOT NULL REFERENCES providers(id),
  address text,
  city text,
  state varchar(2),
  postal_code text,
  lat double precision,
  lng double precision,
  coordinate_status text NOT NULL DEFAULT 'unverified',
  is_primary boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS provider_sources (
  id serial PRIMARY KEY,
  provider_id integer NOT NULL REFERENCES providers(id),
  source_id text NOT NULL,
  source_label text NOT NULL,
  source_url text,
  trust_tier text NOT NULL DEFAULT 'lead',
  external_id text,
  raw_data jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_source_catalog (
  source_key text PRIMARY KEY,
  display_name text NOT NULL,
  source_kind text NOT NULL,
  trust_tier text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_master (
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
CREATE TABLE IF NOT EXISTS provider_master_sources (
  id bigserial PRIMARY KEY,
  master_provider_id bigint NOT NULL REFERENCES provider_master(id) ON DELETE CASCADE,
  source_key text NOT NULL,
  source_record_id text,
  source_confidence_score double precision,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS provider_master_sources_unique_ci
  ON provider_master_sources(master_provider_id, source_key, (COALESCE(source_record_id,'')));
CREATE TABLE IF NOT EXISTS provider_master_types (
  id bigserial PRIMARY KEY,
  master_provider_id bigint NOT NULL REFERENCES provider_master(id) ON DELETE CASCADE,
  type_key text NOT NULL,
  source_key text NOT NULL,
  confidence_score double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(master_provider_id,type_key,source_key)
);
CREATE TABLE IF NOT EXISTS provider_raw_records (
  id bigserial PRIMARY KEY,
  source_key text NOT NULL,
  ingest_batch_id text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS provider_stage_records (
  id bigserial PRIMARY KEY,
  raw_record_id bigint REFERENCES provider_raw_records(id),
  ingest_batch_id text,
  stage_status text
);

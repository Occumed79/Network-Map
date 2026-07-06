-- Provider Intelligence Explorer persistence and spatial support.
-- Safe/idempotent: never drops or rewrites existing provider intelligence.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS provider_candidates (
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
  geog geography(Point,4326),
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

CREATE INDEX IF NOT EXISTS idx_provider_candidates_status ON provider_candidates (status);
CREATE INDEX IF NOT EXISTS idx_provider_candidates_source_kind ON provider_candidates (source_kind);
CREATE INDEX IF NOT EXISTS idx_provider_candidates_country_admin_city ON provider_candidates (country, admin_area, city);
CREATE INDEX IF NOT EXISTS idx_provider_candidates_lat_lng ON provider_candidates (lat, lng);
CREATE INDEX IF NOT EXISTS idx_provider_candidates_normalized_name ON provider_candidates (normalized_name);
CREATE INDEX IF NOT EXISTS idx_provider_candidates_geog ON provider_candidates USING GIST (geog);

CREATE TABLE IF NOT EXISTS provider_outreach_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_candidate_id uuid REFERENCES provider_candidates(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_provider_outreach_status ON provider_outreach_targets (status);

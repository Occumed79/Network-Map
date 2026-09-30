-- AUTO_SAVE_DATABASE_2 and AUTO_SAVE_DATABASE_3 only: provider shards.
-- Apply with api-server/scripts/apply-autosave-cache-schema.ts.
CREATE TABLE IF NOT EXISTS autosave_providers (
  provider_key       text        PRIMARY KEY,
  source             text        NOT NULL,
  source_id          text,
  name               text        NOT NULL,
  normalized_name    text        NOT NULL,
  clinic_type        text        NOT NULL DEFAULT 'unknown',
  services           text[]      NOT NULL DEFAULT ARRAY[]::text[],
  categories         text[]      NOT NULL DEFAULT ARRAY[]::text[],
  address            text,
  city               text,
  admin_area         text,
  country            text,
  postal_code        text,
  lat                double precision,
  lng                double precision,
  phone              text,
  website             text,
  source_url         text,
  confidence_score   numeric,
  raw_source_data    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at       timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_autosave_providers_source ON autosave_providers (source);
CREATE INDEX IF NOT EXISTS idx_autosave_providers_normalized_name ON autosave_providers (normalized_name);
CREATE INDEX IF NOT EXISTS idx_autosave_providers_lat_lng ON autosave_providers (lat, lng);
CREATE INDEX IF NOT EXISTS idx_autosave_providers_source_id ON autosave_providers (source, source_id) WHERE source_id IS NOT NULL;

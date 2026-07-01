-- Migration: Add provider_import_batches table and additional indexes
-- This migration supports the import-provider-json-to-neon.ts script

-- Batch tracking table for provider JSON imports
CREATE TABLE IF NOT EXISTS provider_import_batches (
  id SERIAL PRIMARY KEY,
  batch_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  total_records INTEGER DEFAULT 0,
  inserted INTEGER DEFAULT 0,
  updated INTEGER DEFAULT 0,
  skipped_invalid_coords INTEGER DEFAULT 0,
  skipped_missing_name INTEGER DEFAULT 0,
  skipped_duplicate INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  notes TEXT
);

-- Indexes on medical_providers (only if missing)
CREATE INDEX IF NOT EXISTS idx_medical_providers_source_id
  ON medical_providers(source_id);

CREATE INDEX IF NOT EXISTS idx_medical_providers_lat_lng_bounds
  ON medical_providers(lat, lng);

CREATE INDEX IF NOT EXISTS idx_medical_providers_category
  ON medical_providers(category);

CREATE INDEX IF NOT EXISTS idx_medical_providers_source_type
  ON medical_providers(source_type);

CREATE INDEX IF NOT EXISTS idx_medical_providers_data_source
  ON medical_providers(data_source);

CREATE INDEX IF NOT EXISTS idx_medical_providers_lower_name
  ON medical_providers(LOWER(name));

CREATE INDEX IF NOT EXISTS idx_medical_providers_lower_address
  ON medical_providers(LOWER(formatted_address));

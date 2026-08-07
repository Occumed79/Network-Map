-- Safe provider upload lifecycle (#173). Adds reviewable staging/audit/rollback metadata only.
-- This migration does not modify provider_master/provider data by itself.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.provider_upload_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logical_upload_key text NOT NULL,
  source_key text NOT NULL,
  source_label text NOT NULL,
  original_filename text,
  file_hash text,
  content_hash text NOT NULL,
  status text NOT NULL DEFAULT 'preview',
  uploaded_by text,
  chunk_count integer NOT NULL DEFAULT 1 CHECK (chunk_count > 0),
  received_chunks integer NOT NULL DEFAULT 0 CHECK (received_chunks >= 0),
  total_rows integer NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  accepted_rows integer NOT NULL DEFAULT 0 CHECK (accepted_rows >= 0),
  quarantined_rows integer NOT NULL DEFAULT 0 CHECK (quarantined_rows >= 0),
  rejected_rows integer NOT NULL DEFAULT 0 CHECK (rejected_rows >= 0),
  duplicate_rows integer NOT NULL DEFAULT 0 CHECK (duplicate_rows >= 0),
  mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  previewed_at timestamptz,
  committed_at timestamptz,
  rolled_back_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (logical_upload_key, content_hash)
);

CREATE INDEX IF NOT EXISTS provider_upload_runs_status_idx
  ON public.provider_upload_runs (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS provider_upload_runs_source_idx
  ON public.provider_upload_runs (source_key, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.provider_upload_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES public.provider_upload_runs(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL DEFAULT 0 CHECK (chunk_index >= 0),
  row_index integer NOT NULL CHECK (row_index >= 0),
  row_hash text NOT NULL,
  source_record_id text,
  master_key text,
  disposition text NOT NULL DEFAULT 'staged',
  reason_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (upload_id, chunk_index, row_index),
  UNIQUE (upload_id, row_hash)
);

CREATE INDEX IF NOT EXISTS provider_upload_records_upload_disposition_idx
  ON public.provider_upload_records (upload_id, disposition);
CREATE INDEX IF NOT EXISTS provider_upload_records_master_key_idx
  ON public.provider_upload_records (master_key);

CREATE TABLE IF NOT EXISTS public.provider_upload_changes (
  id bigserial PRIMARY KEY,
  upload_id uuid NOT NULL REFERENCES public.provider_upload_runs(id) ON DELETE CASCADE,
  master_key text NOT NULL,
  existed_before boolean NOT NULL,
  before_row jsonb,
  after_row jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (upload_id, master_key)
);

CREATE INDEX IF NOT EXISTS provider_upload_changes_upload_idx
  ON public.provider_upload_changes (upload_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_upload_runs_status_check') THEN
    ALTER TABLE public.provider_upload_runs
      ADD CONSTRAINT provider_upload_runs_status_check
      CHECK (status IN ('preview','staged','committing','committed','commit_failed','rolling_back','rolled_back','rollback_failed')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_upload_records_disposition_check') THEN
    ALTER TABLE public.provider_upload_records
      ADD CONSTRAINT provider_upload_records_disposition_check
      CHECK (disposition IN ('staged','accepted','quarantined','rejected','duplicate','rolled_back')) NOT VALID;
  END IF;
END $$;

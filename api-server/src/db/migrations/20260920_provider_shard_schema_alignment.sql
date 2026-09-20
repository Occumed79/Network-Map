-- Align all existing provider shards with the canonical Network Map provider schema.
-- Additive only: no provider rows are deleted or rewritten.

CREATE TABLE IF NOT EXISTS public.provider_schema_state (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  canonical_schema text NOT NULL DEFAULT 'provider_master',
  canonical_read_enabled boolean NOT NULL DEFAULT false,
  migration_after_legacy_id bigint NOT NULL DEFAULT 0,
  expected_eligible_rows bigint,
  migrated_eligible_rows bigint NOT NULL DEFAULT 0,
  migration_completed_at timestamptz,
  verification_notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.provider_schema_state (id, canonical_schema)
VALUES (1, 'provider_master')
ON CONFLICT (id) DO UPDATE
SET canonical_schema = EXCLUDED.canonical_schema,
    updated_at = now();

CREATE TABLE IF NOT EXISTS public.schema_migration_versions (
  version text PRIMARY KEY,
  checksum text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  application text NOT NULL DEFAULT 'network-map'
);

ALTER TABLE public.provider_type_catalog
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

INSERT INTO public.provider_type_catalog (type_key, display_name, description, active)
VALUES
  ('urgent_care', 'Urgent Care', 'Urgent care clinics', true),
  ('occupational_health', 'Occupational Health', 'Occupational health clinics', true),
  ('dentist', 'Dentist', 'Dental providers', true),
  ('cardiology', 'Cardiology', 'Cardiology providers', true),
  ('public_health', 'Public Health Clinic', 'Public health clinics', true),
  ('hospital', 'Hospital', 'Hospitals', true),
  ('hearing_aid', 'Hearing Aid Provider', 'Hearing aid providers', true),
  ('imaging', 'Diagnostic Imaging', 'Diagnostic imaging providers', true),
  ('concierge_medicine', 'Concierge Medicine', 'Concierge medicine providers', true),
  ('lab', 'Laboratory Testing', 'Laboratory testing providers', true),
  ('audiology', 'Audiology', 'Audiologists', true),
  ('ent', 'ENT / Otolaryngology', 'ENT and otolaryngology providers', true),
  ('general_practitioner', 'General Practitioner', 'General practitioners', true),
  ('family_practice', 'Family Practice', 'Family practice providers', true),
  ('psychiatry', 'Psychiatry', 'Psychiatry providers', true),
  ('pulmonology', 'Pulmonology', 'Pulmonology providers', true),
  ('sports_medicine', 'Sports Medicine', 'Sports medicine providers', true),
  ('walk_in_clinic', 'Walk-In Clinic', 'Walk-in clinics', true),
  ('gastroenterology', 'Gastroenterology', 'Gastroenterology providers', true),
  ('neurotology', 'Neurotology', 'Neurotology providers', true),
  ('orthopedics', 'Orthopedics', 'Orthopedic providers', true),
  ('internal_medicine', 'Internal Medicine', 'Internal medicine providers', true),
  ('pharmacy', 'Pharmacy', 'Pharmacies', true),
  ('faa_examiner', 'FAA Examiner', 'FAA medical examiners', true),
  ('dot_examiner', 'DOT Examiner', 'DOT medical examiners', true),
  ('dot_provider', 'DOT Provider', 'Legacy alias retained for compatibility', true),
  ('faa_provider', 'FAA Provider', 'Legacy alias retained for compatibility', true),
  ('occupational_health_clinic', 'Occupational Health Clinic', 'Legacy alias retained for compatibility', true),
  ('dental', 'Dental', 'Legacy alias retained for compatibility', true),
  ('pharmacy_vaccination', 'Pharmacy / Vaccination', 'Legacy alias retained for compatibility', true),
  ('specialist', 'Specialist', 'Legacy generic specialty alias retained for compatibility', true),
  ('unknown', 'Unknown', 'Unclassified provider', true)
ON CONFLICT (type_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  active = true,
  updated_at = now();

INSERT INTO public.schema_migration_versions(version, checksum)
VALUES ('20260920_provider_shard_schema_alignment', 'tracked-by-repository')
ON CONFLICT (version) DO NOTHING;

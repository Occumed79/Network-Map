-- Additive catalog expansion for Overture healthcare imports. Existing rows
-- and legacy aliases are intentionally retained for backwards compatibility.
CREATE TABLE IF NOT EXISTS public.provider_type_catalog (
  type_key text PRIMARY KEY,
  display_name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

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
  ('dot_examiner', 'DOT Examiner', 'DOT medical examiners', true)
ON CONFLICT (type_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  active = true;

-- Supports correlated type membership checks without multiplying map rows.
CREATE INDEX IF NOT EXISTS provider_master_types_type_master_idx
  ON public.provider_master_types (type_key, master_provider_id);

-- Overture is provenance, never a clinical provider type. This is additive and
-- safe to rerun; existing source rows and provider data are not modified.
INSERT INTO public.provider_source_catalog
  (source_key, display_name, source_kind, trust_tier, active, notes)
VALUES
  ('overture', 'Overture Maps', 'external_directory', 'directory', true,
   'Cleaned healthcare locations imported from Overture Maps')
ON CONFLICT (source_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  source_kind = EXCLUDED.source_kind,
  trust_tier = EXCLUDED.trust_tier,
  active = true,
  updated_at = now();

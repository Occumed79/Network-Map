-- Initialize database schema for medical providers

-- Medical categories table
CREATE TABLE IF NOT EXISTS medical_categories (
  id SERIAL PRIMARY KEY,
  category_name TEXT UNIQUE NOT NULL,
  search_terms TEXT[] NOT NULL,
  priority INTEGER DEFAULT 0
);

-- Medical providers table
CREATE TABLE IF NOT EXISTS medical_providers (
  id SERIAL PRIMARY KEY,
  place_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  formatted_address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  types TEXT[],
  category TEXT,
  phone TEXT,
  website TEXT,
  country_code TEXT,
  locality TEXT,
  administrative_area_level_1 TEXT,
  postal_code TEXT,
  data_source TEXT DEFAULT 'scraped',
  source_id TEXT UNIQUE,
  source_type TEXT DEFAULT 'scraped',
  confidence_score DOUBLE PRECISION DEFAULT 0.5,
  raw_data JSONB,
  scraped_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_medical_providers_lat_lng ON medical_providers(lat, lng);
CREATE INDEX IF NOT EXISTS idx_medical_providers_bounds ON medical_providers(lat, lng);
CREATE INDEX IF NOT EXISTS idx_medical_providers_category ON medical_providers(category);
CREATE INDEX IF NOT EXISTS idx_medical_providers_source_type ON medical_providers(source_type);
CREATE INDEX IF NOT EXISTS idx_medical_providers_data_source ON medical_providers(data_source);
CREATE INDEX IF NOT EXISTS idx_medical_providers_lower_category ON medical_providers(LOWER(category));
CREATE INDEX IF NOT EXISTS idx_medical_providers_lower_source_type ON medical_providers(LOWER(source_type));
CREATE INDEX IF NOT EXISTS idx_medical_providers_lower_data_source ON medical_providers(LOWER(data_source));
CREATE INDEX IF NOT EXISTS idx_medical_providers_country_region ON medical_providers(country_code, administrative_area_level_1, locality);

-- Scraping progress table
CREATE TABLE IF NOT EXISTS scraping_progress (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  city TEXT,
  country TEXT,
  category TEXT,
  status TEXT DEFAULT 'pending',
  providers_found INTEGER DEFAULT 0,
  providers_saved INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT
);

-- Coverage tracking table
CREATE TABLE IF NOT EXISTS coverage_tracking (
  id SERIAL PRIMARY KEY,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  total_providers INTEGER DEFAULT 0,
  sources_used TEXT[],
  last_scraped TIMESTAMP
);

-- Uploaded data batches table
CREATE TABLE IF NOT EXISTS uploaded_data_batches (
  id SERIAL PRIMARY KEY,
  batch_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  total_records INTEGER DEFAULT 0,
  successful_uploads INTEGER DEFAULT 0,
  failed_uploads INTEGER DEFAULT 0,
  upload_date TIMESTAMP DEFAULT NOW(),
  categories TEXT[],
  notes TEXT
);

-- Insert medical categories
INSERT INTO medical_categories (category_name, search_terms, priority) VALUES
('Dentist', ARRAY['dentist', 'dental clinic', 'dental practice', 'general dentist'], 1),
('General Practitioner', ARRAY['general practitioner', 'GP', 'family doctor', 'family physician', 'primary care physician'], 2),
('Cardiologist', ARRAY['cardiologist', 'heart doctor', 'cardiac specialist', 'cardiology clinic'], 3),
('Internal Medicine', ARRAY['internal medicine', 'internist', 'internal medicine physician'], 4),
('Occupational Health Specialist', ARRAY['occupational health doctor', 'occupational medicine physician', 'occupational health specialist'], 5),
('Occupational Health Clinic', ARRAY['occupational health clinic', 'occupational medicine clinic', 'workplace health clinic', 'industrial medicine clinic'], 6),
('Audiologist', ARRAY['audiologist', 'hearing doctor', 'audiology clinic', 'hearing specialist'], 7),
('Radiology Imaging Center', ARRAY['radiology center', 'imaging center', 'diagnostic imaging', 'medical imaging', 'radiology clinic'], 8),
('Medical Clinic', ARRAY['medical clinic', 'clinic', 'health clinic', 'outpatient clinic'], 9),
('Private Practice', ARRAY['private practice', 'medical practice', 'physician practice', 'doctor office'], 10),
('Urgent Care', ARRAY['urgent care', 'walk-in clinic', 'immediate care', 'urgent care center'], 11),
('Polyclinic', ARRAY['polyclinic', 'multi-specialty clinic', 'medical center'], 12),
('Hospital', ARRAY['hospital', 'medical center'], 13),
('Primary Care Provider', ARRAY['primary care', 'primary care provider', 'PCP', 'family medicine'], 14),
('Independent Medical Examiner', ARRAY['independent medical examiner', 'IME', 'medical examiner', 'independent medical evaluation'], 15),
('Orthopedist', ARRAY['orthopedist', 'orthopedic doctor', 'orthopedic physician', 'bone doctor'], 16),
('Pulmonologist', ARRAY['pulmonologist', 'lung doctor', 'pulmonary specialist', 'respiratory doctor'], 17),
('Neurologist', ARRAY['neurologist', 'brain doctor', 'neurology specialist', 'nerve specialist'], 18),
('Laboratory', ARRAY['laboratory', 'lab', 'clinical laboratory', 'testing lab', 'diagnostic laboratory', 'medical laboratory'], 19)
ON CONFLICT (category_name) DO NOTHING;

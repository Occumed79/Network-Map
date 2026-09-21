export type ProviderLayerKind = 'provider-type' | 'source';

export type ProviderLayerCategory = {
  id: string;
  label: string;
  section: string;
  kind: ProviderLayerKind;
  typeKey?: string;
  channel: string;
  color: string;
  endpoint: string;
  explorerSource?: string;
  explorerClinicType?: string;
};

function providerType(id: string, label: string, typeKey: string, color: string, section: string, legacyExplorerType = typeKey): ProviderLayerCategory {
  return { id, label, section, kind: 'provider-type', typeKey, channel: `category-${id}`, color,
    endpoint: `/api/provider-category-layers/${id}`, explorerClinicType: legacyExplorerType };
}

function source(id: string, label: string, sourceKey: string, color: string, section: string): ProviderLayerCategory {
  return { id, label, section, kind: 'source', channel: `category-${id}`, color,
    endpoint: `/api/provider-category-layers/${id}`, explorerSource: sourceKey };
}

function synchronizedRegistrySource(id: string, label: string, color: string): ProviderLayerCategory {
  return { id, label, section: 'OFFICIAL INTERNATIONAL REGISTRIES', kind: 'source', channel: `registry-${id}`, color,
    endpoint: `/api/stored-international-registry-layers/${id}` };
}

/**
 * Ordered UI registry for on-demand provider layers. `typeKey` is the canonical
 * provider_type_catalog key; source overlays deliberately have no type key.
 * Every entry owns its own native Mapbox channel so each toggle is independent.
 */
export const PROVIDER_LAYER_CATEGORIES: readonly ProviderLayerCategory[] = [
  providerType('urgent-cares', 'Urgent Cares', 'urgent_care', '#38bdf8', 'CORE OCCUPATIONAL / PRIMARY CARE'),
  providerType('walk-in-clinics', 'Walk-In Clinics', 'walk_in_clinic', '#0ea5e9', 'CORE OCCUPATIONAL / PRIMARY CARE'),
  providerType('occupational-health-clinics', 'Occupational Health Clinics', 'occupational_health', '#22d3ee', 'CORE OCCUPATIONAL / PRIMARY CARE', 'occupational_health_clinic'),
  providerType('general-practitioners', 'General Practitioners', 'general_practitioner', '#818cf8', 'CORE OCCUPATIONAL / PRIMARY CARE'),
  providerType('family-practice', 'Family Practice', 'family_practice', '#6366f1', 'CORE OCCUPATIONAL / PRIMARY CARE'),
  providerType('internal-medicine', 'Internal Medicine', 'internal_medicine', '#4f46e5', 'CORE OCCUPATIONAL / PRIMARY CARE'),
  providerType('concierge-medicine', 'Concierge Medicine', 'concierge_medicine', '#8b5cf6', 'CORE OCCUPATIONAL / PRIMARY CARE'),

  providerType('cardiology', 'Cardiology', 'cardiology', '#ef4444', 'SPECIALISTS'),
  providerType('gastroenterology', 'Gastroenterology', 'gastroenterology', '#f97316', 'SPECIALISTS'),
  providerType('ent', 'ENT / Otolaryngology', 'ent', '#eab308', 'SPECIALISTS'),
  providerType('neurotology', 'Neurotology', 'neurotology', '#84cc16', 'SPECIALISTS'),
  providerType('orthopedics', 'Orthopedics', 'orthopedics', '#14b8a6', 'SPECIALISTS'),
  providerType('pulmonology', 'Pulmonology', 'pulmonology', '#06b6d4', 'SPECIALISTS'),
  providerType('psychiatry', 'Psychiatry', 'psychiatry', '#8b5cf6', 'SPECIALISTS'),
  providerType('sports-medicine', 'Sports Medicine', 'sports_medicine', '#ec4899', 'SPECIALISTS'),

  providerType('dentists', 'Dentists', 'dentist', '#a78bfa', 'ANCILLARY / DIAGNOSTIC', 'dental'),
  providerType('labs', 'Labs', 'lab', '#34d399', 'ANCILLARY / DIAGNOSTIC'),
  providerType('imaging', 'Imaging', 'imaging', '#f472b6', 'ANCILLARY / DIAGNOSTIC'),
  providerType('audiology', 'Audiology', 'audiology', '#2dd4bf', 'ANCILLARY / DIAGNOSTIC'),
  providerType('hearing-aid-providers', 'Hearing Aid Providers', 'hearing_aid', '#10b981', 'ANCILLARY / DIAGNOSTIC'),
  providerType('pharmacy', 'Pharmacy', 'pharmacy', '#4ade80', 'ANCILLARY / DIAGNOSTIC', 'pharmacy_vaccination'),

  providerType('hospitals', 'Hospitals', 'hospital', '#f43f5e', 'FACILITIES / PUBLIC HEALTH'),
  providerType('public-health-clinics', 'Public Health Clinics', 'public_health', '#22c55e', 'FACILITIES / PUBLIC HEALTH'),

  providerType('faa-examiners', 'FAA Examiners', 'faa_examiner', '#f59e0b', 'EXAMINER / SPECIAL NETWORKS', 'faa_provider'),
  providerType('dot-examiners', 'DOT Examiners', 'dot_examiner', '#fb923c', 'EXAMINER / SPECIAL NETWORKS', 'dot_provider'),
  source('blue-hive', 'Blue Hive', 'bluehive', '#60a5fa', 'EXAMINER / SPECIAL NETWORKS'),

  synchronizedRegistrySource('uk-fcdo-recommended', 'UK Embassy Recommended — FCDO', '#f59e0b'),
  synchronizedRegistrySource('germany-klinik-atlas', 'Germany — Bundes-Klinik-Atlas', '#2563eb'),
  synchronizedRegistrySource('canada-odhf', 'Canada — ODHF', '#dc2626'),
  synchronizedRegistrySource('australia-healthdirect', 'Australia — HealthDirect', '#059669'),
  synchronizedRegistrySource('croatia-hzzo-primary-care', 'Croatia — HZZO Primary Care', '#0f766e'),
  synchronizedRegistrySource('chile-minsal', 'Chile — MINSAL Establishments', '#be123c'),
  synchronizedRegistrySource('colombia-reps', 'Colombia — REPS / SISPRO', '#eab308'),
  synchronizedRegistrySource('ireland-hse-health-centres', 'Ireland — HSE Health Centres', '#16a34a'),
  synchronizedRegistrySource('latvia-medical-facilities', 'Latvia — Medical Facilities', '#7c3aed'),
  synchronizedRegistrySource('lithuania-vaspvt', 'Lithuania — Licensed Facilities', '#0284c7'),
  synchronizedRegistrySource('wales-gp-main-sites', 'Wales — GP Main + Branch Sites', '#d946ef'),
  synchronizedRegistrySource('scotland-nhs-hospitals', 'Scotland — NHS Hospitals', '#1d4ed8'),
  synchronizedRegistrySource('montenegro-health-facilities', 'Montenegro — Ministry of Health Facilities', '#b91c1c'),
  synchronizedRegistrySource('cyprus-state-hospitals', 'Cyprus — State Hospitals', '#0e7490'),
  synchronizedRegistrySource('moldova-health-institutions', 'Moldova — Ministry of Health Institutions', '#2563eb'),
  synchronizedRegistrySource('gisco-hospitals-albania', 'Albania — Eurostat/GISCO Hospitals', '#0f766e'),
  synchronizedRegistrySource('gisco-hospitals-austria', 'Austria — Eurostat/GISCO Hospitals', '#be123c'),
  synchronizedRegistrySource('gisco-hospitals-belgium', 'Belgium — Eurostat/GISCO Hospitals', '#7c3aed'),
  synchronizedRegistrySource('gisco-hospitals-bulgaria', 'Bulgaria — Eurostat/GISCO Hospitals', '#0284c7'),
  synchronizedRegistrySource('gisco-hospitals-switzerland', 'Switzerland — Eurostat/GISCO Hospitals', '#475569'),
  synchronizedRegistrySource('gisco-hospitals-estonia', 'Estonia — Eurostat/GISCO Hospitals', '#2563eb'),
  synchronizedRegistrySource('gisco-hospitals-greece', 'Greece — Eurostat/GISCO Hospitals', '#1d4ed8'),
  synchronizedRegistrySource('gisco-hospitals-spain', 'Spain — Eurostat/GISCO Hospitals', '#f59e0b'),
  synchronizedRegistrySource('gisco-hospitals-hungary', 'Hungary — Eurostat/GISCO Hospitals', '#16a34a'),
  synchronizedRegistrySource('gisco-hospitals-italy', 'Italy — Eurostat/GISCO Hospitals', '#059669'),
  synchronizedRegistrySource('gisco-hospitals-luxembourg', 'Luxembourg — Eurostat/GISCO Hospitals', '#9333ea'),
  synchronizedRegistrySource('gisco-hospitals-malta', 'Malta — Eurostat/GISCO Hospitals', '#0d9488'),
  synchronizedRegistrySource('gisco-hospitals-netherlands', 'Netherlands — Eurostat/GISCO Hospitals', '#ea580c'),
  synchronizedRegistrySource('gisco-hospitals-norway', 'Norway — Eurostat/GISCO Hospitals', '#0369a1'),
  synchronizedRegistrySource('gisco-hospitals-poland', 'Poland — Eurostat/GISCO Hospitals', '#b91c1c'),
  synchronizedRegistrySource('gisco-hospitals-portugal', 'Portugal — Eurostat/GISCO Hospitals', '#15803d'),
  synchronizedRegistrySource('gisco-hospitals-romania', 'Romania — Eurostat/GISCO Hospitals', '#7e22ce'),
  synchronizedRegistrySource('gisco-hospitals-serbia', 'Serbia — Eurostat/GISCO Hospitals', '#334155'),
  synchronizedRegistrySource('gisco-hospitals-sweden', 'Sweden — Eurostat/GISCO Hospitals', '#0284c7'),
  synchronizedRegistrySource('gisco-hospitals-slovenia', 'Slovenia — Eurostat/GISCO Hospitals', '#0f766e'),
  synchronizedRegistrySource('gisco-hospitals-slovakia', 'Slovakia — Eurostat/GISCO Hospitals', '#2563eb'),
  synchronizedRegistrySource('singapore-chas', 'Singapore — MOH CHAS Clinics', '#0d9488'),
  synchronizedRegistrySource('mexico-clues', 'Mexico — CLUES Healthcare Facilities', '#15803d'),
  synchronizedRegistrySource('taiwan-nlsc-medical', 'Taiwan — NLSC Medical Facilities', '#9333ea'),
  synchronizedRegistrySource('new-zealand-health-facilities', 'New Zealand — Health NZ Facilities', '#0284c7'),
  synchronizedRegistrySource('brazil-cnes', 'Brazil — CNES (Daily Sync)', '#16a34a'),
  synchronizedRegistrySource('czechia-nrpzs', 'Czechia — NRPZS (Monthly Sync)', '#0369a1'),
  synchronizedRegistrySource('argentina-refes', 'Argentina — REFES (Registry Sync)', '#38bdf8'),
  synchronizedRegistrySource('finland-ptv-healthcare', 'Finland — Suomi.fi Healthcare (Registry Sync)', '#1d4ed8'),
  synchronizedRegistrySource('denmark-sor-healthcare', 'Denmark — SOR Healthcare (Daily Sync)', '#dc2626'),
  synchronizedRegistrySource('france-finess', 'France — FINESS+ (Daily Sync)', '#0055a4'),
  synchronizedRegistrySource('england-cqc', 'England — CQC Healthcare (Weekly Sync)', '#dc2626'),
  synchronizedRegistrySource('northern-ireland-gp', 'Northern Ireland — GP + Dental + Ophthalmic', '#0f766e'),
  synchronizedRegistrySource('ukraine-nhsu', 'Ukraine — NHSU Active Service Locations', '#2563eb'),
  synchronizedRegistrySource('kosovo-moh-private', 'Kosovo — MOH Licensed Private Institutions', '#7c3aed'),
  synchronizedRegistrySource('azerbaijan-tabib', 'Azerbaijan — TABIB Medical Institutions', '#0891b2'),
  synchronizedRegistrySource('liechtenstein-lkv', 'Liechtenstein — LKV Health Providers', '#9333ea'),
  synchronizedRegistrySource('san-marino-authorized', 'San Marino — Authorized Health Facilities', '#0f766e'),
  synchronizedRegistrySource('turkey-moh-health-tourism', 'Türkiye — MOH Authorized Health Facilities', '#dc2626'),
  synchronizedRegistrySource('north-macedonia-moh', 'North Macedonia — MOH Health Centers', '#e11d48'),
  synchronizedRegistrySource('andorra-cass', 'Andorra — CASS Healthcare Providers', '#9333ea'),
  synchronizedRegistrySource('armenia-uhif', 'Armenia — UHIF Medical Organizations', '#d97706'),
  synchronizedRegistrySource('bosnia-domestic', 'Bosnia & Herzegovina — Domestic Healthcare Authorities', '#2563eb'),
  synchronizedRegistrySource('iceland-doh', 'Iceland — Directorate of Health Operators', '#0e7490'),
  synchronizedRegistrySource('georgia-hmis', 'Georgia — GeoStat Healthcare Register', '#b45309'),
  synchronizedRegistrySource('greenland-healthcare', 'Greenland — Peqqik Health Service', '#0891b2'),

  source('international-providers', 'International Providers', 'healthsites_osm', '#06b6d4', 'SOURCE / NETWORK OVERLAYS'),
  source('usa-embassy-recommended', 'U.S. Embassy Recommended', 'embassy_clinic_docs', '#facc15', 'SOURCE / NETWORK OVERLAYS'),
  source('uploaded-clinics', 'Uploaded Clinics', 'my-clinics', '#c084fc', 'SOURCE / NETWORK OVERLAYS'),
] as const;

export const PUBLIC_HEALTH_LAYER = { id: 'naccho-local-health-departments', label: 'NACCHO Local Health Departments',
  channel: 'naccho', color: '#34d399', endpoint: '/api/naccho-lhd' } as const;

export function getProviderLayerCategory(id: string): ProviderLayerCategory | undefined {
  return PROVIDER_LAYER_CATEGORIES.find((entry) => entry.id === id);
}

export const PROVIDER_EXPLORER_SOURCE_OPTIONS = [
  ['all', 'All sources'],
  ...PROVIDER_LAYER_CATEGORIES.filter((entry) => Boolean(entry.explorerSource))
    .map((entry) => [entry.explorerSource as string, entry.label] as [string, string]),
  ['live', 'Live'], ['saved', 'Saved'], ['candidates', 'Candidates'],
] as const;

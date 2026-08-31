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

function liveRegistrySource(id: string, label: string, color: string): ProviderLayerCategory {
  return { id, label, section: 'LIVE INTERNATIONAL REGISTRIES', kind: 'source', channel: `registry-${id}`, color,
    endpoint: `/api/international-registry-layers/${id}` };
}

function synchronizedRegistrySource(id: string, label: string, color: string): ProviderLayerCategory {
  return { id, label, section: 'LIVE INTERNATIONAL REGISTRIES', kind: 'source', channel: `registry-${id}`, color,
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
  providerType('neurotology', 'Neurotology', 'neurotology', '#84b5cf6', 'SPECIALISTS'),
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

  liveRegistrySource('germany-klinik-atlas', 'Germany — Bundes-Klinik-Atlas', '#2563eb'),
  liveRegistrySource('canada-odhf', 'Canada — ODHF', '#dc2626'),
  liveRegistrySource('australia-healthdirect', 'Australia — HealthDirect', '#059669'),
  liveRegistrySource('croatia-hzzo-primary-care', 'Croatia — HZZO Primary Care', '#0f766e'),
  liveRegistrySource('chile-minsal', 'Chile — MINSAL Establishments', '#be123c'),
  liveRegistrySource('colombia-reps', 'Colombia — REPS / SISPRO', '#eab308'),
  liveRegistrySource('ireland-hse-health-centres', 'Ireland — HSE Health Centres', '#16a34a'),
  liveRegistrySource('latvia-medical-facilities', 'Latvia — Medical Facilities', '#7c3aed'),
  liveRegistrySource('lithuania-vaspvt', 'Lithuania — Licensed Facilities', '#0284c7'),
  synchronizedRegistrySource('brazil-cnes', 'Brazil — CNES (Daily Sync)', '#15803d'),

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

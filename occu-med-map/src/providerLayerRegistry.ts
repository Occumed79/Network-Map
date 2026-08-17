export type ProviderLayerCategoryId =
  | 'urgent-cares'
  | 'occupational-health-clinics'
  | 'dentists'
  | 'blue-hive'
  | 'faa-examiners'
  | 'dot-examiners'
  | 'labs'
  | 'imaging'
  | 'audiology'
  | 'general-practitioners'
  | 'pharmacy'
  | 'international-providers'
  | 'usa-embassy-recommended'
  | 'uploaded-clinics';

export type ProviderLayerCategory = {
  id: ProviderLayerCategoryId;
  label: string;
  channel: string;
  color: string;
  endpoint: string;
  explorerSource?: string;
  explorerClinicType?: string;
};

function category(
  id: ProviderLayerCategoryId,
  label: string,
  color: string,
  explorer: { source?: string; clinicType?: string } = {},
): ProviderLayerCategory {
  return {
    id,
    label,
    channel: `category-${id}`,
    color,
    endpoint: `/api/provider-category-layers/${id}`,
    explorerSource: explorer.source,
    explorerClinicType: explorer.clinicType,
  };
}

/**
 * Single UI registry for ordinary provider-map categories.
 *
 * Adding a provider category should require one entry here plus one matching
 * server-side category definition. Sidebar toggles, Mapbox channels, and the
 * Provider Explorer category selector all derive from this registry.
 */
export const PROVIDER_LAYER_CATEGORIES: readonly ProviderLayerCategory[] = [
  category('urgent-cares', 'Urgent Cares', '#38bdf8', { clinicType: 'urgent_care' }),
  category('occupational-health-clinics', 'Occupational Health Clinics', '#22d3ee', { clinicType: 'occupational_health_clinic' }),
  category('dentists', 'Dentists', '#a78bfa', { clinicType: 'dental' }),
  category('blue-hive', 'Blue Hive', '#60a5fa', { source: 'bluehive' }),
  category('faa-examiners', 'FAA Examiners', '#f59e0b', { clinicType: 'faa_provider' }),
  category('dot-examiners', 'DOT Examiners', '#fb923c', { clinicType: 'dot_provider' }),
  category('labs', 'Labs', '#34d399', { clinicType: 'lab' }),
  category('imaging', 'Imaging', '#f472b6', { clinicType: 'imaging' }),
  category('audiology', 'Audiology', '#2dd4bf', { clinicType: 'audiology' }),
  category('general-practitioners', 'General Practitioners', '#818cf8', { clinicType: 'general_practitioner' }),
  category('pharmacy', 'Pharmacy', '#4ade80', { clinicType: 'pharmacy_vaccination' }),
  category('international-providers', 'International Providers', '#06b6d4', { source: 'healthsites_osm' }),
  category('usa-embassy-recommended', 'U.S. Embassy Recommended', '#facc15', { source: 'embassy_clinic_docs' }),
  category('uploaded-clinics', 'Uploaded Clinics', '#c084fc', { source: 'my-clinics' }),
] as const;

export const PUBLIC_HEALTH_LAYER = {
  id: 'naccho-local-health-departments',
  label: 'NACCHO Local Health Departments',
  channel: 'naccho',
  color: '#34d399',
  endpoint: '/api/naccho-lhd',
} as const;

export function getProviderLayerCategory(id: string): ProviderLayerCategory | undefined {
  return PROVIDER_LAYER_CATEGORIES.find((entry) => entry.id === id);
}

export const PROVIDER_EXPLORER_SOURCE_OPTIONS = [
  ['all', 'All sources'],
  ...PROVIDER_LAYER_CATEGORIES
    .filter((entry) => Boolean(entry.explorerSource))
    .map((entry) => [entry.explorerSource as string, entry.label] as [string, string]),
  ['live', 'Live'],
  ['saved', 'Saved'],
  ['candidates', 'Candidates'],
] as const;

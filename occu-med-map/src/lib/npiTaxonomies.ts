export const NPI_CATEGORY_MAP: Record<string, {
  label: string;
  icon: string;
  color: string;
  taxonomyDescriptions: string[];
  preferredType: 'NPI-1' | 'NPI-2' | 'both';
}> = {
  urgent: {
    label: 'Urgent Care',
    icon: 'UC',
    color: '#d9b36e',
    taxonomyDescriptions: ['Clinic/Center, Urgent Care', 'Urgent Care', 'Urgent Care Medicine', 'Emergency Medicine'],
    preferredType: 'NPI-2',
  },
  occupational: {
    label: 'Occupational Medicine',
    icon: 'OM',
    color: '#b9d7ff',
    taxonomyDescriptions: ['Occupational Medicine', 'Preventive Medicine, Occupational Medicine', 'Occupational Health'],
    preferredType: 'both',
  },
  primaryCare: {
    label: 'Primary Care',
    icon: 'PC',
    color: '#9fd7b5',
    taxonomyDescriptions: ['Family Medicine', 'General Practice', 'Internal Medicine', 'Pediatric Medicine'],
    preferredType: 'both',
  },
  dentist: {
    label: 'Dentistry',
    icon: 'DEN',
    color: '#b9d7ff',
    taxonomyDescriptions: ['Dentist', 'Dentist General Practice', 'Dental Public Health', 'Pediatric Dentistry', 'Endodontics', 'Periodontics', 'Prosthodontics', 'Orthodontics and Dentofacial Orthopedics'],
    preferredType: 'both',
  },
  radiology: {
    label: 'Radiology / Imaging',
    icon: 'IMG',
    color: '#d8c4ff',
    taxonomyDescriptions: ['Diagnostic Radiology', 'Radiology', 'Radiological Physics', 'Radiology, Diagnostic'],
    preferredType: 'both',
  },
  pulmonary: {
    label: 'Pulmonary / PFT',
    icon: 'PFT',
    color: '#d9b36e',
    taxonomyDescriptions: ['Pulmonary Disease', 'Internal Medicine', 'Critical Care Medicine'],
    preferredType: 'both',
  },
  lab: {
    label: 'Labs / Phlebotomy',
    icon: 'LAB',
    color: '#d8c4ff',
    taxonomyDescriptions: ['Clinical Medical Laboratory', 'Clinical Laboratory Technician', 'Phlebotomy', 'Medical Technologist'],
    preferredType: 'NPI-2',
  },
  physio: {
    label: 'Physical Therapy',
    icon: 'PT',
    color: '#c4cdeb',
    taxonomyDescriptions: ['Physical Therapist', 'Physical Therapy', 'Rehabilitation Practitioner'],
    preferredType: 'both',
  },
  chiropractic: {
    label: 'Chiropractic',
    icon: 'CHIRO',
    color: '#d99090',
    taxonomyDescriptions: ['Chiropractor', 'Chiropractic'],
    preferredType: 'both',
  },
  audiology: {
    label: 'Audiology',
    icon: 'AUD',
    color: '#b9d7ff',
    taxonomyDescriptions: ['Audiologist', 'Audiologist-Hearing Aid Fitter', 'Hearing Instrument Specialist'],
    preferredType: 'both',
  },
  behavioral: {
    label: 'Behavioral Health',
    icon: 'BH',
    color: '#d8c4ff',
    taxonomyDescriptions: ['Clinical Psychologist', 'Psychiatry', 'Mental Health Counselor', 'Social Worker, Clinical', 'Behavioral Analyst'],
    preferredType: 'both',
  },
};

export type NpiProviderCategory = keyof typeof NPI_CATEGORY_MAP;

export const NPI_CATEGORY_KEYS = Object.keys(NPI_CATEGORY_MAP) as NpiProviderCategory[];

export interface NormalizedNpiProvider {
  npi: string;
  name: string;
  providerType: 'individual' | 'organization';
  taxonomyCode: string;
  taxonomyDescription: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  lat: number | null;
  lng: number | null;
  source: 'NPI Registry';
}

export function getCategoryConfig(category: string) {
  return NPI_CATEGORY_MAP[category] || null;
}

export function getTaxonomiesForCategory(category: string): string[] {
  return NPI_CATEGORY_MAP[category]?.taxonomyDescriptions || [];
}

export function isNpiCategory(category: string): category is NpiProviderCategory {
  return category in NPI_CATEGORY_MAP;
}

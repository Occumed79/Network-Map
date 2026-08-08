export type ProviderSourceId = "npi" | "fmcsa" | "clinicimports" | "mapinventory" | "osm" | "rapidapi" | "webevidence";

export const NPI_TAXONOMIES_BY_SERVICE: Record<string, string[]> = {
  urgent: ["Clinic/Center, Urgent Care", "Urgent Care", "Urgent Care Medicine"],
  urgentCare: ["Clinic/Center, Urgent Care", "Urgent Care", "Urgent Care Medicine"],
  occupational: ["Occupational Medicine", "Preventive Medicine, Occupational Medicine"],
  primaryCare: ["Family Medicine", "General Practice", "Internal Medicine", "Pediatric Medicine"],
  dentist: ["Dentist", "Dentist General Practice", "Dental Public Health", "Pediatric Dentistry"],
  dental: ["Dentist", "Dentist General Practice", "Dental Public Health", "Endodontics", "Oral and Maxillofacial Surgery", "Orthodontics and Dentofacial Orthopedics", "Pediatric Dentistry", "Periodontics", "Prosthodontics"],
  radiology: ["Diagnostic Radiology", "Radiology"],
  pulmonary: ["Pulmonary Disease", "Internal Medicine", "Critical Care Medicine"],
  lab: ["Clinical Medical Laboratory", "Clinical Laboratory Technician", "Phlebotomy"],
  physio: ["Physical Therapist", "Physical Therapy"],
  chiropractic: ["Chiropractor", "Chiropractic"],
  audiology: ["Audiologist", "Audiologist-Hearing Aid Fitter", "Hearing Instrument Specialist"],
  behavioral: ["Clinical Psychologist", "Psychiatry", "Mental Health Counselor"],
  dotExam: ["Occupational Medicine", "Family Medicine", "Internal Medicine", "Chiropractor"],
  faamedical: ["Aerospace Medicine", "Occupational Medicine", "Family Medicine"],
  stressTest: ["Cardiovascular Disease", "Cardiology", "Internal Medicine"],
  mammogram: ["Diagnostic Radiology", "Radiology"],
  drugscreen: ["Clinical Medical Laboratory"],
  physicalExam: ["Occupational Medicine", "Preventive Medicine", "Family Medicine", "Internal Medicine"],
  pharmacy: ["Pharmacy", "Community/Retail Pharmacy"],
  vaccinations: ["Public Health & General Preventive Medicine", "Family Medicine", "Pharmacy"],
  fqhc: ["Federally Qualified Health Center"],
};

const SOURCES_BY_SERVICE: Record<string, ProviderSourceId[]> = {
  dotExam: ["npi", "fmcsa", "clinicimports"],
  faamedical: ["npi", "clinicimports"],
  physicalExam: ["npi", "clinicimports"],
  urgentCare: ["npi", "clinicimports"],
  mammogram: ["npi", "clinicimports"],
  radiology: ["npi", "clinicimports"],
  stressTest: ["npi", "clinicimports"],
  drugscreen: ["npi", "clinicimports"],
  lab: ["npi", "clinicimports"],
  audiology: ["npi", "clinicimports"],
  dental: ["npi", "clinicimports"],
  physio: ["npi", "clinicimports"],
  chiropractic: ["npi", "clinicimports"],
  behavioral: ["npi", "clinicimports"],
  pulmonary: ["npi", "clinicimports"],
  occupational: ["npi", "clinicimports"],
  primaryCare: ["npi", "clinicimports"],
  pharmacy: ["npi", "clinicimports"],
  vaccinations: ["npi", "clinicimports"],
  liveFinder: ["mapinventory", "osm"],
};

export function getNpiTaxonomies(serviceType: string): string[] {
  return NPI_TAXONOMIES_BY_SERVICE[serviceType] || [serviceType].filter(Boolean);
}

export function getBaselineProviderSources(serviceType: string): ProviderSourceId[] {
  return SOURCES_BY_SERVICE[serviceType] || ["npi", "clinicimports"];
}

export type HealthcareCategory =
  | "hospital" | "clinic" | "urgent" | "doctor" | "physical" | "faa" | "dotmd" | "dotchiro"
  | "mammogram" | "pharmacy" | "dentist" | "audiology" | "stress" | "drugscreen" | "eye"
  | "physio" | "lab" | "blood" | "nursing";

export function classifyHealthcareTags(tags: Record<string, unknown>): HealthcareCategory {
  const text = (key: string) => String(tags[key] || "").toLowerCase();
  const a = text("amenity");
  const h = text("healthcare");
  const n = text("name");
  const o = text("office");
  const b = text("building");
  const s = text("shop");
  if (n.includes("faa")) return "faa";
  if (n.includes("dot") && n.includes("chiro")) return "dotchiro";
  if (n.includes("dot") && /(md|np|do|pa|medical)/.test(n)) return "dotmd";
  if (n.includes("mammogram") || n.includes("breast imaging")) return "mammogram";
  if (n.includes("audiology") || n.includes("audiogram") || n.includes("hearing") || s === "hearing_aids") return "audiology";
  if (n.includes("drug screen") || n.includes("toxicology") || n.includes("urine test")) return "drugscreen";
  if (n.includes("stress test") || n.includes("cardiology")) return "stress";
  if (n.includes("physical exam") || n.includes("occupational health")) return "physical";
  if (n.includes("urgent care") || a === "urgent_care" || h === "urgent_care") return "urgent";
  if (a === "hospital" || h === "hospital" || b === "hospital" || n.includes("hospital")) return "hospital";
  if (a === "clinic" || h === "clinic" || n.includes("clinic")) return "clinic";
  if (a === "doctors" || h === "doctor" || h === "doctors" || o === "physician" || o === "medical") return "doctor";
  if (a === "pharmacy" || h === "pharmacy" || s === "chemist" || n.includes("pharmacy")) return "pharmacy";
  if (a === "dentist" || h === "dentist" || n.includes("dental")) return "dentist";
  if (a === "optometrist" || h === "optometrist" || s === "optician") return "eye";
  if (h === "physiotherapist") return "physio";
  if (a === "laboratory" || h === "laboratory" || h === "sample_collection") return "lab";
  if (a === "blood_bank" || h === "blood_bank") return "blood";
  if (a === "nursing_home" || h === "nursing_home") return "nursing";
  return "clinic";
}

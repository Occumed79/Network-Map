export const CLINIC_TYPES = [
  "urgentCare",
  "occupationalMedicine",
  "primaryCare",
  "familyMedicine",
  "drugTesting",
  "audiogram",
  "spirometryPft",
  "xrayImaging",
  "vaccinations",
  "travelMedicine",
  "dotExam",
  "faaMedical",
  "chiropractic",
  "physicalTherapy",
  "labDiagnostics",
  "hospital",
  "dental",
  "pharmacy",
  "eyeVision",
  "specialist",
  "mentalHealth",
  "dialysis",
  "ambulanceEmergency",
  "ambulatorySurgery",
  "ambiguousHealthcare",
] as const;

export type ClinicType = typeof CLINIC_TYPES[number];

export const CLINIC_TYPE_LABELS: Record<ClinicType, string> = {
  urgentCare: "Urgent Care",
  occupationalMedicine: "Occupational Health Clinic",
  primaryCare: "Primary Care / General Practitioner",
  familyMedicine: "Family Medicine",
  drugTesting: "Drug Testing / Collection Site",
  audiogram: "Audiology / Hearing",
  spirometryPft: "Pulmonary / Spirometry",
  xrayImaging: "Imaging / Radiology",
  vaccinations: "Vaccination Clinic",
  travelMedicine: "Travel Medicine",
  dotExam: "DOT Examination Provider",
  faaMedical: "FAA Medical Examiner",
  chiropractic: "Chiropractic",
  physicalTherapy: "Physical Therapy / Rehabilitation",
  labDiagnostics: "Laboratory / Diagnostics",
  hospital: "Hospital",
  dental: "Dental",
  pharmacy: "Pharmacy",
  eyeVision: "Eye / Vision",
  specialist: "Specialist",
  mentalHealth: "Mental Health",
  dialysis: "Dialysis Center",
  ambulanceEmergency: "Ambulance / Emergency Services",
  ambulatorySurgery: "Ambulatory Surgery Center",
  ambiguousHealthcare: "Ambiguous Healthcare",
};

type ClassifierInput = {
  name?: unknown;
  category?: unknown;
  types?: unknown;
  services?: unknown;
  service_categories?: unknown;
  taxonomy_description?: unknown;
  raw_data?: unknown;
  raw_source_data?: unknown;
};

const RULES: Array<[ClinicType, RegExp]> = [
  ["urgentCare", /urgent\s*care|walk[- ]?in|immediate care|after[- ]?hours clinic|concentra|afc urgent/i],
  ["occupationalMedicine", /occupational|employee health|work(ers)? comp|industrial medicine|occ\s*med|medycyna pracy|arbeitsmedizin/i],
  ["dotExam", /\bdot\b|department of transportation|\bcdl\b|medical examiner|\bfmcsa\b/i],
  ["faaMedical", /\bfaa\b|aviation medical|aerospace medicine|\bame\b/i],
  ["drugTesting", /drug test|drug screen|toxicology|\bmro\b|collection site|substance abuse|urine collection/i],
  ["audiogram", /audiogram|audiology|hearing|audiometr|\bcaohc\b|ent clinic|otolaryng/i],
  ["spirometryPft", /spirometry|pulmonary function|\bpft\b|respirator fit|lung function/i],
  ["xrayImaging", /x[- ]?ray|radiology|imaging|diagnostic imaging|mammography|ultrasound|sonography|\bmri\b|\bct scan\b/i],
  ["vaccinations", /vaccin|immuniz|flu shot|inoculation/i],
  ["travelMedicine", /travel medicine|passport health|tropical medicine/i],
  ["dental", /dentist|dental|orthodont|endodont|periodont|oral surgery|stomatolog/i],
  ["pharmacy", /pharmacy|drugstore|chemist|apothec|cvs|walgreens|rite aid/i],
  ["eyeVision", /optomet|ophthalm|vision|eye care|oculist/i],
  ["mentalHealth", /mental health|psychiatr|psycholog|behavioral health|counseling/i],
  ["dialysis", /dialysis|hemodialysis|renal center|kidney center/i],
  ["ambulanceEmergency", /ambulance|emergency medical service|\bems\b|paramedic/i],
  ["ambulatorySurgery", /ambulatory surgery|surgical center|day surgery|outpatient surgery/i],
  ["chiropractic", /chiro/i],
  ["physicalTherapy", /physical therapy|physiotherapy|rehabilitation|rehab clinic/i],
  ["labDiagnostics", /laborator|diagnostic lab|labcorp|quest diagnostics|pathology|blood draw|phlebotom/i],
  ["hospital", /hospital|emergency room|emergency department|university medical center|regional medical center/i],
  ["familyMedicine", /family medicine|family practice/i],
  ["primaryCare", /primary care|general practice|general practitioner|internal medicine|community health cent(?:er|re)|polyclinic|medical clinic|clinic\/center|physician office|doctor(?:s)? office/i],
  ["specialist", /specialist|specialty clinic|cardiolog|neurolog|dermatolog|gastroenterolog|endocrinolog|orthopedic|orthopaedic|urolog|rheumatolog|oncolog|nephrolog|pulmonolog|allerg|immunolog|obstetric|gynecolog|pediatric|surgeon/i],
];

const DIRECT_ALIASES: Record<string, ClinicType> = {
  urgentcare: "urgentCare",
  occupationalmedicine: "occupationalMedicine",
  occupationalhealth: "occupationalMedicine",
  occupationalhealthclinic: "occupationalMedicine",
  primarycare: "primaryCare",
  generalpractitioner: "primaryCare",
  generalpractice: "primaryCare",
  clinic: "primaryCare",
  doctors: "primaryCare",
  doctor: "primaryCare",
  familymedicine: "familyMedicine",
  familypractice: "familyMedicine",
  drugtesting: "drugTesting",
  collectionsite: "drugTesting",
  audiogram: "audiogram",
  audiology: "audiogram",
  hearing: "audiogram",
  spirometrypft: "spirometryPft",
  spirometry: "spirometryPft",
  pulmonary: "spirometryPft",
  xrayimaging: "xrayImaging",
  imaging: "xrayImaging",
  radiology: "xrayImaging",
  vaccinations: "vaccinations",
  vaccinationclinic: "vaccinations",
  travelmedicine: "travelMedicine",
  dotexam: "dotExam",
  dotprovider: "dotExam",
  faamedical: "faaMedical",
  faaprovider: "faaMedical",
  chiropractic: "chiropractic",
  physicaltherapy: "physicalTherapy",
  physiotherapy: "physicalTherapy",
  rehabilitation: "physicalTherapy",
  labdiagnostics: "labDiagnostics",
  laboratory: "labDiagnostics",
  lab: "labDiagnostics",
  diagnostics: "labDiagnostics",
  hospital: "hospital",
  dental: "dental",
  dentist: "dental",
  pharmacy: "pharmacy",
  pharmacyvaccination: "pharmacy",
  eyevision: "eyeVision",
  optometry: "eyeVision",
  ophthalmology: "eyeVision",
  specialist: "specialist",
  mentalhealth: "mentalHealth",
  dialysis: "dialysis",
  ambulanceemergency: "ambulanceEmergency",
  ambulance: "ambulanceEmergency",
  ambulatorysurgery: "ambulatorySurgery",
  surgerycenter: "ambulatorySurgery",
  ambiguoushealthcare: "ambiguousHealthcare",
};

const GENERIC_OR_UNCERTAIN_VALUES = new Set([
  "",
  "unknown",
  "unk",
  "other",
  "othermedicalfacility",
  "healthcare",
  "healthcarefacility",
  "medicalfacility",
  "facility",
  "medical",
  "none",
  "null",
  "na",
  "n a",
]);

function flatten(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(flatten).join(" ");
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).map(flatten).join(" ");
  return "";
}

function normalizeToken(value: unknown): string {
  return flatten(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function classifyProvider(input: ClassifierInput): ClinicType {
  const haystack = [
    input.name,
    input.category,
    input.types,
    input.services,
    input.service_categories,
    input.taxonomy_description,
    input.raw_data,
    input.raw_source_data,
  ]
    .map(flatten)
    .join(" \n ");
  for (const [type, pattern] of RULES) {
    if (pattern.test(haystack)) return type;
  }
  return "ambiguousHealthcare";
}

export function normalizeClinicType(value: unknown, input: ClassifierInput = {}): ClinicType {
  const token = normalizeToken(value);
  if (token && !GENERIC_OR_UNCERTAIN_VALUES.has(token)) {
    const direct = DIRECT_ALIASES[token];
    if (direct) return direct;
    const classifiedFromValue = classifyProvider({ ...input, category: value });
    if (classifiedFromValue !== "ambiguousHealthcare") return classifiedFromValue;
  }
  return classifyProvider(input);
}

export function clinicTypeLabel(type: ClinicType): string {
  return CLINIC_TYPE_LABELS[type];
}

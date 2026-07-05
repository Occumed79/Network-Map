export const CLINIC_TYPES = [
  "urgentCare", "occupationalMedicine", "primaryCare", "familyMedicine", "drugTesting", "audiogram",
  "spirometryPft", "xrayImaging", "vaccinations", "travelMedicine", "dotExam", "faaMedical",
  "chiropractic", "physicalTherapy", "labDiagnostics", "hospital", "dental", "pharmacy", "eyeVision", "unknown",
] as const;

export type ClinicType = typeof CLINIC_TYPES[number];

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
  ["urgentCare", /urgent\s*care|walk[- ]?in|immediate care|concentra|afc urgent/i],
  ["occupationalMedicine", /occupational|employee health|work(ers)? comp|industrial medicine|occ\s*med/i],
  ["familyMedicine", /family medicine|family practice/i],
  ["primaryCare", /primary care|general practice|internal medicine|clinic\/center|physician/i],
  ["drugTesting", /drug test|drug screen|toxicology|mro|collection site|substance abuse/i],
  ["audiogram", /audiogram|audiology|hearing|caohc/i],
  ["spirometryPft", /spirometry|pulmonary function|\bpft\b|respirator fit/i],
  ["xrayImaging", /x[- ]?ray|radiology|imaging|diagnostic imaging/i],
  ["vaccinations", /vaccin|immuniz|flu shot|travel vaccine/i],
  ["travelMedicine", /travel medicine|passport health/i],
  ["dotExam", /\bdot\b|department of transportation|cdl|medical examiner|fmcsa/i],
  ["faaMedical", /\bfaa\b|aviation medical|aerospace medicine|ame\b/i],
  ["chiropractic", /chiro/i],
  ["physicalTherapy", /physical therapy|physiotherapy|rehabilitation/i],
  ["labDiagnostics", /laborator|diagnostic|labcorp|quest diagnostics|pathology/i],
  ["hospital", /hospital|medical center|emergency room|\ber\b/i],
  ["dental", /dentist|dental|orthodont|endodont|periodont/i],
  ["pharmacy", /pharmacy|drugstore|chemist|cvs|walgreens|rite aid/i],
  ["eyeVision", /optomet|ophthalm|vision|eye care/i],
];

function flatten(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(flatten).join(" ");
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).map(flatten).join(" ");
  return "";
}

export function classifyProvider(input: ClassifierInput): ClinicType {
  const haystack = [input.name, input.category, input.types, input.services, input.service_categories, input.taxonomy_description, input.raw_data, input.raw_source_data]
    .map(flatten)
    .join(" \n ");
  for (const [type, pattern] of RULES) {
    if (pattern.test(haystack)) return type;
  }
  return "unknown";
}

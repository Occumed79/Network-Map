import mapboxgl from "mapbox-gl";

const SOURCE_ID = "provider-location-search-results";
const LAYER_ID = "provider-location-search-dots";
const SOURCE_PATCH_FLAG = "__occumedProviderTypeSourcePatched";
const WRAPPED_SOURCE_FLAG = "__occumedProviderTypeSetDataWrapped";

type ProviderTypeKey =
  | "urgentCare"
  | "occupationalMedicine"
  | "primaryCare"
  | "familyMedicine"
  | "drugTesting"
  | "audiogram"
  | "spirometryPft"
  | "xrayImaging"
  | "vaccinations"
  | "travelMedicine"
  | "dotExam"
  | "faaMedical"
  | "chiropractic"
  | "physicalTherapy"
  | "labDiagnostics"
  | "hospital"
  | "dental"
  | "pharmacy"
  | "eyeVision"
  | "specialist"
  | "mentalHealth"
  | "dialysis"
  | "ambulanceEmergency"
  | "ambulatorySurgery"
  | "ambiguousHealthcare";

const TYPE_LABELS: Record<ProviderTypeKey, string> = {
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

const RULES: Array<[ProviderTypeKey, RegExp]> = [
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

const DIRECT_ALIASES: Record<string, ProviderTypeKey> = {
  urgentcare: "urgentCare",
  occupationalmedicine: "occupationalMedicine",
  occupationalhealth: "occupationalMedicine",
  occupationalhealthclinic: "occupationalMedicine",
  primarycare: "primaryCare",
  primarycaregeneralpractitioner: "primaryCare",
  generalpractitioner: "primaryCare",
  generalpractice: "primaryCare",
  clinic: "primaryCare",
  doctors: "primaryCare",
  doctor: "primaryCare",
  familymedicine: "familyMedicine",
  familypractice: "familyMedicine",
  drugtesting: "drugTesting",
  drugtestingcollectionsite: "drugTesting",
  collectionsite: "drugTesting",
  audiogram: "audiogram",
  audiology: "audiogram",
  audiologyhearing: "audiogram",
  hearing: "audiogram",
  spirometrypft: "spirometryPft",
  pulmonaryspirometry: "spirometryPft",
  spirometry: "spirometryPft",
  pulmonary: "spirometryPft",
  xrayimaging: "xrayImaging",
  imagingradiology: "xrayImaging",
  imaging: "xrayImaging",
  radiology: "xrayImaging",
  vaccinations: "vaccinations",
  vaccinationclinic: "vaccinations",
  travelmedicine: "travelMedicine",
  dotexam: "dotExam",
  dotexaminationprovider: "dotExam",
  dotprovider: "dotExam",
  faamedical: "faaMedical",
  faamedicalexaminer: "faaMedical",
  faaprovider: "faaMedical",
  chiropractic: "chiropractic",
  physicaltherapy: "physicalTherapy",
  physicaltherapyrehabilitation: "physicalTherapy",
  physiotherapy: "physicalTherapy",
  rehabilitation: "physicalTherapy",
  labdiagnostics: "labDiagnostics",
  laboratorydiagnostics: "labDiagnostics",
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
  dialysiscenter: "dialysis",
  ambulanceemergency: "ambulanceEmergency",
  ambulanceemergencyservices: "ambulanceEmergency",
  ambulance: "ambulanceEmergency",
  ambulatorysurgery: "ambulatorySurgery",
  ambulatorysurgerycenter: "ambulatorySurgery",
  surgerycenter: "ambulatorySurgery",
  ambiguoushealthcare: "ambiguousHealthcare",
  unknown: "ambiguousHealthcare",
  other: "ambiguousHealthcare",
  healthcare: "ambiguousHealthcare",
  healthcarefacility: "ambiguousHealthcare",
  medicalfacility: "ambiguousHealthcare",
};

function normalizeToken(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(text).join(" ");
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).map(text).join(" ");
  return String(value);
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function firstProperty(properties: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = properties[key];
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return "";
}

function classify(properties: Record<string, unknown>): { key: ProviderTypeKey; label: string; sourceType: string } {
  const sourceType = firstProperty(properties, [
    "sourceProviderType",
    "source_provider_type",
    "providerType",
    "provider_type",
    "clinic_type",
    "facility_type",
    "type",
    "category",
  ]);
  const direct = DIRECT_ALIASES[normalizeToken(sourceType)];
  if (direct && direct !== "ambiguousHealthcare") {
    return { key: direct, label: TYPE_LABELS[direct], sourceType };
  }

  const haystack = [
    properties.name,
    sourceType,
    properties.services,
    properties.categories,
    properties.source,
  ].map(text).join(" \n ");
  for (const [key, pattern] of RULES) {
    if (pattern.test(haystack)) return { key, label: TYPE_LABELS[key], sourceType };
  }

  return {
    key: "ambiguousHealthcare",
    label: TYPE_LABELS.ambiguousHealthcare,
    sourceType,
  };
}

function normalizeFeature(feature: GeoJSON.Feature): GeoJSON.Feature {
  if (feature.geometry?.type !== "Point") return feature;
  const properties = { ...(feature.properties || {}) } as Record<string, unknown>;
  const classification = classify(properties);
  return {
    ...feature,
    properties: {
      ...properties,
      sourceProviderType: classification.sourceType,
      providerTypeKey: classification.key,
      providerType: classification.label,
    },
  };
}

function normalizeGeoJsonData(data: unknown): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  const geojson = data as GeoJSON.GeoJSON;
  if (geojson.type === "FeatureCollection") {
    return {
      ...geojson,
      features: geojson.features.map(normalizeFeature),
    };
  }
  if (geojson.type === "Feature") return normalizeFeature(geojson);
  return data;
}

function wrapFinderSource(map: mapboxgl.Map, initialData?: unknown): void {
  const source = map.getSource(SOURCE_ID) as (mapboxgl.GeoJSONSource & Record<string, unknown>) | undefined;
  if (!source || source[WRAPPED_SOURCE_FLAG]) return;
  const originalSetData = source.setData.bind(source);
  source.setData = ((data: string | GeoJSON.GeoJSON) => originalSetData(normalizeGeoJsonData(data) as string | GeoJSON.GeoJSON)) as typeof source.setData;
  source[WRAPPED_SOURCE_FLAG] = true;
  if (initialData && typeof initialData === "object") {
    originalSetData(normalizeGeoJsonData(initialData) as GeoJSON.GeoJSON);
  }
}

function patchSourceRegistration(): void {
  const prototype = mapboxgl.Map.prototype as any;
  if (prototype[SOURCE_PATCH_FLAG]) return;
  const originalAddSource = prototype.addSource;
  prototype.addSource = function patchedAddSource(
    this: mapboxgl.Map,
    id: string,
    source: mapboxgl.AnySourceData,
  ): mapboxgl.Map {
    let nextSource = source;
    let initialData: unknown;
    if (id === SOURCE_ID && source && source.type === "geojson") {
      initialData = source.data;
      nextSource = {
        ...source,
        data: normalizeGeoJsonData(source.data) as string | GeoJSON.GeoJSON,
      } as mapboxgl.GeoJSONSourceSpecification;
    }
    const result = originalAddSource.call(this, id, nextSource);
    if (id === SOURCE_ID) wrapFinderSource(this, initialData);
    return result;
  };
  prototype[SOURCE_PATCH_FLAG] = true;
}

function popupHtml(properties: Record<string, unknown>): string {
  const classification = classify(properties);
  const rows = ([
    ["Provider Type", classification.label],
    ["Address", firstProperty(properties, ["address"])],
    ["City", firstProperty(properties, ["city"])],
    ["Region", firstProperty(properties, ["adminArea", "admin_area"])],
    ["Country", firstProperty(properties, ["country"])],
    ["Phone", firstProperty(properties, ["phone"])],
    ["Services", firstProperty(properties, ["services"])],
    ["Source", firstProperty(properties, ["source"])],
  ] as Array<[string, string]>).filter(([, value]) => Boolean(value));
  const website = firstProperty(properties, ["website"]);
  const sourceType = classification.sourceType && normalizeToken(classification.sourceType) !== normalizeToken(classification.label)
    ? `<div class="provider-location-popup-row"><span>Source Type</span><strong>${escapeHtml(classification.sourceType)}</strong></div>`
    : "";
  const websiteRow = website
    ? `<div class="provider-location-popup-row"><span>Website</span><a href="${escapeHtml(website)}" target="_blank" rel="noreferrer">Open site</a></div>`
    : "";
  return `<div class="provider-location-popup">
    <div class="provider-location-popup-title">${escapeHtml(firstProperty(properties, ["name"]) || "Healthcare provider")}</div>
    ${rows.map(([label, value]) => `<div class="provider-location-popup-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
    ${sourceType}
    ${websiteRow}
  </div>`;
}

export function normalizedProviderClickListener(event: mapboxgl.MapLayerMouseEvent): void {
  const raw = event.features?.[0];
  if (!raw || raw.geometry.type !== "Point") return;
  const coordinates = raw.geometry.coordinates.slice() as [number, number];
  while (Math.abs(event.lngLat.lng - coordinates[0]) > 180) {
    coordinates[0] += event.lngLat.lng > coordinates[0] ? 360 : -360;
  }
  new mapboxgl.Popup({ closeButton: true, maxWidth: "380px" })
    .setLngLat(coordinates)
    .setHTML(popupHtml((raw.properties || {}) as Record<string, unknown>))
    .addTo(event.target);
}

patchSourceRegistration();

export {};

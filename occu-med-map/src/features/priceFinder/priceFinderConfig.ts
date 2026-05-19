export const PF_SERVICE_LABELS: Record<string,string> = {
  urgentCare:'Urgent Care', dental:'Dental', pharmacy:'Pharmacy',
  physicalExam:'Physical Exam', faamedical:'FAA Medical Exam',
  stressTest:'Stress Test', mammogram:'Mammogram',
  dotExam:'DOT Physical', vaccinations:'Vaccinations',
};

export const PF_TAXONOMY_MAP: Record<string,string[]> = {
  urgentCare:  ['Clinic/Center, Urgent Care','Urgent Care'],
  dental:      ['Dentist General Practice','Dentist'],
  pharmacy:    ['Pharmacy'],
  physicalExam:['Occupational Medicine','Preventive Medicine','Family Medicine'],
  faamedical:  ['Aerospace Medicine','Occupational Medicine'],
  stressTest:  ['Cardiovascular Disease','Cardiology'],
  mammogram:   ['Diagnostic Radiology','Radiology'],
  dotExam:     ['Occupational Medicine'],
  vaccinations:['Public Health & General Preventive Medicine','Family Medicine'],
};

export const PF_REF_PRICES: Record<string,{range:string;note:string}> = {
  urgentCare:  {range:'$120 – $280', note:'Self-pay typical; Medicare avg ~$120; FQHCs $20–$40 sliding scale'},
  dental:      {range:'$200 – $350', note:'Exam + cleaning; crown $1,000–$1,500; FQHCs ~$20–$80 sliding scale'},
  pharmacy:    {range:'Varies widely', note:'Use GoodRx or Cost Plus Drugs for generics — may save 80%+'},
  physicalExam:{range:'$100 – $200', note:'Medicare covers annual wellness visit free; occ-med physicals $100–$200'},
  faamedical:  {range:'$75 – $250', note:'Class 3 (private pilot) ~$75–$150; Class 1 (ATP) ~$150–$250'},
  stressTest:  {range:'$350 – $800', note:'Exercise stress test; echo stress test $800–$1,500; Medicare avg ~$350'},
  mammogram:   {range:'$100 – $300', note:'Medicare covers annual screening free; ACS & CDC free programs available'},
  dotExam:     {range:'$75 – $150', note:'FMCSA certified examiner required; Concentra/CareNow ~$75–$100'},
  vaccinations:{range:'$0 – $300',  note:'Flu/COVID often free; travel vaccines $100–$300; see VaccineFinder.org'},
};

export const PF_ZOCDOC_SPEC: Record<string,string> = {
  urgentCare:'Urgent Care', dental:'Dentist', pharmacy:'General Practice',
  physicalExam:'General Practice', faamedical:'Internal Medicine',
  stressTest:'Cardiologist', mammogram:'OB-GYN',
  dotExam:'Internal Medicine', vaccinations:'General Practice',
};

export const PF_SESAME_SPEC: Record<string,string> = {
  urgentCare:'urgent-care', dental:'dentist', pharmacy:'primary-care',
  physicalExam:'physical-exam', faamedical:'primary-care',
  stressTest:'cardiology', mammogram:'mammogram',
  dotExam:'dot-physical-exam', vaccinations:'primary-care',
};

export const PF_MDSAVE_SLUG: Record<string,string> = {
  urgentCare:'urgent-care-visit', dental:'dental-exam-and-cleaning',
  pharmacy:'', physicalExam:'annual-physical-exam',
  faamedical:'faa-medical-exam', stressTest:'stress-test',
  mammogram:'mammogram', dotExam:'dot-physical-exam', vaccinations:'',
};

export const PF_NEWCHOICE_SLUG: Record<string,string> = {
  urgentCare:'urgent-care', dental:'dental', pharmacy:'',
  physicalExam:'physical-exam', faamedical:'', stressTest:'stress-test',
  mammogram:'mammogram', dotExam:'', vaccinations:'',
};

export const PF_NETWORKS: Record<string,Array<{name:string;desc:string;url:string;tag:string}>> = {
  urgentCare:[
    {name:'Sesame Care',desc:'Transparent cash-pay urgent care. Prices listed upfront.',url:'https://sesamecare.com/urgent-care',tag:'CASH PAY'},
    {name:'GoodRx Care',desc:'Online urgent care with upfront pricing, starting at $20.',url:'https://www.goodrx.com/care/urgent-care',tag:'ONLINE'},
    {name:'MinuteClinic (CVS)',desc:'Walk-in urgent care — prices posted online before your visit.',url:'https://www.cvs.com/minuteclinic/visit-types-and-costs',tag:'TRANSPARENT'},
    {name:'Mira Health',desc:'Flat-fee urgent care membership — $45/mo includes visits & labs.',url:'https://www.talkmira.com/',tag:'FLAT FEE'},
    {name:'MDsave',desc:'Prepay for urgent care at listed prices and save up to 60%.',url:'https://www.mdsave.com/',tag:'PREPAY'},
    {name:'Solv Health',desc:'Book urgent care online — many locations list wait times and prices.',url:'https://www.solvhealth.com/',tag:'BOOKING'},
  ],
  dental:[
    {name:'Affordable Care',desc:'600+ dental practices with transparent fee schedules.',url:'https://www.affordablecare.com/',tag:'FEE SCHEDULE'},
    {name:'1-800-Dentist',desc:'Find local dentists and compare prices in your area.',url:'https://www.1800dentist.com/',tag:'COMPARE'},
    {name:'Open Care',desc:'Compares dental practices by price, insurance, and location.',url:'https://www.opencare.com/',tag:'COMPARE'},
    {name:'Dental Plans',desc:'Discount dental plans with listed savings on procedures.',url:'https://www.dentalplans.com/',tag:'DISCOUNT'},
    {name:'CostHelper Health',desc:'Real user-reported dental costs with ranges for common procedures.',url:'https://health.costhelper.com/dentist.html',tag:'COST GUIDE'},
  ],
  pharmacy:[
    {name:'GoodRx',desc:'Compare prescription prices at pharmacies near you.',url:'https://www.goodrx.com/',tag:'FREE COUPONS'},
    {name:'RxSaver',desc:'Compare pharmacy prices and print discount coupons.',url:'https://www.rxsaver.com/',tag:'COMPARE'},
    {name:'Mark Cuban Cost Plus Drugs',desc:'Transparent drug pricing — 1,000+ medications at cost + 15%.',url:'https://costplusdrugs.com/',tag:'COST + 15%'},
    {name:'Blink Health',desc:'Prepay for prescriptions online and pick up at local pharmacies.',url:'https://www.blinkhealth.com/',tag:'PREPAY'},
  ],
  physicalExam:[
    {name:'Sesame Care – Physical Exams',desc:'Book a physical exam with upfront transparent pricing.',url:'https://sesamecare.com/physical-exam',tag:'CASH PAY'},
    {name:'Concentra',desc:'Occupational health physicals with pricing available by location.',url:'https://www.concentra.com/',tag:'OCC HEALTH'},
    {name:'MinuteClinic – Annual Physical',desc:'CVS walk-in physical exams with published visit costs.',url:'https://www.cvs.com/minuteclinic/services/preventive-care/physical-exams',tag:'WALK-IN'},
    {name:'FAIR Health Consumer',desc:'Look up fair prices for physical exam codes in your zip code.',url:'https://fairhealthconsumer.org/',tag:'PRICE GUIDE'},
  ],
  faamedical:[
    {name:'FAA AME Locator',desc:'Official FAA tool to find certified Aviation Medical Examiners near you.',url:'https://designee.faa.gov/designeeLocator',tag:'OFFICIAL FAA'},
    {name:'AOPA Medical Certification',desc:'AOPA guide to FAA medical exams with typical cost ranges.',url:'https://www.aopa.org/go-fly/medical-resources/a-guide-to-faa-medical-certification',tag:'COST GUIDE'},
    {name:'AeroMD',desc:'Specialized FAA medical exam service with upfront online booking.',url:'https://aeromd.com/',tag:'SPECIALIST'},
    {name:'MDsave – FAA Medical',desc:'Find and pre-purchase FAA exam packages where available.',url:'https://www.mdsave.com/',tag:'PREPAY'},
  ],
  stressTest:[
    {name:'MDsave – Stress Test',desc:'Pre-purchase treadmill stress test at listed prices, up to 60% off.',url:'https://www.mdsave.com/procedures/stress-test',tag:'PREPAY'},
    {name:'Healthcare Bluebook',desc:'Find fair prices for exercise stress tests in your area.',url:'https://www.healthcarebluebook.com/',tag:'FAIR PRICE'},
    {name:'New Choice Health',desc:'Compare stress test prices at facilities near you.',url:'https://www.newchoicehealth.com/',tag:'COMPARE'},
    {name:'Sesame Care – Cardiology',desc:'Book cardiology consultations with upfront transparent pricing.',url:'https://sesamecare.com/',tag:'CASH PAY'},
  ],
  mammogram:[
    {name:'MDsave – Mammogram',desc:'Pre-purchase screening mammograms at listed prices.',url:'https://www.mdsave.com/procedures/mammogram',tag:'PREPAY'},
    {name:'New Choice Health – Mammogram',desc:'Compare mammogram prices at imaging centers near you.',url:'https://www.newchoicehealth.com/mammogram',tag:'COMPARE'},
    {name:'Susan G. Komen – Free Screening',desc:'Connects uninsured women to free or low-cost mammograms.',url:'https://www.komen.org/breast-health/screening/mammograms/free-low-cost-mammograms/',tag:'FREE/LOW COST'},
    {name:'CDC NBCCEDP',desc:'National Breast & Cervical Cancer Early Detection — free mammograms for qualifying women.',url:'https://www.cdc.gov/cancer/nbccedp/',tag:'FREE PROGRAM'},
  ],
  dotExam:[
    {name:'Concentra – DOT Physicals',desc:'DOT physical exams at 500+ locations. Prices typically $75–$150.',url:'https://www.concentra.com/occupational-health/dot-physicals/',tag:'CHAIN PRICING'},
    {name:'CareNow – DOT Physicals',desc:'Urgent care chain offering DOT exams with online check-in.',url:'https://www.carenow.com/services/dot-physical/',tag:'WALK-IN'},
    {name:'FMCSA Medical Examiner Locator',desc:'Official FMCSA tool to find certified DOT medical examiners near you.',url:'https://ai.fmcsa.dot.gov/mcs150/commonMESearchForm.aspx',tag:'OFFICIAL FMCSA'},
    {name:'OHS Health',desc:'Occupational health clinics specializing in DOT exams with listed fees.',url:'https://ohshealth.com/',tag:'TRANSPARENT'},
  ],
  vaccinations:[
    {name:'VaccineFinder (CDC)',desc:'Official CDC tool to find COVID, flu, and other vaccines near you.',url:'https://vaccinefinder.org/',tag:'FREE / CDC'},
    {name:'CVS Pharmacy – Vaccines',desc:'Walk-in vaccinations with prices listed online.',url:'https://www.cvs.com/immunizations/in-store-immunizations',tag:'PRICE LIST'},
    {name:'Walgreens – Vaccines',desc:'Walk-in vaccine clinic with published vaccine prices.',url:'https://www.walgreens.com/topic/pharmacy/walgreens-immunization-services.jsp',tag:'PRICE LIST'},
    {name:'Vaccines.gov',desc:'Find flu shots, travel vaccines, and immunization clinics near you.',url:'https://www.vaccines.gov/',tag:'LOCATOR'},
  ],
};

export const PF_RESOURCES = [
  {name:'Healthcare Bluebook',desc:'Fair price range for medical procedures in your area.',url:'https://www.healthcarebluebook.com/',tag:'FAIR PRICE'},
  {name:'FAIR Health Consumer',desc:'Estimate out-of-pocket costs by procedure and zip code.',url:'https://fairhealthconsumer.org/',tag:'ESTIMATOR'},
  {name:'ClearHealthCosts',desc:'Crowdsourced prices for medical procedures. Find what others paid.',url:'https://clearhealthcosts.com/',tag:'CROWDSOURCED'},
  {name:'New Choice Health',desc:'Compare procedure prices at facilities near you.',url:'https://www.newchoicehealth.com/',tag:'COMPARE'},
];

export function pfDeepLinks(city:string, state:string, svc:string) {
  const loc = encodeURIComponent(`${city}${state?', '+state:''}`);
  const links:Array<{name:string;url:string;tag:string;desc:string}> = [];
  const zSpec = PF_ZOCDOC_SPEC[svc];
  if (zSpec) links.push({name:'ZocDoc', tag:'BOOK ONLINE',
    desc:'Book in-network appointments & compare accepted insurance',
    url:`https://www.zocdoc.com/search?address=${loc}&dr_specialty=${encodeURIComponent(zSpec)}`});
  const mSlug = PF_MDSAVE_SLUG[svc];
  if (mSlug) links.push({name:'MDsave', tag:'PRE-PAY PRICE',
    desc:'Pre-purchase procedures at listed prices — up to 60% off',
    url:`https://www.mdsave.com/procedures/${mSlug}`});
  const sSpec = PF_SESAME_SPEC[svc];
  if (sSpec) links.push({name:'Sesame Care', tag:'CASH PAY',
    desc:'Direct-pay appointments with upfront transparent pricing',
    url:`https://sesamecare.com/search?specialty=${sSpec}&location=${loc}`});
  const ncSlug = PF_NEWCHOICE_SLUG[svc];
  if (ncSlug) links.push({name:'New Choice Health', tag:'COMPARE',
    desc:'Side-by-side price comparison at nearby facilities',
    url:`https://www.newchoicehealth.com/${ncSlug}?location=${loc}`});
  links.push({name:'Healthcare Bluebook', tag:'FAIR PRICE',
    desc:'Find the fair price for this service in your area',
    url:'https://www.healthcarebluebook.com/'});
  links.push({name:'FAIR Health Consumer', tag:'ESTIMATOR',
    desc:'Estimate out-of-pocket costs by zip code and procedure',
    url:'https://fairhealthconsumer.org/'});
  return links;
}

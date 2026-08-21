#!/usr/bin/env python3
import json, os, re, sqlite3, time, urllib.request, urllib.error
from collections import Counter
import duckdb

RELEASE = "2026-08-19.0"
API_URL = os.environ.get("NETWORK_MAP_API_URL", "https://network-map-tool-mqib.onrender.com/api/my-clinics/upload")
DB_PATH = "overture_cleaned_usa.sqlite"
CHUNK_SIZE = 5000
SLEEP_SECONDS = 8.5

TYPE_PRIORITY = [
    "occupational_health","urgent_care","family_practice","concierge_medicine",
    "hospital","cardiology","pulmonology","ent","psychiatry","sports_medicine",
    "dentist","lab","imaging","audiology","hearing_aid","public_health"
]


def q(s):
    return s.replace("'", "''")


def taxonomy_any(*terms):
    parts=[]
    for term in terms:
        t=q(term)
        parts += [
            f"taxonomy.primary='{t}'",
            f"COALESCE(list_contains(taxonomy.hierarchy,'{t}'),false)",
            f"COALESCE(list_contains(taxonomy.alternates,'{t}'),false)",
            f"categories.primary='{t}'",
            f"COALESCE(list_contains(categories.alternate,'{t}'),false)",
        ]
    return "("+" OR ".join(parts)+")"


def blob_any(*terms):
    parts=[]
    for term in terms:
        t=q(term.lower())
        parts += [
            f"LOWER(CAST(taxonomy AS VARCHAR)) LIKE '%{t}%'",
            f"LOWER(CAST(categories AS VARCHAR)) LIKE '%{t}%'",
        ]
    return "("+" OR ".join(parts)+")"


def name_any(*terms):
    return "("+" OR ".join([f"LOWER(COALESCE(names.primary,'')) LIKE '%{q(t.lower())}%'" for t in terms])+")"


CONDITIONS = {
    "urgent_care": f"({taxonomy_any('urgent_care_clinic')} OR {name_any('urgent care')})",
    "dentist": f"({taxonomy_any('dentist','dental_clinic')} OR {blob_any('dentist','dental_clinic')})",
    "occupational_health": f"({taxonomy_any('occupational_health','occupational_medicine')} OR {blob_any('occupational_health','occupational medicine')} OR {name_any('occupational health','occupational medicine','employee health')})",
    "cardiology": f"({taxonomy_any('cardiologist','cardiology')} OR {blob_any('cardiolog','cardiovascular')} OR {name_any('cardiology','cardiologist','cardiovascular','heart center','heart centre','heart institute','heart clinic')})",
    "public_health": f"({taxonomy_any('public_health','public_health_clinic')} OR {blob_any('public_health')} OR {name_any('public health','health department','department of health','county health','health district','health unit')})",
    "hospital": taxonomy_any('hospital'),
    "hearing_aid": f"({taxonomy_any('hearing_aid_provider','hearing_aid_store')} OR {blob_any('hearing_aid')} OR {name_any('hearing aid','hearing center','hearing centre')})",
    "imaging": f"({taxonomy_any('diagnostic_imaging','medical_imaging')} OR {blob_any('diagnostic_imaging','medical_imaging','radiolog')} OR {name_any('diagnostic imaging','medical imaging','imaging center','imaging centre','radiology','mri','ct scan','ultrasound','mammography','x-ray','xray')})",
    "concierge_medicine": f"({blob_any('concierge','direct_primary_care')} OR {name_any('concierge medicine','concierge medical','concierge physician','concierge doctor','direct primary care','membership medicine','executive medicine','executive health')})",
    "lab": f"(({taxonomy_any('laboratory_testing','medical_laboratory','clinical_laboratory')} OR {blob_any('laboratory_testing','medical_laboratory','clinical_laboratory','diagnostic_laboratory')} OR {name_any('clinical laboratory','clinical laboratories','medical laboratory','medical laboratories','diagnostic laboratory','diagnostic laboratories','laboratory testing','lab testing','blood testing','blood draw','specimen collection','patient service center','patient service centre','labcorp','quest diagnostics')}) AND LOWER(COALESCE(names.primary,'')) NOT LIKE '%dental laboratory%' AND LOWER(COALESCE(names.primary,'')) NOT LIKE '%dental lab%' AND LOWER(COALESCE(names.primary,'')) NOT LIKE '%environmental laboratory%' AND LOWER(COALESCE(names.primary,'')) NOT LIKE '%environmental lab%' AND LOWER(COALESCE(names.primary,'')) NOT LIKE '%research laboratory%' AND LOWER(COALESCE(names.primary,'')) NOT LIKE '%research lab%' AND LOWER(COALESCE(names.primary,'')) NOT LIKE '%veterinary%')",
    "audiology": f"({taxonomy_any('audiologist','audiology')} OR {blob_any('audiolog')} OR {name_any('audiology','audiologist','hearing and balance','hearing & balance')})",
    "ent": f"({taxonomy_any('otolaryngologist','otolaryngology')} OR {blob_any('otolaryng','ear_nose_throat')} OR {name_any('ear nose and throat','ear nose & throat','ear, nose and throat','otolaryngology','otolaryngologist','head and neck surgery','head & neck surgery')})",
    "family_practice": f"(({taxonomy_any('family_practice','family_medicine')} OR {blob_any('family_practice','family_medicine')} OR {name_any('family practice','family medicine','family medical')}) AND LOWER(COALESCE(names.primary,'')) NOT LIKE '%family planning%')",
    "psychiatry": f"({taxonomy_any('psychiatrist','psychiatry')} OR {blob_any('psychiatr')} OR {name_any('psychiatry','psychiatrist','psychiatric clinic','psychiatric center','psychiatric centre')})",
    "pulmonology": f"(({taxonomy_any('pulmonologist','pulmonology')} OR {blob_any('pulmonolog','pulmonary_medicine','pulmonary_disease')} OR {name_any('pulmonology','pulmonologist','pulmonary medicine','pulmonary clinic','pulmonary associates','pulmonary specialists','lung clinic','lung center','lung centre')}) AND LOWER(COALESCE(names.primary,'')) NOT LIKE '%medical equipment%' AND LOWER(COALESCE(names.primary,'')) NOT LIKE '%oxygen supply%')",
    "sports_medicine": f"(({taxonomy_any('sports_medicine')} OR {blob_any('sports_medicine')} OR {name_any('sports medicine','sport medicine','sports medical','sports health','athletic medicine')}) AND LOWER(COALESCE(names.primary,'')) NOT LIKE '%gym%' AND LOWER(COALESCE(names.primary,'')) NOT LIKE '%fitness center%' AND LOWER(COALESCE(names.primary,'')) NOT LIKE '%fitness centre%')",
}

PAT = {
    "urgent_care": re.compile(r"\b(urgent\s+care|immediate\s+care|walk[\s-]?in\s+(clinic|care)|after[\s-]?hours\s+clinic)\b", re.I),
    "sports_medicine": re.compile(r"\b(sports?\s+medicine|sports?\s+medical|sports?\s+health|athletic\s+medicine)\b", re.I),
    "pulmonology": re.compile(r"\b(pulmonolog|pulmonary|lung\s+(clinic|center|centre|institute|specialist)|sleep\s+(medicine|disorder|center|centre|clinic))", re.I),
    "public_health": re.compile(r"\b(public\s+health|health\s+department|department\s+of\s+health|health\s+district|county\s+health|health\s+unit)\b", re.I),
    "psychiatry": re.compile(r"\b(psychiatr|psychopharmacolog)\b", re.I),
    "occupational_health": re.compile(r"\b(occupational\s+(health|medicine|medical)|employee\s+health|industrial\s+medicine|work\s*med|workcare|workers?[\s-]*comp(?:ensation)?\s+(clinic|medical|health)|fit(?:ness)?[\s-]*for[\s-]*duty)\b", re.I),
    "lab": re.compile(r"\b(labcorp|quest\s+diagnostics|clinical\s+lab|clinical\s+laborator|diagnostic\s+lab|diagnostic\s+laborator|pathology\s+lab|pathology\s+laborator|medical\s+lab|medical\s+laborator|patient\s+service\s+cent(?:er|re)|specimen\s+collection|drug\s+testing|toxicology|blood\s+draw|dna\s+(testing|lab))\b", re.I),
    "hospital": re.compile(r"\b(hospital|medical\s+center|medical\s+centre)\b", re.I),
    "hearing_aid": re.compile(r"\b(hearing\s+aid|hearing\s+instrument|hearing\s+center|hearing\s+centre)\b", re.I),
    "family_practice": re.compile(r"\b(family\s+(practice|medicine|medical|health|physician)|familycare)\b", re.I),
    "ent": re.compile(r"\b(otolaryng|ear[\s,]+nose(?:\s+and|\s*&)?\s+throat|ENT|head\s+(and|&)\s+neck)\b", re.I),
    "imaging": re.compile(r"\b(diagnostic\s+imaging|medical\s+imaging|radiolog|imaging\s+cent(?:er|re)|MRI|CT\s*(scan|imaging)?|ultrasound|mammograph|x[\s-]?ray)\b", re.I),
    "dentist": re.compile(r"\b(dentist|dental|orthodont|endodont|periodont|prosthodont|oral\s+(and|&)\s+maxillofacial)\b", re.I),
    "concierge_medicine": re.compile(r"\b(concierge\s+(medicine|medical|doctor|physician|care)|direct\s+primary\s+care|membership\s+medicine|executive\s+(health|medicine))\b", re.I),
    "cardiology": re.compile(r"\b(cardiolog|cardiovascular|heart\s+(center|centre|clinic|institute)|vascular\s+medicine)\b", re.I),
    "audiology": re.compile(r"\b(audiolog|hearing\s+and\s+balance|hearing\s*&\s*balance)\b", re.I),
}

ACCEPT = {
    "urgent_care": {"urgent_care_clinic","walk_in_clinic"},
    "sports_medicine": {"sports_medicine"},
    "pulmonology": {"pulmonology","pediatric_pulmonology","sleep_medicine","pulmonologist","sleep_specialist"},
    "public_health": {"public_health_clinic","health_department"},
    "psychiatry": {"psychiatry","child_psychiatry","psychiatrist","child_psychiatrist"},
    "occupational_health": {"occupational_medicine"},
    "lab": {"laboratory_testing","b2b_clinical_lab","clinical_laboratories"},
    "hospital": {"hospital","childrens_hospital","specialty_hospital"},
    "hearing_aid": {"hearing_aid_provider","hearing_aid_store"},
    "family_practice": {"family_practice"},
    "ent": {"ear_nose_and_throat","otology","neurotology","otologist","neurotologist"},
    "imaging": {"diagnostic_imaging","radiology","radiologist","ultrasound_imaging","ultrasound_imaging_center","mammography","mri","computed_tomography"},
    "dentist": {"dentist","dental_clinic","general_dentistry","orthodontist","orthodontics","pediatric_dentist","pediatric_dentistry","cosmetic_dentist","cosmetic_dentistry","oral_surgeon","oral_and_maxillofacial_surgery","endodontist","endodontics","periodontist","periodontics","prosthodontist","prosthodontics"},
    "concierge_medicine": {"concierge_medicine"},
    "cardiology": {"cardiology","cardiologist","pediatric_cardiology","cardiothoracic_surgery","cardiovascular_and_thoracic_surgeon","vascular_medicine","cardiovascular_and_vascular_medicine"},
    "audiology": {"audiology","audiologist"},
}


def clean(v):
    return "" if v is None else re.sub(r"\s+", " ", str(v)).strip()


def norm(v):
    return re.sub(r"[\s-]+", "_", clean(v).lower())


def parse_tokens(v):
    s=clean(v).lower().strip("[]")
    if not s: return set()
    return {norm(p.strip(" '\\"")) for p in re.split(r"[,|;]+", s) if p.strip(" '\\"")}


def tokens(row):
    out=set()
    for k in ("category","taxonomy_primary","basic_category"):
        x=norm(row.get(k,""))
        if x: out.add(x)
    out |= parse_tokens(row.get("alternate_categories",""))
    out |= parse_tokens(row.get("taxonomy_hierarchy",""))
    out |= parse_tokens(row.get("taxonomy_alternates",""))
    return out


def classify(row,target):
    toks=tokens(row); nm=clean(row.get("name","")); cat=norm(row.get("category","")); tax=norm(row.get("taxonomy_primary","")); basic=norm(row.get("basic_category",""))
    if target=="hospital":
        if toks & {"veterinarian","animal_hospital","emergency_pet_hospital","animal_or_pet_service"} or re.search(r"\b(vet|veterinary|animal|pet)\b",nm,re.I): return "REJECT"
        if toks & {"b2b_hospital_equipment_and_supplies","hospital_equipment_and_supplies"} or re.search(r"\b(hospital\s+(equipment|supplies)|medical\s+equipment)\b",nm,re.I): return "REJECT"
        if cat in ACCEPT[target] or tax in ACCEPT[target] or basic in ACCEPT[target] or re.search(r"\bhospital\b",nm,re.I): return "KEEP"
        return "REVIEW" if PAT[target].search(nm) else "REJECT"
    if target=="psychiatry":
        if cat in ACCEPT[target] or tax in ACCEPT[target] or PAT[target].search(nm): return "KEEP"
        if toks & {"psychology","psychologist","psychotherapy","psychotherapist","hypnotherapy","hypnosis_hypnotherapy","counseling_and_mental_health","psychoanalysis","psychoanalyst","sports_psychology","sports_psychologist"}: return "REJECT"
        return "REVIEW" if "behavioral_or_mental_health_clinic" in toks else "REJECT"
    if target=="occupational_health":
        if cat=="occupational_medicine" or tax=="occupational_medicine" or "occupational_medicine" in toks or PAT[target].search(nm): return "KEEP"
        if "occupational_therapy" in toks: return "REJECT"
        return "REVIEW" if "occupational_safety" in toks else "REJECT"
    if target=="lab":
        if re.search(r"\bdental\s+lab(orator(y|ies))?\b",nm,re.I): return "REJECT"
        if re.search(r"\b(environmental|water|soil|food|materials?|calibration|electrical|engineering|geotechnical|construction|petroleum|oil|research)\b",nm,re.I) and cat not in {"laboratory_testing","clinical_laboratories"} and tax not in {"laboratory_testing","b2b_clinical_lab"}: return "REJECT"
        if cat in {"laboratory_testing","clinical_laboratories"} or tax in {"laboratory_testing","b2b_clinical_lab"} or "clinical_laboratories" in toks or PAT[target].search(nm): return "KEEP"
        return "REVIEW" if cat=="laboratory" or tax=="laboratory" or "laboratory_testing" in toks else "REJECT"
    if target=="public_health":
        return "KEEP" if cat in ACCEPT[target] or tax in ACCEPT[target] or PAT[target].search(nm) else "REJECT"
    if target=="concierge_medicine":
        return "KEEP" if cat=="concierge_medicine" or tax=="concierge_medicine" or PAT[target].search(nm) else "REJECT"
    if target=="urgent_care":
        if toks & ACCEPT[target] or PAT[target].search(nm): return "KEEP"
        return "REVIEW" if cat=="emergency_room" or tax=="emergency_department" else "REJECT"
    if target=="dentist":
        if toks & ACCEPT[target]:
            if re.search(r"\bdental\s+lab",nm,re.I) and (cat in {"laboratory_testing","laboratory"} or tax in {"laboratory_testing","laboratory"}): return "REJECT"
            return "KEEP"
        return "REVIEW" if PAT[target].search(nm) else "REJECT"
    if target in {"sports_medicine","pulmonology","hearing_aid","family_practice","ent","imaging","cardiology","audiology"}:
        return "KEEP" if toks & ACCEPT[target] or PAT[target].search(nm) else "REJECT"
    return "REJECT"


def primary_type(types):
    for t in TYPE_PRIORITY:
        if t in types: return t
    return sorted(types)[0]


def post_chunk(rows, chunk_index, total_chunks):
    body = json.dumps({
        "rows": rows,
        "sourceLabel": "Overture Maps",
        "datasetLabel": "Overture Maps",
        "uploadLabel": "Overture USA cleaned 2026-08-19.0",
        "filename": "USA_Overture_NEON_READY_Cleaned.csv",
        "mirrorLegacy": False,
        "dryRun": False,
        "uploadedBy": "chatgpt-overture-import"
    }, separators=(",",":"), ensure_ascii=False).encode("utf-8")
    key=f"overture-usa-20260819-{chunk_index:04d}"
    headers={"Content-Type":"application/json","Idempotency-Key":key,"X-Actor-ID":"chatgpt-overture-import"}
    for attempt in range(1,7):
        try:
            req=urllib.request.Request(API_URL,data=body,headers=headers,method="POST")
            with urllib.request.urlopen(req,timeout=300) as resp:
                payload=json.loads(resp.read().decode("utf-8"))
                print(f"UPLOAD {chunk_index+1}/{total_chunks}: HTTP {resp.status} mastered={payload.get('masteredRows')} errors={payload.get('errorRows')} duplicates={payload.get('duplicateMasterRows')}", flush=True)
                return payload
        except urllib.error.HTTPError as e:
            msg=e.read().decode("utf-8",errors="replace")
            if e.code==429 or e.code>=500:
                delay=max(15,int(e.headers.get("Retry-After","15") or 15))*attempt
                print(f"retryable HTTP {e.code} chunk {chunk_index}: {msg[:300]} ; sleeping {delay}s", flush=True)
                time.sleep(delay); continue
            raise RuntimeError(f"HTTP {e.code} chunk {chunk_index}: {msg[:2000]}")
        except Exception as e:
            if attempt==6: raise
            delay=15*attempt
            print(f"retryable error chunk {chunk_index}: {e}; sleeping {delay}s", flush=True)
            time.sleep(delay)
    raise RuntimeError(f"failed chunk {chunk_index}")


def main():
    con=duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; INSTALL aws; LOAD aws;")
    con.execute("""CREATE OR REPLACE SECRET overture_public (TYPE S3, PROVIDER config, REGION 'us-west-2', KEY_ID '', SECRET '');""")
    path=f"s3://overturemaps-us-west-2/release/{RELEASE}/theme=places/type=place/*.parquet"
    flags=",\n".join([f"({cond}) AS flag_{t}" for t,cond in CONDITIONS.items()])
    any_cond=" OR ".join([f"({cond})" for cond in CONDITIONS.values()])
    sql=f"""
    SELECT id,names.primary AS name,categories.primary AS category,
           CAST(categories.alternate AS VARCHAR) AS alternate_categories,
           basic_category,taxonomy.primary AS taxonomy_primary,
           CAST(taxonomy.hierarchy AS VARCHAR) AS taxonomy_hierarchy,
           CAST(taxonomy.alternates AS VARCHAR) AS taxonomy_alternates,
           addresses[1].freeform AS address,addresses[1].locality AS city,
           addresses[1].region AS state,addresses[1].postcode AS postal_code,
           addresses[1].country AS country_code,phones[1] AS phone,websites[1] AS website,
           emails[1] AS email,confidence,operating_status,
           ST_Y(geometry) AS latitude,ST_X(geometry) AS longitude,
           {flags}
    FROM read_parquet('{path}', filename=true, hive_partitioning=1)
    WHERE addresses[1].country='US'
      AND COALESCE(operating_status,'open') <> 'permanently_closed'
      AND ({any_cond})
    """
    print("Scanning Overture once for all 16 cleaned U.S. categories...", flush=True)
    cur=con.execute(sql)
    cols=[d[0] for d in cur.description]

    if os.path.exists(DB_PATH): os.remove(DB_PATH)
    db=sqlite3.connect(DB_PATH)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("""CREATE TABLE accepted(
      overture_id TEXT PRIMARY KEY,name TEXT,address TEXT,city TEXT,state TEXT,postal_code TEXT,country_code TEXT,
      phone TEXT,website TEXT,email TEXT,latitude REAL,longitude REAL,confidence REAL,operating_status TEXT,
      primary_provider_type TEXT,provider_types TEXT,taxonomy TEXT
    )""")
    stats={t:Counter() for t in CONDITIONS}
    accepted=0
    while True:
        batch=cur.fetchmany(5000)
        if not batch: break
        ins=[]
        for tup in batch:
            row=dict(zip(cols,tup))
            keep=[]
            for target in CONDITIONS:
                if bool(row.get(f"flag_{target}")):
                    stats[target]["original"]+=1
                    st=classify(row,target)
                    stats[target][st]+=1
                    if st=="KEEP": keep.append(target)
            if not keep: continue
            keep=sorted(set(keep),key=lambda t: TYPE_PRIORITY.index(t) if t in TYPE_PRIORITY else 999)
            tax=" | ".join([clean(row.get("taxonomy_primary")),clean(row.get("taxonomy_hierarchy")),clean(row.get("taxonomy_alternates"))]).strip(" |")
            ins.append((clean(row["id"]),clean(row["name"]),clean(row["address"]),clean(row["city"]),clean(row["state"]).upper(),clean(row["postal_code"]),"US",clean(row["phone"]),clean(row["website"]),clean(row["email"]).lower(),row["latitude"],row["longitude"],row["confidence"],clean(row["operating_status"]),primary_type(keep),"|".join(keep),tax))
        if ins:
            db.executemany("INSERT OR REPLACE INTO accepted VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",ins)
            db.commit(); accepted+=len(ins)
            if accepted % 50000 < len(ins): print(f"accepted so far: {accepted:,}", flush=True)

    total=db.execute("SELECT count(*) FROM accepted").fetchone()[0]
    print(f"CLEANED ACCEPTED OVERTURE IDS: {total:,}", flush=True)
    for t in CONDITIONS:
        s=stats[t]
        print(f"{t}: original={s['original']:,} keep={s['KEEP']:,} review={s['REVIEW']:,} reject={s['REJECT']:,}", flush=True)

    total_chunks=(total+CHUNK_SIZE-1)//CHUNK_SIZE
    offset=0; chunk=0; mastered_total=errors_total=0
    while offset<total:
        rows=[]
        for r in db.execute("SELECT * FROM accepted ORDER BY overture_id LIMIT ? OFFSET ?",(CHUNK_SIZE,offset)).fetchall():
            (oid,name,address,city,state,postal,country,phone,website,email,lat,lng,confidence,status,primary,types,tax)=r
            rows.append({
                "source":"Overture Maps","source_key":"overture","source_record_id":oid,"overture_id":oid,
                "name":name,"address":address,"city":city,"state":state,"postal_code":postal,"country_code":country,
                "phone":phone,"website":website,"email":email,"latitude":lat,"longitude":lng,"confidence":confidence,
                "operating_status":status,"primary_provider_type":primary,"provider_types":types,
                "normalized_provider_types":types,"capability_tags":types,"taxonomy":tax
            })
        payload=post_chunk(rows,chunk,total_chunks)
        mastered_total += int(payload.get("masteredRows") or 0)
        errors_total += int(payload.get("errorRows") or 0)
        offset += len(rows); chunk += 1
        if offset<total: time.sleep(SLEEP_SECONDS)
    print(f"IMPORT COMPLETE rows_sent={total:,} mastered_sum={mastered_total:,} error_sum={errors_total:,}", flush=True)

if __name__ == "__main__":
    main()

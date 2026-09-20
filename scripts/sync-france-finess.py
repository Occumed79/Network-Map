#!/usr/bin/env python3
import argparse, csv, gzip, hashlib, json, re, tempfile, unicodedata
from pathlib import Path
from datetime import datetime, timezone
import requests, ijson

DATASET_API = "https://www.data.gouv.fr/api/1/datasets/finess-structures-1/"
DATASET_URL = "https://www.data.gouv.fr/datasets/finess-structures-1"
UA = "Occu-Med-Network-Map/1.0"
COLUMNS = [
    "source_record_id","source_url","name","normalized_name","address_line1",
    "formatted_address","city","state_region","postal_code","country_code",
    "lat","lng","phone","website","email","primary_provider_type",
    "capability_tags","quality_score","master_key",
]

def text(v):
    return "" if v is None else str(v).strip()

def norm(v):
    s=unicodedata.normalize("NFKD", text(v)).encode("ascii","ignore").decode().lower()
    return re.sub(r"\s+"," ",re.sub(r"[^a-z0-9]+"," ",s)).strip()

def num(v):
    try: return float(text(v).replace(",","."))
    except: return None

def active_through(v):
    s=text(v)
    if not s: return True
    try:
        dt=datetime.fromisoformat(s.replace("Z","+00:00"))
        if dt.tzinfo is None: dt=dt.replace(tzinfo=timezone.utc)
        return dt > datetime.now(timezone.utc)
    except: return True

def latest_daily():
    r=requests.get(DATASET_API,headers={"accept":"application/json","user-agent":UA},timeout=60)
    r.raise_for_status()
    resources=r.json().get("resources") or []
    def label(x): return " ".join(text(x.get(k)) for k in ("title","name","description","url","format")).lower()
    candidates=[x for x in resources if "json" in label(x) and (".gz" in label(x) or "json.gz" in text(x.get("format")).lower())]
    daily=[x for x in candidates if "journalier" in label(x)]
    candidates=daily or candidates
    if not candidates: raise RuntimeError("FINESS Structures metadata exposed no JSON.GZ resource")
    candidates.sort(key=lambda x:text(x.get("last_modified") or x.get("modified") or x.get("created_at")),reverse=True)
    x=candidates[0]
    return {"url":text(x.get("url")),"title":text(x.get("title") or x.get("name")),"modified":text(x.get("last_modified") or x.get("modified"))}

def coord_address(addresses):
    for a in addresses or []:
        g=a.get("coordonneesGeographique") or {}
        lat=num(g.get("directionLatitude") if g.get("directionLatitude") is not None else g.get("latitude") if g.get("latitude") is not None else g.get("coordonneeY"))
        lng=num(g.get("directionLongitude") if g.get("directionLongitude") is not None else g.get("longitude") if g.get("longitude") is not None else g.get("coordonneeX"))
        if lat is None or lng is None or not(-90<=lat<=90 and -180<=lng<=180) or (lat==0 and lng==0): continue
        postal=text(a.get("codePostal"))
        route=" ".join(x for x in [text(a.get("numeroVoie")),text(a.get("typeVoie")),text(a.get("libelleVoie"))] if x)
        line=text(a.get("ligneQuatre")) or route or text(a.get("ligneTrois")) or text(a.get("ligneDeux")) or text(a.get("ligneUne"))
        shipment=text(a.get("ligneAcheminement")) or text(a.get("ligneSix"))
        city=re.sub(r"^"+re.escape(postal)+r"\s*","",shipment,flags=re.I).strip() if shipment else ""
        formatted=", ".join(x for x in [line,shipment or " ".join(x for x in [postal,city] if x),"France"] if x)
        return line,city,postal,formatted,lat,lng
    return None

def contact_for(contacts):
    phone=email=""
    for c in contacts or []:
        t=c.get("telecom") or {}
        phone=phone or text(t.get("telephone"))
        email=email or text(t.get("courriel"))
        if phone and email: break
    return phone,email

def classify(name):
    v=norm(name)
    primary="healthcare_facility"
    if re.search(r"sante au travail|medecine du travail|service prevention.*sante.*travail|\bspsti\b",v): primary="occupational_health_clinic"
    elif re.search(r"dentaire|odont|chirurgien dent",v): primary="dental"
    elif re.search(r"laboratoire|biologie medicale|anatomo patholog",v): primary="lab"
    elif re.search(r"radiolog|imagerie|scanner|\birm\b|echograph",v): primary="imaging"
    elif re.search(r"centre hospitalier|hopital|\bchu\b|\bchru\b|polyclinique|clinique chirurgical",v): primary="hospital"
    elif re.search(r"pharmacie|vaccin|centre de vaccination",v): primary="pharmacy_vaccination"
    elif re.search(r"maison de sante|centre de sante|cabinet medical|medecine generale",v): primary="general_practitioner"
    elif re.search(r"cardiolog|pneumolog|psychiatr|orthoped|gastro enter|neurolog|specialis",v): primary="specialist"
    tags=["healthcare_facility"] if primary=="healthcare_facility" else [primary,"healthcare_facility"]
    return primary,tags

def pg_array(values):
    return "{"+",".join('"'+str(v).replace("\\","\\\\").replace('"','\\\"')+'"' for v in values)+"}"

def master_key(name,address,lat,lng):
    payload=json.dumps({"name":norm(name),"address":address.lower(),"country":"FR","lat":round(lat,6),"lng":round(lng,6)},sort_keys=True,ensure_ascii=False)
    return "loc:"+hashlib.sha256(payload.encode()).hexdigest()

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--output",required=True); args=ap.parse_args()
    resource=latest_daily()
    with tempfile.NamedTemporaryFile(suffix=".json.gz",delete=False) as tmp:
        with requests.get(resource["url"],headers={"accept":"application/gzip, application/octet-stream","user-agent":UA},stream=True,timeout=180) as r:
            r.raise_for_status()
            for chunk in r.iter_content(1024*1024):
                if chunk: tmp.write(chunk)
        tmp_path=tmp.name

    out=Path(args.output); out.parent.mkdir(parents=True,exist_ok=True)
    seen=set(); scanned=written=0
    with gzip.open(tmp_path,"rb") as src, out.open("w",encoding="utf-8",newline="") as fh:
        w=csv.writer(fh,delimiter="\t",quoting=csv.QUOTE_ALL,lineterminator="\n")
        w.writerow(COLUMNS)
        for ege in ijson.items(src,"pmej.item.ege.item"):
            scanned+=1
            info=ege.get("informationsGeneralesEGE") or {}
            fid=text(info.get("numFinessEge"))
            if not fid or fid in seen or not active_through(info.get("dateFermeture")): continue
            address=coord_address(ege.get("adresse"))
            if not address: continue
            line,city,postal,formatted,lat,lng=address
            name=text(info.get("nomEgeLong")) or text(info.get("nomEgeCourt")) or f"FINESS {fid}"
            phone,email=contact_for(ege.get("contact"))
            primary,tags=classify(name)
            w.writerow([
                f"finess:{fid}",DATASET_URL,name,norm(name),line,formatted,city,"",postal,"FR",
                lat,lng,phone,"",email,primary,pg_array(tags),0.99,master_key(name,formatted,lat,lng)
            ])
            seen.add(fid); written+=1
    if written < 10000: raise SystemExit(f"Only {written} geocoded FINESS facilities; refusing output")
    print(json.dumps({"source":"fr_finess","resource":resource,"scannedEge":scanned,"geocodedFacilities":written,"outputPath":str(out)},ensure_ascii=False))

if __name__=="__main__":
    main()

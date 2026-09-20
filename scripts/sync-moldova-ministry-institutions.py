#!/usr/bin/env python3
import argparse,csv,hashlib,json,re,time,unicodedata,requests
from bs4 import BeautifulSoup
from pathlib import Path

SOURCE_PAGE="https://ms.gov.md/minister/organizare/institutiile-subordonate/"
NOMINATIM="https://nominatim.openstreetmap.org/search"
UA="Occu-Med-Network-Map/1.0 (+https://github.com/Occumed79/Network-Map)"
COLS=["source_record_id","source_url","name","normalized_name","address_line1","formatted_address","city","state_region","postal_code","country_code","lat","lng","phone","website","email","primary_provider_type","capability_tags","quality_score","master_key"]
CENTROIDS={
"chisinau":(47.0105,28.8638),"balti":(47.7617,27.9289),"orhei":(47.3849,28.8245),
"briceni":(48.3563,26.8129),"ocnita":(48.3827,27.4381),"donduseni":(48.2427,27.6101),
"edinet":(48.1684,27.3050),"riscani":(47.9572,27.5530),"drochia":(48.0356,27.8129),
"soroca":(48.1566,28.2849),"glodeni":(47.7708,27.5144),"floresti":(47.8914,28.3019),
"falesti":(47.5736,27.7061),"singerei":(47.6363,28.1431),"soldanesti":(47.8161,28.7972),
"ungheni":(47.2042,27.7958),"telenesti":(47.5011,28.3654),"rezina":(47.7493,28.9658),
"calarasi":(47.2556,28.3099),"nisporeni":(47.0814,28.1786),"straseni":(47.1422,28.6077),
"criuleni":(47.2131,29.1593),"hincesti":(46.8305,28.5906),"ialoveni":(46.9435,28.7823),
"anenii noi":(46.8784,29.2247),"causeni":(46.6442,29.4136),"cimislia":(46.5268,28.7644),
"leova":(46.4822,28.2530),"stefan voda":(46.5153,29.6619),"cantemir":(46.2774,28.2027),
"basarabeasca":(46.3311,28.9720),"taraclia":(45.9027,28.6682),"cahul":(45.9042,28.1993),
"ceadir lunga":(46.0617,28.8308),"comrat":(46.2946,28.6565),"vulcanesti":(45.6849,28.4028),
}
def t(v): return "" if v is None else re.sub(r"\s+"," ",str(v)).strip()
def norm(v):
    s=unicodedata.normalize("NFKD",t(v)).encode("ascii","ignore").decode().lower()
    return re.sub(r"\s+"," ",re.sub(r"[^a-z0-9]+"," ",s)).strip()
def pg(vals): return "{"+",".join('"'+x.replace('\\','\\\\').replace('"','\\\"')+'"' for x in vals)+"}"
def sha(v): return hashlib.sha256(v.encode()).hexdigest()
def provider_name(value):
    v=t(value)
    v=re.sub(r"^\s*\d+\.?\s*","",v)
    return v.strip(" –-")
def relevant(v):
    s=norm(v)
    keys=["institutia medico sanitara publica","spital","institutul de cardiologie","institutul mamei","institutul oncologic","policlinica","diagnosticare medicala","transfuzie","medicina sportiva","medicina legala","reabilitare pentru copii","ftiziopneumologic"]
    return any(k in s for k in keys)
def locality(name):
    s=norm(name)
    for city in sorted(CENTROIDS,key=len,reverse=True):
        if city in s: return city
    return "chisinau"
def geocode(name,city):
    q=f"{name}, {city}, Moldova"
    try:
        r=requests.get(NOMINATIM,params={"format":"jsonv2","limit":1,"countrycodes":"md","q":q},headers={"User-Agent":UA,"Accept-Language":"ro,en"},timeout=30)
        r.raise_for_status(); data=r.json()
        if data:
            lat=float(data[0]["lat"]); lng=float(data[0]["lon"])
            if 45.3<=lat<=48.6 and 26.5<=lng<=30.6:
                return lat,lng,"geocoded_name"
    except Exception: pass
    lat,lng=CENTROIDS[city]
    return lat,lng,"locality_centroid"
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--output",required=True); a=ap.parse_args()
    r=requests.get(SOURCE_PAGE,headers={"User-Agent":UA,"Accept-Language":"ro,en"},timeout=60); r.raise_for_status()
    soup=BeautifulSoup(r.text,"html.parser")
    names=[]; seen=set()
    for node in soup.find_all(["li","p","a","td"]):
        name=provider_name(node.get_text(" ",strip=True))
        if not relevant(name): continue
        k=norm(name)
        if len(k)<8 or k in seen: continue
        seen.add(k); names.append(name)
    if len(names)<35:
        raise SystemExit(f"Only {len(names)} current Ministry subordinate healthcare institutions parsed")
    rows=[]
    for index,name in enumerate(names):
        city=locality(name)
        if index: time.sleep(1.05)
        lat,lng,source=geocode(name,city)
        sid="md-moh:"+sha(norm(name))[:24]
        formatted=f"{name}, {city.title()}, Moldova"
        primary="hospital" if "spital" in norm(name) or "institut" in norm(name) else ("dental" if "stomat" in norm(name) else "healthcare_facility")
        tags=[primary,"healthcare_facility","moldova_ministry_subordinate",f"coordinate_source:{source}"]
        mk="loc:"+sha(json.dumps({"name":norm(name),"address":formatted.lower(),"country":"MD","lat":round(lat,6),"lng":round(lng,6)},sort_keys=True,ensure_ascii=False))
        rows.append([sid,SOURCE_PAGE,name,norm(name),"",formatted,city.title(),"","","MD",lat,lng,"","","",primary,pg(tags),0.92 if source=="geocoded_name" else 0.78,mk])
    Path(a.output).parent.mkdir(parents=True,exist_ok=True)
    with open(a.output,"w",encoding="utf-8",newline="") as fh:
        w=csv.writer(fh,delimiter="\t",quoting=csv.QUOTE_ALL,lineterminator="\n"); w.writerow(COLS); w.writerows(rows)
    print(len(rows))
if __name__=="__main__": main()

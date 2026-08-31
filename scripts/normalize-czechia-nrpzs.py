#!/usr/bin/env python3
import argparse, csv, hashlib, json, re, unicodedata

COLUMNS = ["source_record_id","source_url","name","normalized_name","address_line1","formatted_address","city","state_region","postal_code","country_code","lat","lng","phone","website","email","primary_provider_type","capability_tags","quality_score","master_key"]
SOURCE_URL = "https://datanzis.uzis.gov.cz/data/NR-01-NRPZS/NR-01-06/Otevrena-data-NR-01-06-nrpzs-mista-poskytovani-zdravotnich-sluzeb.csv"

def t(v): return "" if v is None else str(v).strip()
def norm(v):
    s = unicodedata.normalize("NFKD", t(v)); s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", s)).strip()
def arr(values):
    out=[]
    for v in values:
        v=t(v)
        if v and v not in out: out.append(v)
    return "{" + ",".join('"'+v.replace("\\","\\\\").replace('"','\\"')+'"' for v in out) + "}"
def coords(v):
    s=t(v).replace(";",",")
    m=re.search(r"POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)",s,re.I)
    nums=[float(x.replace(",",".")) for x in re.findall(r"-?\d+(?:[\.,]\d+)?",s)]
    pairs=[]
    if m: pairs += [(float(m.group(1)),float(m.group(2))),(float(m.group(2)),float(m.group(1)))]
    if len(nums)>=2: pairs += [(nums[0],nums[1]),(nums[1],nums[0])]
    for a,b in pairs:
        if 48<=a<=52 and 12<=b<=19: return a,b
    return None
def classify(r):
    blob=" ".join(t(r.get(k)) for k in ["ZZ_nazev","ZZ_druh_nazev","ZZ_druh_nazev_sekundarni","ZZ_obor_pece","ZZ_forma_pece","ZZ_druh_pece"]).lower()
    caps=[]
    def add(x):
        if x not in caps: caps.append(x)
    if re.search(r"nemocnic|hospital|l[uů]žkov",blob): add("hospital")
    if re.search(r"zub|dent|stomat",blob): add("dental")
    if re.search(r"laborat|patolog|odb[eě]r",blob): add("lab")
    if re.search(r"radiolog|zobraz|rentgen|magnet|ultrazv|ct\b",blob): add("imaging")
    if re.search(r"pracovn[ií].*l[eé]ka|pracovn[ií].*zdrav|occup",blob): add("occupational_health_clinic")
    if re.search(r"praktick|ordinac|ambulanc|poliklin|zdravotn[ií].*st[rř]edisko",blob): add("general_practitioner")
    if t(r.get("ZZ_obor_pece")): add("specialist")
    if not caps: add("healthcare_facility")
    priority=["occupational_health_clinic","dental","lab","imaging","hospital","general_practitioner","specialist","healthcare_facility"]
    return next((x for x in priority if x in caps),"healthcare_facility"),caps
def key(name,address,lat,lng):
    payload=json.dumps({"name":norm(name),"address":address.lower(),"country":"CZ","lat":round(lat,6),"lng":round(lng,6)},sort_keys=True,ensure_ascii=False,separators=(",",":"))
    return "loc:"+hashlib.sha256(payload.encode()).hexdigest()
def normalize(r):
    c=coords(r.get("ZZ_GPS"))
    if not c: return None
    lat,lng=c; name=t(r.get("ZZ_nazev")) or t(r.get("poskytovatel_nazev"))
    if not name: return None
    rid=t(r.get("ZZ_misto_poskytovani_ID")) or t(r.get("ZZ_ID")) or t(r.get("ZZ_kod")) or hashlib.sha1(f"{name}|{lat:.6f}|{lng:.6f}".encode()).hexdigest()[:20]
    line=" ".join(x for x in [t(r.get("ZZ_ulice")),t(r.get("ZZ_cislo_domovni_orientacni"))] if x)
    city=t(r.get("ZZ_obec")); region=t(r.get("ZZ_kraj_nazev")); postal=t(r.get("ZZ_PSC")); full=", ".join(x for x in [line,postal,city,region,"Czechia"] if x)
    primary,caps=classify(r)
    for k in ["ZZ_obor_pece","ZZ_forma_pece","ZZ_druh_pece","ZZ_rozsah_pece"]:
        v=t(r.get(k))
        if v and v not in caps: caps.append(v)
    return [f"nrpzs:{rid}",SOURCE_URL,name,norm(name),line,full,city,region,postal,"CZ",f"{lat:.8f}",f"{lng:.8f}",t(r.get("poskytovatel_telefon")),t(r.get("poskytovatel_web")),t(r.get("poskytovatel_email")).lower(),primary,arr(caps),"0.99",key(name,full,lat,lng)]
def main():
    p=argparse.ArgumentParser(); p.add_argument("--input",required=True); p.add_argument("--output",required=True); a=p.parse_args()
    with open(a.input,"r",encoding="utf-8-sig",newline="") as f:
        sample=f.read(131072); f.seek(0)
        try: dialect=csv.Sniffer().sniff(sample,delimiters=";,\t|")
        except csv.Error: dialect=csv.excel; dialect.delimiter=";"
        reader=csv.DictReader(f,dialect=dialect)
        with open(a.output,"w",encoding="utf-8",newline="") as out:
            writer=csv.writer(out,delimiter="\t",quoting=csv.QUOTE_ALL,lineterminator="\n"); writer.writerow(COLUMNS)
            seen=set(); n=ok=bad=0
            for r in reader:
                n+=1; row=normalize(r)
                if not row or row[0] in seen: bad+=1; continue
                seen.add(row[0]); writer.writerow(row); ok+=1
    print(json.dumps({"source":"cz_nrpzs","inputRows":n,"outputRows":ok,"rejectedRows":bad}))
if __name__=="__main__": main()

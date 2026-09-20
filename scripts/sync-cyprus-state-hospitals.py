#!/usr/bin/env python3
import argparse,csv,hashlib,json,re,requests
from pathlib import Path
URL="https://data.gov.cy/api/action/datastore/search.json"
RESOURCE_ID="3f22360a-783c-43ed-87fe-0fca2e91661f"
SOURCE_PAGE="https://www.data.gov.cy/node/1639"
COLS=["source_record_id","source_url","name","normalized_name","address_line1","formatted_address","city","state_region","postal_code","country_code","lat","lng","phone","website","email","primary_provider_type","capability_tags","quality_score","master_key"]
def t(v): return "" if v is None else str(v).strip()
def n(v): return re.sub(r"\s+"," ",re.sub(r"[^a-z0-9α-ωάέήίόύώϊϋΐΰ]+"," ",t(v).lower())).strip()
def pg(vals): return "{"+",".join('"'+x.replace('\\','\\\\').replace('"','\\\"')+'"' for x in vals)+"}"
def sha(v): return hashlib.sha256(v.encode()).hexdigest()
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--output",required=True); a=ap.parse_args()
    r=requests.get(URL,params={"resource_id":RESOURCE_ID,"limit":1000},headers={"User-Agent":"Occu-Med-Network-Map/1.0","Accept":"application/json"},timeout=60)
    r.raise_for_status(); payload=r.json()
    records=(payload.get("result") or {}).get("records") or []
    total=int((payload.get("result") or {}).get("total") or 0)
    rows=[]
    for row in records:
        name=t(row.get("hospital") or row.get("Hospital"))
        address=t(row.get("address") or row.get("Address"))
        try:
            lat=float(t(row.get("latitude")).replace(",","."))
            lng=float(t(row.get("longitude")).replace(",","."))
        except ValueError: continue
        if not name or not (34<=lat<=36 and 31<=lng<=35): continue
        entry=t(row.get("entry_id")) or sha(name+"|"+address)[:16]
        sid="cy-moh-hospital:"+entry
        formatted=", ".join(x for x in [address,"Cyprus"] if x)
        mk="loc:"+sha(json.dumps({"name":n(name),"address":formatted.lower(),"country":"CY","lat":round(lat,6),"lng":round(lng,6)},sort_keys=True,ensure_ascii=False))
        rows.append([sid,SOURCE_PAGE,name,n(name),address,formatted,"","","","CY",lat,lng,t(row.get("tel") or row.get("Tel")),t(row.get("info_url") or row.get("Info_URL")),"","hospital",pg(["hospital","state_hospital","cyprus_moh"]),1.0,mk])
    if total and len(rows)!=total:
        raise SystemExit(f"Cyprus DKAN reports {total} hospitals but normalized {len(rows)}")
    if len(rows)<5: raise SystemExit(f"Only {len(rows)} Cyprus state hospitals; refusing output")
    Path(a.output).parent.mkdir(parents=True,exist_ok=True)
    with open(a.output,"w",encoding="utf-8",newline="") as fh:
        w=csv.writer(fh,delimiter="\t",quoting=csv.QUOTE_ALL,lineterminator="\n"); w.writerow(COLS); w.writerows(rows)
    print(len(rows))
if __name__=="__main__": main()

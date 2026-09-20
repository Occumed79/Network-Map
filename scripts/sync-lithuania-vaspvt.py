#!/usr/bin/env python3
import argparse
import csv
import hashlib
import io
import json
import re
import requests
from pathlib import Path

INSTITUTIONS_URL = "https://get.data.gov.lt/datasets/gov/vaspvt/licencijos/Istaiga/:format/csv"
ACTIVITY_ADDRESSES_URL = "https://get.data.gov.lt/datasets/gov/vaspvt/licencijos/IstaigosVeiklosAdresas/:format/csv"
ADDRESS_POINTS_URL = "https://get.data.gov.lt/datasets/gov/rc/ar/adresotaskas/AdresoTaskas/:format/csv"
SOURCE_PAGE = "https://data.gov.lt/datasets/1623/"
UA = "Occu-Med-Network-Map/1.0"
COLUMNS = [
    "source_record_id","source_url","name","normalized_name","address_line1",
    "formatted_address","city","state_region","postal_code","country_code",
    "lat","lng","phone","website","email","primary_provider_type",
    "capability_tags","quality_score","master_key",
]

def text(v):
    return "" if v is None else str(v).strip()

def canonical(v):
    return re.sub(r"[^a-z0-9]+", "", text(v).lower())

def norm(v):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", text(v).lower())).strip()

def pg_array(values):
    return "{" + ",".join('"' + str(v).replace("\\","\\\\").replace('"','\\\"') + '"' for v in values) + "}"

def sha(v):
    return hashlib.sha256(str(v).encode("utf-8")).hexdigest()

def response(url):
    r=requests.get(url,headers={"User-Agent":UA,"Accept":"text/csv,*/*"},stream=True,timeout=240)
    r.raise_for_status()
    return r

def dict_rows(url):
    r=response(url)
    raw=io.TextIOWrapper(r.raw,encoding="utf-8-sig",errors="replace",newline="")
    sample=raw.read(120000)
    try:
        dialect=csv.Sniffer().sniff(sample,delimiters=",;\t|")
        delimiter=dialect.delimiter
    except csv.Error:
        delimiter=","
    # Re-open because streamed TextIO cannot reliably seek.
    r.close()
    r=response(url)
    raw=io.TextIOWrapper(r.raw,encoding="utf-8-sig",errors="replace",newline="")
    return r, csv.DictReader(raw,delimiter=delimiter)

def key_for(fieldnames,*candidates):
    canon={canonical(name):name for name in (fieldnames or [])}
    for candidate in candidates:
        if canonical(candidate) in canon:
            return canon[canonical(candidate)]
    for ck,name in canon.items():
        if any(canonical(candidate) in ck for candidate in candidates):
            return name
    return None

def values_for_identity(row):
    vals=set()
    for key,value in row.items():
        ck=canonical(key)
        if ck in {"id","_id","spiid","istaigaid"} or ck.endswith("spiid"):
            v=text(value)
            if v: vals.add(v)
    return vals

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--output",required=True)
    args=ap.parse_args()

    # 1) Official VASPVT institution master.
    r,reader=dict_rows(INSTITUTIONS_URL)
    institutions={}
    institution_count=0
    inst_headers=reader.fieldnames or []
    name_key=key_for(inst_headers,"ja_pavadinimas","pavadinimas","name")
    spi_key=key_for(inst_headers,"spi_id")
    code_key=key_for(inst_headers,"ja_kodas","kodas")
    license_key=key_for(inst_headers,"licencijos_nr","licencija")
    for row in reader:
        institution_count += 1
        name=text(row.get(name_key)) if name_key else ""
        if not name: continue
        identities=values_for_identity(row)
        if spi_key and text(row.get(spi_key)): identities.add(text(row.get(spi_key)))
        payload={
            "name":name,
            "spi_id":text(row.get(spi_key)) if spi_key else "",
            "code":text(row.get(code_key)) if code_key else "",
            "license":text(row.get(license_key)) if license_key else "",
        }
        for identity in identities:
            institutions[identity]=payload
    r.close()

    # 2) Official VASPVT activity addresses. Collect only address IDs we actually need.
    r,reader=dict_rows(ACTIVITY_ADDRESSES_URL)
    addr_headers=reader.fieldnames or []
    activity_id_key=key_for(addr_headers,"spi_veiklos_adreso_id","veiklos_adreso_id")
    address_id_key=key_for(addr_headers,"adreso_id")
    address_text_key=key_for(addr_headers,"adresas","address")
    inst_ref_key=key_for(addr_headers,"istaiga")
    activity=[]
    needed_address_ids=set()
    for row in reader:
        aid=text(row.get(address_id_key)) if address_id_key else ""
        ref=text(row.get(inst_ref_key)) if inst_ref_key else ""
        inst=institutions.get(ref)
        if not inst:
            # Some exports serialize refs as URI-ish strings ending in the real ID.
            tail=ref.rsplit("/",1)[-1] if ref else ""
            inst=institutions.get(tail)
        if not aid or not inst: continue
        activity.append({
            "activity_id": text(row.get(activity_id_key)) if activity_id_key else "",
            "address_id": aid,
            "address": text(row.get(address_text_key)) if address_text_key else "",
            "institution": inst,
        })
        needed_address_ids.add(aid)
    r.close()

    # 3) Official Register Centre address points; retain only VASPVT address IDs.
    r,reader=dict_rows(ADDRESS_POINTS_URL)
    point_headers=reader.fieldnames or []
    point_id_key=key_for(point_headers,"aob_kodas","adreso_kodas","adreso_id")
    lat_key=key_for(point_headers,"n_koord","latitude","lat")
    lng_key=key_for(point_headers,"e_koord","longitude","lon","lng")
    postal_key=key_for(point_headers,"pasto_koda","pasto_kodas","postal")
    points={}
    scanned_points=0
    for row in reader:
        scanned_points += 1
        pid=text(row.get(point_id_key)) if point_id_key else ""
        if pid not in needed_address_ids: continue
        try:
            lat=float(text(row.get(lat_key)).replace(",", ".")) if lat_key else None
            lng=float(text(row.get(lng_key)).replace(",", ".")) if lng_key else None
        except ValueError:
            continue
        if lat is None or lng is None or not (53.8 <= lat <= 56.5 and 20.5 <= lng <= 27.0):
            continue
        points[pid]={
            "lat":lat,"lng":lng,
            "postal":text(row.get(postal_key)) if postal_key else "",
        }
    r.close()

    rows=[]
    seen=set()
    unresolved=0
    for item in activity:
        point=points.get(item["address_id"])
        if not point:
            unresolved += 1
            continue
        inst=item["institution"]
        name=inst["name"]
        address=item["address"]
        source_suffix=item["activity_id"] or item["address_id"]
        source_id=f"lt-vaspvt:{inst['spi_id'] or inst['code'] or sha(name)[:12]}:{source_suffix}"
        if source_id in seen: continue
        seen.add(source_id)
        formatted=", ".join(x for x in [address, point["postal"], "Lithuania"] if x)
        master="loc:"+sha(json.dumps({
            "name":norm(name),"address":formatted.lower(),"country":"LT",
            "lat":round(point["lat"],6),"lng":round(point["lng"],6),
        },sort_keys=True,ensure_ascii=False))
        rows.append([
            source_id,SOURCE_PAGE,name,norm(name),address,formatted,"","",
            point["postal"],"LT",point["lat"],point["lng"],"","","",
            "healthcare_facility",pg_array(["healthcare_facility","licensed_healthcare_facility","lithuania_vaspvt"]),
            0.995,master,
        ])

    if len(rows) < 500:
        raise SystemExit(json.dumps({
            "error":"Lithuania VASPVT join produced too few map rows",
            "mapRows":len(rows),"institutionRows":institution_count,
            "institutionIdentities":len(institutions),"activityRows":len(activity),
            "neededAddressIds":len(needed_address_ids),"matchedAddressPoints":len(points),
            "unresolved":unresolved,
            "institutionHeaders":inst_headers,"activityHeaders":addr_headers,"pointHeaders":point_headers,
        },ensure_ascii=False))

    Path(args.output).parent.mkdir(parents=True,exist_ok=True)
    with open(args.output,"w",encoding="utf-8",newline="") as fh:
        w=csv.writer(fh,delimiter="\t",quoting=csv.QUOTE_ALL,lineterminator="\n")
        w.writerow(COLUMNS); w.writerows(rows)

    print(len(rows))

if __name__=="__main__":
    main()

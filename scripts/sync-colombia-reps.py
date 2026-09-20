#!/usr/bin/env python3
import argparse,csv,hashlib,json,re,requests,time
from pathlib import Path
URL="https://sig.sispro.gov.co/arcgis_msp/rest/services/Visor/MPS_Proteccion_Social/FeatureServer/2/query"
SOURCE_PAGE="https://sig.sispro.gov.co/arcgis_msp/rest/services/Visor/MPS_Proteccion_Social/FeatureServer/2"
FIELDS="OBJECTID,CodigoHabilitacion,ClaseDePrestador,NaturalezaJuridica,NivelAtencion,Nombre,CodigoPrestador,NombrePrestador,Direccion,URL,Barrio,Telefono,CentroPoblado,NOM_DPTO,NOM_MPIO,MetodoUbicacion"
COLS=["source_record_id","source_url","name","normalized_name","address_line1","formatted_address","city","state_region","postal_code","country_code","lat","lng","phone","website","email","primary_provider_type","capability_tags","quality_score","master_key"]
def t(v): return "" if v is None else str(v).strip()
def n(v): return re.sub(r"\s+"," ",re.sub(r"[^a-z0-9]+"," ",t(v).lower())).strip()
def pg(vals): return "{"+",".join('"'+x.replace('\\','\\\\').replace('"','\\\"')+'"' for x in vals)+"}"
def h(v): return hashlib.sha256(v.encode()).hexdigest()
def typ(r):
    s=(t(r.get("Nombre"))+" "+t(r.get("NombrePrestador"))).lower()
    if "hospital" in s or "clínica" in s or "clinica" in s: return "hospital"
    if "laborator" in s: return "lab"
    if "radiolog" in s or "diagnost" in s or "imagen" in s: return "imaging"
    if "odont" in s or "dental" in s: return "dental"
    return "general_practitioner" if str(r.get("ClaseDePrestador"))=="2" else "healthcare_facility"
def req(params):
    for i in range(6):
        try:
            r=requests.get(URL,params=params,headers={"User-Agent":"Occu-Med-Network-Map/1.0","Accept":"application/json"},timeout=90)
            r.raise_for_status(); return r.json()
        except Exception:
            if i==5: raise
            time.sleep((i+1)*5)
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--output",required=True); a=ap.parse_args()
    count=req({"where":"IndicadorHabilitacion = 1 AND (MetodoUbicacion <> 4 OR MetodoUbicacion IS NULL)","returnCountOnly":"true","f":"json"}).get("count",0)
    rows=[]; off=0
    while off<count:
        p=req({"where":"IndicadorHabilitacion = 1 AND (MetodoUbicacion <> 4 OR MetodoUbicacion IS NULL)","outFields":FIELDS,"returnGeometry":"true","outSR":"4326","orderByFields":"OBJECTID ASC","resultOffset":off,"resultRecordCount":500,"f":"json"})
        feats=p.get("features") or []
        if not feats: break
        for f in feats:
            r=f.get("attributes") or {}; g=f.get("geometry") or {}
            try: lat=float(g.get("y")); lng=float(g.get("x"))
            except: continue
            if not(-5<=lat<=14 and -82<=lng<=-66): continue
            code=t(r.get("CodigoHabilitacion")) or t(r.get("CodigoPrestador")) or t(r.get("OBJECTID"))
            name=t(r.get("Nombre")) or t(r.get("NombrePrestador"))
            if not code or not name: continue
            city=t(r.get("NOM_MPIO")) or t(r.get("CentroPoblado")); state=t(r.get("NOM_DPTO")); addr=t(r.get("Direccion"))
            formatted=", ".join(x for x in [addr,city,state,"Colombia"] if x)
            pt=typ(r); sid="co-reps:"+code
            mk="loc:"+h(json.dumps({"name":n(name),"address":formatted.lower(),"country":"CO","lat":round(lat,6),"lng":round(lng,6)},sort_keys=True,ensure_ascii=False))
            rows.append([sid,SOURCE_PAGE,name,n(name),addr,formatted,city,state,"","CO",lat,lng,t(r.get("Telefono")),t(r.get("URL")),"",pt,pg([pt,"healthcare_facility","colombia_reps"]),0.99,mk])
        off += len(feats)
    if len(rows)<1000: raise SystemExit(f"Only {len(rows)} Colombia REPS map rows; refusing output")
    Path(a.output).parent.mkdir(parents=True,exist_ok=True)
    with open(a.output,"w",encoding="utf-8",newline="") as fh:
        w=csv.writer(fh,delimiter="\t",quoting=csv.QUOTE_ALL,lineterminator="\n"); w.writerow(COLS); w.writerows(rows)
    print(len(rows))
if __name__=="__main__": main()

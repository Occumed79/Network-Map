#!/usr/bin/env python3

import argparse
import csv
import hashlib
import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from collections import OrderedDict
from pathlib import Path

from bs4 import BeautifulSoup

BASE = "https://www.cass.ad/professionals_salut_centre_convencionats_andorra"
USER_AGENT = "Occu-Med-Network-Map/1.0 (+https://github.com/Occumed79/Network-Map)"
NOMINATIM = "https://nominatim.openstreetmap.org/search"
COLUMNS = [
    "source_record_id", "source_url", "name", "normalized_name", "address_line1",
    "formatted_address", "city", "state_region", "postal_code", "country_code",
    "lat", "lng", "phone", "website", "email", "primary_provider_type",
    "capability_tags", "quality_score", "master_key",
]

PARISHES = {
    "andorra la vella", "escaldes-engordany", "escaldes - engordany", "encamp",
    "canillo", "la massana", "ordino", "sant julia de loria", "sant julià de lòria",
    "arinsal", "pas de la casa", "santa coloma",
}


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def norm(value):
    value = unicodedata.normalize("NFKD", clean(value))
    value = "".join(ch for ch in value if not unicodedata.combining(ch)).lower()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def sha(value):
    return hashlib.sha256(str(value).encode("utf-8")).hexdigest()


def fetch_text(url, timeout=90):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "ca,fr,en"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="replace")


def classify(specialty):
    s = norm(specialty)
    primary = "specialist"
    if any(x in s for x in ["medicina general", "metge general", "generalista", "pediatr"]):
        primary = "general_practitioner"
    elif any(x in s for x in ["dent", "odont", "estomat"]):
        primary = "dental"
    elif any(x in s for x in ["laboratori", "anatomia patolog", "analisi"]):
        primary = "lab"
    elif any(x in s for x in ["radiolog", "diagnostic", "imatge", "ressonancia", "ecograf", "tomograf"]):
        primary = "imaging"
    elif any(x in s for x in ["medicina del treball", "salut laboral", "ocupacional"]):
        primary = "occupational_health_clinic"
    elif any(x in s for x in ["farmac"]):
        primary = "pharmacy"
    elif any(x in s for x in ["hospital", "saas"]):
        primary = "hospital"
    elif any(x in s for x in ["fisioter", "rehabilit", "cardiolog", "pneumolog", "neurolog", "psiquiatr", "traumatolog", "oftalm", "al lerg", "urolog", "ginecolog", "psicolog", "logoped", "infermer", "audioprotes", "ortoped"]):
        primary = "specialist"
    tag = re.sub(r"[^a-z0-9]+", "_", s).strip("_")[:80]
    tags = [primary, "healthcare_provider", "cass_contracted"]
    if tag:
        tags.append(f"specialty:{tag}")
    return primary, tags


def parse_provider_block(block):
    strings = [clean(x) for x in block.stripped_strings if clean(x)]
    if not strings:
        return None
    tel_idx = next((i for i, value in enumerate(strings) if re.match(r"^Tel\s*:", value, re.I)), None)
    if tel_idx is None or tel_idx < 3:
        return None
    before = strings[:tel_idx]
    phone = re.sub(r"\D+", "", strings[tel_idx])
    if len(phone) < 6:
        return None
    # Drupal cards consistently render: name, specialty, address, parish, Tel.
    name = before[0]
    specialty = before[1] if len(before) >= 2 else ""
    parish = before[-1]
    address = " ".join(before[2:-1]) if len(before) >= 4 else ""
    if not name or not specialty or not address:
        return None
    if norm(parish) not in {norm(p) for p in PARISHES} and "andorra" not in norm(parish):
        # Keep legitimate locality values but reject footer/navigation blocks.
        if len(parish) > 40 or any(x in norm(parish) for x in ["contacte", "horari", "llista de professionals"]):
            return None
    if any(x in norm(name) for x in ["llista de professionals", "contacte", "serveis medics", "serveis sanitaris"]):
        return None
    return {
        "name": name,
        "specialty": specialty,
        "address": address,
        "parish": parish,
        "phone": phone,
    }


def scrape_all():
    records = OrderedDict()
    empty_pages = 0
    for page in range(0, 80):
        query = urllib.parse.urlencode({"combine": "", "field_parroquia_target_id": "All", "page": page, "tid": "All"})
        url = f"{BASE}?{query}"
        html = fetch_text(url)
        soup = BeautifulSoup(html, "html.parser")
        page_records = 0
        for block in soup.select(".views-row, article, .view-content > div"):
            record = parse_provider_block(block)
            if not record:
                continue
            key = (norm(record["name"]), norm(record["address"]), record["phone"])
            if key not in records:
                records[key] = record
                page_records += 1
        if page_records == 0:
            empty_pages += 1
        else:
            empty_pages = 0
        if page >= 2 and empty_pages >= 3:
            break
    return list(records.values())


def geocode(query):
    params = urllib.parse.urlencode({
        "format": "jsonv2", "addressdetails": 1, "limit": 1, "countrycodes": "ad", "q": query,
    })
    req = urllib.request.Request(f"{NOMINATIM}?{params}", headers={"User-Agent": USER_AGENT, "Accept-Language": "ca,fr,en"})
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        return None
    if not payload:
        return None
    item = payload[0]
    try:
        lat, lng = float(item["lat"]), float(item["lon"])
    except Exception:
        return None
    if not (42.42 <= lat <= 42.68 and 1.38 <= lng <= 1.82):
        return None
    address = item.get("address") or {}
    return {
        "lat": lat,
        "lng": lng,
        "city": clean(address.get("city") or address.get("town") or address.get("village") or address.get("municipality")),
        "postal": clean(address.get("postcode")),
    }


def pg_array(values):
    items = []
    for value in dict.fromkeys(v for v in values if v):
        items.append('"' + str(value).replace("\\", "\\\\").replace('"', '\\"') + '"')
    return "{" + ",".join(items) + "}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    providers = scrape_all()
    if len(providers) < 150:
        raise SystemExit(f"Only {len(providers)} CASS healthcare providers parsed; refusing output")

    cache = {}
    rows = []
    skipped = 0
    last_request = 0.0
    for provider in providers:
        address_key = norm(provider["address"] + "|" + provider["parish"])
        if address_key not in cache:
            wait = 1.1 - (time.time() - last_request)
            if wait > 0:
                time.sleep(wait)
            cache[address_key] = geocode(f"{provider['address']}, {provider['parish']}, Andorra")
            last_request = time.time()
        geo = cache[address_key]
        if not geo:
            skipped += 1
            continue
        primary, tags = classify(provider["specialty"])
        source_id = "ad-cass:" + sha("|".join([provider["name"], provider["address"], provider["phone"]]))[:24]
        formatted = ", ".join(x for x in [provider["address"], provider["parish"], geo.get("postal"), "Andorra"] if x)
        master_key = "loc:" + sha(json.dumps({
            "name": norm(provider["name"]), "address": norm(formatted), "country": "AD",
            "lat": round(geo["lat"], 6), "lng": round(geo["lng"], 6),
        }, sort_keys=True, ensure_ascii=False))
        rows.append([
            source_id, BASE, provider["name"], norm(provider["name"]), provider["address"], formatted,
            provider["parish"] or geo.get("city"), "", geo.get("postal") or "", "AD", geo["lat"], geo["lng"],
            provider["phone"], "", "", primary, pg_array(tags), 0.97, master_key,
        ])

    if len(rows) < 120:
        raise SystemExit(f"Only {len(rows)} CASS healthcare providers were map-renderable; refusing output")

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t", quoting=csv.QUOTE_ALL, lineterminator="\n")
        writer.writerow(COLUMNS)
        writer.writerows(sorted(rows, key=lambda row: (str(row[2]).lower(), str(row[0]))))

    print(json.dumps({
        "source": "ad_cass_healthcare", "parsed": len(providers), "unique_addresses": len(cache),
        "map_rows": len(rows), "skipped_unplaced": skipped, "output": str(output),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()

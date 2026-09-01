#!/usr/bin/env python3

import argparse
import csv
import hashlib
import html
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup

USER_AGENT = "Occu-Med-Network-Map/1.0 (+https://github.com/Occumed79/Network-Map)"
NOMINATIM = "https://nominatim.openstreetmap.org/search"
COLUMNS = [
    "source_record_id", "source_url", "name", "normalized_name", "address_line1",
    "formatted_address", "city", "state_region", "postal_code", "country_code",
    "lat", "lng", "phone", "website", "email", "primary_provider_type",
    "capability_tags", "quality_score", "master_key",
]

SOURCES = {
    "georgia": {
        "page": "https://www.gov.uk/government/publications/list-of-medical-facilities-in-georgia/list-of-medical-facilities-in-georgia--3",
        "country": "Georgia",
        "country_code": "GE",
        "nominatim_country": "ge",
        "source_key": "ge_fcdo_medical",
        "prefix": "ge-fcdo",
        "bounds": (41.0, 43.8, 39.8, 46.8),
    },
    "armenia": {
        "page": "https://www.gov.uk/government/publications/armenia-list-of-medical-facilitiespractitioners/lists-of-english-speaking-lawyers-and-translatorsinterpreters-in-armenia",
        "country": "Armenia",
        "country_code": "AM",
        "nominatim_country": "am",
        "source_key": "am_fcdo_medical",
        "prefix": "am-fcdo",
        "bounds": (38.8, 41.5, 43.4, 46.7),
    },
    "bosnia": {
        "page": "https://www.gov.uk/government/publications/bosnia-and-herzegovina-medical-facilities/bosnia-and-herzegovina-medical-facilities",
        "country": "Bosnia and Herzegovina",
        "country_code": "BA",
        "nominatim_country": "ba",
        "source_key": "ba_fcdo_medical",
        "prefix": "ba-fcdo",
        "bounds": (42.4, 45.4, 15.6, 19.7),
    },
}


def clean(value):
    return re.sub(r"\s+", " ", html.unescape(str(value or ""))).strip()


def norm(value):
    value = unicodedata.normalize("NFKD", clean(value))
    value = "".join(ch for ch in value if not unicodedata.combining(ch)).lower()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def sha(value):
    return hashlib.sha256(str(value).encode("utf-8")).hexdigest()


def fetch_text(url, timeout=90):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="replace")


def header_key(value):
    value = norm(value)
    aliases = [
        ("name", ["name of medical facility", "name", "medical facility"]),
        ("address", ["address"]),
        ("phone", ["telephone", "phone"]),
        ("email", ["email"]),
        ("specialty", ["main specialisation", "main specialization", "specialisation", "specialization"]),
        ("public_private", ["private public facility", "public private facility", "public private"]),
        ("english", ["english speaking staff", "english speaking"]),
        ("accreditation", ["accreditation"]),
        ("region", ["regions", "region"]),
        ("website", ["website", "web address"]),
        ("further", ["further information"]),
    ]
    for key, values in aliases:
        if value in values:
            return key
    return value


def split_addresses(value):
    text = clean(value)
    if not text:
        return []
    if re.search(r"\bAddress\s+\d+\s*:", text, flags=re.I):
        pieces = re.split(r"\bAddress\s+\d+\s*:\s*", text, flags=re.I)
        return [clean(piece).strip(" ;,") for piece in pieces if clean(piece).strip(" ;,")]
    return [text]


def nearest_heading(table):
    heading = table.find_previous(["h2", "h3"])
    if not heading:
        return ""
    value = clean(heading.get_text(" ", strip=True))
    if any(x in norm(value) for x in ["list of medical facilities", "disclaimer", "contents", "feedback"]):
        return ""
    return value


def parse_tables(raw):
    soup = BeautifulSoup(raw, "html.parser")
    records = []
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if not rows:
            continue
        header_cells = rows[0].find_all(["th", "td"])
        headers = [header_key(cell.get_text(" ", strip=True)) for cell in header_cells]
        if "name" not in headers or "address" not in headers:
            continue
        section = nearest_heading(table)
        for row in rows[1:]:
            cells = row.find_all(["td", "th"])
            if len(cells) < 2:
                continue
            values = [clean(cell.get_text(" ", strip=True)) for cell in cells]
            data = {headers[i]: values[i] if i < len(values) else "" for i in range(len(headers))}
            name = clean(data.get("name"))
            address = clean(data.get("address"))
            if not name or not address:
                continue
            records.append({
                "name": name,
                "addresses": split_addresses(address),
                "phone": clean(data.get("phone")),
                "email": clean(data.get("email")),
                "specialty": clean(data.get("specialty")),
                "public_private": clean(data.get("public_private")),
                "english": clean(data.get("english")),
                "accreditation": clean(data.get("accreditation")),
                "region": clean(data.get("region")) or section,
                "website": clean(data.get("website")),
                "further": clean(data.get("further")),
            })
    return records


def classify(name, specialty):
    s = norm(f"{name} {specialty}")
    primary = "specialist"
    if any(x in s for x in ["occupational health", "occupational medicine", "workplace health", "labor medicine"]):
        primary = "occupational_health_clinic"
    elif any(x in s for x in ["dent", "stomatolog", "oral surgery", "orthodont"]):
        primary = "dental"
    elif any(x in s for x in ["laborator", "patholog", "blood test", "phlebot"]):
        primary = "lab"
    elif any(x in s for x in ["radiolog", "imaging", "x ray", "mri", "ct scan", "ultrasound", "mammograph"]):
        primary = "imaging"
    elif any(x in s for x in ["hospital", "medical centre", "medical center", "clinic", "polyclinic"]):
        primary = "hospital"
    elif any(x in s for x in ["general practitioner", "general medicine", "family medicine", "primary care"]):
        primary = "general_practitioner"
    return primary


def specialty_tags(value):
    value = clean(value)
    if not value:
        return []
    tags = []
    for item in re.split(r"[;,/|]+", value):
        item = norm(item)
        if len(item) < 3:
            continue
        tag = re.sub(r"[^a-z0-9]+", "_", item).strip("_")[:80]
        if tag:
            tags.append(f"specialty:{tag}")
    return tags[:30]


def geocode(query, country_code, bounds):
    params = urllib.parse.urlencode({
        "format": "jsonv2", "addressdetails": 1, "limit": 1,
        "countrycodes": country_code, "q": query,
    })
    req = urllib.request.Request(
        f"{NOMINATIM}?{params}",
        headers={"User-Agent": USER_AGENT, "Accept-Language": "en"},
    )
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
    south, north, west, east = bounds
    if not (south <= lat <= north and west <= lng <= east):
        return None
    address = item.get("address") or {}
    return {
        "lat": lat,
        "lng": lng,
        "city": clean(address.get("city") or address.get("town") or address.get("village") or address.get("municipality")),
        "region": clean(address.get("state") or address.get("county") or address.get("region")),
        "postal": clean(address.get("postcode")),
    }


def pg_array(values):
    items = []
    for value in dict.fromkeys(v for v in values if v):
        items.append('"' + str(value).replace("\\", "\\\\").replace('"', '\\"') + '"')
    return "{" + ",".join(items) + "}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", choices=sorted(SOURCES), required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    cfg = SOURCES[args.source]
    facilities = parse_tables(fetch_text(cfg["page"]))
    if not facilities:
        raise SystemExit(f"No {args.source} FCDO facilities parsed; refusing output")

    cache = {}
    rows = []
    last_request = 0.0
    for facility in facilities:
        for site_index, address in enumerate(facility["addresses"], start=1):
            query = f"{address}, {cfg['country']}"
            key = norm(query)
            if key not in cache:
                wait = 1.1 - (time.time() - last_request)
                if wait > 0:
                    time.sleep(wait)
                cache[key] = geocode(query, cfg["nominatim_country"], cfg["bounds"])
                last_request = time.time()
            geo = cache[key]
            if not geo:
                fallback_city = facility["region"]
                fallback_query = f"{address}, {fallback_city}, {cfg['country']}" if fallback_city else ""
                fallback_key = norm(fallback_query)
                if fallback_query and fallback_key not in cache:
                    wait = 1.1 - (time.time() - last_request)
                    if wait > 0:
                        time.sleep(wait)
                    cache[fallback_key] = geocode(fallback_query, cfg["nominatim_country"], cfg["bounds"])
                    last_request = time.time()
                geo = cache.get(fallback_key) if fallback_query else None
            if not geo:
                continue

            primary = classify(facility["name"], facility["specialty"])
            tags = [
                primary, "healthcare_facility", "fcdo_curated_medical_facility",
                "not_national_exhaustive",
            ]
            if norm(facility["english"]) in {"yes", "y", "true"}:
                tags.append("english_speaking")
            pp = norm(facility["public_private"])
            if "private" in pp:
                tags.append("private_facility")
            if "public" in pp:
                tags.append("public_facility")
            if facility["accreditation"]:
                tags.append("accreditation_listed")
            tags.extend(specialty_tags(facility["specialty"]))

            city = geo.get("city") or facility["region"]
            region = geo.get("region") or facility["region"]
            postal = geo.get("postal") or ""
            formatted = ", ".join(x for x in [address, city, region, postal, cfg["country"]] if x)
            source_id = f"{cfg['prefix']}:" + sha("|".join([facility["name"], address, str(site_index)]))[:24]
            master_key = "loc:" + sha(json.dumps({
                "name": norm(facility["name"]), "address": norm(formatted),
                "country": cfg["country_code"], "lat": round(geo["lat"], 6),
                "lng": round(geo["lng"], 6),
            }, sort_keys=True, ensure_ascii=False))
            rows.append([
                source_id, cfg["page"], facility["name"], norm(facility["name"]),
                address, formatted, city, region, postal, cfg["country_code"],
                geo["lat"], geo["lng"], facility["phone"], facility["website"],
                facility["email"], primary, pg_array(tags), 0.94, master_key,
            ])

    deduped = {(row[0], row[18]): row for row in rows}
    rows = list(deduped.values())
    if not rows:
        raise SystemExit(f"{args.source} produced no map-renderable facilities")

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t", quoting=csv.QUOTE_ALL, lineterminator="\n")
        writer.writerow(COLUMNS)
        writer.writerows(sorted(rows, key=lambda row: (str(row[2]).lower(), str(row[0]))))

    print(json.dumps({
        "source": cfg["source_key"], "page": cfg["page"],
        "parsed_facility_rows": len(facilities), "map_rows": len(rows),
        "unique_geocode_queries": len(cache), "output": str(output),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()

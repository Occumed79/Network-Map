#!/usr/bin/env python3
import argparse
import csv
import hashlib
import json
import re
import time
import unicodedata
from collections import deque
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

ROOTS = [
    "https://peqqik.gl/Kontakt/Sundhedscentre",
    "https://peqqik.gl/da-DK/Kontakt/Sundhedscentre",
]
ORG_PLAN = "https://peqqik.gl/-/media/Files/Fagpersoner/Organisationsplan_shv_2020.pdf?la=da-DK"
NOMINATIM = "https://nominatim.openstreetmap.org/search"
PHOTON = "https://photon.komoot.io/api/"
USER_AGENT = "Occu-Med-Network-Map/1.0 (+https://github.com/Occumed79/Network-Map)"
COLUMNS = [
    "source_record_id","source_url","name","normalized_name","address_line1",
    "formatted_address","city","state_region","postal_code","country_code",
    "lat","lng","phone","website","email","primary_provider_type",
    "capability_tags","quality_score","master_key",
]

REGION_HINTS = {
    "Avannaa": ["Avannaa", "Ilulissat", "Uummannaq", "Upernavik", "Qaanaaq"],
    "Disko": ["Disko", "Aasiaat", "Kangaatsiaq", "Qasigiannguit", "Qeqertarsuaq"],
    "Qeqqa": ["Qeqqa", "Sisimiut", "Maniitsoq"],
    "Sermersooq": ["Sermersooq", "Nuuk", "Tasiilaq", "Paamiut", "Ittoqqortoormiit"],
    "Kujataa": ["Kujataa", "Qaqortoq", "Narsaq", "Nanortalik"],
}
EXCLUDE_TITLES = (
    "sundhedsplejen", "psykiatr", "akutomr", "kirurg", "medicinsk omr",
    "jordemoder", "patienthotel", "administration", "ledelse", "landsapotek",
    "tandklinik", "steno", "laborator", "ambulator",
)
FACILITY_WORDS = (
    "sundhedscenter", "peqqissaavik", "regionssygehus", "hospital",
    "sygehus", "health centre", "health center",
)
GROUP_WORDS = (
    "bygdekonsultation", "sundhedshuse", "sygeplejestation",
    "peqqissaaso", "stationer",
)

def text(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()

def norm(value):
    value = unicodedata.normalize("NFKD", text(value))
    value = "".join(ch for ch in value if not unicodedata.combining(ch)).lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", value)).strip()

def sha(value):
    return hashlib.sha256(str(value).encode("utf-8")).hexdigest()

def pg_array(values):
    return "{" + ",".join(
        '"' + str(v).replace("\\","\\\\").replace('"','\\\"') + '"'
        for v in dict.fromkeys(v for v in values if v)
    ) + "}"

def classify(name):
    n = norm(name)
    if "hospital" in n or "sygehus" in n or "regionssygehus" in n:
        return "hospital"
    return "general_practitioner"

def region_for(value):
    n = norm(value)
    for region, hints in REGION_HINTS.items():
        if any(norm(hint) in n for hint in hints):
            return region
    return ""

def safe_get(url, timeout=60):
    last = None
    for attempt in range(5):
        try:
            r = requests.get(
                url, timeout=timeout, allow_redirects=True,
                headers={"User-Agent": USER_AGENT, "Accept-Language": "da,kl,en"},
            )
            r.raise_for_status()
            return r
        except Exception as exc:
            last = exc
            time.sleep(min(10, 2 + attempt * 2))
    raise last

def internal_contact_url(url):
    try:
        parsed = urlparse(url)
    except Exception:
        return False
    return (
        parsed.netloc.lower().endswith("peqqik.gl")
        and "/kontakt/sundhedscentre/" in parsed.path.lower()
    )

def phone_from(raw):
    match = re.search(r"(?:Telefon|Telefonnummer|Oqarasuaat)\s*:?[\s]*(?:\(\+299\)\s*)?([0-9][0-9\s]{5,})", raw, re.I)
    return text(match.group(1)) if match else ""

def email_from(raw):
    match = re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", raw, re.I)
    return match.group(0) if match else ""

def postal_city_from(raw):
    match = re.search(r"\b(39\d{2})\s+([A-ZÆØÅÀ-ÖØ-öø-ÿ][A-Za-zÆØÅæøåÀ-ÖØ-öø-ÿ' -]{1,40})", raw)
    return (match.group(1), text(match.group(2))) if match else ("", "")

def address_from(raw, city):
    lines = [text(line) for line in raw.splitlines() if text(line)]
    for line in lines[:20]:
        if line.lower().startswith(("postbox", "telefon", "fax", "e-post", "email", "oqarasuaat")):
            continue
        if city and norm(line) == norm(city):
            continue
        if re.search(r"\b(?:vej|aqqut|gade|street|b-\d+|postbox)\b", line, re.I) and len(line) < 100:
            return line
    return ""

def group_localities(soup):
    raw = soup.get_text("\n", strip=True)
    lines = [text(x) for x in raw.splitlines() if text(x)]
    output = []
    bad = {
        "telefonnummer","åbningstider","kontakt","akut","sundhedscentre",
        "tandklinikker","patientvejledning","region",
    }
    for idx, line in enumerate(lines[:-1]):
        key = norm(line)
        if not key or len(line) > 50 or key in bad:
            continue
        next_line = lines[idx + 1]
        if re.match(r"^(?:B-\d+|Postbox|Telefonnummer|Telefon:|Oqarasuaat)", next_line, re.I):
            if not any(word in key for word in ("telefon", "abning", "postbox", "region", "sygehus")):
                output.append(line)
    return list(dict.fromkeys(output))

def geocode(query):
    try:
        r = requests.get(
            PHOTON, params={"q": query, "limit": 5},
            timeout=20,
            headers={"User-Agent":USER_AGENT,"Accept-Language":"da,kl,en"},
        )
        r.raise_for_status()
        for feature in (r.json() or {}).get("features") or []:
            coords = ((feature.get("geometry") or {}).get("coordinates") or [])
            if len(coords) < 2:
                continue
            lng, lat = float(coords[0]), float(coords[1])
            if 58.0 <= lat <= 84.0 and -74.0 <= lng <= -10.0:
                props = feature.get("properties") or {}
                city = text(props.get("city") or props.get("locality") or props.get("district"))
                postal = text(props.get("postcode"))
                return lat, lng, city, postal
    except Exception:
        pass

    params = {"format":"jsonv2","limit":1,"countrycodes":"gl","q":query}
    for attempt in range(3):
        try:
            r = requests.get(
                NOMINATIM, params=params, timeout=30,
                headers={"User-Agent":USER_AGENT,"Accept-Language":"da,kl,en"},
            )
            if r.status_code == 429:
                time.sleep(2 + attempt * 2)
                continue
            r.raise_for_status()
            data = r.json()
            if data:
                lat = float(data[0]["lat"]); lng = float(data[0]["lon"])
                if 58.0 <= lat <= 84.0 and -74.0 <= lng <= -10.0:
                    address = data[0].get("address") or {}
                    city = text(address.get("city") or address.get("town") or address.get("village") or address.get("municipality"))
                    postal = text(address.get("postcode"))
                    return lat, lng, city, postal
        except Exception:
            pass
        time.sleep(1)
    return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", required=True)
    args = ap.parse_args()

    queue = deque((url,0) for url in ROOTS)
    seen_urls = set()
    facilities = {}

    while queue and len(seen_urls) < 250:
        url, depth = queue.popleft()
        if url in seen_urls or depth > 3:
            continue
        seen_urls.add(url)
        try:
            response = safe_get(url)
        except Exception:
            continue
        soup = BeautifulSoup(response.text, "html.parser")
        for anchor in soup.find_all("a", href=True):
            href = urljoin(response.url, anchor["href"]).split("#",1)[0]
            if internal_contact_url(href) and href not in seen_urls:
                queue.append((href, depth + 1))

        heading = soup.find("h1")
        title = text(heading.get_text(" ", strip=True) if heading else soup.title.get_text(" ", strip=True) if soup.title else "")
        title_norm = norm(title)
        if not title or any(token in title_norm for token in EXCLUDE_TITLES):
            continue

        body = soup.get_text("\n", strip=True)
        if any(word in title_norm for word in GROUP_WORDS):
            for locality in group_localities(soup):
                key = norm(locality)
                facilities.setdefault(key, {
                    "name": f"{locality} Bygdekonsultation",
                    "locality": locality,
                    "url": response.url,
                    "phone": "",
                    "email": "",
                    "address": "",
                    "postal": "",
                    "region": region_for(title + " " + response.url),
                    "type": "general_practitioner",
                })
            continue

        if not any(word in title_norm for word in FACILITY_WORDS):
            continue

        postal, city = postal_city_from(body)
        if not city:
            # Facility names usually contain the locality as the first/last token.
            city = re.sub(r"\b(?:Sundhedscenter|Peqqissaavik|Regionssygehus|Hospital|Nuuk)\b", " ", title, flags=re.I).strip(" ,-")
            if "nuuk" in title_norm:
                city = "Nuuk"
        key = norm(title)
        facilities[key] = {
            "name": title,
            "locality": city,
            "url": response.url,
            "phone": phone_from(body),
            "email": email_from(body),
            "address": address_from(body, city),
            "postal": postal,
            "region": region_for(title + " " + city + " " + response.url),
            "type": classify(title),
        }

    # The official organizational plan says the five regions contain one
    # regional hospital each plus health centres and village consultations.
    if len(facilities) < 35:
        raise SystemExit(json.dumps({
            "error":"Peqqik crawl returned too few physical healthcare sites",
            "sites":len(facilities),"visitedPages":len(seen_urls),
            "source":ORG_PLAN,
        }, ensure_ascii=False))

    rows = []
    for index, facility in enumerate(facilities.values()):
        query = ", ".join(x for x in [facility["name"], facility["locality"], "Greenland"] if x)
        geo = geocode(query)
        if not geo and facility["locality"]:
            geo = geocode(f'{facility["locality"]}, Greenland')
        if not geo:
            continue
        lat,lng,geo_city,geo_postal = geo
        city = facility["locality"] or geo_city
        postal = facility["postal"] or geo_postal
        formatted = ", ".join(x for x in [facility["address"], postal, city, "Greenland"] if x)
        source_id = "gl-peqqik:" + sha(norm(facility["name"]) + "|" + norm(city))[:24]
        tags = [facility["type"], "healthcare_facility", "greenland_peqqik", "public_health_service"]
        master = "loc:" + sha(json.dumps({
            "name":norm(facility["name"]),"country":"GL",
            "lat":round(lat,6),"lng":round(lng,6),
        }, sort_keys=True, ensure_ascii=False))
        rows.append([
            source_id, facility["url"], facility["name"], norm(facility["name"]),
            facility["address"], formatted, city, facility["region"], postal, "GL",
            lat, lng, facility["phone"], facility["url"], facility["email"],
            facility["type"], pg_array(tags), 0.96, master,
        ])
        if index:
            time.sleep(0.35)

    if len(rows) < 35:
        raise SystemExit(f"Only {len(rows)} Peqqik healthcare sites geocoded from {len(facilities)} parsed sites")

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    with open(args.output,"w",encoding="utf-8",newline="") as fh:
        writer=csv.writer(fh,delimiter="\t",quoting=csv.QUOTE_ALL,lineterminator="\n")
        writer.writerow(COLUMNS)
        writer.writerows(sorted(rows,key=lambda row:(str(row[7]),str(row[2]))))
    print(len(rows))

if __name__=="__main__":
    main()

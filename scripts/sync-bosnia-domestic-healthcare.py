#!/usr/bin/env python3

import argparse
import csv
import hashlib
import io
import json
import re
import time
import unicodedata
from collections import OrderedDict
from pathlib import Path
from urllib.parse import urljoin

import pandas as pd
import requests
from bs4 import BeautifulSoup

USER_AGENT = "Occu-Med-Network-Map/1.0 (+https://github.com/Occumed79/Network-Map)"
NOMINATIM = "https://nominatim.openstreetmap.org/search"
PHOTON = "https://photon.komoot.io/api/"
RS_CATALOG = "https://zdravstvo-srpske.org/sa-kim-fzo-ima-potpisan-ugovor/cjenovnici-i-sifarnici/"
BRCKO = "https://fzobrcko.ba/ugovorne-zdravstvene-ustanove"
HNZ = "https://www.zzo.ba/hr/ugovorne-zdravstvene-ustanove"
USK = "https://www.zzousk.ba/zdravstvene-ustanove"
BPK = "https://www.zzobpk.ba/ugovorne-zdravstvene-ustanove/"

COLUMNS = [
    "source_record_id", "source_url", "name", "normalized_name", "address_line1",
    "formatted_address", "city", "state_region", "postal_code", "country_code",
    "lat", "lng", "phone", "website", "email", "primary_provider_type",
    "capability_tags", "quality_score", "master_key",
]

BA_BOUNDS = (42.50, 45.35, 15.70, 19.70)

KNOWN_CITIES = [
    "Banja Luka", "Gradiška", "Srbac", "Laktaši", "Prijedor", "Kozarska Dubica", "Modriča",
    "Doboj", "Doboj Istok", "Bijeljina", "Ugljevik", "Istočno Sarajevo", "Istočni Stari Grad",
    "Istočni Drvar", "Pale", "Sokolac", "Zvornik", "Milići", "Bratunac", "Vlasenica",
    "Srebrenica", "Šekovići", "Rogatica", "Han Pijesak", "Trnovo", "Nevesinje", "Trebinje",
    "Foča", "Gacko", "Bileća", "Berkovići", "Ljubinje", "Kalinovik", "Čajniče", "Višegrad",
    "Rudo", "Mostar", "Čapljina", "Čitluk", "Jablanica", "Konjic", "Neum", "Ravno", "Stolac",
    "Prozor", "Prozor-Rama", "Bihać", "Cazin", "Ključ", "Sanski Most", "Velika Kladuša",
    "Bosanska Krupa", "Bosanski Petrovac", "Bužim", "Goražde", "Ustikolina", "Prača",
    "Sarajevo", "Ilidža", "Tuzla", "Fojnica", "Olovo", "Živinice", "Gradačac", "Brčko",
    "Dvorovi", "Ribnik", "Čelinac", "Drinić", "Kneževo", "Kotor Varoš", "Prnjavor", "Šipovo",
    "Mrkonjić Grad", "Novi Grad", "Krupa na Uni", "Oštra Luka", "Kostajnica", "Teslić", "Petrovo",
    "Stanari", "Derventa", "Brod", "Šamac", "Lopare", "Uzinovići",
]
CITY_ALIASES = {
    "bl": "Banja Luka",
    "b luka": "Banja Luka",
    "banja l": "Banja Luka",
    "bn": "Bijeljina",
    "i sarajevo": "Istočno Sarajevo",
    "i sarajevu": "Istočno Sarajevo",
    "foci": "Foča",
    "rama": "Prozor-Rama",
}
FOREIGN_CITIES = {"beograd", "novi sad", "osijek", "banja koviljaca", "b koviljaca", "gornja trepca"}


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def norm(value):
    value = unicodedata.normalize("NFKD", clean(value))
    value = "".join(ch for ch in value if not unicodedata.combining(ch)).lower()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def phrase_present(haystack, needle):
    needle = norm(needle)
    if not needle:
        return False
    return re.search(rf"(?<![a-z0-9]){re.escape(needle)}(?![a-z0-9])", haystack) is not None


def sha(value):
    return hashlib.sha256(str(value).encode("utf-8")).hexdigest()


def session_get(url, timeout=90):
    response = requests.get(url, timeout=timeout, headers={"User-Agent": USER_AGENT, "Accept-Language": "bs,hr,sr,en"})
    response.raise_for_status()
    return response


def pg_array(values):
    items = []
    for value in dict.fromkeys(v for v in values if v):
        items.append('"' + str(value).replace("\\", "\\\\").replace('"', '\\"') + '"')
    return "{" + ",".join(items) + "}"


def infer_city(text):
    n = norm(text)
    for alias, city in sorted(CITY_ALIASES.items(), key=lambda item: len(norm(item[0])), reverse=True):
        if phrase_present(n, alias):
            return city
    for city in sorted(KNOWN_CITIES, key=lambda value: len(norm(value)), reverse=True):
        if phrase_present(n, city):
            return city
    return ""


def classify(name):
    n = norm(name)
    if any(x in n for x in ["medicina rada", "medicine rada", "occupational"]):
        return "occupational_health_clinic", ["occupational_health_clinic", "healthcare_facility", "domestic_authority_registry"]
    if any(x in n for x in ["stomat", "dental", "odont"]):
        return "dental", ["dental", "healthcare_facility", "domestic_authority_registry"]
    if any(x in n for x in ["laborator", "biohem", "patolog"]):
        return "lab", ["lab", "healthcare_facility", "domestic_authority_registry"]
    if any(x in n for x in ["radiolog", "magnet", "imaging", "dijagnost"]):
        return "imaging", ["imaging", "healthcare_facility", "domestic_authority_registry"]
    if any(x in n for x in ["bolnica", "klinicki centar", "hospital", "klinika"]):
        return "hospital", ["hospital", "healthcare_facility", "domestic_authority_registry"]
    if any(x in n for x in ["dom zdravlja", "ambulanta", "opste medicine", "opce medicine", "porodicne medicine"]):
        return "general_practitioner", ["general_practitioner", "healthcare_facility", "domestic_authority_registry"]
    return "healthcare_facility", ["healthcare_facility", "domestic_authority_registry"]


def split_contact(value):
    value = clean(value)
    email_match = re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", value, re.I)
    web_match = re.search(r"(?:https?://|www\.)[^\s,;]+", value, re.I)
    return (web_match.group(0) if web_match else "", email_match.group(0) if email_match else "")


def add_record(records, authority, source_url, name, city="", address="", phone="", website="", email="", source_code=""):
    name, city, address, phone = map(clean, [name, city, address, phone])
    if not name or len(name) < 4:
        return
    key = (authority, source_code or norm(name), norm(city), norm(address))
    records[key] = {
        "authority": authority, "source_url": source_url, "source_code": source_code,
        "name": name, "city": city or infer_city(name + " " + address), "address": address,
        "phone": phone, "website": clean(website), "email": clean(email),
    }


def discover_rs_workbook():
    response = session_get(RS_CATALOG)
    soup = BeautifulSoup(response.text, "html.parser")
    candidates = []
    for anchor in soup.find_all("a", href=True):
        href = urljoin(RS_CATALOG, anchor["href"])
        if not re.search(r"\.xlsx?(?:\?|$)", href.lower()):
            continue
        contexts = []
        node = anchor
        for _ in range(6):
            if node is None:
                break
            node_text = clean(node.get_text(" ", strip=True))
            if node_text and node_text not in contexts:
                contexts.append(node_text)
            node = node.parent
        context = " ".join(contexts)
        normalized_context = norm(context)
        score = 0
        if "zdravstven" in normalized_context and "ustanov" in normalized_context:
            score += 20
        elif "ustanov" in normalized_context:
            score += 10
        if "spisak" in normalized_context:
            score += 5
        if "2026" in normalized_context:
            score += 3
        if "sifre zu" in norm(href) or "sifre zu i apoteka" in norm(href):
            score += 8
        candidates.append((score, href))
    if not candidates:
        raise RuntimeError("FZO RS catalog did not expose the healthcare-institution XLS link")
    candidates.sort(key=lambda item: item[0], reverse=True)
    if candidates[0][0] < 20:
        raise RuntimeError("FZO RS XLS candidates were found, but none matched the healthcare-institution list")
    return candidates[0][1]


def scrape_rs(records):
    workbook_url = discover_rs_workbook()
    payload = session_get(workbook_url).content
    frame = pd.read_excel(io.BytesIO(payload), header=None, dtype=str)
    header_row = None
    name_col = None
    for ridx, row in frame.iterrows():
        for cidx, value in enumerate(row.tolist()):
            if "naziv zdravstvene ustanove" in norm(value):
                header_row, name_col = ridx, cidx
                break
        if header_row is not None:
            break
    if header_row is None:
        raise RuntimeError("FZO RS workbook schema changed: provider-name header not found")
    parsed = 0
    skipped_group_headers = 0
    for _, row in frame.iloc[header_row + 1:].iterrows():
        values = [clean(v) for v in row.tolist()]
        name = clean(values[name_col] if name_col < len(values) else "")
        normalized_name = norm(name)
        if not name or name.lower() == "nan" or "fond zdravstvenog" in normalized_name:
            continue
        if normalized_name == "filijala" or normalized_name.startswith("filijala "):
            skipped_group_headers += 1
            continue
        code = ""
        branch = ""
        for value in values[:name_col]:
            if re.fullmatch(r"\d{4}", value):
                code = value
            elif re.fullmatch(r"\d{1,2}", value):
                branch = value
        add_record(records, "fzo-rs", workbook_url, name, city=infer_city(name), source_code=f"{branch}:{code}" if code else "")
        parsed += 1
    if parsed < 40:
        raise RuntimeError(f"Only {parsed} FZO RS institutions parsed; refusing incomplete source")
    print(json.dumps({"fzoRsParsed": parsed, "skippedGroupHeaders": skipped_group_headers}, ensure_ascii=False))
    return workbook_url, parsed


def table_rows(url):
    soup = BeautifulSoup(session_get(url).text, "html.parser")
    for tr in soup.select("table tr"):
        cells = [clean(cell.get_text(" ", strip=True)) for cell in tr.find_all(["td", "th"])]
        if cells:
            yield tr, cells


def scrape_hnz(records):
    count = 0
    for _, cells in table_rows(HNZ):
        if len(cells) < 4 or "zdravstvena ustanova" in norm(cells[0]):
            continue
        name, contact, address, phone = cells[0], cells[1], cells[2], cells[3]
        if not name or len(name) < 4:
            continue
        website, email = split_contact(contact)
        city = infer_city(name + " " + address)
        add_record(records, "zzo-hnz", HNZ, name, city=city, address=address, phone=phone, website=website, email=email)
        count += 1
    if count < 10:
        raise RuntimeError(f"Only {count} HNŽ/K contracted institutions parsed")
    return count


def scrape_brcko(records):
    count = 0
    for _, cells in table_rows(BRCKO):
        if len(cells) < 4 or not re.fullmatch(r"\d+", cells[0]):
            continue
        name, city, phone = cells[1], cells[2], cells[3]
        if norm(city) in FOREIGN_CITIES or phone.strip().startswith(("+381", "+385")):
            continue
        add_record(records, "fzo-brcko", BRCKO, name, city=city, phone=phone, source_code=cells[0])
        count += 1
    if count < 20:
        raise RuntimeError(f"Only {count} Bosnia-based Brčko contracted institutions parsed")
    return count


def scrape_usk(records):
    count = 0
    for _, cells in table_rows(USK):
        if len(cells) < 2 or not re.fullmatch(r"\d+", cells[0]):
            continue
        name = cells[1]
        normalized_name = norm(name)
        if not any(token in normalized_name for token in ["zu ", "jzu", "pzu", "bolnica", "dom zdravlja", "ordinacija", "zavod", "ljeciliste", "poliklinika"]):
            continue
        city = infer_city(name)
        add_record(records, "zzo-usk", USK, name, city=city, source_code=sha(name)[:12])
        count += 1
    if count < 10:
        raise RuntimeError(f"Only {count} USK institutions parsed")
    return count


def scrape_bpk(records):
    soup = BeautifulSoup(session_get(BPK).text, "html.parser")
    count = 0
    for li in soup.find_all("li"):
        name = clean(li.get_text(" ", strip=True))
        normalized_name = norm(name)
        if len(name) < 5 or any(x in normalized_name for x in ["pocetna", "kontakt", "novosti", "dokumenti", "strateski plan"]):
            continue
        if not any(x in normalized_name for x in ["bolnica", "dom zdravlja", "klinicki", "zavod", "ljeciliste", "poliklinika", "laborator", "medicana", "aquaterm"]):
            continue
        add_record(records, "zzo-bpk", BPK, name, city=infer_city(name), source_code=sha(name)[:12])
        count += 1
    if count < 10:
        raise RuntimeError(f"Only {count} BPK institutions parsed")
    return count


def simplified_name(name):
    value = clean(name)
    value = re.sub(r"^[\s\"'„“”]+|[\s\"'„“”]+$", "", value)
    value = re.sub(r"^(?:JZU|PZU|ZU|JU|Javna zdravstvena ustanova|Privatna zdravstvena ustanova)\s+", "", value, flags=re.I)
    value = re.sub(r"\s+(?:a\.d\.|d\.o\.o\.|doo|ad)\s*$", "", value, flags=re.I)
    return clean(value)


def geocode_queries(record):
    names = list(dict.fromkeys([record["name"], simplified_name(record["name"])]))
    queries = []
    if record["address"]:
        for name in names:
            queries.append(", ".join(x for x in [name, record["address"], record["city"], "Bosnia and Herzegovina"] if x))
        queries.append(", ".join(x for x in [record["address"], record["city"], "Bosnia and Herzegovina"] if x))
    for name in names:
        queries.append(", ".join(x for x in [name, record["city"], "Bosnia and Herzegovina"] if x))
    return list(dict.fromkeys(q for q in queries if q))


def in_ba_bounds(lat, lng):
    return BA_BOUNDS[0] <= lat <= BA_BOUNDS[1] and BA_BOUNDS[2] <= lng <= BA_BOUNDS[3]


def token_overlap(source, candidate):
    stop = {"jzu", "pzu", "zu", "ju", "zdravstvena", "ustanova", "zdravstvene", "ustanova", "bosna", "hercegovina"}
    a = {t for t in norm(source).split() if len(t) >= 3 and t not in stop}
    b = {t for t in norm(candidate).split() if len(t) >= 3 and t not in stop}
    if not a or not b:
        return 0.0
    return len(a & b) / len(a)


def strict_location_match(record, candidate_name, candidate_context):
    city = norm(record["city"])
    context = norm(candidate_context)
    city_ok = not city or phrase_present(context, city)
    if not city_ok:
        return False
    name_score = token_overlap(simplified_name(record["name"]), candidate_name or candidate_context)
    if record["address"]:
        address_score = token_overlap(record["address"], candidate_context)
        return name_score >= 0.34 or address_score >= 0.45
    return name_score >= 0.45


def photon_geocode(record, query):
    try:
        response = requests.get(
            PHOTON,
            params={"q": query, "limit": 5},
            timeout=25,
            headers={"User-Agent": USER_AGENT, "Accept-Language": "bs,hr,sr,en"},
        )
        response.raise_for_status()
        features = (response.json() or {}).get("features") or []
    except Exception:
        return None
    for feature in features:
        geometry = feature.get("geometry") or {}
        coordinates = geometry.get("coordinates") or []
        if len(coordinates) < 2:
            continue
        lng, lat = float(coordinates[0]), float(coordinates[1])
        if not in_ba_bounds(lat, lng):
            continue
        props = feature.get("properties") or {}
        country_code = norm(props.get("countrycode") or props.get("country_code"))
        if country_code and country_code not in {"ba", "bih"}:
            continue
        candidate_name = clean(props.get("name"))
        context_parts = [
            candidate_name, props.get("street"), props.get("housenumber"), props.get("postcode"),
            props.get("city"), props.get("town"), props.get("village"), props.get("district"),
            props.get("county"), props.get("state"), props.get("country"),
        ]
        context = ", ".join(clean(x) for x in context_parts if clean(x))
        if not strict_location_match(record, candidate_name, context):
            continue
        return {
            "lat": lat,
            "lng": lng,
            "city": clean(props.get("city") or props.get("town") or props.get("village") or record["city"]),
            "region": clean(props.get("state") or props.get("county")),
            "postal": clean(props.get("postcode")),
            "display": context,
            "geocoder": "photon",
        }
    return None


def nominatim_geocode(record, query):
    try:
        response = requests.get(
            NOMINATIM,
            params={"format": "jsonv2", "addressdetails": 1, "limit": 3, "countrycodes": "ba", "q": query},
            timeout=35,
            headers={"User-Agent": USER_AGENT, "Accept-Language": "bs,hr,sr,en"},
        )
        response.raise_for_status()
        payload = response.json()
    except Exception:
        return None
    time.sleep(1.02)
    for item in payload:
        lat, lng = float(item["lat"]), float(item["lon"])
        if not in_ba_bounds(lat, lng):
            continue
        address = item.get("address") or {}
        display = clean(item.get("display_name"))
        candidate_name = clean(item.get("name") or display.split(",", 1)[0])
        if not strict_location_match(record, candidate_name, display):
            continue
        return {
            "lat": lat,
            "lng": lng,
            "city": clean(address.get("city") or address.get("town") or address.get("village") or address.get("municipality") or record["city"]),
            "region": clean(address.get("state") or address.get("county")),
            "postal": clean(address.get("postcode")),
            "display": display,
            "geocoder": "nominatim",
        }
    return None


def geocode(record):
    queries = geocode_queries(record)
    # Photon is an indexed OSM search and is fast enough to try all strict name
    # variants first. We still require source-city + facility-name agreement, so
    # a city centroid can never pass as a provider point.
    for query in queries:
        geo = photon_geocode(record, query)
        if geo:
            return geo
        time.sleep(0.12)
    # Nominatim remains a conservative fallback. Limit it to the strongest two
    # variants so a single public service cannot dominate the sync runtime.
    for query in queries[:2]:
        geo = nominatim_geocode(record, query)
        if geo:
            return geo
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    records = OrderedDict()
    rs_url, rs_count = scrape_rs(records)
    source_counts = {
        "fzo_rs": rs_count,
        "fzo_brcko": scrape_brcko(records),
        "zzo_hnz": scrape_hnz(records),
        "zzo_usk": scrape_usk(records),
        "zzo_bpk": scrape_bpk(records),
    }
    if len(records) < 90:
        raise SystemExit(f"Only {len(records)} unique Bosnia domestic-authority facilities parsed; refusing output")

    rows = []
    skipped = []
    geocoder_counts = {}
    for record in records.values():
        geo = geocode(record)
        if not geo:
            skipped.append({"authority": record["authority"], "name": record["name"], "city": record["city"]})
            continue
        geocoder_counts[geo.get("geocoder", "unknown")] = geocoder_counts.get(geo.get("geocoder", "unknown"), 0) + 1
        primary, tags = classify(record["name"])
        tags.append(f"authority:{record['authority']}")
        source_id = "ba-domestic:" + sha("|".join([record["authority"], record["source_code"], record["name"], record["city"], record["address"]]))[:24]
        address_line = record["address"]
        formatted = geo["display"] or ", ".join(x for x in [address_line, record["city"], "Bosnia and Herzegovina"] if x)
        master_key = "loc:" + sha(json.dumps({
            "name": norm(record["name"]), "address": norm(formatted), "country": "BA",
            "lat": round(geo["lat"], 6), "lng": round(geo["lng"], 6),
        }, sort_keys=True, ensure_ascii=False))
        quality = 0.97 if address_line else (0.94 if record["city"] else 0.90)
        rows.append([
            source_id, record["source_url"], record["name"], norm(record["name"]), address_line,
            formatted, geo["city"] or record["city"], geo["region"], geo["postal"], "BA",
            geo["lat"], geo["lng"], record["phone"], record["website"], record["email"], primary,
            pg_array(tags), quality, master_key,
        ])

    if len(rows) < 55:
        raise SystemExit(f"Only {len(rows)} Bosnia domestic-authority providers were map-renderable; refusing output")

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t", quoting=csv.QUOTE_ALL, lineterminator="\n")
        writer.writerow(COLUMNS)
        writer.writerows(sorted(rows, key=lambda row: (str(row[2]).lower(), str(row[0]))))

    skipped_path = output.with_suffix(".skipped.json")
    skipped_path.write_text(json.dumps(skipped, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "source": "ba_domestic_healthcare",
        "official_sources": source_counts,
        "rs_workbook": rs_url,
        "parsed_unique": len(records),
        "map_rows": len(rows),
        "skipped_unplaced": len(skipped),
        "geocoders": geocoder_counts,
        "output": str(output),
        "skipped_output": str(skipped_path),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()

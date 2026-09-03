#!/usr/bin/env python3

import argparse
import csv
import hashlib
import json
import re
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from difflib import SequenceMatcher
from pathlib import Path

import requests

SOURCE_URL = "https://vefkerfi.landlaeknir.is/apex/f?p=2600:7"
PHOTON = "https://photon.komoot.io/api/"
USER_AGENT = "Occu-Med-Network-Map/1.0 (+https://github.com/Occumed79/Network-Map)"
IS_BOUNDS = (63.20, 66.75, -24.90, -13.00)

COLUMNS = [
    "source_record_id", "source_url", "name", "normalized_name", "address_line1",
    "formatted_address", "city", "state_region", "postal_code", "country_code",
    "lat", "lng", "phone", "website", "email", "primary_provider_type",
    "capability_tags", "quality_score", "master_key",
]

STOP = {
    "ehf", "slf", "sf", "hf", "og", "the", "clinic", "klinikk", "stofan", "stofa",
    "laeknastofa", "tannlaeknastofa", "sjukrathjalfun", "island", "iceland",
}


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def norm(value):
    value = unicodedata.normalize("NFKD", clean(value))
    value = "".join(ch for ch in value if not unicodedata.combining(ch)).lower()
    value = value.replace("þ", "th").replace("ð", "d").replace("æ", "ae")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def tokens(value):
    return {token for token in norm(value).split() if len(token) >= 2 and token not in STOP}


def simplified(value):
    text = clean(value)
    text = re.sub(r"\b(?:ehf\.?|slf\.?|sf\.?|hf\.?)\b", " ", text, flags=re.I)
    return clean(text)


def sha(value):
    return hashlib.sha256(str(value).encode("utf-8")).hexdigest()


def pg_array(values):
    items = []
    for value in dict.fromkeys(clean(v) for v in values if clean(v)):
        items.append('"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"')
    return "{" + ",".join(items) + "}"


def in_iceland(lat, lng):
    return IS_BOUNDS[0] <= lat <= IS_BOUNDS[1] and IS_BOUNDS[2] <= lng <= IS_BOUNDS[3]


def name_score(source, candidate):
    source_n = norm(simplified(source))
    candidate_n = norm(simplified(candidate))
    if not source_n or not candidate_n:
        return 0.0
    if source_n == candidate_n:
        return 1.0
    a, b = tokens(source_n), tokens(candidate_n)
    overlap = len(a & b) / max(1, min(len(a), len(b))) if a and b else 0.0
    sequence = SequenceMatcher(None, source_n, candidate_n).ratio()
    return max(overlap, sequence)


def locality_matches(record, props):
    expected_postal = clean(record.get("postal_code"))
    candidate_postal = clean(props.get("postcode"))
    if expected_postal and candidate_postal and expected_postal == candidate_postal:
        return True
    expected = norm(record.get("locality"))
    if not expected:
        return True
    candidate_parts = [props.get("city"), props.get("town"), props.get("village"), props.get("district"), props.get("county")]
    for value in candidate_parts:
        candidate = norm(value)
        if not candidate:
            continue
        if expected == candidate or expected[:5] == candidate[:5]:
            return True
        if SequenceMatcher(None, expected, candidate).ratio() >= 0.78:
            return True
    return False


def query_variants(record):
    workplace = clean(record.get("workplace"))
    locality = clean(record.get("locality"))
    postal = clean(record.get("postal_code"))
    operators = [clean(value) for value in clean(record.get("operators")).split("|") if clean(value)]
    variants = [workplace, simplified(workplace)]
    variants.extend(operators[:2])
    queries = []
    for name in dict.fromkeys(value for value in variants if value):
        queries.append(", ".join(value for value in [name, postal, locality, "Iceland"] if value))
    return list(dict.fromkeys(queries))[:4]


def photon_search(query):
    response = requests.get(
        PHOTON,
        params={"q": query, "limit": 6},
        timeout=25,
        headers={"User-Agent": USER_AGENT, "Accept-Language": "is,en"},
    )
    response.raise_for_status()
    return (response.json() or {}).get("features") or []


def candidate_score(record, props):
    if not locality_matches(record, props):
        return 0.0
    candidate_name = clean(props.get("name"))
    if not candidate_name:
        return 0.0
    score = name_score(record.get("workplace"), candidate_name)
    for operator in clean(record.get("operators")).split("|")[:3]:
        score = max(score, name_score(operator, candidate_name))
    return score


def geocode_record(record, max_variants=0):
    best = None
    best_score = 0.0
    queries = query_variants(record)
    if max_variants and max_variants > 0:
        queries = queries[:max_variants]
    for query in queries:
        try:
            features = photon_search(query)
        except Exception:
            continue
        for feature in features:
            coordinates = (feature.get("geometry") or {}).get("coordinates") or []
            if len(coordinates) < 2:
                continue
            lng, lat = float(coordinates[0]), float(coordinates[1])
            if not in_iceland(lat, lng):
                continue
            props = feature.get("properties") or {}
            cc = norm(props.get("countrycode") or props.get("country_code"))
            if cc and cc not in {"is", "isl"}:
                continue
            score = candidate_score(record, props)
            if score < 0.60 or score <= best_score:
                continue
            street = clean(props.get("street"))
            house = clean(props.get("housenumber"))
            address_line = clean(" ".join(value for value in [street, house] if value))
            city = clean(props.get("city") or props.get("town") or props.get("village") or record.get("locality"))
            region = clean(props.get("state") or props.get("county"))
            postal = clean(props.get("postcode") or record.get("postal_code"))
            display = ", ".join(value for value in [address_line, postal, city, region, "Iceland"] if value)
            best = {
                "lat": lat,
                "lng": lng,
                "address": address_line,
                "city": city,
                "region": region,
                "postal": postal,
                "display": display,
                "score": score,
                "candidate_name": clean(props.get("name")),
            }
            best_score = score
        if best_score >= 0.92:
            break
        time.sleep(0.04)
    return best


def classify(professions):
    p = norm(professions)
    if "tannlaeknir" in p or "tannfraedingur" in p:
        return "dental"
    if "laeknir" in p:
        return "healthcare_facility"
    return "healthcare_facility"


def load_rows(path):
    with open(path, encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle, delimiter="\t"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--skipped")
    parser.add_argument("--workers", type=int, default=10)
    parser.add_argument("--max-variants", type=int, default=0, help="Limit geocoder query variants per workplace; 0 means all variants")
    args = parser.parse_args()

    records = load_rows(args.input)
    if len(records) < 1000:
        raise SystemExit(f"Only {len(records)} Iceland registry workplaces supplied; refusing incomplete input")

    matched = {}
    with ThreadPoolExecutor(max_workers=max(2, min(args.workers, 12))) as executor:
        futures = {executor.submit(geocode_record, record, args.max_variants): index for index, record in enumerate(records)}
        for future in as_completed(futures):
            index = futures[future]
            try:
                geo = future.result()
            except Exception:
                geo = None
            if geo:
                matched[index] = geo

    rows = []
    skipped = []
    for index, record in enumerate(records):
        geo = matched.get(index)
        if not geo:
            skipped.append({
                "workplace": clean(record.get("workplace")),
                "postal_code": clean(record.get("postal_code")),
                "locality": clean(record.get("locality")),
                "professions": clean(record.get("professions")),
            })
            continue
        name = clean(record.get("workplace"))
        postal = clean(record.get("postal_code"))
        locality = clean(record.get("locality"))
        professions = clean(record.get("professions"))
        operator_tags = [f"profession:{norm(value).replace(' ', '_')}" for value in professions.split("|") if clean(value)]
        primary = classify(professions)
        source_id = "is-doh:" + sha("|".join([norm(name), postal, norm(locality)]))[:24]
        quality = min(0.995, 0.90 + geo["score"] * 0.09)
        master_key = "loc:" + sha(json.dumps({
            "name": norm(name),
            "country": "IS",
            "lat": round(geo["lat"], 6),
            "lng": round(geo["lng"], 6),
        }, sort_keys=True))
        tags = [primary, "healthcare_facility", "iceland_doh", "domestic_authority_registry", *operator_tags]
        rows.append([
            source_id, SOURCE_URL, name, norm(name), geo["address"], geo["display"],
            geo["city"] or locality, geo["region"], geo["postal"] or postal, "IS",
            geo["lat"], geo["lng"], "\\N", "\\N", "\\N", primary,
            pg_array(tags), f"{quality:.3f}", master_key,
        ])

    if len(rows) < 200:
        raise SystemExit(f"Only {len(rows)} Iceland Directorate workplaces matched exact OSM locations; refusing map promotion")

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t", quoting=csv.QUOTE_ALL, lineterminator="\n")
        writer.writerow(COLUMNS)
        writer.writerows(sorted(rows, key=lambda row: (str(row[2]).casefold(), str(row[0]))))

    skipped_path = Path(args.skipped) if args.skipped else output.with_suffix(".skipped.json")
    skipped_path.write_text(json.dumps(skipped, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "source": "is_doh_healthcare_operators",
        "official_workplaces": len(records),
        "map_rows": len(rows),
        "skipped_unmatched": len(skipped),
        "minimum_name_match": 0.60,
        "query_variants_per_workplace": args.max_variants or "all",
        "geocoder": "Photon / OpenStreetMap exact-name+locality matching",
        "output": str(output),
        "skipped_output": str(skipped_path),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
import argparse
import csv
import hashlib
import json
import re
import time
from pathlib import Path

import requests

QUERY_URL = "https://osp-sdg.stat.gov.lt/arcgis/rest/services/istaiga_geo/FeatureServer/0/query"
SOURCE_PAGE = "https://data.gov.lt/datasets/3048/"
USER_AGENT = "Occu-Med-Network-Map/1.0"
ACTIVE_WHERE = "licencijos_busena = '3'"
PAGE_SIZE = 2000

COLUMNS = [
    "source_record_id","source_url","name","normalized_name","address_line1",
    "formatted_address","city","state_region","postal_code","country_code",
    "lat","lng","phone","website","email","primary_provider_type",
    "capability_tags","quality_score","master_key",
]

def text(value):
    return "" if value is None else str(value).strip()

def norm(value):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", text(value).lower())).strip()

def pg_array(values):
    return "{" + ",".join(
        '"' + str(value).replace("\\", "\\\\").replace('"', '\\"') + '"'
        for value in values
    ) + "}"

def sha(value):
    return hashlib.sha256(str(value).encode("utf-8")).hexdigest()

def request_json(params):
    last_error = None
    for attempt in range(1, 7):
        try:
            response = requests.get(
                QUERY_URL,
                params=params,
                headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
                timeout=120,
            )
            response.raise_for_status()
            payload = response.json()
            if isinstance(payload, dict) and payload.get("error"):
                raise RuntimeError(json.dumps(payload["error"], ensure_ascii=False))
            return payload
        except Exception as exc:
            last_error = exc
            if attempt == 6:
                break
            time.sleep(min(30, attempt * 5))
    raise RuntimeError(f"Lithuania FeatureServer request failed: {last_error}")

def classify(name):
    value = norm(name)
    if any(token in value for token in ("laborator", "mikrobiolog", "patolog")):
        return "lab"
    if any(token in value for token in ("odont", "dental", "stomat")):
        return "dental"
    if any(token in value for token in ("radiolog", "diagnost", "magnet", "tomograf")):
        return "imaging"
    if any(token in value for token in ("ligonine", "hospital", "kliniku ligonine")):
        return "hospital"
    if any(token in value for token in ("seimos klinika", "ambulator", "poliklin")):
        return "general_practitioner"
    return "healthcare_facility"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    count_payload = request_json({
        "where": ACTIVE_WHERE,
        "returnCountOnly": "true",
        "f": "json",
    })
    official_total = int(count_payload.get("count") or 0)
    if official_total < 2500:
        raise SystemExit(f"Official Lithuania active-issued count collapsed to {official_total}; refusing output")

    rows = {}
    offset = 0
    missing_geometry = 0

    while offset < official_total:
        payload = request_json({
            "where": ACTIVE_WHERE,
            "outFields": "*",
            "returnGeometry": "true",
            "outSR": "4326",
            "orderByFields": "object_id ASC",
            "resultOffset": str(offset),
            "resultRecordCount": str(PAGE_SIZE),
            "f": "json",
        })
        features = payload.get("features") or []
        if not features:
            break

        for feature in features:
            attributes = feature.get("attributes") or {}
            geometry = feature.get("geometry") or {}
            try:
                lng = float(geometry.get("x"))
                lat = float(geometry.get("y"))
            except (TypeError, ValueError):
                missing_geometry += 1
                continue
            if not (53.8 <= lat <= 56.5 and 20.5 <= lng <= 27.0):
                missing_geometry += 1
                continue

            spi_id = text(attributes.get("spi_id"))
            object_id = text(attributes.get("object_id"))
            name = text(attributes.get("jar_pavadinimas"))
            if not name:
                continue

            source_id = f"lt-vaspvt:{spi_id or object_id}"
            license_number = text(attributes.get("licencijos_nr"))
            legal_form = text(attributes.get("teisines_formos_pav"))
            public_personal = text(attributes.get("asmuo_visuomene"))
            provider_type = classify(name)
            tags = [
                provider_type,
                "healthcare_facility",
                "licensed_healthcare_facility",
                "lithuania_vaspvt",
                "license_status:issued",
            ]
            if public_personal:
                tags.append(f"care_scope:{public_personal}")

            formatted = "Lithuania"
            master_key = "loc:" + sha(json.dumps({
                "name": norm(name),
                "country": "LT",
                "lat": round(lat, 6),
                "lng": round(lng, 6),
            }, sort_keys=True, ensure_ascii=False))

            rows[source_id] = [
                source_id,
                SOURCE_PAGE,
                name,
                norm(name),
                "",
                formatted,
                "",
                "",
                "",
                "LT",
                lat,
                lng,
                "",
                "",
                "",
                provider_type,
                pg_array(tags + ([f"license:{license_number}"] if license_number else []) + ([f"legal_form:{norm(legal_form)}"] if legal_form else [])),
                0.995,
                master_key,
            ]

        offset += len(features)
        if len(features) < PAGE_SIZE:
            break

    if len(rows) < 2500:
        raise SystemExit(
            f"Only {len(rows)} active issued Lithuania facilities had usable geometry "
            f"from official total {official_total}; missing geometry={missing_geometry}"
        )

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t", quoting=csv.QUOTE_ALL, lineterminator="\n")
        writer.writerow(COLUMNS)
        writer.writerows(sorted(rows.values(), key=lambda row: (str(row[2]).lower(), str(row[0]))))

    print(len(rows))

if __name__ == "__main__":
    main()

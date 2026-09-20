#!/usr/bin/env python3

import argparse
import csv
import hashlib
import io
import json
import math
import re
from datetime import date, datetime
from pathlib import Path

import requests
from pyproj import Transformer

SOURCE_URL = "https://sor-filer.sundhedsdata.dk/sor2_produktion/V1_00/data/SorEntity_daily.csv"
SOURCE_PAGE = "https://sundhedsdatastyrelsen.dk/data-og-registre/nationale-sundhedsregistre/sundhedsvaesenets-organisationsregister/brug-sor-data"
USER_AGENT = "Occu-Med-Network-Map/1.0 (+https://github.com/Occumed79/Network-Map)"
TRANSFORMER = Transformer.from_crs("EPSG:25832", "EPSG:4326", always_xy=True)

COLUMNS = [
    "source_record_id", "source_url", "name", "normalized_name", "address_line1",
    "formatted_address", "city", "state_region", "postal_code", "country_code",
    "lat", "lng", "phone", "website", "email", "primary_provider_type",
    "capability_tags", "quality_score", "master_key",
]


def text(value):
    if value is None:
        return ""
    value = str(value).strip()
    if value.startswith('="') and value.endswith('"'):
        value = value[2:-1]
    return value.strip()


def normalized(value):
    value = text(value).lower()
    value = value.replace("æ", "ae").replace("ø", "o").replace("å", "a")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def hash_text(value):
    return hashlib.sha256(str(value).encode("utf-8")).hexdigest()


def finite(value):
    try:
        number = float(text(value).replace(",", "."))
    except ValueError:
        return None
    return number if math.isfinite(number) else None


def parse_date(value):
    value = text(value)
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d.%m.%Y", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(value[:19], fmt).date()
        except ValueError:
            pass
    return None


def active_now(row):
    today = date.today()
    first = parse_date(row.get("FirstFromDate"))
    from_date = parse_date(row.get("FromDate"))
    to_date = parse_date(row.get("ToDate"))
    if first and first > today:
        return False
    if from_date and from_date > today:
        return False
    if to_date and to_date < today:
        return False
    return True


def dk_coordinates(row):
    pairs = [
        ("SorVisitingAddressCoordETRS89z32EMeasure", "SorVisitingAddressCoordETRS89z32NMeasure"),
        ("VisitingAddressCoordETRS89z32EMeasure", "VisitingAddressCoordETRS89z32NMeasure"),
        ("ActivityAddressCoordETRS89z32EMeasure", "ActivityAddressCoordETRS89z32NMeasure"),
        ("PostalAddressCoordETRS89z32EMeasure", "PostalAddressCoordETRS89z32NMeasure"),
        ("AddressCoordETRS89z32EMeasure", "AddressCoordETRS89z32NMeasure"),
    ]
    for east_key, north_key in pairs:
        east = finite(row.get(east_key))
        north = finite(row.get(north_key))
        if east is None or north is None:
            continue
        # Some SOR2 exports have carried the same named fields as WGS84
        # decimal degrees, while others contain true ETRS89 / UTM zone 32.
        if 7.4 <= east <= 15.6 and 54.3 <= north <= 58.0:
            return north, east
        if 54.3 <= east <= 58.0 and 7.4 <= north <= 15.6:
            return east, north
        for scale in (1.0, 0.1, 0.01, 0.001, 0.0001):
            try:
                lng, lat = TRANSFORMER.transform(east * scale, north * scale)
            except Exception:
                continue
            if 54.3 <= lat <= 58.0 and 7.4 <= lng <= 15.6:
                return lat, lng
    return None


def address_parts(row):
    prefixes = ["SorVisitingAddress", "VisitingAddress", "ActivityAddress", "PostalAddress", "Address"]
    for prefix in prefixes:
        street = text(row.get(prefix + "StreetName"))
        number = text(row.get(prefix + "StreetBuildingId") or row.get(prefix + "StreetbuildingId"))
        floor = text(row.get(prefix + "FloorId"))
        suite = text(row.get(prefix + "SuiteId"))
        extra = text(row.get(prefix + "AdditionalAddressInfo"))
        postal = text(row.get(prefix + "PostCodeId"))
        city = text(row.get(prefix + "DistrictName"))
        if not any((street, number, postal, city)):
            continue
        line = " ".join(part for part in (street, number) if part).strip()
        detail = ", ".join(part for part in (floor, suite, extra) if part)
        if detail:
            line = f"{line}, {detail}" if line else detail
        formatted = ", ".join(part for part in (line, f"{postal} {city}".strip(), "Denmark") if part)
        return line, city, postal, formatted
    return "", "", "", "Denmark"


def specialties(row):
    values = []
    for index in range(1, 9):
        value = text(
            row.get(f"PrioritizedEntitySpeciality{index}Name")
            or row.get(f"SorPrioritizedEntitySpeciality{index}Name")
        )
        if value and value not in values:
            values.append(value)
    return values


def classify(name, entity_type, institution_type, speciality_values):
    haystack = normalized(" ".join([name, entity_type, institution_type, *speciality_values]))
    primary = "healthcare_facility"
    if re.search(r"arbejdsmedicin|arbejds og miljomedicin|occupational|bedriftssundhed", haystack):
        primary = "occupational_health_clinic"
    elif re.search(r"tandlaege|tandklinik|odontolog|dental", haystack):
        primary = "dental"
    elif re.search(r"apotek|pharmacy", haystack):
        primary = "pharmacy_vaccination"
    elif re.search(r"laborator|klinisk biokemi|mikrobiolog|patolog", haystack):
        primary = "lab"
    elif re.search(r"radiolog|billeddiagnost|nuklearmedicin|mr klinik|ct scanning", haystack):
        primary = "imaging"
    elif re.search(r"hospital|sygehus|skadestue|akutmodtag", haystack):
        primary = "hospital"
    elif re.search(r"almen praksis|praktiserende laege|laegepraksis|sundhedscenter|laegehus", haystack):
        primary = "general_practitioner"
    elif re.search(r"kardiolog|lungemedicin|psykiatr|ortopaed|gastro|neurolog|gynaekolog|oftalmolog|speciallaege|speciale", haystack):
        primary = "specialist"
    tags = [primary, "healthcare_facility", "denmark_sor"] if primary != "healthcare_facility" else ["healthcare_facility", "denmark_sor"]
    for item in speciality_values:
        slug = normalized(item).replace(" ", "_")
        if slug:
            tags.append(f"speciality:{slug}")
    return primary, list(dict.fromkeys(tags))


def pg_array(values):
    escaped = []
    for value in values:
        value = str(value).replace("\\", "\\\\").replace('"', '\\"')
        escaped.append(f'"{value}"')
    return "{" + ",".join(escaped) + "}"


def sniff_reader(raw_text):
    sample = raw_text[:100000]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=";,\t|")
        delimiter = dialect.delimiter
    except csv.Error:
        delimiter = ";"
    return csv.DictReader(io.StringIO(raw_text), delimiter=delimiter)


def download_csv():
    response = requests.get(
        SOURCE_URL,
        headers={"User-Agent": USER_AGENT, "Accept": "text/csv,application/octet-stream,*/*"},
        timeout=240,
    )
    response.raise_for_status()
    if len(response.content) < 1_000_000:
        raise RuntimeError("Denmark SOR daily CSV was unexpectedly small")
    for encoding in ("utf-8-sig", "utf-8", "cp1252"):
        try:
            return response.content.decode(encoding)
        except UnicodeDecodeError:
            pass
    raise RuntimeError("Denmark SOR daily CSV encoding could not be decoded")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    reader = sniff_reader(download_csv())
    fieldnames = reader.fieldnames or []
    required = {"SorId", "SorType", "EntityName", "EntityTypeName"}
    if not required.issubset(fieldnames):
        raise RuntimeError(f"Denmark SOR schema missing required fields: {sorted(required - set(fieldnames))}")

    rows = {}
    scanned = 0
    health_institutions = 0
    no_coordinates = 0
    sor_type_counts = {}
    raw_coordinate_samples = []
    for row in reader:
        scanned += 1
        if not active_now(row):
            continue

        sor_type = text(row.get("SorType")).upper()
        sor_type_counts[sor_type] = sor_type_counts.get(sor_type, 0) + 1
        if len(raw_coordinate_samples) < 12:
            sample = {
                key: text(row.get(key))
                for key in (
                    "VisitingAddressCoordETRS89z32EMeasure",
                    "VisitingAddressCoordETRS89z32NMeasure",
                    "ActivityAddressCoordETRS89z32EMeasure",
                    "ActivityAddressCoordETRS89z32NMeasure",
                    "PostalAddressCoordETRS89z32EMeasure",
                    "PostalAddressCoordETRS89z32NMeasure",
                )
                if text(row.get(key))
            }
            if sample:
                sample["SorType"] = sor_type
                sample["SorId"] = text(row.get("SorId"))
                sample["HealthInstitutionSorId"] = text(row.get("HealthInstitutionSorId"))
                raw_coordinate_samples.append(sample)
        if sor_type in {"SI", "HI"}:
            sor_id = text(row.get("SorId"))
            name = text(row.get("EntityName")) or text(row.get("HealthInstitutionEntityName"))
            entity_type = text(row.get("EntityTypeName"))
            institution_type = text(row.get("HealthInstitutionEntityTypeName")) or entity_type
        elif sor_type in {"OE", "IE"}:
            # SOR2 frequently carries the usable inherited address/coordinates
            # on organizational and production-unit rows, while the SI row is
            # only the institution identity. Resolve those child rows back to
            # their parent Health Institution and keep one map record per SI.
            sor_id = text(row.get("HealthInstitutionSorId"))
            name = text(row.get("HealthInstitutionEntityName"))
            entity_type = text(row.get("HealthInstitutionEntityTypeName"))
            institution_type = entity_type
        else:
            continue

        if not sor_id or not name:
            continue
        health_institutions += 1
        coords = dk_coordinates(row)
        if not coords:
            no_coordinates += 1
            continue
        lat, lng = coords
        line1, city, postal, formatted = address_parts(row)
        spec = specialties(row)
        primary, tags = classify(name, entity_type, institution_type, spec)
        phone = text(row.get("VirtualAddressTelephoneNumber"))
        website = text(row.get("VirtualAddressWebsite"))
        email = text(row.get("VirtualAddressEmailAddress"))
        source_id = f"dk-sor:{sor_id}"
        master_key = "loc:" + hash_text(json.dumps({
            "name": normalized(name),
            "address": formatted.lower(),
            "country": "DK",
            "lat": round(lat, 6),
            "lng": round(lng, 6),
        }, sort_keys=True, ensure_ascii=False))
        rows[source_id] = [
            source_id, SOURCE_PAGE, name, normalized(name), line1, formatted, city,
            text(row.get("EanLocationCodeRegionName")), postal, "DK", lat, lng, phone,
            website, email, primary, pg_array(tags), 0.995, master_key,
        ]

    output = sorted(rows.values(), key=lambda row: (str(row[2]).lower(), str(row[0])))
    if len(output) < 1000:
        coordinate_fields = [name for name in fieldnames if "Coord" in name or "Address" in name or "HealthInstitution" in name]
        raise RuntimeError(
            f"Only {len(output)} map-renderable Denmark SOR health institutions; "
            f"SorType counts={sor_type_counts}; raw coordinate samples={raw_coordinate_samples}; "
            f"candidate fields={coordinate_fields[:120]}"
        )
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    with open(args.output, "w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t", quoting=csv.QUOTE_ALL, lineterminator="\n")
        writer.writerow(COLUMNS)
        writer.writerows(output)
    print(json.dumps({
        "source": "dk_sor_healthcare",
        "scanned": scanned,
        "activeHealthInstitutions": health_institutions,
        "mapRows": len(output),
        "withoutNativeCoordinates": no_coordinates,
        "outputPath": args.output,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()

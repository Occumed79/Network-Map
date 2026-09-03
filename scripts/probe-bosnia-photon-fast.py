#!/usr/bin/env python3

import importlib.util
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

SCRIPT = Path(__file__).with_name("sync-bosnia-domestic-healthcare.py")
spec = importlib.util.spec_from_file_location("bosnia_sync", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

records = module.OrderedDict()
rs_url, rs_count = module.scrape_rs(records)
source_counts = {
    "fzo_rs": rs_count,
    "fzo_brcko": module.scrape_brcko(records),
    "zzo_hnz": module.scrape_hnz(records),
    "zzo_usk": module.scrape_usk(records),
    "zzo_bpk": module.scrape_bpk(records),
}
if len(records) < 90:
    raise SystemExit(f"Only {len(records)} official Bosnia facilities parsed")

official = list(records.values())


def fast_exact(record):
    for query in module.geocode_queries(record)[:2]:
        geo = module.photon_geocode(record, query)
        if geo:
            return geo
    return None

matched = {}
with ThreadPoolExecutor(max_workers=12) as executor:
    futures = {executor.submit(fast_exact, record): index for index, record in enumerate(official)}
    for future in as_completed(futures):
        index = futures[future]
        try:
            geo = future.result()
        except Exception:
            geo = None
        if geo:
            matched[index] = geo

by_authority = {}
for index in matched:
    authority = official[index]["authority"]
    by_authority[authority] = by_authority.get(authority, 0) + 1

summary = {
    "official_sources": source_counts,
    "parsed_unique": len(official),
    "photon_exact_first_two_queries": len(matched),
    "matches_by_authority": by_authority,
    "production_has_additional_photon_queries": True,
    "production_has_rate_limited_nominatim_fallback": True,
    "minimum_map_gate": 55,
    "rs_workbook": rs_url,
}
print(json.dumps(summary, ensure_ascii=False))

if len(matched) < 55:
    raise SystemExit(
        f"Only {len(matched)} Bosnia facilities matched in the fast exact Photon pass; "
        "full production fallback remains required"
    )

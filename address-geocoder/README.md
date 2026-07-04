# Occu-Med Global Address Geocoder

A Render-ready Streamlit app for uploading Excel/CSV address lists, selecting a country context, and geocoding through a shared Neon Postgres cache.

## What it does

- Upload `.xlsx`, `.xlsm`, `.xls`, or `.csv`
- Select columns that make up the address
- Select a country context for better geocoding
- Check shared Neon cache before any external lookup
- Use OpenStreetMap/Nominatim only on cache miss
- Save results into a shared `geocode_cache` table
- Download the completed Excel/CSV file
- Show cache hits, cache misses, processed rows, and errors

## Render settings

Use this folder as the Render root directory:

```text
address-geocoder
```

Build command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
streamlit run main.py --server.address=0.0.0.0 --server.port=$PORT --server.headless=true
```

## Required environment variables

```text
DATABASE_URL=your Neon pooled connection string
GEOCODER_USER_AGENT=OccuMedAddressGeocoder/1.0 your-email@example.com
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org/search
APP_ACCESS_PASSWORD=your-password
```

Optional:

```text
GEOCODER_ANALYST=analyst name or email
NOMINATIM_DELAY_SECONDS=1.1
```

## Shared Neon cache

The app automatically creates or upgrades this table on startup:

```sql
geocode_cache
```

The table stores:

- `address_hash`
- `raw_address`
- `normalized_address`
- `country_name`
- `country_code`
- `latitude`
- `longitude`
- `geocode_status`
- `geocode_source`
- `geocode_confidence`
- `display_name`
- `provider_response_json`
- `usage_count`
- `first_seen_at`
- `last_used_at`
- `created_by`
- manual override fields for future correction workflow

## Why this is fast

Every analyst uses the same Neon cache. If one analyst geocodes a clinic once, the next analyst gets an instant cache hit for the same normalized address and country context.

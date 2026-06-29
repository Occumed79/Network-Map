# Map Inventory Data Source

## Current production source

The live Network Map database already stores uploaded provider data in:

```text
public.medical_providers
```

`/api/map-inventory` should query this existing table directly. It should not require Neon edits, compatibility views, or a separate `providers` / `provider_locations` schema just to read the uploaded BlueHive/provider data.

## Why this changed

After PR #44, `/api/map-inventory` was querying newer normalized tables:

```text
public.providers
public.provider_locations
```

The connected Neon project already had provider data, but under the existing production table name:

```text
public.medical_providers
```

That mismatch caused the route to miss the real data even though the frontend/static map data and DB upload path already existed.

## Expected table

The route now reads from `public.medical_providers` and maps the existing columns into the API response shape expected by the frontend.

Important columns used by the route:

| Column | API usage |
|---|---|
| `id` | Provider id |
| `place_id` | Source id fallback |
| `name` | Provider name |
| `formatted_address` | Address |
| `lat` | Latitude |
| `lng` | Longitude |
| `category` | Provider/service category |
| `phone` | Phone |
| `website` | Website |
| `locality` | City |
| `administrative_area_level_1` | State |
| `postal_code` | Postal code |
| `data_source` | Source label |
| `source_id` | Source id |
| `source_type` | Source type fallback |
| `confidence_score` | Trust-tier approximation |

## Route behavior

`GET /api/map-inventory` queries `public.medical_providers` by viewport bounds:

```text
north
south
east
west
```

Optional filters:

```text
serviceType
trustTier
limit
```

The API returns the same top-level response shape:

```json
{
  "providers": [],
  "total": 0
}
```

When matching rows exist, each provider is normalized from `medical_providers` into the frontend provider shape.

## Do not edit Neon for this issue

The correct fix is in the repo route wiring, not a database mutation. Neon already contains the uploaded provider records in `medical_providers`.

# Provider Inventory Tables

## Problem

After deploying the Search Coordinator / API Governor (PR #44), Render reported
500 errors on `GET /api/map-inventory`:

```
relation "provider_locations" does not exist
```

This means the connected Neon database has not been initialized with the
provider inventory tables defined in the Drizzle schema.

## Expected tables

All provider inventory tables are defined in `lib/db/src/schema/providers.ts`:

| Table | Purpose |
|-------|---------|
| `providers` | Core provider records (one row per unique provider entity) |
| `provider_locations` | Provider addresses with lat/lng coordinates |
| `provider_contacts` | Phone, fax, website, email per provider |
| `provider_services` | Service types / taxonomies per provider |
| `provider_sources` | Tracks which external sources contributed data |
| `provider_evidence` | Specific evidence snippets about a provider's services |
| `geocode_cache` | Cached geocode results to avoid re-geocoding |

## Current behavior

`/api/map-inventory` now **fails open** when these tables are missing. Instead
of returning HTTP 500, it returns HTTP 200 with empty results:

```json
{
  "providers": [],
  "locations": [],
  "items": [],
  "total": 0,
  "warning": "provider inventory tables are not initialized"
}
```

This allows the frontend map to load without crashing while the database is
being initialized.

## How to initialize tables in Neon

### Prerequisites

- `DATABASE_URL` environment variable set to your Neon connection string
- `drizzle-kit` installed (included in `@workspace/db` devDependencies)

### Safe initialization (non-destructive)

```bash
cd lib/db
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require" pnpm push
```

This runs `drizzle-kit push`, which reads `drizzle.config.ts` and creates all
tables defined in the schema. It will not drop existing tables or data.

### Verifying

After running the push, verify the tables exist:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'provider_%';
```

Once tables exist, `/api/map-inventory` will query them normally and return
real provider data instead of the empty fallback.

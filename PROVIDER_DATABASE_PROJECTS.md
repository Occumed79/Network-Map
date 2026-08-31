# Provider database projects

The Network Map keeps one provider architecture and can store provider groups in several independent Neon projects. These are not different map layers or different data formats. Every project contains the same canonical provider pipeline:

`provider_raw_records` → `provider_stage_records` → `provider_master` → `provider_master_sources` / `provider_master_types` → `medical_providers`

The API reads the configured projects and returns ordinary provider records as one inventory.

## Connection ownership

- `DATABASE_URL_POOLED` or `DATABASE_URL`: primary application provider project. Existing BlueHive, dentist, My Clinics, NACCHO, diagnostics, and current provider data remain here.
- `OVERPASS_DATABASE_URL` and `OVERPASS_DATABASE_URL_2`: two Overture Maps provider shards. Runtime queries both as part of the normal provider inventory.
- `HEALTHSITES_DATABASE_URL`, then `HEALTHSITES_DATABASE_URL_2` through `_8`: eight Healthsites provider database projects with the identical schema. They store assigned Healthsites country groups.
- `USA_EMBASSY_DATABASE_URL`, then `USA_EMBASSY_DATABASE_URL_2` through `_4`: four U.S. Embassy provider database projects with the identical schema. They store assigned embassy country groups.
- `DATABASE_URL_2`: scoring/health-indicator database. It is not a provider project and must not be repurposed.
- `PGPOOL_PROVIDER_PROJECT_MAX`: optional per-project pool cap for additional provider projects; default `2`.

The same source-specific names must be configured in GitHub Actions and in the Render API service. Do not put database URLs in repository variables or source files.

## Initial setup

1. Create the required independent Neon projects.
2. Add each direct PostgreSQL connection string as a GitHub Actions repository secret using the exact source-family variable name.
3. Initialize the provider schema in each project before loading records.
4. Add the same connection strings to the Render API service environment.
5. Run the source-specific import workflow.

## Runtime behavior

- With no source-specific database variables, runtime behavior is unchanged.
- Indexed-provider pages use stable cross-project pagination and add the project totals together.
- Provider category layers and Provider Explorer searches query every configured provider project unless a layer is intentionally restricted to one source family.
- The two Overture shards are queried as `overpass-project-1` and `overpass-project-2` and are returned through the same provider API contract as the primary project.
- My Clinics and other primary-owned write workflows continue to use the primary project only.
- If one additional project is temporarily unavailable, the API returns available providers with a partial-result warning. It does not replace the sidebar with an empty temporary-failure state.
- Additional-project health details are diagnostic only; a transient failure in one does not make the primary API readiness check fail.

## Healthsites all-country import

The Healthsites import workflow downloads the existing `healthsites-data/source/World.zip` source archive from R2. R2 is only the source archive; the running map does not read provider records from it.

The workflow reads both Healthsites node and way shapefiles, normalizes usable facilities, balances countries across the selected Neon projects, promotes them through the canonical pipeline, and verifies the combined result. It publishes `provider-project-allocation.json` as an artifact containing the exact country assignments and row counts.

## Capacity changes

Country allocation for Healthsites is generated from the current archive's real record counts, not a hard-coded list. If the number of Healthsites Neon projects changes, rerun that source's allocation/import workflow with the new project count.

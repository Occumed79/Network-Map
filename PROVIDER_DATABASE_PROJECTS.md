# Provider database projects

The Network Map keeps one provider architecture and can store country groups in several independent Neon projects. These are not different map layers or different data formats. Every project contains the same canonical provider pipeline:

`provider_raw_records` → `provider_stage_records` → `provider_master` → `provider_master_sources` / `provider_master_types` → `medical_providers`

The API reads the configured projects and returns ordinary provider records as one inventory.

## Connection ownership

- `DATABASE_URL_POOLED` or `DATABASE_URL`: primary application provider project. Existing BlueHive, dentist, My Clinics, NACCHO, diagnostics, and current provider data remain here.
- `HEALTHSITES_DATABASE_URL`, then `HEALTHSITES_DATABASE_URL_2` through `_8`: eight Healthsites provider database projects with the identical schema. They store assigned Healthsites country groups.
- `USA_EMBASSY_DATABASE_URL`, then `USA_EMBASSY_DATABASE_URL_2` through `_4`: four U.S. Embassy provider database projects with the identical schema. They store assigned embassy country groups.
- `DATABASE_URL_2`: scoring/health-indicator database. It is not a provider project and must not be repurposed.
- `PGPOOL_PROVIDER_PROJECT_MAX`: optional per-project pool cap for additional provider projects; default `2`.

The same source-specific names must be configured in GitHub Actions and in the Render API service. Do not put database URLs in repository variables or source files.

## Initial setup

1. Create the required independent Neon projects.
2. Add each direct PostgreSQL connection string as a GitHub Actions repository secret using the exact `HEALTHSITES_DATABASE_URL...` or `USA_EMBASSY_DATABASE_URL...` name.
3. Run **Initialize a source provider Neon project** once for each new project, choosing its source family and number. The workflow refuses to modify a target containing any public tables. It copies the exact schema from the primary provider database and verifies every canonical relation.
4. Add the same connection strings to the Render API service environment.
5. Run **Import all Healthsites countries into provider Neon projects** and select the number of initialized projects.

## All-country import

The import workflow downloads the existing `healthsites-data/source/World.zip` source archive from R2. R2 is only the source archive; the running map does not read provider records from it.

The workflow:

1. reads both Healthsites node and way shapefiles;
2. normalizes every usable facility into the existing staging contract;
3. counts records by country and balances whole countries across the selected Neon projects;
4. assigns records without a country code deterministically so none are lost;
5. loads each project's `source5_import_staging` table;
6. runs the existing transactional `promote-healthsites-world.sql` pipeline in every project; and
7. verifies the promoted `medical_providers` count in every project and the combined all-country total.

The workflow publishes `provider-project-allocation.json` as an artifact. It records the exact countries and row counts assigned to each project.

## Runtime behavior

- With no source-specific database variables, runtime behavior is unchanged.
- Indexed-provider pages use stable cross-project pagination and add the project totals together.
- Provider Explorer record searches and radius inventory searches query every configured provider project.
- My Clinics and other primary-owned write workflows continue to use the primary project only.
- If one additional project is temporarily unavailable, the API returns available providers with a partial-result warning. It does not replace the sidebar with an empty temporary-failure state.
- Additional-project health details are diagnostic only; a transient failure in one does not make the primary API readiness check fail.

## Capacity changes

Country allocation is generated from the current archive's real record counts, not a hard-coded list. If the number of Neon projects changes, rerun the all-country workflow with the new project count. Each project transactionally replaces only its Healthsites source, while all non-Healthsites provider sources remain untouched.

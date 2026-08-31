import type { getPool } from "@workspace/db";

export type ProviderSchema = "canonical" | "normalized" | "legacy" | "none";

export async function detectProviderSchema(pool: ReturnType<typeof getPool>): Promise<ProviderSchema> {
  const { rows } = await pool.query(`
    SELECT
      to_regclass('public.provider_master_map_view') IS NOT NULL AS canonical_view,
      to_regclass('public.provider_schema_state') IS NOT NULL AS canonical_state,
      to_regclass('public.providers') IS NOT NULL
        AND to_regclass('public.provider_locations') IS NOT NULL
        AND to_regclass('public.provider_contacts') IS NOT NULL
        AND to_regclass('public.provider_services') IS NOT NULL
        AND to_regclass('public.provider_sources') IS NOT NULL AS normalized,
      to_regclass('public.medical_providers') IS NOT NULL AS legacy
  `);
  if (rows[0]?.canonical_view && rows[0]?.canonical_state) {
    const state = await pool.query(`
      SELECT canonical_read_enabled
      FROM public.provider_schema_state
      WHERE id = 1
    `);
    if (state.rows[0]?.canonical_read_enabled === true) return "canonical";
  }

  // Source-specific provider projects can be initialized directly into the
  // canonical pipeline without the primary database's migration-state table.
  // Only treat that shape as canonical when the canonical view actually has
  // data and the legacy table is absent or empty. This preserves the stricter
  // provider_schema_state gate for the primary database while preventing a
  // populated Overture/Healthsites/Embassy shard from falling through to an
  // empty legacy medical_providers table.
  if (rows[0]?.canonical_view && !rows[0]?.canonical_state) {
    const canonical = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM public.provider_master_map_view LIMIT 1) AS canonical_has_rows
    `);
    let legacyHasRows = false;
    if (rows[0]?.legacy) {
      const legacy = await pool.query(`
        SELECT EXISTS (SELECT 1 FROM public.medical_providers LIMIT 1) AS legacy_has_rows
      `);
      legacyHasRows = legacy.rows[0]?.legacy_has_rows === true;
    }
    if (canonical.rows[0]?.canonical_has_rows === true && !legacyHasRows) {
      return "canonical";
    }
  }

  if (rows[0]?.normalized) return "normalized";
  if (rows[0]?.legacy) return "legacy";
  return "none";
}

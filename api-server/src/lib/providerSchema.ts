import type { getPool } from "@workspace/db";

export type ProviderSchema = "normalized" | "legacy" | "none";

export async function detectProviderSchema(pool: ReturnType<typeof getPool>): Promise<ProviderSchema> {
  const { rows } = await pool.query(`
    SELECT
      to_regclass('public.providers') IS NOT NULL
        AND to_regclass('public.provider_locations') IS NOT NULL
        AND to_regclass('public.provider_contacts') IS NOT NULL
        AND to_regclass('public.provider_services') IS NOT NULL
        AND to_regclass('public.provider_sources') IS NOT NULL AS normalized,
      to_regclass('public.medical_providers') IS NOT NULL AS legacy
  `);
  if (rows[0]?.normalized) return "normalized";
  if (rows[0]?.legacy) return "legacy";
  return "none";
}

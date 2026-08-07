import { Router, type IRouter } from "express";
import { checkRequiredDatabases } from "@workspace/db";
import { diagnosticsFingerprint, diagnosticsSnapshot } from "../lib/observability";
import { getExternalSourceHealth } from "../providerSources/externalSourceRuntime";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { getPool } from "@workspace/db";

const router: IRouter = Router();

async function schemaVersions(): Promise<string[]> {
  if (!isPersistenceConfigured()) return [];
  try {
    const result = await getPool().query("SELECT version FROM public.schema_migration_versions ORDER BY applied_at DESC LIMIT 50");
    return result.rows.map((row) => String(row.version));
  } catch {
    return [];
  }
}

router.get("/diagnostics/export", async (_req, res) => {
  const readiness = await checkRequiredDatabases(2500);
  const snapshot = diagnosticsSnapshot({
    readiness: {
      ok: readiness.ok,
      dependencies: readiness.checks.map((check) => ({ name: check.label, ok: check.ok, durationMs: check.durationMs })),
    },
    schemaVersions: await schemaVersions(),
    externalSources: getExternalSourceHealth(),
  });
  res.setHeader("Cache-Control", "no-store");
  res.json({ ...snapshot, fingerprint: diagnosticsFingerprint(snapshot) });
});

export default router;

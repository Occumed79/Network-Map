import { Router, type IRouter } from "express";
import { checkRequiredDatabases, getPool } from "@workspace/db";
import { diagnosticsFingerprint, diagnosticsSnapshot } from "../lib/observability";
import { getExternalSourceHealth } from "../providerSources/externalSourceRuntime";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";

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
  const baseSnapshot = diagnosticsSnapshot({
    readiness: {
      ok: readiness.ok,
      dependencies: readiness.checks.map((check) => ({ name: check.label, ok: check.ok, durationMs: check.durationMs })),
    },
    schemaVersions: await schemaVersions(),
    externalSources: getExternalSourceHealth(),
  });

  // recentUploads is already capped by diagnosticsSnapshot. Export only a
  // compact aggregate in addition to those bounded events so support can see
  // import health without querying or dumping provider/upload tables.
  const recentUploadSummary = baseSnapshot.recentUploads.reduce((summary, upload) => {
    summary.eventCount += 1;
    summary.byStatus[upload.status] = (summary.byStatus[upload.status] || 0) + 1;
    summary.accepted += Number(upload.accepted || 0);
    summary.quarantined += Number(upload.quarantined || 0);
    summary.rejected += Number(upload.rejected || 0);
    summary.duplicate += Number(upload.duplicate || 0);
    return summary;
  }, {
    eventCount: 0,
    accepted: 0,
    quarantined: 0,
    rejected: 0,
    duplicate: 0,
    byStatus: {} as Record<string, number>,
  });

  const snapshot = { ...baseSnapshot, recentUploadSummary };
  res.setHeader("Cache-Control", "no-store");
  res.json({ ...snapshot, fingerprint: diagnosticsFingerprint(snapshot) });
});

export default router;

import { Router, type IRouter } from "express";
import { checkRequiredDatabases, getPool } from "@workspace/db";
import { diagnosticsFingerprint, diagnosticsSnapshot } from "../lib/observability";
import { getExternalSourceHealth } from "../providerSources/externalSourceRuntime";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";

const router: IRouter = Router();

type UploadSummary = {
  runs: number;
  accepted: number;
  quarantined: number;
  rejected: number;
  duplicate: number;
};

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
  const recentUploads = Array.isArray(snapshot.recentUploads) ? snapshot.recentUploads as Array<Record<string, unknown>> : [];
  const recentUploadSummary = recentUploads.reduce<UploadSummary>((summary, upload) => {
    summary.runs += 1;
    summary.accepted += Number(upload.accepted || 0);
    summary.quarantined += Number(upload.quarantined || 0);
    summary.rejected += Number(upload.rejected || 0);
    summary.duplicate += Number(upload.duplicate || 0);
    return summary;
  }, { runs: 0, accepted: 0, quarantined: 0, rejected: 0, duplicate: 0 });

  res.setHeader("Cache-Control", "no-store");
  res.json({ ...snapshot, recentUploadSummary, fingerprint: diagnosticsFingerprint(snapshot) });
});

export default router;

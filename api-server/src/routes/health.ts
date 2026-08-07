import { Router, type IRouter } from "express";
import { checkRequiredDatabases, getDatabaseConfigurationSummary, getPoolDiagnostics } from "@workspace/db";

const router: IRouter = Router();

router.get("/live", (_req, res) => {
  res.status(200).json({ ok: true });
});

router.get("/ready", async (_req, res) => {
  const readiness = await checkRequiredDatabases(2500);
  res.status(readiness.ok ? 200 : 503).json({
    ok: readiness.ok,
    dependencies: readiness.checks.map((check) => ({ name: check.label, ok: check.ok, durationMs: check.durationMs })),
  });
});

router.get("/healthz", async (_req, res) => {
  const readiness = await checkRequiredDatabases(2500);
  res.status(readiness.ok ? 200 : 503).json({ status: readiness.ok ? "ok" : "not_ready" });
});

router.get("/admin/database-health", async (_req, res) => {
  const readiness = await checkRequiredDatabases(2500);
  res.status(readiness.ok ? 200 : 503).json({
    ok: readiness.ok,
    dependencies: readiness.checks,
    configuration: getDatabaseConfigurationSummary(),
    pools: getPoolDiagnostics(),
  });
});

export default router;

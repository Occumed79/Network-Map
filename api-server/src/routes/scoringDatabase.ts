import { Router, type IRouter } from "express";
import { getScoringPool } from "@workspace/db";

const router: IRouter = Router();

router.get("/scoring/status", async (_req, res) => {
  if (!process.env.DATABASE_URL_2?.trim()) {
    res.status(503).json({
      ok: false,
      configured: false,
      error: "DATABASE_URL_2 is not configured",
    });
    return;
  }

  try {
    const pool = getScoringPool();
    const counts = await pool.query(`
      SELECT
        (SELECT count(*)::int FROM public.international_health_indicators) AS indicators,
        (SELECT count(*)::int FROM public.international_health_inequality_observations) AS inequality_observations,
        (SELECT count(*)::int FROM public.international_access_scores) AS access_scores
    `);
    const migration = await pool.query(`
      SELECT migration_key, status, details, started_at, completed_at, updated_at
      FROM public.scoring_migration_log
      ORDER BY updated_at DESC
      LIMIT 1
    `).catch(() => ({ rows: [] }));

    res.status(200).json({
      ok: true,
      configured: true,
      databaseRole: "scoring",
      counts: counts.rows[0],
      migration: migration.rows[0] ?? null,
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      configured: true,
      databaseRole: "scoring",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

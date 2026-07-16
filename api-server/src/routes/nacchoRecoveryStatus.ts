import { Router, type IRouter } from "express";
import { getPool } from "@workspace/db";

const router: IRouter = Router();

router.get("/naccho-lhd/recovery-status", async (_req, res) => {
  try {
    const pool = getPool();
    const counts = await pool.query(`
      SELECT
        count(*)::int AS total_rows,
        count(DISTINCT NULLIF(raw_data->>'source_row','')::int)::int AS distinct_source_rows,
        min(NULLIF(raw_data->>'source_row','')::int)::int AS min_source_row,
        max(NULLIF(raw_data->>'source_row','')::int)::int AS max_source_row,
        count(*) FILTER (WHERE lat IS NOT NULL AND lng IS NOT NULL)::int AS verified_rows,
        count(*) FILTER (WHERE raw_data->>'geocode_status'='pending_strict_geocoder')::int AS pending_rows,
        count(*) FILTER (WHERE raw_data->>'geocode_status'='geocoding')::int AS geocoding_rows,
        count(*) FILTER (WHERE raw_data->>'geocode_status'='retry_pending')::int AS retry_rows,
        count(*) FILTER (WHERE raw_data->>'geocode_status'='rejected_no_exact_match')::int AS rejected_rows,
        count(*) FILTER (WHERE raw_data->>'geocode_status'='invalid_source_address')::int AS invalid_rows,
        count(*) FILTER (WHERE raw_data->>'geocode_status'='geocode_error')::int AS error_rows
      FROM public.naccho_lhd
      WHERE raw_data->>'source_file'='County Health Departments.xlsx'
    `);
    const importLog = await pool.query(`
      SELECT import_key,status,source_rows,database_rows,details,started_at,completed_at,updated_at
      FROM public.naccho_import_log
      ORDER BY updated_at DESC LIMIT 1
    `).catch(() => ({ rows: [] }));
    const geocodeJob = await pool.query(`
      SELECT job_key,status,total_rows,verified_rows,rejected_rows,invalid_rows,error_rows,pending_rows,
             details,started_at,completed_at,updated_at
      FROM public.naccho_geocode_job
      ORDER BY updated_at DESC LIMIT 1
    `).catch(() => ({ rows: [] }));

    res.status(200).json({
      ok: true,
      sourceExpectedRows: 3410,
      mapDisplayRule: "lat_and_lng_required",
      exactGeocodingPolicy: "google_rooftop_exact_state_zip_street_number_no_centroids_no_interpolation",
      counts: counts.rows[0],
      import: importLog.rows[0] ?? null,
      geocoding: geocodeJob.rows[0] ?? null,
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

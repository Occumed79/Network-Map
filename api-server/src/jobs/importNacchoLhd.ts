import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getPool } from "@workspace/db";
import { logger } from "../lib/logger";

type SourceRow = {
  lhd_id: string;
  name: string;
  agency_type?: string;
  address: string;
  city?: string | null;
  state_name?: string;
  state_code: string;
  postal_code?: string | null;
  phone?: string | null;
  website?: string | null;
  source_url?: string | null;
  source_row?: number;
  raw_data?: Record<string, unknown> | null;
};

const EXPECTED_ROWS = 3410;
const IMPORT_KEY = "county-health-departments-xlsx-v1";
let started = false;

function sourcePath(): string | null {
  const candidates = [
    resolve(process.cwd(), "api-server/data/county-health-departments.jsonl"),
    resolve(process.cwd(), "data/county-health-departments.jsonl"),
    resolve(process.cwd(), "../api-server/data/county-health-departments.jsonl"),
  ];
  return candidates.find(existsSync) ?? null;
}

function sourceRowNumber(row: SourceRow): number {
  const value = Number(row.source_row ?? row.raw_data?.source_row);
  if (!Number.isInteger(value)) throw new Error(`Missing source_row for ${row.name}`);
  return value;
}

function stateName(row: SourceRow): string | null {
  const value = row.state_name ?? row.raw_data?.state_name;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function ensureLogTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS public.naccho_import_log (
      import_key text PRIMARY KEY,
      status text NOT NULL,
      source_rows integer NOT NULL DEFAULT 0,
      database_rows integer NOT NULL DEFAULT 0,
      details jsonb NOT NULL DEFAULT '{}'::jsonb,
      started_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function run(): Promise<void> {
  const path = sourcePath();
  if (!path) throw new Error("api-server/data/county-health-departments.jsonl is missing");

  const rows = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as SourceRow);

  const sourceRows = rows.map(sourceRowNumber);
  if (rows.length !== EXPECTED_ROWS) {
    throw new Error(`Expected ${EXPECTED_ROWS} source records, found ${rows.length}`);
  }
  if (new Set(rows.map((row) => row.lhd_id)).size !== EXPECTED_ROWS) {
    throw new Error("The workbook source contains duplicate lhd_id values");
  }
  if (new Set(sourceRows).size !== EXPECTED_ROWS || Math.min(...sourceRows) !== 2 || Math.max(...sourceRows) !== 3411) {
    throw new Error("The workbook source-row sequence is incomplete; expected every row from 2 through 3411");
  }

  await ensureLogTable();
  const pool = getPool();
  const client = await pool.connect();

  try {
    const lock = await client.query(
      "SELECT pg_try_advisory_lock(hashtext($1)) AS acquired",
      [IMPORT_KEY],
    );
    if (!lock.rows[0]?.acquired) return;

    await client.query(
      `INSERT INTO public.naccho_import_log
         (import_key,status,source_rows,database_rows,details,started_at,completed_at,updated_at)
       VALUES ($1,'running',$2,0,'{}'::jsonb,now(),NULL,now())
       ON CONFLICT (import_key) DO UPDATE SET
         status='running',source_rows=$2,details='{}'::jsonb,
         started_at=now(),completed_at=NULL,updated_at=now()`,
      [IMPORT_KEY, EXPECTED_ROWS],
    );

    await client.query("BEGIN");
    for (let offset = 0; offset < rows.length; offset += 100) {
      const batch = rows.slice(offset, offset + 100);
      const values: unknown[] = [];
      const tuples = batch.map((row, index) => {
        const n = index * 12;
        const srcRow = sourceRowNumber(row);
        const state = stateName(row);
        values.push(
          row.lhd_id,
          row.name,
          row.agency_type ?? "Local Health Department",
          row.address,
          row.city ?? null,
          row.state_code,
          row.postal_code ?? null,
          row.phone ?? null,
          row.website ?? null,
          row.source_url ?? row.website ?? null,
          srcRow,
          state,
        );
        return `($${n + 1},$${n + 2},$${n + 3},$${n + 4},$${n + 5},$${n + 6},$${n + 7},$${n + 8},$${n + 9},$${n + 10},jsonb_build_object('source_file','County Health Departments.xlsx','source_row',$${n + 11}::int,'state_name',$${n + 12},'original_address',$${n + 4},'geocode_policy','google_rooftop_exact_state_zip_street_number_no_centroids_no_interpolation'))`;
      });

      await client.query(
        `INSERT INTO public.naccho_lhd
           (lhd_id,name,agency_type,address,city,state_code,postal_code,phone,website,source_url,raw_data)
         VALUES ${tuples.join(",")}
         ON CONFLICT (lhd_id) DO UPDATE SET
           name=EXCLUDED.name,
           agency_type=EXCLUDED.agency_type,
           address=CASE WHEN public.naccho_lhd.lat IS NULL THEN EXCLUDED.address ELSE public.naccho_lhd.address END,
           city=CASE WHEN public.naccho_lhd.lat IS NULL THEN EXCLUDED.city ELSE public.naccho_lhd.city END,
           state_code=EXCLUDED.state_code,
           postal_code=EXCLUDED.postal_code,
           phone=EXCLUDED.phone,
           website=EXCLUDED.website,
           source_url=EXCLUDED.source_url,
           raw_data=COALESCE(public.naccho_lhd.raw_data,'{}'::jsonb) || EXCLUDED.raw_data ||
             CASE WHEN public.naccho_lhd.lat IS NULL OR public.naccho_lhd.lng IS NULL
               THEN jsonb_build_object('geocode_status','pending_strict_geocoder')
               ELSE '{}'::jsonb END,
           updated_at=now()`,
        values,
      );
    }

    await client.query(`
      UPDATE public.naccho_lhd
      SET raw_data = COALESCE(raw_data,'{}'::jsonb) || jsonb_build_object('geocode_status','pending_strict_geocoder'),
          updated_at = now()
      WHERE raw_data->>'source_file'='County Health Departments.xlsx'
        AND (lat IS NULL OR lng IS NULL)
        AND COALESCE(raw_data->>'geocode_status','') NOT IN ('duplicate_suppressed')
    `);

    const verification = await client.query(`
      SELECT count(*)::int AS database_rows,
             count(DISTINCT (raw_data->>'source_row')::int)::int AS distinct_source_rows,
             min((raw_data->>'source_row')::int)::int AS min_source_row,
             max((raw_data->>'source_row')::int)::int AS max_source_row
      FROM public.naccho_lhd
      WHERE raw_data->>'source_file'='County Health Departments.xlsx'
    `);
    const check = verification.rows[0];
    if (
      Number(check?.database_rows) !== EXPECTED_ROWS ||
      Number(check?.distinct_source_rows) !== EXPECTED_ROWS ||
      Number(check?.min_source_row) !== 2 ||
      Number(check?.max_source_row) !== 3411
    ) {
      throw new Error(`Database reconciliation failed: ${JSON.stringify(check)}`);
    }

    await client.query("COMMIT");
    await client.query(
      `UPDATE public.naccho_import_log
       SET status='complete',database_rows=$2,
           details=jsonb_build_object('min_source_row',2,'max_source_row',3411,'distinct_source_rows',$2),
           completed_at=now(),updated_at=now()
       WHERE import_key=$1`,
      [IMPORT_KEY, EXPECTED_ROWS],
    );
    logger.info({ rows: EXPECTED_ROWS }, "County health department workbook import completed");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    await ensureLogTable().catch(() => undefined);
    await pool.query(
      `INSERT INTO public.naccho_import_log(import_key,status,source_rows,database_rows,details,updated_at)
       VALUES ($1,'failed',$2,0,jsonb_build_object('error',$3),now())
       ON CONFLICT(import_key) DO UPDATE SET status='failed',details=jsonb_build_object('error',$3),updated_at=now()`,
      [IMPORT_KEY, EXPECTED_ROWS, error instanceof Error ? error.message : String(error)],
    ).catch(() => undefined);
    throw error;
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext($1))", [IMPORT_KEY]).catch(() => undefined);
    client.release();
  }
}

export function startNacchoLhdImport(): void {
  if (started || process.env.NACCHO_SOURCE_IMPORT === "false") return;
  started = true;
  setTimeout(() => {
    void run().catch((error) => logger.error({ error }, "County health department import failed"));
  }, 1_000).unref();
}

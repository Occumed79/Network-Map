import { getPool, getScoringPool } from "@workspace/db";
import { logger } from "../lib/logger";

const MIGRATION_KEY = "scoring-database-split-v1";
const BATCH_SIZE = 250;

type TableConfig = {
  name: string;
  columns: readonly string[];
};

const TABLES: readonly TableConfig[] = [
  {
    name: "international_health_indicators",
    columns: [
      "id",
      "indicator_code",
      "indicator_name",
      "country_code",
      "country_name",
      "admin1_code",
      "admin1_name",
      "geography_level",
      "year",
      "value",
      "unit",
      "source_name",
      "source_url",
      "source_updated_at",
      "metadata",
      "created_at",
      "updated_at",
    ],
  },
  {
    name: "international_health_inequality_observations",
    columns: [
      "id",
      "dataset_id",
      "indicator_code",
      "indicator_name",
      "country_code",
      "country_name",
      "admin1_code",
      "admin1_name",
      "geography_level",
      "year",
      "dimension_key",
      "dimensions",
      "subgroup_label",
      "value",
      "unit",
      "measure_type",
      "lower_bound",
      "upper_bound",
      "source_name",
      "source_url",
      "source_updated_at",
      "metadata",
      "created_at",
      "updated_at",
    ],
  },
  {
    name: "international_access_scores",
    columns: [
      "id",
      "country_code",
      "country_name",
      "admin1_code",
      "admin1_name",
      "service_type",
      "score",
      "confidence",
      "workforce_component",
      "capacity_component",
      "coverage_component",
      "geographic_component",
      "local_access_component",
      "component_details",
      "source_years",
      "source_names",
      "missing_indicators",
      "geography_level",
      "algorithm_version",
      "calculated_at",
      "updated_at",
    ],
  },
] as const;

let started = false;

function identifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function tableIdentifier(table: TableConfig): string {
  return `public.${identifier(table.name)}`;
}

async function ensureMigrationLog(): Promise<void> {
  await getScoringPool().query(`
    CREATE TABLE IF NOT EXISTS public.scoring_migration_log (
      migration_key text PRIMARY KEY,
      status text NOT NULL,
      details jsonb NOT NULL DEFAULT '{}'::jsonb,
      started_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function fingerprint(
  pool: ReturnType<typeof getPool>,
  table: TableConfig,
): Promise<{ rowCount: number; checksum: string }> {
  const relation = tableIdentifier(table);
  const result = await pool.query(`
    SELECT
      count(*)::int AS row_count,
      md5(COALESCE(string_agg(md5(row_to_json(t)::text), '' ORDER BY id::text), '')) AS checksum
    FROM ${relation} t
  `);
  return {
    rowCount: Number(result.rows[0]?.row_count ?? 0),
    checksum: String(result.rows[0]?.checksum ?? ""),
  };
}

async function copyTable(table: TableConfig): Promise<void> {
  const source = getPool();
  const target = getScoringPool();
  const relation = tableIdentifier(table);
  const quotedColumns = table.columns.map(identifier).join(", ");
  const sourceFingerprint = await fingerprint(source, table);

  logger.info(
    { table: table.name, sourceRows: sourceFingerprint.rowCount },
    "Starting scoring table transfer",
  );

  for (let offset = 0; offset < sourceFingerprint.rowCount; offset += BATCH_SIZE) {
    const selected = await source.query(
      `SELECT ${quotedColumns} FROM ${relation} ORDER BY id LIMIT $1 OFFSET $2`,
      [BATCH_SIZE, offset],
    );
    if (selected.rows.length === 0) break;

    const values: unknown[] = [];
    const tuples = selected.rows.map((row, rowIndex) => {
      const base = rowIndex * table.columns.length;
      for (const column of table.columns) values.push(row[column]);
      const placeholders = table.columns.map((_, columnIndex) => `$${base + columnIndex + 1}`);
      return `(${placeholders.join(", ")})`;
    });

    const updates = table.columns
      .filter((column) => column !== "id")
      .map((column) => `${identifier(column)} = EXCLUDED.${identifier(column)}`)
      .join(", ");

    await target.query(
      `INSERT INTO ${relation} (${quotedColumns}) VALUES ${tuples.join(", ")}
       ON CONFLICT (id) DO UPDATE SET ${updates}`,
      values,
    );
  }

  const targetFingerprint = await fingerprint(target, table);
  if (
    sourceFingerprint.rowCount !== targetFingerprint.rowCount ||
    sourceFingerprint.checksum !== targetFingerprint.checksum
  ) {
    throw new Error(
      `Scoring transfer verification failed for ${table.name}: ` +
        `source=${sourceFingerprint.rowCount}/${sourceFingerprint.checksum}, ` +
        `target=${targetFingerprint.rowCount}/${targetFingerprint.checksum}`,
    );
  }

  logger.info(
    {
      table: table.name,
      rows: targetFingerprint.rowCount,
      checksum: targetFingerprint.checksum,
    },
    "Verified scoring table transfer",
  );
}

async function runMigration(): Promise<void> {
  if (!process.env.DATABASE_URL_2?.trim()) {
    logger.warn("DATABASE_URL_2 is not configured; scoring database transfer was not started");
    return;
  }

  await ensureMigrationLog();
  const target = getScoringPool();
  const lockClient = await target.connect();

  try {
    const lockResult = await lockClient.query(
      "SELECT pg_try_advisory_lock(hashtext($1)) AS acquired",
      [MIGRATION_KEY],
    );
    if (!lockResult.rows[0]?.acquired) {
      logger.info("Another instance is already running the scoring database transfer");
      return;
    }

    await target.query(
      `INSERT INTO public.scoring_migration_log
         (migration_key, status, details, started_at, completed_at, updated_at)
       VALUES ($1, 'running', '{}'::jsonb, now(), NULL, now())
       ON CONFLICT (migration_key) DO UPDATE SET
         status = 'running', started_at = now(), completed_at = NULL, updated_at = now()`,
      [MIGRATION_KEY],
    );

    const details: Record<string, { rows: number; checksum: string }> = {};
    for (const table of TABLES) {
      await copyTable(table);
      details[table.name] = await fingerprint(target, table);
    }

    await target.query(
      `UPDATE public.scoring_migration_log
       SET status = 'complete', details = $2::jsonb, completed_at = now(), updated_at = now()
       WHERE migration_key = $1`,
      [MIGRATION_KEY, JSON.stringify(details)],
    );

    logger.info({ details }, "Scoring database transfer completed and verified");
  } catch (error) {
    await target
      .query(
        `UPDATE public.scoring_migration_log
         SET status = 'failed', details = jsonb_build_object('error', $2), updated_at = now()
         WHERE migration_key = $1`,
        [MIGRATION_KEY, error instanceof Error ? error.message : String(error)],
      )
      .catch(() => undefined);
    throw error;
  } finally {
    await lockClient
      .query("SELECT pg_advisory_unlock(hashtext($1))", [MIGRATION_KEY])
      .catch(() => undefined);
    lockClient.release();
  }
}

export function startScoringDatabaseMigration(): void {
  if (started || process.env.SCORING_DATABASE_MIGRATION === "false") return;
  started = true;
  setTimeout(() => {
    void runMigration().catch((error) => {
      logger.error({ error }, "Scoring database transfer failed");
    });
  }, 2_000).unref();
}

import { getPool, getScoringPool } from "@workspace/db";
import { logger } from "../lib/logger";

const MIGRATION_KEY = "scoring-database-split-v3";
const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 3;

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

async function rowCount(
  pool: ReturnType<typeof getPool>,
  table: TableConfig,
): Promise<number> {
  const result = await pool.query(
    `SELECT count(*)::int AS row_count FROM ${tableIdentifier(table)}`,
  );
  return Number(result.rows[0]?.row_count ?? 0);
}

async function updateProgress(details: Record<string, unknown>): Promise<void> {
  await getScoringPool().query(
    `UPDATE public.scoring_migration_log
     SET details = $2::jsonb, updated_at = now()
     WHERE migration_key = $1`,
    [MIGRATION_KEY, JSON.stringify(details)],
  );
}

async function copyTable(table: TableConfig): Promise<{ rows: number }> {
  const source = getPool();
  const target = getScoringPool();
  const relation = tableIdentifier(table);
  const quotedColumns = table.columns.map(identifier).join(", ");
  const expectedRows = await rowCount(source, table);
  let copiedRows = 0;
  let lastId: string | null = null;

  logger.info(
    { table: table.name, expectedRows },
    "Starting scoring table transfer",
  );

  while (true) {
    const selected: { rows: Array<Record<string, unknown>> } = await source.query(
      `SELECT ${quotedColumns}
       FROM ${relation}
       WHERE ($1::uuid IS NULL OR id > $1::uuid)
       ORDER BY id
       LIMIT $2`,
      [lastId, BATCH_SIZE],
    );
    if (selected.rows.length === 0) break;

    const values: unknown[] = [];
    const tuples = selected.rows.map((row: Record<string, unknown>, rowIndex: number) => {
      const base = rowIndex * table.columns.length;
      for (const column of table.columns) values.push(row[column]);
      return `(${table.columns
        .map((_, columnIndex) => `$${base + columnIndex + 1}`)
        .join(", ")})`;
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

    copiedRows += selected.rows.length;
    lastId = String(selected.rows.at(-1)?.id ?? "") || null;
    await updateProgress({
      phase: "copying",
      table: table.name,
      copiedRows,
      expectedRows,
      lastId,
    });
  }

  const targetRows = await rowCount(target, table);
  if (targetRows !== expectedRows || copiedRows !== expectedRows) {
    throw new Error(
      `Scoring transfer count verification failed for ${table.name}: ` +
        `source=${expectedRows}, copied=${copiedRows}, target=${targetRows}`,
    );
  }

  logger.info(
    { table: table.name, rows: targetRows },
    "Verified scoring table transfer",
  );
  return { rows: targetRows };
}

async function runMigration(attempt: number): Promise<void> {
  if (!process.env.DATABASE_URL_2?.trim()) {
    logger.warn("DATABASE_URL_2 is not configured; scoring database transfer was not started");
    return;
  }

  await ensureMigrationLog();
  const target = getScoringPool();

  await target.query(
    `INSERT INTO public.scoring_migration_log
       (migration_key, status, details, started_at, completed_at, updated_at)
     VALUES ($1, 'running', $2::jsonb, now(), NULL, now())
     ON CONFLICT (migration_key) DO UPDATE SET
       status = 'running', details = $2::jsonb, started_at = now(),
       completed_at = NULL, updated_at = now()`,
    [MIGRATION_KEY, JSON.stringify({ phase: "starting", attempt })],
  );

  try {
    const details: Record<string, { rows: number }> = {};
    for (const table of TABLES) {
      details[table.name] = await copyTable(table);
    }

    await target.query(
      `UPDATE public.scoring_migration_log
       SET status = 'complete', details = $2::jsonb,
           completed_at = now(), updated_at = now()
       WHERE migration_key = $1`,
      [MIGRATION_KEY, JSON.stringify(details)],
    );

    logger.info({ details }, "Scoring database transfer completed and verified");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await target
      .query(
        `UPDATE public.scoring_migration_log
         SET status = 'failed',
             details = jsonb_build_object('attempt', $2, 'error', $3),
             updated_at = now()
         WHERE migration_key = $1`,
        [MIGRATION_KEY, attempt, message],
      )
      .catch(() => undefined);
    throw error;
  }
}

function runAttempt(attempt: number): void {
  void runMigration(attempt).catch((error) => {
    logger.error({ error, attempt }, "Scoring database transfer failed");
    if (attempt < MAX_ATTEMPTS) {
      setTimeout(() => runAttempt(attempt + 1), 30_000).unref();
    }
  });
}

export function startScoringDatabaseMigration(): void {
  if (started || process.env.SCORING_DATABASE_MIGRATION === "false") return;
  started = true;
  setTimeout(() => runAttempt(1), 2_000).unref();
}

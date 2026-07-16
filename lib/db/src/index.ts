import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let scoringPool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

function positiveInteger(value: string | undefined, fallback: number, min = 1, max = 100): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL_POOLED or DATABASE_URL must be set. Did you forget to configure Neon?",
    );
  }
  return url;
}

function getScoringDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_2;
  if (!url) {
    throw new Error(
      "DATABASE_URL_2 must be set for the separate scoring database.",
    );
  }
  return url;
}

function createPool(connectionString: string, applicationName: string, max: number): pg.Pool {
  const created = new Pool({
    connectionString,
    max,
    min: 0,
    connectionTimeoutMillis: positiveInteger(
      process.env.PGPOOL_CONNECTION_TIMEOUT_MS,
      8_000,
      1_000,
      60_000,
    ),
    idleTimeoutMillis: positiveInteger(
      process.env.PGPOOL_IDLE_TIMEOUT_MS,
      30_000,
      1_000,
      300_000,
    ),
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    allowExitOnIdle: false,
    application_name: applicationName,
  });

  created.on("error", (error) => {
    console.error(`[database:${applicationName}] Unexpected idle PostgreSQL client error`, error);
  });

  return created;
}

export function getPool(): pg.Pool {
  if (!pool) {
    pool = createPool(
      getDatabaseUrl(),
      process.env.PGAPPNAME || "network-map-api",
      positiveInteger(process.env.PGPOOL_MAX, 4, 1, 20),
    );
  }
  return pool;
}

export function getScoringPool(): pg.Pool {
  if (!scoringPool) {
    scoringPool = createPool(
      getScoringDatabaseUrl(),
      process.env.PGAPPNAME_SCORING || "network-map-scoring",
      positiveInteger(process.env.PGPOOL_SCORING_MAX, 2, 1, 10),
    );
  }
  return scoringPool;
}

export function getDb() {
  if (!db) {
    db = drizzle(getPool(), { schema });
  }
  return db;
}

export type { PoolClient } from "pg";
export * from "./schema";

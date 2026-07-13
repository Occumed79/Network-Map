import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let pool: pg.Pool | null = null;
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

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      max: positiveInteger(process.env.PGPOOL_MAX, 4, 1, 20),
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
      application_name: process.env.PGAPPNAME || "network-map-api",
    });

    pool.on("error", (error) => {
      console.error("[database] Unexpected idle PostgreSQL client error", error);
    });
  }
  return pool;
}

export function getDb() {
  if (!db) {
    db = drizzle(getPool(), { schema });
  }
  return db;
}

export type { PoolClient } from "pg";
export * from "./schema";

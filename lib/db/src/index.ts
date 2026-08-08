import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let scoringPool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;
let closingPromise: Promise<void> | null = null;

function positiveInteger(value: string | undefined, fallback: number, min = 1, max = 100): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

/**
 * DATABASE_URL_POOLED: preferred pooled/provider-map connection string.
 * DATABASE_URL: provider-map fallback/direct connection string.
 * DATABASE_URL_2: separate scoring/health-indicator database.
 */
export function getDatabaseConfigurationSummary() {
  return {
    providerMap: process.env.DATABASE_URL_POOLED ? "DATABASE_URL_POOLED" : process.env.DATABASE_URL ? "DATABASE_URL" : "missing",
    scoring: process.env.DATABASE_URL_2 ? "DATABASE_URL_2" : "missing",
    providerPoolMax: positiveInteger(process.env.PGPOOL_MAX, 4, 1, 20),
    scoringPoolMax: positiveInteger(process.env.PGPOOL_SCORING_MAX, 2, 1, 10),
  } as const;
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("Provider-map database is not configured.");
  return url;
}

function getScoringDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_2;
  if (!url) throw new Error("Scoring database is not configured.");
  return url;
}

function createPool(connectionString: string, applicationName: string, max: number): pg.Pool {
  const created = new Pool({
    connectionString,
    max,
    min: 0,
    connectionTimeoutMillis: positiveInteger(process.env.PGPOOL_CONNECTION_TIMEOUT_MS, 8_000, 1_000, 60_000),
    idleTimeoutMillis: positiveInteger(process.env.PGPOOL_IDLE_TIMEOUT_MS, 30_000, 1_000, 300_000),
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    allowExitOnIdle: false,
    application_name: applicationName,
  });
  created.on("error", (error) => console.error(`[database:${applicationName}] Unexpected idle PostgreSQL client error`, error));
  return created;
}

export function getPool(): pg.Pool {
  if (!pool) pool = createPool(getDatabaseUrl(), process.env.PGAPPNAME || "network-map-api", positiveInteger(process.env.PGPOOL_MAX, 4, 1, 20));
  return pool;
}

export function getScoringPool(): pg.Pool {
  if (!scoringPool) scoringPool = createPool(getScoringDatabaseUrl(), process.env.PGAPPNAME_SCORING || "network-map-scoring", positiveInteger(process.env.PGPOOL_SCORING_MAX, 2, 1, 10));
  return scoringPool;
}

export function getDb() {
  if (!db) db = drizzle(getPool(), { schema });
  return db;
}

async function boundedPing(target: pg.Pool, label: string, timeoutMs: number): Promise<{ ok: boolean; label: string; durationMs: number; error?: string }> {
  const startedAt = Date.now();
  const client = await target.connect();
  try {
    await client.query(`SET statement_timeout TO ${Math.max(500, Math.min(timeoutMs, 5000))}`);
    await client.query("SELECT 1 AS ok");
    return { ok: true, label, durationMs: Date.now() - startedAt };
  } catch (error) {
    return { ok: false, label, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) };
  } finally {
    client.release();
  }
}

export async function checkRequiredDatabases(timeoutMs = 3000) {
  const configured = getDatabaseConfigurationSummary();
  const checks = await Promise.all([
    configured.providerMap === "missing"
      ? Promise.resolve({ ok: false, label: "provider-map", durationMs: 0, error: "not configured" })
      : boundedPing(getPool(), "provider-map", timeoutMs),
    configured.scoring === "missing"
      ? Promise.resolve({ ok: false, label: "scoring", durationMs: 0, error: "not configured" })
      : boundedPing(getScoringPool(), "scoring", timeoutMs),
  ]);
  return { ok: checks.every((check) => check.ok), checks, configured };
}

export function getPoolDiagnostics() {
  const describe = (target: pg.Pool | null) => target ? {
    total: target.totalCount,
    idle: target.idleCount,
    waiting: target.waitingCount,
  } : { total: 0, idle: 0, waiting: 0 };
  return { providerMap: describe(pool), scoring: describe(scoringPool) };
}

export async function closeDatabasePools(): Promise<void> {
  if (closingPromise) return closingPromise;
  closingPromise = (async () => {
    const targets = [pool, scoringPool].filter((target): target is pg.Pool => Boolean(target));
    pool = null;
    scoringPool = null;
    db = null;
    await Promise.allSettled(targets.map((target) => target.end()));
  })().finally(() => { closingPromise = null; });
  return closingPromise;
}

export type { PoolClient } from "pg";
export * from "./schema";

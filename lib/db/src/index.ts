import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let scoringPool: pg.Pool | null = null;
const providerProjectPools = new Map<string, pg.Pool>();
let db: ReturnType<typeof drizzle> | null = null;
let closingPromise: Promise<void> | null = null;

const PROVIDER_DATABASE_FAMILIES = [
  { family: "overpass", prefix: "OVERPASS_DATABASE_URL", maximum: 2 },
  { family: "healthsites", prefix: "HEALTHSITES_DATABASE_URL", maximum: 8 },
  { family: "usa-embassy", prefix: "USA_EMBASSY_DATABASE_URL", maximum: 4 },
] as const;

export type ProviderDatabaseProject = {
  slot: number;
  id: string;
  environmentVariable: string;
  family: "primary" | "overpass" | "healthsites" | "usa-embassy";
  primary: boolean;
  pool: pg.Pool;
};

function numberedEnvironmentVariable(prefix: string, slot: number): string {
  return slot === 1 ? prefix : `${prefix}_${slot}`;
}

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
  const additionalProviderProjects = PROVIDER_DATABASE_FAMILIES.flatMap(({ prefix, maximum }) =>
    Array.from({ length: maximum }, (_, index) => numberedEnvironmentVariable(prefix, index + 1))
      .filter((name) => Boolean(process.env[name])),
  );
  return {
    providerMap: process.env.DATABASE_URL_POOLED ? "DATABASE_URL_POOLED" : process.env.DATABASE_URL ? "DATABASE_URL" : "missing",
    providerProjects: [
      ...(process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL ? ["primary"] : []),
      ...additionalProviderProjects,
    ],
    scoring: process.env.DATABASE_URL_2 ? "DATABASE_URL_2" : "missing",
    providerPoolMax: positiveInteger(process.env.PGPOOL_MAX, 4, 1, 20),
    additionalProviderPoolMax: positiveInteger(process.env.PGPOOL_PROVIDER_PROJECT_MAX, 2, 1, 10),
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

/**
 * Returns the provider-map Neon projects in a stable order. Every configured
 * project is expected to contain the same provider schema. Source-specific
 * projects only provide additional storage; they do not change the provider
 * model or API contract.
 *
 * DATABASE_URL(_POOLED) remains the primary application project.
 * OVERPASS_DATABASE_URL and OVERPASS_DATABASE_URL_2 are the two Overture Maps
 * provider shards. HEALTHSITES_DATABASE_URL through _8 and
 * USA_EMBASSY_DATABASE_URL through _4 add their respective provider database
 * projects. DATABASE_URL_2 remains reserved for scoring.
 */
export function getProviderDatabaseProjects(): ProviderDatabaseProject[] {
  const primaryUrl = getDatabaseUrl();
  const projects: ProviderDatabaseProject[] = [{
    slot: 1,
    id: "provider-project-1",
    environmentVariable: process.env.DATABASE_URL_POOLED ? "DATABASE_URL_POOLED" : "DATABASE_URL",
    family: "primary",
    primary: true,
    pool: getPool(),
  }];
  const seenUrls = new Set([primaryUrl]);

  for (const { family, prefix, maximum } of PROVIDER_DATABASE_FAMILIES) {
    for (let slot = 1; slot <= maximum; slot += 1) {
      const environmentVariable = numberedEnvironmentVariable(prefix, slot);
      const connectionString = process.env[environmentVariable];
      if (!connectionString || seenUrls.has(connectionString)) continue;
      seenUrls.add(connectionString);
      const id = `${family}-project-${slot}`;
      let projectPool = providerProjectPools.get(id);
      if (!projectPool) {
        projectPool = createPool(
          connectionString,
          `${process.env.PGAPPNAME || "network-map-api"}-${family}-${slot}`,
          positiveInteger(process.env.PGPOOL_PROVIDER_PROJECT_MAX, 2, 1, 10),
        );
        providerProjectPools.set(id, projectPool);
      }
      projects.push({
        slot,
        id,
        environmentVariable,
        family,
        primary: false,
        pool: projectPool,
      });
    }
  }

  return projects;
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
  let client: pg.PoolClient | null = null;
  try {
    client = await target.connect();
    await client.query(`SET statement_timeout TO ${Math.max(500, Math.min(timeoutMs, 5000))}`);
    await client.query("SELECT 1 AS ok");
    return { ok: true, label, durationMs: Date.now() - startedAt };
  } catch (error) {
    return { ok: false, label, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) };
  } finally {
    client?.release();
  }
}

export async function checkRequiredDatabases(timeoutMs = 3000) {
  const configured = getDatabaseConfigurationSummary();
  const requiredChecks = await Promise.all([
    configured.providerMap === "missing"
      ? Promise.resolve({ ok: false, label: "provider-map", durationMs: 0, error: "not configured" })
      : boundedPing(getPool(), "provider-map", timeoutMs),
    configured.scoring === "missing"
      ? Promise.resolve({ ok: false, label: "scoring", durationMs: 0, error: "not configured" })
      : boundedPing(getScoringPool(), "scoring", timeoutMs),
  ]);
  const providerProjectChecks = configured.providerMap === "missing"
    ? []
    : await Promise.all(
        getProviderDatabaseProjects()
          .filter((project) => !project.primary)
          .map((project) => boundedPing(project.pool, project.id, timeoutMs)),
      );
  return {
    // An unavailable additional provider project must not make the primary API
    // unhealthy. Query responses expose those failures as partial warnings.
    ok: requiredChecks.every((check) => check.ok),
    checks: [...requiredChecks, ...providerProjectChecks],
    configured,
  };
}

export function getPoolDiagnostics() {
  const describe = (target: pg.Pool | null) => target ? {
    total: target.totalCount,
    idle: target.idleCount,
    waiting: target.waitingCount,
  } : { total: 0, idle: 0, waiting: 0 };
  return {
    providerMap: describe(pool),
    providerProjects: [...providerProjectPools.entries()].map(([project, target]) => ({
      project,
      ...describe(target),
    })),
    scoring: describe(scoringPool),
  };
}

export async function closeDatabasePools(): Promise<void> {
  if (closingPromise) return closingPromise;
  closingPromise = (async () => {
    const targets = [pool, scoringPool, ...providerProjectPools.values()].filter((target): target is pg.Pool => Boolean(target));
    pool = null;
    scoringPool = null;
    providerProjectPools.clear();
    db = null;
    await Promise.allSettled(targets.map((target) => target.end()));
  })().finally(() => { closingPromise = null; });
  return closingPromise;
}

export type { PoolClient } from "pg";
export * from "./schema";

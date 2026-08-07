import type { getPool } from "@workspace/db";
import { logger } from "./logger";
import { recordTiming } from "./observability";

const SLOW_QUERY_MS = Math.max(250, Number(process.env.SLOW_QUERY_MS) || 750);

export async function queryWithStatementTimeout(
  pool: ReturnType<typeof getPool>,
  query: string,
  params: unknown[],
  timeoutMs = 8_000,
) {
  const startedAt = Date.now();
  const client = await pool.connect();
  let ok = false;
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('statement_timeout', $1, true)", [`${timeoutMs}ms`]);
    const result = await client.query(query, params);
    await client.query("COMMIT");
    ok = true;
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    const durationMs = Date.now() - startedAt;
    // Never attach query text or parameter values to observability. The timing
    // record is sufficient for correlation without leaking provider/search data.
    recordTiming("database", "statement", durationMs, ok, {
      parameterCount: params.length,
      timeoutMs,
      slow: durationMs >= SLOW_QUERY_MS,
    });
    if (durationMs >= SLOW_QUERY_MS) {
      logger.warn({ durationMs, parameterCount: params.length, timeoutMs }, "slow query");
    }
    client.release();
  }
}

import type { getPool } from '@workspace/db';
import { logger } from './logger';
import { currentRequestId, recordError, recordTiming } from './observability';

function queryLabel(query: string): string {
  return query.replace(/\s+/g, ' ').trim().slice(0, 160) || 'database query';
}

export async function queryWithStatementTimeout(
  pool: ReturnType<typeof getPool>,
  query: string,
  params: unknown[],
  timeoutMs = 8_000,
) {
  const startedAt = Date.now();
  const label = queryLabel(query);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('statement_timeout', $1, true)", [`${timeoutMs}ms`]);
    const result = await client.query(query, params);
    await client.query('COMMIT');
    const durationMs = Date.now() - startedAt;
    recordTiming('database', label, durationMs, true, { rowCount: result.rowCount ?? null, timeoutMs });
    const slowQueryMs = Math.max(100, Number(process.env.SLOW_QUERY_MS) || 1_000);
    if (durationMs >= slowQueryMs) {
      logger.warn({ requestId: currentRequestId(), query: label, durationMs, rowCount: result.rowCount ?? null }, 'slow query');
    }
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    const durationMs = Date.now() - startedAt;
    recordTiming('database', label, durationMs, false, { timeoutMs });
    recordError(`database:${label}`, error, 'database_query_failed');
    throw error;
  } finally {
    client.release();
  }
}

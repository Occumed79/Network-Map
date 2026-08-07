import type { getPool } from '@workspace/db';
import { recordError, recordTiming } from './observability';

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
    recordTiming('database', label, Date.now() - startedAt, true, { rowCount: result.rowCount ?? null, timeoutMs });
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    recordTiming('database', label, Date.now() - startedAt, false, { timeoutMs });
    recordError(`database:${label}`, error, 'database_query_failed');
    throw error;
  } finally {
    client.release();
  }
}

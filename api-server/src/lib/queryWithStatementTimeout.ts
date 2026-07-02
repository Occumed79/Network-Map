import type { getPool } from '@workspace/db';

export async function queryWithStatementTimeout(
  pool: ReturnType<typeof getPool>,
  query: string,
  params: unknown[],
  timeoutMs = 8_000,
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('statement_timeout', $1, true)", [`${timeoutMs}ms`]);
    const result = await client.query(query, params);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

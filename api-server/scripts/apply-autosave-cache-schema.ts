import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStandalonePool } from "@workspace/db";

const here = path.dirname(fileURLToPath(import.meta.url));
const indexSql = await readFile(path.resolve(here, "../src/db/autosave/20261001_autosave_search_cache.sql"), "utf8");
const shardSql = await readFile(path.resolve(here, "../src/db/autosave/20261001_autosave_provider_shard.sql"), "utf8");

const targets = [
  { env: "AUTO_SAVE_DATABASE", sql: indexSql, app: "network-map-autosave-schema-index" },
  { env: "AUTO_SAVE_DATABASE_2", sql: shardSql, app: "network-map-autosave-schema-shard-a" },
  { env: "AUTO_SAVE_DATABASE_3", sql: shardSql, app: "network-map-autosave-schema-shard-b" },
] as const;

const missing = targets.filter(target => !process.env[target.env]?.trim()).map(target => target.env);
if (missing.length) throw new Error(`Missing autosave database environment variables: ${missing.join(", ")}`);

for (const target of targets) {
  const pool = createStandalonePool(process.env[target.env]!, target.app, 1);
  try {
    await pool.query(target.sql);
    const table = target.env === "AUTO_SAVE_DATABASE" ? "autosave_search_cache" : "autosave_providers";
    const check = await pool.query("SELECT to_regclass($1) AS table_name", [`public.${table}`]);
    if (!check.rows[0]?.table_name) throw new Error(`${target.env}: expected table ${table} was not created`);
    console.log(`${target.env}: ${table} ready`);
  } finally {
    await pool.end();
  }
}

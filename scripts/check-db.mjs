import pg from "pg";
import { describeDatabaseError, getFdeConfig, quoteIdentifier } from "./lib/fde-env.mjs";

const { Pool } = pg;
let pool;

try {
  const { connectionString, schema } = getFdeConfig();
  pool = new Pool({ connectionString, application_name: "virtual-gallery-check" });
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${quoteIdentifier(schema)}, public`);
    const result = await client.query(
      `
        SELECT
          current_database() AS database,
          current_schema() AS schema,
          now()::text AS server_time,
          (
            SELECT count(*)::int
            FROM information_schema.tables
            WHERE table_schema = $1
              AND table_type = 'BASE TABLE'
          ) AS table_count
      `,
      [schema]
    );

    console.log(JSON.stringify({ status: "ok", ...result.rows[0] }, null, 2));
  } finally {
    client.release();
  }
} catch (error) {
  console.error(JSON.stringify({ status: "error", error: describeDatabaseError(error) }, null, 2));
  process.exitCode = 1;
} finally {
  await pool?.end();
}

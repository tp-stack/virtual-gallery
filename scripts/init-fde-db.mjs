import fs from "fs";
import path from "path";
import pg from "pg";
import { describeDatabaseError, getFdeConfig, quoteIdentifier } from "./lib/fde-env.mjs";

const { Pool } = pg;
const migrationPath = path.join(process.cwd(), "database", "migrations", "001_virtual_gallery_schema.sql");
const sql = fs.readFileSync(migrationPath, "utf8");
let pool;

try {
  const { connectionString, schema } = getFdeConfig();
  pool = new Pool({ connectionString, application_name: "virtual-gallery-init" });
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${quoteIdentifier(schema)}, public`);
    await client.query(sql);
  } finally {
    client.release();
  }

  console.log(JSON.stringify({ status: "ok", schema, migration: path.relative(process.cwd(), migrationPath) }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ status: "error", error: describeDatabaseError(error) }, null, 2));
  process.exitCode = 1;
} finally {
  await pool?.end();
}

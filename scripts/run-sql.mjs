/**
 * Runs a .sql file against DATABASE_URL. Plain ESM using only `pg` (which
 * the standalone build already bundles) so it works inside the production
 * image with no extra tooling:
 *
 *   node scripts/run-sql.mjs db/schema.sql
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import pg from "pg";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/run-sql.mjs <path-to.sql>");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = readFileSync(resolve(process.cwd(), file), "utf8");
const needsSsl = /[?&]sslmode=require/.test(connectionString);
const client = new pg.Client({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  await client.query(sql);
  console.log(`applied ${file}`);
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  await client.end();
}

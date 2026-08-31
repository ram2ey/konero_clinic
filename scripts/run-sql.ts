/**
 * Runs a .sql file against DATABASE_URL. A dependency-free stand-in for
 * `psql -f` so the Docker image doesn't need the postgres client — it
 * just pipes the whole file to the server as one multi-statement query
 * (pg's simple-query protocol supports that).
 *
 *   tsx scripts/run-sql.ts db/schema.sql
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: tsx scripts/run-sql.ts <path-to.sql>");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const sql = readFileSync(resolve(process.cwd(), file), "utf8");
  const needsSsl = /[?&]sslmode=require/.test(connectionString);
  const client = new Client({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  try {
    await client.query(sql);
    console.log(`applied ${file}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import "server-only";

import { Pool, type PoolClient, type QueryResultRow } from "pg";

/**
 * The single Postgres connection pool for the app. Replaces Supabase's
 * PostgREST layer — every `.from(...)` / `.rpc(...)` call in the old code
 * is now a hand-written SQL string run through `query()` here.
 *
 * `DATABASE_URL` is provided by the hosting platform (Coolify injects it
 * for a linked Postgres resource). In development, export it yourself
 * before `npm run dev` / the Playwright suite.
 *
 * The pool is a module-level singleton. Next.js can re-evaluate a module
 * across hot reloads in dev, which would leak pools, so it's cached on
 * `globalThis`.
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. It must point at the app's PostgreSQL database.",
  );
}

// Coolify's Postgres link is in-cluster plaintext; a hosted PG that needs
// TLS can opt in with `?sslmode=require` in the URL, which pg honours.
const needsSsl = /[?&]sslmode=require/.test(connectionString);

declare global {
  var __clinicPgPool: Pool | undefined;
}

export const pool: Pool =
  global.__clinicPgPool ??
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  global.__clinicPgPool = pool;
}

/**
 * Run a parameterised query. Always pass user input as `params` ($1, $2,
 * …) — never interpolate it into `text`.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[]; rowCount: number }> {
  const res = await pool.query<T>(text, params as never[] | undefined);
  return { rows: res.rows, rowCount: res.rowCount ?? 0 };
}

/**
 * Run `fn` inside a single transaction. Commits on success, rolls back on
 * any thrown error (and re-throws it). Used where several writes must be
 * atomic — patient onboarding (users + profiles) and request approval.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore — the original error below is what matters
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Creates the single doctor_admin account. Run once, after the schema +
 * seed have been applied. Plain ESM using only `pg` + `@node-rs/argon2`
 * (both bundled by the standalone build):
 *
 *   node scripts/create-admin.mjs \
 *     --email you@clinic.com --password 'the-password' --name 'Dr Jane Doe'
 *
 * Or set ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME in the environment.
 *
 * The profiles_single_admin_idx partial-unique index enforces "only one
 * doctor_admin" — a second run fails at the INSERT.
 */
import { hash } from "@node-rs/argon2";
import pg from "pg";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const email = (arg("email") ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = arg("password") ?? process.env.ADMIN_PASSWORD ?? "";
const fullName = (arg("name") ?? process.env.ADMIN_NAME ?? "").trim();

if (!email || !password || !fullName) {
  console.error(
    "Provide --email, --password and --name (or ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME).",
  );
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const passwordHash = await hash(password);
const needsSsl = /[?&]sslmode=require/.test(connectionString);
const client = new pg.Client({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

await client.connect();
try {
  await client.query("BEGIN");
  const { rows } = await client.query(
    `insert into public.users (email, password_hash, must_change_password)
     values ($1, $2, false)
     returning id`,
    [email, passwordHash],
  );
  const userId = rows[0].id;
  await client.query(
    `insert into public.profiles (id, role, full_name)
     values ($1, 'doctor_admin', $2)`,
    [userId, fullName],
  );
  await client.query("COMMIT");
  console.log(`created doctor_admin ${email} (${userId})`);
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  if (err && err.code === "23505") {
    console.error(
      "An account with this email already exists, or a doctor_admin already exists.",
    );
  } else {
    console.error(err);
  }
  process.exit(1);
} finally {
  await client.end();
}

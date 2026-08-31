# Deploying Konero Clinic to Hetzner via Coolify

The app is a single Next.js container plus a PostgreSQL database. No
Supabase, no object store service — lab files live on a persistent disk
volume.

## 1. Server

Create a Hetzner Cloud server:

- **CX22** (2 vCPU / 4 GB RAM, ~€4.50/mo) or larger. Coolify itself wants
  ~1 GB; Next + Postgres fit comfortably in the rest.
- Image: **Ubuntu 24.04**.

Install Coolify:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Then open `http://<server-ip>:8000` and finish the setup wizard.

## 2. Database

Coolify → **+ New** → **Database** → **PostgreSQL 16**.

Deploy it, then copy its **internal** connection string from the resource
page — something like:

```
postgres://postgres:<password>@<service-name>:5432/postgres
```

## 3. Application

Coolify → **+ New** → **Application** → **Public/Private Git repository**.

- Repository: `https://github.com/kaycaresystems-cmd/dralexvicokorda`
- Branch: `main`
- **Build Pack: Dockerfile** (Coolify auto-detects the `Dockerfile` at the
  repo root).
- Port: `3000`.

### Environment variables

| Key | Value |
|---|---|
| `DATABASE_URL` | the internal Postgres URL from step 2 |
| `SESSION_COOKIE_SECRET` | `openssl rand -hex 32` — signs session-independent lab-file download tokens |
| `STORAGE_DIR` | `/data/lab-documents` |
| `NEXT_PUBLIC_SITE_URL` | the URL Coolify assigns the app (or your domain) |
| `NODE_ENV` | `production` |

### Persistent storage

On the application → **Storages** → add a **Volume Mount**:

- Destination path: `/data/lab-documents`

This is where uploaded lab-report PDFs are written. It survives redeploys.

### Deploy

Hit **Deploy**. Wait for the build + health check to go green.

## 4. One-time database setup

Open a shell into the running app container (Coolify → the app →
**Terminal**, or `docker exec -it <container> sh`):

```bash
# create the schema (tables, enums, triggers, record_consultation)
node scripts/run-sql.mjs db/schema.sql

# load the reference catalogues (ICD-11, medications, lab tests)
node scripts/run-sql.mjs db/seed.sql

# create the single doctor_admin account
ADMIN_EMAIL="doctor@konero.example" \
ADMIN_PASSWORD="choose-a-strong-password" \
ADMIN_NAME="Dr Jane Doe" \
node scripts/create-admin.mjs
```

`db/schema.sql` and `db/seed.sql` are idempotent — safe to re-run.
`create-admin.mjs` refuses a second admin (enforced by a partial-unique
index).

## 5. First login

Open the app URL over **HTTPS** (Coolify's proxy terminates TLS and issues
a Let's Encrypt cert automatically once DNS resolves; before you have a
domain it uses a `*.sslip.io` hostname that is still HTTPS).

> **Do not use a bare `http://<ip>:3000`** — session cookies are set with
> the `Secure` flag, so they won't stick over plain HTTP.

Sign in with the admin credentials from step 4.

## 6. Adding a domain later

Coolify → the app → **Domains** → add `clinic.yourdomain.com`, point an
A record at the server IP, and Coolify provisions the certificate. Update
`NEXT_PUBLIC_SITE_URL` to match and redeploy.

## Notes

- **No password-reset email.** A patient who is locked out is given a
  fresh temporary password by the admin from the patient's folder
  ("Reset Password"), then sets their own on next sign-in.
- **Backups.** Back up the Postgres resource (Coolify has scheduled
  backups for databases) and the `/data/lab-documents` volume.
- **Local development:** copy `.env.local.example` to `.env.local`, point
  `DATABASE_URL` at a local Postgres, run `npm run db:setup` and
  `npm run create-admin`, then `npm run dev`.

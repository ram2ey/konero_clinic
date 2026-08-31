# syntax=docker/dockerfile:1

# ---- deps: install node_modules (incl. dev deps, needed for the build) ----
FROM node:22-alpine AS deps
WORKDIR /app
# libc6-compat: some prebuilt native modules expect glibc symbols on musl.
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: compile the Next.js standalone output ----
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# `next build` needs devDependencies (typescript, tailwind, eslint). The
# hosting platform may inject NODE_ENV=production as a build arg, which
# would make npm skip them — force it back for this stage.
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Placeholder values only, so module top-level code (lib/db.ts,
# lib/storage.ts) doesn't throw during the build's data-collection pass.
# No DB connection is made at build time; real values are injected at
# runtime by the platform. Not secrets.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
ENV SESSION_COOKIE_SECRET=build-only-placeholder-0000000000000000000000
ENV STORAGE_DIR=/tmp/lab-documents
RUN npm run build

# ---- runner: minimal production image ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache libc6-compat \
 && addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Next.js standalone server. Its bundled node_modules already includes
# `pg` and `@node-rs/argon2` (both imported by server code), which the
# db:setup / create-admin .mjs scripts also use.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# public/ holds only a .gitkeep today, but Next expects the dir to exist.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# SQL + one-time setup scripts, run against the linked database via
#   docker exec <ctr> node scripts/run-sql.mjs db/schema.sql
#   docker exec <ctr> node scripts/run-sql.mjs db/seed.sql
#   docker exec -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... -e ADMIN_NAME=... <ctr> node scripts/create-admin.mjs
COPY --from=builder --chown=nextjs:nodejs /app/db ./db
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Storage volume mount point (declare a persistent volume here in Coolify).
RUN mkdir -p /data/lab-documents && chown nextjs:nodejs /data/lab-documents
ENV STORAGE_DIR=/data/lab-documents

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

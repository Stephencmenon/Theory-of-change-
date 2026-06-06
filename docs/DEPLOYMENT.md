# Deployment & Infrastructure Runbook

Companion to ADD §7.4, §12. Covers local dev and Railway production.

## Stack
Next.js 14 · PostgreSQL 15 · Prisma · NextAuth · Railway.

## Local development
1. Start Postgres 15 (Docker):
   ```bash
   docker run -d --name impact-pg \
     -e POSTGRES_USER=impact -e POSTGRES_PASSWORD=impact -e POSTGRES_DB=impact_dashboard \
     -p 5432:5432 postgres:15
   ```
2. `cp .env.example .env` and set values (the committed `.env.example` already points at the Docker DB above). Never commit `.env`.
3. `npm install`
4. `npx prisma migrate dev` — applies migrations and generates the client.
5. `npm run seed` — loads development data.
6. `npm run dev` — app at http://localhost:3000.

## Environment variables (set in Railway dashboard — never committed)
| Variable | Purpose | Source |
|---|---|---|
| `DATABASE_URL` | Prisma connection string | Railway injects from the Postgres plugin |
| `NEXTAUTH_SECRET` | Session cookie encryption key | Manual — `openssl rand -base64 32` |
| `NEXTAUTH_URL` | App public URL | Manual — the Railway-assigned domain |

## Railway provisioning (one-time, requires the Railway account)
> These steps run in the Railway dashboard and cannot be performed from the repo.
1. Create a new Railway project; connect the GitHub repo.
2. Add a **PostgreSQL 15** service. Railway auto-injects `DATABASE_URL` into the app service.
3. In the app service **Variables**, add `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`) and `NEXTAUTH_URL` (the app's public domain).
4. Build is driven by `railway.json`: build command `npx prisma migrate deploy && npm run build`; start command `npm run start`; healthcheck on `/login`.
5. Enable **daily automated backups** on the Postgres service before go-live (ADD §12.4).

## Continuous deploy
- Push to `main` → Railway detects the push → runs the build command → swaps the container on success, keeps the old one on failure (ADD §12.2).
- Migrations apply automatically via `prisma migrate deploy` (non-destructive; applies only pending migrations).

## Secrets policy
No secrets in source; no `.env` committed (`.gitignore` excludes `.env*`). Secrets are never logged (ADD §7.4).

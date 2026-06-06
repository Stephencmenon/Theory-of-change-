# Impact Dashboard — Implementation Plan
**v1.0 · June 2026 · Companion to PRD v5.0 and ADD v2.0**

| Field | Value |
|---|---|
| Status | Ready for build — derived from PRD v5.0 + ADD v2.0 |
| Stack | Next.js 14 (App Router) · PostgreSQL 15 · Prisma · NextAuth.js · `@react-pdf/renderer` · Railway |
| Sequencing | Strict — each phase gates the next on its acceptance criteria |
| Source of truth | PRD §9 (schema), ADD §3 (module structure), ADD §4 (domain logic) |

---

## 0. Pre-Build Gates

Resolve before Phase 1 begins. These block the build.

| Gate | Action | Owner |
|---|---|---|
| **OQ-1** | Collect the specific Theory of Change outcome metrics per program (name, unit, period, threshold). Feeds the metrics table and seed data. | ED |
| **OQ-2** | Confirm program count and whether metric frameworks are shared or per-program. Feeds seed data. | ED |
| **OQ-5** | Confirm whether any funder mandates a fixed report template. If yes, `FunderReport.tsx` becomes per-funder templated (affects Phase 4 scope). | Head of Fundraising |
| **OQ-3 / OQ-4** | Resolved — versioned targets (PRD §9) and stack (ADD ADR-001–007). No action. | — |

> If OQ-1/OQ-2 are not ready, the foundation work in Phase 0–1 can still proceed using placeholder seed data; only the final seed and acceptance demo need the real metrics.

---

## Phase 0 — Project Scaffold & Infrastructure

Not a PRD phase, but required before Phase 1. Establishes the skeleton so all later work drops into place.

### Tasks
1. **Initialize Next.js 14 app** (App Router, TypeScript, ESLint). Repo layout per ADD §3.
2. **Install dependencies:** `prisma`, `@prisma/client`, `next-auth`, `bcrypt`, `@react-pdf/renderer`, `zod` (input validation), Tailwind (UI).
3. **Create folder skeleton** exactly as ADD §3:
   - `app/` route groups: `(auth)`, `(ed)`, `(fundraising)`, `(staff)`, `(admin)`, `api/`
   - `lib/` with `auth.ts`, `prisma.ts`, `domain/`
   - `prisma/` with `schema.prisma`, `seed.ts`
   - `components/reports/`
   - `middleware.ts` at root
4. **Prisma client singleton** in `lib/prisma.ts` (avoid hot-reload connection leaks).
5. **Railway project setup:** app service + PostgreSQL 15 service. Set `DATABASE_URL`, `NEXTAUTH_SECRET` (`openssl rand -base64 32`), `NEXTAUTH_URL` in the Railway dashboard (ADD §7.4). No `.env` committed.
6. **CI/deploy:** GitHub → Railway auto-deploy; build command `npx prisma migrate deploy && npm run build` (ADD §12.2).

### Acceptance
- `npm run dev` serves an empty app at `localhost:3000`.
- Prisma connects to a local/Railway Postgres instance.
- A push to `main` triggers a successful Railway build.

---

## Phase 1 — Foundation & Admin

Database, auth, and the full admin configuration surface.

### 1A. Database schema (`prisma/schema.prisma`)
Implement all 9 tables from PRD §9 with the relationships in ADD §4.2:
- `programs`, `metrics`, `metric_targets`, `metric_entries`
- `funders`, `funder_programs`, `revenue_targets`, `revenue_entries`
- `users`

Schema rules:
- Enums: `role (ed|fundraising|staff|admin)`, `target_period (monthly|annual)`, `funder.status (active|prospect|lapsed)`, `category (grant|donation|other)`.
- `revenue_targets.funder_id` and `revenue_entries.funder_id` are **nullable** (general donations).
- `users.program_id` required only when `role = staff` (enforce at app layer; nullable column).
- `metric_targets` / `revenue_targets`: insert-only by convention (ADD §8.3) — no app code issues UPDATE/DELETE.
- Periods stored as first-day-of-month, midnight UTC.
- Run `prisma migrate dev` to generate the initial migration.

### 1B. Domain logic layer (`lib/domain/`) — build & unit-test first
These are pure functions (ADD §4.3 table). Build and test them before any UI consumes them.

| File | Function | Rule |
|---|---|---|
| `periods.ts` | `toPeriodDate(year, month)` | First day of month, midnight UTC |
| `targets.ts` | `lookupTarget(targets[], period, funderId?)` | Latest `effective_from ≤ period start`; **branch on null `funderId`** (IS NULL, not `= NULL`) |
| `metrics.ts` | `isOffTrack(actual, target, threshold)` | `actual < target × threshold` |
| `revenue.ts` | `revenueStatus(actual, target)` | ≥80% on-track · 60–79% at-risk · <60% off-track |
| `revenue.ts` | `orgRevenueStatus(entries[], targets[])` | Sum actuals vs. sum targets; same thresholds (ADR-006) |
| `deadlines.ts` | `deadlineWindow(dueDate, today)` | ≤30 red · 31–60 amber · 61–90 yellow · >90 null |

> **Critical test:** `lookupTarget` must be covered with a general-donation fixture (`funderId = null`) before Phase 3 — this is the binding-constraint bug surface (ADD "Binding Constraint" + §4.3).

### 1C. Authentication & authorization
- **NextAuth Credentials provider** (`lib/auth.ts`): bcrypt check against `password_hash`; `httpOnly` + `Secure` cookie, 30-day TTL (ADD §7.1).
- **Session shape** (ADD §6.3): `{ user: { id, role, programId } }` — extend NextAuth types.
- **`middleware.ts`** — single enforcement point (ADD §7.2). Implement the role-to-route table verbatim:
  - No session → `/login`
  - Wrong role → `/login`
  - Staff → always redirected to `/programs/[session.programId]/entry`
  - Staff hitting another program's `[id]` → redirect to own program
- **No Server Actions** for mutations (ADR-007) — all writes go through `app/api/` routes so middleware always runs.

### 1D. Admin screens (`/admin`, `/admin/[section]`)
Four sub-sections per PRD Flow D:
1. **Programs** — create/edit (name, description, is_active). Renaming preserves historical entries.
2. **Metrics** — add metric (name, unit, target_period, off_track_threshold) **+ initial `metric_targets` row in one `prisma.$transaction`** (ADD §5.4). UI must block saving a metric without a target value. Deleting a metric with entries is blocked → deactivate instead.
3. **Users** — create (email, password→bcrypt, role). Staff requires exactly one program. Role change requires explicit confirmation.
4. **Targets** — create new `metric_targets` row with `effective_from`. Never overwrite. Block backdating to a period that already has entries (app-layer check, ADD §12.5).

### Acceptance (PRD Phase 1)
- Admin creates a program with 3 metrics (with thresholds), sets initial targets via `metric_targets`, creates a staff user assigned to that program, creates a Head of Fundraising user, and logs in as each.
- Deleting a metric with entries is blocked.
- Updating a target inserts a new `metric_targets` row without overwriting the previous one.
- All domain unit tests pass, including the general-donation `lookupTarget` fixture.

---

## Phase 2 — Data Entry

Write paths for staff, fundraising revenue, and funder management.

### 2A. Staff entry form (`/programs/[id]/entry`)
- Staff land here directly; no other navigation (enforced by middleware).
- Enter metric values for the current period → POST to `/api/programs/[id]/entry`.
- Route validates fields (blank required field = field-level error). Creates `metric_entries` with `entered_by`, `entered_at`, `period`, `actual_value`.
- After submit, values shown read-only — staff **cannot edit** a submitted entry (PRD Flow E).

### 2B. Revenue entry (`/revenue`) — Head of Fundraising only
Two **separate** UI operations (PRD Flow C):
- **(a) Enter actual** → creates/updates a `revenue_entries` row (funder/category, period, actual_amount). Edits overwrite value and write `updated_by` / `updated_at`, preserving `entered_by` / `entered_at` (ADD §8.3).
- **(b) Set target** → inserts a new `revenue_targets` row with `effective_from`. Never overwrites.
- Block submitting an actual with no period (field-level error).

### 2C. Funder management (`/funders`, `/funders/[id]`)
- `/funders`: list with status, grant amount, deadlines flagged by window.
- `/funders/[id]`: edit details; link/unlink programs (`funder_programs`); view deadlines.
- Available to ED and Head of Fundraising.

### Acceptance (PRD Phase 2)
- Staff submits a monthly value → row in DB with correct `period`, `metric_id`, `entered_by`.
- Head of Fundraising enters a revenue actual and sets a target as two distinct operations; an edit logs `updated_by`/`updated_at`.
- A funder is created and linked to a program.

---

## Phase 3 — ED Dashboard

Read-only consolidation screen — the core daily artifact.

### 3A. `/dashboard` (ED only)
Server Component render flow (ADD §5.1):
1. `fetchProgramOutcomes()` — entries + applicable targets per metric.
2. `fetchRevenueData()` — all entries + targets across funder/category pairs.
3. `fetchFunderDeadlines()` — active funders + dates.

Apply domain logic to results:
- `isOffTrack()` per metric → red flag.
- `revenueStatus()` per funder/category → per-row badge.
- `orgRevenueStatus()` once → org-wide summary figure.
- `deadlineWindow()` per funder → red/amber/yellow.

### 3B. Display rules (PRD §11)
- Monthly metric: compare month actual to applicable target. Annual metric: compare YTD sum (Jan→selected month) to target.
- Missing data → "No data entered" (never zero, never blank).
- No applicable target → configuration warning (cannot flag status).
- Deadline windows computed from today at page load.

### Acceptance (PRD Phase 3)
- ED sees all three domains with test data.
- Off-track metrics flagged correctly per configured threshold.
- Revenue status uses the fixed 80%/60% org constants.
- Funder deadlines color-coded by window.

---

## Phase 4 — Reporting & PDF Export

The on-demand board and funder reports.

### 4A. `/report` screen (ED, Head of Fundraising)
- Report type selector (board | funder), period selector, funder selector (funder report only), ED Notes field (free text, max 300 words, validated server-side), export button.

### 4B. PDF pipeline (`/api/report/pdf`)
POST flow per ADD §5.2 and §6.1:
1. Validate body (`reportType`, `period` "YYYY-MM", optional `funderId`, optional `edNotes`).
2. Funder report: verify funder has ≥1 linked program → **422** + prompt if none.
3. Run report query via Prisma.
4. Render with `BoardReport.tsx` or `FunderReport.tsx` (`@react-pdf/renderer` primitives only — no HTML/Tailwind).
5. Stream binary, `Content-Type: application/pdf`.

Response codes: 200 PDF · 400 validation · 401 unauth · 403 wrong role · 422 no linked programs.

### 4C. Report templates (PRD "Report Template Specs")
- **Board report:** org/period header → ED Notes → program outcomes (all active programs) → fundraising summary by category (target vs. actual, `orgRevenueStatus`) → funder deadlines (all active, sorted by proximity, window coloring; >90 days listed without flag — intentional).
- **Funder report:** org/funder/period header → ED Notes → outcomes for linked programs only → funding summary for that funder → next deadline (renewal + report due).
- "No data entered" wherever an entry is missing for the period.

### Acceptance (PRD Phase 4)
- ED generates a board report for a test period.
- ED and Head of Fundraising each generate a funder report.
- Both export as clean PDF.
- A period with missing data shows "No data entered."
- A funder with no linked programs cannot be exported — system prompts to link a program.

---

## Cross-Cutting Workstreams (apply in every phase)

| Concern | Requirement | Reference |
|---|---|---|
| **Auth enforcement** | Every page and API route passes through `middleware.ts`. No Server Actions. | ADD §7.2, ADR-007 |
| **Error handling** | Field errors inline; business-rule violations show message + next action; reports never blank/zero; generic page for unexpected errors (no stack traces). | ADD §7.3 |
| **Validation** | Server-side validation on every mutation route (zod). Client validation is UX only. | ADD §9.1 |
| **Secrets** | Only via Railway env vars; never committed; never logged. | ADD §7.4 |
| **Immutability** | No UPDATE/DELETE on `metric_targets`, `revenue_targets`, `metric_entries`. `revenue_entries` editable (logged). | ADD §8.3 |
| **Logging** | Auth failures, unauthorized route attempts, PDF export errors. Include timestamp, event, user id (not email), route. No passwords/tokens. | ADD §11 |
| **Future hooks** | Form field names match DB columns; domain logic stays pure; report components isolated. | ADD §15 |

---

## Testing Strategy

| Layer | Approach |
|---|---|
| **Domain logic** | Unit tests for all `lib/domain/` functions before UI consumes them. Mandatory general-donation `lookupTarget` fixture. Boundary tests on thresholds (exactly 80%, 60%) and deadline windows (30/60/90 days). |
| **Effective-date lookup** | Dedicated tests: target set in March then July → March period resolves to March target; July period resolves to July target (ADR-004 historical accuracy). |
| **API routes** | Integration tests for validation paths, role enforcement (401/403), and the 422 no-linked-programs case. |
| **Transactions** | Verify metric+target creation rolls back fully on failure. |
| **PDF** | Smoke test: board and funder reports render to non-empty PDF bytes; "No data entered" appears for empty periods. |
| **Manual / behavioural** | PRD §6 behavioural checks — ED prepares a board report tool-only; same-day funder report. |

---

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Effective-date lookup wrong for general donations (`NULL` join) | Silent incorrect status flags | Branch on null `funderId` in `lib/domain/targets.ts`; mandatory fixture test (ADD binding constraint) |
| Mutation implemented as Server Action | Silent loss of auth enforcement | ADR-007 prohibition; code review check; all writes via `app/api/` |
| Backdated target collides with existing entries | Historical report corruption | App-layer block on backdating to a period with entries |
| `@react-pdf/renderer` layout learning curve | Phase 4 slippage | Isolate in `components/reports/`; prototype one section early in Phase 4 |
| Metric saved without target | Cannot evaluate off-track status | Atomic `$transaction`; UI guard; (DB deferrable FK if supported) |

---

## Definition of Done (whole v1)

All PRD §6 functional and behavioural checks pass, plus:
- All 4 phase acceptance criteria met in order.
- Domain unit tests green, including general-donation lookup.
- Deployed on Railway; `/login` reachable; daily DB backups enabled (ADD §12.4).
- No secrets in source; middleware enforces the full role-to-route table.

---

*Impact Dashboard Implementation Plan v1.0 · Companion to PRD v5.0 + ADD v2.0 · June 2026*

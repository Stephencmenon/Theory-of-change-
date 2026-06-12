# Governance Code Review — 2026-06-12

**Scope:** Full-project standards compliance run (`/governance run now`)
**Standards:** `.claude/skills/governance/standards.md` v1.0

## Checks run

| Check | Command | Result |
|-------|---------|--------|
| TypeScript strict | `tsc --noEmit` (strict: true) | ✅ clean (after fixes) |
| Lint | `npm run lint` | ✅ no warnings/errors |
| Tests | `npm run test` (vitest) | ✅ 46/46 passing |
| File length ≤ 500 | manual | ✅ no file > 500 lines |
| `console.log` in src | manual | ✅ none |
| Hardcoded secrets | manual | ✅ none (all via `process.env`; `passwordHash` only) |
| No `any` (§1.1) | manual | ✅ clean (after fixes) |

> Note: `audit:standards` / `scripts/governance-check.mjs` referenced by the skill are not present in this project; equivalent checks were run directly.

## Issues found & fixed (4)

1. **Type errors in `tests/reports.smoke.test.tsx`** — `createElement(BoardReport, { data })`
   produced a `FunctionComponentElement` not assignable to `renderToBuffer`'s
   `ReactElement<DocumentProps>` (3 occurrences). Switched to JSX
   (`<BoardReport data={data} />`), matching the production render path in
   `app/api/report/pdf/route.tsx`.
2. **`any` at boundary in `lib/http.ts`** — `let json: any` → `unknown` with a
   narrowed error-shape cast for the `!ok` branch.
3. **`any` at boundary in `app/api/programs/[id]/entry/route.ts`** — `let raw: any`
   → `unknown` with a narrowed `{ entries?: unknown }` access.
4. **`any` cast in `components/fundraising/RevenuePanel.tsx`** — `(res.data as any)?.edited`
   → typed the call `postJson<{ edited?: boolean }>(...)` and read `res.data?.edited`.

## Status

**PASS** — all standards checks green. Changes are in the working tree (not committed;
on `main`). No behavioral change — fixes are type-level/test-only plus boundary typing.

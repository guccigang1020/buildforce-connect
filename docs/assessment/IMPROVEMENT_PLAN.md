# BuildForce Connect — Assessment & Production-Readiness Plan

> Status: **Draft for approval.** This is the assessment + roadmap only. No
> production code or migrations are applied until the plan is approved.
> Scope of this document: what's wrong, why, what to do, in what order, and how
> we'll prove each fix works.

---

## 0. App in one paragraph

BuildForce Connect is a Hebrew/RTL construction-labor marketplace for the
Israeli market built on **TanStack Start + React 19** (file routes in
`src/routes/`), **Supabase** (Postgres + Auth + Storage + Row-Level Security),
and deployed on **Cloudflare** (`wrangler.jsonc`). It was scaffolded with
Lovable (`@lovable.dev/*`). Contractors post labor requests; manpower
corporations compete in a **reverse auction (מכרז הפוך)** on price-per-hour; the
contractor awards the job; the platform then tracks the crew's on-site daily
attendance. Roles: `contractor`, `corporation`, `team_leader`, `admin`
(`user_roles` table + `app_role` enum, enforced via the `has_role()` and
`has_bid_on_request()` SQL functions).

---

## 1. How to read this plan

Work is organized into four phases (Critical → Product → Technical → Production
readiness). Each item uses a fixed shape:

- **Problem** · **Root cause** · **Fix** · **Impact** · **Complexity** (S/M/L)
  · **Risk** (Low/Med/High) · **Depends on** · **Acceptance criteria.**

A change is **not "done"** until its acceptance criteria pass in the running app
(see §6, Verification discipline). Progress is tracked in
`docs/assessment/IMPLEMENTATION_PROGRESS.md` (created alongside this plan).

---

## 2. Discovery findings (what's actually there)

### 2.1 Architecture & data
- File-based routing; `src/routeTree.gen.ts` is **generated** (currently shows
  as modified in git — never hand-edit, regenerate instead).
- Data access split between client (`src/integrations/supabase`,
  `*.functions.ts`) and privileged server paths (`*.server.ts`,
  `admin.server.ts`) using a service-role client (`supabaseAdmin`).
- ~42 SQL migrations in `supabase/migrations/` with opaque GUID filenames.
  Core tables: `job_requests`, `job_request_items`, `job_offers`,
  `job_offer_price_log`, `job_awards`, `corporation_workforce`,
  `job_request_messages`, `job_ratings`, `attendance_*`, `projects`,
  `project_teams`, `project_members`, `profiles`, `user_roles`, plus email/SMS/
  audit infra.
- Background/cron-style hooks in `src/routes/api/public/hooks/`:
  `close-expired-requests`, `auto-approve-attendance`,
  `contractor-daily-reminder`.

### 2.2 Auth / roles
- Signup (`src/routes/signup.tsx`) only exposes **contractor** and
  **corporation**. Admin and team_leader are provisioned elsewhere
  (`src/lib/admin.server.ts` / `admin.functions.ts`) — provisioning path needs
  to be documented and security-reviewed (see Open Question OQ-1).

### 2.3 Known-bad signals already visible in the repo
- `git status` shows a **deleted RLS fix migration**
  (`20260609173000_fix_has_bid_on_request_permission.sql`) and a sibling
  `20260609173100_create_has_bid_on_request_function.sql`, indicating an
  in-flight, unfinished fix to the recursion problem → local/remote drift risk.
- `FIXES_TLDR.md` documents two prior RLS incidents (missing `has_role` EXECUTE
  grant → 403s; recursion in `job_requests`). RLS is the dominant risk surface.
- The landing page renders **hardcoded mock data** (`src/lib/mock-data.ts`,
  `CORPORATIONS`) — demo content on a production path.
- **No test framework and no CI** (`.github` absent; no `*.test.*`/`*.spec.*`).

---

## 3. Live-testing requirement (don't trust the code — run it)

Reading migrations is not enough to know the *deployed* RLS state. The
implementation must **drive the running app via Playwright MCP** and assert on
real behavior, not just code.

**Concrete example of what this must catch (do not over-correct for this one
case — it's representative, not the whole job):**

> Navigate to `http://localhost:8080/dashboard` while logged in. The page
> currently renders
> `שגיאה בטעינת בקשות: infinite recursion detected in policy for relation "job_requests"`
> and, because TanStack Query retries the failing query, it re-fires in a loop.
> Source: the error string is rendered at `src/routes/dashboard.tsx:348`; the
> message originates from the `job_requests` SELECT in the dashboard data layer
> (`src/lib/job-requests.functions.ts`).

The live-test pass must, at minimum:
- Load every primary route per role (contractor, corporation, admin,
  team_leader) and **fail the check on any rendered error banner, console
  error, unhandled rejection, or visible retry/loading loop** — not only on HTTP
  status.
- Walk the core journeys end to end (auth, post request, submit/withdraw offer,
  auction panel, award, attendance entry/approval, rating).
- Account for **RTL/Hebrew** in selectors and assertions.

**Prerequisites to resolve before testing:** dev server (`npm run dev`, port
**8080**), which Supabase env it targets, and whether **per-role test accounts +
seed data** exist. If they don't, state it explicitly, propose minimal seeding,
and test what's reachable rather than silently skipping (OQ-2).

---

## 4. Prioritized roadmap

### Phase 0 — Prerequisites (gate: must clear before any Phase 1 code/migration)

These are not optional analysis tasks — they are **blockers**. P1 work must not
start until all four pass, because each P1 fix either depends on knowing the
real backend state or can't be validated without test identities.

- **P0-1 · Confirm the live RLS state.** Introspect the *actual* deployed
  policies/functions on `job_requests` and `job_offers` in the target Supabase
  project (not just migration files). Confirm the recursion reproduces at
  `/dashboard`. *Gates P1-1, P1-2. Resolves OQ-3.*
- **P0-2 · Reconcile migration drift.** Decide and document how local migrations
  map to the remote schema (the deleted `…173000` vs. added `…173100` pair), and
  the idempotent-baseline approach. *Gates every migration in P1. Resolves OQ-3.*
- **P0-3 · Stand up test identities + seed.** Create/confirm per-role accounts
  (contractor, corporation, team_leader, admin) and minimal sample data in a
  **non-production** Supabase env. *Gates all "verify across four roles"
  acceptance criteria. Resolves OQ-2.*
- **P0-4 · Decide admin/team_leader provisioning model** (OQ-1) enough to lock
  the permission matrix the P1 RLS work validates against.

**Acceptance for Phase 0:** the recursion is reproduced and root-caused against
the *real* DB; a written baseline/drift plan exists; four working test logins
exist; the per-role permission matrix (§5) is drafted and agreed.

### Phase 1 — Critical (production blockers, security, data integrity)

**P1-1 · RLS infinite recursion on `job_requests`**
- **Problem:** `/dashboard` (and any read of `job_requests`) fails with
  `infinite recursion detected in policy for relation "job_requests"`; the UI
  retries in a loop.
- **Root cause:** circular policy dependency — a `job_requests` SELECT policy
  references `job_offers`, whose own policy references `job_requests`. A
  `SECURITY DEFINER` function (`has_bid_on_request`) was introduced to break the
  cycle, but the migration that wires it up is in a half-applied state (one
  migration deleted from the working tree, a replacement added) → the deployed
  DB still recurses.
- **Fix:** finalize a single, idempotent migration that (a) defines
  `has_bid_on_request(uuid, uuid)` as `SECURITY DEFINER` with `search_path` set,
  (b) grants EXECUTE to `authenticated`, (c) replaces the recursive
  `job_requests` SELECT policy with one calling the function, and (d) confirms
  no other policy on `job_requests`/`job_offers` re-introduces a cross-table
  join. Reconcile the deleted vs. added migration so local matches remote.
- **Impact:** unblocks the entire authenticated experience.
- **Complexity:** M · **Risk:** High (touches access control) · **Depends on:**
  nothing · **Acceptance:** logged-in contractor and corporation both load
  `/dashboard` with zero error banners/console errors and no retry loop; a
  corporation sees exactly the open requests + the requests it bid on, and
  nothing else; verified for all four roles.

**P1-2 · Consolidate the `job_requests` RLS policy set**
- **Problem:** the SELECT policy has been dropped/recreated across ~5 migrations
  (`151307`, `151352`, `151454`, `203303`, `173100`); the effective final state
  is hard to reason about and is how P1-1 slipped in.
- **Root cause:** incremental "fix-on-top-of-fix" migrations with no
  consolidated baseline.
- **Fix:** add one authoritative, idempotent migration that asserts the full
  intended policy set for `job_requests` (and the symmetric `job_offers`
  policies), documented inline. Don't rewrite history; layer a known-good
  baseline.
- **Impact:** future RLS changes become reviewable.
- **Complexity:** M · **Risk:** Med · **Depends on:** P1-1 · **Acceptance:** a
  single migration fully describes who can SELECT/INSERT/UPDATE/DELETE
  `job_requests`; a per-role access matrix (§5) matches observed behavior.

**P1-3 · Verify service-role key is never shipped to the client**
- **Problem:** privileged paths use a service-role `supabaseAdmin`
  (`admin.server.ts`); `.env.example` lists only publishable keys, so the real
  service key's handling is unclear.
- **Root cause:** mixed client/server Supabase usage in one repo bundled by Vite
  + Cloudflare.
- **Fix:** confirm the service-role client is only constructed in
  server/worker-only modules, never imported into a client bundle; add a build
  assertion/lint guard; document required server-only env vars.
- **Impact:** prevents a full-database credential leak.
- **Complexity:** S · **Risk:** High · **Depends on:** nothing · **Acceptance:**
  grep/build proof that no service key reaches `dist` client assets; documented
  env split.

**P1-4 · Harden query retry/error UX so a backend error can't become a loop**
- **Problem:** a single RLS error turns into repeated network hammering + a bare
  error string.
- **Root cause:** default TanStack Query retry behavior on non-retryable
  (authorization) errors; no graceful error/empty states.
- **Fix:** disable retries for 4xx/RLS-class errors, add bounded backoff, and
  render a friendly Hebrew error + retry affordance instead of a raw message.
- **Impact:** failures degrade gracefully instead of DoS-ing the backend.
- **Complexity:** S · **Risk:** Low · **Depends on:** nothing · **Acceptance:**
  with the backend forced to error, the page shows one clean error state and
  issues a bounded, finite number of requests.

### Phase 2 — Core product improvements

- **P2-1 · Admin/team_leader provisioning UX & docs** — make role provisioning
  explicit and safe (resolve OQ-1 first). *Complexity M · Risk Med.*
- **P2-2 · Bidding lifecycle clarity** — surface request/offer/award states
  consistently across contractor and corporation dashboards; make the
  reverse-auction "current lowest / your standing / time left" legible.
  *Complexity M · Risk Low.*
- **P2-3 · Validation completeness** — audit forms (signup, new-request, offer)
  for server-side/RLS-backed validation, not client-only; consistent Hebrew
  error messages. *Complexity M · Risk Low.*
- **P2-4 · RTL/Hebrew UX pass** — directionality, number/currency/date
  formatting, mixed LTR tokens (IDs, prices). *Complexity S · Risk Low.*
- **P2-5 · Replace mock data on live paths** — drive the landing page from real
  data or clearly label demo content. *Complexity S · Risk Low.*

### Phase 3 — Technical improvements

- **P3-1 · Migration hygiene** — adopt descriptive migration names going
  forward; document the baseline; add a check that local migrations match the
  remote schema (drift detection). *Complexity M · Risk Med.*
- **P3-2 · Data-layer consolidation** — dedupe Supabase query logic in
  `src/lib/*.functions.ts`; standardize error mapping (Postgres/RLS error →
  typed app error). *Complexity M · Risk Low.*
- **P3-3 · Query performance** — review for N+1 reads (e.g. dashboard fans out
  to `job_offers` + `job_request_items` per request) and confirm supporting
  indexes exist. *Complexity M · Risk Low.*
- **P3-4 · Type safety** — ensure `src/integrations/supabase/types.ts` is
  regenerated from the final schema and used end to end. *Complexity S · Risk
  Low.*

### Phase 4 — Production readiness

- **P4-1 · Test framework from zero** — Vitest for unit/integration (see §6).
  *Complexity M.*
- **P4-2 · Playwright E2E suite** — critical journeys per role, run against a
  seeded test project. *Complexity L.*
- **P4-3 · CI/CD** — add `.github` workflows: lint + typecheck + unit on PR,
  E2E on merge, migration validation. *Complexity M.*
- **P4-4 · Observability** — structured logging in worker routes/hooks, error
  reporting, and alerting on RLS/permission errors specifically (they're the
  recurring failure mode here). *Complexity M.*
- **P4-5 · Operational** — env-var documentation, backup/restore validation for
  Supabase, runbook for the cron hooks. *Complexity S.*

---

## 5. Documentation deliverables (to `docs/assessment/`)

1. Architecture overview · 2. Database + **RLS policy map** · 3. **Per-role
permission matrix** (contractor/corporation/team_leader/admin × table ×
SELECT/INSERT/UPDATE/DELETE) · 4. Bidding lifecycle diagram (request → offer →
auction → award → attendance → rating → close) · 5. Bug report (with Playwright
evidence/screenshots) · 6. UX/RTL report · 7. Security review (RLS-focused) ·
8. Production-readiness review · 9. This roadmap · 10. Testing strategy ·
11. Open-questions register (§7) · 12. `IMPLEMENTATION_PROGRESS.md`.

---

## 6. Verification discipline (per change)

Every change follows: **plan → implement → review → test → validate → fix →
re-test → approve.** Concretely:

- **RLS changes** are validated against **all four roles** in the running app —
  confirm each role sees/does exactly what the permission matrix (§5) says, and
  nothing more. No RLS change is "done" on code review alone.
- **Any route touched** gets a live load via Playwright MCP that asserts: no
  error banner, no console error, no unhandled rejection, **no retry/loading
  loop** (the P1-1 failure mode), correct RTL rendering.
- **Migrations** are never applied to the real backend without explicit
  approval; work on a branch; don't commit/push unless asked.

### Testing strategy (none exists today)
- **Unit (Vitest):** business logic + validators in `src/lib/`, error mapping.
- **Integration:** Supabase RLS/authorization — per role, assert allowed and
  denied reads/writes (this is the highest-value layer for this app).
- **E2E (Playwright):** auth, post request, bid/withdraw, auction, award,
  attendance approve, rating; admin and team-leader screens.
- **Regression checklist** + security/performance/load-test recommendations.

---

## 7. Open Questions & Decisions

**OQ-1 — How should admin & team_leader be provisioned?**
Today only contractor/corporation self-signup; admin/team_leader come from
`admin.*` code paths. Options: (A) admin-only in-app management UI; (B) seeded
via secure server script/CLI; (C) keep current implicit path but document &
lock it down. *Recommendation:* A for team_leader management by corporations + B
for the first admin bootstrap. **Status: Pending.**

**OQ-2 — Test data / accounts for live testing.**
Do seeded per-role accounts and sample requests/offers exist in the target
Supabase env? Options: (A) create a dedicated seed migration/script for a test
project; (B) test against a copy of prod data; (C) test only public + signup
flows. *Recommendation:* A. **Status: Pending.**

**OQ-3 — Migration drift between local and remote.**
A fix migration is deleted locally while a replacement is added; the remote DB
state is unknown. Options: (A) reconcile by introspecting remote and writing one
idempotent baseline; (B) reset local to match remote then re-apply. *
Recommendation:* A. **Status: Pending.**

**OQ-4 — Keep or migrate off Lovable scaffolding** (`@lovable.dev/*` auth/email/
webhooks)? Affects long-term maintainability and vendor lock-in. *
Recommendation:* keep for now; revisit in Phase 3. **Status: Pending.**

---

## 8. Suggested execution order

P1-1 → P1-3 → P1-4 → P1-2 (Critical, unblocks everything) → resolve OQ-1/OQ-2/
OQ-3 → Phase 2 → Phase 3 → Phase 4. Update `IMPLEMENTATION_PROGRESS.md` after
each item; nothing is closed until its acceptance criteria pass in the running
app.

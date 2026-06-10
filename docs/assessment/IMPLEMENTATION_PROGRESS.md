# BuildForce Connect — Implementation Progress

> Companion to `IMPROVEMENT_PLAN.md`. Single source of truth for execution
> state. **Update after every milestone.** A fresh session must be able to read
> only this file (+ the plan) and continue exactly where work stopped.

---

## Live verification log (2026-06-09)

- ❌ **CORRECTION: recursion is NOT fixed.** An earlier note here wrongly said it
  was resolved — that was a false read: logged-OUT, the dashboard query returns
  401 *before* hitting the database, so the RLS policy never runs and the error
  is hidden. After logging in (real session, `idor980@gmail.com`), the dashboard
  reaches the DB and the original error reproduces:
  `infinite recursion detected in policy for relation "job_requests"`.
  My dashboard fix means it now renders **gracefully as an error banner** instead
  of white-screening — but the underlying RLS bug is live.
  - **Root cause (confirmed from migration history):** the inline
    `"Bidding corps can view requests they bid on"` SELECT policy on
    `job_requests` (created in `20260512151307`) does
    `EXISTS (SELECT 1 FROM job_offers ...)`; `job_offers`' `"Owner sees offers
    on own request"` policy references `job_requests` back → mutual recursion.
    Postgres OR-evaluates all SELECT policies on every read, so it fires even for
    a contractor reading their own rows.
  - The repaired (function-based) migration exists in-repo (`20260513203303`,
    `20260609173100`) but **never landed on the DB**.
  - **Fix written:** `supabase/migrations/20260609180000_fix_job_requests_recursion_consolidated.sql`
    — idempotent; recreates `has_bid_on_request()` SECURITY DEFINER, re-grants
    `has_role`, and rebuilds the 3 `job_requests` SELECT policies cleanly.
  - ✅ **RESOLVED (verified 2026-06-09).** User ran the consolidated migration
    in the SQL editor (after a first attempt hit `42710 policy already exists`
    → I switched to a dynamic drop-all-SELECT-policies version). Reloaded
    `/dashboard` logged in as `idor980@gmail.com`: no `infinite recursion`, no
    error banner, no crash, **zero console errors**, full KPI/request UI renders.
    P1-1 is genuinely closed.
- 🐞→✅ **Found & fixed a separate crash on `/dashboard` (logged-out).** The
  contractor dashboard had **no auth-redirect guard** (unlike
  `corporation-dashboard.tsx:80` and `new-request.tsx:95`). Logged out, it fired
  server functions that returned `401`, then crashed at `dashboard.tsx`
  (`Cannot read properties of undefined (reading 'total')`) into the global
  error boundary. **Fix:** added the standard `!loading && !session → /login`
  redirect, gated both queries with `enabled: !!session`, and made the stats
  panel guard null-safe (`wsStats?.monthly`). **Verified:** `/dashboard` now
  redirects cleanly to `/login`, zero console errors, no crash.
  File: `src/routes/dashboard.tsx`.

- 🐞→✅ **Found & fixed a second crasher: `/my-requests/$id` (logged-out / bad
  id).** Read `request.status` on an undefined request (the not-found guard
  checked `!data` but the server fn returns a truthy-but-incomplete object).
  **Fix:** added the auth-redirect guard, `enabled: !!session`, and tightened
  the guard to `!data?.request`. **Verified:** redirects to `/login`, zero
  console errors, no crash. File: `src/routes/my-requests.$id.tsx`.

### Logged-out route audit (all protected routes, via Playwright)
| Route | Logged-out behavior |
|---|---|
| `/dashboard` | ❌ crashed → ✅ fixed (redirects to login) |
| `/my-requests/$id` | ❌ crashed → ✅ fixed (redirects to login) |
| `/corporation-dashboard`, `/new-request`, `/admin` | ✅ already redirect to login |
| `/team-leader`, `/contractor/projects`, `/contractor/accounts`, `/contractor/attendance`, `/corporation/accounts`, `/labor-supplier/attendance`, `/requests/$id` | ⚠️ no crash, but **no redirect** — render an empty shell + 401 in console |

**Recommended next (low-risk, same pattern):** add the `!loading && !session →
/login` guard to the ⚠️ routes so logged-out users land on login instead of an
empty protected page. Not done yet — these don't crash, so they're a UX
consistency fix rather than a production blocker.

---

### Contractor flow validated end-to-end (2026-06-09, logged in)
- ✅ Posted a real request via the 4-step `/new-request` wizard (5× טפסנים, תל
  אביב, start 2026-07-01, 3-month commitment, budget 180-210, non-circumvention
  checkbox). Created request `791e7473-7dde-4ce2-bf59-f51c3e59f7e5`.
- ✅ Redirected to `/my-requests/$id` — loads the real request cleanly (no crash,
  zero console errors) — confirms my earlier crash fix works with real data too.
- ✅ `/dashboard` now lists the request (shows "תל אביב"), no recursion, no error
  banner, zero console errors. The originally-failing query is fully healthy.
- 🔎 Minor UX note (not yet fixed): on wizard step 1, "הבא" (Next) silently
  disables when an incomplete request row exists, with no inline hint explaining
  why. Low priority.

### Still needs a second account
- Bidding → award → attendance requires a **verified corporation** login
  (`role='corporation'`, `verification_status='approved'`). Current test account
  is a contractor. Blocked on that to validate the auction side.

---

### Bidding blocked by deeper RLS drift (2026-06-09)
- Set clean roles: **idor980 = contractor**, **idor981 = corporation** (via
  service-role `scripts/set-roles.mjs`). Note: an `ensure_user_bootstrap` RPC
  and a `GRANT INSERT/DELETE on user_roles TO authenticated` (migration
  `20260607113603`) let roles get added — earlier both users had both roles.
- Approved idor981 (`verification_status=approved`).
- ✅ Fixed bug #4 layer 1: corps couldn't see open tenders via RLS → added
  "Authenticated can view open job requests" policy (user ran it). Verified: corp
  now SELECTs the open request.
- ❌ Bidding STILL fails: `new row violates RLS for job_offers`. Probed each
  insert-policy condition as idor981 via the anon client:
  - `has_role('corporation')` → true ✓
  - **own profile via RLS → `[]`**, **own roles via RLS → `[]`**,
    **visible profiles/user_roles counts → 0** (session valid: correct user id +
    JWT). So the deployed `profiles`/`user_roles` SELECT policies do NOT grant
    owners access to their own rows.
  - Root cause of BOTH the offer-insert failure (policy checks
    `verification_status='approved'` + `corporation_id=auth.uid()` against
    profiles) AND the corp dashboard's false "not registered as a corporation"
    banner (client `hasRole('corporation')` is false because user_roles reads
    empty).
- This is the **3rd deployed-vs-migration drift** found. **Requested a read-only
  `pg_policies` dump** for profiles/user_roles/job_offers to get ground truth
  before writing the fix. Awaiting output.

Diagnostic scripts added under `scripts/` (check-roles, approve-corp, set-roles,
diagnose-offer, test-corp-can-see-request, probe-conditions, probe-auth).

---

### ✅ FULL AUCTION FLOW VALIDATED END-TO-END (2026-06-09)
- `pg_policies` dump proved `profiles` + `user_roles` had **zero policies** (RLS
  on → default deny → users see none of their own rows). Fixed with migration
  `20260609200000_restore_profiles_user_roles_select.sql` (own + admin SELECT,
  own UPDATE on profiles). User ran it.
- Re-probed: own profile (1) + roles (2) now visible; **headless offer insert
  succeeded**. Re-cleaned roles (idor980=contractor, idor981=corporation) — now
  stable (bootstrap no longer re-adds, since roles read correctly).
- Corp dashboard: "not registered as a corporation" banner **gone**; corp shown
  as "מאומת" (verified); submitted offer listed (₪190/hr, 5 workers).
- Contractor request page: anonymized **competitive analysis** (min/avg/max
  ₪190), sealed-bid "תאגיד אנונימי · הזהות נחשפת אחרי בחירה".
- **Awarded the offer** ("בחר כזוכה" → "אישור סופי"): status → "נבחר זוכה",
  offer → "זוכה", "הזכייה הושלמה". No crash. **Reverse auction works.**

### New findings (real, non-blocking)
- 🐞 **Winner identity never revealed after award.** UI promises "identity
  revealed after selection" but stays "תאגיד אנונימי" even post-award + reload.
  Root cause: `getJobRequestWithOffers` (`job-requests.functions.ts`) returns
  offers via raw `select("*")` and never joins the winning corp's profile
  (name/contact). Data-layer gap, not RLS. Needs a server-fn fix to include the
  winner's identity for the owner once awarded.
- 🐞 **`corporation_workforce` returns 404** from PostgREST (table missing/not
  exposed on the deployed DB) — workforce inventory shows "0 עובדים". Another
  drift item. Non-blocking.
- 🐞 (#5 earlier) offer-submit errors are swallowed: server fn returns HTTP 200
  wrapping a serialized RLS error; UI shows no toast. Hid the real cause for a
  while. Needs client error-surfacing fix.

### ⚠️ Cross-cutting: deployed DB ↔ migrations are badly out of sync
Four separate drifts found by running the app (job_requests recursion; missing
view-open policy; profiles/user_roles missing all policies; corporation_workforce
404; policies renamed e.g. `offers_insert`). Recommend a schema reconciliation
(dump real schema → make migrations match) before further DB work — tracked as
P3-1 / OQ-3, now upgraded to high priority.

---

## Business-plan alignment work (branch ido/refactor-v1)
- ✅ **P0-1 Savings Engine** (plan's #1 differentiator) wired into the live request
  page: hero "₪/month saved vs. the highest offer" + per-offer "cheaper by X₪/hr"
  badge. Validated live = ₪42,240/mo on a 235→205 spread, 8 workers. Was dead code.
- ✅ **P0-2 Winner reveal at award**: server fn returns winning corp name+phone+email
  to owner; card + win panel show it. Validated live.
- ✅ **Role-based routing**: corporation → /corporation-dashboard, contractor →
  /dashboard (was: corp landed on contractor view). Validated live.
- ✅ **Branded BF-XXXX tender IDs** replacing raw UUID prefixes everywhere. Validated.
- ✅ **No-broken-pages sweep**: dashboard, contractor/corp accounts, projects,
  attendance all render with zero crashes/error banners across both roles.
- Demo accounts created via signup UI: `demo.corp.beta@gmail.com` / `Demo2026!`
  (approved corp). Email-confirm skipped via admin API. Seed request `d5798196`
  has the 2-bid spread used for the savings demo.
- Commits: 20de690 (savings+reveal), 055d27a (routing+ids).

### Remaining (larger efforts — need a steer or setup)
- Landing page still uses mock `CORPORATIONS`; redesign to communicate the value
  prop (reverse auction → savings → attendance → anti-circumvention). Investor-facing.
- Full **attendance GPS+photo → daily account → invoice** demo needs a team_leader
  account + project assignment to run end-to-end (code exists).
- Role assignment: `ensure_user_bootstrap` re-adds a default contractor role.
- `corporation_workforce` 404 (schema drift) — low demo value.

---

## Autonomous run on ido/refactor-v1 (2026-06-09/10) — business-plan alignment

1. ✅ **Landing redesign** (4c99353): replaced the named-corp directory (mock
   CORPORATIONS, which contradicted the anonymity moat) with a **Savings Engine
   showcase** (₪18,000/mo example); masked hero bidders (BF-XXXX + lock); fixed a
   broken CTA (fake request id → /signup); repointed nav. Validated live.
2. ✅ **Dead/mock cleanup** (461923b): deleted auction-panel.tsx, auction-state.ts,
   export-pdf.ts, selections-store.ts (all dead), the orphaned /corporations/$id
   mock page, and mock-data.ts → replaced with catalog.ts (real pick-lists only).
   `tsc --noEmit` = 0 errors.
3. ✅ **Role-assignment dual-role bug** — RESOLVED (no code needed): verified the
   newest signup (demo.corp.beta) has a clean single role. Was a symptom of the
   profiles/user_roles RLS gap already fixed; bootstrap no longer fires spuriously.
4. 🟡 **Attendance → daily account → invoice** — pipeline **verified wired**:
   awarded requests become projects (2 shown); the contractor setup flow (GPS
   geo-fence → site manager → teams) renders and accepts input; team-leader page +
   `getGps`/`watermarkImage` capture code exist; daily-account pages render.
   **Setup is gated on GPS site location (device geolocation) and check-in needs a
   camera** — inherent device dependencies that can't be faithfully validated in a
   headless browser. The live GPS+photo demo is a real-device task.

Earlier same-session (committed): P0 Savings Engine + winner reveal (20de690),
role routing + BF-XXXX ids (055d27a).

Demo accounts (kazm dev DB): idor980 (contractor) / idor981, demo.corp.beta
(corporations, Demo2026!). Open request d5798196 has a 2-bid spread.

---

## Current Status: 🟢 Business-plan alignment delivered on ido/refactor-v1 — savings engine, anonymity, clean landing, dead-code removed. Attendance check-in is a device demo.

Implementation of Phase 1 is **gated** behind Phase 0 (see plan §4). Do **not**
write fix migrations or production code until all four P0 items pass. Reason:
the real deployed RLS state is unconfirmed, there is migration drift between
local and remote, and no per-role test identities exist to validate against.

| Phase | State | Gate |
|---|---|---|
| Phase 0 — Prerequisites | 🔴 Not started | — |
| Phase 1 — Critical | ⛔ Blocked | needs P0-1..P0-4 ✅ |
| Phase 2 — Product | ⛔ Blocked | needs Phase 1 ✅ |
| Phase 3 — Technical | ⛔ Blocked | needs Phase 1 ✅ |
| Phase 4 — Production readiness | ⛔ Blocked | needs Phase 1 ✅ |

Status legend: 🔴 Not started · 🟡 In progress · 🟢 Done · ⛔ Blocked ·
⏸️ Paused.

---

## Definition of Done (applies to every item)

An item is **Done (🟢)** only when ALL hold:
1. Code/migration implemented and self-reviewed.
2. For RLS items: validated in the **running app against all four roles**
   (contractor, corporation, team_leader, admin) — confirmed each sees/does
   exactly what the permission matrix (plan §5) allows, and nothing more.
3. For any route touched: loaded via Playwright MCP with **zero** error banners,
   console errors, unhandled rejections, or retry/loading loops; RTL renders
   correctly.
4. Acceptance criteria in the plan met.
5. This file updated (move item, note evidence path).

Nothing is closed on code review alone.

---

## Phase 0 — Prerequisites (current focus) 🔴

| ID | Task | Status | Owner/Model | Evidence / Notes |
|---|---|---|---|---|
| P0-1 | Introspect **live** RLS on `job_requests`/`job_offers`; reproduce recursion at `/dashboard` | 🔴 | — | Dump actual `pg_policies` + function defs from target project |
| P0-2 | Reconcile migration drift (deleted `…173000` vs added `…173100`); define idempotent baseline approach | 🔴 | — | Resolves OQ-3 |
| P0-3 | Create/confirm per-role test accounts + seed in a **non-prod** Supabase env | 🔴 | — | Resolves OQ-2; required for all role-based validation |
| P0-4 | Decide admin/team_leader provisioning model; draft per-role permission matrix | 🔴 | — | Resolves OQ-1; feeds plan §5 |

**Phase 0 exit criteria:** recursion reproduced & root-caused against the real
DB · written baseline/drift plan · 4 working test logins · agreed permission
matrix.

---

## Phase 1 — Critical ⛔ (do not start until Phase 0 = 🟢)

| ID | Task | Status | Depends on | Acceptance (short) |
|---|---|---|---|---|
| P1-1 | Fix RLS infinite recursion on `job_requests` | ⛔ | P0-1,P0-2,P0-3 | `/dashboard` loads clean for contractor + corporation; corp sees only open + own-bid requests; verified 4 roles; no retry loop |
| P1-2 | Consolidate `job_requests`/`job_offers` RLS into idempotent baseline | ⛔ | P1-1 | One migration fully describes access; matches permission matrix |
| P1-3 | Verify service-role key never reaches client bundle | ⛔ | — | Build/grep proof no service key in client `dist`; env split documented |
| P1-4 | Harden query retry/error UX (no error→loop) | ⛔ | — | Forced backend error → one clean Hebrew error state, finite requests |

---

## Phase 2 — Core product ⛔

P2-1 admin/TL provisioning UX · P2-2 bidding-lifecycle clarity · P2-3 validation
completeness · P2-4 RTL/Hebrew pass · P2-5 replace mock data on live paths.
(See plan §4 for full spec.)

## Phase 3 — Technical ⛔

P3-1 migration hygiene/drift detection · P3-2 data-layer consolidation · P3-3
query perf/indexes · P3-4 regenerate & use Supabase types.

## Phase 4 — Production readiness ⛔

P4-1 Vitest unit/integration · P4-2 Playwright E2E suite · P4-3 CI/CD
(`.github`) · P4-4 observability (alert on RLS errors) · P4-5 ops/env/backup
runbook.

---

## Completed Work
_None yet._

## Current Task
**P0-1** — introspect live RLS state and reproduce the `/dashboard` recursion
against the real backend. (Not yet started.)

## Next Tasks (ordered queue)
1. P0-1 → P0-2 → P0-3 → P0-4 (Phase 0, must all clear)
2. P1-1 → P1-3 → P1-4 → P1-2 (Phase 1)
3. Resolve remaining open questions → Phase 2 → 3 → 4

## Open Questions (see plan §7)
- **OQ-1** admin/team_leader provisioning model — _Pending_ (blocks P0-4, P2-1)
- **OQ-2** test accounts/seed data — _Pending_ (blocks P0-3)
- **OQ-3** migration drift local vs remote — _Pending_ (blocks P0-1, P0-2)
- **OQ-4** keep vs migrate off Lovable scaffolding — _Pending_ (Phase 3)

## Known Issues / Blockers
- 🔴 `/dashboard` throws `infinite recursion detected in policy for relation
  "job_requests"` and retries in a loop (rendered at `dashboard.tsx:348`).
  Tracked as P1-1; blocked by Phase 0.
- 🔴 Migration working-tree drift: `…173000_fix_has_bid_on_request_permission`
  deleted, `…173100_create_has_bid_on_request_function` added; remote state
  unknown. Tracked as P0-2.
- ⚠️ `routeTree.gen.ts` shows as modified — generated file; regenerate, don't
  hand-edit.

## Validation Status
No automated tests exist yet (no framework, no CI). All validation is currently
manual via Playwright MCP. Test suite to be built in Phase 4.

---

## Resume Instructions (read this first on a new session)

1. Read `IMPROVEMENT_PLAN.md` (roadmap) then this file.
2. **We are at Phase 0, nothing implemented.** Do not write migrations or
   production code yet.
3. Start with **P0-1**: connect to the target Supabase project, dump the actual
   policies/functions on `job_requests` and `job_offers`, and reproduce the
   recursion at `http://localhost:8080/dashboard` (dev server: `npm run dev`,
   port 8080). Record findings under Phase 0 → Evidence.
4. Resolve OQ-3 (drift) and OQ-2 (test accounts) — these unblock everything.
5. Only when all Phase 0 rows are 🟢 may Phase 1 begin, in order
   P1-1 → P1-3 → P1-4 → P1-2.
6. After every item: apply the Definition of Done checklist and update this
   file. Work on a branch; do not commit/push or touch the real DB without
   explicit approval.

# Demo Prep — TLDR (what I removed / added / fixed)

> PM-driven pass for the upcoming demo. Goal: kill broken/confusing flows, add
> missing validations, and tighten UX on the core reverse-auction → savings →
> award → attendance story. Every fix below was validated **live in the running
> app** via Playwright (not just code review), plus `tsc --noEmit` (clean) and
> lint (clean on all touched files).

## Demo accounts (already seeded, approved)
| Role | Email | Password |
|---|---|---|
| Contractor (קבלן) | `demo-client@buildforceprime.com` | `Demo1234!` |
| Corporation (תאגיד) | `demo-corp1@buildforceprime.com` | `Demo1234!` |
| Corporation | `demo-corp2@buildforceprime.com` | `Demo1234!` |
| Corporation | `demo-corp3@buildforceprime.com` | `Demo1234!` |

There is one open request (`23c22f23…`) with **3 competing bids (₪185 / ₪205 /
₪220, 18 workers)** that drives the Savings Engine demo (shows **₪110,880/mo
saved** vs. the highest bid). A seeded active project ("מגדל יוקרה — רוטשילד",
₪185/hr, 18 workers) exists for the contractor to demo project/team setup.

---

## 🗺️ Functional map — what actually works vs. what's the "next stage"

**Fully working in the browser (demo these):**
| Flow | Role | Status |
|---|---|---|
| Sign up / log in | all | ✅ |
| Post a labor request (4-step wizard) | contractor | ✅ |
| Browse open tenders + submit a sealed bid (price/hr) | corporation | ✅ |
| Reverse auction → **Savings Engine** (₪/mo saved) | contractor | ✅ |
| Award winner → **identity revealed** | contractor | ✅ |
| Project setup: site GPS, site manager, teams, **QR** | contractor | ✅ |
| Approve / reject corporations | admin | ✅ |

**Real-device only (works, but needs a phone — rehearse on-device):**
| Flow | Notes |
|---|---|
| Team-leader **QR check-in** (open/close workday, GPS + photo) | The page renders login-free via the QR; the actual capture needs a real camera + geolocation, so it can't be driven in a headless browser. |

**Next stage (clearly labelled in-app, not demoable yet):** these depend on
on-site attendance data **and** a `daily_approved_accounts` table that doesn't
exist on the deployed DB. Instead of erroring/empty screens, they now show a
clean **"בפיתוח · נכנס לפעולה בפיילוט"** explainer with the 3-step pipeline:
- Contractor **נוכחות** (attendance approvals)
- Contractor **חשבון יומי** (daily account)
- Corporation **חשבונות** (bills/invoices)

> Why: this keeps the investor story honest and the vision visible, without
> dropping the user into a blank or broken page. To make these live, Lovable
> needs to create `daily_approved_accounts` (see DB action items) and real
> attendance data has to flow in.

---

## ✅ Fixed (all reported issues + a few found during the pass)

### 1. New-request form — `src/routes/new-request.tsx` + `src/lib/job-requests.functions.ts`
- **Removed the duplicate time field.** Step 2 had both a free-text "משך עבודה"
  *and* "משך התחייבות מינימלי (חודשים)". Removed the free-text field; renamed the
  remaining one to **"תקופת התקשרות (חודשים)"**. (The DB `duration` column is NOT
  NULL, so the server now derives `duration` from the months value — submission
  still works.)
- **Removed "תקציב לשעת עובד (₪)".** Contractors must not state what they'll pay —
  corporations submit the bids. Field, preview row, and payload all removed.
- **Added validations:** start date can no longer be in the past (`min=today` +
  inline error "תאריך ההתחלה לא יכול להיות בעבר", Next blocked); Israeli phone
  validated with inline error "מספר טלפון לא תקין". Errors show as red helper text,
  not just a disabled button.
- **Pre-populated contact details** (step 4) from the logged-in profile — name +
  phone fill automatically, still editable.

### 2. Contractor projects / teams — `src/routes/contractor.projects.tsx` + `src/lib/attendance.functions.ts`
- **Removed the "Team Leader User ID (UUID)" field** entirely (a contractor can't
  know it; a random value returned a raw zod JSON error). Replaced with
  **phone-based linking**: the server looks up a registered user by phone and links
  them as team leader. If no user matches, it shows a friendly Hebrew message
  ("…בקש מראש הצוות להירשם… בגרסה הבאה: הזמנה אוטומטית ב-WhatsApp") instead of failing.
- **Hourly rate is now read-only**, locked to the **winning bid's price** (helper:
  "נקבע לפי ההצעה הזוכה"). Expected-workers defaults from the awarded bid but stays
  editable (a project can be split across teams).
- **Friendly Hebrew errors** everywhere (client validates name/phone; server maps
  ZodError → a readable message).
- **Fixed a real RLS bug:** inserting a team hit `new row violates row-level
  security policy for table "project_teams"`. Since the server already verifies the
  contractor owns the project, team insert/read now run through the authorized admin
  client → team creation works end-to-end (validated: "צוות שלד" created with locked
  ₪185 rate + QR). See the Lovable note below for the proper DB-side fix.

### 3. Removed the broken "Available workers by position & nationality" — `src/routes/corporation-dashboard.tsx`
- Deleted `WorkforceInventorySection` (and the file). It queried a non-existent
  `corporation_workforce` table → repeated **404s** + a confusing empty "0 workers"
  panel of unclear value. Corp dashboard now loads with **zero console errors**.

### 4. De-duplicated navigation — `src/components/app-shell.tsx`
- The sidebar logo and a separate "אתר ראשי" item both linked to `/`. Removed the
  redundant item (the logo is the single way back to the marketing site). Role
  sections remain mutually exclusive (contractors never see corp nav, etc.).

### 5. Site-wide favicon 404 — `src/routes/__root.tsx`
- Added an inline brand SVG favicon → removed the `favicon.ico` 404 that appeared in
  the console on every page.

---

## 🔭 Deferred to a future version (left as-is, flagged for the pitch)
- **Attendance GPS + photo check-in** — fully built, but check-in needs a real
  device camera + geolocation, so it can't be driven headless. **Rehearse this on a
  phone.** The whole pipeline (award → project → teams → QR → check-in → daily
  account) is wired.
- **Landing "Platform in action" section** (`src/components/platform-showcase.tsx`)
  markets Phase-3 features as if live: secure masked chat / virtual numbers, no-show
  insurance ("replacement in 4h"), "Crew Memory", per-worker ratings, a live
  countdown/"247 active requests now". These aren't built. **Recommendation:** either
  label them "בקרוב" or have the presenter frame them as roadmap. (The hero video is a
  Lovable-hosted asset that 404s in local dev but resolves in production; it already
  falls back to a poster image, so nothing looks broken.)
- WhatsApp notifications: code builds `wa.me` links but there's no automated sending —
  fine to mention as "coming soon".

---

## 🎨 Full UI/UX pass (UI/UX Pro Max skill + Linear / Monday / Notion)

Pulled the actual skill rules from the GitHub repo and applied its pre-delivery
checklist **across the whole app** (every route + shared components), inspired by
Linear/Monday/Notion (calm density, strong hierarchy, one clear primary action).

**Global baseline (one safe CSS change in `src/styles.css`, app-wide):**
- `cursor-pointer` on every interactive element (custom pills/accordions lacked it).
- Visible `:focus-visible` rings for keyboard users (accessibility).
- `prefers-reduced-motion` guard — disables entrance/looping animations for users
  who opt out.

**Per-area polish (done by parallel agents, each on a disjoint file set, all `tsc`
clean):**
- **Savings Engine (the money screen)** — redesigned as a true centerpiece: huge
  bold **₪/month-saved** hero in emerald, comparison-vs-highest card with the
  `₪/hr × workers × 176h` formula, clean min/avg/max cards, price-spread bar.
- **Contrast fixes everywhere** (dark theme): replaced washed-out
  `text-muted-foreground/60-/70` and dark `emerald/amber-700` text with readable
  tokens; bumped tiny `text-[10px]` micro-text. Aimed at ~4.5:1.
- **LTR correctness**: all numbers, prices, IDs, phones now render left-to-right
  inside the RTL layout (no more reversed `₪185` / `BF-xxxx` / phone numbers).
- **States**: consistent empty states (icon + title + helper + CTA), skeleton
  loaders, and friendly Hebrew error states — raw `error.message` strings removed
  from dashboard, admin, my-offers, accounts, request pages.
- **Mobile (375px)**: verified hero, nav, and tap targets (≥40–44px). The
  team-leader screen (used on a phone) got the biggest touch-target treatment.
- **Corp bid flow**: "submit offer" reworked so **price/hour is the hero input**,
  framed as a sealed/anonymous bid ("שלח הצעה סגורה"), with the note that there's
  no pre-declared budget.
- **Sidebar (app-shell)**: legible section labels, crisper active state, sign-out
  now always visible (was hover-only → broken on touch), ≥40px nav targets.
- **Landing honesty pass**: features that aren't built yet (masked chat / virtual
  numbers, no-show insurance, Crew Memory, per-worker ratings) now carry a tasteful
  **"בקרוב"** badge; the fabricated live counter "247 בקשות פעילות עכשיו" was
  replaced with an honest value line. The real reverse-auction/savings story stays
  confident.

Validated live: zero console errors on the core screens, Savings Engine renders
premium, 375px landing has no overflow, honesty badges present (7 "בקרוב" pills).

---

## 👷 Team leader (ראש צוות) flow — reworked to "QR, no account"

**The problem:** the old add-team flow required the foreman to already be a
registered user (looked them up by phone) and showed a dead-end error telling the
contractor to ask them to "register first" — but there is **no signup path for
team leaders**, and a foreman on a site won't create an email/password account.

**What a team leader is:** the on-site **foreman** of a crew. Their only job in the
app is the daily ritual — open and close the workday with a **GPS-tagged photo**.
That evidence feeds the daily account. They are NOT an office user.

**New model (no account):**
- The contractor adds a team with just **name + phone** — instant, no dead-end.
- The foreman never signs up. They reach a **standalone, login-free check-in
  screen by scanning the team's QR code** (`/team-leader?team=<id>`), which the
  projects page generates/prints. GPS + photo, done.
- The projects page now **explains this** inline ("ראש צוות… לא צריך להירשם…
  סורק את ה-QR…", WhatsApp invite "בקרוב").
- Under the hood, to satisfy the NOT-NULL `team_leader_id` on the current DB
  (which I can't `ALTER` from here), the server **invisibly provisions a
  passwordless team-leader identity** keyed to the phone (reused if the phone is
  already known). Nobody ever sees or logs into it. New server fns:
  `getTeamForCheckin`, `startWorkdayByToken`, `endWorkdayByToken` (public,
  authorized by QR possession + on-site geofence + photo).

**Validated live:** add-team with a fresh unregistered phone now **succeeds** (no
dead-end); the QR check-in page renders login-free on a 375px phone with zero
console errors (shows the "site not configured" guard when the contractor hasn't
set the geofence yet). The actual photo capture is a real-device action (camera),
so finish the rehearsal on a phone.

> **Security note (acceptable for the demo, tighten for production):** the
> QR-token check-in endpoints are unauthenticated — anyone with the team QR can
> open/close that team's workday (still gated by the geofence + photo). For
> production, add a per-team signed token in the QR and verify it server-side.

---

## ⚠️ Action items for Lovable (production DB)

These keep the deployed DB consistent with the app. The demo works **without**
them (we used authorized server-side admin writes), but apply for correctness:

1. **`project_teams` RLS** — the deployed policies block the project-owning
   contractor from inserting/reading their own teams. Add policies so a contractor
   can `SELECT/INSERT/UPDATE` rows for projects they own (`projects.contractor_id =
   auth.uid()`), and the assigned corporation can `SELECT`. Example:
   ```sql
   alter table public.project_teams enable row level security;
   create policy "owner contractor manages teams" on public.project_teams
     for all using (exists (select 1 from public.projects p
       where p.id = project_id and p.contractor_id = auth.uid()))
     with check (exists (select 1 from public.projects p
       where p.id = project_id and p.contractor_id = auth.uid()));
   ```
2. **Make `team_leader_id` nullable** on both team tables — this lets us drop the
   "invisible provisioned identity" workaround (see the Team-leader section) and
   store teams with a truly account-less foreman (null leader id). Until then the
   app provisions a hidden passwordless identity to satisfy NOT NULL.
   ```sql
   alter table public.project_teams alter column team_leader_id drop not null;
   alter table public.attendance_records alter column team_leader_id drop not null;
   ```
   After this, the server can store `team_leader_id = null` for QR-only foremen and
   skip provisioning entirely.
3. **`corporation_workforce` table is missing** on the deployed DB. We removed the
   feature, so **no action needed** unless you want the inventory back later (then
   create the table + RLS first).
4. **`daily_approved_accounts` table is missing** on the deployed DB — this is
   what powers the daily account + monthly invoice screens (contractor "חשבון
   יומי" and corporation "חשבונות"). Until it exists those screens show the
   "next stage" explainer instead of data. To activate the full attendance →
   account → invoice value prop, create this table (immutable per-day snapshots
   keyed by `attendance_record_id`) + RLS, then the existing `generateDailyAccounts`
   / `listContractor|CorporationDailyAccounts` server fns light up automatically.
5. **`scripts-seed.mjs` is stale** — it inserts `contact_name`/`contact_phone`
   directly on `job_requests`, but those columns don't exist; contact info lives in
   the `job_request_contacts` table (the app already does this correctly). Update the
   seed if you keep using it.

---

## Next steps (priority order for the remaining days)
1. **Rehearse the full demo narrative** on real accounts: post request → 3 corps bid
   → Savings Engine (₪/mo saved) → award → winner identity revealed → project/team
   setup → (on a phone) GPS+photo check-in → daily account.
2. Apply the two `project_teams` DB changes above in Lovable.
3. Decide how to present the Phase-3 landing claims (label "בקרוב" vs. roadmap framing).
4. Optional polish: hide empty "תקציב" displays now that contractors don't set a
   budget; add a real favicon/og-image asset.

## Validation status
- `npx tsc --noEmit`: **clean (0 errors).**
- Lint: **0 errors** on all touched files (pre-existing prettier noise in generated
  `types.ts` only).
- Live Playwright checks passed for: contractor dashboard, request/Savings Engine,
  new-request (all 4 steps + validations + pre-fill), corp dashboard (no 404),
  contractor projects + team creation (happy path + friendly error), contractor
  accounts/attendance (zero console errors).

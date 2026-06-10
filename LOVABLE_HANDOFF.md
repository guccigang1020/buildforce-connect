# Lovable Handoff — BuildForce Makeover (2026-06-10)

The app was overhauled on branch `ido/makeover` (code) + the dev database.
**Production (the Lovable-managed Supabase project) was NOT touched** — only
Lovable has access to it. This file is exactly what you tell/do in Lovable to
bring production up to the same state.

## What changed (summary)

1. **Strict role separation** — contractor / corporation / admin are exclusive.
   No more "sign up as contractor, become a sort-of admin-corporation": the
   self-bootstrap-admin path and the admin "toggle role" buttons are gone from
   the code; the database now enforces ONE role per user.
2. **Admin = a dedicated account**, provisioned by SQL only (never via signup).
3. **New light design system** — Notion/Linear/Monday-inspired (white/slate
   surfaces, blue #1D4ED8 primary, status pills, Rubik font). Savings ₪ numbers
   are the only orange in the app.
4. **Honesty pass** — fake stats removed (12,500 workers / 47 corporations…),
   dead hero-video 404 removed, unbuilt features marked "בקרוב" with a polished
   coming-soon treatment.
5. **Flow hardening** — route guards on every protected page, inline Hebrew
   validation on all forms, server errors surfaced as Hebrew toasts, award flow
   locked against double-clicks. Full money loop (post → 2 sealed bids → award
   → winner reveal) verified end-to-end via Playwright with zero console errors
   on all 15 routes across all roles.

## Step 1 — Deploy the code

Merge `ido/makeover` into the branch Lovable deploys from (usually `main`) and
push. Lovable's GitHub sync will pick it up and publish. No Lovable prompt is
needed for the code — do NOT ask Lovable to "improve" anything; the code is the
source of truth now.

## Step 2 — Run two SQL scripts on the production database

In Lovable: open the backend/Cloud panel → SQL editor (or tell Lovable
verbatim: *"Run this exact SQL in the project database. Do not modify it, do
not add anything to it."*). Run these two repo files in order:

1. `supabase/migrations/20260609210000_prod_consolidated_rls_baseline.sql`
   — fixes the known production drift: the job_requests RLS infinite recursion,
   missing profiles/user_roles policies (users couldn't read their own roles),
   and the missing "view open requests" policy. Idempotent; safe to re-run.

2. `supabase/migrations/20260610210000_role_separation_hardening.sql`
   — revokes client-side role writes, fixes `ensure_user_bootstrap` so it never
   stacks/defaults roles, **cleans existing mixed-role accounts** (keeps
   corporation over contractor; strips admin from everyone not in the list),
   and enforces one-role-per-user with a unique index.
   ⚠️ **Before running:** edit the `_admin_emails` list in section 4 to the
   email(s) that should keep admin in production (see step 3).

## Step 3 — Provision the production admin (one time)

1. Sign up in the production app normally with the email you want as the
   system admin (or use your existing account email).
2. Make sure that email is in the `_admin_emails` list of script 2 (step 2).
3. Run this in the SQL editor (replace the email):

```sql
DO $$
DECLARE _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = 'YOUR-ADMIN-EMAIL@example.com';
  IF _uid IS NULL THEN RAISE EXCEPTION 'user not found — sign up first'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _uid;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin');
  UPDATE public.profiles SET verification_status = 'approved', is_verified = true
  WHERE user_id = _uid;
END $$;
```

That account now logs in through the normal login page and is routed straight
to `/admin`, with admin-only navigation. It is NOT a contractor and NOT a
corporation — if you also want to act as a contractor in production, use a
separate email.

## Step 4 — Verify production (5 minutes)

- [ ] Log in as the admin → lands on `/admin`, sidebar shows only "מנהל מערכת"
- [ ] Sign up a fresh test contractor → lands on `/dashboard`, contractor nav only
- [ ] Contractor posts a request; a verified corporation sees it and bids;
      a second corporation cannot see the first one's price
- [ ] Award → winner identity + contacts revealed, loser stays anonymous
- [ ] No console errors on: landing, login, dashboard, corporation-dashboard, admin

## Things NOT to ask Lovable to do

- Don't ask it to restyle/redesign anything (it will fight the new design system).
- Don't ask it to "fix" the database beyond the two scripts above.
- Don't recreate any "make me admin" button — admin is SQL-provisioned only.

## Dev-database note (for us, not Lovable)

The dev DB (`kazmylwuujpcunqhcuwx`) already has the baseline fixes applied and
data cleaned (mixed-role account fixed, corrupt year-2211 request deleted, demo
accounts seeded — see `scripts/seed-admin.mjs`, `scripts/seed-demo-users.mjs`).
The hardening script (script 2) should also be run once in the dev SQL editor —
it requires DDL access that the service-role API doesn't expose.

Dev logins: contractor.demo@buildforce.dev / corp.demo@buildforce.dev
(Demo2026!) · admin@buildforce.dev (BuildForce-Admin-2026!).

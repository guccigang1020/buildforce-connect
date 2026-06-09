# What I changed and why — TLDR

Plain-language summary of the bug fixes. Three problems were reported; this
explains the fix for each, plus the small supporting changes.

---

## 1. Dashboard was slow and showed 403 errors / zeros

### What was actually wrong
The database uses **Row Level Security (RLS)** — rules that decide which rows a
logged-in user is allowed to read. One of the rules on the `profiles` table is
"admins can see all profiles", and to check "are you an admin?" it calls a
database function called `has_role(...)`.

A previous "security cleanup" migration **removed permission** for normal
logged-in users to run `has_role`. The catch: the database evaluates *every*
read-rule on the table, including the admin one — even when you're just reading
your **own** profile. So every profile read tried to run `has_role`, hit
"permission denied", and the database returned **403 Forbidden**.

That 403 is exactly what you saw in the Network tab. It also slowed the
dashboard down: the app retried the failing requests several times (with
increasing delays) before giving up and showing zeros.

### The fix
**File:** `supabase/migrations/20260609120000_grant_has_role_execute_to_authenticated.sql`

A migration is just a `.sql` file that changes the database. The long name is
`<timestamp>_<description>`; the timestamp keeps them in order. This one does a
single thing:

```sql
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
```

It re-grants logged-in users permission to run `has_role`, which is safe — that
function only answers "does this user have this role?" and exposes nothing
sensitive. This is the standard Supabase setup; removing it was the mistake.

> ⚠️ **You must apply this migration to the database** for the fix to take
> effect. The code changes alone won't clear the 403 without it. Easiest way:
> Supabase Dashboard → SQL Editor → paste the GRANT above → Run.

### Supporting changes (so a failure never hangs the app again)
- **`src/router.tsx`** — Told the data layer: don't keep retrying a request that
  failed for a reason that won't change (401/403/permission/not-found). Before,
  it retried 3 times with growing delays (~7 seconds) before showing anything.
- **`src/hooks/use-auth.tsx`** — When loading the user's roles hits a permission
  error, stop immediately instead of looping through retries.

---

## 1b. "Infinite recursion detected in policy for relation job_requests"

### What was actually wrong
The database prevents circular dependencies between **Row Level Security (RLS)** policies.
There's a "Bidding corps can view requests they bid on" rule on the `job_requests` table
that needs to check the `job_offers` table. But `job_offers` has a rule that checks back
to `job_requests`. This creates a loop.

A previous migration **fixed** this by wrapping the check in a `SECURITY DEFINER` function
called `has_bid_on_request()` — a function runs under the definer's privileges, so it
doesn't re-evaluate RLS and avoids the circle. But the function **lost EXECUTE permission**
for logged-in users.

### The fix
**File:** `supabase/migrations/20260609173000_fix_has_bid_on_request_permission.sql`

This migration re-grants the permission:

```sql
GRANT EXECUTE ON FUNCTION public.has_bid_on_request(uuid, uuid) TO authenticated;
```

And ensures the policy uses the safe function-based approach.

> ⚠️ **You must apply this migration to the database** for the fix to take effect.
> Same as above: Supabase Dashboard → SQL Editor → paste the GRANT → Run.

---

## 2. Signup errors were popups, after submit, sometimes in English

### What was wrong
The signup form validated everything only *after* you clicked submit, then
showed **one** error at a time as a temporary popup (toast). The "password is
too simple" message came straight from Supabase in **English**.

### The fix
- **`src/routes/signup.tsx`** and **`src/routes/login.tsx`** — rebuilt the forms
  with `react-hook-form` + `zod`. Now each field validates **inline** (a red
  message appears under the field as you fill it in, before you submit), all in
  **Hebrew**.
- **`src/lib/auth-errors.ts`** (new) — translates Supabase's English auth errors
  (weak/simple password, wrong credentials, rate limit, etc.) into Hebrew and
  attaches them to the correct field.

---

## 3. Signing up with an email that's already registered

### Decision
If someone already signed up (e.g. as `תאגיד`) and tries to sign up again with
the same email (e.g. as `יזם`), we **block it** and show an inline message on
the email field:

> אימייל זה כבר רשום במערכת — התחבר/י במקום זאת

One email = one account = one role. Adding a second role would be a separate,
logged-in action later — not something done at signup.

### The fix
- **`src/routes/signup.tsx`** — detects the duplicate (both the explicit error
  and Supabase's "silent" case where it hides that the email exists) and shows
  the inline message with a link to log in.

---

## Bonus fixes found during review

- **Contractor document uploads** (license / books certificate) used to fail
  **silently** — if anything went wrong, the files just vanished with no
  warning. Now errors are reported and the user is told if a document needs to
  be re-uploaded after logging in.
- **After signup**, the app now sends you to the dashboard when you're logged in
  immediately, or to login with a "check your email" message when email
  confirmation is required — instead of always showing the same message.

---

## Deploy workflow (local → git → Lovable)

**One database for all of it.** Local dev, the GitHub repo, and the published
Lovable site all use the same Supabase project (`qzmxicshrmzehnorcgaj`). So the
SQL migration is applied **once** to that shared DB — git doesn't run it and
Lovable won't auto-run a hand-added migration file.

1. **Test locally:** `npx tsc --noEmit`, `npm run lint`, `npm run dev`. (The
   dashboard 403 still shows locally until step 2, because local uses the same
   un-migrated DB.)
2. **Apply the migration** (you): Supabase SQL Editor → run the GRANT, or
   `supabase db push` after `supabase link`.
3. **Push to git:** commit on your branch and open a PR to `main`.
4. **Publish on Lovable:** once the tracked branch has the code, click Publish.

Note: `MIGRATIONS.sql` in the project root is an **out-of-date** combined copy
and is **not** what runs your database — the real migrations live in
`supabase/migrations/`.

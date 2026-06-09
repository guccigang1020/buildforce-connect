-- ============================================================
-- CONSOLIDATED FIX: infinite recursion on public.job_requests
--
-- Root cause:
--   The "Bidding corps can view requests they bid on" SELECT policy on
--   job_requests used an inline `EXISTS (SELECT 1 FROM job_offers ...)`.
--   job_offers' own SELECT policy ("Owner sees offers on own request")
--   references job_requests in return. Because Postgres OR-evaluates ALL
--   SELECT policies on every read of job_requests, the two policies call
--   each other forever -> "infinite recursion detected in policy for
--   relation job_requests".
--
-- Fix:
--   Evaluate the corp-bid check inside a SECURITY DEFINER function, which
--   bypasses RLS on job_offers and breaks the cycle. Also re-assert the
--   has_role EXECUTE grant (a prior migration revoked it, which caused 403s)
--   and the function grant.
--
-- This migration is fully idempotent: it dynamically drops EVERY existing
-- SELECT policy on job_requests (whatever it is named) before recreating the
-- three correct ones, so it brings the table to a known-good state no matter
-- which earlier migrations did or did not land on the database. INSERT/UPDATE/
-- DELETE policies are left untouched.
-- ============================================================

-- 1) SECURITY DEFINER helper that breaks the job_requests <-> job_offers cycle.
CREATE OR REPLACE FUNCTION public.has_bid_on_request(_request_id uuid, _corporation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.job_offers
    WHERE request_id = _request_id
      AND corporation_id = _corporation_id
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_bid_on_request(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_bid_on_request(uuid, uuid) TO authenticated;

-- has_role is used by the "Admins can view all job requests" policy; ensure it
-- stays executable by authenticated so the admin policy does not 403 the
-- evaluation for ordinary users.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 2) Drop EVERY existing SELECT policy on job_requests (any name), then
--    recreate the three correct, non-recursive ones.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT polname
    FROM pg_policy
    WHERE polrelid = 'public.job_requests'::regclass
      AND polcmd = 'r'  -- SELECT policies only
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.job_requests', pol.polname);
  END LOOP;
END $$;

-- Owner can see their own requests.
CREATE POLICY "Owners can view own job requests"
ON public.job_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Admins can see everything (has_role is SECURITY DEFINER -> no recursion).
CREATE POLICY "Admins can view all job requests"
ON public.job_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Corporations can see requests they have bid on (via SECURITY DEFINER fn).
CREATE POLICY "Bidding corps can view requests they bid on"
ON public.job_requests FOR SELECT TO authenticated
USING (public.has_bid_on_request(id, auth.uid()));

-- Any authenticated user can view OPEN requests. Required so corporations can
-- see a tender before bidding -- and so the job_offers INSERT policy's
-- `EXISTS (... status = 'open')` check can succeed (that subquery is evaluated
-- under the inserting user's RLS). Safe: contact details live in the separate
-- job_request_contacts table, not in job_requests.
CREATE POLICY "Authenticated can view open job requests"
ON public.job_requests FOR SELECT TO authenticated
USING (status = 'open');

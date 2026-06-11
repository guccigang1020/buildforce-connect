-- ============================================================
-- CONSOLIDATED RLS BASELINE (apply to the Lovable-managed prod DB)
--
-- One idempotent script that brings job_requests / job_offers (read path),
-- profiles, and user_roles to the known-good state verified on the dev DB.
-- Safe to run on any current state:
--   * has_role EXECUTE re-granted to authenticated (fixes "permission denied
--     for function has_role" and the profiles 403 that cascades from it).
--   * has_bid_on_request() SECURITY DEFINER helper (breaks the job_requests
--     <-> job_offers recursion).
--   * job_requests SELECT policies rebuilt to the correct non-recursive set
--     (own / admin / bidding-corp-via-fn / open) via a dynamic drop so no
--     stale/recursive SELECT policy can survive.
--   * profiles & user_roles get owner + admin SELECT (and owner UPDATE on
--     profiles) so role detection and the offer-insert checks work. These use
--     name-scoped drops, so any other existing policies are left untouched.
-- ============================================================

-- 1) has_role must be executable by authenticated (it is called inside most
--    policies; if it isn't executable the whole policy evaluation 403s).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 2) SECURITY DEFINER helper that breaks the job_requests <-> job_offers cycle.
CREATE OR REPLACE FUNCTION public.has_bid_on_request(_request_id uuid, _corporation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.job_offers
    WHERE request_id = _request_id AND corporation_id = _corporation_id
  )
$$;
REVOKE EXECUTE ON FUNCTION public.has_bid_on_request(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_bid_on_request(uuid, uuid) TO authenticated;

-- 3) Rebuild job_requests SELECT policies (drop ALL existing SELECT policies,
--    recreate the correct four). INSERT/UPDATE/DELETE policies are untouched.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.job_requests'::regclass AND polcmd = 'r'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.job_requests', pol.polname);
  END LOOP;
END $$;

CREATE POLICY "Owners can view own job requests"
ON public.job_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all job requests"
ON public.job_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Bidding corps can view requests they bid on"
ON public.job_requests FOR SELECT TO authenticated
USING (public.has_bid_on_request(id, auth.uid()));

CREATE POLICY "Authenticated can view open job requests"
ON public.job_requests FOR SELECT TO authenticated
USING (status = 'open');

-- 4) profiles: owner + admin SELECT, owner UPDATE (name-scoped, additive).
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE POLICY profiles_select_own
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY profiles_select_admin
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY profiles_update_own
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5) user_roles: owner + admin SELECT (name-scoped, additive).
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select_admin ON public.user_roles;

CREATE POLICY user_roles_select_own
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY user_roles_select_admin
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

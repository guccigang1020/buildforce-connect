-- ============================================================
-- Fix: infinite recursion in job_requests policy
--
-- The "Bidding corps can view requests they bid on" policy
-- uses the has_bid_on_request() SECURITY DEFINER function
-- to avoid circular RLS policy dependencies.
--
-- This function must have EXECUTE permission for authenticated
-- users, but it may have been revoked or not properly granted.
-- ============================================================

-- Ensure the function exists and has proper permissions
GRANT EXECUTE ON FUNCTION public.has_bid_on_request(uuid, uuid) TO authenticated;

-- Verify the policy is using the function (not inline recursion)
DROP POLICY IF EXISTS "Bidding corps can view requests they bid on" ON public.job_requests;

CREATE POLICY "Bidding corps can view requests they bid on"
ON public.job_requests
FOR SELECT
TO authenticated
USING (public.has_bid_on_request(id, auth.uid()));

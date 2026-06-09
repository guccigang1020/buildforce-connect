-- ============================================================
-- FIX: corporations cannot submit offers (chicken-and-egg RLS)
--
-- The job_offers INSERT policy ("Verified corporation can submit offer")
-- includes:  EXISTS (SELECT 1 FROM job_requests jr
--                    WHERE jr.id = request_id AND jr.status = 'open')
-- That subquery runs under the INSERTing user's RLS. A corporation that has
-- not yet bid has NO SELECT policy that lets it see an open request it does
-- not own, so the EXISTS returns false and the insert is rejected with
-- "new row violates row-level security policy for table job_offers".
--
-- A "view open job requests" SELECT policy existed historically (migration
-- 20260512151352) but was dropped (20260512151454) and never restored.
-- Restore it. Safe: contact details live in job_request_contacts, not here.
-- ============================================================

CREATE POLICY "Authenticated can view open job requests"
ON public.job_requests FOR SELECT TO authenticated
USING (status = 'open');

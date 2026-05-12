
-- Remove the overly broad policies just added — they negate the point
-- of the tightening.
DROP POLICY IF EXISTS "Authenticated can view profile basics" ON public.profiles;

-- Keep "Authenticated can view open job requests" since marketplace needs
-- corps to browse. Server functions selecting from job_requests for non-owners
-- MUST only select non-sensitive columns (never contact_name/contact_phone).
-- We enforce this at the server function layer.

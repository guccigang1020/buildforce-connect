-- Fix 1: Restrict job_ratings SELECT to parties involved + admins
DROP POLICY IF EXISTS "Anyone authed reads ratings" ON public.job_ratings;
CREATE POLICY "Parties read ratings"
ON public.job_ratings
FOR SELECT
TO authenticated
USING (
  rater_id = auth.uid()
  OR ratee_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Fix 2: Remove duplicate SELECT policy on contractor-docs bucket
DROP POLICY IF EXISTS "Admins read all contractor docs" ON storage.objects;
-- Replace the permissive owner UPDATE policy with one that adds a WITH CHECK
-- preventing self-modification of verification fields. The existing
-- prevent_self_verification trigger remains as defense in depth.

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own non-verification fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      verification_status = (SELECT p.verification_status FROM public.profiles p WHERE p.user_id = auth.uid())
      AND is_verified    = (SELECT p.is_verified    FROM public.profiles p WHERE p.user_id = auth.uid())
      AND admin_notes IS NOT DISTINCT FROM (SELECT p.admin_notes FROM public.profiles p WHERE p.user_id = auth.uid())
    )
  )
);

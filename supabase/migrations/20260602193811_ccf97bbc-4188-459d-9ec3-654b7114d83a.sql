-- 1. Fix attendance photo upload policy: use the object path, not the team's display name.
DROP POLICY IF EXISTS "Team leader uploads attendance photos" ON storage.objects;

CREATE POLICY "Team leader uploads attendance photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attendance-photos'
  AND EXISTS (
    SELECT 1
    FROM public.project_teams t
    WHERE t.team_leader_id = auth.uid()
      AND (t.project_id)::text = (storage.foldername(objects.name))[1]
      AND (t.id)::text = (storage.foldername(objects.name))[2]
  )
);

-- 2. Remove the overly-permissive corporation INSERT policy on project_teams.
-- Contractors (project owners) and admins keep full control via existing policies.
DROP POLICY IF EXISTS "Corporation manages own teams" ON public.project_teams;

-- 3. Lock down SECURITY DEFINER helpers that should only be called by the server.
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb) TO service_role;
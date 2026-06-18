-- ONE chat thread per project, shared by both sides:
--   corporation side: corporation (תאגיד) + operations manager (מנהל תפעול)
--   contractor side:  contractor (קבלן) + site foreman (מנהל עבודה)
-- The coordinator (team_leader / רכז) is excluded. All four may READ and WRITE.
-- Supersedes the earlier two-channel split (ops_foreman / principals).
-- Idempotent; does not depend on the channel column.

-- can_access_project_chat = the two owners + ops + foreman (NOT the coordinator).
CREATE OR REPLACE FUNCTION public.can_access_project_chat(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id AND (p.contractor_id = _user_id OR p.corporation_id = _user_id)
  ) OR EXISTS (
    SELECT 1 FROM public.project_members m
    WHERE m.project_id = _project_id AND m.user_id = _user_id
      AND m.role IN ('operations_manager', 'site_manager')
  );
$$;

-- Replace every prior chat policy variant with a single read+write pair.
DROP POLICY IF EXISTS "Managers read project chat" ON public.project_messages;
DROP POLICY IF EXISTS "Managers send project chat" ON public.project_messages;
DROP POLICY IF EXISTS "chat_read" ON public.project_messages;
DROP POLICY IF EXISTS "chat_write" ON public.project_messages;

CREATE POLICY "chat_read" ON public.project_messages FOR SELECT TO authenticated
  USING (
    public.can_access_project_chat(project_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "chat_write" ON public.project_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND public.can_access_project_chat(project_id, auth.uid())
  );

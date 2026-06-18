ALTER TABLE public.project_workers
  ADD COLUMN IF NOT EXISTS added_by_role text NOT NULL DEFAULT 'corporation';
ALTER TABLE public.project_workers DROP CONSTRAINT IF EXISTS project_workers_added_by_chk;
ALTER TABLE public.project_workers
  ADD CONSTRAINT project_workers_added_by_chk CHECK (added_by_role IN ('corporation','coordinator'));

DROP POLICY IF EXISTS "Coordinator adds workers" ON public.project_workers;
CREATE POLICY "Coordinator adds workers" ON public.project_workers FOR INSERT TO authenticated
  WITH CHECK (
    added_by_role = 'coordinator'
    AND EXISTS (
      SELECT 1 FROM public.project_teams t
      WHERE t.project_id = project_workers.project_id AND t.team_leader_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.can_write_project_chat(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members m
    WHERE m.project_id = _project_id AND m.user_id = _user_id
      AND m.role IN ('operations_manager','site_manager')
  );
$$;

DROP POLICY IF EXISTS "Managers send project chat" ON public.project_messages;
CREATE POLICY "Managers send project chat" ON public.project_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.can_write_project_chat(project_id, auth.uid()));
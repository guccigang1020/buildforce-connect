-- Coordinator-added workers (with a provenance badge) + groundwork for the
-- two-phase entry/exit approval. Idempotent; safe to re-run.
-- The entry/exit approval itself uses columns that already exist on
-- attendance_records (entry_approved_at/by, exit_approved_at/by, *_rejection_reason).

-- 1) Track who added each roster worker so the UI can badge field-added ones.
--    Passport stays mandatory (passport_number is already NOT NULL).
ALTER TABLE public.project_workers
  ADD COLUMN IF NOT EXISTS added_by_role text NOT NULL DEFAULT 'corporation';
ALTER TABLE public.project_workers DROP CONSTRAINT IF EXISTS project_workers_added_by_chk;
ALTER TABLE public.project_workers
  ADD CONSTRAINT project_workers_added_by_chk CHECK (added_by_role IN ('corporation','coordinator'));

-- 2) Let the project coordinator (the team's team_leader) add workers from the
--    field. Corporation management policy stays as-is; this only ADDS insert
--    rights for the coordinator, and only for rows marked added_by_role='coordinator'.
DROP POLICY IF EXISTS "Coordinator adds workers" ON public.project_workers;
CREATE POLICY "Coordinator adds workers" ON public.project_workers FOR INSERT TO authenticated
  WITH CHECK (
    added_by_role = 'coordinator'
    AND EXISTS (
      SELECT 1 FROM public.project_teams t
      WHERE t.project_id = project_workers.project_id AND t.team_leader_id = auth.uid()
    )
  );

-- 3) Chat is WRITE-only for the operations manager + the site foreman. Project
--    owners (corporation/contractor) keep READ access (the chat SELECT policy
--    still uses can_access_project_chat) but may no longer post — "higher
--    levels see the conversation but don't participate".
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

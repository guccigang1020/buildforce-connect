-- ============================================================================
-- Projects / Attendance foundation + new feature tables
-- ----------------------------------------------------------------------------
-- WHY THIS EXISTS
-- The "PROD CLEAN RESET" migration (20260611162515) runs `drop schema public
-- cascade` and recreates only the 11 marketplace tables. The migration that
-- restores the projects/attendance support layer (20260611153201) sorts
-- EARLIER by filename, so on any `db reset` it is wiped and never re-applied.
-- Result: the live DB is missing project_members, attendance_events,
-- attendance_corrections, attendance_notifications, the is_project_member /
-- log_audit functions, the attendance freeze trigger, AND all RLS policies on
-- attendance_records + project_teams (RLS is ENABLED with zero policies, so
-- those tables are unreachable by normal users). That is why the attendance
-- feature is dormant.
--
-- This migration restores that foundation AND adds the new pieces for the
-- Projects feature (operations_manager access, worker roster, project chat,
-- per-worker attendance). It is FULLY IDEMPOTENT: every object uses IF NOT
-- EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS, so it is safe to run on
-- a database that already has some or all of these objects (e.g. prod via
-- Lovable, which may differ from the local reset state).
--
-- PREREQUISITE: 20260617090000_app_role_operations_manager.sql must be applied
-- and committed first (adds the 'operations_manager' enum value).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) project_members table — created BEFORE the helper functions, because
--    is_project_member()/can_access_project_chat() are LANGUAGE sql and
--    Postgres validates their table references at creation time.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL,
  name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id, role)
);
-- (Re)assert the role CHECK so 'operations_manager' is allowed even if the
-- table pre-existed with the older constraint.
ALTER TABLE public.project_members DROP CONSTRAINT IF EXISTS project_members_role_chk;
ALTER TABLE public.project_members
  ADD CONSTRAINT project_members_role_chk
  CHECK (role IN ('site_manager','team_leader','operations_manager','contractor','corporation'));
-- denormalized contact columns may be missing if the table pre-existed
ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS phone text;
CREATE INDEX IF NOT EXISTS idx_members_user ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_project ON public.project_members(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 1) Helper functions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_project_member(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id AND (p.contractor_id = _user_id OR p.corporation_id = _user_id)
  ) OR EXISTS (
    SELECT 1 FROM public.project_members m
    WHERE m.project_id = _project_id AND m.user_id = _user_id
  ) OR EXISTS (
    -- coordinator (team leader) — covered here so RLS policies never need a
    -- direct project_teams subquery (which would mutually recurse with the
    -- project_teams policies that reference projects).
    SELECT 1 FROM public.project_teams t
    WHERE t.project_id = _project_id AND t.team_leader_id = _user_id
  );
$$;

-- Managers-only chat gate: project owners + operations_manager + site_manager.
-- The coordinator (team_leader) is intentionally EXCLUDED — the spec requires
-- that the coordinator cannot see the ops-manager ↔ foreman conversation.
CREATE OR REPLACE FUNCTION public.can_access_project_chat(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id AND (p.contractor_id = _user_id OR p.corporation_id = _user_id)
  ) OR EXISTS (
    SELECT 1 FROM public.project_members m
    WHERE m.project_id = _project_id AND m.user_id = _user_id
      AND m.role IN ('operations_manager','site_manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.log_audit(_action text, _entity_type text, _entity_id uuid, _metadata jsonb DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, _metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.log_audit(text,text,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit(text,text,uuid,jsonb) TO authenticated;

-- Freeze approved/rejected records & compute totals on the way through.
CREATE OR REPLACE FUNCTION public.attendance_freeze_check()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.frozen_at IS NOT NULL AND auth.role() <> 'service_role'
     AND NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Attendance record is frozen. Open a correction request to change it.';
  END IF;
  -- The billed rate is set at record creation. Only the contractor account,
  -- an admin, or the service role may change it — a foreman/coordinator who
  -- can UPDATE the row (to approve / report who arrived) must not alter money.
  IF auth.role() <> 'service_role'
     AND auth.uid() IS DISTINCT FROM NEW.contractor_id
     AND NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
    NEW.hourly_rate := OLD.hourly_rate;
  END IF;
  IF NEW.status IN ('approved','auto_approved','rejected') AND NEW.frozen_at IS NULL THEN
    NEW.frozen_at := now();
    IF NEW.approved_at IS NULL AND NEW.status IN ('approved','auto_approved') THEN
      NEW.approved_at := now();
    END IF;
  END IF;
  IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.total_hours := ROUND(EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::numeric / 3600, 2);
    IF NEW.hourly_rate IS NOT NULL AND NEW.workers_actual IS NOT NULL THEN
      NEW.total_cost := ROUND(NEW.total_hours * NEW.hourly_rate * NEW.workers_actual, 2);
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS attendance_freeze ON public.attendance_records;
CREATE TRIGGER attendance_freeze
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.attendance_freeze_check();

-- ---------------------------------------------------------------------------
-- 2) project_members RLS policies (table created in section 0 above)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Project parties read members" ON public.project_members;
CREATE POLICY "Project parties read members" ON public.project_members FOR SELECT TO authenticated
  USING (public.is_project_member(project_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::public.app_role));
DROP POLICY IF EXISTS "Project owner manages members" ON public.project_members;
CREATE POLICY "Project owner manages members" ON public.project_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_members.project_id AND (p.contractor_id = auth.uid() OR p.corporation_id = auth.uid()))
         OR public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_members.project_id AND (p.contractor_id = auth.uid() OR p.corporation_id = auth.uid()))
         OR public.has_role(auth.uid(),'admin'::public.app_role));

-- ---------------------------------------------------------------------------
-- 3) attendance_events / attendance_corrections / attendance_notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('start','end','exception','approval','rejection','auto_approval','correction_request','correction_decision')),
  actor_id uuid,
  photo_url text,
  gps_lat numeric(9,6),
  gps_lng numeric(9,6),
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_record ON public.attendance_events(record_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_events TO authenticated;
GRANT ALL ON public.attendance_events TO service_role;
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties read events" ON public.attendance_events;
CREATE POLICY "Parties read events" ON public.attendance_events FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = attendance_events.record_id AND
      (r.contractor_id = auth.uid() OR r.corporation_id = auth.uid() OR r.team_leader_id = auth.uid()
       OR public.is_project_member(r.project_id, auth.uid())))
    OR public.has_role(auth.uid(),'admin'::public.app_role)
  );
DROP POLICY IF EXISTS "Parties insert events" ON public.attendance_events;
CREATE POLICY "Parties insert events" ON public.attendance_events FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = attendance_events.record_id AND
      (r.contractor_id = auth.uid() OR r.corporation_id = auth.uid() OR r.team_leader_id = auth.uid()
       OR public.is_project_member(r.project_id, auth.uid())))
  );

CREATE TABLE IF NOT EXISTS public.attendance_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  reason text NOT NULL,
  requested_change jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_corrections_record ON public.attendance_corrections(record_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_corrections TO authenticated;
GRANT ALL ON public.attendance_corrections TO service_role;
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties read corrections" ON public.attendance_corrections;
CREATE POLICY "Parties read corrections" ON public.attendance_corrections FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = attendance_corrections.record_id AND
      (r.contractor_id = auth.uid() OR r.corporation_id = auth.uid() OR r.team_leader_id = auth.uid()
       OR public.is_project_member(r.project_id, auth.uid())))
    OR public.has_role(auth.uid(),'admin'::public.app_role)
  );
DROP POLICY IF EXISTS "Party requests correction" ON public.attendance_corrections;
CREATE POLICY "Party requests correction" ON public.attendance_corrections FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = attendance_corrections.record_id AND
      (r.contractor_id = auth.uid() OR r.corporation_id = auth.uid() OR r.team_leader_id = auth.uid()
       OR public.is_project_member(r.project_id, auth.uid())))
  );
DROP POLICY IF EXISTS "Contractor or admin decides correction" ON public.attendance_corrections;
CREATE POLICY "Contractor or admin decides correction" ON public.attendance_corrections FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = attendance_corrections.record_id AND r.contractor_id = auth.uid())
    OR public.has_role(auth.uid(),'admin'::public.app_role)
  );

CREATE TABLE IF NOT EXISTS public.attendance_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  kind text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  recipient_phone text NOT NULL,
  recipient_role text NOT NULL,
  payload jsonb,
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.attendance_notifications TO authenticated;
GRANT ALL ON public.attendance_notifications TO service_role;
ALTER TABLE public.attendance_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parties read notifications" ON public.attendance_notifications;
CREATE POLICY "Parties read notifications" ON public.attendance_notifications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = attendance_notifications.record_id
    AND (r.contractor_id = auth.uid() OR r.corporation_id = auth.uid() OR r.team_leader_id = auth.uid()
         OR public.is_project_member(r.project_id, auth.uid())))
    OR public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admin manages notifications" ON public.attendance_notifications;
CREATE POLICY "Admin manages notifications" ON public.attendance_notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------------------------------------------------------------------------
-- 4) attendance_records RLS (restore — table has RLS ON with zero policies)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parties read attendance" ON public.attendance_records;
CREATE POLICY "Parties read attendance" ON public.attendance_records FOR SELECT TO authenticated
  USING (
    contractor_id = auth.uid() OR corporation_id = auth.uid() OR team_leader_id = auth.uid()
    OR public.is_project_member(project_id, auth.uid())
    OR public.has_role(auth.uid(),'admin'::public.app_role)
  );
DROP POLICY IF EXISTS "Team leader creates record" ON public.attendance_records;
CREATE POLICY "Team leader creates record" ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (
    team_leader_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.project_teams t WHERE t.id = attendance_records.team_id AND t.team_leader_id = auth.uid())
  );
DROP POLICY IF EXISTS "Team leader updates own pending record" ON public.attendance_records;
CREATE POLICY "Team leader updates own pending record" ON public.attendance_records FOR UPDATE TO authenticated
  USING (team_leader_id = auth.uid() AND frozen_at IS NULL AND status IN ('pending','exception'))
  -- WITH CHECK must also pin the post-update status, otherwise a coordinator
  -- could PATCH status='approved' directly (bypassing the contractor/foreman
  -- approval). They may only leave the record in pending/exception.
  WITH CHECK (team_leader_id = auth.uid() AND frozen_at IS NULL AND status IN ('pending','exception'));
-- Approval: the contractor account OR a project foreman (site_manager member).
DROP POLICY IF EXISTS "Contractor approves attendance" ON public.attendance_records;
CREATE POLICY "Contractor approves attendance" ON public.attendance_records FOR UPDATE TO authenticated
  USING (
    frozen_at IS NULL AND (
      contractor_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.project_members m
                 WHERE m.project_id = attendance_records.project_id
                   AND m.user_id = auth.uid() AND m.role = 'site_manager')
    )
  )
  WITH CHECK (
    contractor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.project_members m
               WHERE m.project_id = attendance_records.project_id
                 AND m.user_id = auth.uid() AND m.role = 'site_manager')
  );
DROP POLICY IF EXISTS "Admin manages attendance" ON public.attendance_records;
CREATE POLICY "Admin manages attendance" ON public.attendance_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

-- ---------------------------------------------------------------------------
-- 5) project_teams RLS (restore — table has RLS ON with zero policies)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Project members read teams" ON public.project_teams;
CREATE POLICY "Project members read teams" ON public.project_teams FOR SELECT TO authenticated
  USING (
    team_leader_id = auth.uid()
    OR public.is_project_member(project_id, auth.uid())
    OR public.has_role(auth.uid(),'admin'::public.app_role)
  );
DROP POLICY IF EXISTS "Contractor manages teams" ON public.project_teams;
CREATE POLICY "Contractor manages teams" ON public.project_teams FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_teams.project_id AND p.contractor_id = auth.uid())
         OR public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_teams.project_id AND p.contractor_id = auth.uid())
         OR public.has_role(auth.uid(),'admin'::public.app_role));
DROP POLICY IF EXISTS "Corporation manages own teams" ON public.project_teams;
CREATE POLICY "Corporation manages own teams" ON public.project_teams FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_teams.project_id AND p.corporation_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 6) projects_select: also grant read to project_members (foreman/ops mgr)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    contractor_id = auth.uid()
    OR corporation_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    -- Everything else (members + coordinator) goes through the SECURITY DEFINER
    -- helper. No inline subquery on project_members / project_teams here — a
    -- direct reference mutually recurses with those tables' policies (which
    -- reference projects), causing "infinite recursion detected in policy".
    OR public.is_project_member(projects.id, auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 7) NEW: project_workers (corporation roster — feeds attendance auto-fill)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  corporation_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  passport_number text NOT NULL,
  nationality text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, passport_number)
);
CREATE INDEX IF NOT EXISTS idx_project_workers_project ON public.project_workers(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_workers TO authenticated;
GRANT ALL ON public.project_workers TO service_role;
ALTER TABLE public.project_workers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project members read workers" ON public.project_workers;
CREATE POLICY "Project members read workers" ON public.project_workers FOR SELECT TO authenticated
  USING (public.is_project_member(project_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::public.app_role));
DROP POLICY IF EXISTS "Corporation manages workers" ON public.project_workers;
CREATE POLICY "Corporation manages workers" ON public.project_workers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_workers.project_id AND p.corporation_id = auth.uid())
         OR public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_workers.project_id AND p.corporation_id = auth.uid())
         OR public.has_role(auth.uid(),'admin'::public.app_role));

-- ---------------------------------------------------------------------------
-- 8) NEW: project_messages (ops manager ↔ foreman chat; coordinator excluded)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) > 0 AND length(body) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_messages_thread ON public.project_messages(project_id, created_at);
GRANT SELECT, INSERT ON public.project_messages TO authenticated;
GRANT ALL ON public.project_messages TO service_role;
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers read project chat" ON public.project_messages;
CREATE POLICY "Managers read project chat" ON public.project_messages FOR SELECT TO authenticated
  USING (public.can_access_project_chat(project_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::public.app_role));
DROP POLICY IF EXISTS "Managers send project chat" ON public.project_messages;
CREATE POLICY "Managers send project chat" ON public.project_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.can_access_project_chat(project_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- 9) NEW: attendance_workers (who actually arrived per day)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.project_workers(id) ON DELETE CASCADE,
  present boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(record_id, worker_id)
);
CREATE INDEX IF NOT EXISTS idx_attendance_workers_record ON public.attendance_workers(record_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_workers TO authenticated;
GRANT ALL ON public.attendance_workers TO service_role;
ALTER TABLE public.attendance_workers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties read attendance workers" ON public.attendance_workers;
CREATE POLICY "Parties read attendance workers" ON public.attendance_workers FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = attendance_workers.record_id AND
      (r.contractor_id = auth.uid() OR r.corporation_id = auth.uid() OR r.team_leader_id = auth.uid()
       OR public.is_project_member(r.project_id, auth.uid())))
    OR public.has_role(auth.uid(),'admin'::public.app_role)
  );
DROP POLICY IF EXISTS "Coordinator manages attendance workers" ON public.attendance_workers;
CREATE POLICY "Coordinator manages attendance workers" ON public.attendance_workers FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = attendance_workers.record_id AND r.team_leader_id = auth.uid())
    OR public.has_role(auth.uid(),'admin'::public.app_role)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = attendance_workers.record_id AND r.team_leader_id = auth.uid())
    OR public.has_role(auth.uid(),'admin'::public.app_role)
  );

-- ---------------------------------------------------------------------------
-- 10) projects: geofence enforcement flag (ships OFF — "Coming Soon")
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS geofence_enforced boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 11) Re-assert the unique keys the app upserts onto. CREATE TABLE IF NOT
-- EXISTS skips the inline UNIQUE on a pre-existing (prod) table, so guard them
-- explicitly — otherwise ON CONFLICT upserts fail with "no unique constraint".
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS project_members_pur_uniq
  ON public.project_members(project_id, user_id, role);
CREATE UNIQUE INDEX IF NOT EXISTS project_workers_passport_uniq
  ON public.project_workers(project_id, passport_number);
CREATE UNIQUE INDEX IF NOT EXISTS attendance_workers_rw_uniq
  ON public.attendance_workers(record_id, worker_id);

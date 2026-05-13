
-- 1) Add new roles to enum if missing
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'team_leader';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'site_manager';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  contractor_id uuid NOT NULL,        -- references auth user (the contractor/owner)
  corporation_id uuid NOT NULL,       -- references auth user (the labor supplier)
  source_request_id uuid,             -- optional link back to job_requests
  source_award_id uuid,               -- optional link back to job_awards
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
  expected_workers int NOT NULL DEFAULT 0,
  hourly_rate numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_projects_contractor ON public.projects(contractor_id);
CREATE INDEX IF NOT EXISTS idx_projects_corp ON public.projects(corporation_id);

-- 3) TEAMS
CREATE TABLE IF NOT EXISTS public.project_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  team_leader_id uuid NOT NULL,
  expected_workers int NOT NULL DEFAULT 1,
  hourly_rate numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teams_project ON public.project_teams(project_id);
CREATE INDEX IF NOT EXISTS idx_teams_leader ON public.project_teams(team_leader_id);

-- 4) MEMBERS
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('site_manager','team_leader','contractor','corporation')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id, role)
);
CREATE INDEX IF NOT EXISTS idx_members_user ON public.project_members(user_id);

-- 5) ATTENDANCE RECORDS
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.project_teams(id) ON DELETE CASCADE,
  team_leader_id uuid NOT NULL,
  contractor_id uuid NOT NULL,
  corporation_id uuid NOT NULL,
  work_date date NOT NULL,
  workers_expected int NOT NULL DEFAULT 0,
  workers_actual int,
  start_time timestamptz,
  start_photo_url text,
  start_gps_lat numeric(9,6),
  start_gps_lng numeric(9,6),
  end_time timestamptz,
  end_photo_url text,
  end_gps_lat numeric(9,6),
  end_gps_lng numeric(9,6),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','auto_approved','exception','rejected','correction_requested')),
  exception_reason text,
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  hourly_rate numeric(10,2),
  total_hours numeric(6,2),
  total_cost numeric(12,2),
  frozen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, work_date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_project_date ON public.attendance_records(project_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_corp_date ON public.attendance_records(corporation_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance_records(status, created_at DESC);

-- 6) ATTENDANCE EVENTS (timeline)
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

-- 7) CORRECTION REQUESTS
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

-- 8) ENABLE RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;

-- 9) HELPER: is user a member of project?
CREATE OR REPLACE FUNCTION public.is_project_member(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id AND (p.contractor_id = _user_id OR p.corporation_id = _user_id)
  ) OR EXISTS (
    SELECT 1 FROM public.project_members m
    WHERE m.project_id = _project_id AND m.user_id = _user_id
  );
$$;

-- 10) RLS POLICIES — projects
CREATE POLICY "Project parties read project" ON public.projects FOR SELECT TO authenticated
  USING (
    contractor_id = auth.uid() OR corporation_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.project_members m WHERE m.project_id = projects.id AND m.user_id = auth.uid())
  );
CREATE POLICY "Contractor updates own project" ON public.projects FOR UPDATE TO authenticated
  USING (contractor_id = auth.uid()) WITH CHECK (contractor_id = auth.uid());
CREATE POLICY "Admin manages projects" ON public.projects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Contractor creates project" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (contractor_id = auth.uid());

-- teams
CREATE POLICY "Project members read teams" ON public.project_teams FOR SELECT TO authenticated
  USING (public.is_project_member(project_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Contractor manages teams" ON public.project_teams FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_teams.project_id AND p.contractor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_teams.project_id AND p.contractor_id = auth.uid()));
CREATE POLICY "Corporation manages own teams" ON public.project_teams FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_teams.project_id AND p.corporation_id = auth.uid()));

-- members
CREATE POLICY "Project parties read members" ON public.project_members FOR SELECT TO authenticated
  USING (public.is_project_member(project_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Project owner manages members" ON public.project_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_members.project_id AND (p.contractor_id = auth.uid() OR p.corporation_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_members.project_id AND (p.contractor_id = auth.uid() OR p.corporation_id = auth.uid())));

-- attendance records
CREATE POLICY "Parties read attendance" ON public.attendance_records FOR SELECT TO authenticated
  USING (
    contractor_id = auth.uid() OR corporation_id = auth.uid() OR team_leader_id = auth.uid()
    OR public.has_role(auth.uid(),'admin'::public.app_role)
  );
CREATE POLICY "Team leader creates record" ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (
    team_leader_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.project_teams t WHERE t.id = attendance_records.team_id AND t.team_leader_id = auth.uid())
  );
CREATE POLICY "Team leader updates own pending record" ON public.attendance_records FOR UPDATE TO authenticated
  USING (team_leader_id = auth.uid() AND frozen_at IS NULL AND status IN ('pending','exception'))
  WITH CHECK (team_leader_id = auth.uid());
CREATE POLICY "Contractor approves attendance" ON public.attendance_records FOR UPDATE TO authenticated
  USING (contractor_id = auth.uid() AND frozen_at IS NULL)
  WITH CHECK (contractor_id = auth.uid());
CREATE POLICY "Admin manages attendance" ON public.attendance_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

-- attendance events
CREATE POLICY "Parties read events" ON public.attendance_events FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = attendance_events.record_id AND
      (r.contractor_id = auth.uid() OR r.corporation_id = auth.uid() OR r.team_leader_id = auth.uid())
    ) OR public.has_role(auth.uid(),'admin'::public.app_role)
  );
CREATE POLICY "Parties insert events" ON public.attendance_events FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = attendance_events.record_id AND
      (r.contractor_id = auth.uid() OR r.corporation_id = auth.uid() OR r.team_leader_id = auth.uid())
    )
  );

-- corrections
CREATE POLICY "Parties read corrections" ON public.attendance_corrections FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = attendance_corrections.record_id AND
      (r.contractor_id = auth.uid() OR r.corporation_id = auth.uid() OR r.team_leader_id = auth.uid())
    ) OR public.has_role(auth.uid(),'admin'::public.app_role)
  );
CREATE POLICY "Party requests correction" ON public.attendance_corrections FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid() AND
    EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = attendance_corrections.record_id AND
      (r.contractor_id = auth.uid() OR r.corporation_id = auth.uid() OR r.team_leader_id = auth.uid())
    )
  );
CREATE POLICY "Contractor decides correction" ON public.attendance_corrections FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = attendance_corrections.record_id AND r.contractor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.attendance_records r WHERE r.id = attendance_corrections.record_id AND r.contractor_id = auth.uid()));

-- 11) FREEZE TRIGGER: when status moves to approved/auto_approved, set frozen_at and lock
CREATE OR REPLACE FUNCTION public.attendance_freeze_check()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  -- block any update to a frozen record (admin can override via service role)
  IF OLD.frozen_at IS NOT NULL AND auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Attendance record is frozen. Open a correction request to change it.';
  END IF;
  -- auto-set frozen_at when status becomes terminal
  IF NEW.status IN ('approved','auto_approved','rejected') AND NEW.frozen_at IS NULL THEN
    NEW.frozen_at := now();
    IF NEW.approved_at IS NULL AND NEW.status IN ('approved','auto_approved') THEN
      NEW.approved_at := now();
    END IF;
  END IF;
  -- compute total hours/cost when end_time available
  IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.total_hours := ROUND(EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::numeric / 3600, 2);
    IF NEW.hourly_rate IS NOT NULL AND NEW.workers_actual IS NOT NULL THEN
      NEW.total_cost := ROUND(NEW.total_hours * NEW.hourly_rate * NEW.workers_actual, 2);
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_attendance_freeze ON public.attendance_records;
CREATE TRIGGER trg_attendance_freeze BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.attendance_freeze_check();

-- prevent DELETE on approved
CREATE OR REPLACE FUNCTION public.prevent_approved_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF OLD.status IN ('approved','auto_approved') AND NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Cannot delete an approved attendance record';
  END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_attendance_no_delete ON public.attendance_records;
CREATE TRIGGER trg_attendance_no_delete BEFORE DELETE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.prevent_approved_delete();

-- 12) STORAGE BUCKET for live attendance photos (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-photos','attendance-photos', false)
ON CONFLICT (id) DO NOTHING;

-- storage policies: parties to a record may read/write under {project_id}/{date}/{team_id}/...
CREATE POLICY "Parties read attendance photos" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'attendance-photos'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[1]
    AND (p.contractor_id = auth.uid() OR p.corporation_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.project_members m WHERE m.project_id = p.id AND m.user_id = auth.uid()))
  )
);
CREATE POLICY "Team leader uploads attendance photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'attendance-photos'
  AND EXISTS (
    SELECT 1 FROM public.project_teams t
    WHERE t.id::text = (storage.foldername(name))[3]
    AND t.team_leader_id = auth.uid()
  )
);

-- 13) updated_at triggers
DROP TRIGGER IF EXISTS trg_projects_updated ON public.projects;
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- realtime publication for live dashboards
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_events;

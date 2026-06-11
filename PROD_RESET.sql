-- ============================================================================
-- BuildForce — PROD CLEAN RESET  (exact copy of the working dev schema)
-- Rebuilds the entire public schema. No data. auth.users & storage untouched.
-- Run ONCE in the Supabase SQL editor. If asked, click "Run without RLS"
-- (this script enables RLS itself).
-- ============================================================================

-- 1) Wipe + recreate public schema, restore standard grants
drop schema if exists public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on routines  to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

-- 2) Enums
CREATE TYPE public.app_role AS ENUM ('contractor', 'corporation', 'admin', 'team_leader', 'site_manager');
CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');

-- 3) Tables
CREATE TABLE public.attendance_records (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL,
  team_id uuid NOT NULL,
  team_leader_id uuid NOT NULL,
  contractor_id uuid NOT NULL,
  corporation_id uuid NOT NULL,
  work_date date NOT NULL,
  workers_expected integer DEFAULT 0 NOT NULL,
  workers_actual integer,
  start_time timestamptz,
  end_time timestamptz,
  start_photo_url text,
  end_photo_url text,
  start_gps_lat numeric(9,6),
  start_gps_lng numeric(9,6),
  end_gps_lat numeric(9,6),
  end_gps_lng numeric(9,6),
  status text DEFAULT 'pending'::text NOT NULL,
  exception_reason text,
  exception_note text,
  exception_at timestamptz,
  exception_reported_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  entry_approved_at timestamptz,
  entry_approved_by uuid,
  entry_rejection_reason text,
  exit_approved_at timestamptz,
  exit_approved_by uuid,
  exit_rejection_reason text,
  rejection_reason text,
  hourly_rate numeric(10,2),
  total_hours numeric(6,2),
  total_cost numeric(12,2),
  frozen_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  auto_approved_at timestamptz,
  disputed_at timestamptz,
  disputed_by uuid,
  dispute_reason text,
  dispute_resolved_at timestamptz,
  dispute_resolved_by uuid,
  dispute_resolution_note text
);

CREATE TABLE public.audit_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.job_awards (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  request_id uuid NOT NULL,
  offer_id uuid NOT NULL,
  corporation_id uuid NOT NULL,
  awarded_by uuid NOT NULL,
  awarded_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.job_offers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  request_id uuid NOT NULL,
  corporation_id uuid NOT NULL,
  price_per_hour numeric(10,2) NOT NULL,
  available_workers integer NOT NULL,
  start_date text NOT NULL,
  response_time_hours integer DEFAULT 24 NOT NULL,
  warranty_days integer DEFAULT 30 NOT NULL,
  insurance boolean DEFAULT true NOT NULL,
  note text,
  requires_personal_guarantee boolean DEFAULT false NOT NULL,
  requires_security_check boolean DEFAULT false NOT NULL,
  status text DEFAULT 'submitted'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.job_request_contacts (
  request_id uuid NOT NULL,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.job_request_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  request_id uuid NOT NULL,
  role text NOT NULL,
  nationality text NOT NULL,
  count integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.job_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  location text NOT NULL,
  start_date text NOT NULL,
  duration text NOT NULL,
  commitment_months text NOT NULL,
  budget text,
  description text,
  status text DEFAULT 'open'::text NOT NULL,
  deadline_at timestamptz DEFAULT (now() + '48:00:00'::interval),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.profiles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  phone text,
  email text,
  company_name text,
  business_name text,
  business_id text,
  city text,
  avatar_url text,
  contractor_license_number text,
  contractor_classification text,
  license_doc_url text,
  insurance_doc_url text,
  books_cert_url text,
  is_verified boolean DEFAULT false NOT NULL,
  verification_status public.verification_status DEFAULT 'pending'::public.verification_status NOT NULL,
  admin_notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.project_teams (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL,
  name text NOT NULL,
  team_leader_id uuid NOT NULL,
  team_leader_name text,
  team_leader_phone text,
  expected_workers integer DEFAULT 1 NOT NULL,
  hourly_rate numeric(10,2),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.projects (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  address text,
  contractor_id uuid NOT NULL,
  corporation_id uuid NOT NULL,
  source_request_id uuid,
  source_award_id uuid,
  start_date date DEFAULT CURRENT_DATE NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  expected_workers integer DEFAULT 0 NOT NULL,
  hourly_rate numeric(10,2),
  site_lat numeric,
  site_lng numeric,
  site_radius_meters integer DEFAULT 200 NOT NULL,
  site_manager_name text,
  site_manager_phone text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.user_roles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 4) Constraints
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.job_requests ADD CONSTRAINT job_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.job_requests ADD CONSTRAINT job_requests_status_chk CHECK ((status = ANY (ARRAY['open'::text, 'awarded'::text, 'closed'::text, 'cancelled'::text])));
ALTER TABLE public.job_request_items ADD CONSTRAINT job_request_items_count_check CHECK ((count > 0));
ALTER TABLE public.job_request_items ADD CONSTRAINT job_request_items_pkey PRIMARY KEY (id);
ALTER TABLE public.job_request_items ADD CONSTRAINT job_request_items_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.job_requests(id) ON DELETE CASCADE;
ALTER TABLE public.job_request_contacts ADD CONSTRAINT job_request_contacts_pkey PRIMARY KEY (request_id);
ALTER TABLE public.job_request_contacts ADD CONSTRAINT job_request_contacts_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.job_requests(id) ON DELETE CASCADE;
ALTER TABLE public.job_offers ADD CONSTRAINT job_offers_price_per_hour_check CHECK ((price_per_hour > (0)::numeric));
ALTER TABLE public.job_offers ADD CONSTRAINT job_offers_available_workers_check CHECK ((available_workers > 0));
ALTER TABLE public.job_offers ADD CONSTRAINT job_offers_pkey PRIMARY KEY (id);
ALTER TABLE public.job_offers ADD CONSTRAINT job_offers_request_id_corporation_id_key UNIQUE (request_id, corporation_id);
ALTER TABLE public.job_offers ADD CONSTRAINT job_offers_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.job_requests(id) ON DELETE CASCADE;
ALTER TABLE public.job_offers ADD CONSTRAINT job_offers_status_chk CHECK ((status = ANY (ARRAY['submitted'::text, 'withdrawn'::text, 'awarded'::text, 'rejected'::text])));
ALTER TABLE public.job_awards ADD CONSTRAINT job_awards_pkey PRIMARY KEY (id);
ALTER TABLE public.job_awards ADD CONSTRAINT job_awards_request_id_key UNIQUE (request_id);
ALTER TABLE public.job_awards ADD CONSTRAINT job_awards_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.job_requests(id) ON DELETE CASCADE;
ALTER TABLE public.job_awards ADD CONSTRAINT job_awards_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.job_offers(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD CONSTRAINT projects_pkey PRIMARY KEY (id);
ALTER TABLE public.projects ADD CONSTRAINT projects_status_chk CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'completed'::text])));
ALTER TABLE public.project_teams ADD CONSTRAINT project_teams_pkey PRIMARY KEY (id);
ALTER TABLE public.project_teams ADD CONSTRAINT project_teams_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);
ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_team_id_work_date_key UNIQUE (team_id, work_date);
ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.project_teams(id) ON DELETE CASCADE;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);

-- 5) Indexes
CREATE INDEX idx_user_roles_user_role ON public.user_roles USING btree (user_id, role);
CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);
CREATE INDEX idx_profiles_verification ON public.profiles USING btree (verification_status);
CREATE INDEX idx_job_requests_user_id ON public.job_requests USING btree (user_id, created_at DESC);
CREATE INDEX idx_job_requests_open_deadline ON public.job_requests USING btree (created_at DESC, deadline_at) WHERE (status = 'open'::text);
CREATE INDEX idx_job_requests_status ON public.job_requests USING btree (status, deadline_at);
CREATE INDEX idx_job_request_items_request_id ON public.job_request_items USING btree (request_id);
CREATE INDEX idx_job_offers_request_id ON public.job_offers USING btree (request_id);
CREATE INDEX idx_job_offers_corporation_id ON public.job_offers USING btree (corporation_id);
CREATE INDEX idx_job_offers_corp_updated ON public.job_offers USING btree (corporation_id, updated_at DESC);
CREATE INDEX idx_job_offers_status ON public.job_offers USING btree (status);
CREATE INDEX idx_job_awards_request_id ON public.job_awards USING btree (request_id);
CREATE INDEX idx_job_awards_corporation_id ON public.job_awards USING btree (corporation_id);
CREATE INDEX idx_projects_contractor_id ON public.projects USING btree (contractor_id);
CREATE INDEX idx_projects_corporation_id ON public.projects USING btree (corporation_id);
CREATE INDEX idx_project_teams_project_id ON public.project_teams USING btree (project_id);
CREATE INDEX idx_project_teams_leader_id ON public.project_teams USING btree (team_leader_id);
CREATE INDEX idx_attendance_project_date ON public.attendance_records USING btree (project_id, work_date DESC);
CREATE INDEX idx_attendance_team_date ON public.attendance_records USING btree (team_id, work_date DESC);
CREATE INDEX idx_attendance_contractor ON public.attendance_records USING btree (contractor_id, work_date DESC);
CREATE INDEX idx_attendance_corporation ON public.attendance_records USING btree (corporation_id, work_date DESC);
CREATE INDEX idx_attendance_team_leader ON public.attendance_records USING btree (team_leader_id, work_date DESC);
CREATE INDEX idx_attendance_status_unfrozen ON public.attendance_records USING btree (status) WHERE (frozen_at IS NULL);
CREATE INDEX idx_audit_log_actor_date ON public.audit_log USING btree (actor_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON public.audit_log USING btree (entity_type, entity_id, created_at DESC);

-- 6) Functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$function$;

CREATE OR REPLACE FUNCTION public.has_bid_on_request(_request_id uuid, _corporation_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.job_offers WHERE request_id = _request_id AND corporation_id = _corporation_id)
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_job_award()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.job_requests SET status = 'awarded', updated_at = now() WHERE id = NEW.request_id;
  UPDATE public.job_offers SET status = 'awarded', updated_at = now() WHERE id = NEW.offer_id;
  UPDATE public.job_offers SET status = 'rejected', updated_at = now()
    WHERE request_id = NEW.request_id AND id <> NEW.offer_id AND status = 'submitted';
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_job_request_closed()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('closed', 'cancelled') AND OLD.status = 'open' THEN
    UPDATE public.job_offers SET status = 'rejected', updated_at = now()
      WHERE request_id = NEW.id AND status = 'submitted';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_user_bootstrap()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid   uuid := auth.uid();
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  INSERT INTO public.profiles (user_id, full_name, email, verification_status)
  VALUES (v_uid, split_part(v_email, '@', 1), v_email, 'pending')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'contractor') ON CONFLICT (user_id, role) DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_own_role(_role text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _role NOT IN ('contractor', 'corporation') THEN
    RAISE EXCEPTION 'Invalid role: must be contractor or corporation';
  END IF;
  DELETE FROM public.user_roles
  WHERE user_id = auth.uid() AND role IN ('contractor'::public.app_role, 'corporation'::public.app_role);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), _role::public.app_role) ON CONFLICT (user_id, role) DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
  v_name text;
BEGIN
  v_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'),      ''),
    split_part(NEW.email, '@', 1));
  INSERT INTO public.profiles (
    user_id, full_name, phone, email, company_name, business_name, business_id, city,
    contractor_license_number, contractor_classification, verification_status)
  VALUES (
    NEW.id, v_name, NEW.raw_user_meta_data->>'phone', NEW.email,
    NEW.raw_user_meta_data->>'company_name', NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'business_id', NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'contractor_license_number',
    NEW.raw_user_meta_data->>'contractor_classification',
    'pending'::public.verification_status)
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN NULLIF(trim(public.profiles.full_name), '') IS NULL
                THEN EXCLUDED.full_name ELSE public.profiles.full_name END;
  -- The designated admin account: admin-only + approved, no contractor role.
  IF lower(NEW.email) = 'bbuildforceprime@gmail.com' THEN
    UPDATE public.profiles SET verification_status = 'approved', is_verified = true WHERE user_id = NEW.id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role) ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
  END IF;
  v_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' IN ('contractor', 'corporation')
    THEN (NEW.raw_user_meta_data->>'role')::public.app_role
    ELSE 'contractor'::public.app_role END;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role) ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- 7) Enable RLS
ALTER TABLE public.attendance_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_awards            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_offers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_request_contacts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_request_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles            ENABLE ROW LEVEL SECURITY;

-- 8) Policies
CREATE POLICY "audit_select_admin" ON public.audit_log AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "audit_select_own" ON public.audit_log AS PERMISSIVE FOR SELECT TO authenticated USING ((actor_id = auth.uid()));
CREATE POLICY "awards_insert" ON public.job_awards AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((awarded_by = auth.uid()) AND (EXISTS ( SELECT 1 FROM job_requests jr WHERE ((jr.id = job_awards.request_id) AND (jr.user_id = auth.uid()) AND (jr.status = 'open'::text)))) AND (EXISTS ( SELECT 1 FROM job_offers o WHERE ((o.id = job_awards.offer_id) AND (o.request_id = job_awards.request_id) AND (o.corporation_id = job_awards.corporation_id) AND (o.status = 'submitted'::text))))));
CREATE POLICY "awards_select_admin" ON public.job_awards AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "awards_select_owner" ON public.job_awards AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM job_requests jr WHERE ((jr.id = job_awards.request_id) AND (jr.user_id = auth.uid())))));
CREATE POLICY "awards_select_winner" ON public.job_awards AS PERMISSIVE FOR SELECT TO authenticated USING ((corporation_id = auth.uid()));
CREATE POLICY "offers_insert" ON public.job_offers AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((corporation_id = auth.uid()) AND has_role(auth.uid(), 'corporation'::app_role) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.user_id = auth.uid()) AND (p.verification_status = 'approved'::verification_status)))) AND (EXISTS ( SELECT 1 FROM job_requests jr WHERE ((jr.id = job_offers.request_id) AND (jr.status = 'open'::text))))));
CREATE POLICY "offers_select_admin" ON public.job_offers AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "offers_select_own_corp" ON public.job_offers AS PERMISSIVE FOR SELECT TO authenticated USING ((corporation_id = auth.uid()));
CREATE POLICY "offers_select_owner" ON public.job_offers AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM job_requests jr WHERE ((jr.id = job_offers.request_id) AND (jr.user_id = auth.uid())))));
CREATE POLICY "offers_update" ON public.job_offers AS PERMISSIVE FOR UPDATE TO authenticated USING (((corporation_id = auth.uid()) AND (status = 'submitted'::text))) WITH CHECK ((corporation_id = auth.uid()));
CREATE POLICY "contacts_insert" ON public.job_request_contacts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1 FROM job_requests jr WHERE ((jr.id = job_request_contacts.request_id) AND (jr.user_id = auth.uid())))));
CREATE POLICY "contacts_select_admin" ON public.job_request_contacts AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "contacts_select_owner" ON public.job_request_contacts AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM job_requests jr WHERE ((jr.id = job_request_contacts.request_id) AND (jr.user_id = auth.uid())))));
CREATE POLICY "contacts_select_winner" ON public.job_request_contacts AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM job_awards a WHERE ((a.request_id = job_request_contacts.request_id) AND (a.corporation_id = auth.uid())))));
CREATE POLICY "contacts_update" ON public.job_request_contacts AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM job_requests jr WHERE ((jr.id = job_request_contacts.request_id) AND (jr.user_id = auth.uid())))));
CREATE POLICY "items_delete" ON public.job_request_items AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1 FROM job_requests jr WHERE ((jr.id = job_request_items.request_id) AND (jr.user_id = auth.uid())))));
CREATE POLICY "items_insert" ON public.job_request_items AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1 FROM job_requests jr WHERE ((jr.id = job_request_items.request_id) AND (jr.user_id = auth.uid())))));
CREATE POLICY "items_select" ON public.job_request_items AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1 FROM job_requests jr WHERE ((jr.id = job_request_items.request_id) AND (jr.user_id = auth.uid())))) OR (EXISTS ( SELECT 1 FROM job_offers o WHERE ((o.request_id = job_request_items.request_id) AND (o.corporation_id = auth.uid())))) OR (EXISTS ( SELECT 1 FROM job_requests jr WHERE ((jr.id = job_request_items.request_id) AND (jr.status = 'open'::text)))) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "items_update" ON public.job_request_items AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM job_requests jr WHERE ((jr.id = job_request_items.request_id) AND (jr.user_id = auth.uid())))));
CREATE POLICY "Admins can view all job requests" ON public.job_requests AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view open job requests" ON public.job_requests AS PERMISSIVE FOR SELECT TO authenticated USING ((status = 'open'::text));
CREATE POLICY "Bidding corps can view requests they bid on" ON public.job_requests AS PERMISSIVE FOR SELECT TO authenticated USING (has_bid_on_request(id, auth.uid()));
CREATE POLICY "Owners can view own job requests" ON public.job_requests AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "req_delete_own" ON public.job_requests AS PERMISSIVE FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "req_insert_own" ON public.job_requests AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "req_update_admin" ON public.job_requests AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "req_update_own" ON public.job_requests AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "profiles_select_admin" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "profiles_select_own" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "profiles_update_own" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "projects_insert" ON public.projects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((contractor_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "projects_select" ON public.projects AS PERMISSIVE FOR SELECT TO authenticated USING (((contractor_id = auth.uid()) OR (corporation_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1 FROM project_teams t WHERE ((t.project_id = projects.id) AND (t.team_leader_id = auth.uid()))))));
CREATE POLICY "projects_update" ON public.projects AS PERMISSIVE FOR UPDATE TO authenticated USING (((contractor_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK (((contractor_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "user_roles_select_admin" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "user_roles_select_own" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));

-- 9) Triggers
CREATE TRIGGER on_job_awarded AFTER INSERT ON public.job_awards FOR EACH ROW EXECUTE FUNCTION handle_job_award();
CREATE TRIGGER on_job_request_closed AFTER UPDATE OF status ON public.job_requests FOR EACH ROW WHEN ((old.status IS DISTINCT FROM new.status)) EXECUTE FUNCTION handle_job_request_closed();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 10) Function grants
GRANT EXECUTE ON FUNCTION public.handle_job_request_closed TO service_role;
GRANT EXECUTE ON FUNCTION public.has_bid_on_request TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_job_award TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_user_bootstrap TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user TO service_role;
GRANT EXECUTE ON FUNCTION public.set_own_role TO authenticated, service_role;

-- 11) Table grants + reload PostgREST
GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES  IN SCHEMA public TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';

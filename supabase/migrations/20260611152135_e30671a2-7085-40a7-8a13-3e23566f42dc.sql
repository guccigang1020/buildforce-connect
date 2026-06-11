-- ============================================================
-- BuildForce — PROD CLEAN RESET (schema only, no data)
-- Rebuilds the entire public schema to match the working app.
-- Run this whole file ONCE in the Supabase SQL editor.
-- It does NOT touch auth.users / storage — existing logins survive.
-- ============================================================

-- 1) Wipe and recreate the public schema, restore standard Supabase grants
drop schema if exists public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables    in schema public to postgres, anon, authenticated, service_role;
grant all on all routines  in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on routines  to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

-- ============================================================
-- 2) FULL SCHEMA (tables, enums, functions, triggers, RLS)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'contractor', 'corporation', 'admin', 'team_leader', 'site_manager'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'team_leader';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'site_manager';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── user_roles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  created_at timestamptz     NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- ── profiles ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                        uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid                      NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name                 text                      NOT NULL,
  phone                     text,
  email                     text,
  company_name              text,
  business_name             text,
  business_id               text,
  city                      text,
  avatar_url                text,
  contractor_license_number text,
  contractor_classification text,
  license_doc_url           text,
  insurance_doc_url         text,
  books_cert_url            text,
  is_verified               boolean                   NOT NULL DEFAULT false,
  verification_status       public.verification_status NOT NULL DEFAULT 'pending',
  admin_notes               text,
  created_at                timestamptz               NOT NULL DEFAULT now(),
  updated_at                timestamptz               NOT NULL DEFAULT now()
);

-- ── job_requests ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_requests (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL,
  location          text        NOT NULL,
  start_date        text        NOT NULL,
  duration          text        NOT NULL,
  commitment_months text        NOT NULL,
  budget            text,
  description       text,
  status            text        NOT NULL DEFAULT 'open',
  deadline_at       timestamptz DEFAULT (now() + interval '48 hours'),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.job_requests
    ADD CONSTRAINT job_requests_status_chk
    CHECK (status IN ('open','awarded','closed','cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.job_request_items (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid    NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  role       text    NOT NULL,
  nationality text   NOT NULL,
  count      integer NOT NULL CHECK (count > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_request_contacts (
  request_id    uuid PRIMARY KEY REFERENCES public.job_requests(id) ON DELETE CASCADE,
  contact_name  text NOT NULL,
  contact_phone text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_offers (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id                  uuid          NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  corporation_id              uuid          NOT NULL,
  price_per_hour              numeric(10,2) NOT NULL CHECK (price_per_hour > 0),
  available_workers           integer       NOT NULL CHECK (available_workers > 0),
  start_date                  text          NOT NULL,
  response_time_hours         integer       NOT NULL DEFAULT 24,
  warranty_days               integer       NOT NULL DEFAULT 30,
  insurance                   boolean       NOT NULL DEFAULT true,
  note                        text,
  requires_personal_guarantee boolean       NOT NULL DEFAULT false,
  requires_security_check     boolean       NOT NULL DEFAULT false,
  status                      text          NOT NULL DEFAULT 'submitted',
  created_at                  timestamptz   NOT NULL DEFAULT now(),
  updated_at                  timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (request_id, corporation_id)
);

DO $$ BEGIN
  ALTER TABLE public.job_offers
    ADD CONSTRAINT job_offers_status_chk
    CHECK (status IN ('submitted','withdrawn','awarded','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.job_awards (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id     uuid        NOT NULL UNIQUE REFERENCES public.job_requests(id) ON DELETE CASCADE,
  offer_id       uuid        NOT NULL REFERENCES public.job_offers(id) ON DELETE CASCADE,
  corporation_id uuid        NOT NULL,
  awarded_by     uuid        NOT NULL,
  awarded_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text          NOT NULL,
  address            text,
  contractor_id      uuid          NOT NULL,
  corporation_id     uuid          NOT NULL,
  source_request_id  uuid,
  source_award_id    uuid,
  start_date         date          NOT NULL DEFAULT CURRENT_DATE,
  status             text          NOT NULL DEFAULT 'active',
  expected_workers   integer       NOT NULL DEFAULT 0,
  hourly_rate        numeric(10,2),
  site_lat           numeric,
  site_lng           numeric,
  site_radius_meters integer       NOT NULL DEFAULT 200,
  site_manager_name  text,
  site_manager_phone text,
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.projects
    ADD CONSTRAINT projects_status_chk
    CHECK (status IN ('active','paused','completed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.project_teams (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid          NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name              text          NOT NULL,
  team_leader_id    uuid          NOT NULL,
  team_leader_name  text,
  team_leader_phone text,
  expected_workers  integer       NOT NULL DEFAULT 1,
  hourly_rate       numeric(10,2),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id                     uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id             uuid          NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  team_id                uuid          NOT NULL REFERENCES public.project_teams(id) ON DELETE CASCADE,
  team_leader_id         uuid          NOT NULL,
  contractor_id          uuid          NOT NULL,
  corporation_id         uuid          NOT NULL,
  work_date              date          NOT NULL,
  workers_expected       integer       NOT NULL DEFAULT 0,
  workers_actual         integer,
  start_time             timestamptz,
  end_time               timestamptz,
  start_photo_url        text,
  end_photo_url          text,
  start_gps_lat          numeric(9,6),
  start_gps_lng          numeric(9,6),
  end_gps_lat            numeric(9,6),
  end_gps_lng            numeric(9,6),
  status                 text          NOT NULL DEFAULT 'pending',
  exception_reason       text,
  exception_note         text,
  exception_at           timestamptz,
  exception_reported_by  uuid,
  approved_by            uuid,
  approved_at            timestamptz,
  entry_approved_at      timestamptz,
  entry_approved_by      uuid,
  entry_rejection_reason text,
  exit_approved_at       timestamptz,
  exit_approved_by       uuid,
  exit_rejection_reason  text,
  rejection_reason       text,
  hourly_rate            numeric(10,2),
  total_hours            numeric(6,2),
  total_cost             numeric(12,2),
  frozen_at              timestamptz,
  created_at             timestamptz   NOT NULL DEFAULT now(),
  updated_at             timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (team_id, work_date)
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid,
  action      text        NOT NULL,
  entity_type text        NOT NULL,
  entity_id   uuid,
  metadata    jsonb,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_request_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_request_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_offers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_awards           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log            ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_job_award()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.job_requests
    SET status = 'awarded', updated_at = now()
    WHERE id = NEW.request_id;
  UPDATE public.job_offers
    SET status = 'awarded', updated_at = now()
    WHERE id = NEW.offer_id;
  UPDATE public.job_offers
    SET status = 'rejected', updated_at = now()
    WHERE request_id = NEW.request_id
      AND id <> NEW.offer_id
      AND status = 'submitted';
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_job_award() FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS on_job_award   ON public.job_awards;
  DROP TRIGGER IF EXISTS on_job_awarded ON public.job_awards;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE TRIGGER on_job_awarded
  AFTER INSERT ON public.job_awards
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_job_award();

CREATE OR REPLACE FUNCTION public.handle_job_request_closed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('closed', 'cancelled') AND OLD.status = 'open' THEN
    UPDATE public.job_offers
      SET status = 'rejected', updated_at = now()
      WHERE request_id = NEW.id
        AND status = 'submitted';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_job_request_closed() FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS on_job_request_closed ON public.job_requests;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE TRIGGER on_job_request_closed
  AFTER UPDATE OF status ON public.job_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_job_request_closed();

-- RLS Policies
CREATE POLICY "req_select_own" ON public.job_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "req_select_open" ON public.job_requests FOR SELECT TO authenticated USING (status = 'open');
CREATE POLICY "req_select_bidding_corp" ON public.job_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_offers o WHERE o.request_id = job_requests.id AND o.corporation_id = auth.uid()));
CREATE POLICY "req_select_admin" ON public.job_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "req_insert_own" ON public.job_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "req_update_own" ON public.job_requests FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "req_update_admin" ON public.job_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "req_delete_own" ON public.job_requests FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "items_select" ON public.job_request_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.job_offers o WHERE o.request_id = job_request_items.request_id AND o.corporation_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.status = 'open')
    OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "items_insert" ON public.job_request_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid()));
CREATE POLICY "items_update" ON public.job_request_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid()));
CREATE POLICY "items_delete" ON public.job_request_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid()));

CREATE POLICY "contacts_select_owner" ON public.job_request_contacts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = job_request_contacts.request_id AND jr.user_id = auth.uid()));
CREATE POLICY "contacts_select_winner" ON public.job_request_contacts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_awards a WHERE a.request_id = job_request_contacts.request_id AND a.corporation_id = auth.uid()));
CREATE POLICY "contacts_select_admin" ON public.job_request_contacts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "contacts_insert" ON public.job_request_contacts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = job_request_contacts.request_id AND jr.user_id = auth.uid()));
CREATE POLICY "contacts_update" ON public.job_request_contacts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = job_request_contacts.request_id AND jr.user_id = auth.uid()));

CREATE POLICY "offers_select_owner" ON public.job_offers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid()));
CREATE POLICY "offers_select_own_corp" ON public.job_offers FOR SELECT TO authenticated USING (corporation_id = auth.uid());
CREATE POLICY "offers_select_admin" ON public.job_offers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "offers_insert" ON public.job_offers FOR INSERT TO authenticated
  WITH CHECK (corporation_id = auth.uid() AND public.has_role(auth.uid(), 'corporation')
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.verification_status = 'approved')
    AND EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.status = 'open'));
CREATE POLICY "offers_update" ON public.job_offers FOR UPDATE TO authenticated
  USING (corporation_id = auth.uid() AND status = 'submitted') WITH CHECK (corporation_id = auth.uid());

CREATE POLICY "awards_select_owner" ON public.job_awards FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid()));
CREATE POLICY "awards_select_winner" ON public.job_awards FOR SELECT TO authenticated USING (corporation_id = auth.uid());
CREATE POLICY "awards_select_admin" ON public.job_awards FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "awards_insert" ON public.job_awards FOR INSERT TO authenticated
  WITH CHECK (awarded_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = job_awards.request_id AND jr.user_id = auth.uid() AND jr.status = 'open')
    AND EXISTS (SELECT 1 FROM public.job_offers o WHERE o.id = job_awards.offer_id AND o.request_id = job_awards.request_id AND o.corporation_id = job_awards.corporation_id AND o.status = 'submitted'));

CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated
  USING (contractor_id = auth.uid() OR corporation_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.project_teams t WHERE t.project_id = projects.id AND t.team_leader_id = auth.uid()));
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (contractor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated
  USING (contractor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (contractor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "audit_select_admin" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "audit_select_own" ON public.audit_log FOR SELECT TO authenticated USING (actor_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles (user_id, role);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_verification ON public.profiles (verification_status);
CREATE INDEX IF NOT EXISTS idx_job_requests_user_id ON public.job_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_requests_open_deadline ON public.job_requests (created_at DESC, deadline_at) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_job_requests_status ON public.job_requests (status, deadline_at);
CREATE INDEX IF NOT EXISTS idx_job_request_items_request_id ON public.job_request_items (request_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_request_id ON public.job_offers (request_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_corporation_id ON public.job_offers (corporation_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_corp_updated ON public.job_offers (corporation_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_offers_status ON public.job_offers (status);
CREATE INDEX IF NOT EXISTS idx_job_awards_request_id ON public.job_awards (request_id);
CREATE INDEX IF NOT EXISTS idx_job_awards_corporation_id ON public.job_awards (corporation_id);
CREATE INDEX IF NOT EXISTS idx_projects_contractor_id ON public.projects (contractor_id);
CREATE INDEX IF NOT EXISTS idx_projects_corporation_id ON public.projects (corporation_id);
CREATE INDEX IF NOT EXISTS idx_project_teams_project_id ON public.project_teams (project_id);
CREATE INDEX IF NOT EXISTS idx_project_teams_leader_id ON public.project_teams (team_leader_id);
CREATE INDEX IF NOT EXISTS idx_attendance_project_date ON public.attendance_records (project_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_team_date ON public.attendance_records (team_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_contractor ON public.attendance_records (contractor_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_corporation ON public.attendance_records (corporation_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_team_leader ON public.attendance_records (team_leader_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_status_unfrozen ON public.attendance_records (status) WHERE frozen_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_date ON public.audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log (entity_type, entity_id, created_at DESC);

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_role public.app_role;
  v_name text;
BEGIN
  v_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'),      ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (
    user_id, full_name, phone, email,
    company_name, business_name, business_id, city,
    contractor_license_number, contractor_classification,
    verification_status
  )
  VALUES (
    NEW.id, v_name,
    NEW.raw_user_meta_data->>'phone',
    NEW.email,
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'business_id',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'contractor_license_number',
    NEW.raw_user_meta_data->>'contractor_classification',
    'pending'::public.verification_status
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE
      WHEN NULLIF(trim(public.profiles.full_name), '') IS NULL THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END;

  IF lower(NEW.email) = 'bbuildforceprime@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  v_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' IN ('contractor', 'corporation')
    THEN (NEW.raw_user_meta_data->>'role')::public.app_role
    ELSE 'contractor'::public.app_role
  END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- set_own_role
CREATE OR REPLACE FUNCTION public.set_own_role(_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _role NOT IN ('contractor', 'corporation') THEN
    RAISE EXCEPTION 'Invalid role: must be contractor or corporation';
  END IF;
  DELETE FROM public.user_roles
  WHERE user_id = auth.uid()
    AND role IN ('contractor'::public.app_role, 'corporation'::public.app_role);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), _role::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_own_role(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.set_own_role(text) TO authenticated;

-- has_bid_on_request helper
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_bid_on_request(_request_id uuid, _corporation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.job_offers WHERE request_id = _request_id AND corporation_id = _corporation_id)
$$;
REVOKE EXECUTE ON FUNCTION public.has_bid_on_request(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_bid_on_request(uuid, uuid) TO authenticated;

-- profiles: owner + admin SELECT, owner UPDATE
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY profiles_select_admin ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_roles policies
CREATE POLICY user_roles_select_own ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_roles_select_admin ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Role separation
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon;

CREATE OR REPLACE FUNCTION public.ensure_user_bootstrap()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _meta jsonb;
  _role text;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  SELECT raw_user_meta_data INTO _meta FROM auth.users WHERE id = _uid;
  INSERT INTO public.profiles (user_id, full_name, phone, company_name, city)
  SELECT _uid, COALESCE(_meta->>'full_name', ''), _meta->>'phone', _meta->>'company_name', _meta->>'city'
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _uid);
  _role := _meta->>'role';
  IF _role IN ('contractor', 'corporation')
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, _role::public.app_role) ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_user_bootstrap() TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_one_role_per_user ON public.user_roles (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS job_offers_one_active_bid_per_corp
  ON public.job_offers (request_id, corporation_id) WHERE status <> 'withdrawn';

-- ============================================================
-- Step 2: Create the auth user bbuildforceprime@gmail.com
-- ============================================================
DELETE FROM auth.users WHERE lower(email) <> 'bbuildforceprime@gmail.com';

DO $$
DECLARE _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = 'bbuildforceprime@gmail.com';
  IF _uid IS NULL THEN
    _uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', _uid, 'authenticated', 'authenticated',
      'bbuildforceprime@gmail.com',
      crypt('Admin@Buildforce2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name','BuildForce Admin'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), _uid, _uid::text,
      jsonb_build_object('sub', _uid::text, 'email', 'bbuildforceprime@gmail.com', 'email_verified', true),
      'email', now(), now(), now()
    );
  ELSE
    UPDATE auth.users
      SET encrypted_password = crypt('Admin@Buildforce2026!', gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          updated_at = now()
      WHERE id = _uid;
  END IF;
END $$;

-- ============================================================
-- Step 3: ADMIN_SETUP.sql — make the user the single admin
-- ============================================================
DO $$
DECLARE _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = 'bbuildforceprime@gmail.com';
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'auth user bbuildforceprime@gmail.com not found';
  END IF;

  INSERT INTO public.profiles (user_id, full_name, verification_status, is_verified)
  VALUES (_uid, 'מנהל מערכת BuildForce', 'approved', true)
  ON CONFLICT (user_id) DO UPDATE
    SET verification_status = 'approved', is_verified = true;

  DELETE FROM public.user_roles WHERE user_id = _uid;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin');
END $$;
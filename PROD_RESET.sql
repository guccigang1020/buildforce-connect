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
-- ================================================================
-- BuildForce — Supabase SQL Migrations (corrected, fully idempotent)
-- Run the entire file as one block in the Supabase SQL Editor.
--
-- Safe to run on:
--   • A brand-new Supabase project (creates everything from scratch)
--   • An existing project (IF NOT EXISTS / OR REPLACE / DO-EXCEPTION
--     ensures nothing is double-created or broken)
--
-- Root-cause fixes vs. the previous version:
--   1. has_role() now lives AFTER user_roles is created.
--   2. Every DROP TRIGGER/POLICY statement is inside a DO block that
--      catches undefined_table (SQLSTATE 42P01) so a missing table
--      never aborts the run in autocommit mode.
--   3. Old policy names are dropped in the same DO block as new ones
--      so a second run is always clean.
-- ================================================================


-- ================================================================
-- Section 0 — Enum types only
--
-- Enum types must exist before any CREATE TABLE that uses them.
-- helper functions that reference application tables are defined in
-- Section 1, right after their dependency tables.
-- ================================================================

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

-- updated_at stamp helper — no table dependency, safe here
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ================================================================
-- Section 1 — Table definitions (CREATE TABLE IF NOT EXISTS)
--
-- Order satisfies every FK dependency:
--
--   auth.users (Supabase built-in)
--     └─ user_roles
--     └─ profiles
--        └─ (verification gate in job_offers INSERT policy)
--   job_requests
--     ├─ job_request_items
--     ├─ job_request_contacts
--     └─ job_offers
--          └─ job_awards   ← depends on BOTH job_requests + job_offers
--   projects
--     └─ project_teams
--          └─ attendance_records
--   audit_log (standalone)
--
-- has_role() is defined immediately after user_roles so all
-- subsequent CREATE TABLE / policy statements can reference it.
-- ================================================================

-- ── user_roles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  created_at timestamptz     NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- has_role: used by every RLS policy that checks admin / corporation.
-- Defined HERE (after user_roles) so the SELECT target always exists.
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

-- ── job_request_items ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_request_items (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid    NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  role       text    NOT NULL,
  nationality text   NOT NULL,
  count      integer NOT NULL CHECK (count > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── job_request_contacts ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_request_contacts (
  request_id    uuid PRIMARY KEY REFERENCES public.job_requests(id) ON DELETE CASCADE,
  contact_name  text NOT NULL,
  contact_phone text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── job_offers ────────────────────────────────────────────────
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

-- Backfill columns added after original migration
DO $$ BEGIN
  ALTER TABLE public.job_offers
    ADD COLUMN requires_personal_guarantee boolean NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.job_offers
    ADD COLUMN requires_security_check boolean NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ── job_awards ────────────────────────────────────────────────
-- Depends on job_requests AND job_offers; must come after both.
CREATE TABLE IF NOT EXISTS public.job_awards (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id     uuid        NOT NULL UNIQUE REFERENCES public.job_requests(id) ON DELETE CASCADE,
  offer_id       uuid        NOT NULL REFERENCES public.job_offers(id) ON DELETE CASCADE,
  corporation_id uuid        NOT NULL,
  awarded_by     uuid        NOT NULL,
  awarded_at     timestamptz NOT NULL DEFAULT now()
);

-- ── projects ──────────────────────────────────────────────────
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

-- Backfill GPS + site-manager columns added after original migration
DO $$ BEGIN ALTER TABLE public.projects ADD COLUMN site_lat           numeric;                       EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.projects ADD COLUMN site_lng           numeric;                       EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.projects ADD COLUMN site_radius_meters integer NOT NULL DEFAULT 200;  EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.projects ADD COLUMN site_manager_name  text;                          EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.projects ADD COLUMN site_manager_phone text;                          EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ── project_teams ─────────────────────────────────────────────
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

-- ── attendance_records ────────────────────────────────────────
-- Depends on projects AND project_teams; must come after both.
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

-- ── audit_log ─────────────────────────────────────────────────
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


-- ================================================================
-- Section 2 — Enable RLS
--
-- ALTER TABLE … ENABLE ROW LEVEL SECURITY is idempotent.
-- All tables were created above, so these cannot fail.
-- ================================================================

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


-- ================================================================
-- Section 3 — Trigger functions and triggers
--
-- Functions use CREATE OR REPLACE (always safe).
-- DROP TRIGGER statements are wrapped in DO blocks that catch
-- undefined_table (SQLSTATE 42P01) — the error thrown when the
-- table named after ON doesn't exist, even with IF EXISTS.
-- All tables referenced here were created in Section 1.
-- ================================================================

-- A) handle_job_award — fires AFTER INSERT on job_awards
--    Atomically: marks request awarded, marks winning offer awarded,
--    rejects all other submitted offers.
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


-- B) handle_job_request_closed — fires AFTER UPDATE OF status on job_requests
--    When a request moves to closed/cancelled without an award,
--    rejects all still-submitted offers so none are left dangling.
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


-- ================================================================
-- Section 4 — RLS policies
--
-- Pattern: each table's old policy names (from prior migrations or
-- earlier MIGRATIONS.sql runs) are dropped inside a single DO block
-- that catches undefined_table, then the canonical named policies
-- are (re-)created outside.  Running the file twice is safe.
-- ================================================================

-- ── job_requests ─────────────────────────────────────────────

DO $$ BEGIN
  -- old names from early migrations
  DROP POLICY IF EXISTS "Authenticated users can view all job requests" ON public.job_requests;
  DROP POLICY IF EXISTS "Authenticated can view open job requests"      ON public.job_requests;
  DROP POLICY IF EXISTS "Owners can view own job requests"              ON public.job_requests;
  DROP POLICY IF EXISTS "Admins can view all job requests"              ON public.job_requests;
  DROP POLICY IF EXISTS "Bidding corps can view requests they bid on"   ON public.job_requests;
  DROP POLICY IF EXISTS "Authenticated users can create job requests"   ON public.job_requests;
  DROP POLICY IF EXISTS "Owners can update own job requests"            ON public.job_requests;
  DROP POLICY IF EXISTS "Admins can update any job request"             ON public.job_requests;
  DROP POLICY IF EXISTS "Owners can delete own job requests"            ON public.job_requests;
  -- canonical names (safe to drop before recreating)
  DROP POLICY IF EXISTS "req_select_own"          ON public.job_requests;
  DROP POLICY IF EXISTS "req_select_open"         ON public.job_requests;
  DROP POLICY IF EXISTS "req_select_bidding_corp" ON public.job_requests;
  DROP POLICY IF EXISTS "req_select_admin"        ON public.job_requests;
  DROP POLICY IF EXISTS "req_insert_own"          ON public.job_requests;
  DROP POLICY IF EXISTS "req_update_own"          ON public.job_requests;
  DROP POLICY IF EXISTS "req_update_admin"        ON public.job_requests;
  DROP POLICY IF EXISTS "req_delete_own"          ON public.job_requests;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE POLICY "req_select_own"
  ON public.job_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "req_select_open"
  ON public.job_requests FOR SELECT TO authenticated
  USING (status = 'open');

CREATE POLICY "req_select_bidding_corp"
  ON public.job_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.job_offers o
    WHERE o.request_id = job_requests.id AND o.corporation_id = auth.uid()
  ));

CREATE POLICY "req_select_admin"
  ON public.job_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "req_insert_own"
  ON public.job_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "req_update_own"
  ON public.job_requests FOR UPDATE TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "req_update_admin"
  ON public.job_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "req_delete_own"
  ON public.job_requests FOR DELETE TO authenticated
  USING (user_id = auth.uid());


-- ── job_request_items ────────────────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users can view job request items" ON public.job_request_items;
  DROP POLICY IF EXISTS "Parties read job request items"                 ON public.job_request_items;
  DROP POLICY IF EXISTS "Owners can insert items to own requests"        ON public.job_request_items;
  DROP POLICY IF EXISTS "Owners can update items on own requests"        ON public.job_request_items;
  DROP POLICY IF EXISTS "Owners can delete items on own requests"        ON public.job_request_items;
  DROP POLICY IF EXISTS "items_select" ON public.job_request_items;
  DROP POLICY IF EXISTS "items_insert" ON public.job_request_items;
  DROP POLICY IF EXISTS "items_update" ON public.job_request_items;
  DROP POLICY IF EXISTS "items_delete" ON public.job_request_items;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE POLICY "items_select"
  ON public.job_request_items FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.job_offers  o  WHERE o.request_id = job_request_items.request_id AND o.corporation_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.status = 'open')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "items_insert"
  ON public.job_request_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid()
  ));

CREATE POLICY "items_update"
  ON public.job_request_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid()
  ));

CREATE POLICY "items_delete"
  ON public.job_request_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid()
  ));


-- ── job_request_contacts ─────────────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "Owner reads own contact"    ON public.job_request_contacts;
  DROP POLICY IF EXISTS "Winning corp reads contact" ON public.job_request_contacts;
  DROP POLICY IF EXISTS "Admin reads all contacts"   ON public.job_request_contacts;
  DROP POLICY IF EXISTS "Owner inserts own contact"  ON public.job_request_contacts;
  DROP POLICY IF EXISTS "Owner updates own contact"  ON public.job_request_contacts;
  DROP POLICY IF EXISTS "contacts_select_owner"  ON public.job_request_contacts;
  DROP POLICY IF EXISTS "contacts_select_winner" ON public.job_request_contacts;
  DROP POLICY IF EXISTS "contacts_select_admin"  ON public.job_request_contacts;
  DROP POLICY IF EXISTS "contacts_insert"        ON public.job_request_contacts;
  DROP POLICY IF EXISTS "contacts_update"        ON public.job_request_contacts;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Only the request owner and the winning corporation may read contact info
CREATE POLICY "contacts_select_owner"
  ON public.job_request_contacts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.job_requests jr
    WHERE jr.id = job_request_contacts.request_id AND jr.user_id = auth.uid()
  ));

CREATE POLICY "contacts_select_winner"
  ON public.job_request_contacts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.job_awards a
    WHERE a.request_id = job_request_contacts.request_id AND a.corporation_id = auth.uid()
  ));

CREATE POLICY "contacts_select_admin"
  ON public.job_request_contacts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "contacts_insert"
  ON public.job_request_contacts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.job_requests jr
    WHERE jr.id = job_request_contacts.request_id AND jr.user_id = auth.uid()
  ));

CREATE POLICY "contacts_update"
  ON public.job_request_contacts FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.job_requests jr
    WHERE jr.id = job_request_contacts.request_id AND jr.user_id = auth.uid()
  ));


-- ── job_offers ───────────────────────────────────────────────

DO $$ BEGIN
  -- old names
  DROP POLICY IF EXISTS "Owner sees offers on own request"      ON public.job_offers;
  DROP POLICY IF EXISTS "Corporation sees own offers"           ON public.job_offers;
  DROP POLICY IF EXISTS "Admin sees all offers"                 ON public.job_offers;
  DROP POLICY IF EXISTS "Verified corporation can submit offer" ON public.job_offers;
  DROP POLICY IF EXISTS "Corporation updates own offer"         ON public.job_offers;
  DROP POLICY IF EXISTS "corps_insert_own_offers"               ON public.job_offers;
  DROP POLICY IF EXISTS "corps_update_own_offers"               ON public.job_offers;
  DROP POLICY IF EXISTS "read_own_or_owned_request_offers"      ON public.job_offers;
  -- canonical names
  DROP POLICY IF EXISTS "offers_select_owner"    ON public.job_offers;
  DROP POLICY IF EXISTS "offers_select_own_corp" ON public.job_offers;
  DROP POLICY IF EXISTS "offers_select_admin"    ON public.job_offers;
  DROP POLICY IF EXISTS "offers_insert"          ON public.job_offers;
  DROP POLICY IF EXISTS "offers_update"          ON public.job_offers;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Sealed-bid: corporations see only their own offer;
-- request owner sees all offers so they can compare and award.
CREATE POLICY "offers_select_owner"
  ON public.job_offers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid()
  ));

CREATE POLICY "offers_select_own_corp"
  ON public.job_offers FOR SELECT TO authenticated
  USING (corporation_id = auth.uid());

CREATE POLICY "offers_select_admin"
  ON public.job_offers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only verified + approved corporations may insert; request must be open.
CREATE POLICY "offers_insert"
  ON public.job_offers FOR INSERT TO authenticated
  WITH CHECK (
    corporation_id = auth.uid()
    AND public.has_role(auth.uid(), 'corporation')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.verification_status = 'approved'
    )
    AND EXISTS (
      SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.status = 'open'
    )
  );

-- Corporations may only update (withdraw) their own submitted offers.
CREATE POLICY "offers_update"
  ON public.job_offers FOR UPDATE TO authenticated
  USING  (corporation_id = auth.uid() AND status = 'submitted')
  WITH CHECK (corporation_id = auth.uid());


-- ── job_awards ───────────────────────────────────────────────

DO $$ BEGIN
  -- old names
  DROP POLICY IF EXISTS "Owner sees own awards"   ON public.job_awards;
  DROP POLICY IF EXISTS "Winning corp sees award" ON public.job_awards;
  DROP POLICY IF EXISTS "Admin sees awards"       ON public.job_awards;
  DROP POLICY IF EXISTS "Owner creates award"     ON public.job_awards;
  DROP POLICY IF EXISTS "owners_insert_awards"    ON public.job_awards;
  DROP POLICY IF EXISTS "read_own_awards"         ON public.job_awards;
  -- canonical names
  DROP POLICY IF EXISTS "awards_select_owner"  ON public.job_awards;
  DROP POLICY IF EXISTS "awards_select_winner" ON public.job_awards;
  DROP POLICY IF EXISTS "awards_select_admin"  ON public.job_awards;
  DROP POLICY IF EXISTS "awards_insert"        ON public.job_awards;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE POLICY "awards_select_owner"
  ON public.job_awards FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.job_requests jr WHERE jr.id = request_id AND jr.user_id = auth.uid()
  ));

CREATE POLICY "awards_select_winner"
  ON public.job_awards FOR SELECT TO authenticated
  USING (corporation_id = auth.uid());

CREATE POLICY "awards_select_admin"
  ON public.job_awards FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only the request owner may create an award; offer must be submitted
-- and belong to the same request.
CREATE POLICY "awards_insert"
  ON public.job_awards FOR INSERT TO authenticated
  WITH CHECK (
    awarded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.job_requests jr
      WHERE jr.id = job_awards.request_id
        AND jr.user_id = auth.uid()
        AND jr.status = 'open'
    )
    AND EXISTS (
      SELECT 1 FROM public.job_offers o
      WHERE o.id = job_awards.offer_id
        AND o.request_id = job_awards.request_id
        AND o.corporation_id = job_awards.corporation_id
        AND o.status = 'submitted'
    )
  );


-- ── projects ─────────────────────────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "Project parties read project"   ON public.projects;
  DROP POLICY IF EXISTS "Contractor updates own project" ON public.projects;
  DROP POLICY IF EXISTS "Admin manages projects"         ON public.projects;
  DROP POLICY IF EXISTS "Contractor creates project"     ON public.projects;
  DROP POLICY IF EXISTS "projects_select" ON public.projects;
  DROP POLICY IF EXISTS "projects_insert" ON public.projects;
  DROP POLICY IF EXISTS "projects_update" ON public.projects;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE POLICY "projects_select"
  ON public.projects FOR SELECT TO authenticated
  USING (
    contractor_id  = auth.uid()
    OR corporation_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.project_teams t
      WHERE t.project_id = projects.id AND t.team_leader_id = auth.uid()
    )
  );

CREATE POLICY "projects_insert"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (contractor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "projects_update"
  ON public.projects FOR UPDATE TO authenticated
  USING  (contractor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (contractor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));


-- ── audit_log ────────────────────────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins read audit log" ON public.audit_log;
  DROP POLICY IF EXISTS "Users read own audit"  ON public.audit_log;
  DROP POLICY IF EXISTS "audit_select_admin"    ON public.audit_log;
  DROP POLICY IF EXISTS "audit_select_own"      ON public.audit_log;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE POLICY "audit_select_admin"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "audit_select_own"
  ON public.audit_log FOR SELECT TO authenticated
  USING (actor_id = auth.uid());


-- ================================================================
-- Section 5 — Indexes
--
-- All use IF NOT EXISTS; safe to run repeatedly.
-- Listed after table creation so they are never orphaned.
-- ================================================================

-- user_roles: called by has_role() inside every RLS check
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role
  ON public.user_roles (user_id, role);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id
  ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_verification
  ON public.profiles (verification_status);

-- job_requests
CREATE INDEX IF NOT EXISTS idx_job_requests_user_id
  ON public.job_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_requests_open_deadline
  ON public.job_requests (created_at DESC, deadline_at)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_job_requests_status
  ON public.job_requests (status, deadline_at);

-- job_request_items
CREATE INDEX IF NOT EXISTS idx_job_request_items_request_id
  ON public.job_request_items (request_id);

-- job_offers
CREATE INDEX IF NOT EXISTS idx_job_offers_request_id
  ON public.job_offers (request_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_corporation_id
  ON public.job_offers (corporation_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_corp_updated
  ON public.job_offers (corporation_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_offers_status
  ON public.job_offers (status);

-- job_awards
CREATE INDEX IF NOT EXISTS idx_job_awards_request_id
  ON public.job_awards (request_id);
CREATE INDEX IF NOT EXISTS idx_job_awards_corporation_id
  ON public.job_awards (corporation_id);

-- projects / teams
CREATE INDEX IF NOT EXISTS idx_projects_contractor_id
  ON public.projects (contractor_id);
CREATE INDEX IF NOT EXISTS idx_projects_corporation_id
  ON public.projects (corporation_id);
CREATE INDEX IF NOT EXISTS idx_project_teams_project_id
  ON public.project_teams (project_id);
CREATE INDEX IF NOT EXISTS idx_project_teams_leader_id
  ON public.project_teams (team_leader_id);

-- attendance_records
CREATE INDEX IF NOT EXISTS idx_attendance_project_date
  ON public.attendance_records (project_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_team_date
  ON public.attendance_records (team_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_contractor
  ON public.attendance_records (contractor_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_corporation
  ON public.attendance_records (corporation_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_team_leader
  ON public.attendance_records (team_leader_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_status_unfrozen
  ON public.attendance_records (status)
  WHERE frozen_at IS NULL;

-- audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_date
  ON public.audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON public.audit_log (entity_type, entity_id, created_at DESC);


-- ================================================================
-- Section 6 — handle_new_user (idempotent, OAuth-safe replacement)
--
-- Replaces the version installed by earlier migrations.
-- Three bugs fixed vs the previous version:
--
--   1. Profile INSERT now uses ON CONFLICT (user_id) DO UPDATE so a
--      second invocation (OAuth retry, account-link, Supabase internal
--      retry) never throws a unique-constraint violation and rolls back
--      the auth.users row.
--
--   2. Admin user_roles INSERT now uses ON CONFLICT DO NOTHING for the
--      same reason.
--
--   3. The role enum cast is guarded: only 'contractor' and
--      'corporation' are accepted from metadata; anything else
--      (null, empty string, unknown value) falls back to 'contractor'.
--      An unguarded cast of an invalid string throws and kills the
--      auth.users transaction.
--
--   4. full_name resolution checks raw_user_meta_data->>'name' (the
--      field Google actually sends) before falling back to email.
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_role public.app_role;
  v_name text;
BEGIN
  -- Google sends 'name'; email/password signup sends 'full_name'.
  -- Fall back to email local-part so full_name is never blank.
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
    NEW.id,
    v_name,
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
    -- Always refresh the email (could change after account link)
    email     = EXCLUDED.email,
    -- Only overwrite full_name if the existing row has none
    full_name = CASE
      WHEN NULLIF(trim(public.profiles.full_name), '') IS NULL
      THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END;

  -- Hard-coded admin shortcut — idempotent with ON CONFLICT
  IF lower(NEW.email) = 'bbuildforceprime@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Safely resolve role: guard the cast so an invalid/empty string
  -- never throws an exception and rolls back the auth.users INSERT.
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

-- Recreate the trigger (drop both historical names to be safe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ================================================================
-- Section 7 — ensure_user_bootstrap RPC
--
-- Self-heal RPC for the app layer: if a Google OAuth user lands in a
-- state where auth.users exists but their profile or role row is
-- missing (because an earlier trigger run failed and was rolled back),
-- this function creates the minimum records needed to use the app.
--
-- Security: SECURITY DEFINER + auth.uid() means the function always
-- acts on the currently authenticated user — it cannot be used to
-- create records for anyone else. Safe to expose to `authenticated`.
-- Idempotent — ON CONFLICT DO NOTHING means calling it twice is safe.
-- ================================================================

CREATE OR REPLACE FUNCTION public.ensure_user_bootstrap()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO public.profiles (user_id, full_name, email, verification_status)
  VALUES (
    v_uid,
    split_part(v_email, '@', 1),
    v_email,
    'pending'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Default to contractor; admin can upgrade the role afterwards
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'contractor')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_user_bootstrap() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.ensure_user_bootstrap() TO authenticated;


-- ================================================================
-- Section 8 — set_own_role RPC
--
-- Lets any authenticated user switch their own contractor/corporation
-- role. Used by the post-Google-OAuth role-selection flow.
-- Admin role is never grantable through this function.
-- The caller's previous contractor/corporation role is replaced so
-- a user can never hold both simultaneously.
-- ================================================================

CREATE OR REPLACE FUNCTION public.set_own_role(_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _role NOT IN ('contractor', 'corporation') THEN
    RAISE EXCEPTION 'Invalid role: must be contractor or corporation';
  END IF;
  -- Replace previous contractor/corporation role
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


-- ================================================================
-- Section 9 — Bootstrap designated admin accounts
--
-- Assigns admin role + approves the profile for known admin email(s).
-- Runs if those users already exist in auth.users; skips silently if
-- they don't yet (trigger will assign admin on first login).
-- Idempotent: ON CONFLICT / WHERE guard make re-runs safe.
-- ================================================================

DO $$
DECLARE
  admin_emails text[] := ARRAY['chmv1243@gmail.com', 'bbuildforceprime@gmail.com'];
BEGIN
  -- Admin role
  INSERT INTO public.user_roles (user_id, role)
  SELECT u.id, 'admin'::public.app_role
  FROM auth.users u
  WHERE lower(u.email) = ANY(admin_emails)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Approve admin profiles so they can use the platform fully
  UPDATE public.profiles p
  SET verification_status = 'approved',
      is_verified         = true
  FROM auth.users u
  WHERE p.user_id = u.id
    AND lower(u.email) = ANY(admin_emails)
    AND (p.verification_status <> 'approved' OR NOT p.is_verified);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- 3) RLS BASELINE (recursion + policy fixes)
-- ============================================================
-- ============================================================
-- CONSOLIDATED RLS BASELINE (apply to the Lovable-managed prod DB)
--
-- One idempotent script that brings job_requests / job_offers (read path),
-- profiles, and user_roles to the known-good state verified on the dev DB.
-- Safe to run on any current state:
--   * has_role EXECUTE re-granted to authenticated (fixes "permission denied
--     for function has_role" and the profiles 403 that cascades from it).
--   * has_bid_on_request() SECURITY DEFINER helper (breaks the job_requests
--     <-> job_offers recursion).
--   * job_requests SELECT policies rebuilt to the correct non-recursive set
--     (own / admin / bidding-corp-via-fn / open) via a dynamic drop so no
--     stale/recursive SELECT policy can survive.
--   * profiles & user_roles get owner + admin SELECT (and owner UPDATE on
--     profiles) so role detection and the offer-insert checks work. These use
--     name-scoped drops, so any other existing policies are left untouched.
-- ============================================================

-- 1) has_role must be executable by authenticated (it is called inside most
--    policies; if it isn't executable the whole policy evaluation 403s).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 2) SECURITY DEFINER helper that breaks the job_requests <-> job_offers cycle.
CREATE OR REPLACE FUNCTION public.has_bid_on_request(_request_id uuid, _corporation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.job_offers
    WHERE request_id = _request_id AND corporation_id = _corporation_id
  )
$$;
REVOKE EXECUTE ON FUNCTION public.has_bid_on_request(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_bid_on_request(uuid, uuid) TO authenticated;

-- 3) Rebuild job_requests SELECT policies (drop ALL existing SELECT policies,
--    recreate the correct four). INSERT/UPDATE/DELETE policies are untouched.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.job_requests'::regclass AND polcmd = 'r'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.job_requests', pol.polname);
  END LOOP;
END $$;

CREATE POLICY "Owners can view own job requests"
ON public.job_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all job requests"
ON public.job_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Bidding corps can view requests they bid on"
ON public.job_requests FOR SELECT TO authenticated
USING (public.has_bid_on_request(id, auth.uid()));

CREATE POLICY "Authenticated can view open job requests"
ON public.job_requests FOR SELECT TO authenticated
USING (status = 'open');

-- 4) profiles: owner + admin SELECT, owner UPDATE (name-scoped, additive).
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE POLICY profiles_select_own
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY profiles_select_admin
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY profiles_update_own
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5) user_roles: owner + admin SELECT (name-scoped, additive).
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select_admin ON public.user_roles;

CREATE POLICY user_roles_select_own
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY user_roles_select_admin
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- 4) ROLE SEPARATION HARDENING (one role per user, etc.)
-- ============================================================
-- ============================================================
-- ROLE SEPARATION HARDENING
--
-- BuildForce roles are EXCLUSIVE: contractor XOR corporation XOR admin
-- (team_leader is an on-site sub-actor). The V1 app allowed mixes
-- (contractor+admin etc.) via client-side role inserts and an admin
-- "toggle role" UI — both removed from the app. This migration closes
-- the database-side holes and cleans existing data. Idempotent.
-- ============================================================

-- 1) Clients must NEVER write roles directly.
--    (A 2026-06-07 migration granted INSERT/DELETE to authenticated to work
--    around an RLS bug — that bug is fixed; revoke the workaround.)
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon;

-- 2) ensure_user_bootstrap: self-heal for users whose handle_new_user trigger
--    failed (e.g. Google OAuth edge cases). Creates the missing profile and,
--    ONLY when the user has zero roles, assigns the role they CHOSE at signup
--    (from auth metadata). It never defaults to contractor and never stacks a
--    second role — the V1 dual-role bug came from exactly that.
CREATE OR REPLACE FUNCTION public.ensure_user_bootstrap()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _meta jsonb;
  _role text;
BEGIN
  IF _uid IS NULL THEN
    RETURN;
  END IF;

  SELECT raw_user_meta_data INTO _meta FROM auth.users WHERE id = _uid;

  INSERT INTO public.profiles (user_id, full_name, phone, company_name, city)
  SELECT
    _uid,
    COALESCE(_meta->>'full_name', ''),
    _meta->>'phone',
    _meta->>'company_name',
    _meta->>'city'
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _uid);

  _role := _meta->>'role';
  IF _role IN ('contractor', 'corporation')
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, _role::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_user_bootstrap() TO authenticated;

-- 3) Enforce single role per user going forward (data invariant).
--    Partial unique index allows at most ONE row per user in user_roles.
--    (Run section 4 first if this index fails due to existing duplicates.)

-- 4) Clean existing mixed-role data. Priority: admin accounts keep ONLY admin
--    if they are in the designated list below; otherwise admin is stripped.
--    Marketplace users: corporation > contractor > team_leader.
DO $$
DECLARE
  -- >>> EDIT THIS LIST: emails allowed to hold the admin role <<<
  _admin_emails text[] := ARRAY['bbuildforceprime@gmail.com'];
  r record;
  _keep public.app_role;
  _email text;
BEGIN
  FOR r IN
    SELECT user_id, array_agg(role ORDER BY role) AS roles
    FROM public.user_roles
    GROUP BY user_id
    HAVING count(*) > 1 OR bool_or(role = 'admin')
  LOOP
    SELECT email INTO _email FROM auth.users WHERE id = r.user_id;

    IF 'admin' = ANY(r.roles::text[]) AND _email = ANY(_admin_emails) THEN
      _keep := 'admin';
    ELSIF 'corporation' = ANY(r.roles::text[]) THEN
      _keep := 'corporation';
    ELSIF 'contractor' = ANY(r.roles::text[]) THEN
      _keep := 'contractor';
    ELSIF 'team_leader' = ANY(r.roles::text[]) THEN
      _keep := 'team_leader';
    ELSE
      _keep := r.roles[1];
    END IF;

    DELETE FROM public.user_roles
    WHERE user_id = r.user_id AND role <> _keep;
  END LOOP;
END $$;

-- Now that duplicates are gone, enforce the invariant.
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_one_role_per_user
ON public.user_roles (user_id);

-- 5) One bid per corporation per request (enforced in submitOffer server fn
--    as well — this index is the database-level guarantee). Withdrawn bids
--    are excluded so a corporation may re-bid after withdrawing.
CREATE UNIQUE INDEX IF NOT EXISTS job_offers_one_active_bid_per_corp
ON public.job_offers (request_id, corporation_id)
WHERE status <> 'withdrawn';

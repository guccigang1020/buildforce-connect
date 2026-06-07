-- Step 5A: Pricing Engine
--
-- 1. New table: worker_pricing_rules
--    Corporation configures cost_price_per_hour and sale_price_per_hour per worker type.
--    Unique per (corporation_id, worker_type).
--
-- 2. Additive column: project_teams.worker_type (nullable text)
--    Set by contractor per team — links the team to a pricing rule for financial calculations.
--
-- 3. Additive columns: daily_approved_accounts
--    worker_type            — snapshot of team's worker type at generation time
--    pricing_cost_per_hour  — snapshot of cost_price used (for auditability)
--    total_sale             — corporation's revenue = hourly_rate × workers × hours
--    labor_cost             — corporation's cost = cost_price × total_worker_hours
--    total_profit           — total_sale - labor_cost

-- ─── 1. worker_pricing_rules ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.worker_pricing_rules (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  corporation_id        uuid NOT NULL,
  worker_type           text NOT NULL,
  custom_label          text,

  cost_price_per_hour   numeric(10,2) NOT NULL DEFAULT 0,
  sale_price_per_hour   numeric(10,2) NOT NULL DEFAULT 0,

  CONSTRAINT worker_pricing_rules_corp_type_unique UNIQUE (corporation_id, worker_type)
);

CREATE INDEX IF NOT EXISTS worker_pricing_rules_corp_idx
  ON public.worker_pricing_rules(corporation_id);

-- ─── 2. project_teams: add worker_type (additive, nullable) ──────────────────

ALTER TABLE public.project_teams
  ADD COLUMN IF NOT EXISTS worker_type text;

-- ─── 3. daily_approved_accounts: add pricing columns (additive, nullable) ────

ALTER TABLE public.daily_approved_accounts
  ADD COLUMN IF NOT EXISTS worker_type           text,
  ADD COLUMN IF NOT EXISTS pricing_cost_per_hour numeric(10,2),
  ADD COLUMN IF NOT EXISTS total_sale            numeric(10,2),
  ADD COLUMN IF NOT EXISTS labor_cost            numeric(10,2),
  ADD COLUMN IF NOT EXISTS total_profit          numeric(10,2);

-- ─── Verification ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'worker_pricing_rules'
  ) THEN
    RAISE EXCEPTION 'Step 5A migration failed: worker_pricing_rules table not created';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_teams' AND column_name = 'worker_type'
  ) THEN
    RAISE EXCEPTION 'Step 5A migration failed: project_teams.worker_type not added';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_approved_accounts' AND column_name = 'total_sale'
  ) THEN
    RAISE EXCEPTION 'Step 5A migration failed: daily_approved_accounts.total_sale not added';
  END IF;
  RAISE NOTICE 'Step 5A migration verified: pricing engine schema ready.';
END $$;

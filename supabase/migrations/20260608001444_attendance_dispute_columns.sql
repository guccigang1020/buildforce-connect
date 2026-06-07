-- Step 2: Add dispute and auto-approval tracking columns to attendance_records
--
-- Rationale: Corporation does not approve individual daily attendance records.
-- Contractor (site manager) is the sole daily approver. Corporation is only
-- involved in disputes, exception resolution, and monthly account review.
--
-- All columns are nullable and additive. No existing column is modified.
-- No existing rows are affected. No logic changes in this migration.
--
-- Columns added:
--   auto_approved_at      — written by background job when contractor has not
--                           acted within the configured window after end_time.
--                           Distinguishes system approval from human approval.
--
--   disputed_at           — timestamp when a dispute was raised on this record.
--   disputed_by           — uuid of the party who raised the dispute
--                           (team leader contesting a rejection, or contractor
--                           escalating a discrepancy).
--   dispute_reason        — free-text reason for the dispute.
--
--   dispute_resolved_at   — timestamp when the dispute was resolved.
--   dispute_resolved_by   — uuid of the party who resolved it (contractor or
--                           admin, jointly with corporation).
--   dispute_resolution_note — agreed outcome: what changed and why.

ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS auto_approved_at        timestamptz,
  ADD COLUMN IF NOT EXISTS disputed_at             timestamptz,
  ADD COLUMN IF NOT EXISTS disputed_by             uuid,
  ADD COLUMN IF NOT EXISTS dispute_reason          text,
  ADD COLUMN IF NOT EXISTS dispute_resolved_at     timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_resolved_by     uuid,
  ADD COLUMN IF NOT EXISTS dispute_resolution_note text;

-- Verification query (runs at end of migration to confirm columns exist)
DO $$
DECLARE
  missing_cols text := '';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='attendance_records' AND column_name='auto_approved_at') THEN
    missing_cols := missing_cols || ' auto_approved_at';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='attendance_records' AND column_name='disputed_at') THEN
    missing_cols := missing_cols || ' disputed_at';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='attendance_records' AND column_name='disputed_by') THEN
    missing_cols := missing_cols || ' disputed_by';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='attendance_records' AND column_name='dispute_reason') THEN
    missing_cols := missing_cols || ' dispute_reason';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='attendance_records' AND column_name='dispute_resolved_at') THEN
    missing_cols := missing_cols || ' dispute_resolved_at';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='attendance_records' AND column_name='dispute_resolved_by') THEN
    missing_cols := missing_cols || ' dispute_resolved_by';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='attendance_records' AND column_name='dispute_resolution_note') THEN
    missing_cols := missing_cols || ' dispute_resolution_note';
  END IF;

  IF missing_cols <> '' THEN
    RAISE EXCEPTION 'Migration verification failed. Missing columns:%', missing_cols;
  END IF;

  RAISE NOTICE 'Step 2 migration verified: all 7 dispute/auto-approval columns present on attendance_records.';
END $$;

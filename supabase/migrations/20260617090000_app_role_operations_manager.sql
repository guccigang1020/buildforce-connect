-- Add the 'operations_manager' role (מנהל תפעול) to the app_role enum.
--
-- Kept in its OWN migration on purpose: Postgres does not allow a newly added
-- enum value to be USED in the same transaction that added it. Every later
-- migration / runtime insert that references 'operations_manager' must run
-- after this one has committed.
--
-- Idempotent: safe to run repeatedly and safe whether or not the value exists.
DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operations_manager';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

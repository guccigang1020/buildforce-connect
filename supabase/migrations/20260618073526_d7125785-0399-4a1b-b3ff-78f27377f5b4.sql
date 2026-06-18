DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operations_manager';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.attendance_restrict_team_leader_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  -- service_role and admins bypass
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF v_uid IS NULL THEN RETURN NEW; END IF;
  IF public.has_role(v_uid, 'admin'::public.app_role) THEN RETURN NEW; END IF;

  -- Only restrict when the actor is the team leader and not also contractor/corporation on this row
  IF v_uid = OLD.team_leader_id
     AND v_uid <> OLD.contractor_id
     AND v_uid <> OLD.corporation_id THEN

    IF NEW.hourly_rate      IS DISTINCT FROM OLD.hourly_rate
    OR NEW.total_cost       IS DISTINCT FROM OLD.total_cost
    OR NEW.total_hours      IS DISTINCT FROM OLD.total_hours
    OR NEW.workers_expected IS DISTINCT FROM OLD.workers_expected
    OR NEW.corporation_id   IS DISTINCT FROM OLD.corporation_id
    OR NEW.contractor_id    IS DISTINCT FROM OLD.contractor_id
    OR NEW.project_id       IS DISTINCT FROM OLD.project_id
    OR NEW.team_id          IS DISTINCT FROM OLD.team_id
    OR NEW.team_leader_id   IS DISTINCT FROM OLD.team_leader_id
    OR NEW.work_date        IS DISTINCT FROM OLD.work_date
    OR NEW.approved_by      IS DISTINCT FROM OLD.approved_by
    OR NEW.approved_at      IS DISTINCT FROM OLD.approved_at
    OR NEW.entry_approved_by IS DISTINCT FROM OLD.entry_approved_by
    OR NEW.entry_approved_at IS DISTINCT FROM OLD.entry_approved_at
    OR NEW.exit_approved_by  IS DISTINCT FROM OLD.exit_approved_by
    OR NEW.exit_approved_at  IS DISTINCT FROM OLD.exit_approved_at
    OR NEW.frozen_at         IS DISTINCT FROM OLD.frozen_at THEN
      RAISE EXCEPTION 'Team leaders cannot modify financial, assignment, or approval fields on attendance records';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attendance_restrict_team_leader_fields_trg ON public.attendance_records;
CREATE TRIGGER attendance_restrict_team_leader_fields_trg
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION public.attendance_restrict_team_leader_fields();

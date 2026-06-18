import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Worker roster for a project. The corporation (תאגיד) fills this in during
// project intake; it is the source for attendance auto-fill (who arrived).
// project_workers is not in the generated Database types until `supabase gen
// types` is re-run post-migration, so calls are cast `as any` like the rest of
// the attendance layer.

const workerSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  passportNumber: z.string().trim().min(3).max(40),
  nationality: z.string().trim().max(60).optional(),
});

async function assertCorporationOwnsProject(
  supabase: { from: (t: string) => any },
  projectId: string,
  userId: string,
) {
  const { data: proj } = await supabase
    .from("projects")
    .select("id, corporation_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!proj) throw new Error("פרויקט לא נמצא");
  if (proj.corporation_id !== userId) throw new Error("רק התאגיד יכול לנהל את רשימת העובדים");
}

/** List the worker roster for a project (any project party may read via RLS). */
export const listProjectWorkers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ projectId: z.string().uuid(), includeRemoved: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = (supabase as any)
      .from("project_workers")
      .select(
        "id, first_name, last_name, passport_number, nationality, status, added_by_role, created_at",
      )
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: true });
    if (!data.includeRemoved) q = q.eq("status", "active");
    const { data: workers, error } = await q;
    if (error) throw new Error(error.message);
    return { workers: workers ?? [] };
  });

/** Replace/append the roster in one call (used by the intake form). */
export const saveProjectWorkers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        workers: z.array(workerSchema).min(1).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertCorporationOwnsProject(supabase, data.projectId, userId);
    const rows = data.workers.map((w) => ({
      project_id: data.projectId,
      corporation_id: userId,
      first_name: w.firstName,
      last_name: w.lastName,
      passport_number: w.passportNumber,
      nationality: w.nationality ?? null,
      status: "active",
    }));
    // UNIQUE(project_id, passport_number) — upsert so re-saving the form is
    // idempotent and updates name/nationality for an existing passport.
    const { error } = await (supabase as any)
      .from("project_workers")
      .upsert(rows, { onConflict: "project_id,passport_number" });
    if (error) throw new Error(error.message);
    return { count: rows.length };
  });

/**
 * Coordinator adds a worker from the field. Passport is mandatory (min 3) and
 * the row is tagged added_by_role='coordinator' so the roster can badge it.
 * RLS ("Coordinator adds workers") also enforces the caller is the team leader.
 */
export const addWorkerByCoordinator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        firstName: z.string().trim().min(1).max(100),
        lastName: z.string().trim().min(1).max(100),
        passportNumber: z.string().trim().min(3, "מספר דרכון נדרש").max(40),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify the caller is the coordinator (team leader) of this project.
    const { data: team } = await (supabase as any)
      .from("project_teams")
      .select("id")
      .eq("project_id", data.projectId)
      .eq("team_leader_id", userId)
      .maybeSingle();
    if (!team) throw new Error("רק הרכז של הפרויקט יכול להוסיף עובד");

    const { data: worker, error } = await (supabase as any)
      .from("project_workers")
      .upsert(
        {
          project_id: data.projectId,
          corporation_id: userId, // provenance is the badge; corporation_id just records the inserter
          first_name: data.firstName,
          last_name: data.lastName,
          passport_number: data.passportNumber,
          status: "active",
          added_by_role: "coordinator",
        },
        { onConflict: "project_id,passport_number" },
      )
      .select("id, first_name, last_name, passport_number, added_by_role")
      .single();
    if (error) throw new Error(error.message);
    return { worker };
  });

/** Soft-remove a single worker from the roster. */
export const removeProjectWorker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ projectId: z.string().uuid(), workerId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertCorporationOwnsProject(supabase, data.projectId, userId);
    const { error } = await (supabase as any)
      .from("project_workers")
      .update({ status: "removed", updated_at: new Date().toISOString() })
      .eq("id", data.workerId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

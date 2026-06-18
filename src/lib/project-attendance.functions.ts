import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { israelToday } from "@/lib/dates";

// "Who actually arrived" for a given day's attendance record. The coordinator
// (team_leader) toggles presence against the corporation's worker roster; the
// list defaults to everyone present (auto-fill) and only deltas are recorded.
// attendance_workers + project_workers are not in the generated Database types
// yet, so calls are cast `as any` like the rest of the attendance layer.

/**
 * Pre-fill the present-list for a record from the project roster, then return
 * the merged view (roster ∪ already-saved presence). The coordinator owns the
 * record (team_leader_id) per RLS, so writes are done with the user client.
 */
export const listAttendancePresentWorkers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ recordId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rec, error: rErr } = await (supabase as any)
      .from("attendance_records")
      .select("id, project_id")
      .eq("id", data.recordId)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!rec) throw new Error("רשומה לא נמצאה");

    const [{ data: roster }, { data: saved }] = await Promise.all([
      (supabase as any)
        .from("project_workers")
        .select("id, first_name, last_name, passport_number")
        .eq("project_id", rec.project_id)
        .eq("status", "active")
        .order("created_at", { ascending: true }),
      (supabase as any)
        .from("attendance_workers")
        .select("worker_id, present, note")
        .eq("record_id", data.recordId),
    ]);

    const savedMap = new Map<string, { present: boolean; note: string | null }>(
      ((saved ?? []) as { worker_id: string; present: boolean; note: string | null }[]).map((s) => [
        s.worker_id,
        { present: s.present, note: s.note },
      ]),
    );
    const hasSaved = savedMap.size > 0;
    const workers = (
      (roster ?? []) as {
        id: string;
        first_name: string;
        last_name: string;
        passport_number: string;
      }[]
    ).map((w) => ({
      worker_id: w.id,
      first_name: w.first_name,
      last_name: w.last_name,
      passport_number: w.passport_number,
      // Auto-fill: default everyone present until the coordinator saves deltas.
      present: hasSaved ? (savedMap.get(w.id)?.present ?? false) : true,
      note: savedMap.get(w.id)?.note ?? null,
    }));
    return { workers };
  });

/**
 * List a day's attendance for every project the caller can see, letting RLS
 * ("Parties read attendance") scope the rows. Serves the foreman (site_manager)
 * and operations_manager sub-users — who are project_members, not the
 * contractor_id/corporation_id on the record, so the owner-keyed list functions
 * return nothing for them.
 */
export const listMyProjectAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ date: z.string().optional(), projectId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const date = data.date ?? israelToday();
    let q = (supabase as any)
      .from("attendance_records")
      .select("*, project_teams:team_id(name), projects:project_id(name, address)")
      .eq("work_date", date)
      .order("created_at", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: records, error } = await q;
    if (error) throw new Error(error.message);
    return { records: records ?? [] };
  });

/**
 * All attendance days for a project (most recent first), RLS-scoped. Drives the
 * per-project day list / calendar for the foreman, ops manager, corporation and
 * contractor — and the coordinator's read-only "previous days".
 */
export const listProjectAttendanceDays = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await (supabase as any)
      .from("attendance_records")
      .select(
        "id, work_date, status, start_time, end_time, workers_actual, workers_expected, total_hours, total_cost, entry_approved_at, exit_approved_at, entry_rejection_reason, exit_rejection_reason, frozen_at, start_photo_url, end_photo_url",
      )
      .eq("project_id", data.projectId)
      .order("work_date", { ascending: false });
    if (error) throw new Error(error.message);
    type Day = {
      id: string;
      work_date: string;
      status: string;
      start_time: string | null;
      end_time: string | null;
      workers_actual: number | null;
      workers_expected: number | null;
      total_hours: number | null;
      total_cost: number | null;
      entry_approved_at: string | null;
      exit_approved_at: string | null;
      entry_rejection_reason: string | null;
      exit_rejection_reason: string | null;
      frozen_at: string | null;
      start_photo_url: string | null;
      end_photo_url: string | null;
    };
    return { days: (rows ?? []) as Day[] };
  });

/**
 * Per-project hours + cost summary for a month, with a daily breakdown for the
 * chart. Project-scoped via RLS, so it works for the corporation, the
 * contractor AND the operations manager (a project member) — unlike the
 * owner-keyed getMonthlySummary.
 */
export const getProjectHoursSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        year: z.number().int().min(2020).max(2100),
        month: z.number().int().min(1).max(12),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const mm = String(data.month).padStart(2, "0");
    const start = `${data.year}-${mm}-01`;
    const endDate = new Date(data.year, data.month, 0); // last day of month
    const end = `${data.year}-${mm}-${String(endDate.getDate()).padStart(2, "0")}`;

    const { data: rows, error } = await (supabase as any)
      .from("attendance_records")
      .select("work_date, status, workers_actual, total_hours, total_cost")
      .eq("project_id", data.projectId)
      .gte("work_date", start)
      .lte("work_date", end)
      .order("work_date", { ascending: true });
    if (error) throw new Error(error.message);
    const recs = (rows ?? []) as {
      work_date: string;
      status: string;
      workers_actual: number | null;
      total_hours: number | null;
      total_cost: number | null;
    }[];

    const summary = {
      days: recs.length,
      approved: recs.filter((r) => r.status === "approved" || r.status === "auto_approved").length,
      pending: recs.filter((r) => r.status === "pending" || r.status === "exception").length,
      totalHours: recs.reduce((s, r) => s + Number(r.total_hours || 0), 0),
      totalCost: recs.reduce((s, r) => s + Number(r.total_cost || 0), 0),
      totalWorkerDays: recs.reduce((s, r) => s + Number(r.workers_actual || 0), 0),
    };
    const daily = recs.map((r) => ({
      date: r.work_date,
      day: Number(r.work_date.slice(8, 10)),
      hours: Number(r.total_hours || 0),
      cost: Number(r.total_cost || 0),
      workers: Number(r.workers_actual || 0),
      status: r.status,
    }));
    return { summary, daily };
  });

/** Persist the coordinator's present/absent toggles for a record. */
export const setAttendancePresentWorkers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        recordId: z.string().uuid(),
        workers: z
          .array(
            z.object({
              workerId: z.string().uuid(),
              present: z.boolean(),
              note: z.string().max(300).optional(),
            }),
          )
          .max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // RLS ("Coordinator manages attendance workers") restricts writes to the
    // record's team_leader; verify here too for a clear Hebrew error.
    const { data: rec } = await (supabase as any)
      .from("attendance_records")
      .select("id, team_leader_id, frozen_at")
      .eq("id", data.recordId)
      .maybeSingle();
    if (!rec) throw new Error("רשומה לא נמצאה");
    if (rec.team_leader_id !== userId) throw new Error("רק הרכז יכול לעדכן מי הגיע");
    if (rec.frozen_at) throw new Error("הרשומה הוקפאה ולא ניתן לעדכן");

    const rows = data.workers.map((w) => ({
      record_id: data.recordId,
      worker_id: w.workerId,
      present: w.present,
      note: w.note ?? null,
    }));
    if (rows.length === 0) return { count: 0, present: 0 };
    const { error } = await (supabase as any)
      .from("attendance_workers")
      .upsert(rows, { onConflict: "record_id,worker_id" });
    if (error) throw new Error(error.message);

    const presentCount = rows.filter((r) => r.present).length;
    // Keep the headline workers_actual in sync with the present count.
    await (supabase as any)
      .from("attendance_records")
      .update({ workers_actual: presentCount })
      .eq("id", data.recordId);
    return { count: rows.length, present: presentCount };
  });

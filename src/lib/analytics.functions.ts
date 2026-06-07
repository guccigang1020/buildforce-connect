import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AttendanceRow = { status: string; total_cost: unknown; total_hours: unknown };

function summarize(recs: AttendanceRow[]) {
  return {
    total: recs.length,
    approved: recs.filter((r) => r.status === "approved" || r.status === "auto_approved").length,
    exceptions: recs.filter((r) => r.status === "exception").length,
    rejected: recs.filter((r) => r.status === "rejected").length,
    pending: recs.filter(
      (r) => r.status === "pending" || r.status === "correction_requested",
    ).length,
    totalCost: recs.reduce((s, r) => s + Number(r.total_cost ?? 0), 0),
    totalHours: recs.reduce((s, r) => s + Number(r.total_hours ?? 0), 0),
  };
}

function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = new Date(year, month, 0).toISOString().slice(0, 10);
  return { start, end };
}

function prevOf(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export const getContractorDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const prev = prevOf(year, month);
    const cur = monthRange(year, month);
    const prevRange = monthRange(prev.year, prev.month);

    const [projectsRes, curRes, prevRes] = await Promise.all([
      supabase
        .from("projects")
        .select("id, status, expected_workers, site_lat, project_teams(id)")
        .eq("contractor_id", userId),
      supabase
        .from("attendance_records")
        .select("status, total_cost, total_hours")
        .eq("contractor_id", userId)
        .gte("work_date", cur.start)
        .lte("work_date", cur.end),
      supabase
        .from("attendance_records")
        .select("status, total_cost, total_hours")
        .eq("contractor_id", userId)
        .gte("work_date", prevRange.start)
        .lte("work_date", prevRange.end),
    ]);

    const projects = projectsRes.data ?? [];
    const active = projects.filter((p) => p.status === "active");

    return {
      activeProjects: active.length,
      totalProjects: projects.length,
      expectedWorkers: active.reduce((s, p) => s + (p.expected_workers ?? 0), 0),
      totalTeams: active.reduce(
        (s, p) =>
          s + ((p.project_teams as { id: string }[] | null | undefined)?.length ?? 0),
        0,
      ),
      projectsNeedingSite: active.filter((p) => !p.site_lat).length,
      monthly: summarize((curRes.data ?? []) as AttendanceRow[]),
      prevMonthly: summarize((prevRes.data ?? []) as AttendanceRow[]),
    };
  });

export const getCorporationAttendanceStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const prev = prevOf(year, month);
    const cur = monthRange(year, month);
    const prevRange = monthRange(prev.year, prev.month);

    const [curRes, prevRes] = await Promise.all([
      supabase
        .from("attendance_records")
        .select("status, total_cost, total_hours")
        .eq("corporation_id", userId)
        .gte("work_date", cur.start)
        .lte("work_date", cur.end),
      supabase
        .from("attendance_records")
        .select("status, total_cost, total_hours")
        .eq("corporation_id", userId)
        .gte("work_date", prevRange.start)
        .lte("work_date", prevRange.end),
    ]);

    return {
      monthly: summarize((curRes.data ?? []) as AttendanceRow[]),
      prevMonthly: summarize((prevRes.data ?? []) as AttendanceRow[]),
    };
  });

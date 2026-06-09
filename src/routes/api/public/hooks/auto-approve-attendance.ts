import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { timingSafeEqual } from "crypto";

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice("Bearer ".length).trim();
  const expected = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!expected || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Auto-approves attendance records that have an end_time but no contractor decision
// after a configurable timeout (default 4 hours since end_time submitted).
export const Route = createFileRoute("/api/public/hooks/auto-approve-attendance")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorized(request)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
        const { data: rows, error } = await supabaseAdmin
          .from("attendance_records")
          .select("id")
          .in("status", ["pending", "exception"])
          .is("frozen_at", null)
          .not("end_time", "is", null)
          .lte("end_time", cutoff);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        const ids = (rows ?? []).map((r) => r.id);
        if (ids.length === 0) return Response.json({ ok: true, approved: 0 });
        const nowIso = new Date().toISOString();
        type AttendanceUpdateRunner = {
          update: (values: unknown) => { in: (column: string, values: string[]) => Promise<unknown> };
        };
        await supabaseAdmin
          .from("attendance_records")
          .update({ status: "auto_approved", approved_at: nowIso, auto_approved_at: nowIso } as never)
          .in("id", ids);
        await supabaseAdmin.from("attendance_events").insert(
          ids.map((id) => ({
            record_id: id,
            kind: "auto_approval" as const,
            payload: { reason: "timeout" },
          })),
        );
        return Response.json({ ok: true, approved: ids.length });
      },
    },
  },
});

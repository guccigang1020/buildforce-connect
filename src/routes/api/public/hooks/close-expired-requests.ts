import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/hooks/close-expired-requests")({
  server: {
    handlers: {
      POST: async () => {
        const nowIso = new Date().toISOString();
        const { data, error } = await supabaseAdmin
          .from("job_requests")
          .update({ status: "closed" })
          .eq("status", "open")
          .lt("deadline_at", nowIso)
          .select("id");
        if (error) {
          return new Response(
            JSON.stringify({ ok: false, error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({ ok: true, closed: data?.length ?? 0, at: nowIso }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
      GET: () =>
        new Response(JSON.stringify({ ok: true, hint: "POST to run" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    },
  },
});
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// NOTE: Admin access is provisioned exclusively by `scripts/seed-admin.mjs`
// (a dedicated admin-only account). There is intentionally NO in-app path to
// gain or grant the admin role — roles are fixed at signup and never mixed.

export const adminGetDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, fetchAdminDashboardData } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    return fetchAdminDashboardData();
  });

export const adminSetVerificationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        profileId: z.string().uuid(),
        status: z.enum(["approved", "rejected"]),
        notes: z.string().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const [{ supabaseAdmin }, { assertAdmin }] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/lib/admin.server"),
    ]);
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        verification_status: data.status,
        is_verified: data.status === "approved",
        admin_notes: data.notes || null,
      })
      .eq("id", data.profileId);
    if (error) throw new Error(error.message);

    const { error: auditError } = await supabaseAdmin.from("audit_log").insert({
      actor_id: context.userId,
      action: `admin.verification_${data.status}`,
      entity_type: "profile",
      entity_id: data.profileId,
      metadata: { notes: data.notes ?? null },
    });
    if (auditError) throw new Error(auditError.message);

    return { ok: true };
  });

export const adminGetDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ supabaseAdmin }, { assertAdmin }] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/lib/admin.server"),
    ]);
    await assertAdmin(context.userId);
    const { data: signed, error } = await supabaseAdmin.storage
      .from("contractor-docs")
      .createSignedUrl(data.path, 60 * 60);
    if (error) throw new Error(error.message);
    return { url: signed?.signedUrl ?? null };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAdmin, fetchAdminDashboardData } from "@/lib/admin.server";

const BOOTSTRAP_ADMIN_EMAILS = ["chmv1243@gmail.com", "bbuildforceprime@gmail.com"];

// One-time self-bootstrap for the designated admin account.
// Uses service-role key to bypass RLS + the prevent_self_verification trigger.
export const selfBootstrapAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    // Verify the requesting user is the designated admin email
    const { data: authData, error: uErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (uErr || !authData?.user) throw new Error("User not found");
    const email = (authData.user.email ?? "").toLowerCase();
    if (!BOOTSTRAP_ADMIN_EMAILS.includes(email)) {
      throw new Error("Forbidden: not a designated admin account");
    }

    // Insert admin role (service role bypasses the "admins only" RLS policy)
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (roleErr && !/duplicate|already exists/i.test(roleErr.message)) {
      throw new Error(roleErr.message);
    }

    // Mark profile as approved (service role bypasses prevent_self_verification trigger)
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .update({ verification_status: "approved", is_verified: true })
      .eq("user_id", userId);
    if (profErr) throw new Error(profErr.message);

    return { ok: true };
  });

export const adminGetDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
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

export const adminToggleRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        targetUserId: z.string().uuid(),
        role: z.enum(["corporation", "admin"]),
        action: z.enum(["add", "remove"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.action === "remove") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.targetUserId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.targetUserId, role: data.role });
      if (error && !/duplicate/i.test(error.message)) throw new Error(error.message);
    }

    const { error: auditError } = await supabaseAdmin.from("audit_log").insert({
      actor_id: context.userId,
      action: `admin.role_${data.action}`,
      entity_type: "user_role",
      entity_id: data.targetUserId,
      metadata: { role: data.role },
    });
    if (auditError) throw new Error(auditError.message);

    return { ok: true };
  });

export const adminGetDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: signed, error } = await supabaseAdmin.storage
      .from("contractor-docs")
      .createSignedUrl(data.path, 60 * 60);
    if (error) throw new Error(error.message);
    return { url: signed?.signedUrl ?? null };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getSupabaseAdmin() {
  const mod = await import("@/integrations/supabase/client.server");
  return mod.supabaseAdmin;
}

// Project-scoped sub-user roles that an org provisions. The coordinator is
// stored as `team_leader` because the whole attendance engine is keyed on
// project_teams.team_leader_id — see the role-reconciliation note in the plan.
export type ProvisionableRole = "team_leader" | "site_manager" | "operations_manager";

// Which side of a project owns each role (who is allowed to provision it).
// team_leader (רכז) + operations_manager (מנהל תפעול) → corporation (תאגיד).
// site_manager (מנהל עבודה בשטח / foreman)            → contractor (קבלן).
const ROLE_SIDE: Record<ProvisionableRole, "contractor" | "corporation"> = {
  team_leader: "corporation",
  operations_manager: "corporation",
  site_manager: "contractor",
};

// Digits-only IL normalization (matches attendance.functions.ts cleanPhone).
function cleanPhone(p?: string | null): string | null {
  if (!p) return null;
  const d = p.replace(/\D/g, "");
  if (d.length < 8) return null;
  if (d.startsWith("0")) return "972" + d.slice(1);
  return d;
}

// Supabase phone auth (OTP) expects E.164 (a leading "+"). cleanPhone returns
// "972XXXXXXXXX"; this adds the "+" so signInWithOtp({ phone }) can match.
function toE164(p?: string | null): string | null {
  const c = cleanPhone(p);
  return c ? `+${c}` : null;
}

type AdminClient = Awaited<ReturnType<typeof getSupabaseAdmin>>;

// Resolve a stable user identity for a phone number, creating a phone-based
// (passwordless) account if none exists yet. Phone-based — NOT the synthetic
// email used by the legacy upsertProjectTeam — so the person can later sign in
// via phone OTP. Returns the user id.
async function resolveOrCreatePhoneUser(
  admin: AdminClient,
  name: string,
  phone: string,
  role: ProvisionableRole,
): Promise<string> {
  const normalized = cleanPhone(phone);
  const e164 = toE164(phone);
  if (!normalized || !e164) throw new Error("מספר הטלפון אינו תקין");

  // Create a confirmed PHONE identity so the sub-user can sign in via phone OTP.
  // We intentionally do NOT match by profiles.phone: a contractor/corporation
  // may carry the same number in their profile while their auth account is
  // email-only (no phone identity) — attaching it would (a) silently grant an
  // unrelated account project access and (b) break OTP login. We reuse ONLY an
  // existing auth *phone* identity (a previously-provisioned sub-user).
  const { data: created, error } = await admin.auth.admin.createUser({
    phone: e164,
    phone_confirm: true,
    user_metadata: { full_name: name, phone, role },
  });
  let userId = created?.user?.id;
  if (!userId) {
    // Phone already a registered auth identity → reuse it.
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId = list?.users?.find((u) => u.phone === normalized || u.phone === e164)?.id;
  }
  if (!userId) throw new Error(error?.message || "שגיאה ביצירת משתמש. נסה שוב.");

  await admin.from("profiles").update({ full_name: name, phone }).eq("user_id", userId);
  // Assign the project role; strip the default 'contractor' role the signup
  // trigger grants, so this sub-user identity carries only its real role.
  // `role` may be 'operations_manager', which the generated app_role enum type
  // doesn't know about until types are regenerated post-migration — cast here.
  await (admin as any)
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
  await admin.from("user_roles").delete().eq("user_id", userId).eq("role", "contractor");
  return userId;
}

const provisionSchema = z.object({
  projectId: z.string().uuid(),
  role: z.enum(["team_leader", "site_manager", "operations_manager"]),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20),
});

/**
 * Provision (or reuse) a phone-based sub-user and attach them to a project with
 * the given role. The caller must own the project on the side that owns the
 * role (contractor for foreman; corporation for coordinator/ops-manager).
 * Returns the resolved user id and membership id.
 */
export const provisionProjectMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    try {
      return provisionSchema.parse(d);
    } catch (e) {
      if (e instanceof z.ZodError) throw new Error("פרטים אינם תקינים — בדוק שם וטלפון");
      throw e;
    }
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const role = data.role as ProvisionableRole;

    // Verify the caller owns the project on the correct side.
    const { data: proj } = await supabase
      .from("projects")
      .select("id, contractor_id, corporation_id")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!proj) throw new Error("פרויקט לא נמצא");
    const side = ROLE_SIDE[role];
    const ownerId = side === "contractor" ? proj.contractor_id : proj.corporation_id;
    if (ownerId !== userId) {
      throw new Error(
        side === "contractor"
          ? "רק הקבלן יכול להוסיף מנהל עבודה לפרויקט"
          : "רק התאגיד יכול להוסיף רכז או מנהל תפעול לפרויקט",
      );
    }

    // Ownership is verified above; do the privileged user creation + membership
    // write with the admin client (auth.admin + cross-user writes need it).
    const admin = await getSupabaseAdmin();
    const memberUserId = await resolveOrCreatePhoneUser(admin, data.name, data.phone, role);

    // project_members / log_audit are not in the generated Database types yet
    // (they live in the new foundation migration) — cast like the rest of the
    // attendance layer until `supabase gen types` is re-run post-migration.
    const { data: member, error: mErr } = await (admin as any)
      .from("project_members")
      .upsert(
        {
          project_id: data.projectId,
          user_id: memberUserId,
          role,
          name: data.name,
          phone: data.phone,
        },
        { onConflict: "project_id,user_id,role" },
      )
      .select("id")
      .single();
    if (mErr) throw new Error(mErr.message);

    // The coordinator (team_leader) is the attendance engine's team leader.
    // Ensure exactly one project_team exists for the project pointing at them,
    // so startWorkday/endWorkday have a team to attach records to.
    if (role === "team_leader") {
      // A project has exactly one coordinator — drop any previous team_leader
      // membership so a replaced coordinator loses access and getProjectDetail
      // resolves a single, current coordinator.
      await (admin as any)
        .from("project_members")
        .delete()
        .eq("project_id", data.projectId)
        .eq("role", "team_leader")
        .neq("user_id", memberUserId);
      const { data: proj2 } = await (admin as any)
        .from("projects")
        .select("name, expected_workers, hourly_rate")
        .eq("id", data.projectId)
        .single();
      const { data: existingTeam } = await (admin as any)
        .from("project_teams")
        .select("id")
        .eq("project_id", data.projectId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      const teamPayload = {
        project_id: data.projectId,
        name: proj2?.name ? `צוות ${proj2.name}` : "צוות",
        team_leader_id: memberUserId,
        team_leader_name: data.name,
        team_leader_phone: data.phone,
        expected_workers: proj2?.expected_workers ?? 1,
        hourly_rate: proj2?.hourly_rate ?? null,
      };
      if (existingTeam) {
        await (admin as any).from("project_teams").update(teamPayload).eq("id", existingTeam.id);
      } else {
        await (admin as any).from("project_teams").insert(teamPayload);
      }
    }

    await (admin as any).rpc("log_audit", {
      _action: "provision_member",
      _entity_type: "project",
      _entity_id: data.projectId,
      _metadata: { role, user_id: memberUserId, name: data.name },
    });

    return { userId: memberUserId, memberId: member?.id ?? null };
  });

/** List the provisioned members of a project (any project party may read). */
export const listProjectMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: members, error } = await (supabase as any)
      .from("project_members")
      .select("id, user_id, role, name, phone, created_at")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { members: members ?? [] };
  });

/** Remove a provisioned member from a project (owner of the relevant side). */
export const removeProjectMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ memberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // RLS lets any project owner delete members; scope it to the side that owns
    // the role (contractor → foreman; corporation → coordinator/ops manager) so
    // one side can't remove the other side's people.
    const { data: member } = await (supabase as any)
      .from("project_members")
      .select("role, project_id")
      .eq("id", data.memberId)
      .maybeSingle();
    if (!member) throw new Error("חבר הצוות לא נמצא");
    const { data: proj } = await supabase
      .from("projects")
      .select("contractor_id, corporation_id")
      .eq("id", member.project_id)
      .maybeSingle();
    const side = ROLE_SIDE[member.role as ProvisionableRole] ?? "contractor";
    const ownerId = side === "contractor" ? proj?.contractor_id : proj?.corporation_id;
    if (!proj || ownerId !== userId) throw new Error("אין לך הרשאה להסיר חבר זה");

    const { error } = await (supabase as any)
      .from("project_members")
      .delete()
      .eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { roleSide, type Side } from "@/lib/sides";

// ONE project-scoped chat thread shared by both sides — corporation +
// operations manager (corp side) and contractor + site foreman (contractor
// side). The coordinator is excluded by the can_access_project_chat RLS gate.
// project_messages is not in the generated Database types yet, so calls are
// cast `as any` like the rest of the attendance layer.

/** Send a message to the project chat. RLS (chat_write) enforces who may post. */
export const sendProjectMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        body: z.string().trim().min(1, "הודעה ריקה").max(4000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: allowed, error: aErr } = await (supabase as any).rpc("can_access_project_chat", {
      _project_id: data.projectId,
      _user_id: userId,
    });
    if (aErr) throw new Error(aErr.message);
    if (allowed === false) throw new Error("אין לך הרשאה לכתוב בצ'אט של פרויקט זה");

    const { data: msg, error } = await (supabase as any)
      .from("project_messages")
      .insert({ project_id: data.projectId, sender_id: userId, body: data.body })
      .select("id, project_id, sender_id, body, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { message: msg };
  });

/** List the project chat thread (oldest → newest) with sender name, role + side. */
export const listProjectMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await (supabase as any)
      .from("project_messages")
      .select("id, sender_id, body, created_at")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    const messages = (rows ?? []) as {
      id: string;
      sender_id: string;
      body: string;
      created_at: string;
    }[];

    const senderIds = [...new Set(messages.map((m) => m.sender_id))];
    const nameById = new Map<string, string>();
    const labelById = new Map<string, string>();
    const sideById = new Map<string, Side>();
    if (senderIds.length) {
      const [{ data: profs }, { data: proj }, { data: mems }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name").in("user_id", senderIds),
        supabase
          .from("projects")
          .select("contractor_id, corporation_id")
          .eq("id", data.projectId)
          .maybeSingle(),
        (supabase as any)
          .from("project_members")
          .select("user_id, role, name")
          .eq("project_id", data.projectId)
          .in("user_id", senderIds),
      ]);
      // profiles RLS only exposes the caller's OWN row → cross-user names come
      // from project_members.name (any project party can read it).
      (profs ?? []).forEach((p) => {
        if (p.full_name) nameById.set(p.user_id, p.full_name);
      });
      const ROLE_HE: Record<string, string> = {
        operations_manager: "מנהל תפעול",
        site_manager: "מנהל עבודה",
        team_leader: "רכז",
      };
      ((mems ?? []) as { user_id: string; role: string; name: string | null }[]).forEach((m) => {
        labelById.set(m.user_id, ROLE_HE[m.role] ?? "");
        sideById.set(m.user_id, roleSide(m.role));
        if (m.name) nameById.set(m.user_id, m.name);
      });
      senderIds.forEach((id) => {
        if (proj?.contractor_id === id) {
          labelById.set(id, "קבלן");
          sideById.set(id, "contractor");
        } else if (proj?.corporation_id === id) {
          labelById.set(id, "תאגיד");
          sideById.set(id, "corp");
        }
      });
    }
    return {
      messages: messages.map((m) => ({
        ...m,
        sender_name: nameById.get(m.sender_id) ?? "",
        sender_role: labelById.get(m.sender_id) ?? "",
        sender_side: (sideById.get(m.sender_id) ?? "corp") as Side,
      })),
    };
  });

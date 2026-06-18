import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Project listing + detail for the Projects tab. Reads go through the user
// client so RLS (projects_select / project_members / project_workers) decides
// visibility. New tables are not yet in the generated Database types, so calls
// against them are cast `as any` like the rest of the attendance layer.

type MyProject = {
  id: string;
  name: string;
  status: string;
  address: string | null;
  start_date: string | null;
  my_role: string;
  counterparty: string;
};

/**
 * Every project the caller can access (owner OR member), with their relation to
 * it and the counterparty's name. RLS (projects_select) already scopes the rows
 * to the caller, so this works uniformly for corporation, contractor, foreman
 * and operations manager — incl. completed projects (history).
 */
export const listMyProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: projects, error } = await supabase
      .from("projects")
      .select("id, name, status, address, start_date, contractor_id, corporation_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = (projects ?? []) as {
      id: string;
      name: string;
      status: string;
      address: string | null;
      start_date: string | null;
      contractor_id: string;
      corporation_id: string;
    }[];

    // My membership role per project (for non-owner sub-users).
    const { data: mems } = await (supabase as any)
      .from("project_members")
      .select("project_id, role")
      .eq("user_id", userId);
    const roleByProject = new Map<string, string>(
      ((mems ?? []) as { project_id: string; role: string }[]).map((m) => [m.project_id, m.role]),
    );
    // Admin sees every project (RLS allows it) as a read-only observer.
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    // Resolve counterparty display names.
    const partyIds = [...new Set(rows.flatMap((p) => [p.contractor_id, p.corporation_id]))];
    const nameById = new Map<string, string>();
    if (partyIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, company_name")
        .in("user_id", partyIds);
      (profs ?? []).forEach((p) => nameById.set(p.user_id, p.company_name || p.full_name || ""));
    }

    const result: MyProject[] = rows.map((p) => {
      let myRole: string;
      if (p.contractor_id === userId) myRole = "contractor";
      else if (p.corporation_id === userId) myRole = "corporation";
      else myRole = roleByProject.get(p.id) ?? (isAdmin ? "admin" : "viewer");
      // Counterparty = the "other side" relative to me.
      const counterpartyId = ["contractor", "site_manager"].includes(myRole)
        ? p.corporation_id
        : p.contractor_id;
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        address: p.address,
        start_date: p.start_date,
        my_role: myRole,
        counterparty: nameById.get(counterpartyId) ?? "",
      };
    });
    return { projects: result };
  });

/** Corporation lists the projects it was awarded. */
export const listCorporationProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("projects")
      .select(
        "id, name, address, status, start_date, hourly_rate, expected_workers, contractor_id, site_lat, site_lng",
      )
      .eq("corporation_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { projects: data ?? [] };
  });

type Member = {
  id: string;
  user_id: string;
  role: string;
  name: string | null;
  phone: string | null;
};

/**
 * Full detail for one project: the row, its provisioned members, worker roster,
 * teams, and a readiness summary for both sides. Any project party can read
 * (RLS-gated); we surface a `viewerRole` hint so the UI can tailor tabs.
 */
export const getProjectDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!project) throw new Error("פרויקט לא נמצא");

    const [{ data: members }, { data: workers }, { data: teams }] = await Promise.all([
      (supabase as any)
        .from("project_members")
        .select("id, user_id, role, name, phone")
        .eq("project_id", data.projectId),
      (supabase as any)
        .from("project_workers")
        .select("id, first_name, last_name, passport_number, nationality, status, added_by_role")
        .eq("project_id", data.projectId)
        .eq("status", "active")
        .order("created_at", { ascending: true }),
      (supabase as any)
        .from("project_teams")
        .select(
          "id, name, team_leader_id, team_leader_name, team_leader_phone, expected_workers, hourly_rate",
        )
        .eq("project_id", data.projectId),
    ]);

    const memberList = (members ?? []) as Member[];
    const byRole = (r: string) => memberList.filter((m) => m.role === r);
    const coordinator = byRole("team_leader")[0] ?? null;
    const opsManager = byRole("operations_manager")[0] ?? null;
    const foremen = byRole("site_manager");

    // Identify how the current viewer relates to the project (drives the UI).
    let viewerRole: string;
    if (project.contractor_id === userId) viewerRole = "contractor";
    else if (project.corporation_id === userId) viewerRole = "corporation";
    else {
      const memberRole = memberList.find((m) => m.user_id === userId)?.role;
      if (memberRole) viewerRole = memberRole;
      else {
        // Admin = read-only observer of every project.
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: userId,
          _role: "admin",
        });
        viewerRole = isAdmin ? "admin" : "viewer";
      }
    }

    const readiness = {
      // Contractor side
      siteLocationSet: project.site_lat != null && project.site_lng != null,
      primaryForemanSet: foremen.length >= 1,
      // Corporation side
      coordinatorSet: !!coordinator,
      opsManagerSet: !!opsManager,
      workersAdded: (workers ?? []).length > 0,
    };

    return {
      project,
      members: memberList,
      coordinator,
      opsManager,
      foremen,
      workers: workers ?? [],
      teams: teams ?? [],
      viewerRole,
      readiness,
    };
  });

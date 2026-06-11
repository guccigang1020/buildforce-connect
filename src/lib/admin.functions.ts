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

// Admin oversight of the whole marketplace: every request with all its offers,
// corporation identities revealed (admin-only — corporations never see this).
export const adminGetAllRequestsWithOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ supabaseAdmin }, { assertAdmin }] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/lib/admin.server"),
    ]);
    await assertAdmin(context.userId);

    const { data: requests, error: reqErr } = await supabaseAdmin
      .from("job_requests")
      .select("id, location, start_date, duration, status, created_at, deadline_at, user_id")
      .order("created_at", { ascending: false })
      .limit(200);
    if (reqErr) throw new Error(reqErr.message);

    const reqIds = (requests ?? []).map((r) => r.id);
    const ownerIds = Array.from(new Set((requests ?? []).map((r) => r.user_id)));

    const [{ data: offers }, { data: items }, { data: owners }] = await Promise.all([
      reqIds.length
        ? supabaseAdmin
            .from("job_offers")
            .select(
              "id, request_id, corporation_id, price_per_hour, available_workers, start_date, status, created_at",
            )
            .in("request_id", reqIds)
            .order("price_per_hour", { ascending: true })
        : Promise.resolve({ data: [] as never[] }),
      reqIds.length
        ? supabaseAdmin
            .from("job_request_items")
            .select("request_id, role, nationality, count")
            .in("request_id", reqIds)
        : Promise.resolve({ data: [] as never[] }),
      ownerIds.length
        ? supabaseAdmin
            .from("profiles")
            .select("user_id, full_name, company_name")
            .in("user_id", ownerIds)
        : Promise.resolve({ data: [] as never[] }),
    ]);

    // Corporation names for every offer
    const corpIds = Array.from(new Set((offers ?? []).map((o) => o.corporation_id)));
    const { data: corps } = corpIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("user_id, full_name, company_name")
          .in("user_id", corpIds)
      : { data: [] as never[] };

    const corpName = new Map(
      (corps ?? []).map((c) => [c.user_id, c.company_name || c.full_name || "—"]),
    );
    const ownerName = new Map(
      (owners ?? []).map((o) => [o.user_id, o.full_name || o.company_name || "—"]),
    );

    type AdminOffer = {
      id: string;
      request_id: string;
      corporation_id: string;
      price_per_hour: number;
      available_workers: number;
      start_date: string;
      status: string;
      created_at: string;
      corporation_name: string;
    };
    type AdminItem = { request_id: string; role: string; nationality: string; count: number };

    const offersByReq = new Map<string, AdminOffer[]>();
    for (const o of offers ?? []) {
      const arr = offersByReq.get(o.request_id) ?? [];
      arr.push({ ...o, corporation_name: corpName.get(o.corporation_id) ?? "—" });
      offersByReq.set(o.request_id, arr);
    }
    const itemsByReq = new Map<string, AdminItem[]>();
    for (const it of items ?? []) {
      const arr = itemsByReq.get(it.request_id) ?? [];
      arr.push(it);
      itemsByReq.set(it.request_id, arr);
    }

    return {
      requests: (requests ?? []).map((r) => ({
        ...r,
        owner_name: ownerName.get(r.user_id) ?? "—",
        items: itemsByReq.get(r.id) ?? [],
        offers: offersByReq.get(r.id) ?? [],
      })),
    };
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

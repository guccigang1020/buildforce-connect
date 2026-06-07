import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTransactionalEmailServer } from "@/lib/email/send.server";

const itemSchema = z.object({
  role: z.string().min(1),
  nationality: z.string().min(1),
  count: z.number().int().positive(),
});

const inputSchema = z.object({
  location: z.string().min(1),
  startDate: z.string().min(1),
  duration: z.string().min(1),
  commitmentMonths: z.string().min(1),
  budget: z.string().optional().default(""),
  description: z.string().optional().default(""),
  contactName: z.string().min(1),
  contactPhone: z.string().min(1),
  items: z.array(itemSchema).min(1),
});

export const createJobRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: req, error: reqErr } = await supabase
      .from("job_requests")
      .insert({
        user_id: userId,
        location: data.location,
        start_date: data.startDate,
        duration: data.duration,
        commitment_months: data.commitmentMonths,
        budget: data.budget || null,
        description: data.description || null,
      })
      .select("id")
      .single();
    if (reqErr || !req) throw new Error(reqErr?.message || "Failed to create request");

    // Store sensitive contact info in a separate table; only owner + winning corp can read.
    const { error: cErr } = await supabase.from("job_request_contacts").insert({
      request_id: req.id,
      contact_name: data.contactName,
      contact_phone: data.contactPhone,
    });
    if (cErr) throw new Error(cErr.message);

    const itemsPayload = data.items.map((it) => ({
      request_id: req.id,
      role: it.role,
      nationality: it.nationality,
      count: it.count,
    }));
    const { error: itemsErr } = await supabase.from("job_request_items").insert(itemsPayload);
    if (itemsErr) throw new Error(itemsErr.message);

    // Notify ALL corporations (pending + approved) so they can browse new jobs
    const { data: corpRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "corporation");

    const corpUserIds = (corpRoles ?? []).map((r) => r.user_id);
    let recipients: { user_id: string; email: string | null }[] = [];
    if (corpUserIds.length > 0) {
      const { data: corps } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email")
        .in("user_id", corpUserIds);
      recipients = (corps ?? []).filter((c) => c.email);
    }

    const totalWorkers = data.items.reduce((s, it) => s + it.count, 0);
    const categories = Array.from(new Set(data.items.map((i) => i.role))).join(", ");

    await Promise.allSettled(
      recipients.map((r) =>
        sendTransactionalEmailServer({
          templateName: "new-job-request",
          recipientEmail: r.email!,
          idempotencyKey: `new-job-request-${req.id}-${r.user_id}`,
          templateData: {
            category: categories,
            workersCount: totalWorkers,
            city: data.location,
            startDate: data.startDate,
            requestId: req.id,
          },
        }),
      ),
    );

    return { id: req.id, notified: recipients.length };
  });

export const listMyJobRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("job_requests")
      .select("id, location, start_date, duration, status, created_at, deadline_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const requests = data ?? [];
    if (requests.length === 0) return { requests: [] };

    const ids = requests.map((r) => r.id);
    const [{ data: offers }, { data: items }] = await Promise.all([
      supabase
        .from("job_offers")
        .select("request_id, price_per_hour, status")
        .in("request_id", ids),
      supabase.from("job_request_items").select("request_id, count, role").in("request_id", ids),
    ]);

    const offersByReq = new Map<string, { total: number; min: number | null }>();
    for (const o of offers ?? []) {
      if (o.status === "withdrawn") continue;
      const cur = offersByReq.get(o.request_id) ?? { total: 0, min: null as number | null };
      cur.total += 1;
      const price = Number(o.price_per_hour);
      cur.min = cur.min == null ? price : Math.min(cur.min, price);
      offersByReq.set(o.request_id, cur);
    }
    const itemsByReq = new Map<string, { workers: number; roles: string[] }>();
    for (const it of items ?? []) {
      const cur = itemsByReq.get(it.request_id) ?? { workers: 0, roles: [] as string[] };
      cur.workers += it.count ?? 0;
      if (it.role && !cur.roles.includes(it.role)) cur.roles.push(it.role);
      itemsByReq.set(it.request_id, cur);
    }

    return {
      requests: requests.map((r) => ({
        ...r,
        offers_count: offersByReq.get(r.id)?.total ?? 0,
        min_price: offersByReq.get(r.id)?.min ?? null,
        workers_count: itemsByReq.get(r.id)?.workers ?? 0,
        roles: itemsByReq.get(r.id)?.roles ?? [],
      })),
    };
  });

export const listOpenJobRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    void context;
    // Use admin client: marketplace listing must work for any authenticated
    // corp, even before they've submitted an offer. Only safe columns are
    // selected — contact_name/contact_phone are never returned here.
    const { data, error } = await supabaseAdmin
      .from("job_requests")
      .select(
        "id, location, start_date, duration, commitment_months, budget, created_at, deadline_at",
      )
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { requests: data ?? [] };
  });

export const getJobRequestWithOffers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // Admin client: corp may not yet have an offer (RLS would block).
    // We redact sensitive fields below for non-owners.
    const { data: req, error: rErr } = await supabaseAdmin
      .from("job_requests")
      .select("*")
      .eq("id", data.id)
      .single();
    if (rErr || !req) throw new Error("בקשה לא נמצאה");

    const isOwner = req.user_id === userId;

    // Contact info lives in job_request_contacts (RLS protected).
    // Owners (and winning corps post-award) can read it.
    let contact_name = "";
    let contact_phone = "";
    if (isOwner) {
      const { data: c } = await supabaseAdmin
        .from("job_request_contacts")
        .select("contact_name, contact_phone")
        .eq("request_id", data.id)
        .maybeSingle();
      contact_name = c?.contact_name ?? "";
      contact_phone = c?.contact_phone ?? "";
    }

    const [{ data: items }, { data: offers }] = await Promise.all([
      supabaseAdmin.from("job_request_items").select("*").eq("request_id", data.id),
      supabaseAdmin
        .from("job_offers")
        .select("*")
        .eq("request_id", data.id)
        .order("price_per_hour", { ascending: true }),
    ]);

    // Non-owners can only see their own offer (sealed-bid integrity).
    const allOffers = offers ?? [];
    const visibleOffers = isOwner
      ? allOffers
      : allOffers.filter((o) => o.corporation_id === userId);

    return {
      request: { ...req, contact_name, contact_phone },
      items: items ?? [],
      offers: visibleOffers,
      offers_count: allOffers.length,
      isOwner,
    };
  });

export const closeJobRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("job_requests")
      .update({ status: "closed" })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

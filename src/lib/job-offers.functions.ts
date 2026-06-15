import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const submitSchema = z.object({
  requestId: z.string().uuid(),
  pricePerHour: z.number().min(50, "מחיר לשעה חייב להיות לפחות ₪50").max(500, "מחיר לשעה לא יכול לעלות על ₪500"),
  availableWorkers: z.number().int().positive().max(10000),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין")
    .refine((d) => d >= new Date().toISOString().slice(0, 10), {
      message: "תאריך ההתחלה לא יכול להיות בעבר",
    }),
  note: z.string().max(2000).optional(),
});

export const submitOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ supabaseAdmin }, { sendTransactionalEmailServer }] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/lib/email/send.server"),
    ]);

    // Corporations bid freely — no admin approval is required to submit offers.

    // One bid per corporation per request — a second submission is rejected
    // (a withdrawn bid may be replaced by a new one).
    const { data: existing } = await supabaseAdmin
      .from("job_offers")
      .select("id, status")
      .eq("request_id", data.requestId)
      .eq("corporation_id", userId)
      .neq("status", "withdrawn")
      .limit(1)
      .maybeSingle();
    if (existing) {
      throw new Error("כבר הגשת הצעה למכרז זה — ניתן להגיש הצעה אחת בלבד לכל מכרז.");
    }

    const { data: offer, error } = await supabase
      .from("job_offers")
      .insert({
        request_id: data.requestId,
        corporation_id: userId,
        price_per_hour: data.pricePerHour,
        available_workers: data.availableWorkers,
        start_date: data.startDate,
        note: data.note ?? null,
      })
      .select("id, request_id")
      .single();
    if (error || !offer) throw new Error(error?.message || "Failed to submit offer");

    // Race guard (double-click / two tabs): if two inserts slipped past the
    // pre-check concurrently, keep only the FIRST active offer and roll back
    // this one. (The DB unique index in the hardening migration makes this
    // impossible at the schema level once applied.)
    const { data: actives } = await supabaseAdmin
      .from("job_offers")
      .select("id, created_at")
      .eq("request_id", data.requestId)
      .eq("corporation_id", userId)
      .neq("status", "withdrawn")
      .order("created_at", { ascending: true });
    if ((actives?.length ?? 0) > 1 && actives![0].id !== offer.id) {
      await supabaseAdmin.from("job_offers").delete().eq("id", offer.id);
      throw new Error("כבר הגשת הצעה למכרז זה — ניתן להגיש הצעה אחת בלבד לכל מכרז.");
    }

    // Notify request owner
    const { data: req } = await supabaseAdmin
      .from("job_requests")
      .select("id, user_id")
      .eq("id", data.requestId)
      .single();
    if (req) {
      const { data: ownerProfile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("user_id", req.user_id)
        .maybeSingle();
      if (ownerProfile?.email) {
        await sendTransactionalEmailServer({
          templateName: "offer-submitted",
          recipientEmail: ownerProfile.email,
          idempotencyKey: `offer-submitted-${offer.id}`,
          templateData: {
            pricePerHour: data.pricePerHour,
            workersCount: data.availableWorkers,
            startDate: data.startDate,
            requestId: req.id,
          },
        });
      }
    }
    return { id: offer.id };
  });

export const withdrawOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ offerId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("job_offers")
      .update({ status: "withdrawn" })
      .eq("id", data.offerId)
      .eq("corporation_id", userId)
      .eq("status", "submitted");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listOffersForRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ requestId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Owners see all offers; corporations only see their own (sealed-bid)
    const { data: req } = await supabaseAdmin
      .from("job_requests")
      .select("user_id")
      .eq("id", data.requestId)
      .maybeSingle();
    const isOwner = req?.user_id === userId;

    const { data: offers, error } = isOwner
      ? await supabaseAdmin
          .from("job_offers")
          .select("*")
          .eq("request_id", data.requestId)
          .order("price_per_hour", { ascending: true })
      : await supabaseAdmin
          .from("job_offers")
          .select("*")
          .eq("request_id", data.requestId)
          .eq("corporation_id", userId)
          .order("price_per_hour", { ascending: true });
    if (error) throw new Error(error.message);
    return { offers: offers ?? [] };
  });

export const listMyOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: offers, error } = await supabase
      .from("job_offers")
      .select(
        "id, request_id, price_per_hour, available_workers, start_date, status, created_at, updated_at",
      )
      .eq("corporation_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const reqIds = Array.from(new Set((offers ?? []).map((o) => o.request_id)));
    let requestsById = new Map<
      string,
      { location: string; start_date: string; duration: string }
    >();
    if (reqIds.length > 0) {
      const { data: reqs } = await supabase
        .from("job_requests")
        .select("id, location, start_date, duration")
        .in("id", reqIds);
      requestsById = new Map(
        (reqs ?? []).map((r) => [
          r.id,
          { location: r.location, start_date: r.start_date, duration: r.duration },
        ]),
      );
    }
    return {
      offers: (offers ?? []).map((o) => ({
        ...o,
        request: requestsById.get(o.request_id) ?? null,
      })),
    };
  });

export const awardOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ offerId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ supabaseAdmin }, { sendTransactionalEmailServer }] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/lib/email/send.server"),
    ]);

    // Fetch offer + ensure ownership
    const { data: offer, error: oErr } = await supabase
      .from("job_offers")
      .select("id, request_id, corporation_id, status, price_per_hour")
      .eq("id", data.offerId)
      .single();
    if (oErr || !offer) throw new Error("הצעה לא נמצאה");
    if (offer.status !== "submitted") throw new Error("ההצעה אינה זמינה לבחירה");

    const { data: req, error: rErr } = await supabase
      .from("job_requests")
      .select("id, user_id, location, start_date, status")
      .eq("id", offer.request_id)
      .single();
    if (rErr || !req) throw new Error("בקשה לא נמצאה");
    if (req.user_id !== userId) throw new Error("Unauthorized");
    if (req.status !== "open") throw new Error("הבקשה כבר נסגרה");

    // Insert award and get its id back
    const { data: award, error: awErr } = await supabase
      .from("job_awards")
      .insert({
        request_id: offer.request_id,
        offer_id: offer.id,
        corporation_id: offer.corporation_id,
        awarded_by: userId,
      })
      .select("id")
      .single();
    if (awErr || !award) throw new Error(awErr?.message ?? "Failed to create award");

    // Explicitly update statuses in case the DB trigger is absent
    await supabaseAdmin.from("job_requests").update({ status: "awarded" }).eq("id", req.id);

    // Only reject offers that are still submitted — withdrawn offers keep their status
    const { data: allOfferIds } = await supabaseAdmin
      .from("job_offers")
      .select("id")
      .eq("request_id", offer.request_id)
      .eq("status", "submitted")
      .neq("id", offer.id);
    const loserIds = (allOfferIds ?? []).map((o) => o.id);
    if (loserIds.length > 0) {
      await supabaseAdmin.from("job_offers").update({ status: "rejected" }).in("id", loserIds);
    }
    await supabaseAdmin.from("job_offers").update({ status: "awarded" }).eq("id", offer.id);

    // Create a project record so the attendance/delivery workflow can proceed.
    // req.start_date is a free-text field (e.g. "ASAP", "01/01/2026") — do NOT pass it
    // to projects.start_date which is a DATE column; let it default to CURRENT_DATE.
    const { data: reqItems } = await supabaseAdmin
      .from("job_request_items")
      .select("count")
      .eq("request_id", req.id);
    const totalWorkers = (reqItems ?? []).reduce((s, it) => s + (it.count ?? 0), 0);
    const { error: projErr } = await supabaseAdmin.from("projects").insert({
      contractor_id: req.user_id,
      corporation_id: offer.corporation_id,
      name: req.location,
      expected_workers: totalWorkers,
      hourly_rate: Number(offer.price_per_hour),
      source_award_id: award.id,
      source_request_id: req.id,
      status: "active",
    });
    if (projErr) throw new Error(`[awardOffer] project creation failed: ${projErr.message}`);

    // Fetch contact info from the dedicated table for the award notification.
    const { data: contact } = await supabaseAdmin
      .from("job_request_contacts")
      .select("contact_name, contact_phone")
      .eq("request_id", req.id)
      .maybeSingle();

    // Get all corp emails (winner + losers)
    const { data: allOffers } = await supabaseAdmin
      .from("job_offers")
      .select("id, corporation_id, status")
      .eq("request_id", offer.request_id);
    const corpIds = (allOffers ?? []).map((o) => o.corporation_id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, email")
      .in("user_id", corpIds);
    const emailByUser = new Map((profiles ?? []).map((p) => [p.user_id, p.email] as const));

    await Promise.allSettled(
      (allOffers ?? []).map((o) => {
        const email = emailByUser.get(o.corporation_id);
        if (!email) return null;
        if (o.id === offer.id) {
          return sendTransactionalEmailServer({
            templateName: "offer-awarded",
            recipientEmail: email,
            idempotencyKey: `offer-awarded-${o.id}`,
            templateData: {
              contactName: contact?.contact_name ?? "",
              contactPhone: contact?.contact_phone ?? "",
              location: req.location,
              startDate: req.start_date,
              requestId: req.id,
            },
          });
        }
        return sendTransactionalEmailServer({
          templateName: "offer-rejected",
          recipientEmail: email,
          idempotencyKey: `offer-rejected-${o.id}`,
        });
      }),
    );

    return { ok: true };
  });

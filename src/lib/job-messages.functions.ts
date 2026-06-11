import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Anti-circumvention filter — blocks contact details in pre-award messages.
 * Detects: phone numbers (Israeli + international), emails, common social handles.
 * Returns a reason string when blocked, or null when clean.
 */
function detectContactInfo(text: string): string | null {
  const normalized = text.replace(/[\s\-_.()]/g, "");
  // Email
  if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(text)) {
    return "נראה שההודעה כוללת כתובת אימייל. אסור לשתף פרטי קשר ישירים לפני בחירת הזוכה.";
  }
  // Phone — 9 to 15 digits in a row after stripping separators
  if (/(?:\+?\d{9,15})/.test(normalized)) {
    return "נראה שההודעה כוללת מספר טלפון. אסור לשתף פרטי קשר ישירים לפני בחירת הזוכה.";
  }
  // Common platform handles & URLs
  if (
    /(whatsapp|wa\.me|telegram|t\.me|instagram|facebook|messenger|signal|viber|@[a-z0-9_]{3,}|https?:\/\/)/i.test(
      text,
    )
  ) {
    return "נראה שההודעה כוללת קישור או שם משתמש חיצוני. תקשורת לפני זכייה חייבת להישאר בפלטפורמה.";
  }
  return null;
}

export const sendJobMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        corporationId: z.string().uuid(),
        body: z.string().min(1).max(4000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify caller belongs to this conversation:
    // either the request owner OR the corporation themselves (with an offer).
    const { data: req } = await supabase
      .from("job_requests")
      .select("user_id")
      .eq("id", data.requestId)
      .maybeSingle();
    const isOwner = req?.user_id === userId;
    const isCorp = userId === data.corporationId;
    if (!isOwner && !isCorp) {
      throw new Error("אין לך הרשאה לשלוח הודעות בשיחה זו");
    }
    if (isCorp) {
      const { data: offer } = await supabase
        .from("job_offers")
        .select("id")
        .eq("request_id", data.requestId)
        .eq("corporation_id", userId)
        .maybeSingle();
      if (!offer) throw new Error("יש להגיש הצעה לפני שליחת הודעות");
    }

    // Block contact details until an award exists for this request.
    const { data: award } = await supabase
      .from("job_awards")
      .select("id")
      .eq("request_id", data.requestId)
      .maybeSingle();
    if (!award) {
      const violation = detectContactInfo(data.body);
      if (violation) {
        throw new Error(violation + " פעולה זו מתועדת ועלולה להוביל להשעיה ולקנס לפי תנאי השימוש.");
      }
    }

    const { data: msg, error } = await (supabase as any)
      .from("job_request_messages")
      .insert({
        request_id: data.requestId,
        corporation_id: data.corporationId,
        sender_id: userId,
        body: data.body,
      })
      .select("id, created_at")
      .single();
    if (error || !msg) throw new Error(error?.message || "Failed to send message");
    return { id: (msg as any).id, createdAt: (msg as any).created_at };
  });

export const listJobMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        corporationId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify membership before returning a private thread.
    const { data: req } = await supabase
      .from("job_requests")
      .select("user_id")
      .eq("id", data.requestId)
      .maybeSingle();
    const isOwner = req?.user_id === userId;
    const isCorp = userId === data.corporationId;
    if (!isOwner && !isCorp) {
      throw new Error("אין לך הרשאה לצפות בשיחה זו");
    }
    const { data: messages, error } = await (supabase as any)
      .from("job_request_messages")
      .select("*")
      .eq("request_id", data.requestId)
      .eq("corporation_id", data.corporationId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return { messages: messages ?? [] };
  });

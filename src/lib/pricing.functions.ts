import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const WORKER_TYPE_VALUES = ["thai", "chinese", "team_leader", "professional", "custom"] as const;

export const upsertPricingRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        workerType: z.enum(WORKER_TYPE_VALUES),
        costPricePerHour: z.number().min(0).max(10000),
        salePricePerHour: z.number().min(0).max(10000),
        customLabel: z.string().max(100).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("worker_pricing_rules")
      .upsert(
        {
          corporation_id: userId,
          worker_type: data.workerType,
          cost_price_per_hour: data.costPricePerHour,
          sale_price_per_hour: data.salePricePerHour,
          custom_label: data.customLabel ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "corporation_id,worker_type" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listPricingRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d))
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("worker_pricing_rules")
      .select("id, worker_type, custom_label, cost_price_per_hour, sale_price_per_hour, updated_at")
      .eq("corporation_id", userId)
      .order("worker_type");
    if (error) throw new Error(error.message);
    return { rules: data ?? [] };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Returns the last 13 months of daily_approved_accounts for the corporation.
// All aggregation (monthly/weekly/daily/by-contractor/by-project) is done client-side
// so the period selector can filter without re-fetching.
export const getFinancialDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d))
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 13);
    startDate.setDate(1);
    const startIso = startDate.toISOString().slice(0, 10);

    const { data: accounts, error } = await supabase
      .from("daily_approved_accounts")
      .select(
        "work_date, contractor_id, contractor_name, project_id, project_name, worker_type, total_sale, labor_cost, total_profit, total_hours, total_worker_hours, approval_method, has_exception",
      )
      .eq("corporation_id", userId)
      .gte("work_date", startIso)
      .order("work_date", { ascending: true });

    if (error) throw new Error(error.message);
    return { accounts: accounts ?? [] };
  });

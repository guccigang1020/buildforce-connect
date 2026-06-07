import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { upsertPricingRule, listPricingRules } from "@/lib/pricing.functions";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, TrendingUp, Loader2 } from "lucide-react";

export const Route = createFileRoute("/corporation/pricing")({
  head: () => ({ meta: [{ title: "תמחור — BuildForce" }] }),
  component: Page,
});

const WORKER_TYPES = [
  { type: "thai" as const, label: "עובד תאילנדי" },
  { type: "chinese" as const, label: "עובד סיני" },
  { type: "team_leader" as const, label: "ראש צוות" },
  { type: "professional" as const, label: "עובד מקצועי" },
  { type: "custom" as const, label: "תעריף מותאם", hasCustomLabel: true },
];

type WorkerType = "thai" | "chinese" | "team_leader" | "professional" | "custom";

type PricingRule = {
  worker_type: string;
  cost_price_per_hour: number;
  sale_price_per_hour: number;
  custom_label: string | null;
  updated_at: string;
};

function Page() {
  const listRules = useServerFn(listPricingRules);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["pricing-rules"],
    queryFn: () => listRules({ data: {} }),
  });

  const rulesMap = new Map<string, PricingRule>(
    (data?.rules ?? []).map((r) => [r.worker_type, r as PricingRule]),
  );

  return (
    <AppShell title="הגדרות תמחור">
      <div className="space-y-6">
        {/* Header card */}
        <div className="enterprise-card bg-gradient-to-l from-primary/5 to-transparent p-5 animate-fade-up">
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-primary shadow-elegant text-primary-foreground">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold">תמחור סוגי עובדים</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                הגדר עלות ומחיר מכירה לכל סוג עובד. השינויים יחולו על חשבונות חדשים בלבד.
              </p>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 animate-fade-up delay-100 text-sm">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <p>
              <span className="font-semibold">כיצד פועל התמחור: </span>
              <strong>עלות</strong> = מה שאתם משלמים לעובד. <strong>מכירה</strong> = תעריף הפרויקט שהקבלן שילם לכם.
              <strong> רווח</strong> = מכירה פחות עלות לכל שעה. <strong>יום</strong> = 8 שעות עבודה.
            </p>
          </div>
        </div>

        {/* Pricing cards */}
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> טוען תמחור…
          </div>
        ) : (
          <div className="space-y-3 animate-fade-up delay-200">
            {WORKER_TYPES.map((wt) => (
              <PricingCard
                key={wt.type}
                workerType={wt.type}
                workerLabel={wt.label}
                hasCustomLabel={"hasCustomLabel" in wt && wt.hasCustomLabel === true}
                existingRule={rulesMap.get(wt.type)}
                onSaved={() => qc.invalidateQueries({ queryKey: ["pricing-rules"] })}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function PricingCard({
  workerType,
  workerLabel,
  hasCustomLabel,
  existingRule,
  onSaved,
}: {
  workerType: WorkerType;
  workerLabel: string;
  hasCustomLabel: boolean;
  existingRule: PricingRule | undefined;
  onSaved: () => void;
}) {
  const upsert = useServerFn(upsertPricingRule);

  const [costPrice, setCostPrice] = useState(
    existingRule ? String(existingRule.cost_price_per_hour) : "",
  );
  const [salePrice, setSalePrice] = useState(
    existingRule ? String(existingRule.sale_price_per_hour) : "",
  );
  const [customLabel, setCustomLabel] = useState(existingRule?.custom_label ?? "");
  const [busy, setBusy] = useState(false);

  const cost = parseFloat(costPrice) || 0;
  const sale = parseFloat(salePrice) || 0;
  const hasPricing = !!existingRule;
  const hasValues = costPrice !== "" || salePrice !== "";
  const profitPerHour = sale - cost;
  const profitPerDay = profitPerHour * 8;
  const profitColor =
    profitPerHour > 0
      ? "text-emerald-600"
      : profitPerHour < 0
        ? "text-destructive"
        : "text-muted-foreground";

  const save = async () => {
    if (!costPrice || !salePrice) return toast.error("יש להזין עלות ומחיר מכירה");
    setBusy(true);
    try {
      await upsert({
        data: {
          workerType,
          costPricePerHour: cost,
          salePricePerHour: sale,
          ...(hasCustomLabel && customLabel ? { customLabel } : {}),
        },
      });
      toast.success(`תמחור "${workerLabel}" נשמר`);
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`enterprise-card p-5 ${hasPricing ? "border-emerald-500/30 bg-emerald-500/2" : ""}`}
    >
      <div className="flex flex-wrap items-end gap-4">
        {/* Worker type label */}
        <div className="w-40 shrink-0">
          <div className="text-sm font-bold">{workerLabel}</div>
          {hasCustomLabel && (
            <Input
              placeholder="שם מותאם"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              className="mt-1.5 h-8 text-xs"
            />
          )}
          {hasPricing && (
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              מוגדר
            </div>
          )}
        </div>

        {/* Price inputs */}
        <div className="min-w-[110px]">
          <Label className="mb-1.5 block text-xs">עלות ₪/שעה</Label>
          <Input
            type="number"
            min={0}
            step={0.5}
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            className="h-9 text-sm"
            placeholder="0"
          />
        </div>

        <div className="min-w-[110px]">
          <Label className="mb-1.5 block text-xs">מכירה ₪/שעה</Label>
          <Input
            type="number"
            min={0}
            step={0.5}
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            className="h-9 text-sm"
            placeholder="0"
          />
        </div>

        {/* Computed fields */}
        <div className="min-w-[90px]">
          <Label className="mb-1.5 block text-xs text-muted-foreground">רווח ₪/שעה</Label>
          <div
            className={`flex h-9 items-center rounded-lg border border-border/40 bg-muted/30 px-3 text-sm font-bold ${profitColor}`}
          >
            {hasValues
              ? `${profitPerHour >= 0 ? "+" : ""}${profitPerHour.toFixed(2)}`
              : "—"}
          </div>
        </div>

        <div className="min-w-[90px]">
          <Label className="mb-1.5 block text-xs text-muted-foreground">רווח ₪/יום (8ש')</Label>
          <div
            className={`flex h-9 items-center rounded-lg border border-border/40 bg-muted/30 px-3 text-sm font-bold ${profitColor}`}
          >
            {hasValues
              ? `${profitPerDay >= 0 ? "+" : ""}${profitPerDay.toFixed(0)}`
              : "—"}
          </div>
        </div>

        {/* Save button */}
        <Button
          onClick={save}
          disabled={busy}
          size="sm"
          className="h-9 gap-2 bg-gradient-primary text-primary-foreground shadow-elegant"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          שמור
        </Button>
      </div>
    </div>
  );
}

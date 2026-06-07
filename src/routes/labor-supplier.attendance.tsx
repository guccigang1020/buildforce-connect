import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listCorporationAttendance, getMonthlySummary } from "@/lib/attendance.functions";
import { Card } from "@/components/ui/card";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Clock, Users, TrendingUp, Coins, Loader2, CalendarDays } from "lucide-react";

type CorpAttendanceRecord = {
  id: string;
  status: string;
  workers_actual: number | null;
  workers_expected: number;
  total_cost: number | null;
  projects?: { name: string } | null;
  project_teams?: { name: string } | null;
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: {
    label: "ממתין לאישור",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  },
  approved: {
    label: "אושר",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  },
  auto_approved: {
    label: "אושר אוטומטית",
    className: "border-slate-400/40 bg-slate-100 text-slate-600",
  },
  exception: {
    label: "חריגה",
    className: "border-orange-500/40 bg-orange-500/10 text-orange-700",
  },
  rejected: {
    label: "נדחה",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
};

export const Route = createFileRoute("/labor-supplier/attendance")({
  head: () => ({ meta: [{ title: "נוכחות — תאגיד כוח אדם" }] }),
  component: Page,
});

function Page() {
  const list = useServerFn(listCorporationAttendance);
  const monthly = useServerFn(getMonthlySummary);
  const today = new Date();
  const { data, isLoading } = useQuery({
    queryKey: ["corp-att"],
    queryFn: () => list({ data: {} }),
  });
  const { data: m } = useQuery({
    queryKey: ["corp-monthly", today.getFullYear(), today.getMonth() + 1],
    queryFn: () =>
      monthly({
        data: { role: "corporation", year: today.getFullYear(), month: today.getMonth() + 1 },
      }),
  });
  const records = data?.records ?? [];
  const sum = m?.summary;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14" dir="rtl">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">
            תאגיד כוח אדם
          </div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">נוכחות צוותים</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {today.toLocaleDateString("he-IL", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {sum && (
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KPI
              icon={CalendarDays}
              label="ימים מאושרים החודש"
              value={String(sum.approved)}
              accent
            />
            <KPI
              icon={TrendingUp}
              label="חריגות"
              value={String(sum.exceptions)}
              warnColor
            />
            <KPI
              icon={Clock}
              label="שעות בסה״כ"
              value={sum.totalHours.toFixed(1)}
            />
            <KPI
              icon={Coins}
              label="עלות מאושרת"
              value={`₪${sum.totalCost.toLocaleString()}`}
            />
          </div>
        )}

        <div className="mt-8">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 text-primary" /> היום
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-card p-12 text-sm text-muted-foreground">
              <Loader2 className="ml-2 h-4 w-4 animate-spin" /> טוען נוכחות…
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">אין רשומות נוכחות להיום.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((r: CorpAttendanceRecord) => {
                const s = STATUS_META[r.status] ?? STATUS_META.pending;
                return (
                  <Card key={r.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 font-bold">
                          {r.projects?.name}
                          {r.project_teams?.name ? ` · ${r.project_teams.name}` : ""}
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.className}`}
                          >
                            {s.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {r.workers_actual ?? "—"}/{r.workers_expected} עובדים
                          </span>
                          {r.total_cost && (
                            <span className="font-semibold text-foreground">
                              ₪{Number(r.total_cost).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  accent,
  warnColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
  warnColor?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${accent ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card"}`}
    >
      <div
        className={`grid h-10 w-10 place-items-center rounded-lg ${accent ? "bg-gradient-primary text-primary-foreground" : "bg-primary/15 text-primary"}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div
        className={`mt-4 text-2xl font-extrabold tracking-tight md:text-3xl ${warnColor ? "text-orange-600" : ""}`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

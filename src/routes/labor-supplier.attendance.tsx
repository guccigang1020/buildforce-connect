import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listCorporationAttendance, getMonthlySummary } from "@/lib/attendance.functions";
import { AppShell } from "@/components/app-shell";
import { Clock, Users, TrendingUp, Coins, Loader2, CalendarDays, AlertTriangle } from "lucide-react";

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
    <AppShell title="נוכחות צוותים">
      <div className="space-y-6">
        {/* Date header */}
        <div className="animate-fade-up">
          <p className="text-sm text-muted-foreground">
            {today.toLocaleDateString("he-IL", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* KPIs */}
        {sum && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 animate-fade-up delay-100">
            <KpiCard
              icon={CalendarDays}
              label="ימים מאושרים החודש"
              value={String(sum.approved)}
              highlight
            />
            <KpiCard
              icon={TrendingUp}
              label="חריגות"
              value={String(sum.exceptions)}
              warn
            />
            <KpiCard
              icon={Clock}
              label="שעות בסה״כ"
              value={sum.totalHours.toFixed(1)}
            />
            <KpiCard
              icon={Coins}
              label="עלות מאושרת"
              value={`₪${sum.totalCost.toLocaleString()}`}
            />
          </div>
        )}

        {/* Today's records */}
        <div className="animate-fade-up delay-200">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-bold">היום</h3>
          </div>

          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="enterprise-card p-5">
                  <div className="h-5 w-48 rounded bg-muted" />
                  <div className="mt-2 h-4 w-32 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="enterprise-card flex flex-col items-center gap-4 border-dashed p-12 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-muted/50">
                <Users className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <div>
                <h4 className="font-bold">אין רשומות נוכחות</h4>
                <p className="mt-1 text-sm text-muted-foreground">לא נמצאו רשומות נוכחות להיום.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((r: CorpAttendanceRecord) => {
                const s = STATUS_META[r.status] ?? STATUS_META.pending;
                const fillRate =
                  r.workers_actual != null && r.workers_expected > 0
                    ? Math.round((r.workers_actual / r.workers_expected) * 100)
                    : null;
                return (
                  <div key={r.id} className="enterprise-card overflow-hidden hover-lift">
                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 font-bold">
                            {r.projects?.name}
                            {r.project_teams?.name ? ` · ${r.project_teams.name}` : ""}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {r.workers_actual ?? "—"}/{r.workers_expected} עובדים
                            </span>
                            {r.total_cost != null && (
                              <span className="font-semibold text-foreground">
                                ₪{Number(r.total_cost).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.className}`}
                        >
                          {s.label}
                        </span>
                      </div>

                      {fillRate !== null && (
                        <div className="mt-3">
                          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>נוכחות</span>
                            <span className="font-semibold">{fillRate}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-all ${
                                fillRate >= 90
                                  ? "bg-emerald-500"
                                  : fillRate >= 60
                                    ? "bg-amber-500"
                                    : "bg-destructive"
                              }`}
                              style={{ width: `${Math.min(fillRate, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {r.status === "exception" && (
                        <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-orange-500/5 px-3 py-2 text-xs text-orange-700">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          חריגה דווחה — ממתין לאישור קבלן
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  highlight,
  warn,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={`enterprise-card p-5 ${
        highlight ? "border-primary/30 bg-primary/5" : ""
      }`}
    >
      <div
        className={`grid h-10 w-10 place-items-center rounded-xl ${
          highlight
            ? "bg-gradient-primary text-primary-foreground shadow-elegant"
            : "bg-primary/15 text-primary"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div
        className={`mt-4 text-2xl font-extrabold tracking-tight md:text-3xl ${
          warn ? "text-orange-600" : ""
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

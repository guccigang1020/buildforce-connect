import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listCorporationAttendance, getMonthlySummary } from "@/lib/attendance.functions";
import { AppShell } from "@/components/app-shell";
import {
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  Coins,
  CalendarDays,
  AlertTriangle,
  Filter,
  BarChart3,
} from "lucide-react";

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

type FilterTab = "all" | "pending" | "approved" | "exception";

export const Route = createFileRoute("/labor-supplier/attendance")({
  head: () => ({ meta: [{ title: "נוכחות — תאגיד כוח אדם" }] }),
  component: Page,
});

function Page() {
  const list = useServerFn(listCorporationAttendance);
  const monthly = useServerFn(getMonthlySummary);
  const today = new Date();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

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

  // Previous month for real trend computation
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const { data: prevM } = useQuery({
    queryKey: ["corp-monthly", prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1],
    queryFn: () =>
      monthly({
        data: {
          role: "corporation",
          year: prevMonthDate.getFullYear(),
          month: prevMonthDate.getMonth() + 1,
        },
      }),
  });

  const records: CorpAttendanceRecord[] = data?.records ?? [];
  const sum = m?.summary;
  const prevSum = prevM?.summary;

  // Filter records by tab
  const filteredRecords = records.filter((r) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return r.status === "pending";
    if (activeTab === "approved") return r.status === "approved" || r.status === "auto_approved";
    if (activeTab === "exception") return r.status === "exception" || r.status === "rejected";
    return true;
  });

  // Tab counts
  const tabCounts: Record<FilterTab, number> = {
    all: records.length,
    pending: records.filter((r) => r.status === "pending").length,
    approved: records.filter((r) => r.status === "approved" || r.status === "auto_approved").length,
    exception: records.filter((r) => r.status === "exception" || r.status === "rejected").length,
  };

  // Overall attendance rate
  const totalActual = records.reduce((s, r) => s + (r.workers_actual ?? 0), 0);
  const totalExpected = records.reduce((s, r) => s + r.workers_expected, 0);
  const attendanceRate = totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : null;

  // Real trend computation — undefined when no prior data exists
  function makeTrend(
    current: number | undefined,
    prev: number | undefined,
    higherIsBetter: boolean,
  ): { label: string; positive: boolean } | undefined {
    if (current == null || prev == null || prev === 0) return undefined;
    const pct = Math.round(((current - prev) / prev) * 100);
    if (pct === 0) return undefined;
    const isPositive = higherIsBetter ? pct > 0 : pct < 0;
    return {
      label: `${pct > 0 ? "↑" : "↓"} ${Math.abs(pct)}% מחודש שעבר`,
      positive: isPositive,
    };
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "הכל" },
    { key: "pending", label: "ממתין לאישור" },
    { key: "approved", label: "אושר" },
    { key: "exception", label: "חריגות" },
  ];

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
              trend={makeTrend(sum.approved, prevSum?.approved, true)}
              highlight
            />
            <KpiCard
              icon={TrendingUp}
              label="חריגות"
              value={String(sum.exceptions)}
              trend={makeTrend(sum.exceptions, prevSum?.exceptions, false)}
              warn
            />
            <KpiCard
              icon={Clock}
              label="שעות בסה״כ"
              value={sum.totalHours.toFixed(1)}
              trend={makeTrend(sum.totalHours, prevSum?.totalHours, true)}
            />
            <KpiCard
              icon={Coins}
              label="עלות מאושרת"
              value={`₪${sum.totalCost.toLocaleString()}`}
              trend={makeTrend(sum.totalCost, prevSum?.totalCost, true)}
            />
          </div>
        )}

        {/* Today's records */}
        <div className="animate-fade-up delay-200">
          {/* Section header */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-bold">היום</h3>
            {attendanceRate !== null && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
                <BarChart3 className="h-3 w-3" /> {attendanceRate}% נוכחות כוללת
              </div>
            )}
          </div>

          {/* Filter tabs */}
          {!isLoading && records.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/30 px-2 py-1 text-xs text-muted-foreground">
                <Filter className="h-3 w-3" />
              </div>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                    activeTab === tab.key
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {tabCounts[tab.key] > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      activeTab === tab.key ? "bg-primary/20" : "bg-border/60"
                    }`}>
                      {tabCounts[tab.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="enterprise-card p-5">
                  <div className="h-5 w-48 rounded bg-muted" />
                  <div className="mt-2 h-4 w-32 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="enterprise-card flex flex-col items-center gap-4 border-dashed p-12 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-muted/50">
                <Users className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <div>
                <h4 className="font-bold">
                  {records.length === 0 ? "אין רשומות נוכחות" : "לא נמצאו רשומות בסינון זה"}
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {records.length === 0
                    ? "לא נמצאו רשומות נוכחות להיום."
                    : "נסה לשנות את הסינון."}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block enterprise-card overflow-hidden">
                <div className="grid grid-cols-5 bg-secondary/50 px-5 py-3 text-xs font-bold text-muted-foreground border-b border-border/40">
                  <span>פרויקט</span>
                  <span>צוות</span>
                  <span>נוכחות</span>
                  <span>עלות</span>
                  <span>סטטוס</span>
                </div>
                {filteredRecords.map((r) => {
                  const s = STATUS_META[r.status] ?? STATUS_META.pending;
                  const fillRate =
                    r.workers_actual != null && r.workers_expected > 0
                      ? Math.round((r.workers_actual / r.workers_expected) * 100)
                      : null;
                  return (
                    <div key={r.id} className="grid grid-cols-5 items-center border-t border-border/40 px-5 py-3.5 text-sm hover:bg-secondary/20 transition-colors">
                      <span className="font-semibold truncate">{r.projects?.name ?? "—"}</span>
                      <span className="text-muted-foreground truncate">{r.project_teams?.name ?? "—"}</span>
                      <div>
                        <div className="text-xs font-semibold">{r.workers_actual ?? "—"}/{r.workers_expected} עובדים</div>
                        {fillRate !== null && (
                          <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${fillRate >= 90 ? "bg-emerald-500" : fillRate >= 60 ? "bg-amber-500" : "bg-destructive"}`}
                              style={{ width: `${Math.min(fillRate, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <span className={`font-semibold ${r.total_cost != null ? "text-foreground" : "text-muted-foreground"}`}>
                        {r.total_cost != null ? `₪${Number(r.total_cost).toLocaleString()}` : "—"}
                      </span>
                      <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.className}`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {filteredRecords.map((r) => {
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
            </>
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
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
  trend?: { label: string; positive: boolean };
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
      {trend && (
        <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          trend.positive
            ? "bg-emerald-500/10 text-emerald-700"
            : "bg-orange-500/10 text-orange-700"
        }`}>
          {trend.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trend.label}
        </div>
      )}
    </div>
  );
}


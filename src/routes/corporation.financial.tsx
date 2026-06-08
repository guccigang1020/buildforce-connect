import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getFinancialDashboard } from "@/lib/financial-dashboard.functions";
import { AppShell } from "@/components/app-shell";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Loader2,
  BarChart3,
  Calendar,
  Users,
  FolderOpen,
  AlertTriangle,
  Zap,
  Award,
  Minus,
} from "lucide-react";

export const Route = createFileRoute("/corporation/financial")({
  head: () => ({ meta: [{ title: "דשבורד פיננסי — BuildForce" }] }),
  component: Page,
});

// ─── Types ──────────────────────────────────────────────────────────────────

type Account = {
  work_date: string;
  contractor_id: string;
  contractor_name: string | null;
  project_id: string;
  project_name: string;
  worker_type: string | null;
  total_sale: number | null;
  labor_cost: number | null;
  total_profit: number | null;
  total_hours: number | null;
  total_worker_hours: number | null;
  approval_method: string;
  has_exception: boolean;
};

type PeriodKey = "month" | "quarter" | "year";

type Stats = {
  revenue: number;
  laborCost: number;
  profit: number;
  profitPct: number | null;
  hours: number;
  workerHours: number;
  accounts: number;
  pricedAccounts: number;
  autoCount: number;
  exceptionCount: number;
};

type BreakdownRow = Stats & { name: string };

type TrendPoint = {
  label: string;
  revenue: number;
  laborCost: number;
  profit: number;
  profitPct: number;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const C = {
  revenue: "#6366f1",
  laborCost: "#f59e0b",
  profit: "#10b981",
  profitLine: "#8b5cf6",
  negative: "#ef4444",
};

const WORKER_TYPE_LABELS: Record<string, string> = {
  thai: "עובד תאילנדי",
  chinese: "עובד סיני",
  team_leader: "ראש צוות",
  professional: "עובד מקצועי",
  custom: "תעריף מותאם",
};

const PERIODS: { key: PeriodKey; label: string; months: number }[] = [
  { key: "month", label: "החודש", months: 1 },
  { key: "quarter", label: "3 חודשים", months: 3 },
  { key: "year", label: "12 חודשים", months: 12 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcStats(rows: Account[]): Stats {
  const priced = rows.filter((a) => a.total_sale != null);
  const revenue = priced.reduce((s, a) => s + Number(a.total_sale ?? 0), 0);
  const laborCost = priced.reduce((s, a) => s + Number(a.labor_cost ?? 0), 0);
  const profit = priced.reduce((s, a) => s + Number(a.total_profit ?? 0), 0);
  return {
    revenue,
    laborCost,
    profit,
    profitPct: revenue > 0 ? (profit / revenue) * 100 : null,
    hours: rows.reduce((s, a) => s + Number(a.total_hours ?? 0), 0),
    workerHours: rows.reduce((s, a) => s + Number(a.total_worker_hours ?? 0), 0),
    accounts: rows.length,
    pricedAccounts: priced.length,
    autoCount: rows.filter((a) => a.approval_method === "auto").length,
    exceptionCount: rows.filter((a) => a.has_exception).length,
  };
}

function groupBy(rows: Account[], keyFn: (a: Account) => string): Map<string, Account[]> {
  const m = new Map<string, Account[]>();
  for (const a of rows) {
    const k = keyFn(a);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(a);
  }
  return m;
}

function getBreakdown(rows: Account[], keyFn: (a: Account) => string): BreakdownRow[] {
  return Array.from(groupBy(rows.filter((a) => a.total_sale != null), keyFn)).map(
    ([name, group]) => ({ name, ...calcStats(group) }),
  ).sort((a, b) => b.profit - a.profit);
}

function periodStart(period: PeriodKey): Date {
  const d = new Date();
  if (period === "month") d.setDate(1);
  else if (period === "quarter") { d.setMonth(d.getMonth() - 3); d.setDate(1); }
  else { d.setMonth(d.getMonth() - 12); d.setDate(1); }
  d.setHours(0, 0, 0, 0);
  return d;
}

function prevPeriodRange(period: PeriodKey): { start: Date; end: Date } | null {
  if (period === "year") return null;
  const months = period === "month" ? 1 : 3;
  const end = periodStart(period);
  const start = new Date(end);
  start.setMonth(start.getMonth() - months);
  return { start, end };
}

function getMonthlyTrend(accounts: Account[]): TrendPoint[] {
  const map = groupBy(accounts, (a) => a.work_date.slice(0, 7));
  return Array.from(map)
    .map(([month, rows]) => {
      const s = calcStats(rows);
      return {
        label: fmtMonth(month),
        revenue: Math.round(s.revenue),
        laborCost: Math.round(s.laborCost),
        profit: Math.round(s.profit),
        profitPct: s.profitPct != null ? Math.round(s.profitPct * 10) / 10 : 0,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(-12);
}

function getWeeklyTrend(accounts: Account[]): TrendPoint[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 56);
  const recent = accounts.filter((a) => new Date(a.work_date + "T00:00:00") >= cutoff);
  const map = groupBy(recent, (a) => weekStart(a.work_date));
  return Array.from(map)
    .map(([week, rows]) => {
      const s = calcStats(rows);
      return {
        label: fmtWeek(week),
        revenue: Math.round(s.revenue),
        laborCost: Math.round(s.laborCost),
        profit: Math.round(s.profit),
        profitPct: s.profitPct != null ? Math.round(s.profitPct * 10) / 10 : 0,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(-8);
}

function getDailyTrend(accounts: Account[]): TrendPoint[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const recent = accounts.filter((a) => new Date(a.work_date + "T00:00:00") >= cutoff);
  const map = groupBy(recent, (a) => a.work_date);
  return Array.from(map)
    .map(([date, rows]) => {
      const s = calcStats(rows);
      return {
        label: fmtDay(date),
        revenue: Math.round(s.revenue),
        laborCost: Math.round(s.laborCost),
        profit: Math.round(s.profit),
        profitPct: s.profitPct != null ? Math.round(s.profitPct * 10) / 10 : 0,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

function weekStart(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function fmtMoney(n: number): string {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

function fmtMonth(yyyyMm: string): string {
  const d = new Date(yyyyMm + "-01T00:00:00");
  return d.toLocaleDateString("he-IL", { month: "short", year: "2-digit" });
}

function fmtWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function fmtDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function delta(
  current: number,
  prev: number,
): { pct: number; positive: boolean } | null {
  if (prev === 0) return null;
  const pct = ((current - prev) / Math.abs(prev)) * 100;
  if (Math.abs(pct) < 0.5) return null;
  return { pct, positive: pct > 0 };
}

// ─── Page ────────────────────────────────────────────────────────────────────

function Page() {
  const fetchDashboard = useServerFn(getFinancialDashboard);
  const [period, setPeriod] = useState<PeriodKey>("month");

  const { data, isLoading } = useQuery({
    queryKey: ["financial-dashboard"],
    queryFn: () => fetchDashboard({ data: {} }),
  });

  const allAccounts = (data?.accounts ?? []) as Account[];

  const computed = useMemo(() => {
    const now = new Date();
    const start = periodStart(period);
    const prev = prevPeriodRange(period);

    const currentRows = allAccounts.filter(
      (a) => new Date(a.work_date + "T00:00:00") >= start,
    );
    const prevRows = prev
      ? allAccounts.filter((a) => {
          const d = new Date(a.work_date + "T00:00:00");
          return d >= prev.start && d < prev.end;
        })
      : [];

    const current = calcStats(currentRows);
    const previous = prev ? calcStats(prevRows) : null;

    const byContractor = getBreakdown(currentRows, (a) => a.contractor_name ?? "לא ידוע");
    const byProject = getBreakdown(currentRows, (a) => a.project_name ?? "לא ידוע");
    const byWorkerType = getBreakdown(
      currentRows,
      (a) => WORKER_TYPE_LABELS[a.worker_type ?? ""] ?? a.worker_type ?? "לא מוגדר",
    );

    const monthlyTrend = getMonthlyTrend(allAccounts);
    const weeklyTrend = getWeeklyTrend(allAccounts);
    const dailyTrend = getDailyTrend(allAccounts);

    const totalWithoutPricing = currentRows.length - current.pricedAccounts;

    return {
      current,
      previous,
      byContractor,
      byProject,
      byWorkerType,
      monthlyTrend,
      weeklyTrend,
      dailyTrend,
      totalWithoutPricing,
    };
  }, [allAccounts, period]);

  return (
    <AppShell title="דשבורד פיננסי">
      <div className="space-y-6">
        {/* Header */}
        <div className="enterprise-card bg-gradient-to-l from-primary/8 via-primary/4 to-transparent p-6 animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-primary shadow-elegant text-primary-foreground">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">דשבורד פיננסי</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  הכנסות, עלות עבודה ורווחיות לפי תקופה, קבלן ופרויקט
                </p>
              </div>
            </div>
            {/* Period selector */}
            <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-card p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriod(p.key)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${
                    period === p.key
                      ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground animate-fade-up">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>טוען נתונים פיננסיים…</span>
          </div>
        ) : (
          <>
            {/* ── KPI Row ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 animate-fade-up delay-100">
              <KpiCard
                title="הכנסות"
                value={fmtMoney(computed.current.revenue)}
                subtitle={`${computed.current.pricedAccounts} חשבונות`}
                trend={
                  computed.previous
                    ? delta(computed.current.revenue, computed.previous.revenue)
                    : null
                }
                icon={DollarSign}
                color="primary"
              />
              <KpiCard
                title="עלות עבודה"
                value={fmtMoney(computed.current.laborCost)}
                subtitle={`${computed.current.workerHours.toFixed(0)} שעות-עובד`}
                trend={
                  computed.previous
                    ? delta(computed.current.laborCost, computed.previous.laborCost)
                    : null
                }
                icon={Users}
                color="amber"
                lowerIsBetter
              />
              <KpiCard
                title="רווח גולמי"
                value={fmtMoney(computed.current.profit)}
                subtitle={
                  computed.current.profitPct != null
                    ? `${computed.current.profitPct.toFixed(1)}% מהכנסות`
                    : "אין נתוני תמחור"
                }
                trend={
                  computed.previous
                    ? delta(computed.current.profit, computed.previous.profit)
                    : null
                }
                icon={TrendingUp}
                color="emerald"
              />
              <KpiCard
                title="% רווח"
                value={
                  computed.current.profitPct != null
                    ? `${computed.current.profitPct.toFixed(1)}%`
                    : "—"
                }
                subtitle="מרווח על הכנסות"
                trend={
                  computed.previous && computed.current.profitPct != null && computed.previous.profitPct != null
                    ? delta(computed.current.profitPct, computed.previous.profitPct)
                    : null
                }
                icon={Award}
                color="violet"
              />
            </div>

            {/* ── Secondary stats ─────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 animate-fade-up delay-150">
              <SecondaryCard icon={Calendar} label="שעות עבודה" value={computed.current.hours.toFixed(1)} />
              <SecondaryCard icon={FolderOpen} label="חשבונות יומיים" value={String(computed.current.accounts)} />
              <SecondaryCard icon={Zap} label="אושרו אוטומטית" value={String(computed.current.autoCount)} accent="slate" />
              <SecondaryCard icon={AlertTriangle} label="חריגות" value={String(computed.current.exceptionCount)} accent={computed.current.exceptionCount > 0 ? "orange" : undefined} />
            </div>

            {/* ── No-pricing notice ────────────────────────────────── */}
            {computed.totalWithoutPricing > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/8 px-5 py-3 animate-fade-up delay-200 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span className="text-amber-800">
                  <span className="font-bold">{computed.totalWithoutPricing} חשבונות</span> בתקופה זו אינם כוללים נתוני תמחור —{" "}
                  <a href="/corporation/pricing" className="underline font-semibold">הגדר תמחור</a> לקבלת תמונה פיננסית מלאה.
                </span>
              </div>
            )}

            {/* ── Monthly trend (main chart) ───────────────────────── */}
            <ChartCard title="מגמה חודשית — הכנסות vs עלות vs רווח" subtitle="12 חודשים אחרונים">
              {computed.monthlyTrend.length === 0 ? (
                <EmptyChart />
              ) : (
                <div dir="ltr">
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={computed.monthlyTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={C.revenue} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={C.revenue} stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={C.laborCost} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={C.laborCost} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} width={52} />
                      <RechartsTooltip content={<MoneyTooltip />} />
                      <Legend
                        formatter={(v) =>
                          v === "revenue" ? "הכנסות" : v === "laborCost" ? "עלות עבודה" : "רווח"
                        }
                        wrapperStyle={{ fontSize: 12, direction: "rtl" }}
                      />
                      <Bar dataKey="revenue" name="revenue" fill={C.revenue} radius={[4, 4, 0, 0]} maxBarSize={32} opacity={0.85} />
                      <Bar dataKey="laborCost" name="laborCost" fill={C.laborCost} radius={[4, 4, 0, 0]} maxBarSize={32} opacity={0.85} />
                      <Line dataKey="profit" name="profit" type="monotone" stroke={C.profit} strokeWidth={2.5} dot={{ r: 3, fill: C.profit }} activeDot={{ r: 5 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            {/* ── Weekly + Daily charts ────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-2 animate-fade-up delay-200">
              {/* Weekly */}
              <ChartCard title="רווח שבועי" subtitle="8 שבועות אחרונים">
                {computed.weeklyTrend.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <div dir="ltr">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={computed.weeklyTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} width={44} />
                        <RechartsTooltip content={<MoneyTooltip />} />
                        <Bar dataKey="profit" name="רווח" radius={[4, 4, 0, 0]} maxBarSize={28}>
                          {computed.weeklyTrend.map((e, i) => (
                            <Cell key={i} fill={e.profit >= 0 ? C.profit : C.negative} opacity={0.85} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>

              {/* Daily */}
              <ChartCard title="רווח יומי" subtitle="30 ימים אחרונים">
                {computed.dailyTrend.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <div dir="ltr">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={computed.dailyTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={4} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₪${v.toLocaleString()}`} width={52} />
                        <RechartsTooltip content={<MoneyTooltip />} />
                        <Bar dataKey="profit" name="רווח" radius={[3, 3, 0, 0]} maxBarSize={14}>
                          {computed.dailyTrend.map((e, i) => (
                            <Cell key={i} fill={e.profit >= 0 ? C.profit : C.negative} opacity={0.85} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
            </div>

            {/* ── Profit % line chart ──────────────────────────────── */}
            <ChartCard title="מגמת % רווח חודשי" subtitle="12 חודשים אחרונים">
              {computed.monthlyTrend.length === 0 ? (
                <EmptyChart />
              ) : (
                <div dir="ltr">
                  <ResponsiveContainer width="100%" height={180}>
                    <ComposedChart data={computed.monthlyTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="profPctGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={C.profitLine} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={C.profitLine} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} width={40} />
                      <RechartsTooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="rounded-xl border border-border/60 bg-card p-3 shadow-lg text-sm">
                              <div className="mb-1 font-bold">{label}</div>
                              <div style={{ color: C.profitLine }}>
                                % רווח: {(payload[0]?.value as number | undefined)?.toFixed(1) ?? 0}%
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Line
                        dataKey="profitPct"
                        name="% רווח"
                        type="monotone"
                        stroke={C.profitLine}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: C.profitLine }}
                        activeDot={{ r: 5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            {/* ── Breakdowns ───────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-2 animate-fade-up delay-300">
              <BreakdownCard
                title="פירוט לפי קבלן"
                icon={Users}
                rows={computed.byContractor.slice(0, 6)}
                maxProfit={Math.max(...computed.byContractor.map((r) => r.profit), 1)}
              />
              <BreakdownCard
                title="פירוט לפי פרויקט"
                icon={FolderOpen}
                rows={computed.byProject.slice(0, 6)}
                maxProfit={Math.max(...computed.byProject.map((r) => r.profit), 1)}
              />
            </div>

            {computed.byWorkerType.length > 0 && (
              <BreakdownCard
                title="פירוט לפי סוג עובד"
                icon={Users}
                rows={computed.byWorkerType}
                maxProfit={Math.max(...computed.byWorkerType.map((r) => r.profit), 1)}
                className="animate-fade-up delay-300"
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  color,
  lowerIsBetter = false,
}: {
  title: string;
  value: string;
  subtitle?: string;
  trend: { pct: number; positive: boolean } | null;
  icon: React.ComponentType<{ className?: string }>;
  color: "primary" | "amber" | "emerald" | "violet";
  lowerIsBetter?: boolean;
}) {
  const colors = {
    primary: { bg: "bg-primary/10", icon: "text-primary", border: "border-primary/20" },
    amber: { bg: "bg-amber-500/10", icon: "text-amber-600", border: "border-amber-500/20" },
    emerald: { bg: "bg-emerald-500/10", icon: "text-emerald-600", border: "border-emerald-500/20" },
    violet: { bg: "bg-violet-500/10", icon: "text-violet-600", border: "border-violet-500/20" },
  }[color];

  const trendPositive = trend ? (lowerIsBetter ? !trend.positive : trend.positive) : null;

  return (
    <div className={`enterprise-card p-5 border ${colors.border} hover-lift`}>
      <div className="flex items-start justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${colors.bg}`}>
          <Icon className={`h-5 w-5 ${colors.icon}`} />
        </div>
        {trend && (
          <div
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              trendPositive
                ? "bg-emerald-500/10 text-emerald-700"
                : "bg-red-500/10 text-red-600"
            }`}
          >
            {trendPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend.pct).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="mt-4 text-2xl font-extrabold tracking-tight leading-none">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{title}</div>
      {subtitle && <div className="mt-0.5 text-[11px] text-muted-foreground/70">{subtitle}</div>}
    </div>
  );
}

function SecondaryCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: "orange" | "slate";
}) {
  const accentClass = accent === "orange"
    ? "border-orange-400/30 bg-orange-500/5"
    : accent === "slate"
      ? "border-slate-400/20 bg-slate-500/5"
      : "border-border/60 bg-card";
  const iconClass = accent === "orange"
    ? "bg-orange-500/10 text-orange-600"
    : accent === "slate"
      ? "bg-slate-500/10 text-slate-500"
      : "bg-primary/10 text-primary";

  return (
    <div className={`rounded-2xl border p-4 ${accentClass}`}>
      <div className={`grid h-8 w-8 place-items-center rounded-lg ${iconClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-xl font-extrabold">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`enterprise-card p-5 animate-fade-up ${className}`}>
      <div className="mb-4">
        <div className="text-sm font-bold">{title}</div>
        {subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground">
      <div className="text-center">
        <BarChart3 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
        אין נתונים לתצוגה
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  icon: Icon,
  rows,
  maxProfit,
  className = "",
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  rows: BreakdownRow[];
  maxProfit: number;
  className?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className={`enterprise-card p-5 ${className}`}>
        <div className="mb-3 flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold">{title}</span>
        </div>
        <p className="py-6 text-center text-sm text-muted-foreground">אין נתונים לתקופה זו</p>
      </div>
    );
  }

  return (
    <div className={`enterprise-card p-5 ${className}`}>
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold">{title}</span>
      </div>

      {/* Header */}
      <div className="mb-2 grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
        <span>שם</span>
        <span className="w-20 text-left">הכנסות</span>
        <span className="w-20 text-left">עלות</span>
        <span className="w-20 text-left">רווח</span>
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const barWidth = maxProfit > 0 ? Math.max(4, (row.profit / maxProfit) * 100) : 4;
          const profitColor = row.profit >= 0 ? "bg-emerald-500" : "bg-red-500";
          const profitTextColor = row.profit >= 0 ? "text-emerald-700" : "text-destructive";

          return (
            <div key={row.name} className="rounded-xl border border-border/40 bg-secondary/20 px-3 py-2.5">
              <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3">
                <span className="truncate text-sm font-semibold" title={row.name}>
                  {row.name}
                </span>
                <span className="w-20 text-left text-xs text-muted-foreground">
                  {fmtMoney(row.revenue)}
                </span>
                <span className="w-20 text-left text-xs text-muted-foreground">
                  {fmtMoney(row.laborCost)}
                </span>
                <span className={`w-20 text-left text-xs font-bold ${profitTextColor}`}>
                  {row.profit >= 0 ? "+" : ""}{fmtMoney(row.profit)}
                </span>
              </div>
              {/* Profit bar */}
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-border/40">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${profitColor}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{row.pricedAccounts} חשבונות</span>
                <span className={profitTextColor}>
                  {row.profitPct != null ? `${row.profitPct.toFixed(1)}%` : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Custom tooltip ──────────────────────────────────────────────────────────

type TooltipPayloadItem = { name?: string; value?: number; color?: string };

function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const LABELS: Record<string, string> = {
    revenue: "הכנסות",
    laborCost: "עלות עבודה",
    profit: "רווח",
    "רווח": "רווח",
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-3 shadow-lg text-sm min-w-[140px]">
      <div className="mb-2 font-bold text-foreground">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground text-xs">
              {LABELS[p.name ?? ""] ?? p.name}
            </span>
          </div>
          <span className="font-semibold text-xs">
            {p.value != null ? fmtMoney(p.value) : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

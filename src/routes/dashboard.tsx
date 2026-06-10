import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  MapPin,
  Calendar,
  Users,
  Briefcase,
  Clock,
  Trophy,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  TrendingUp,
  Inbox,
  Sparkles,
  BarChart3,
  Zap,
  ArrowUpRight,
  Activity,
  AlertTriangle,
  HardHat,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/components/app-shell";
import { listMyJobRequests } from "@/lib/job-requests.functions";
import { getContractorDashboardStats } from "@/lib/analytics.functions";
import { useAuth } from "@/hooks/use-auth";
import { maskedRequestId } from "@/lib/anonymize";

type MyRequest = {
  id: string;
  location: string;
  start_date: string;
  duration: string;
  status: string;
  created_at: string;
  deadline_at: string | null;
  offers_count: number;
  min_price: number | null;
  workers_count: number;
  roles: string[];
};

type ContractorStats = Awaited<ReturnType<typeof getContractorDashboardStats>>;

type StatusFilter = "all" | "open" | "awarded" | "closed" | "cancelled";

const STATUS_META: Record<
  string,
  { label: string; chipClass: string; barClass: string; icon: typeof Clock }
> = {
  open: {
    label: "פתוחה למכרז",
    chipClass: "status-chip-live",
    barClass: "status-bar-live",
    icon: Clock,
  },
  awarded: {
    label: "נבחר זוכה",
    chipClass: "status-chip-approved",
    barClass: "status-bar-primary",
    icon: Trophy,
  },
  closed: {
    label: "סגורה",
    chipClass: "status-chip-muted",
    barClass: "status-bar-none",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "בוטלה",
    chipClass: "status-chip-rejected",
    barClass: "status-bar-rejected",
    icon: XCircle,
  },
};

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "לוח בקרה — BuildForce" },
      { name: "description", content: "כל הבקשות, ההצעות והפרויקטים שלך במקום אחד." },
    ],
  }),
  component: DashboardPage,
});

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "לילה טוב";
  if (h < 12) return "בוקר טוב";
  if (h < 17) return "צהריים טובים";
  return "ערב טוב";
}

function makeTrend(
  current: number,
  prev: number,
  higherIsBetter: boolean,
): { label: string; positive: boolean } | undefined {
  if (prev === 0) return undefined;
  const pct = Math.round(((current - prev) / prev) * 100);
  if (pct === 0) return undefined;
  const isPositive = higherIsBetter ? pct > 0 : pct < 0;
  return { label: `${pct > 0 ? "↑" : "↓"} ${Math.abs(pct)}%`, positive: isPositive };
}

function DashboardPage() {
  const { hasRole, profile, session, loading } = useAuth();
  const navigate = useNavigate();
  const fetchMine = useServerFn(listMyJobRequests);
  const fetchStats = useServerFn(getContractorDashboardStats);

  // Route by role: unauthenticated -> login; a corporation (manpower supplier)
  // belongs on its own dashboard, not the contractor view; an account whose
  // only role is admin belongs in the admin console, not the contractor view.
  useEffect(() => {
    if (loading) return;
    if (!session) {
      void navigate({ to: "/login", replace: true });
      return;
    }
    if (hasRole("admin") && !hasRole("contractor") && !hasRole("corporation")) {
      void navigate({ to: "/admin", replace: true });
      return;
    }
    if (hasRole("corporation") && !hasRole("contractor")) {
      void navigate({ to: "/corporation-dashboard", replace: true });
    }
  }, [loading, session, hasRole, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-requests"],
    queryFn: () => fetchMine({ data: {} as never }),
    enabled: !!session,
  });

  const { data: wsData, isLoading: wsLoading } = useQuery({
    queryKey: ["contractor-dashboard-stats"],
    queryFn: () => fetchStats(),
    enabled: !!session,
  });

  const isAdmin = hasRole("admin");
  const requests = (data?.requests ?? []) as MyRequest[];
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (q) {
        const hay = `${r.location} ${r.roles.join(" ")} ${r.id}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [requests, filter, q]);

  const stats = useMemo(() => {
    const open = requests.filter((r) => r.status === "open").length;
    const awarded = requests.filter((r) => r.status === "awarded").length;
    const totalOffers = requests.reduce((s, r) => s + r.offers_count, 0);
    const openWithOffers = requests.filter((r) => r.status === "open" && r.offers_count > 0).length;
    const bestPrice = requests.reduce((best: number | null, r) => {
      if (r.min_price == null) return best;
      return best == null || r.min_price < best ? r.min_price : best;
    }, null);
    const convRate = requests.length > 0 ? Math.round((awarded / requests.length) * 100) : 0;
    return {
      open,
      awarded,
      totalOffers,
      total: requests.length,
      openWithOffers,
      bestPrice,
      convRate,
    };
  }, [requests]);

  const filterCounts = useMemo(
    () => ({
      all: requests.length,
      open: requests.filter((r) => r.status === "open").length,
      awarded: requests.filter((r) => r.status === "awarded").length,
      closed: requests.filter((r) => r.status === "closed").length,
      cancelled: requests.filter((r) => r.status === "cancelled").length,
    }),
    [requests],
  );

  const firstName = profile?.full_name?.split(" ")[0] ?? profile?.company_name?.split(" ")[0] ?? "";
  const greeting = getGreeting();
  const formattedDate = new Date().toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const wsStats = wsData as ContractorStats | undefined;
  const showWsPanel =
    !wsLoading && !!wsStats?.monthly && (wsStats.activeProjects > 0 || wsStats.monthly.total > 0);

  return (
    <AppShell
      title="לוח בקרה"
      action={
        <Button
          asChild
          size="sm"
          className="bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-95 gap-1"
        >
          <Link to="/new-request">
            <Plus className="h-4 w-4" /> בקשה חדשה
          </Link>
        </Button>
      }
    >
      {/* ── Greeting header ── */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-border/40 bg-card/50 px-5 py-5 animate-fade-up">
        <div className="pointer-events-none absolute -top-10 -end-10 h-48 w-48 rounded-full bg-primary/8 blur-3xl" />
        <div className="relative">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="info-chip">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </span>
            {isAdmin && (
              <span className="role-badge">
                <ShieldCheck className="h-3 w-3" /> מנהל מערכת
              </span>
            )}
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading
              ? "טוען נתונים…"
              : stats.total === 0
                ? "עדיין לא פרסמת בקשות — התחל עכשיו וקבל הצעות תוך שעות."
                : `${stats.open} בקשות פתוחות · ${stats.totalOffers} הצעות שהתקבלו`}
          </p>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 animate-fade-up delay-100">
        <KPICard
          icon={Briefcase}
          label="סה״כ בקשות"
          value={isLoading ? "…" : String(stats.total)}
          sub="כל הזמנים"
          variant="default"
        />
        <KPICard
          icon={Zap}
          label="פתוחות למכרז"
          value={isLoading ? "…" : String(stats.open)}
          sub={
            isLoading
              ? ""
              : stats.openWithOffers > 0
                ? `${stats.openWithOffers} קיבלו הצעות`
                : "ממתינות לספקים"
          }
          variant={stats.open > 0 ? "live" : "default"}
        />
        <KPICard
          icon={BarChart3}
          label="הצעות שהתקבלו"
          value={isLoading ? "…" : String(stats.totalOffers)}
          sub={
            isLoading
              ? ""
              : stats.bestPrice != null
                ? `מינ׳ ₪${stats.bestPrice}/שעה`
                : "עדיין לא התקבלו"
          }
          variant="default"
        />
        <KPICard
          icon={Trophy}
          label="זכיות הוקצו"
          value={isLoading ? "…" : String(stats.awarded)}
          sub={isLoading ? "" : stats.total > 0 ? `${stats.convRate}% המרה` : ""}
          variant="accent"
        />
      </div>

      {/* ── Workforce Intelligence Panel ── */}
      {wsLoading && <div className="mb-4 skeleton-kpi animate-pulse bg-muted/40" />}
      {showWsPanel && wsStats && <WorkforceIntelligencePanel stats={wsStats} />}

      {/* ── Insights chips ── */}
      {!isLoading && requests.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2 animate-fade-up delay-200">
          {stats.openWithOffers > 0 && (
            <span className="status-chip-live">
              <Sparkles className="h-3.5 w-3.5" />
              {stats.openWithOffers} בקשות ממתינות להחלטה שלך
            </span>
          )}
          {stats.bestPrice != null && (
            <span className="status-chip-approved">
              <TrendingUp className="h-3.5 w-3.5" />
              ההצעה הטובה ביותר: ₪{stats.bestPrice}/שעה
            </span>
          )}
          {stats.open > 0 && stats.openWithOffers === 0 && (
            <span className="info-chip">
              <Clock className="h-3.5 w-3.5" />
              הבקשות הפתוחות ממתינות להצעות
            </span>
          )}
        </div>
      )}

      {/* ── Filter + search ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="pill-tabs">
          {(
            [
              { id: "all", label: "הכל" },
              { id: "open", label: "פתוחות" },
              { id: "awarded", label: "זוכה נבחר" },
              { id: "closed", label: "סגורות" },
              { id: "cancelled", label: "בוטלו" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`pill-tab${filter === f.id ? " pill-tab-active" : ""}`}
            >
              {f.label}
              {filterCounts[f.id] > 0 && (
                <span className="pill-tab-count">{filterCounts[f.id]}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חפש לפי עיר, תפקיד או מספר"
            className="h-10 pr-9 bg-card/60"
          />
        </div>
      </div>

      {/* ── Request list ── */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-kpi animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-destructive/20 bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-xl font-bold">שגיאה בטעינת הבקשות</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              לא הצלחנו לטעון את הבקשות שלך כרגע. בדוק את החיבור לאינטרנט ונסה שוב.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-6 bg-gradient-primary text-primary-foreground shadow-elegant"
            >
              נסה שוב
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasAny={requests.length > 0} />
        ) : (
          filtered.map((r) => <RequestCard key={r.id} request={r} />)
        )}
      </div>
    </AppShell>
  );
}

function WorkforceIntelligencePanel({ stats }: { stats: ContractorStats }) {
  const { monthly, prevMonthly } = stats;
  const approvalRate =
    monthly.total > 0 ? Math.round((monthly.approved / monthly.total) * 100) : null;
  const monthName = new Date().toLocaleDateString("he-IL", { month: "long" });

  const approvedTrend = makeTrend(monthly.approved, prevMonthly.approved, true);
  const exceptionTrend = makeTrend(monthly.exceptions, prevMonthly.exceptions, false);
  const hoursTrend = makeTrend(monthly.totalHours, prevMonthly.totalHours, true);
  const costTrend = makeTrend(monthly.totalCost, prevMonthly.totalCost, true);

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-border/60 bg-card animate-fade-up delay-150">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="section-header-icon">
            <Activity className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-bold">מודיעין כוח עבודה</span>
          <span className="info-chip">{monthName}</span>
        </div>
        <div className="flex items-center gap-2">
          {stats.projectsNeedingSite > 0 && (
            <Link
              to="/contractor/projects"
              className="status-chip-pending transition-opacity hover:opacity-80"
            >
              <AlertTriangle className="h-3 w-3" />
              {stats.projectsNeedingSite} פרויקטים ללא GPS
              <ChevronRight className="h-3 w-3 rotate-180" />
            </Link>
          )}
          <Link
            to="/contractor/projects"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            כל הפרויקטים <ChevronRight className="h-3 w-3 rotate-180" />
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 md:divide-x md:divide-x-reverse md:divide-border/40">
        {/* Project health */}
        <div className="p-5">
          <div className="mb-3.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            <HardHat className="h-3.5 w-3.5" /> פרויקטים פעילים
          </div>
          <div className="grid grid-cols-3 gap-4">
            <ProjectStat
              label="פרויקטים"
              value={String(stats.activeProjects)}
              sub={
                stats.totalProjects > stats.activeProjects
                  ? `מתוך ${stats.totalProjects}`
                  : undefined
              }
              variant={stats.activeProjects > 0 ? "primary" : "default"}
            />
            <ProjectStat
              label="עובדים צפויים"
              value={String(stats.expectedWorkers)}
              variant={stats.expectedWorkers > 0 ? "primary" : "default"}
            />
            <ProjectStat label="צוותות" value={String(stats.totalTeams)} />
          </div>
        </div>

        {/* Attendance quality */}
        <div className="border-t border-border/40 p-5 md:border-t-0">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" /> נוכחות — {monthName}
            </div>
            {approvalRate != null && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  approvalRate >= 90
                    ? "bg-emerald-500/15 text-emerald-600"
                    : approvalRate >= 70
                      ? "bg-amber-500/15 text-amber-600"
                      : "bg-destructive/15 text-destructive"
                }`}
              >
                {approvalRate}% אישורים
              </span>
            )}
          </div>
          {monthly.total === 0 ? (
            <p className="text-sm text-muted-foreground">אין נתוני נוכחות לחודש זה</p>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <AttendanceStat
                label="אושרו"
                value={String(monthly.approved)}
                trend={approvedTrend}
                variant="success"
              />
              <AttendanceStat
                label="חריגים"
                value={String(monthly.exceptions)}
                trend={exceptionTrend}
                variant={monthly.exceptions > 0 ? "warning" : "default"}
              />
              <AttendanceStat
                label="שעות"
                value={
                  monthly.totalHours > 0
                    ? monthly.totalHours % 1 === 0
                      ? monthly.totalHours.toLocaleString()
                      : monthly.totalHours.toFixed(1)
                    : "—"
                }
                trend={hoursTrend}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer: cost + pending alerts */}
      {(monthly.totalCost > 0 || monthly.pending > 0 || monthly.rejected > 0) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/60 bg-muted/20 px-5 py-3">
          {monthly.totalCost > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">עלות כוח אדם החודש:</span>
              <span className="text-sm font-extrabold">
                ₪{Math.round(monthly.totalCost).toLocaleString()}
              </span>
              {costTrend && (
                <span className={costTrend.positive ? "trend-up" : "trend-down"}>
                  {costTrend.label}
                </span>
              )}
            </div>
          )}
          {monthly.pending > 0 && (
            <span className="status-chip-pending">
              <Clock className="h-3 w-3" /> {monthly.pending} ממתינים לאישור
            </span>
          )}
          {monthly.rejected > 0 && (
            <span className="status-chip-rejected">
              <XCircle className="h-3 w-3" /> {monthly.rejected} נדחו — בדוק תיקונים
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ProjectStat({
  label,
  value,
  sub,
  variant = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  variant?: "default" | "primary";
}) {
  return (
    <div>
      <div
        className={`text-2xl font-extrabold leading-none tracking-tight ${
          variant === "primary" ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function AttendanceStat({
  label,
  value,
  trend,
  variant = "default",
}: {
  label: string;
  value: string;
  trend?: { label: string; positive: boolean };
  variant?: "default" | "success" | "warning";
}) {
  return (
    <div>
      <div
        className={`text-2xl font-extrabold leading-none tracking-tight ${
          variant === "success"
            ? "text-emerald-600"
            : variant === "warning"
              ? "text-amber-600"
              : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
      {trend && <span className={trend.positive ? "trend-up" : "trend-down"}>{trend.label}</span>}
    </div>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  variant = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  variant?: "default" | "accent" | "live";
}) {
  const cardCls =
    variant === "accent"
      ? "kpi-card kpi-card-primary"
      : variant === "live"
        ? "kpi-card kpi-card-success"
        : "kpi-card";

  const iconCls =
    variant === "accent"
      ? "kpi-icon kpi-icon-filled"
      : variant === "live"
        ? "kpi-icon kpi-icon-success"
        : "kpi-icon kpi-icon-primary";

  return (
    <div className={`relative p-5 ${cardCls}`}>
      <div className="flex items-start justify-between">
        <div className={iconCls}>
          <Icon className="h-5 w-5" />
        </div>
        {variant === "live" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
            <span className="live-dot" />
            חי
          </span>
        )}
      </div>
      <div className="mt-4 text-2xl font-extrabold tracking-tight md:text-3xl">{value}</div>
      <div className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function RequestCard({ request: r }: { request: MyRequest }) {
  const meta = STATUS_META[r.status] ?? STATUS_META.open;
  const Icon = meta.icon;
  const offerBarWidth = Math.min((r.offers_count / 5) * 100, 100);

  return (
    <Link
      to="/my-requests/$id"
      params={{ id: r.id }}
      className={`group block rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-primary/40 hover:shadow-card ${meta.barClass}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Status + ID row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={meta.chipClass}>
              <Icon className="h-3 w-3" /> {meta.label}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {maskedRequestId(r.id)}
            </span>
            {r.deadline_at && r.status === "open" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600">
                <Clock className="h-3 w-3" /> סגירה{" "}
                {new Date(r.deadline_at).toLocaleDateString("he-IL")}
              </span>
            )}
          </div>

          {/* Location + date + workers as info-chips */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="info-chip">
              <MapPin className="h-3 w-3 text-primary" /> {r.location}
            </span>
            <span className="info-chip">
              <Calendar className="h-3 w-3" /> {r.start_date} · {r.duration}
            </span>
            <span className="info-chip">
              <Users className="h-3 w-3" /> {r.workers_count} עובדים
            </span>
          </div>

          {/* Role pills */}
          {r.roles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.roles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-0.5 text-[11px] font-semibold text-foreground/80"
                >
                  <Briefcase className="h-3 w-3 text-muted-foreground" /> {role}
                </span>
              ))}
            </div>
          )}

          {/* Competition bar */}
          {r.status === "open" && r.offers_count > 0 && (
            <div className="mt-3 max-w-xs">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>עוצמת תחרות</span>
                <span className="font-bold text-primary">{r.offers_count} הצעות</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill animate-expand-w"
                  style={{ width: `${offerBarWidth}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right column: offer count + best price + arrow */}
        <div className="flex flex-col items-end gap-2">
          <div className="text-center">
            <div className="text-2xl font-extrabold leading-none text-primary">
              {r.offers_count}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {r.offers_count === 1 ? "הצעה" : "הצעות"}
            </div>
          </div>
          {r.min_price != null && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-center">
              <div className="text-xs font-extrabold text-emerald-600">₪{r.min_price}</div>
              <div className="text-[11px] text-muted-foreground">מינ׳/שעה</div>
            </div>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
            ניהול <ArrowLeft className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="empty-state relative overflow-hidden">
      <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
      <div className="relative">
        <div className="empty-state-icon mx-auto">
          <Inbox className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold">
          {hasAny ? "אין בקשות מתאימות לסינון" : "ברוך הבא ל-BuildForce"}
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          {hasAny
            ? "נסה לשנות את הסינון או החיפוש כדי למצוא בקשות."
            : "פרסם בקשת כוח אדם ראשונה. תאגידים מאומתים ישלחו הצעות תחרותיות — ממוצע 3+ הצעות תוך 24 שעות."}
        </p>
        {!hasAny && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-gradient-primary text-primary-foreground shadow-elegant">
              <Link to="/new-request">
                <Plus className="ms-1 h-4 w-4" /> פרסם בקשת כוח אדם
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/" hash="how">
                <ArrowUpRight className="ms-1 h-4 w-4" /> איך זה עובד
              </Link>
            </Button>
          </div>
        )}
        {!hasAny && (
          <div className="mt-10 grid grid-cols-3 divide-x divide-x-reverse divide-border/60 border-t border-border/60 pt-8">
            {[
              { n: "60 שנ׳", l: "לפרסום בקשה" },
              { n: "< 24 שעות", l: "עד הצעה ראשונה" },
              { n: "0 ₪", l: "עלות לקבלן" },
            ].map((s) => (
              <div key={s.l} className="px-4">
                <div className="text-xl font-extrabold text-primary md:text-2xl">{s.n}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

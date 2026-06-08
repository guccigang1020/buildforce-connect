import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Briefcase,
  Trophy,
  Building2,
  BadgeCheck,
  Coins,
  Loader2,
  BarChart3,
  AlertCircle,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Target,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { OpenTendersSection } from "@/components/corporation/open-tenders-section";
import { MyOffersSection } from "@/components/corporation/my-offers-section";
import { WorkforceInventorySection } from "@/components/corporation/workforce-inventory-section";
import { useAuth } from "@/hooks/use-auth";
import { listMyOffers } from "@/lib/job-offers.functions";
import { getCorporationAttendanceStats } from "@/lib/analytics.functions";
import { PLATFORM_FEE_PER_HOUR, HOURS_PER_MONTH, monthlyFeeRevenue } from "@/lib/commission-config";

type AttendanceSummary = {
  total: number;
  approved: number;
  exceptions: number;
  rejected: number;
  pending: number;
  totalCost: number;
  totalHours: number;
};

type CorpAttendanceStats = {
  monthly: AttendanceSummary;
  prevMonthly: AttendanceSummary;
};

export const Route = createFileRoute("/corporation-dashboard")({
  head: () => ({
    meta: [
      { title: "לוח תאגיד — BuildForce" },
      { name: "description", content: "הצעות פתוחות, זכיות ושיעור הצלחה לתאגידי כוח אדם." },
    ],
  }),
  component: CorporationDashboard,
});

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

const PRICE_BANDS = [
  { label: "< ₪50", key: "budget", test: (p: number) => p < 50 },
  { label: "₪50–₪64", key: "competitive", test: (p: number) => p >= 50 && p < 65 },
  { label: "₪65–₪79", key: "average", test: (p: number) => p >= 65 && p < 80 },
  { label: "₪80+", key: "premium", test: (p: number) => p >= 80 },
];

function CorporationDashboard() {
  const { user, profile, hasRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [loading, user, navigate]);

  const fetchMine = useServerFn(listMyOffers);
  const fetchAttendance = useServerFn(getCorporationAttendanceStats);

  const { data, isLoading } = useQuery({
    queryKey: ["my-job-offers"],
    queryFn: () => fetchMine({ data: {} as never }),
    enabled: Boolean(user),
  });

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ["corp-attendance-stats"],
    queryFn: () => fetchAttendance(),
    enabled: Boolean(user),
  });

  const offers = data?.offers ?? [];
  const attStats = attendanceData as CorpAttendanceStats | undefined;

  const stats = useMemo(() => {
    const open = offers.filter((o) => o.status === "submitted").length;
    const won = offers.filter((o) => o.status === "awarded").length;
    const lost = offers.filter((o) => o.status === "rejected").length;
    const decided = won + lost;
    const winRate = decided > 0 ? Math.round((won / decided) * 100) : 0;
    const monthlyFee = offers
      .filter((o) => o.status === "awarded")
      .reduce((s, o) => s + monthlyFeeRevenue(o.available_workers ?? 0), 0);
    return {
      open,
      won,
      winRate,
      monthlyFee,
      totalActiveWorkers: offers
        .filter((o) => o.status === "awarded")
        .reduce((s, o) => s + (o.available_workers ?? 0), 0),
      decided,
    };
  }, [offers]);

  const priceIntelligence = useMemo(() => {
    const decidedOffers = offers.filter(
      (o) => o.status === "awarded" || o.status === "rejected",
    );
    if (decidedOffers.length === 0) return null;

    const bands = PRICE_BANDS.map((band) => {
      const inBand = decidedOffers.filter((o) => band.test(Number(o.price_per_hour)));
      const wins = inBand.filter((o) => o.status === "awarded").length;
      const rate = inBand.length > 0 ? Math.round((wins / inBand.length) * 100) : null;
      return { label: band.label, wins, total: inBand.length, rate };
    }).filter((b) => b.total > 0);

    const wonOffers = decidedOffers.filter((o) => o.status === "awarded");
    const lostOffers = decidedOffers.filter((o) => o.status === "rejected");
    const avgWinPrice =
      wonOffers.length > 0
        ? Math.round(wonOffers.reduce((s, o) => s + Number(o.price_per_hour), 0) / wonOffers.length)
        : null;
    const avgLossPrice =
      lostOffers.length > 0
        ? Math.round(
            lostOffers.reduce((s, o) => s + Number(o.price_per_hour), 0) / lostOffers.length,
          )
        : null;

    const bestBand = bands.sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))[0];

    return { bands, avgWinPrice, avgLossPrice, bestBand };
  }, [offers]);

  if (loading || !user) {
    return (
      <AppShell title="לוח תאגיד">
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  const isCorporation = hasRole("corporation");
  const isApproved = profile?.is_verified;
  const companyInitial = (profile?.company_name || profile?.full_name || "?")[0];
  const companyName = profile?.company_name || profile?.full_name || "התאגיד שלי";

  return (
    <AppShell title="לוח תאגיד">
      {/* ── Company header card ── */}
      <div className="mb-6 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card animate-fade-up">
        <div className="relative h-28 bg-gradient-to-br from-primary/35 via-primary/12 to-card md:h-32">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="absolute bottom-0 end-0 h-40 w-40 rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute top-0 start-0 h-24 w-24 rounded-full bg-accent/10 blur-3xl" />
        </div>
        <div className="relative px-6 pb-6 md:px-8">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border-4 border-card bg-gradient-primary text-2xl font-extrabold text-primary-foreground shadow-elegant">
                {companyInitial}
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">
                    {companyName}
                  </h1>
                  {isApproved && (
                    <span className="role-badge">
                      <BadgeCheck className="h-3 w-3" /> מאומת
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="info-chip">
                    <Building2 className="h-3 w-3" /> תאגיד כוח אדם
                  </span>
                  {profile?.city && (
                    <span className="info-chip">{profile.city}</span>
                  )}
                  <span className="info-chip">
                    {isLoading ? "…" : `${stats.totalActiveWorkers} עובדים פעילים`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Status alerts ── */}
      {!isCorporation && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm animate-fade-up delay-100 status-bar-pending">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>חשבונך אינו רשום כתאגיד כוח אדם. פנה לאדמין להפעלת התפקיד.</span>
        </div>
      )}
      {isCorporation && !isApproved && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm animate-fade-up delay-100 status-bar-pending">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>חשבונך ממתין לאימות אדמין. לאחר האישור תוכל להגיש הצעות במכרזים.</span>
        </div>
      )}

      {/* ── KPI strip ── */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 animate-fade-up delay-200">
        <CorpKPI
          icon={Briefcase}
          label="הצעות פתוחות"
          value={isLoading ? "…" : String(stats.open)}
          sub="ממתינות לתשובה"
        />
        <CorpKPI
          icon={Trophy}
          label="זכיות"
          value={isLoading ? "…" : String(stats.won)}
          sub={isLoading ? "" : stats.decided > 0 ? `מתוך ${stats.decided} שהוכרעו` : "עדיין אין"}
          variant="accent"
        />

        {/* Win rate ring */}
        <div className="kpi-card col-span-2 flex items-center gap-4 p-5 md:col-span-1">
          <WinRateRing rate={isLoading ? 0 : stats.winRate} />
          <div>
            <div className="text-xs font-medium text-muted-foreground">שיעור הצלחה</div>
            <div className="mt-0.5 text-2xl font-extrabold">
              {isLoading ? "…" : `${stats.winRate}%`}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {isLoading
                ? ""
                : stats.decided > 0
                  ? `מ-${stats.decided} הצעות שהוכרעו`
                  : "עדיין אין נתונים"}
            </div>
          </div>
        </div>

        <CorpKPI
          icon={Coins}
          label="עמלה/חודש"
          value={isLoading ? "…" : `₪${stats.monthlyFee.toLocaleString()}`}
          sub={isLoading ? "" : `${stats.totalActiveWorkers} עובדים פעילים`}
          variant="revenue"
        />
      </div>

      {/* ── Revenue breakdown bar ── */}
      {stats.totalActiveWorkers > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
          <div className="section-header-icon shrink-0">
            <BarChart3 className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className="text-xs font-bold text-foreground">חישוב עמלה:</span>
            <span className="info-chip">₪{PLATFORM_FEE_PER_HOUR}/שעה</span>
            <span className="text-xs text-muted-foreground">×</span>
            <span className="info-chip">{HOURS_PER_MONTH} שעות/חודש</span>
            <span className="text-xs text-muted-foreground">×</span>
            <span className="info-chip">{stats.totalActiveWorkers} עובדים</span>
            <span className="text-xs text-muted-foreground">=</span>
            <span className="text-sm font-extrabold text-primary">
              ₪{stats.monthlyFee.toLocaleString()}/חודש
            </span>
          </div>
        </div>
      )}

      {/* ── Intelligence panels ── */}
      {(attStats || priceIntelligence) && (
        <div className="mb-5 grid gap-4 md:grid-cols-2 animate-fade-up delay-200">
          {!attendanceLoading && attStats && attStats.monthly.total > 0 && (
            <AttendanceQualityPanel stats={attStats} />
          )}
          {!isLoading && priceIntelligence && priceIntelligence.bands.length > 0 && (
            <PriceIntelligencePanel intelligence={priceIntelligence} />
          )}
        </div>
      )}

      {/* ── Sub-sections ── */}
      <OpenTendersSection />
      <MyOffersSection />
      {isCorporation && <WorkforceInventorySection />}
    </AppShell>
  );
}

function AttendanceQualityPanel({ stats }: { stats: CorpAttendanceStats }) {
  const { monthly, prevMonthly } = stats;
  const approvalRate = monthly.total > 0 ? Math.round((monthly.approved / monthly.total) * 100) : 0;
  const exceptionRate =
    monthly.total > 0 ? Math.round((monthly.exceptions / monthly.total) * 100) : 0;
  const monthName = new Date().toLocaleDateString("he-IL", { month: "long" });

  const approvalTrend = makeTrend(monthly.approved, prevMonthly.approved, true);
  const exceptionTrend = makeTrend(monthly.exceptions, prevMonthly.exceptions, false);
  const hoursTrend = makeTrend(monthly.totalHours, prevMonthly.totalHours, true);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/20 px-4 py-3.5">
        <div className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-emerald-500/18 text-emerald-600">
          <Activity className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-bold">איכות נוכחות</span>
        <span className="info-chip">{monthName}</span>
        <div className="ms-auto">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              approvalRate >= 90
                ? "bg-emerald-500/15 text-emerald-600"
                : approvalRate >= 70
                  ? "bg-amber-500/15 text-amber-600"
                  : "bg-destructive/15 text-destructive"
            }`}
          >
            {approvalRate}% אושרו
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px bg-border/40">
        <QualityStat
          label="אושרו"
          value={String(monthly.approved)}
          trend={approvalTrend}
          variant="success"
        />
        <QualityStat
          label="חריגים"
          value={String(monthly.exceptions)}
          sub={exceptionRate > 0 ? `${exceptionRate}%` : undefined}
          trend={exceptionTrend}
          variant={monthly.exceptions > 0 ? "warning" : "default"}
        />
        <QualityStat
          label="שעות עבודה"
          value={monthly.totalHours > 0 ? monthly.totalHours.toFixed(0) : "—"}
          trend={hoursTrend}
        />
      </div>

      {(monthly.pending > 0 || monthly.rejected > 0 || monthly.totalCost > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/60 bg-muted/20 px-4 py-3">
          {monthly.totalCost > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">עלות ח״א:</span>
              <span className="text-xs font-extrabold">
                ₪{Math.round(monthly.totalCost).toLocaleString()}
              </span>
            </div>
          )}
          {monthly.pending > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
              <Clock className="h-3 w-3" /> {monthly.pending} ממתינים
            </span>
          )}
          {monthly.rejected > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
              <XCircle className="h-3 w-3" /> {monthly.rejected} נדחו
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function PriceIntelligencePanel({
  intelligence,
}: {
  intelligence: {
    bands: { label: string; wins: number; total: number; rate: number | null }[];
    avgWinPrice: number | null;
    avgLossPrice: number | null;
    bestBand: { label: string; wins: number; total: number; rate: number | null } | undefined;
  };
}) {
  const { bands, avgWinPrice, avgLossPrice, bestBand } = intelligence;
  const maxRate = Math.max(...bands.map((b) => b.rate ?? 0));

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/20 px-4 py-3.5">
        <div className="section-header-icon">
          <Target className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-bold">ניתוח תמחור</span>
        {bestBand?.rate != null && (
          <span className="ms-auto status-chip-approved">
            <TrendingUp className="h-3 w-3" /> {bestBand.label} — {bestBand.rate}% זכיות
          </span>
        )}
      </div>

      <div className="divide-y divide-border/40 px-4 py-1">
        {bands.map((band) => (
          <div key={band.label} className="flex items-center gap-3 py-3">
            <div className="w-20 shrink-0 text-xs font-semibold text-foreground/80">
              {band.label}
            </div>
            <div className="flex flex-1 items-center gap-2">
              <div className="progress-track flex-1">
                <div
                  className="progress-fill"
                  style={{ width: `${maxRate > 0 ? ((band.rate ?? 0) / maxRate) * 100 : 0}%` }}
                />
              </div>
              <span
                className={`w-10 text-right text-xs font-extrabold ${
                  (band.rate ?? 0) >= 60
                    ? "text-emerald-600"
                    : (band.rate ?? 0) >= 30
                      ? "text-amber-600"
                      : "text-destructive"
                }`}
              >
                {band.rate != null ? `${band.rate}%` : "—"}
              </span>
            </div>
            <div className="w-14 shrink-0 text-right text-[11px] text-muted-foreground">
              {band.wins}/{band.total}
            </div>
          </div>
        ))}
      </div>

      {(avgWinPrice != null || avgLossPrice != null) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-border/60 bg-muted/20 px-4 py-3">
          {avgWinPrice != null && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span className="text-[11px] text-muted-foreground">ממוצע בזכיות:</span>
              <span className="text-xs font-extrabold text-emerald-600">₪{avgWinPrice}/שעה</span>
            </div>
          )}
          {avgLossPrice != null && avgWinPrice != null && (
            <div className="flex items-center gap-1.5">
              <XCircle className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">ממוצע בהפסדים:</span>
              <span className="text-xs font-semibold">₪{avgLossPrice}/שעה</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QualityStat({
  label,
  value,
  sub,
  trend,
  variant = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: { label: string; positive: boolean };
  variant?: "default" | "success" | "warning";
}) {
  return (
    <div className="bg-card p-4">
      <div
        className={`text-xl font-extrabold leading-none ${
          variant === "success"
            ? "text-emerald-600"
            : variant === "warning"
              ? "text-amber-600"
              : "text-foreground"
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[10px] font-semibold text-muted-foreground">{sub}</div>}
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
      {trend && (
        <span className={trend.positive ? "trend-up" : "trend-down"}>{trend.label}</span>
      )}
    </div>
  );
}

function WinRateRing({ rate }: { rate: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const filled = (rate / 100) * circumference;
  const empty = circumference - filled;

  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 60 60">
        <circle
          cx="30"
          cy="30"
          r={radius}
          fill="none"
          strokeWidth="5"
          style={{ stroke: "oklch(0.21 0.028 265)" }}
        />
        <circle
          cx="30"
          cy="30"
          r={radius}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${empty}`}
          style={{ stroke: "oklch(0.62 0.24 258)", transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-extrabold leading-none">{rate}%</span>
      </div>
    </div>
  );
}

function CorpKPI({
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
  variant?: "default" | "accent" | "revenue";
}) {
  const cardCls =
    variant === "accent"
      ? "kpi-card kpi-card-primary"
      : variant === "revenue"
        ? "kpi-card kpi-card-success"
        : "kpi-card";

  const iconCls =
    variant === "accent"
      ? "kpi-icon kpi-icon-filled"
      : variant === "revenue"
        ? "kpi-icon kpi-icon-success"
        : "kpi-icon kpi-icon-primary";

  return (
    <div className={`relative p-5 ${cardCls}`}>
      <div className={iconCls}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 text-2xl font-extrabold tracking-tight md:text-3xl">{value}</div>
      <div className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground/70">{sub}</div>}
    </div>
  );
}

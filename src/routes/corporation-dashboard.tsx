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
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { OpenTendersSection } from "@/components/corporation/open-tenders-section";
import { MyOffersSection } from "@/components/corporation/my-offers-section";
import { WorkforceInventorySection } from "@/components/corporation/workforce-inventory-section";
import { useAuth } from "@/hooks/use-auth";
import { listMyOffers } from "@/lib/job-offers.functions";
import { PLATFORM_FEE_PER_HOUR, HOURS_PER_MONTH, monthlyFeeRevenue } from "@/lib/commission-config";

export const Route = createFileRoute("/corporation-dashboard")({
  head: () => ({
    meta: [
      { title: "לוח תאגיד — BuildForce" },
      { name: "description", content: "הצעות פתוחות, זכיות ושיעור הצלחה לתאגידי כוח אדם." },
    ],
  }),
  component: CorporationDashboard,
});

function CorporationDashboard() {
  const { user, profile, hasRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [loading, user, navigate]);

  const fetchMine = useServerFn(listMyOffers);
  const { data, isLoading } = useQuery({
    queryKey: ["my-job-offers"],
    queryFn: () => fetchMine({ data: {} as never }),
    enabled: Boolean(user),
  });

  const offers = data?.offers ?? [];

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
      {/* Company header card */}
      <div className="mb-6 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card animate-fade-up">
        <div className="relative h-28 bg-gradient-to-br from-primary/35 via-primary/12 to-card md:h-32">
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }} />
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
                  <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">{companyName}</h1>
                  {isApproved && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                      <BadgeCheck className="h-3.5 w-3.5" /> מאומת
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    תאגיד כוח אדם
                  </span>
                  {profile?.city && <span>{profile.city}</span>}
                  <span>
                    {isLoading ? "…" : `${stats.totalActiveWorkers} עובדים פעילים`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status alerts */}
      {!isCorporation && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm animate-fade-up delay-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>חשבונך אינו רשום כתאגיד כוח אדם. פנה לאדמין להפעלת התפקיד.</span>
        </div>
      )}
      {isCorporation && !isApproved && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm animate-fade-up delay-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>חשבונך ממתין לאימות אדמין. לאחר האישור תוכל להגיש הצעות במכרזים.</span>
        </div>
      )}

      {/* KPI strip */}
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
        <div className="col-span-2 flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 md:col-span-1">
          <WinRateRing rate={isLoading ? 0 : stats.winRate} />
          <div>
            <div className="text-xs font-medium text-muted-foreground">שיעור הצלחה</div>
            <div className="mt-0.5 text-2xl font-extrabold">
              {isLoading ? "…" : `${stats.winRate}%`}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {isLoading ? "" : stats.decided > 0 ? `מ-${stats.decided} הצעות שהוכרעו` : "עדיין אין נתונים"}
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

      {/* Revenue breakdown bar */}
      {stats.totalActiveWorkers > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground">חישוב עמלה:</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>₪{PLATFORM_FEE_PER_HOUR} לשעת עובד</span>
            <span className="text-border">·</span>
            <span>{HOURS_PER_MONTH} שעות/חודש</span>
            <span className="text-border">·</span>
            <span>{stats.totalActiveWorkers} עובדים</span>
            <span className="text-border">=</span>
            <span className="font-extrabold text-foreground">
              ₪{stats.monthlyFee.toLocaleString()}/חודש
            </span>
          </div>
        </div>
      )}

      {/* Sections */}
      <OpenTendersSection />
      <MyOffersSection />
      {isCorporation && <WorkforceInventorySection />}
    </AppShell>
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
          cx="30" cy="30" r={radius}
          fill="none"
          strokeWidth="5"
          style={{ stroke: "oklch(0.21 0.028 265)" }}
        />
        <circle
          cx="30" cy="30" r={radius}
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
  const containerCls =
    variant === "accent"
      ? "border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5"
      : variant === "revenue"
        ? "border-emerald-500/30 bg-emerald-500/5"
        : "border-border/60 bg-card";
  const iconCls =
    variant === "accent"
      ? "bg-gradient-primary text-primary-foreground shadow-elegant"
      : variant === "revenue"
        ? "bg-emerald-500/15 text-emerald-600"
        : "bg-primary/10 text-primary";

  return (
    <div className={`rounded-2xl border p-5 transition-all hover:shadow-card ${containerCls}`}>
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${iconCls}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 text-2xl font-extrabold tracking-tight md:text-3xl">{value}</div>
      <div className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground/70">{sub}</div>}
    </div>
  );
}

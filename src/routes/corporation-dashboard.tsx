import { useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Briefcase, TrendingUp, Trophy, Building2, BadgeCheck,
  ArrowLeft, Coins, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { OpenTendersSection } from "@/components/corporation/open-tenders-section";
import { MyOffersSection } from "@/components/corporation/my-offers-section";
import { useAuth } from "@/hooks/use-auth";
import { listMyOffers } from "@/lib/job-offers.functions";
import {
  PLATFORM_FEE_PER_HOUR, HOURS_PER_MONTH, monthlyFeeRevenue,
} from "@/lib/commission-config";

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
    return { open, won, winRate, monthlyFee, totalActiveWorkers: offers.filter((o) => o.status === "awarded").reduce((s, o) => s + (o.available_workers ?? 0), 0) };
  }, [offers]);

  if (loading || !user) {
    return (
      <Shell>
        <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </Shell>
    );
  }

  const isCorporation = hasRole("corporation");
  const isApproved = profile?.is_verified;

  return (
    <Shell>
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3 rotate-180" /> חזרה ללוח הראשי
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">לוח תאגיד</div>
          <h1 className="mt-1 flex items-center gap-3 text-3xl font-extrabold tracking-tight md:text-4xl">
            <Building2 className="h-7 w-7 text-primary" />
            {profile?.company_name || profile?.full_name || "התאגיד שלי"}
            {isApproved && <BadgeCheck className="h-6 w-6 text-primary" />}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile?.city || ""}{!isApproved ? " · ממתין לאימות אדמין" : ""}
          </p>
        </div>
      </div>

      {!isCorporation && (
        <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 text-sm">
          חשבונך אינו רשום כתאגיד כוח אדם. פנה לאדמין כדי להפעיל את התפקיד.
        </div>
      )}
      {isCorporation && !isApproved && (
        <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 text-sm">
          חשבונך ממתין לאימות אדמין. לאחר האישור תוכל להגיש הצעות במכרזים.
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPI icon={Briefcase} label="הצעות פתוחות" value={isLoading ? "…" : String(stats.open)} />
        <KPI icon={Trophy} label="זכיות" value={isLoading ? "…" : String(stats.won)} accent />
        <KPI icon={TrendingUp} label="שיעור הצלחה" value={isLoading ? "…" : `${stats.winRate}%`} />
        <KPI icon={Coins} label="עמלת פלטפורמה/חודש" value={isLoading ? "…" : `₪${stats.monthlyFee.toLocaleString()}`} />
      </div>

      <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <Coins className="mt-0.5 h-5 w-5 text-primary" />
          <div className="text-xs text-muted-foreground">
            <span className="font-bold text-foreground">חיוב חודשי צפוי:</span>{" "}
            <span className="text-base font-extrabold text-foreground">₪{stats.monthlyFee.toLocaleString()}</span>{" "}
            (₪{PLATFORM_FEE_PER_HOUR} לשעת עובד · {HOURS_PER_MONTH} שעות/חודש · {stats.totalActiveWorkers} עובדים פעילים)
          </div>
        </div>
      </div>

      <OpenTendersSection />
      <MyOffersSection />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-14">{children}</main>
      <SiteFooter />
    </div>
  );
}

function KPI({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card"}`}>
      <div className={`grid h-10 w-10 place-items-center rounded-lg ${accent ? "bg-gradient-primary text-primary-foreground" : "bg-primary/15 text-primary"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 text-2xl font-extrabold tracking-tight md:text-3xl">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

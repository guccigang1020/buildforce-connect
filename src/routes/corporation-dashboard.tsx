import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BadgeCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { OpenTendersSection } from "@/components/corporation/open-tenders-section";
import { MyOffersSection } from "@/components/corporation/my-offers-section";
import { useAuth } from "@/hooks/use-auth";
import { listMyOffers } from "@/lib/job-offers.functions";

const PRICE_BANDS = [
  { label: "< ₪50", key: "budget", test: (p: number) => p < 50 },
  { label: "₪50–₪64", key: "competitive", test: (p: number) => p >= 50 && p < 65 },
  { label: "₪65–₪79", key: "average", test: (p: number) => p >= 65 && p < 80 },
  { label: "₪80+", key: "premium", test: (p: number) => p >= 80 },
];

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
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (hasRole("contractor") && !hasRole("corporation")) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, user, hasRole, navigate]);

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
    return { open, won, decided, winRate, total: offers.length };
  }, [offers]);

  const priceIntelligence = useMemo(() => {
    const decidedOffers = offers.filter((o) => o.status === "awarded" || o.status === "rejected");
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

    const bestBand = [...bands].sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))[0];

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
  const companyName = profile?.company_name || profile?.full_name || "התאגיד שלי";

  return (
    <AppShell title="לוח תאגיד">
      {/* ── Page header ── */}
      <div className="border-b border-border pb-5 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold text-foreground">{companyName}</h2>
          {isApproved && (
            <span className="status-chip-approved">
              <BadgeCheck className="h-3 w-3" /> מאומת
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          תאגיד כוח אדם
          {profile?.city ? ` · ${profile.city}` : ""}
          {!isLoading && stats.open > 0 ? ` · ${stats.open} הצעות פתוחות` : ""}
        </p>
      </div>

      {/* ── Status alerts ── */}
      {!isCorporation && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm status-bar-pending">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>חשבונך אינו רשום כתאגיד כוח אדם. פנה לאדמין להפעלת התפקיד.</span>
        </div>
      )}
      {isCorporation && !isApproved && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm status-bar-pending">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>חשבונך ממתין לאימות אדמין. לאחר האישור תוכל להגיש הצעות במכרזים.</span>
        </div>
      )}

      {/* ── Stat row ── */}
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 rounded-lg border border-border divide-x divide-x-reverse divide-border">
        <div className="px-5 py-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            הצעות פתוחות
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums" dir="ltr">
            {isLoading ? "…" : stats.open}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">ממתינות לתשובה</div>
        </div>
        <div className="px-5 py-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            סה"כ הצעות
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums" dir="ltr">
            {isLoading ? "…" : stats.total}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">כל הזמנים</div>
        </div>
        <div className="px-5 py-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            זכיות
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-status-approved" dir="ltr">
            {isLoading ? "…" : stats.won}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {!isLoading && stats.decided > 0
              ? `מתוך ${stats.decided} שהוכרעו`
              : "כל הזמנים"}
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            שיעור הצלחה
          </div>
          <div
            className={`mt-1 text-2xl font-semibold tabular-nums ${
              !isLoading && stats.winRate > 0 ? "text-status-approved" : ""
            }`}
            dir="ltr"
          >
            {isLoading ? "…" : `${stats.winRate}%`}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {!isLoading && stats.decided > 0
              ? `מ-${stats.decided} הצעות שהוכרעו`
              : "עדיין אין נתונים"}
          </div>
        </div>
      </div>

      {/* ── Price intelligence ── */}
      {!isLoading && priceIntelligence && priceIntelligence.bands.length > 0 && (
        <div className="mb-6">
          <PriceIntelligencePanel intelligence={priceIntelligence} />
        </div>
      )}

      {/* ── Sub-sections ── */}
      <OpenTendersSection isApproved={Boolean(isApproved)} />
      <MyOffersSection />
    </AppShell>
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
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">ניתוח תמחור</h3>
        {bestBand?.rate != null && (
          <span className="status-chip-approved">
            <TrendingUp className="h-3 w-3" />
            <span dir="ltr">{bestBand.label}</span> —{" "}
            <span dir="ltr">{bestBand.rate}%</span> זכיות
          </span>
        )}
      </div>

      <div className="divide-y divide-border/40 px-4 py-1">
        {bands.map((band) => (
          <div key={band.label} className="flex items-center gap-3 py-3">
            <div className="w-20 shrink-0 text-xs font-semibold text-foreground/80" dir="ltr">
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
                className={`w-10 text-right text-xs font-semibold ${
                  (band.rate ?? 0) >= 60
                    ? "text-status-approved"
                    : (band.rate ?? 0) >= 30
                      ? "text-status-pending"
                      : "text-destructive"
                }`}
                dir="ltr"
              >
                {band.rate != null ? `${band.rate}%` : "—"}
              </span>
            </div>
            <div className="w-14 shrink-0 text-right text-[11px] text-muted-foreground" dir="ltr">
              {band.wins}/{band.total}
            </div>
          </div>
        ))}
      </div>

      {(avgWinPrice != null || avgLossPrice != null) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-border bg-muted/20 px-4 py-3">
          {avgWinPrice != null && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span className="text-[11px] text-muted-foreground">ממוצע בזכיות:</span>
              <span className="text-xs font-semibold text-status-approved">
                <span dir="ltr">₪{avgWinPrice}</span> לשעה
              </span>
            </div>
          )}
          {avgLossPrice != null && avgWinPrice != null && (
            <div className="flex items-center gap-1.5">
              <XCircle className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">ממוצע בהפסדים:</span>
              <span className="text-xs font-semibold">
                <span dir="ltr">₪{avgLossPrice}</span> לשעה
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

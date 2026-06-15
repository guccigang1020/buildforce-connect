import { useMemo, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import CircularProgress from "@mui/material/CircularProgress";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import InsightsIcon from "@mui/icons-material/Insights";
import { AppShell } from "@/components/app-shell";
import { KpiCard } from "@/components/ui/kpi-card";
import { OpenTendersSection } from "@/components/corporation/open-tenders-section";
import { MyOffersSection } from "@/components/corporation/my-offers-section";
import { useAuth } from "@/hooks/use-auth";
import { listMyOffers } from "@/lib/job-offers.functions";

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

  const offers = useMemo(() => data?.offers ?? [], [data]);

  const stats = useMemo(() => {
    const open = offers.filter((o) => o.status === "submitted").length;
    const won = offers.filter((o) => o.status === "awarded").length;
    const lost = offers.filter((o) => o.status === "rejected").length;
    const decided = won + lost;
    const winRate = decided > 0 ? Math.round((won / decided) * 100) : 0;
    return { open, won, decided, winRate, total: offers.length };
  }, [offers]);

  if (loading || !user) {
    return (
      <AppShell title="לוח תאגיד">
        <div className="grid place-items-center py-24">
          <CircularProgress size={24} color="inherit" className="text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  const isCorporation = hasRole("corporation");
  const companyName = profile?.company_name || profile?.full_name || "התאגיד שלי";

  return (
    <AppShell title="לוח תאגיד">
      {/* ── Page header ── */}
      <div className="border-b border-border pb-5 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold text-foreground">{companyName}</h2>
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
          <ErrorOutlineIcon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0 text-amber-500" />
          <span>חשבונך אינו רשום כתאגיד כוח אדם. פנה לאדמין להפעלת התפקיד.</span>
        </div>
      )}
      {/* ── Stat row ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="הצעות פתוחות"
          value={isLoading ? "…" : stats.open}
          tone="primary"
          icon={<HourglassEmptyIcon sx={{ fontSize: 20 }} />}
          caption="ממתינות לתשובה"
        />
        <KpiCard
          label='סה"כ הצעות'
          value={isLoading ? "…" : stats.total}
          tone="default"
          icon={<FormatListBulletedIcon sx={{ fontSize: 20 }} />}
          caption="כל הזמנים"
        />
        <KpiCard
          label="זכיות"
          value={isLoading ? "…" : stats.won}
          tone="info"
          icon={<EmojiEventsIcon sx={{ fontSize: 20 }} />}
          caption={!isLoading && stats.decided > 0 ? `מתוך ${stats.decided} שהוכרעו` : "כל הזמנים"}
        />
        <KpiCard
          label="שיעור הצלחה"
          value={isLoading ? "…" : `${stats.winRate}%`}
          tone="filled"
          numeric={false}
          icon={<InsightsIcon sx={{ fontSize: 20 }} />}
          trend={!isLoading && stats.winRate > 0 ? "up" : "flat"}
          caption={
            !isLoading && stats.decided > 0
              ? `מ-${stats.decided} הצעות שהוכרעו`
              : "עדיין אין נתונים"
          }
        />
      </div>

      {/* ── Sub-sections ── */}
      <OpenTendersSection />
      <MyOffersSection />
    </AppShell>
  );
}

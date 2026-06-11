import { useMemo, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import CircularProgress from "@mui/material/CircularProgress";
import VerifiedIcon from "@mui/icons-material/Verified";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import { AppShell } from "@/components/app-shell";
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

  const offers = data?.offers ?? [];

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
              <VerifiedIcon sx={{ fontSize: 12 }} /> מאומת
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
          <ErrorOutlineIcon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0 text-amber-500" />
          <span>חשבונך אינו רשום כתאגיד כוח אדם. פנה לאדמין להפעלת התפקיד.</span>
        </div>
      )}
      {isCorporation && !isApproved && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm status-bar-pending">
          <ErrorOutlineIcon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0 text-amber-500" />
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

      {/* ── Sub-sections ── */}
      <OpenTendersSection isApproved={Boolean(isApproved)} />
      <MyOffersSection />
    </AppShell>
  );
}


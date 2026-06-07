import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
  Loader2,
  ArrowLeft,
  ShieldCheck,
  TrendingUp,
  Inbox,
  Sparkles,
  BarChart3,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/app-shell";
import { listMyJobRequests } from "@/lib/job-requests.functions";
import { useAuth } from "@/hooks/use-auth";

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

type StatusFilter = "all" | "open" | "awarded" | "closed" | "cancelled";

const STATUS_META: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  open: {
    label: "פתוחה למכרז",
    className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    icon: Clock,
  },
  awarded: {
    label: "נבחר זוכה",
    className: "bg-primary/15 text-primary border-primary/30",
    icon: Trophy,
  },
  closed: {
    label: "סגורה",
    className: "bg-muted text-muted-foreground border-border",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "בוטלה",
    className: "bg-destructive/15 text-destructive border-destructive/30",
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

function DashboardPage() {
  const { hasRole, profile } = useAuth();
  const fetchMine = useServerFn(listMyJobRequests);
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-requests"],
    queryFn: () => fetchMine({ data: {} as never }),
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
    return { open, awarded, totalOffers, total: requests.length, openWithOffers, bestPrice, convRate };
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

  const firstName =
    profile?.full_name?.split(" ")[0] ?? profile?.company_name?.split(" ")[0] ?? "";
  const greeting = getGreeting();
  const formattedDate = new Date().toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

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
      {/* Greeting header */}
      <div className="mb-6 animate-fade-up">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-1">
          <span>{formattedDate}</span>
          {isAdmin && (
            <Badge
              variant="outline"
              className="border-primary/50 text-primary normal-case tracking-normal gap-1"
            >
              <ShieldCheck className="h-3 w-3" /> מנהל מערכת
            </Badge>
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

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 animate-fade-up delay-100">
        <KPICard
          icon={Briefcase}
          label="סה״כ בקשות"
          value={isLoading ? "…" : String(stats.total)}
          sub="כל הזמנים"
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
        />
        <KPICard
          icon={Trophy}
          label="זכיות הוקצו"
          value={isLoading ? "…" : String(stats.awarded)}
          sub={isLoading ? "" : stats.total > 0 ? `${stats.convRate}% המרה` : ""}
          variant="accent"
        />
      </div>

      {/* Insights chips */}
      {!isLoading && requests.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2 animate-fade-up delay-200">
          {stats.openWithOffers > 0 && (
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {stats.openWithOffers} בקשות ממתינות להחלטה שלך
            </span>
          )}
          {stats.bestPrice != null && (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
              ההצעה הטובה ביותר: ₪{stats.bestPrice}/שעה
            </span>
          )}
          {stats.open > 0 && stats.openWithOffers === 0 && (
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              הבקשות הפתוחות ממתינות להצעות
            </span>
          )}
        </div>
      )}

      {/* Filter + search bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-xl border border-border/60 bg-card/60 p-1">
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
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors md:px-4 md:text-sm ${
                filter === f.id
                  ? "bg-gradient-primary text-primary-foreground shadow-sm-app"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
              {filterCounts[f.id] > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                    filter === f.id ? "bg-white/20" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {filterCounts[f.id]}
                </span>
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

      {/* Request list */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-card p-12 text-sm text-muted-foreground">
            <Loader2 className="ms-2 h-4 w-4 animate-spin" /> טוען בקשות…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
            שגיאה בטעינת בקשות: {error instanceof Error ? error.message : "שגיאה לא ידועה"}
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
  const containerCls =
    variant === "accent"
      ? "border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5"
      : variant === "live"
        ? "border-emerald-500/30 bg-emerald-500/5"
        : "border-border/60 bg-card";
  const iconCls =
    variant === "accent"
      ? "bg-gradient-primary text-primary-foreground shadow-elegant"
      : variant === "live"
        ? "bg-emerald-500/15 text-emerald-600"
        : "bg-primary/10 text-primary";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all hover:shadow-card ${containerCls}`}
    >
      <div className="flex items-start justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${iconCls}`}>
          <Icon className="h-5 w-5" />
        </div>
        {variant === "live" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            חי
          </span>
        )}
      </div>
      <div className="mt-4 text-2xl font-extrabold tracking-tight md:text-3xl">{value}</div>
      <div className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground/70">{sub}</div>}
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
      className="group block rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-primary/40 hover:shadow-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`gap-1 text-xs ${meta.className}`}>
              <Icon className="h-3 w-3" /> {meta.label}
            </Badge>
            <span className="font-mono text-[11px] text-muted-foreground">#{r.id.slice(0, 8)}</span>
            {r.deadline_at && r.status === "open" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                <Clock className="h-3 w-3" /> סגירה{" "}
                {new Date(r.deadline_at).toLocaleDateString("he-IL")}
              </span>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold">
              <MapPin className="h-4 w-4 text-primary" /> {r.location}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" /> {r.start_date} · {r.duration}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> {r.workers_count} עובדים
            </span>
          </div>

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

          {r.status === "open" && r.offers_count > 0 && (
            <div className="mt-3 max-w-xs">
              <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>עוצמת תחרות</span>
                <span className="font-bold text-primary">{r.offers_count} הצעות</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-secondary/80">
                <div
                  className="h-full rounded-full bg-gradient-primary transition-all duration-500"
                  style={{ width: `${offerBarWidth}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="text-center">
            <div className="text-2xl font-extrabold text-primary leading-none">{r.offers_count}</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              {r.offers_count === 1 ? "הצעה" : "הצעות"}
            </div>
          </div>
          {r.min_price != null && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-center">
              <div className="text-xs font-extrabold text-emerald-600">₪{r.min_price}</div>
              <div className="text-[9px] text-muted-foreground">מינ׳/שעה</div>
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
    <div className="relative overflow-hidden rounded-3xl border border-dashed border-border bg-card/40 p-12 text-center">
      <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
      <div className="relative">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
          <Inbox className="h-8 w-8 text-primary" />
        </div>
        <h3 className="mt-5 text-xl font-bold">
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
                <Plus className="ms-1 h-4 w-4" /> פרסם בקשה ראשונה
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

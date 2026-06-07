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
  Inbox,
  ArrowLeft,
  ShieldCheck,
  TrendingUp,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
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

function DashboardPage() {
  const { hasRole } = useAuth();
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
    return { open, awarded, totalOffers, total: requests.length };
  }, [requests]);

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              לוח בקרה
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">הבקשות שלי</h1>
              {isAdmin && (
                <Badge variant="outline" className="border-primary/50 text-primary">
                  <ShieldCheck className="ms-1 h-3.5 w-3.5" /> מנהל מערכת
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              עקוב אחרי כל בקשות העבודה שפרסמת, ההצעות שהתקבלו וסטטוס הזכיות.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="bg-gradient-primary text-primary-foreground shadow-elegant"
          >
            <Link to="/new-request">
              <Plus className="ml-1 h-4 w-4" /> בקשה חדשה
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KPI icon={Briefcase} label="סה״כ בקשות" value={String(stats.total)} />
          <KPI icon={Clock} label="פתוחות למכרז" value={String(stats.open)} />
          <KPI icon={TrendingUp} label="הצעות שהתקבלו" value={String(stats.totalOffers)} />
          <KPI icon={Trophy} label="זכיות הוקצו" value={String(stats.awarded)} accent />
        </div>

        {/* Filters */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap rounded-xl border border-border/60 bg-card p-1">
            {(
              [
                { id: "all", label: "הכל" },
                { id: "open", label: "פתוחות" },
                { id: "awarded", label: "נבחר זוכה" },
                { id: "closed", label: "סגורות" },
                { id: "cancelled", label: "בוטלו" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors md:px-4 md:text-sm ${
                  filter === f.id
                    ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="חפש לפי עיר, תפקיד או מספר"
              className="h-10 pr-9"
            />
          </div>
        </div>

        {/* List */}
        <div className="mt-6 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-card p-12 text-sm text-muted-foreground">
              <Loader2 className="ml-2 h-4 w-4 animate-spin" /> טוען בקשות…
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
      </main>
      <SiteFooter />
    </div>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${accent ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card"}`}
    >
      <div
        className={`grid h-10 w-10 place-items-center rounded-lg ${accent ? "bg-gradient-primary text-primary-foreground" : "bg-primary/15 text-primary"}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 text-2xl font-extrabold tracking-tight md:text-3xl">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function RequestCard({ request: r }: { request: MyRequest }) {
  const meta = STATUS_META[r.status] ?? STATUS_META.open;
  const Icon = meta.icon;
  return (
    <Link
      to="/my-requests/$id"
      params={{ id: r.id }}
      className="hover-lift block rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-primary/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`gap-1 ${meta.className}`}>
              <Icon className="h-3 w-3" /> {meta.label}
            </Badge>
            <span className="text-xs text-muted-foreground">#{r.id.slice(0, 8)}</span>
            {r.deadline_at && r.status === "open" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                <Clock className="h-3 w-3" /> סגירה{" "}
                {new Date(r.deadline_at).toLocaleDateString("he-IL")}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold md:text-base">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4 text-primary" /> {r.location}
            </span>
            <span className="inline-flex items-center gap-1 font-normal text-muted-foreground text-xs">
              <Calendar className="h-3.5 w-3.5" /> {r.start_date} · {r.duration}
            </span>
            <span className="inline-flex items-center gap-1 font-normal text-muted-foreground text-xs">
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
                  <Briefcase className="h-3 w-3" /> {role}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="text-left">
          <div className="text-2xl font-extrabold text-primary">{r.offers_count}</div>
          <div className="text-[10px] text-muted-foreground">
            {r.offers_count === 1 ? "הצעה" : "הצעות"}
          </div>
          {r.min_price != null && (
            <div className="mt-2 text-xs text-muted-foreground">
              מינ׳ <span className="font-bold text-foreground">₪{r.min_price}/שעה</span>
            </div>
          )}
          <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
            ניהול <ArrowLeft className="h-3 w-3" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
      <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
      <h3 className="mt-3 text-lg font-bold">
        {hasAny ? "אין בקשות מתאימות לסינון" : "עוד לא פרסמת בקשות"}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasAny
          ? "נסה לשנות את הסינון או החיפוש."
          : "פרסם בקשה ראשונה כדי להתחיל לקבל הצעות מתאגידי כוח אדם מאומתים."}
      </p>
      {!hasAny && (
        <Button asChild className="mt-4 bg-gradient-primary text-primary-foreground">
          <Link to="/new-request">
            <Plus className="ml-1 h-4 w-4" /> פרסם בקשה
          </Link>
        </Button>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  Plus, Search, Filter, MapPin, Calendar, Users, ArrowLeft,
  TrendingUp, MessageCircle, Briefcase, CheckCircle2, Clock, BadgeCheck, Star,
  Bell, History, LayoutDashboard, Inbox, X, Sparkles, AlertCircle,
  PlayCircle, XCircle, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import {
  REQUESTS, getCorporation, NOTIFICATIONS, SELECTION_HISTORY,
  type Notification, type SelectionRecord,
} from "@/lib/mock-data";
import { useSelections, useExtraNotifications, getSelectionForRequest } from "@/lib/selections-store";

type Tab = "overview" | "active" | "history" | "notifications";

const searchSchema = z.object({
  tab: fallback(z.enum(["overview", "active", "history", "notifications"]), "overview").default("overview"),
});

export const Route = createFileRoute("/dashboard")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "לוח בקרה — BuildForce" },
      { name: "description", content: "כל הבקשות, ההצעות, היסטוריית בחירות והתראות במקום אחד." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const tab = search.tab;

  const liveSelections = useSelections();
  const extraNotifs = useExtraNotifications();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const allNotifs: Notification[] = useMemo(() => {
    const merged = [...extraNotifs, ...NOTIFICATIONS]
      .filter((n) => !dismissed.has(n.id))
      .map((n) => (readIds.has(n.id) ? { ...n, read: true } : n));
    return merged;
  }, [extraNotifs, dismissed, readIds]);

  const setNotifs = (next: Notification[]) => {
    // We support: mark-all-read, mark single read, dismiss
    const newRead = new Set(readIds);
    const newDismissed = new Set(dismissed);
    const nextIds = new Set(next.map((n) => n.id));
    for (const n of allNotifs) {
      if (!nextIds.has(n.id)) newDismissed.add(n.id);
    }
    for (const n of next) {
      if (n.read) newRead.add(n.id);
    }
    setReadIds(newRead);
    setDismissed(newDismissed);
  };
  const notifs = allNotifs;
  const unreadCount = notifs.filter((n) => !n.read).length;

  const mergedHistory: SelectionRecord[] = useMemo(
    () => [...liveSelections, ...SELECTION_HISTORY],
    [liveSelections],
  );

  const setTab = (t: Tab) =>
    navigate({ search: (prev: typeof search) => ({ ...prev, tab: t }) });

  const stats = useMemo(() => {
    const active = REQUESTS.filter((r) => r.status === "active");
    const awardedIds = new Set(liveSelections.map((s) => s.requestId));
    const stillOpen = active.filter((r) => !awardedIds.has(r.id));
    return [
      { icon: Briefcase, label: "בקשות פעילות", value: String(stillOpen.length), trend: "+2 השבוע", color: "primary" as const },
      { icon: MessageCircle, label: "הצעות פתוחות", value: String(stillOpen.reduce((s, r) => s + r.offers.length, 0)), trend: "+5 היום", color: "primary" as const },
      { icon: CheckCircle2, label: "פרויקטים פעילים", value: String(mergedHistory.filter((s) => s.status === "in-progress").length), color: "emerald" as const },
      { icon: TrendingUp, label: "חיסכון מצטבר", value: "₪48K", trend: "12% מתחת לשוק", color: "primary" as const },
    ];
  }, [liveSelections, mergedHistory]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">לוח בקרה</div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">שלום, אבי 👋</h1>
            <p className="mt-1 text-sm text-muted-foreground">סקירה מלאה של הבקשות, ההצעות והפרויקטים שלך</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="lg" onClick={() => setTab("notifications")} className="relative">
              <Bell className="ml-1 h-4 w-4" />
              התראות
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </Button>
            <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-elegant">
              <Link to="/new-request">
                <Plus className="ml-1 h-4 w-4" />
                בקשה חדשה
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border/60 bg-card p-5">
              <div className={`grid h-10 w-10 place-items-center rounded-lg ${
                s.color === "emerald" ? "bg-emerald-500/15 text-emerald-400" : "bg-primary/15 text-primary"
              }`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-2xl font-extrabold tracking-tight md:text-3xl">{s.value}</div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{s.label}</span>
                {s.trend && <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">{s.trend}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mt-10 border-b border-border/60">
          <div className="flex flex-wrap gap-1 overflow-x-auto">
            <TabBtn icon={LayoutDashboard} active={tab === "overview"} onClick={() => setTab("overview")}>סקירה</TabBtn>
            <TabBtn icon={Briefcase} active={tab === "active"} onClick={() => setTab("active")}>בקשות פעילות</TabBtn>
            <TabBtn icon={History} active={tab === "history"} onClick={() => setTab("history")}>היסטוריית בחירות</TabBtn>
            <TabBtn icon={Bell} active={tab === "notifications"} onClick={() => setTab("notifications")} badge={unreadCount}>
              התראות
            </TabBtn>
          </div>
        </div>

        <div className="mt-6">
          {tab === "overview" && <OverviewTab notifs={notifs} setNotifs={setNotifs} setTab={setTab} history={mergedHistory} />}
          {tab === "active" && <ActiveRequestsTab />}
          {tab === "history" && <HistoryTab history={mergedHistory} />}
          {tab === "notifications" && <NotificationsTab notifs={notifs} setNotifs={setNotifs} />}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/* ---------- Tabs ---------- */

function OverviewTab({ notifs, setNotifs, setTab, history }: { notifs: Notification[]; setNotifs: (n: Notification[]) => void; setTab: (t: Tab) => void; history: SelectionRecord[] }) {
  const active = REQUESTS.filter((r) => r.status === "active").slice(0, 3);
  const recentNotifs = notifs.slice(0, 4);
  const inProgress = history.filter((s) => s.status === "in-progress").slice(0, 2);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <PanelHeader title="בקשות פעילות אחרונות" action={<button onClick={() => setTab("active")} className="text-xs font-semibold text-primary hover:underline">הצג הכל ←</button>} />
        <div className="space-y-3">
          {active.map((r) => <RequestCard key={r.id} request={r} compact />)}
        </div>

        {inProgress.length > 0 && (
          <>
            <PanelHeader title="פרויקטים בעבודה" action={<button onClick={() => setTab("history")} className="text-xs font-semibold text-primary hover:underline">היסטוריה ←</button>} />
            <div className="space-y-3">
              {inProgress.map((s) => <HistoryCard key={s.id} record={s} compact />)}
            </div>
          </>
        )}
      </div>

      <aside className="space-y-3">
        <PanelHeader title="התראות אחרונות" action={<button onClick={() => setTab("notifications")} className="text-xs font-semibold text-primary hover:underline">הצג הכל ←</button>} />
        <div className="space-y-2 rounded-2xl border border-border/60 bg-card p-3">
          {recentNotifs.map((n) => (
            <NotificationItem key={n.id} notification={n} onMarkRead={() => setNotifs(notifs.map(x => x.id === n.id ? { ...x, read: true } : x))} compact />
          ))}
        </div>

        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <Sparkles className="h-6 w-6 text-primary" />
          <h3 className="mt-3 text-sm font-bold">טיפ: זמן תגובה</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            תגיב להצעות תוך 24 שעות כדי לקבל עדיפות מהתאגידים בבקשות הבאות.
          </p>
        </div>
      </aside>
    </div>
  );
}

function ActiveRequestsTab() {
  const [q, setQ] = useState("");
  const filtered = REQUESTS.filter((r) => {
    if (q && !`${r.role} ${r.location} ${r.id}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          <span className="font-bold text-foreground">{filtered.length}</span> בקשות
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חפש לפי תחום, עיר או מספר" className="h-10 pr-9" />
        </div>
      </div>
      <div className="space-y-4">
        {filtered.length === 0 && (
          <EmptyState icon={Filter} title="אין בקשות מתאימות" desc="נסה לשנות את החיפוש או פרסם בקשה חדשה." />
        )}
        {filtered.map((r) => <RequestCard key={r.id} request={r} />)}
      </div>
    </div>
  );
}

function HistoryTab({ history }: { history: SelectionRecord[] }) {
  const [filter, setFilter] = useState<"all" | "in-progress" | "completed" | "cancelled">("all");
  const filtered = history.filter((s) => filter === "all" || s.status === filter);

  const totalSpent = history.filter((s) => s.status !== "cancelled").reduce((sum, s) => sum + s.totalEstimate, 0);
  const avgRating = (() => {
    const rated = history.filter((s) => s.rating);
    if (!rated.length) return 0;
    return (rated.reduce((sum, s) => sum + (s.rating ?? 0), 0) / rated.length).toFixed(1);
  })();

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <MiniStat label="סה״כ פרויקטים" value={String(history.length)} />
        <MiniStat label="הוצאה מצטברת" value={`₪${(totalSpent / 1000).toFixed(0)}K`} />
        <MiniStat label="דירוג ממוצע נתון" value={`${avgRating} ★`} />
      </div>

      <div className="mb-5 inline-flex rounded-xl border border-border/60 bg-card p-1">
        {([
          { id: "all", label: "הכל" },
          { id: "in-progress", label: "בעבודה" },
          { id: "completed", label: "הושלמו" },
          { id: "cancelled", label: "בוטלו" },
        ] as const).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors md:px-4 md:text-sm ${
              filter === f.id ? "bg-gradient-primary text-primary-foreground shadow-elegant" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <EmptyState icon={History} title="אין היסטוריה" desc="פרויקטים שתבחר ספק עבורם יופיעו כאן." />
        )}
        {filtered.map((s) => <HistoryCard key={s.id} record={s} />)}
      </div>
    </div>
  );
}

function NotificationsTab({ notifs, setNotifs }: { notifs: Notification[]; setNotifs: (n: Notification[]) => void }) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const filtered = notifs.filter((n) => filter === "all" || !n.read);

  const markAllRead = () => setNotifs(notifs.map((n) => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifs(notifs.map((n) => n.id === id ? { ...n, read: true } : n));
  const dismiss = (id: string) => setNotifs(notifs.filter((n) => n.id !== id));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-border/60 bg-card p-1">
          {([
            { id: "all", label: "הכל" },
            { id: "unread", label: `לא נקראו (${notifs.filter(n => !n.read).length})` },
          ] as const).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors md:text-sm ${
                filter === f.id ? "bg-gradient-primary text-primary-foreground shadow-elegant" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={markAllRead} disabled={notifs.every(n => n.read)}>
          <CheckCircle2 className="ml-1 h-4 w-4" /> סמן הכל כנקרא
        </Button>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <EmptyState icon={Inbox} title="אין התראות חדשות" desc="כשתגיע התראה — נציג אותה כאן ונשלח לך גם ב-WhatsApp." />
        )}
        {filtered.map((n) => (
          <NotificationItem key={n.id} notification={n} onMarkRead={() => markRead(n.id)} onDismiss={() => dismiss(n.id)} />
        ))}
      </div>
    </div>
  );
}

/* ---------- Reusable cards ---------- */

function PanelHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-bold md:text-lg">{title}</h2>
      {action}
    </div>
  );
}

function TabBtn({ icon: Icon, active, onClick, children, badge }: { icon: React.ComponentType<{ className?: string }>; active: boolean; onClick: () => void; children: React.ReactNode; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`relative -mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
        active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {badge}
        </span>
      )}
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-extrabold md:text-2xl">{value}</div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground" />
      <h3 className="mt-3 text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: "active" | "closed" | "draft" }) {
  if (status === "active") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> פעילה
    </span>
  );
  if (status === "closed") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
      <CheckCircle2 className="h-3 w-3" /> סגורה
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">טיוטה</span>
  );
}

function RequestCard({ request: r, compact }: { request: typeof REQUESTS[number]; compact?: boolean }) {
  const best = r.offers[0] ? getCorporation(r.offers[0].corporationId) : null;
  return (
    <Link
      to="/requests/$id"
      params={{ id: r.id }}
      className="hover-lift block rounded-2xl border border-border/60 bg-card p-5 md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">#{r.id}</span>
            <StatusBadge status={r.status} />
            <span className="text-xs text-muted-foreground">· {r.postedAt}</span>
          </div>
          <h3 className={`mt-2 font-bold ${compact ? "text-lg" : "text-xl md:text-2xl"}`}>
            {r.count} {r.role} · {r.location}
          </h3>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground md:text-sm">
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {r.location}</span>
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> התחלה {r.startDate}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {r.duration}</span>
          </div>
        </div>
        <div className="text-left">
          <div className="text-xs text-muted-foreground">הצעות</div>
          <div className="text-3xl font-extrabold text-primary">{r.offers.length}</div>
        </div>
      </div>
      {best && !compact && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-secondary/40 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-xs font-bold">{best.name[0]}</div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <span className="truncate">ההצעה הטובה ביותר: {best.name}</span>
                {best.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-primary text-primary" /> {best.rating} · ₪{r.offers[0].pricePerHour}/שעה
              </div>
            </div>
          </div>
          <ArrowLeft className="h-5 w-5 text-primary" />
        </div>
      )}
      {!best && r.status === "active" && (
        <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          <Clock className="h-4 w-4 text-primary" /> ממתין להצעות מתאגידים
        </div>
      )}
    </Link>
  );
}

function HistoryCard({ record: s, compact }: { record: SelectionRecord; compact?: boolean }) {
  const corp = getCorporation(s.corporationId);
  if (!corp) return null;
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-primary text-base font-extrabold text-primary-foreground shadow-elegant">
            {corp.name[0]}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">#{s.requestId}</span>
              <HistoryStatus status={s.status} />
            </div>
            <h3 className="mt-1 text-base font-bold md:text-lg">{s.requestTitle}</h3>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <span>ספק:</span>
              <Link to="/corporations/$id" params={{ id: corp.id }} className="font-semibold text-foreground hover:text-primary">
                {corp.name}
              </Link>
              {corp.verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
            </div>
          </div>
        </div>
        <div className="text-left">
          <div className="text-lg font-extrabold md:text-xl">₪{s.pricePerHour}<span className="text-xs font-normal text-muted-foreground">/שעה</span></div>
          {s.totalEstimate > 0 && (
            <div className="mt-0.5 text-[11px] text-muted-foreground">סה״כ ₪{s.totalEstimate.toLocaleString()}</div>
          )}
        </div>
      </div>
      {!compact && (
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-4 sm:grid-cols-4">
          <Spec label="התחלה" value={s.startDate} />
          <Spec label="משך" value={s.duration} />
          <Spec label="עובדים" value={String(s.count)} />
          <Spec label="נבחר" value={s.selectedAt} />
        </div>
      )}
      {s.rating && (
        <div className="mt-4 flex items-center gap-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          הדירוג שנתת:
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`h-3.5 w-3.5 ${i < (s.rating ?? 0) ? "fill-primary text-primary" : "text-muted"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryStatus({ status }: { status: SelectionRecord["status"] }) {
  if (status === "in-progress") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
      <PlayCircle className="h-3 w-3" /> בעבודה
    </span>
  );
  if (status === "completed") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
      <CheckCircle2 className="h-3 w-3" /> הושלם
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
      <XCircle className="h-3 w-3" /> בוטל
    </span>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/40 px-3 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-bold">{value}</div>
    </div>
  );
}

function NotificationItem({ notification: n, onMarkRead, onDismiss, compact }: { notification: Notification; onMarkRead: () => void; onDismiss?: () => void; compact?: boolean }) {
  const Icon = NOTIF_ICON[n.type];
  const color = NOTIF_COLOR[n.type];
  const inner = (
    <div className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
      n.read ? "border-transparent bg-transparent" : "border-primary/20 bg-primary/5"
    } ${compact ? "" : "border-border/60 bg-card"}`}>
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold">{n.title}</div>
          {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
        <div className="mt-1.5 text-[10px] text-muted-foreground">{n.timeAgo}</div>
      </div>
      {!compact && (
        <div className="flex shrink-0 gap-1">
          {!n.read && (
            <button onClick={(e) => { e.preventDefault(); onMarkRead(); }} title="סמן כנקרא" className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
          )}
          {onDismiss && (
            <button onClick={(e) => { e.preventDefault(); onDismiss(); }} title="סגור" className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (n.requestId) {
    return (
      <Link to="/requests/$id" params={{ id: n.requestId }} onClick={onMarkRead} className="block">
        {inner}
      </Link>
    );
  }
  return <div onClick={onMarkRead}>{inner}</div>;
}

const NOTIF_ICON: Record<Notification["type"], React.ComponentType<{ className?: string }>> = {
  new_offer: Inbox,
  offer_accepted: CheckCircle2,
  message: Mail,
  request_closing: AlertCircle,
  system: Sparkles,
};

const NOTIF_COLOR: Record<Notification["type"], string> = {
  new_offer: "bg-primary/15 text-primary",
  offer_accepted: "bg-emerald-500/15 text-emerald-400",
  message: "bg-sky-500/15 text-sky-400",
  request_closing: "bg-amber-500/15 text-amber-400",
  system: "bg-muted text-muted-foreground",
};
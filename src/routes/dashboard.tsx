import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Plus, Search, Filter, MapPin, Calendar, Users, ArrowLeft,
  TrendingUp, MessageCircle, Briefcase, CheckCircle2, Clock, BadgeCheck, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { REQUESTS, getCorporation } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "לוח בקרה — BuildForce" },
      { name: "description", content: "כל הבקשות, ההצעות והפרויקטים שלך — במקום אחד." },
    ],
  }),
  component: DashboardPage,
});

type Tab = "all" | "active" | "closed";

function DashboardPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");

  const filtered = REQUESTS.filter((r) => {
    if (tab === "active" && r.status !== "active") return false;
    if (tab === "closed" && r.status !== "closed") return false;
    if (q && !`${r.role} ${r.location} ${r.id}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const stats = [
    { icon: Briefcase, label: "בקשות פעילות", value: REQUESTS.filter((r) => r.status === "active").length },
    { icon: MessageCircle, label: "הצעות שהתקבלו", value: REQUESTS.reduce((s, r) => s + r.offers.length, 0) },
    { icon: Users, label: "עובדים בבקשה", value: REQUESTS.filter((r) => r.status === "active").reduce((s, r) => s + r.count, 0) },
    { icon: TrendingUp, label: "חיסכון מוערך", value: "12%" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">לוח בקרה</div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">שלום, אבי 👋</h1>
            <p className="mt-1 text-sm text-muted-foreground">סקירה מלאה של הבקשות וההצעות שלך</p>
          </div>
          <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-elegant">
            <Link to="/new-request">
              <Plus className="ml-1 h-4 w-4" />
              בקשה חדשה
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-2xl font-extrabold tracking-tight md:text-3xl">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground md:text-sm">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs + search */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-border/60 bg-card p-1">
            {([
              { id: "all", label: "הכל" },
              { id: "active", label: "פעילות" },
              { id: "closed", label: "סגורות" },
            ] as { id: Tab; label: string }[]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  tab === t.id ? "bg-gradient-primary text-primary-foreground shadow-elegant" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חפש לפי תחום, עיר או מספר בקשה" className="h-10 pr-9" />
          </div>
        </div>

        {/* Requests list */}
        <div className="mt-6 space-y-4">
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
              <Filter className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="mt-3 text-lg font-bold">אין בקשות מתאימות</h3>
              <p className="mt-1 text-sm text-muted-foreground">נסה לשנות את הסינון או פרסם בקשה חדשה.</p>
            </div>
          )}
          {filtered.map((r) => {
            const best = r.offers[0] ? getCorporation(r.offers[0].corporationId) : null;
            return (
              <Link
                key={r.id}
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
                    <h3 className="mt-2 text-xl font-bold md:text-2xl">{r.count} {r.role} · {r.location}</h3>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {r.location}</span>
                      <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> התחלה {r.startDate}</span>
                      <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {r.duration}</span>
                      {r.budget && <span className="inline-flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> {r.budget}</span>}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-muted-foreground">הצעות</div>
                    <div className="text-3xl font-extrabold text-primary">{r.offers.length}</div>
                  </div>
                </div>
                {best && (
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
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function StatusBadge({ status }: { status: "active" | "closed" | "draft" }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> פעילה
      </span>
    );
  }
  if (status === "closed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
        <CheckCircle2 className="h-3 w-3" /> סגורה
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
      טיוטה
    </span>
  );
}
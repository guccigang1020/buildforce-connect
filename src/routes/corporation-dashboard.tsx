import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Briefcase, TrendingUp, Trophy, Clock, BadgeCheck, Building2,
  CheckCircle2, XCircle, Coins, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { REQUESTS, getCorporation } from "@/lib/mock-data";
import { useSelections } from "@/lib/selections-store";
import {
  PLATFORM_FEE_PER_HOUR, HOURS_PER_MONTH,
  totalCorporationPays, monthlyContractorPay, monthlyFeeRevenue,
} from "@/lib/commission-config";

const DEFAULT_CORP = "electra";

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
  const [corpId, setCorpId] = useState<string>(DEFAULT_CORP);
  const corp = getCorporation(corpId);
  const selections = useSelections();

  const myOffers = useMemo(
    () =>
      REQUESTS.flatMap((r) =>
        r.offers.filter((o) => o.corporationId === corpId).map((o) => ({ req: r, offer: o })),
      ),
    [corpId],
  );

  const wonRequestIds = new Set(
    selections.filter((s) => s.corporationId === corpId).map((s) => s.requestId),
  );
  const won = myOffers.filter((x) => wonRequestIds.has(x.req.id));
  const open = myOffers.filter((x) => x.req.status === "active" && !wonRequestIds.has(x.req.id));
  const lost = myOffers.filter((x) => x.req.status === "closed" && !wonRequestIds.has(x.req.id));

  const decided = won.length + lost.length;
  const winRate = decided > 0 ? Math.round((won.length / decided) * 100) : 0;

  const monthlyContractor = won.reduce(
    (sum, x) => sum + monthlyContractorPay(x.req.count, x.offer.pricePerHour),
    0,
  );
  const monthlyFee = won.reduce((sum, x) => sum + monthlyFeeRevenue(x.req.count), 0);

  if (!corp) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-14">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3 rotate-180" /> חזרה ללוח הראשי
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">לוח תאגיד</div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl flex items-center gap-3">
              <Building2 className="h-7 w-7 text-primary" />
              {corp.name}
              {corp.verified && <BadgeCheck className="h-6 w-6 text-primary" />}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {corp.workers} עובדים · {corp.regions} · דירוג {corp.rating}★
            </p>
          </div>
          <select
            value={corpId}
            onChange={(e) => setCorpId(e.target.value)}
            className="h-10 rounded-md border border-border bg-card px-3 text-sm font-semibold"
          >
            {["daniel", "electra", "metzada", "ort"].map((id) => {
              const c = getCorporation(id);
              return <option key={id} value={id}>{c?.name}</option>;
            })}
          </select>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPI icon={Briefcase} label="הצעות פתוחות" value={String(open.length)} />
          <KPI icon={Trophy} label="זכיות" value={String(won.length)} accent />
          <KPI icon={TrendingUp} label="שיעור הצלחה" value={`${winRate}%`} />
          <KPI icon={Coins} label="עמלת פלטפורמה/חודש" value={`₪${monthlyFee.toLocaleString()}`} />
        </div>

        <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <Coins className="mt-0.5 h-5 w-5 text-primary" />
            <div className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground">חיוב חודשי צפוי:</span>{" "}
              <span className="text-base font-extrabold text-foreground">₪{monthlyFee.toLocaleString()}</span>{" "}
              (₪{PLATFORM_FEE_PER_HOUR} לשעת עובד · {HOURS_PER_MONTH} שעות/חודש ·{" "}
              {won.reduce((s, x) => s + x.req.count, 0)} עובדים פעילים).
              הכנסה לתאגיד מהפרויקטים הפעילים: <span className="font-bold text-foreground">₪{monthlyContractor.toLocaleString()}</span>/חודש.
            </div>
          </div>
        </div>

        <Section title={`הצעות פתוחות (${open.length})`}>
          {open.length === 0 ? (
            <Empty title="אין הצעות פתוחות" />
          ) : (
            open.map((x) => <OfferRow key={x.req.id} req={x.req} price={x.offer.pricePerHour} status="open" />)
          )}
        </Section>

        <Section title={`זכיות (${won.length})`}>
          {won.length === 0 ? (
            <Empty title="עדיין לא זכית בבקשות" />
          ) : (
            won.map((x) => <OfferRow key={x.req.id} req={x.req} price={x.offer.pricePerHour} status="won" />)
          )}
        </Section>

        {lost.length > 0 && (
          <Section title={`לא נבחרו (${lost.length})`}>
            {lost.map((x) => <OfferRow key={x.req.id} req={x.req} price={x.offer.pricePerHour} status="lost" />)}
          </Section>
        )}
      </main>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <h2 className="mb-3 text-base font-bold md:text-lg">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Empty({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
      {title}
    </div>
  );
}

function OfferRow({ req, price, status }: { req: typeof REQUESTS[number]; price: number; status: "open" | "won" | "lost" }) {
  const total = totalCorporationPays(price);
  return (
    <Link
      to="/requests/$id"
      params={{ id: req.id }}
      className="hover-lift flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 md:p-5"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">#{req.id}</span>
          {status === "open" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
              <Clock className="h-3 w-3" /> ממתין להחלטה
            </span>
          )}
          {status === "won" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> זכית
            </span>
          )}
          {status === "lost" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              <XCircle className="h-3 w-3" /> לא נבחרת
            </span>
          )}
        </div>
        <div className="mt-1 text-sm font-bold md:text-base">{req.count} {req.role} · {req.location}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">התחלה {req.startDate} · {req.duration}</div>
      </div>
      <div className="text-left text-xs">
        <div className="text-base font-extrabold">₪{price}/שעה</div>
        <div className="text-[10px] text-muted-foreground">+₪{PLATFORM_FEE_PER_HOUR} עמלה · ₪{total} סה״כ</div>
      </div>
    </Link>
  );
}
import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft, MapPin, Calendar, Clock, Briefcase, BadgeCheck, Star,
  CheckCircle2, MessageCircle, TrendingDown, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getRequest, getCorporation, type WorkforceRequest, type Offer, type Corporation } from "@/lib/mock-data";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const Route = createFileRoute("/requests/$id")({
  loader: ({ params }) => {
    const req = getRequest(params.id);
    if (!req) throw notFound();
    return { req };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `בקשה #${loaderData?.req.id ?? ""} — BuildForce` },
      { name: "description", content: `${loaderData?.req.count ?? ""} ${loaderData?.req.role ?? ""} ב${loaderData?.req.location ?? ""}` },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-24 text-center md:px-6">
        <h1 className="text-4xl font-extrabold">בקשה לא נמצאה</h1>
        <Button asChild className="mt-6 bg-gradient-primary text-primary-foreground"><Link to="/dashboard">לוח הבקרה</Link></Button>
      </main>
      <SiteFooter />
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-24 text-center md:px-6">
        <h1 className="text-3xl font-extrabold">שגיאה בטעינת הבקשה</h1>
        <p className="mt-3 text-sm text-muted-foreground">{error.message}</p>
      </main>
      <SiteFooter />
    </div>
  ),
  component: RequestPage,
});

function RequestPage() {
  const { req } = Route.useLoaderData() as { req: WorkforceRequest };
  const [selected, setSelected] = useState<string | null>(null);

  type EnrichedOffer = Offer & { corp: Corporation };
  const offers: EnrichedOffer[] = req.offers
    .map((o: Offer) => ({ ...o, corp: getCorporation(o.corporationId) }))
    .filter((o): o is EnrichedOffer => Boolean(o.corp));

  const sortedByPrice: EnrichedOffer[] = [...offers].sort((a, b) => a.pricePerHour - b.pricePerHour);
  const lowestPrice = sortedByPrice[0]?.pricePerHour;
  const avgPrice = offers.length
    ? Math.round(offers.reduce((s, o) => s + o.pricePerHour, 0) / offers.length)
    : 0;

  const reqForWhatsapp = {
    id: req.id,
    role: req.role,
    count: req.count,
    location: req.location,
    duration: req.duration,
    startDate: req.startDate,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3 rotate-180" /> חזרה ללוח הבקרה
        </Link>

        {/* Header */}
        <div className="mt-6 rounded-3xl border border-border/60 bg-card p-6 shadow-card md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">#{req.id}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> פעילה
                </span>
                <span className="text-xs text-muted-foreground">· פורסם {req.postedAt}</span>
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
                {req.count} {req.role} · {req.location}
              </h1>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" /> {req.location}</span>
                <span className="inline-flex items-center gap-2"><Calendar className="h-4 w-4" /> התחלה {req.startDate}</span>
                <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" /> {req.duration}</span>
                {req.budget && <span className="inline-flex items-center gap-2"><Briefcase className="h-4 w-4" /> תקציב: {req.budget}</span>}
              </div>
              {req.description && (
                <p className="mt-5 max-w-2xl rounded-xl border border-border/60 bg-secondary/40 p-4 text-sm text-muted-foreground">{req.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">הצעות שהתקבלו ({offers.length})</h2>
              {lowestPrice && (
                <div className="text-xs text-muted-foreground">
                  הצעה הכי זולה: <span className="font-bold text-primary">₪{lowestPrice}</span>
                </div>
              )}
            </div>

            {offers.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
                <Clock className="mx-auto h-8 w-8 text-primary" />
                <h3 className="mt-3 text-lg font-bold">ממתין להצעות</h3>
                <p className="mt-1 text-sm text-muted-foreground">התאגידים בודקים את הבקשה. הצעות ראשונות בדרך כלל מגיעות תוך 4-24 שעות.</p>
              </div>
            )}

            {sortedByPrice.map((o, i) => {
              const isCheapest = o.pricePerHour === lowestPrice;
              const isSelected = selected === o.corp.id;
              return (
                <div
                  key={o.corp.id}
                  className={`relative rounded-2xl border p-5 transition-all md:p-6 ${
                    isSelected ? "border-primary bg-primary/5 shadow-elegant" : "border-border/60 bg-card hover:border-primary/40"
                  }`}
                >
                  {isCheapest && offers.length > 1 && (
                    <div className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-bold text-primary-foreground shadow-elegant">
                      <TrendingDown className="h-3 w-3" /> ההצעה הזולה ביותר
                    </div>
                  )}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-primary text-lg font-extrabold text-primary-foreground shadow-elegant">
                        {o.corp.name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Link to="/corporations/$id" params={{ id: o.corp.id }} className="text-base font-bold hover:underline">
                            {o.corp.name}
                          </Link>
                          {o.corp.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-primary text-primary" /> {o.corp.rating} ({o.corp.reviews})</span>
                          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {o.corp.regions}</span>
                          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> מ-{o.startDate}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-2xl font-extrabold">₪{o.pricePerHour}</div>
                      <div className="text-[10px] text-muted-foreground">לשעת עובד</div>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
                    <a
                      href={buildWhatsAppUrl(o.corp.phone, o.corp.name, reqForWhatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-[#25D366] px-3 text-xs font-bold text-white transition-transform hover:scale-[1.02]"
                    >
                      <MessageCircle className="h-4 w-4" /> שלח ב-WhatsApp
                    </a>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to="/corporations/$id" params={{ id: o.corp.id }}>פרופיל מלא</Link>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setSelected(o.corp.id)}
                        className={isSelected ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-gradient-primary text-primary-foreground"}
                      >
                        {isSelected ? <><CheckCircle2 className="ml-1 h-4 w-4" /> נבחר</> : "בחר ספק"}
                      </Button>
                    </div>
                  </div>
                  {i === 0 && offers.length > 1 && (
                    <div className="mt-3 text-[11px] text-muted-foreground">
                      💡 ההצעה הזו זולה ב-{Math.round(((avgPrice - o.pricePerHour) / avgPrice) * 100)}% מהממוצע בבקשה זו
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
            <div className="rounded-2xl border border-border/60 bg-card p-6">
              <h3 className="text-sm font-bold">סקירת מחירים</h3>
              <div className="mt-4 space-y-3 text-sm">
                <Row label="הצעות שהתקבלו" value={String(offers.length)} />
                <Row label="מחיר ממוצע" value={avgPrice ? `₪${avgPrice}` : "—"} />
                <Row label="הזולה ביותר" value={lowestPrice ? `₪${lowestPrice}` : "—"} highlight />
                <Row label="עובדים מבוקשים" value={String(req.count)} />
              </div>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h3 className="mt-3 text-sm font-bold">איך לבחור?</h3>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <li>• בדוק דירוג וביקורות</li>
                <li>• השווה תאריכי התחלה</li>
                <li>• דבר ב-WhatsApp לפני סגירה</li>
                <li>• עיין בפרופיל המלא של התאגיד</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-bold ${highlight ? "text-primary text-base" : ""}`}>{value}</span>
    </div>
  );
}
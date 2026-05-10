import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  ArrowLeft, MapPin, Calendar, Clock, Briefcase, BadgeCheck, Star,
  CheckCircle2, MessageCircle, TrendingDown, ShieldCheck, LayoutGrid,
  Table as TableIcon, Filter, ArrowUpDown, X, Users, Zap, Award, SlidersHorizontal, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import {
  getRequest, getCorporation,
  type WorkforceRequest, type Offer, type Corporation,
} from "@/lib/mock-data";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { addSelection, useSelectionForRequest } from "@/lib/selections-store";

type SortKey = "score" | "price" | "rating" | "availability" | "response" | "warranty";

type Weights = { price: number; rating: number; availability: number; response: number; warranty: number };

const DEFAULT_WEIGHTS: Weights = { price: 40, rating: 20, availability: 15, response: 15, warranty: 10 };

const WEIGHT_META: { key: keyof Weights; label: string; hint: string }[] = [
  { key: "price", label: "מחיר", hint: "נמוך = טוב יותר" },
  { key: "rating", label: "דירוג תאגיד", hint: "גבוה = טוב יותר" },
  { key: "availability", label: "זמינות התחלה", hint: "מוקדם = טוב יותר" },
  { key: "response", label: "זמן תגובה", hint: "מהיר = טוב יותר" },
  { key: "warranty", label: "אחריות", hint: "ארוכה = טוב יותר" },
];

const searchSchema = z.object({
  view: fallback(z.enum(["cards", "table"]), "cards").default("cards"),
  sort: fallback(z.enum(["score", "price", "rating", "availability", "response", "warranty"]), "score").default("score"),
  verifiedOnly: fallback(z.boolean(), false).default(false),
  insuredOnly: fallback(z.boolean(), false).default(false),
  fullCrewOnly: fallback(z.boolean(), false).default(false),
  maxPrice: fallback(z.number().optional(), undefined),
  minRating: fallback(z.number().optional(), undefined),
  minScore: fallback(z.number().optional(), undefined),
});

export const Route = createFileRoute("/requests/$id")({
  validateSearch: zodValidator(searchSchema),
  loader: ({ params }) => {
    const req = getRequest(params.id);
    if (!req) throw notFound();
    return { req };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `בקשה #${loaderData?.req.id ?? ""} — השוואת הצעות — BuildForce` },
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

type EnrichedOffer = Offer & { corp: Corporation };

function RequestPage() {
  const { req } = Route.useLoaderData() as { req: WorkforceRequest };
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const awarded = useSelectionForRequest(req.id);
  const [selected, setSelected] = useState<string | null>(awarded?.corporationId ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);

  const allOffers: EnrichedOffer[] = useMemo(
    () =>
      req.offers
        .map((o: Offer) => ({ ...o, corp: getCorporation(o.corporationId) }))
        .filter((o): o is EnrichedOffer => Boolean(o.corp)),
    [req.offers],
  );

  const scored = useMemo(() => computeScores(allOffers, weights), [allOffers, weights]);

  const filtered = useMemo(() => {
    return scored.filter((o) => {
      if (search.verifiedOnly && !o.corp.verified) return false;
      if (search.insuredOnly && !o.insurance) return false;
      if (search.fullCrewOnly && o.availableWorkers < req.count) return false;
      if (search.maxPrice && o.pricePerHour > search.maxPrice) return false;
      if (search.minRating && o.corp.rating < search.minRating) return false;
      if (search.minScore && o.score < search.minScore) return false;
      return true;
    });
  }, [scored, search, req.count]);

  const sorted = useMemo(() => sortOffers(filtered, search.sort), [filtered, search.sort]);

  const lowest = useMemo(() => Math.min(...allOffers.map((o) => o.pricePerHour)), [allOffers]);
  const highest = useMemo(() => Math.max(...allOffers.map((o) => o.pricePerHour)), [allOffers]);
  const avg = useMemo(
    () => (allOffers.length ? Math.round(allOffers.reduce((s, o) => s + o.pricePerHour, 0) / allOffers.length) : 0),
    [allOffers],
  );
  const fastestResponse = useMemo(() => Math.min(...allOffers.map((o) => o.responseTimeHours)), [allOffers]);

  const setSearch = (patch: Partial<typeof search>) =>
    navigate({ search: (prev: typeof search) => ({ ...prev, ...patch }) });

  const reqForWhatsapp = {
    id: req.id, role: req.role, count: req.count,
    location: req.location, duration: req.duration, startDate: req.startDate,
  };

  const filtersActive =
    search.verifiedOnly || search.insuredOnly || search.fullCrewOnly ||
    search.maxPrice !== undefined || search.minRating !== undefined || search.minScore !== undefined;

  const selectedOffer = selected ? allOffers.find((o) => o.corp.id === selected) : null;
  const isAwarded = Boolean(awarded);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3 rotate-180" /> חזרה ללוח הבקרה
        </Link>

        {/* Header */}
        <div className="mt-6 rounded-3xl border border-border/60 bg-card p-6 shadow-card md:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">#{req.id}</span>
            {isAwarded ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                <CheckCircle2 className="h-3 w-3" /> ספק נבחר
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> פעילה
              </span>
            )}
            <span className="text-xs text-muted-foreground">· פורסם {req.postedAt}</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
            {req.count} {req.role} · {req.location}
          </h1>
          {isAwarded && awarded && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-primary text-sm font-bold text-primary-foreground">
                  {(getCorporation(awarded.corporationId)?.name ?? "?")[0]}
                </div>
                <div className="text-sm">
                  <div className="font-bold">{getCorporation(awarded.corporationId)?.name}</div>
                  <div className="text-xs text-muted-foreground">
                    אושר ב-{awarded.selectedAt} · ₪{awarded.pricePerHour}/שעה · סה״כ ₪{awarded.totalEstimate.toLocaleString()}
                  </div>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/dashboard" search={{ tab: "history" }}>צפה בהיסטוריה</Link>
              </Button>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" /> {req.location}</span>
            <span className="inline-flex items-center gap-2"><Calendar className="h-4 w-4" /> התחלה {req.startDate}</span>
            <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" /> {req.duration}</span>
            {req.budget && <span className="inline-flex items-center gap-2"><Briefcase className="h-4 w-4" /> תקציב: {req.budget}</span>}
          </div>
        </div>

        {/* Comparison stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={TrendingDown} label="הצעה נמוכה" value={`₪${lowest}`} accent />
          <StatCard icon={Briefcase} label="ממוצע" value={`₪${avg}`} />
          <StatCard icon={Award} label="גבוהה ביותר" value={`₪${highest}`} />
          <StatCard icon={Zap} label="תגובה מהירה" value={`${fastestResponse}ש׳`} />
        </div>

        {/* Toolbar */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-3 md:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border/60 bg-secondary/40 p-1">
              <ToolbarBtn active={search.view === "cards"} onClick={() => setSearch({ view: "cards" })}>
                <LayoutGrid className="h-4 w-4" /> כרטיסים
              </ToolbarBtn>
              <ToolbarBtn active={search.view === "table"} onClick={() => setSearch({ view: "table" })}>
                <TableIcon className="h-4 w-4" /> טבלה
              </ToolbarBtn>
            </div>
            <div className="hidden h-6 w-px bg-border md:block" />
            <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/40 px-3 py-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={search.sort}
                onChange={(e) => setSearch({ sort: e.target.value as SortKey })}
                className="bg-transparent text-xs font-semibold focus:outline-none"
              >
                <option value="score">ציון כולל מותאם</option>
                <option value="price">מחיר (מהזול)</option>
                <option value="rating">דירוג (מהגבוה)</option>
                <option value="availability">זמינות (הקדם ביותר)</option>
                <option value="response">זמן תגובה (המהיר)</option>
                <option value="warranty">אחריות (הארוכה)</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span className="font-semibold">{sorted.length}</span> מתוך {allOffers.length} הצעות
            {filtersActive && (
              <button
                onClick={() => setSearch({ verifiedOnly: false, insuredOnly: false, fullCrewOnly: false, maxPrice: undefined, minRating: undefined, minScore: undefined })}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground hover:bg-muted/70"
              >
                נקה סינון <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-4">
          {/* Filters sidebar */}
          <aside className="lg:col-span-1">
            <div className="space-y-4 lg:sticky lg:top-20">
              <WeightsPanel weights={weights} onChange={setWeights} />
              <div className="rounded-2xl border border-border/60 bg-card p-5">
                <h3 className="text-sm font-bold">סינון</h3>
                <div className="mt-4 space-y-4">
                  <FilterToggle
                    label="תאגידים מאומתים בלבד"
                    icon={ShieldCheck}
                    checked={search.verifiedOnly}
                    onChange={(v) => setSearch({ verifiedOnly: v })}
                  />
                  <FilterToggle
                    label="עם ביטוח מלא"
                    icon={ShieldCheck}
                    checked={search.insuredOnly}
                    onChange={(v) => setSearch({ insuredOnly: v })}
                  />
                  <FilterToggle
                    label={`צוות מלא (${req.count} עובדים)`}
                    icon={Users}
                    checked={search.fullCrewOnly}
                    onChange={(v) => setSearch({ fullCrewOnly: v })}
                  />
                  <div>
                    <Label className="mb-2 block text-xs">מחיר מקסימלי לשעה (₪)</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="ללא הגבלה"
                      value={search.maxPrice ?? ""}
                      onChange={(e) =>
                        setSearch({ maxPrice: e.target.value ? Number(e.target.value) : undefined })
                      }
                      className="h-10"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block text-xs">דירוג מינימלי</Label>
                    <div className="flex gap-1">
                      {[0, 4, 4.5, 4.8].map((r) => (
                        <button
                          key={r}
                          onClick={() => setSearch({ minRating: r === 0 ? undefined : r })}
                          className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                            (search.minRating ?? 0) === r
                              ? "border-primary bg-primary/15 text-foreground"
                              : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {r === 0 ? "הכל" : `${r}+`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block text-xs">ציון כולל מינימלי</Label>
                    <div className="flex gap-1">
                      {[0, 60, 75, 90].map((s) => (
                        <button
                          key={s}
                          onClick={() => setSearch({ minScore: s === 0 ? undefined : s })}
                          className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                            (search.minScore ?? 0) === s
                              ? "border-primary bg-primary/15 text-foreground"
                              : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {s === 0 ? "הכל" : `${s}+`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {selectedOffer && (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <div className="text-sm font-bold">ספק נבחר</div>
                  </div>
                  <div className="mt-3 text-base font-bold">{selectedOffer.corp.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    ₪{selectedOffer.pricePerHour}/שעה · {selectedOffer.startDate}
                  </div>
                  <Button
                    onClick={() => setConfirmOpen(true)}
                    className="mt-4 w-full bg-gradient-primary text-primary-foreground shadow-elegant"
                  >
                    אשר בחירה ויצירת קשר
                  </Button>
                  <button onClick={() => setSelected(null)} className="mt-2 w-full text-center text-[11px] text-muted-foreground hover:text-foreground">
                    בטל בחירה
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* Results */}
          <div className="lg:col-span-3">
            {sorted.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
                <Filter className="mx-auto h-8 w-8 text-muted-foreground" />
                <h3 className="mt-3 text-lg font-bold">אין הצעות תואמות לסינון</h3>
                <p className="mt-1 text-sm text-muted-foreground">נסה להרחיב את הסינון או לאפס.</p>
              </div>
            )}

            {search.view === "cards" && sorted.length > 0 && (
              <div className="space-y-4">
                {sorted.map((o) => (
                  <OfferCard
                    key={o.corp.id}
                    offer={o}
                    request={req}
                    selected={selected === o.corp.id}
                    isCheapest={o.pricePerHour === lowest}
                    avg={avg}
                    onSelect={() => setSelected(o.corp.id)}
                    whatsappHref={buildWhatsAppUrl(o.corp.phone, o.corp.name, reqForWhatsapp)}
                  />
                ))}
              </div>
            )}

            {search.view === "table" && sorted.length > 0 && (
              <OffersTable
                offers={sorted}
                lowest={lowest}
                fastestResponse={fastestResponse}
                request={req}
                selected={selected}
                onSelect={setSelected}
                reqForWhatsapp={reqForWhatsapp}
              />
            )}
          </div>
        </div>
      </main>

      {confirmOpen && selectedOffer && (
        <ConfirmDialog
          offer={selectedOffer}
          request={req}
          onClose={() => setConfirmOpen(false)}
          whatsappHref={buildWhatsAppUrl(selectedOffer.corp.phone, selectedOffer.corp.name, reqForWhatsapp)}
        />
      )}

      <SiteFooter />
    </div>
  );
}

/* ---------- helpers ---------- */

function sortOffers(offers: EnrichedOffer[], key: SortKey): EnrichedOffer[] {
  const arr = [...offers];
  const dateVal = (s: string) => {
    const m = s.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 999;
  };
  switch (key) {
    case "price": return arr.sort((a, b) => a.pricePerHour - b.pricePerHour);
    case "rating": return arr.sort((a, b) => b.corp.rating - a.corp.rating);
    case "availability": return arr.sort((a, b) => dateVal(a.startDate) - dateVal(b.startDate));
    case "response": return arr.sort((a, b) => a.responseTimeHours - b.responseTimeHours);
    case "warranty": return arr.sort((a, b) => b.warrantyDays - a.warrantyDays);
  }
}

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card"}`}>
      <div className={`grid h-9 w-9 place-items-center rounded-lg ${accent ? "bg-gradient-primary text-primary-foreground" : "bg-primary/15 text-primary"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-xl font-extrabold md:text-2xl">{value}</div>
      <div className="text-[11px] text-muted-foreground md:text-xs">{label}</div>
    </div>
  );
}

function ToolbarBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? "bg-gradient-primary text-primary-foreground shadow-elegant" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function FilterToggle({ label, icon: Icon, checked, onChange }: { label: string; icon: React.ComponentType<{ className?: string }>; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2">
      <span className="inline-flex items-center gap-2 text-xs font-medium">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function OfferCard({
  offer: o, request, selected, isCheapest, avg, onSelect, whatsappHref,
}: {
  offer: EnrichedOffer; request: WorkforceRequest; selected: boolean;
  isCheapest: boolean; avg: number; onSelect: () => void; whatsappHref: string;
}) {
  const fullCrew = o.availableWorkers >= request.count;
  return (
    <div
      className={`relative rounded-2xl border p-5 transition-all md:p-6 ${
        selected ? "border-primary bg-primary/5 shadow-elegant" : "border-border/60 bg-card hover:border-primary/40"
      }`}
    >
      {isCheapest && (
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
            </div>
          </div>
        </div>
        <div className="text-left">
          <div className="text-2xl font-extrabold">₪{o.pricePerHour}</div>
          <div className="text-[10px] text-muted-foreground">לשעת עובד</div>
          {o.pricePerHour < avg && (
            <div className="mt-1 text-[10px] font-semibold text-emerald-400">
              -{Math.round(((avg - o.pricePerHour) / avg) * 100)}% מהממוצע
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/60 pt-4 sm:grid-cols-4">
        <Spec icon={Calendar} label="התחלה" value={o.startDate} />
        <Spec icon={Users} label="עובדים" value={`${o.availableWorkers}/${request.count}`} good={fullCrew} bad={!fullCrew} />
        <Spec icon={Zap} label="תגובה" value={`${o.responseTimeHours}ש׳`} />
        <Spec icon={ShieldCheck} label="ביטוח" value={o.insurance ? "כן" : "לא"} good={o.insurance} bad={!o.insurance} />
      </div>

      {o.note && (
        <p className="mt-4 rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground">״{o.note}״</p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
        <div className="text-[11px] text-muted-foreground">אחריות {o.warrantyDays} ימים</div>
        <div className="flex gap-2">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-[#25D366] px-3 text-xs font-bold text-white transition-transform hover:scale-[1.02]"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          <Button asChild variant="outline" size="sm">
            <Link to="/corporations/$id" params={{ id: o.corp.id }}>פרופיל</Link>
          </Button>
          <Button
            size="sm"
            onClick={onSelect}
            className={selected ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-gradient-primary text-primary-foreground"}
          >
            {selected ? <><CheckCircle2 className="ml-1 h-4 w-4" /> נבחר</> : "בחר ספק"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Spec({ icon: Icon, label, value, good, bad }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; good?: boolean; bad?: boolean }) {
  return (
    <div className="rounded-xl bg-secondary/40 px-3 py-2">
      <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={`mt-0.5 text-sm font-bold ${good ? "text-emerald-400" : ""} ${bad ? "text-amber-400" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function OffersTable({
  offers, lowest, fastestResponse, request, selected, onSelect, reqForWhatsapp,
}: {
  offers: EnrichedOffer[]; lowest: number; fastestResponse: number;
  request: WorkforceRequest; selected: string | null;
  onSelect: (id: string) => void;
  reqForWhatsapp: { id: string; role: string; count: number; location: string; duration: string; startDate: string };
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-secondary/60 text-right text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-semibold">תאגיד</th>
            <th className="px-4 py-3 font-semibold">דירוג</th>
            <th className="px-4 py-3 font-semibold">מחיר/שעה</th>
            <th className="px-4 py-3 font-semibold">התחלה</th>
            <th className="px-4 py-3 font-semibold">צוות</th>
            <th className="px-4 py-3 font-semibold">תגובה</th>
            <th className="px-4 py-3 font-semibold">ביטוח</th>
            <th className="px-4 py-3 font-semibold">אחריות</th>
            <th className="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          {offers.map((o) => {
            const isSel = selected === o.corp.id;
            const fullCrew = o.availableWorkers >= request.count;
            return (
              <tr
                key={o.corp.id}
                className={`border-t border-border/60 transition-colors ${isSel ? "bg-primary/5" : "hover:bg-secondary/40"}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-primary text-xs font-bold text-primary-foreground">
                      {o.corp.name[0]}
                    </div>
                    <div className="min-w-0">
                      <Link to="/corporations/$id" params={{ id: o.corp.id }} className="flex items-center gap-1 font-semibold hover:underline">
                        <span className="truncate">{o.corp.name}</span>
                        {o.corp.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}
                      </Link>
                      <div className="text-[10px] text-muted-foreground">{o.corp.regions}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs">
                    <Star className="h-3 w-3 fill-primary text-primary" /> {o.corp.rating}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className={`text-base font-extrabold ${o.pricePerHour === lowest ? "text-primary" : ""}`}>
                    ₪{o.pricePerHour}
                  </div>
                  {o.pricePerHour === lowest && <div className="text-[9px] font-bold text-primary">הכי זול</div>}
                </td>
                <td className="px-4 py-3 text-xs">{o.startDate}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold ${fullCrew ? "text-emerald-400" : "text-amber-400"}`}>
                    {o.availableWorkers}/{request.count}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold ${o.responseTimeHours === fastestResponse ? "text-emerald-400" : ""}`}>
                    {o.responseTimeHours}ש׳
                  </span>
                </td>
                <td className="px-4 py-3">
                  {o.insurance ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <X className="h-4 w-4 text-amber-400" />
                  )}
                </td>
                <td className="px-4 py-3 text-xs">{o.warrantyDays} ימים</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <a
                      href={buildWhatsAppUrl(o.corp.phone, o.corp.name, reqForWhatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid h-8 w-8 place-items-center rounded-md bg-[#25D366] text-white"
                      title="WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                    <Button
                      size="sm"
                      onClick={() => onSelect(o.corp.id)}
                      className={isSel ? "h-8 bg-emerald-500 text-white hover:bg-emerald-600" : "h-8 bg-gradient-primary text-primary-foreground"}
                    >
                      {isSel ? <CheckCircle2 className="h-4 w-4" /> : "בחר"}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ConfirmDialog({
  offer, request, onClose, whatsappHref,
}: {
  offer: EnrichedOffer; request: WorkforceRequest; onClose: () => void; whatsappHref: string;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const handleConfirm = () => {
    addSelection({
      requestId: request.id,
      requestTitle: `${request.count} ${request.role} · ${request.location}`,
      corporationId: offer.corp.id,
      corporationName: offer.corp.name,
      pricePerHour: offer.pricePerHour,
      count: request.count,
      startDate: offer.startDate,
      duration: request.duration,
    });
    setConfirmed(true);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-elegant md:p-8" onClick={(e) => e.stopPropagation()}>
        {!confirmed ? (
          <>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-2xl font-extrabold">אישור בחירת ספק</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              לאחר אישור, הבקשה תיסגר להצעות נוספות והתאגיד יקבל הודעה לחתימה על הסכם דיגיטלי.
            </p>
            <div className="mt-5 rounded-xl border border-border/60 bg-secondary/40 p-4">
              <div className="flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-primary text-sm font-bold text-primary-foreground">{offer.corp.name[0]}</div>
                <div>
                  <div className="text-sm font-bold">{offer.corp.name}</div>
                  <div className="text-xs text-muted-foreground">₪{offer.pricePerHour}/שעה · {request.count} עובדים · {request.duration}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div>סה״כ הערכה: <span className="font-bold text-foreground">₪{(offer.pricePerHour * request.count * 8 * 22).toLocaleString()}</span> לחודש (8 שעות × 22 ימים)</div>
                <div>התחלה: <span className="font-bold text-foreground">{offer.startDate}</span></div>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>ביטול</Button>
              <Button className="flex-1 bg-gradient-primary text-primary-foreground" onClick={handleConfirm}>
                אשר ובחר
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="mt-4 text-2xl font-extrabold">הספק נבחר!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {offer.corp.name} קיבלו הודעה. תוכל ליצור קשר ישיר ב-WhatsApp לתיאום פרטים אחרונים.
            </p>
            <div className="mt-6 flex gap-2">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-[#25D366] text-sm font-bold text-white"
              >
                <MessageCircle className="h-4 w-4" /> פתח WhatsApp
              </a>
              <Button asChild variant="outline" className="flex-1">
                <Link to="/dashboard">לוח בקרה</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  ArrowLeft, MapPin, Calendar, Clock, Briefcase, BadgeCheck, Star,
  CheckCircle2, MessageCircle, TrendingDown, ShieldCheck, LayoutGrid,
  Table as TableIcon, Filter, ArrowUpDown, X, Users, Zap, Award, SlidersHorizontal, RotateCcw,
  ShieldAlert, Lock, FileSignature, Coins,
  Download, MessageSquare, Send, EyeOff, PhoneForwarded,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SiteNav } from "@/components/site-nav";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SiteFooter } from "@/components/site-footer";
import {
  getRequest, getCorporation,
  type WorkforceRequest, type Offer, type Corporation,
} from "@/lib/mock-data";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { addSelection, useSelectionForRequest } from "@/lib/selections-store";
import {
  PLATFORM_FEE_PER_HOUR, HOURS_PER_MONTH,
  totalCorporationPays, feePercent, commitmentFeeRevenue, circumventionPenalty,
  CIRCUMVENTION_PENALTY_MONTHS,
} from "@/lib/commission-config";
import { exportComparisonPdf } from "@/lib/export-pdf";
import { maskedCorpName, maskedInitial, maskedRegions } from "@/lib/anonymize";
import { useThread, sendMessage } from "@/lib/chat-store";

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
type ScoredOffer = EnrichedOffer & { score: number; breakdown: Record<keyof Weights, number> };

function RequestPage() {
  const { req } = Route.useLoaderData() as { req: WorkforceRequest };
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const awarded = useSelectionForRequest(req.id);
  const [selected, setSelected] = useState<string | null>(awarded?.corporationId ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [chatOpenFor, setChatOpenFor] = useState<string | null>(null);

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

  const filtersPane = (
    <div className="space-y-4">
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
              inputMode="numeric"
              min={0}
              placeholder="ללא הגבלה"
              value={search.maxPrice ?? ""}
              onChange={(e) =>
                setSearch({ maxPrice: e.target.value ? Number(e.target.value) : undefined })
              }
              className="h-11"
            />
          </div>
          <div>
            <Label className="mb-2 block text-xs">דירוג מינימלי</Label>
            <div className="flex gap-1">
              {[0, 4, 4.5, 4.8].map((r) => (
                <button
                  key={r}
                  onClick={() => setSearch({ minRating: r === 0 ? undefined : r })}
                  className={`flex-1 rounded-md border px-2 py-2 text-[11px] font-semibold transition-colors ${
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
                  className={`flex-1 rounded-md border px-2 py-2 text-[11px] font-semibold transition-colors ${
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
    </div>
  );

  const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: "score", label: "ציון מותאם" },
    { value: "price", label: "מחיר" },
    { value: "rating", label: "דירוג" },
    { value: "availability", label: "זמינות" },
    { value: "response", label: "תגובה" },
    { value: "warranty", label: "אחריות" },
  ];

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
          {req.items && req.items.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {req.items.map((it) => (
                <div key={it.id} className="rounded-xl border border-border/60 bg-secondary/40 px-3 py-2 text-xs">
                  <span className="font-bold text-foreground">{it.count} ×</span> {it.role} · <span className="text-primary font-semibold">{it.nationality}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" /> {req.location}</span>
            <span className="inline-flex items-center gap-2"><Calendar className="h-4 w-4" /> התחלה {req.startDate}</span>
            <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" /> {req.duration}</span>
            {req.commitmentMonths && (
              <span className="inline-flex items-center gap-2"><Lock className="h-4 w-4" /> התחייבות {req.commitmentMonths} חודשים</span>
            )}
            {req.budget && <span className="inline-flex items-center gap-2"><Briefcase className="h-4 w-4" /> תקציב: {req.budget}</span>}
          </div>
        </div>

        {/* Non-circumvention banner */}
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="text-xs text-muted-foreground">
            <span className="font-bold text-foreground">התקשרות מוגנת:</span> כל הצעות המחיר, הצ׳אטים והבחירה מתועדים בפלטפורמה.
            עקיפה (התקשרות ישירה מחוץ למערכת לאחר חשיפת ספק דרך BuildForce) מהווה הפרת תנאי שימוש למשך {req.commitmentMonths ?? 6} חודשים.
            פרטי קשר מלאים נחשפים רק לאחר <span className="font-semibold text-foreground">אישור בחירת ספק</span>.
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
        <div className="sticky top-14 z-30 -mx-4 mt-8 border-y border-border/60 bg-background/85 px-4 py-3 backdrop-blur md:static md:top-auto md:z-auto md:mx-0 md:rounded-2xl md:border md:bg-card md:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-border/60 bg-secondary/40 p-1">
                <ToolbarBtn active={search.view === "cards"} onClick={() => setSearch({ view: "cards" })}>
                  <LayoutGrid className="h-4 w-4" /> <span className="hidden sm:inline">כרטיסים</span>
                </ToolbarBtn>
                <ToolbarBtn active={search.view === "table"} onClick={() => setSearch({ view: "table" })}>
                  <TableIcon className="h-4 w-4" /> <span className="hidden sm:inline">טבלה</span>
                </ToolbarBtn>
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <button className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs font-semibold lg:hidden">
                    <SlidersHorizontal className="h-4 w-4" />
                    סינון
                    {filtersActive && <span className="grid h-4 w-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">!</span>}
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>סינון ומשקלות</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">{filtersPane}</div>
                </SheetContent>
              </Sheet>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Filter className="hidden h-3.5 w-3.5 sm:inline" />
              <span><span className="font-bold text-foreground">{sorted.length}</span>/{allOffers.length}</span>
              <button
                onClick={() => exportComparisonPdf(req, sorted)}
                disabled={sorted.length === 0}
                className="inline-flex items-center gap-1 rounded-md bg-gradient-primary px-2.5 py-1.5 text-[11px] font-bold text-primary-foreground shadow-elegant disabled:opacity-50"
                title="ייצא PDF"
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
            </div>
          </div>
          <div className="-mx-1 mt-3 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSearch({ sort: opt.value })}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  search.sort === opt.value
                    ? "border-primary bg-gradient-primary text-primary-foreground shadow-elegant"
                    : "border-border/60 bg-secondary/40 text-muted-foreground hover:border-primary/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
            {filtersActive && (
              <button
                onClick={() => setSearch({ verifiedOnly: false, insuredOnly: false, fullCrewOnly: false, maxPrice: undefined, minRating: undefined, minScore: undefined })}
                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1.5 text-[11px] font-bold text-foreground hover:bg-muted/70"
              >
                נקה <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-4">
          {/* Filters sidebar */}
          <aside className="hidden lg:col-span-1 lg:block">
            <div className="space-y-4 lg:sticky lg:top-20">
              {filtersPane}

              {selectedOffer && (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <div className="text-sm font-bold">ספק נבחר</div>
                  </div>
                  <div className="mt-3 text-base font-bold">
                    {isAwarded && awarded?.corporationId === selectedOffer.corp.id
                      ? selectedOffer.corp.name
                      : maskedCorpName(selectedOffer.corp.id)}
                  </div>
                  {!isAwarded && (
                    <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <EyeOff className="h-3 w-3" /> זהות נחשפת לאחר חתימת חוזה
                    </div>
                  )}
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
                    contactUnlocked={isAwarded && awarded?.corporationId === o.corp.id}
                    revealed={isAwarded && awarded?.corporationId === o.corp.id}
                    onOpenChat={() => setChatOpenFor(o.corp.id)}
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
                awardedId={awarded?.corporationId ?? null}
                onOpenChat={(id) => setChatOpenFor(id)}
              />
            )}
            {selectedOffer && !isAwarded && <div className="h-20 lg:hidden" aria-hidden />}
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

      {/* Mobile sticky action bar — appears when a provider is selected */}
      {selectedOffer && !isAwarded && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 shadow-elegant backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-primary text-sm font-bold text-primary-foreground">
              {maskedInitial(selectedOffer.corp.id)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{maskedCorpName(selectedOffer.corp.id)}</div>
              <div className="text-[11px] text-muted-foreground">
                ₪{selectedOffer.pricePerHour}/שעה · {selectedOffer.startDate}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setConfirmOpen(true)}
              className="bg-gradient-primary text-primary-foreground"
            >
              אשר בחירה
            </Button>
          </div>
        </div>
      )}

      {chatOpenFor && (
        <AnonChatDialog
          requestId={req.id}
          corpId={chatOpenFor}
          corpDisplay={
            isAwarded && awarded?.corporationId === chatOpenFor
              ? (allOffers.find((o) => o.corp.id === chatOpenFor)?.corp.name ?? maskedCorpName(chatOpenFor))
              : maskedCorpName(chatOpenFor)
          }
          onClose={() => setChatOpenFor(null)}
        />
      )}

      <SiteFooter />
    </div>
  );
}

/* ---------- helpers ---------- */

function sortOffers(offers: ScoredOffer[], key: SortKey): ScoredOffer[] {
  const arr = [...offers];
  const dateVal = (s: string) => {
    const m = s.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 999;
  };
  switch (key) {
    case "score": return arr.sort((a, b) => b.score - a.score);
    case "price": return arr.sort((a, b) => a.pricePerHour - b.pricePerHour);
    case "rating": return arr.sort((a, b) => b.corp.rating - a.corp.rating);
    case "availability": return arr.sort((a, b) => dateVal(a.startDate) - dateVal(b.startDate));
    case "response": return arr.sort((a, b) => a.responseTimeHours - b.responseTimeHours);
    case "warranty": return arr.sort((a, b) => b.warrantyDays - a.warrantyDays);
    default: return arr;
  }
}

function computeScores(offers: EnrichedOffer[], weights: Weights): ScoredOffer[] {
  if (offers.length === 0) return [];
  const dateVal = (s: string) => {
    const m = s.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 999;
  };
  const norm = (val: number, min: number, max: number, lowerIsBetter: boolean) => {
    if (max === min) return 1;
    const t = (val - min) / (max - min);
    return lowerIsBetter ? 1 - t : t;
  };
  const prices = offers.map((o) => o.pricePerHour);
  const ratings = offers.map((o) => o.corp.rating);
  const dates = offers.map((o) => dateVal(o.startDate));
  const responses = offers.map((o) => o.responseTimeHours);
  const warranties = offers.map((o) => o.warrantyDays);

  const totalW = Math.max(1, weights.price + weights.rating + weights.availability + weights.response + weights.warranty);

  return offers.map((o) => {
    const breakdown: Record<keyof Weights, number> = {
      price: norm(o.pricePerHour, Math.min(...prices), Math.max(...prices), true),
      rating: norm(o.corp.rating, Math.min(...ratings), Math.max(...ratings), false),
      availability: norm(dateVal(o.startDate), Math.min(...dates), Math.max(...dates), true),
      response: norm(o.responseTimeHours, Math.min(...responses), Math.max(...responses), true),
      warranty: norm(o.warrantyDays, Math.min(...warranties), Math.max(...warranties), false),
    };
    const weighted =
      breakdown.price * weights.price +
      breakdown.rating * weights.rating +
      breakdown.availability * weights.availability +
      breakdown.response * weights.response +
      breakdown.warranty * weights.warranty;
    return { ...o, score: Math.round((weighted / totalW) * 100), breakdown };
  });
}

function WeightsPanel({ weights, onChange }: { weights: Weights; onChange: (w: Weights) => void }) {
  const total = weights.price + weights.rating + weights.availability + weights.response + weights.warranty;
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">משקלות לציון כולל</h3>
        </div>
        <button
          onClick={() => onChange(DEFAULT_WEIGHTS)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" /> איפוס
        </button>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        קבע מה חשוב לך — הציון מתעדכן בזמן אמת. סה״כ: {total}
      </p>
      <div className="mt-4 space-y-3">
        {WEIGHT_META.map((m) => (
          <div key={m.key}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold">{m.label}</span>
              <span className="text-muted-foreground">{m.hint} · <span className="font-bold text-foreground">{weights[m.key]}</span></span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={5}
              value={weights[m.key]}
              onChange={(e) => onChange({ ...weights, [m.key]: Number(e.target.value) })}
              className="mt-1 w-full accent-primary"
              aria-label={`משקל ${m.label}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" }) {
  const tone =
    score >= 80 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
    score >= 60 ? "bg-primary/15 text-primary border-primary/30" :
    "bg-amber-500/15 text-amber-400 border-amber-500/30";
  const sz = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-extrabold ${tone} ${sz}`}>
      <Award className="h-3 w-3" /> {score}
    </span>
  );
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
  offer: o, request, selected, isCheapest, avg, onSelect, whatsappHref, contactUnlocked, revealed, onOpenChat,
}: {
  offer: ScoredOffer; request: WorkforceRequest; selected: boolean;
  isCheapest: boolean; avg: number; onSelect: () => void; whatsappHref: string;
  contactUnlocked: boolean; revealed: boolean; onOpenChat: () => void;
}) {
  const fullCrew = o.availableWorkers >= request.count;
  const displayName = revealed ? o.corp.name : maskedCorpName(o.corp.id);
  const displayInitial = revealed ? o.corp.name[0] : maskedInitial(o.corp.id);
  const displayRegions = revealed ? o.corp.regions : maskedRegions(o.corp.regions);
  return (
    <div
      className={`relative rounded-2xl border p-5 transition-all md:p-6 ${
        selected ? "border-primary bg-primary/5 shadow-elegant" : "border-border/60 bg-card hover:border-primary/40"
      }`}
    >
      <div className="absolute -top-3 right-5 flex items-center gap-2">
        <ScoreBadge score={o.score} size="sm" />
        {isCheapest && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-bold text-primary-foreground shadow-elegant">
            <TrendingDown className="h-3 w-3" /> ההצעה הזולה ביותר
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-primary text-lg font-extrabold text-primary-foreground shadow-elegant">
            {displayInitial}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {revealed ? (
                <Link to="/corporations/$id" params={{ id: o.corp.id }} className="text-base font-bold hover:underline">
                  {o.corp.name}
                </Link>
              ) : (
                <span className="text-base font-bold">{displayName}</span>
              )}
              {o.corp.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
              {!revealed && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                  <EyeOff className="h-2.5 w-2.5" /> אנונימי
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-primary text-primary" /> {o.corp.rating} ({o.corp.reviews})</span>
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {displayRegions}</span>
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
          <div className="mt-2 inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            <Coins className="h-3 w-3 text-primary" />
            +₪{PLATFORM_FEE_PER_HOUR} עמלה · סה״כ ₪{totalCorporationPays(o.pricePerHour)}
          </div>
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
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>אחריות {o.warrantyDays} ימים</span>
          <span className="hidden h-3 w-px bg-border md:block" />
          <span className="hidden md:inline">ציון כולל: <span className="font-bold text-foreground">{o.score}/100</span></span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenChat}
            className="gap-1.5"
            title="צ׳אט אנונימי דרך BuildForce — שמות, טלפונים ולינקים נחסמים אוטומטית"
          >
            <MessageSquare className="h-4 w-4" /> צ׳אט מאובטח
          </Button>
          {contactUnlocked ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[#25D366] px-3 text-xs font-bold text-white transition-transform hover:scale-[1.02]"
            >
              <PhoneForwarded className="h-4 w-4" /> WhatsApp דרך BuildForce
            </a>
          ) : (
            <span
              title="פרטי קשר ייחשפו לאחר אישור בחירת ספק"
              className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-xs font-bold text-muted-foreground"
            >
              <Lock className="h-3.5 w-3.5" /> נחשף לאחר בחירה
            </span>
          )}
          {revealed && (
            <Button asChild variant="outline" size="sm">
              <Link to="/corporations/$id" params={{ id: o.corp.id }}>פרופיל</Link>
            </Button>
          )}
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
  offers, lowest, fastestResponse, request, selected, onSelect, reqForWhatsapp, awardedId, onOpenChat,
}: {
  offers: ScoredOffer[]; lowest: number; fastestResponse: number;
  request: WorkforceRequest; selected: string | null;
  onSelect: (id: string) => void;
  reqForWhatsapp: { id: string; role: string; count: number; location: string; duration: string; startDate: string };
  awardedId: string | null;
  onOpenChat: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="bg-secondary/60 text-right text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-semibold">ציון</th>
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
            const revealed = awardedId === o.corp.id;
            const displayName = revealed ? o.corp.name : maskedCorpName(o.corp.id);
            const displayInitial = revealed ? o.corp.name[0] : maskedInitial(o.corp.id);
            const displayRegions = revealed ? o.corp.regions : "מוסתר";
            return (
              <tr
                key={o.corp.id}
                className={`border-t border-border/60 transition-colors ${isSel ? "bg-primary/5" : "hover:bg-secondary/40"}`}
              >
                <td className="px-4 py-3">
                  <ScoreBadge score={o.score} size="sm" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-primary text-xs font-bold text-primary-foreground">
                      {displayInitial}
                    </div>
                    <div className="min-w-0">
                      {revealed ? (
                        <Link to="/corporations/$id" params={{ id: o.corp.id }} className="flex items-center gap-1 font-semibold hover:underline">
                          <span className="truncate">{displayName}</span>
                          {o.corp.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}
                        </Link>
                      ) : (
                        <span className="flex items-center gap-1 font-semibold">
                          <span className="truncate">{displayName}</span>
                          {o.corp.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}
                        </span>
                      )}
                      <div className="text-[10px] text-muted-foreground">{displayRegions}</div>
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
                    <button
                      onClick={() => onOpenChat(o.corp.id)}
                      title="צ׳אט אנונימי דרך BuildForce"
                      className="grid h-8 w-8 place-items-center rounded-md border border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                    {awardedId === o.corp.id ? (
                      <a
                        href={buildWhatsAppUrl(o.corp.phone, o.corp.name, reqForWhatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="grid h-8 w-8 place-items-center rounded-md bg-[#25D366] text-white"
                        title="WhatsApp דרך BuildForce"
                      >
                        <PhoneForwarded className="h-4 w-4" />
                      </a>
                    ) : (
                      <span
                        title="פרטי קשר ייחשפו לאחר אישור בחירת ספק"
                        className="grid h-8 w-8 place-items-center rounded-md border border-border bg-muted/40 text-muted-foreground"
                      >
                        <Lock className="h-3.5 w-3.5" />
                      </span>
                    )}
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
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [months, setMonths] = useState<number>(request.commitmentMonths ?? 6);

  const monthlyFee = request.count * HOURS_PER_MONTH * PLATFORM_FEE_PER_HOUR;
  const totalFee = commitmentFeeRevenue(request.count, months);
  const penalty = circumventionPenalty(request.count);
  const monthlyContractor = request.count * HOURS_PER_MONTH * offer.pricePerHour;
  const canSign = signature.trim().length >= 2 && agreed;

  const handleConfirm = () => {
    if (!canSign) return;
    addSelection({
      requestId: request.id,
      requestTitle: `${request.count} ${request.role} · ${request.location}`,
      corporationId: offer.corp.id,
      corporationName: offer.corp.name,
      pricePerHour: offer.pricePerHour,
      count: request.count,
      startDate: offer.startDate,
      duration: request.duration,
      commitmentMonths: months,
      contractSignedBy: signature.trim(),
    });
    setConfirmed(true);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background/70 p-4 backdrop-blur" onClick={onClose}>
      <div className="my-8 w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-elegant md:p-8" onClick={(e) => e.stopPropagation()}>
        {!confirmed ? (
          <>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
              <FileSignature className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-2xl font-extrabold">חוזה התקשרות דיגיטלי</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              אישור סופי + חתימה. לאחר חתימה: הבקשה נסגרת, פרטי קשר נחשפים, והתאגיד מתחייב לתעריף.
            </p>

            <div className="mt-5 rounded-xl border border-border/60 bg-secondary/40 p-4">
              <div className="flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-primary text-sm font-bold text-primary-foreground">{offer.corp.name[0]}</div>
                <div>
                  <div className="text-sm font-bold">{offer.corp.name}</div>
                  <div className="text-xs text-muted-foreground">בקשה #{request.id}</div>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <Row k="תעריף לקבלן" v={`₪${offer.pricePerHour}/שעה × ${request.count} עובדים`} />
                <Row k="עמלת פלטפורמה" v={`₪${PLATFORM_FEE_PER_HOUR}/שעה לעובד · ${feePercent(offer.pricePerHour).toFixed(1)}%`} accent />
                <Row k="התחלה" v={offer.startDate} />
              </div>
            </div>

            <div className="mt-4">
              <Label className="mb-2 block text-xs font-semibold">תקופת התחייבות</Label>
              <div className="flex flex-wrap gap-1">
                {[1, 3, 6, 12, 24].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMonths(m)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      months === m
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {m === 1 ? "חודש" : `${m} חודשים`}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-center text-[11px]">
              <div>
                <div className="text-muted-foreground">לקבלן/חודש</div>
                <div className="mt-0.5 text-sm font-extrabold">₪{monthlyContractor.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">עמלת פלטפורמה/חודש</div>
                <div className="mt-0.5 text-sm font-extrabold text-primary">₪{monthlyFee.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">סה״כ עמלה {months}ח׳</div>
                <div className="mt-0.5 text-sm font-extrabold">₪{totalFee.toLocaleString()}</div>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <span className="font-bold text-foreground">סעיף אי-עקיפה:</span> התקשרות ישירה מחוץ למערכת
                במהלך {months} חודשי ההתחייבות מהווה הפרת חוזה ותחויב בקנס מוסכם של{" "}
                <span className="font-bold text-foreground">₪{penalty.toLocaleString()}</span>{" "}
                ({CIRCUMVENTION_PENALTY_MONTHS} חודשי עמלה).
              </div>
            </div>

            <div className="mt-4">
              <Label className="mb-1 block text-xs font-semibold">חתימה דיגיטלית — שם מלא</Label>
              <Input
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="שם פרטי ושם משפחה"
                className="h-10"
                maxLength={80}
              />
            </div>
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span>
                אני מאשר את תנאי ההתקשרות, מסכים לעמלת פלטפורמה של ₪{PLATFORM_FEE_PER_HOUR} לשעה לעובד,
                ומתחייב לסעיף אי-עקיפה לכל אורך תקופת ההתחייבות.
              </span>
            </label>

            <div className="mt-6 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>ביטול</Button>
              <Button
                disabled={!canSign}
                className="flex-1 bg-gradient-primary text-primary-foreground disabled:opacity-50"
                onClick={handleConfirm}
              >
                <FileSignature className="ml-1 h-4 w-4" /> חתום ואשר
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="mt-4 text-2xl font-extrabold">החוזה נחתם!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {offer.corp.name} קיבלו הודעה. פרטי הקשר נחשפו — תוכל לתאם פרטים אחרונים ב-WhatsApp.
            </p>
            <div className="mt-4 rounded-xl border border-border/60 bg-secondary/40 p-3 text-[11px]">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> חתימה תועדה כראיה משפטית
              </div>
              <div className="mt-1 text-muted-foreground">
                חתום בשם <span className="font-semibold text-foreground">{signature || "—"}</span> · {new Date().toLocaleString("he-IL")}
                {typeof Intl !== "undefined" && (
                  <> · אזור זמן: <span className="font-mono">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span></>
                )}
                <div className="mt-1 truncate">
                  דפדפן: <span className="font-mono">{typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 80) : "—"}…</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-[11px] text-muted-foreground">
              <PhoneForwarded className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <span className="font-bold text-foreground">שיחות מנותבות דרך BuildForce:</span> כל שיחה ו-WhatsApp עובר דרך מספר וירטואלי של הפלטפורמה. כך אנחנו מתעדים, מאמתים ושומרים על ההתקשרות מוגנת.
              </div>
            </div>
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

function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className={`font-bold ${accent ? "text-primary" : "text-foreground"}`}>{v}</span>
    </div>
  );
}

/* ---------- Anonymous chat with auto-redaction ---------- */

function AnonChatDialog({
  requestId, corpId, corpDisplay, onClose,
}: {
  requestId: string; corpId: string; corpDisplay: string; onClose: () => void;
}) {
  const messages = useThread(requestId, corpId);
  const [draft, setDraft] = useState("");
  const [warning, setWarning] = useState<string[] | null>(null);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    const m = sendMessage(requestId, corpId, "customer", text);
    if (m.rawFlagged) setWarning(m.reasons); else setWarning(null);
    setDraft("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-0 backdrop-blur sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex h-[85vh] w-full max-w-md flex-col rounded-t-3xl border border-border bg-card shadow-elegant sm:h-[600px] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/60 p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-primary text-sm font-bold text-primary-foreground">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{corpDisplay}</div>
              <div className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-primary" /> צ׳אט מוצפן · נחסמים: טלפון/אימייל/קישור
              </div>
            </div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-6 text-center text-xs text-muted-foreground">
              עדיין אין הודעות.<br />
              שיתוף פרטי קשר ישירים אסור — המערכת תחסום אותם אוטומטית.
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.from === "customer"
                  ? "ms-auto bg-gradient-primary text-primary-foreground"
                  : "me-auto bg-secondary text-foreground"
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{m.text}</div>
              <div className={`mt-1 text-[9px] ${m.from === "customer" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {new Date(m.at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                {m.rawFlagged && <span className="ms-1">· נחסם: {m.reasons.join(", ")}</span>}
              </div>
            </div>
          ))}
        </div>

        {warning && (
          <div className="border-t border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[11px] text-amber-400">
            ⚠ ההודעה נשלחה אבל נחסמו ממנה: {warning.join(", ")}. שיתוף פרטי קשר נוגד את תנאי השימוש.
          </div>
        )}

        <div className="flex items-center gap-2 border-t border-border/60 p-3">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="הקלד הודעה (טלפונים/אימיילים יחסמו)…"
            maxLength={500}
            className="h-11"
          />
          <Button onClick={handleSend} disabled={!draft.trim()} className="bg-gradient-primary text-primary-foreground">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
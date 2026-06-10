import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MapPin,
  Calendar,
  Users,
  Briefcase,
  CheckCircle2,
  Trophy,
  Clock,
  ShieldCheck,
  Coins,
  X,
  Lock,
  AlertTriangle,
  Loader2,
  Medal,
  TrendingDown,
  Star,
  Gavel,
  BarChart2,
  Zap,
  Award,
  Phone,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/app-shell";
import { getJobRequestWithOffers, closeJobRequest } from "@/lib/job-requests.functions";
import { useAuth } from "@/hooks/use-auth";
import { maskedRequestId } from "@/lib/anonymize";
import { awardOffer } from "@/lib/job-offers.functions";

export const Route = createFileRoute("/my-requests/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `בקשה — BuildForce` },
      { name: "description", content: `ניהול בקשת עבודה ${params.id}` },
    ],
  }),
  component: MyRequestPage,
});

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  open: {
    label: "פתוחה למכרז",
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  awarded: {
    label: "נבחר זוכה",
    color: "bg-primary/15 text-primary border-primary/30",
    dot: "bg-primary",
  },
  closed: {
    label: "סגורה",
    color: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
  cancelled: {
    label: "בוטלה",
    color: "bg-destructive/15 text-destructive border-destructive/30",
    dot: "bg-destructive",
  },
};

function MyRequestPage() {
  const { id } = Route.useParams();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchData = useServerFn(getJobRequestWithOffers);
  const awardFn = useServerFn(awardOffer);
  const closeFn = useServerFn(closeJobRequest);
  const [actingId, setActingId] = useState<string | null>(null);
  const [confirmingAwardId, setConfirmingAwardId] = useState<string | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);

  // Redirect unauthenticated visitors to login instead of firing a request
  // that 401s and crashes the page.
  useEffect(() => {
    if (!loading && !session) {
      void navigate({ to: "/login", replace: true });
    }
  }, [loading, session, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["job-request", id],
    queryFn: () => fetchData({ data: { id } }),
    enabled: !!session,
  });

  const handleAward = async (offerId: string) => {
    setActingId(offerId);
    setConfirmingAwardId(null);
    try {
      await awardFn({ data: { offerId } });
      toast.success("הזוכה נבחר. נשלחו התראות לתאגידים.");
      qc.invalidateQueries({ queryKey: ["job-request", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה בבחירת זוכה");
    } finally {
      setActingId(null);
    }
  };

  const handleClose = async () => {
    setConfirmingClose(false);
    try {
      await closeFn({ data: { id } });
      toast.success("הבקשה נסגרה");
      qc.invalidateQueries({ queryKey: ["job-request", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה");
    }
  };

  if (isLoading) {
    return (
      <AppShell title="בקשה">
        <div className="space-y-5 animate-pulse">
          {/* Header skeleton */}
          <div className="enterprise-card overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="h-6 w-28 rounded-full bg-muted" />
              <div className="mt-4 h-9 w-56 rounded-lg bg-muted" />
              <div className="mt-2 h-4 w-36 rounded bg-muted" />
            </div>
            <div className="grid grid-cols-4 divide-x divide-x-reverse divide-border/40 border-t border-border/40">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4">
                  <div className="h-3 w-12 rounded bg-muted" />
                  <div className="mt-2 h-5 w-16 rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
          {/* Intel panel skeleton */}
          <div className="enterprise-card p-5">
            <div className="h-5 w-40 rounded bg-muted mb-4" />
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-muted" />
              ))}
            </div>
          </div>
          {/* Offer card skeletons */}
          {[...Array(3)].map((_, i) => (
            <div key={i} className="enterprise-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-11 w-11 rounded-full bg-muted" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-24 rounded bg-muted" />
                </div>
                <div className="h-8 w-20 rounded bg-muted" />
              </div>
              <div className="h-2 w-full rounded-full bg-muted mt-3" />
            </div>
          ))}
        </div>
      </AppShell>
    );
  }

  if (error || !data?.request) {
    return (
      <AppShell title="בקשה">
        <div className="enterprise-card p-10 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-xl font-bold">הבקשה לא נמצאה</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ייתכן שהבקשה נמחקה, הקישור שגוי, או שאין לך הרשאה לצפות בה.
          </p>
          <Button
            asChild
            className="mt-6 bg-gradient-primary text-primary-foreground shadow-elegant"
          >
            <Link to="/dashboard">חזרה ללוח הבקרה</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const { request, items, offers, isOwner } = data;
  const statusMeta = STATUS_META[request.status] ?? STATUS_META.open;
  const totalWorkers = items.reduce((s, it) => s + (it.count ?? 0), 0);
  const sortedOffers = [...offers].sort(
    (a, b) => Number(a.price_per_hour) - Number(b.price_per_hour),
  );
  const winningOffer = offers.find((o) => o.status === "awarded");

  // Competitive intelligence
  const prices = sortedOffers.map((o) => Number(o.price_per_hour));
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const avgPrice =
    prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const priceSpread = maxPrice - minPrice;

  // ── Savings Engine (מנוע החיסכון) — the core differentiator from the business
  // plan: translate the reverse auction into one number — how much the contractor
  // saves vs. the most EXPENSIVE offer, per-hour and per-month.
  const HOURS_PER_WORKER_MONTH = 176; // ~22 work days × 8h
  // Once awarded we measure against the winning price; while open, the best (lowest) offer.
  const chosenPrice = winningOffer ? Number(winningOffer.price_per_hour) : minPrice;
  const savingsPerHour = maxPrice > chosenPrice ? maxPrice - chosenPrice : 0;
  const monthlySavings =
    savingsPerHour > 0 ? Math.round(savingsPerHour * totalWorkers * HOURS_PER_WORKER_MONTH) : 0;

  // Deadline countdown
  const deadlineHours = (request as { deadline_at?: string }).deadline_at
    ? Math.round(
        (new Date((request as { deadline_at: string }).deadline_at).getTime() - Date.now()) /
          3600000,
      )
    : null;

  // Value score per offer
  const getValueScore = (price: number, workers: number, insurance: boolean) => {
    if (!minPrice) return 0;
    const raw = (100 / (price / minPrice)) * (workers / 10 + 1) * (insurance ? 1.1 : 1);
    return Math.min(100, Math.round(raw));
  };

  const closeAction =
    isOwner && request.status === "open" ? (
      confirmingClose ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">לסגור את הבקשה?</span>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleClose}
            className="h-7 px-2.5 text-xs"
          >
            אישור
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmingClose(false)}
            className="h-7 px-2.5 text-xs"
          >
            ביטול
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmingClose(true)}
          className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5"
        >
          <X className="h-4 w-4" /> סגור בקשה
        </Button>
      )
    ) : undefined;

  return (
    <AppShell title={`בקשה ${maskedRequestId(request.id)}`} action={closeAction}>
      <div className="space-y-6">
        {/* Request header */}
        <div className="enterprise-card overflow-hidden animate-fade-up">
          <div className="border-b border-border/40 bg-gradient-to-l from-primary/5 to-transparent p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${statusMeta.color}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                  {statusMeta.label}
                </div>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight md:text-3xl">
                  בקשת כוח אדם
                </h2>
                {deadlineHours !== null && deadlineHours > 0 && (
                  <div
                    className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${deadlineHours < 24 ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-amber-500/30 bg-amber-500/10 text-amber-400"}`}
                  >
                    <Clock className="h-3 w-3" />{" "}
                    {deadlineHours < 24
                      ? `נסגר בעוד ${deadlineHours} שעות!`
                      : `נסגר בעוד ${Math.round(deadlineHours / 24)} ימים`}
                  </div>
                )}
              </div>
              {offers.length > 0 && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3 text-center">
                  <div className="text-3xl font-extrabold text-primary">{offers.length}</div>
                  <div className="text-xs text-muted-foreground">הצעות</div>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-x-reverse divide-border/40 border-t border-border/40 md:grid-cols-4">
            {[
              { icon: MapPin, label: "מיקום", value: request.location },
              { icon: Calendar, label: "התחלה", value: request.start_date },
              { icon: Clock, label: "משך", value: request.duration },
              { icon: Users, label: "עובדים", value: String(totalWorkers) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="p-4">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Icon className="h-3 w-3" /> {label}
                </div>
                <div className="mt-1 text-sm font-bold">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="enterprise-card p-6 animate-fade-up delay-100">
            <div className="mb-4 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15">
                <Briefcase className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-bold">פרטי הבקשה</h3>
            </div>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/30 p-3"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-extrabold text-primary">
                    {it.count}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{it.role}</div>
                    <div className="text-xs text-muted-foreground">{it.nationality}</div>
                  </div>
                </div>
              ))}
            </div>
            {request.description && (
              <p className="mt-4 whitespace-pre-line rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
                {request.description}
              </p>
            )}
          </div>
        )}

        {/* Savings Engine — the core differentiator (business plan §6) */}
        {sortedOffers.length > 0 && (
          <div className="enterprise-card overflow-hidden animate-fade-up delay-100">
            <div className="flex items-center gap-2 border-b border-border/40 px-5 py-4 md:px-6">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15">
                <BarChart2 className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-bold">מנוע החיסכון</h3>
              <span className="text-xs text-muted-foreground">
                {offers.length} הצעות · ממוצע {avgPrice} ₪/שעה
              </span>
            </div>

            {/* Hero savings number — the emotional centerpiece */}
            {monthlySavings > 0 && (
              <div className="relative overflow-hidden border-b border-emerald-500/20 bg-gradient-to-br from-emerald-500/14 via-emerald-500/5 to-transparent px-5 py-7 md:px-8 md:py-9">
                <div className="pointer-events-none absolute -top-16 -end-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="relative flex flex-wrap items-end justify-between gap-6">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
                      <TrendingDown className="h-3.5 w-3.5" />
                      {winningOffer ? "החיסכון שהשגת" : "חיסכון חודשי מוערך"}
                    </div>
                    <div className="mt-3 text-5xl font-black leading-none tracking-tight text-emerald-400 md:text-6xl">
                      <span dir="ltr">₪{monthlySavings.toLocaleString()}</span>
                      <span className="mr-2 align-middle text-lg font-bold text-emerald-400/80">
                        / חודש
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-card/70 px-4 py-3 text-sm">
                    <div className="text-muted-foreground">
                      לעומת ההצעה היקרה ביותר (
                      <b className="text-foreground" dir="ltr">
                        {maxPrice} ₪
                      </b>
                      )
                    </div>
                    <div
                      className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground"
                      dir="ltr"
                    >
                      {savingsPerHour} ₪/שעה × {totalWorkers} עובדים × 176 ש׳
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-5 md:p-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                  <div className="mb-1 text-xs text-muted-foreground">מינימום</div>
                  <div className="text-lg font-extrabold text-emerald-400">{minPrice} ₪</div>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
                  <div className="mb-1 text-xs text-muted-foreground">ממוצע</div>
                  <div className="text-lg font-extrabold text-primary">{avgPrice} ₪</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-center">
                  <div className="mb-1 text-xs text-muted-foreground">מקסימום</div>
                  <div className="text-lg font-extrabold">{maxPrice} ₪</div>
                </div>
              </div>
              {priceSpread > 0 && (
                <div className="mt-4">
                  <div className="mb-1.5 flex flex-wrap justify-between gap-1 text-[11px] text-muted-foreground">
                    <span>
                      פיזור מחירים ({minPrice} – {maxPrice} ₪)
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-primary">
                      <TrendingDown className="h-3 w-3" /> חסכון פוטנציאלי: {maxPrice - minPrice}{" "}
                      ₪/שעה
                    </span>
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-l from-destructive/30 to-emerald-500/30" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Offers section */}
        <div className="animate-fade-up delay-200">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15">
                <Gavel className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-lg font-bold">הצעות שהתקבלו</h3>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold">
                {offers.length}
              </span>
            </div>
            {minPrice > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <TrendingDown className="h-3.5 w-3.5" /> מינימום:{" "}
                <span dir="ltr">{minPrice} ₪/שעה</span>
              </div>
            )}
          </div>

          {offers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon mx-auto">
                <Coins className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-lg font-bold">ממתינים להצעות</h4>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                {request.status === "open"
                  ? "תאגידים מאומתים יקבלו את הבקשה במייל ויגישו הצעות בקרוב."
                  : "לא התקבלו הצעות לפני סגירת הבקשה."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedOffers.map((o, idx) => {
                const isWinner = o.status === "awarded";
                const isRejected = o.status === "rejected" || o.status === "withdrawn";
                const priceNum = Number(o.price_per_hour);
                const savedVsMax = maxPrice > priceNum ? maxPrice - priceNum : 0;
                const reveal = o as {
                  corp_name?: string;
                  corp_phone?: string;
                  corp_email?: string;
                };
                const workersNum = Number(o.available_workers);
                const valueScore = getValueScore(priceNum, workersNum, o.insurance ?? false);
                const pricePosition =
                  priceSpread > 0 ? Math.round(((priceNum - minPrice) / priceSpread) * 100) : 0;
                const isConfirming = confirmingAwardId === o.id;

                return (
                  <div
                    key={o.id}
                    className={`enterprise-card overflow-hidden transition-all ${
                      isWinner
                        ? "border-primary/50 shadow-glow-sm"
                        : isRejected
                          ? "opacity-50"
                          : idx === 0
                            ? "border-emerald-500/30"
                            : ""
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Identity */}
                        <div className="flex items-center gap-3">
                          <div
                            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-extrabold ${
                              isWinner
                                ? "bg-gradient-primary text-primary-foreground shadow-glow-sm"
                                : idx === 0 && !isRejected
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : "bg-secondary text-foreground"
                            }`}
                          >
                            {isWinner ? (
                              <Trophy className="h-5 w-5" />
                            ) : idx === 0 && !isRejected ? (
                              <Medal className="h-5 w-5" />
                            ) : (
                              `#${idx + 1}`
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold">
                                {isWinner && reveal.corp_name ? reveal.corp_name : "תאגיד אנונימי"}
                              </span>
                              {savedVsMax > 0 && !isRejected && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                                  <TrendingDown className="h-2.5 w-2.5" /> זול ב-{savedVsMax}₪/שעה
                                  מהיקרה
                                </span>
                              )}
                              {idx === 0 && !isRejected && request.status === "open" && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                                  <Star className="h-2.5 w-2.5" /> הצעה זולה ביותר
                                </span>
                              )}
                              {isWinner && (
                                <Badge className="bg-primary text-primary-foreground text-[11px]">
                                  זוכה
                                </Badge>
                              )}
                              {o.status === "withdrawn" && (
                                <Badge variant="outline" className="text-[11px]">
                                  בוטלה
                                </Badge>
                              )}
                              {o.status === "rejected" && (
                                <Badge variant="outline" className="text-[11px]">
                                  לא נבחרה
                                </Badge>
                              )}
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {isOwner && request.status === "open" ? (
                                <span className="inline-flex items-center gap-1">
                                  <Lock className="h-3 w-3" /> הזהות נחשפת אחרי בחירה
                                </span>
                              ) : (
                                <span>
                                  התקבלה {new Date(o.created_at).toLocaleDateString("he-IL")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Price + Workers + Value Score */}
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="text-[11px] text-muted-foreground">מחיר לשעה</div>
                            <div
                              className={`text-2xl font-extrabold tracking-tight ${
                                isWinner
                                  ? "text-primary"
                                  : idx === 0
                                    ? "text-emerald-400"
                                    : "text-foreground"
                              }`}
                              dir="ltr"
                            >
                              {o.price_per_hour} ₪
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-muted-foreground">עובדים</div>
                            <div className="text-xl font-bold">{o.available_workers}</div>
                          </div>
                          {sortedOffers.length > 1 && (
                            <div className="text-center">
                              <div className="text-[11px] text-muted-foreground">ניקוד ערך</div>
                              <div
                                className={`text-lg font-extrabold ${valueScore >= 80 ? "text-emerald-400" : valueScore >= 60 ? "text-amber-500" : "text-muted-foreground"}`}
                              >
                                {valueScore}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Price spread bar */}
                      {sortedOffers.length > 1 && priceSpread > 0 && (
                        <div className="mt-3">
                          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Zap className="h-3 w-3" /> מיקום במחיר
                            </span>
                            <span>{pricePosition}% מהמקסימום</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-all ${pricePosition <= 30 ? "bg-emerald-500" : pricePosition <= 60 ? "bg-amber-500" : "bg-destructive/60"}`}
                              style={{ width: `${Math.max(4, pricePosition)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Details */}
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> {o.start_date}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> תגובה תוך {o.response_time_hours}ש'
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5" /> אחריות {o.warranty_days} ימים
                        </span>
                        {o.insurance && (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" /> ביטוח
                          </span>
                        )}
                      </div>

                      {/* Requirements warning */}
                      {(o.requires_personal_guarantee || o.requires_security_check) && (
                        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            תנאי התאגיד לזכייה
                          </div>
                          <ul className="mt-1.5 space-y-0.5 text-xs text-amber-200/80">
                            {o.requires_personal_guarantee && <li>• ערבות אישית מהקבלן</li>}
                            {o.requires_security_check && <li>• צ׳ק לביטחון מהקבלן</li>}
                          </ul>
                        </div>
                      )}

                      {/* Note */}
                      {o.note && (
                        <p className="mt-3 rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
                          {o.note}
                        </p>
                      )}

                      {/* Award action — inline confirmation */}
                      {isOwner && request.status === "open" && o.status === "submitted" && (
                        <div className="mt-4 border-t border-border/40 pt-4">
                          {isConfirming ? (
                            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Award className="h-5 w-5 text-primary" />
                                <span className="font-bold text-sm">אישור סופי — בחירת זוכה</span>
                              </div>
                              <p className="text-xs text-muted-foreground mb-4">
                                לאחר הבחירה יישלחו הודעות לכל התאגידים. הפעולה היא סופית.
                              </p>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setConfirmingAwardId(null)}
                                  className="gap-1.5"
                                >
                                  <X className="h-4 w-4" /> ביטול
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={actingId === o.id}
                                  onClick={() => handleAward(o.id)}
                                  className="bg-gradient-primary text-primary-foreground shadow-elegant gap-1.5"
                                >
                                  {actingId === o.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" /> בוחר…
                                    </>
                                  ) : (
                                    <>
                                      <Trophy className="h-4 w-4" /> אישור סופי
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-end">
                              <Button
                                onClick={() => setConfirmingAwardId(o.id)}
                                disabled={actingId !== null}
                                className="bg-gradient-primary text-primary-foreground shadow-elegant gap-1.5"
                              >
                                <Trophy className="h-4 w-4" /> בחר כזוכה
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Win panel */}
        {winningOffer && isOwner && (
          <div className="enterprise-card border-primary/40 bg-gradient-to-l from-primary/8 to-primary/3 p-6 animate-fade-up delay-300">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
                <Coins className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold">הזכייה הושלמה</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  פרטי הקשר נחשפו לשני הצדדים. אנא צרו קשר תוך 48 שעות.
                </p>
                {(() => {
                  const w = winningOffer as {
                    corp_name?: string;
                    corp_phone?: string;
                    corp_email?: string;
                  };
                  return w.corp_name ? (
                    <div className="mt-3 rounded-xl border border-primary/20 bg-card/70 p-4">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        התאגיד הזוכה
                      </div>
                      <div className="mt-1 text-base font-extrabold">{w.corp_name}</div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        {w.corp_phone && (
                          <a
                            href={`tel:${w.corp_phone}`}
                            className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                            dir="ltr"
                          >
                            <Phone className="h-3.5 w-3.5" /> {w.corp_phone}
                          </a>
                        )}
                        {w.corp_email && (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" /> {w.corp_email}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null;
                })()}
                <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
                  כל תקשורת מסחרית חייבת לעבור דרך הפלטפורמה.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/app-shell";
import { getJobRequestWithOffers, closeJobRequest } from "@/lib/job-requests.functions";
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
    color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
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
  const qc = useQueryClient();
  const fetchData = useServerFn(getJobRequestWithOffers);
  const awardFn = useServerFn(awardOffer);
  const closeFn = useServerFn(closeJobRequest);
  const [actingId, setActingId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["job-request", id],
    queryFn: () => fetchData({ data: { id } }),
  });

  const handleAward = async (offerId: string) => {
    if (!confirm("לבחור הצעה זו כזוכה? פעולה זו סופית.")) return;
    setActingId(offerId);
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
    if (!confirm("לסגור את הבקשה? לא יתקבלו הצעות נוספות.")) return;
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
        <div className="space-y-4 animate-pulse">
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
          <div className="enterprise-card p-6">
            <div className="h-5 w-32 rounded bg-muted" />
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted" />)}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="בקשה">
        <div className="enterprise-card p-10 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-xl font-bold">הבקשה לא נמצאה</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "ייתכן שהבקשה נמחקה או שאין לך הרשאה."}
          </p>
          <Button asChild className="mt-6 bg-gradient-primary text-primary-foreground">
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
  const lowestPrice = sortedOffers[0]?.price_per_hour;

  const closeAction =
    isOwner && request.status === "open" ? (
      <Button
        variant="outline"
        size="sm"
        onClick={handleClose}
        className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5"
      >
        <X className="h-4 w-4" /> סגור בקשה
      </Button>
    ) : undefined;

  return (
    <AppShell title={`בקשה #${request.id.slice(0, 8)}`} action={closeAction}>
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
            {lowestPrice && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
                <TrendingDown className="h-3.5 w-3.5" /> מינימום: {lowestPrice} ₪/שעה
              </div>
            )}
          </div>

          {offers.length === 0 ? (
            <div className="enterprise-card flex flex-col items-center gap-4 p-12 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-muted/50">
                <Coins className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <div>
                <h4 className="font-bold">ממתינים להצעות</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {request.status === "open"
                    ? "תאגידים מאומתים יקבלו את הבקשה במייל ויגישו הצעות בקרוב."
                    : "לא התקבלו הצעות לפני סגירת הבקשה."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedOffers.map((o, idx) => {
                const isWinner = o.status === "awarded";
                const isRejected =
                  o.status === "rejected" || o.status === "withdrawn";
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
                                  ? "bg-emerald-500/15 text-emerald-700"
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
                              <span className="font-bold">תאגיד אנונימי</span>
                              {idx === 0 && !isRejected && request.status === "open" && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                  <Star className="h-2.5 w-2.5" /> הצעה זולה ביותר
                                </span>
                              )}
                              {isWinner && (
                                <Badge className="bg-primary text-primary-foreground text-[10px]">
                                  זוכה
                                </Badge>
                              )}
                              {o.status === "withdrawn" && (
                                <Badge variant="outline" className="text-[10px]">
                                  בוטלה
                                </Badge>
                              )}
                              {o.status === "rejected" && (
                                <Badge variant="outline" className="text-[10px]">
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

                        {/* Price + Workers */}
                        <div className="flex items-center gap-6">
                          <div>
                            <div className="text-[11px] text-muted-foreground">מחיר לשעה</div>
                            <div
                              className={`text-2xl font-extrabold tracking-tight ${
                                isWinner
                                  ? "text-primary"
                                  : idx === 0
                                    ? "text-emerald-600"
                                    : "text-foreground"
                              }`}
                            >
                              {o.price_per_hour} ₪
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-muted-foreground">עובדים</div>
                            <div className="text-xl font-bold">{o.available_workers}</div>
                          </div>
                        </div>
                      </div>

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
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            תנאי התאגיד לזכייה
                          </div>
                          <ul className="mt-1.5 space-y-0.5 text-xs text-amber-900/80">
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

                      {/* Award action */}
                      {isOwner && request.status === "open" && o.status === "submitted" && (
                        <div className="mt-4 flex justify-end border-t border-border/40 pt-4">
                          <Button
                            onClick={() => handleAward(o.id)}
                            disabled={actingId === o.id}
                            className="bg-gradient-primary text-primary-foreground shadow-elegant gap-1.5"
                          >
                            {actingId === o.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" /> בוחר זוכה…
                              </>
                            ) : (
                              <>
                                <Trophy className="h-4 w-4" /> בחר כזוכה
                              </>
                            )}
                          </Button>
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
              <div>
                <h4 className="text-lg font-bold">הזכייה הושלמה</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  התאגיד הזוכה קיבל את פרטי הקשר שלך במייל. אנא צור איתו קשר תוך 48 שעות.
                </p>
                <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-800">
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

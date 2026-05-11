import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, MapPin, Calendar, Users, Briefcase, CheckCircle2,
  Trophy, Clock, ShieldCheck, Coins, X, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
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

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  open: { label: "פתוחה למכרז", color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  awarded: { label: "נבחר זוכה", color: "bg-primary/15 text-primary border-primary/30" },
  closed: { label: "סגורה", color: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "בוטלה", color: "bg-destructive/15 text-destructive border-destructive/30" },
};

function MyRequestPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
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
      <div className="min-h-screen bg-background text-foreground">
        <SiteNav />
        <main className="mx-auto max-w-5xl px-4 py-16 text-center">טוען בקשה…</main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteNav />
        <main className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="text-3xl font-extrabold">בקשה לא נמצאה</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "ייתכן שהבקשה נמחקה או שאין לך הרשאה."}
          </p>
          <Button asChild className="mt-6"><Link to="/dashboard">חזרה ללוח הבקרה</Link></Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const { request, items, offers, isOwner } = data;
  const status = STATUS_LABEL[request.status] ?? STATUS_LABEL.open;
  const totalWorkers = items.reduce((s, it) => s + (it.count ?? 0), 0);
  const sortedOffers = [...offers].sort((a, b) => Number(a.price_per_hour) - Number(b.price_per_hour));
  const winningOffer = offers.find((o) => o.status === "awarded");

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/dashboard"><ArrowLeft className="ml-1 h-4 w-4" /> ללוח הבקרה</Link>
        </Button>

        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${status.color}`}>
                {request.status === "awarded" ? <Trophy className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                {status.label}
              </div>
              <h1 className="mt-3 text-2xl font-extrabold md:text-3xl">בקשת כוח אדם</h1>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{request.location}</span>
                <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" />התחלה: {request.start_date}</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{request.duration}</span>
                <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{totalWorkers} עובדים</span>
              </div>
            </div>
            {isOwner && request.status === "open" && (
              <Button variant="outline" size="sm" onClick={handleClose}>
                <X className="ml-1 h-4 w-4" /> סגור בקשה
              </Button>
            )}
          </div>

          {items.length > 0 && (
            <div className="mt-6 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {items.map((it) => (
                <div key={it.id} className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-sm">
                  <div className="flex items-center gap-2 font-semibold">
                    <Briefcase className="h-4 w-4 text-primary" />{it.role}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {it.count} × {it.nationality}
                  </div>
                </div>
              ))}
            </div>
          )}

          {request.description && (
            <p className="mt-6 whitespace-pre-line text-sm text-muted-foreground">{request.description}</p>
          )}
        </div>

        {/* Offers */}
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">הצעות שהתקבלו ({offers.length})</h2>
            {sortedOffers[0] && (
              <div className="text-sm text-muted-foreground">
                מהצעה הזולה: <span className="font-bold text-foreground">{sortedOffers[0].price_per_hour} ₪/שעה</span>
              </div>
            )}
          </div>

          {offers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card p-10 text-center text-muted-foreground">
              {request.status === "open"
                ? "טרם התקבלו הצעות. תאגידים מאומתים יקבלו את הבקשה במייל ויגישו הצעות."
                : "לא התקבלו הצעות לפני סגירת הבקשה."}
            </div>
          ) : (
            <div className="grid gap-3">
              {sortedOffers.map((o, idx) => {
                const isWinner = o.status === "awarded";
                const isRejected = o.status === "rejected" || o.status === "withdrawn";
                return (
                  <div
                    key={o.id}
                    className={`rounded-2xl border p-5 shadow-sm transition-all ${
                      isWinner
                        ? "border-primary/60 bg-primary/5"
                        : isRejected
                          ? "border-border/40 bg-card opacity-60"
                          : "border-border/60 bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-sm font-bold">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 font-bold">
                            תאגיד אנונימי
                            {isWinner && <Badge className="bg-primary text-primary-foreground">זוכה</Badge>}
                            {o.status === "withdrawn" && <Badge variant="outline">בוטלה</Badge>}
                            {o.status === "rejected" && <Badge variant="outline">לא נבחרה</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {isOwner && request.status === "open" ? (
                              <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> הזהות נחשפת אחרי בחירה</span>
                            ) : (
                              <span>הצעה התקבלה {new Date(o.created_at).toLocaleDateString("he-IL")}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <div className="text-xs text-muted-foreground">מחיר לשעה</div>
                          <div className="text-xl font-extrabold text-primary">{o.price_per_hour} ₪</div>
                        </div>
                        <div className="text-left">
                          <div className="text-xs text-muted-foreground">עובדים</div>
                          <div className="text-lg font-bold">{o.available_workers}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{o.start_date}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />תגובה תוך {o.response_time_hours}ש'</span>
                      <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />אחריות {o.warranty_days} ימים</span>
                      {o.insurance && <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />ביטוח</span>}
                    </div>

                    {o.note && (
                      <p className="mt-3 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">{o.note}</p>
                    )}

                    {isOwner && request.status === "open" && o.status === "submitted" && (
                      <div className="mt-4 flex justify-end">
                        <Button
                          onClick={() => handleAward(o.id)}
                          disabled={actingId === o.id}
                          className="bg-gradient-primary text-primary-foreground"
                        >
                          <Trophy className="ml-1 h-4 w-4" />
                          {actingId === o.id ? "בוחר…" : "בחר כזוכה"}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {winningOffer && isOwner && (
          <div className="mt-8 rounded-2xl border border-primary/40 bg-primary/5 p-5">
            <div className="flex items-center gap-2 font-bold"><Coins className="h-5 w-5 text-primary" /> הזכייה הושלמה</div>
            <p className="mt-2 text-sm text-muted-foreground">
              התאגיד הזוכה קיבל את פרטי הקשר שלך במייל. אנא צור איתו קשר תוך 48 שעות.
              כל תקשורת מסחרית חייבת לעבור דרך הפלטפורמה.
            </p>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
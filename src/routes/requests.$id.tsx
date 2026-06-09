import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { maskedRequestId } from "@/lib/anonymize";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Briefcase,
  Send,
  Loader2,
  ShieldCheck,
  Coins,
  AlertTriangle,
  CheckCircle2,
  Flame,
  Lock,
  Eye,
  Award,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/app-shell";
import { getJobRequestWithOffers } from "@/lib/job-requests.functions";
import { submitOffer } from "@/lib/job-offers.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/requests/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `מכרז ${maskedRequestId(params.id)} — BuildForce` },
      { name: "description", content: "פרטי מכרז כוח אדם והגשת הצעה" },
    ],
  }),
  component: RequestPage,
});

function competitionLevel(count: number): { label: string; color: string } {
  if (count === 0) return { label: "שקטה", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" };
  if (count < 3) return { label: "מתחילה", color: "bg-amber-500/10 text-amber-700 border-amber-500/20" };
  if (count < 6) return { label: "פעילה", color: "bg-orange-500/10 text-orange-700 border-orange-500/20" };
  return { label: "חמה מאוד 🔥", color: "bg-destructive/10 text-destructive border-destructive/20" };
}

function RequestPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const fetchData = useServerFn(getJobRequestWithOffers);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-request", id],
    queryFn: () => fetchData({ data: { id } }),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (data?.isOwner) {
      navigate({ to: "/my-requests/$id", params: { id }, replace: true });
    }
  }, [data?.isOwner, id, navigate]);

  if (!user) {
    return (
      <AppShell title="מכרז">
        <div className="enterprise-card mx-auto max-w-md p-10 text-center animate-fade-up">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold">נדרשת התחברות</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            יש להתחבר כדי לצפות במכרז ולהגיש הצעה.
          </p>
          <Button
            asChild
            className="mt-6 bg-gradient-primary text-primary-foreground shadow-elegant"
          >
            <Link to="/login">התחברות</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (isLoading) {
    return (
      <AppShell title="מכרז">
        <div className="space-y-4 animate-pulse">
          <div className="enterprise-card overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="h-6 w-24 rounded-full bg-muted" />
              <div className="mt-4 h-8 w-48 rounded-lg bg-muted" />
              <div className="mt-2 h-4 w-32 rounded bg-muted" />
            </div>
            <div className="grid grid-cols-4 border-t border-border/40">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4">
                  <div className="h-3 w-12 rounded bg-muted" />
                  <div className="mt-2 h-5 w-16 rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
          <div className="enterprise-card p-6">
            <div className="h-5 w-40 rounded bg-muted" />
            <div className="mt-4 space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-muted" />)}
            </div>
          </div>
          <div className="enterprise-card p-6">
            <div className="h-8 w-full rounded-xl bg-muted" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="מכרז">
        <div className="enterprise-card p-10 text-center animate-fade-up">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-xl font-bold">המכרז לא נמצא</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "ייתכן שהוסר או שאין לך הרשאה."}
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/dashboard">חזרה</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const { request: req, items, offers, isOwner } = data;
  const offersCount = (data as { offers_count?: number }).offers_count ?? offers.length;

  if (isOwner) {
    return (
      <AppShell title="מכרז">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  const isCorporation = hasRole("corporation");
  const totalWorkers = items.reduce((s, it) => s + (it.count ?? 0), 0);
  const myOffer = offers.find((o) => o.corporation_id === user.id);
  const isOpen = req.status === "open";
  const compLevel = competitionLevel(offersCount);

  // Deadline urgency
  const deadlineHours = (req as { deadline_at?: string }).deadline_at
    ? Math.round((new Date((req as { deadline_at: string }).deadline_at).getTime() - Date.now()) / 3600000)
    : null;
  const deadlineUrgent = deadlineHours !== null && deadlineHours < 24;

  return (
    <AppShell title={`מכרז ${maskedRequestId(req.id)}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="enterprise-card overflow-hidden animate-fade-up">
          <div className="border-b border-border/40 bg-gradient-to-l from-primary/5 to-transparent p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge
                    variant={isOpen ? "default" : "secondary"}
                    className={
                      isOpen
                        ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-700"
                        : ""
                    }
                  >
                    {isOpen
                      ? "פתוח להצעות"
                      : req.status === "awarded"
                        ? "נבחר זוכה"
                        : req.status === "closed"
                          ? "סגור"
                          : "בוטל"}
                  </Badge>
                  {/* Competition signal */}
                  {isOpen && offersCount > 0 && (
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-bold ${compLevel.color}`}>
                      <Flame className="h-3 w-3" />
                      {offersCount} תאגידים כבר הגישו · {compLevel.label}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">
                  {req.location}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">מכרז כוח אדם</p>

                {/* Deadline urgency */}
                {deadlineHours !== null && deadlineHours > 0 && (
                  <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${deadlineUrgent ? "border-destructive/40 bg-destructive/10 text-destructive animate-pulse" : "border-amber-500/30 bg-amber-500/10 text-amber-700"}`}>
                    <Clock className="h-3 w-3" />
                    {deadlineUrgent
                      ? `נסגר בעוד ${deadlineHours} שעות — מהר!`
                      : `נסגר בעוד ${Math.round(deadlineHours / 24)} ימים`}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-x-reverse divide-border/40 border-t border-border/40 md:grid-cols-4">
            {[
              { icon: MapPin, label: "מיקום", value: req.location },
              { icon: Calendar, label: "התחלה", value: req.start_date },
              { icon: Clock, label: "משך", value: req.duration },
              { icon: Briefcase, label: "התחייבות", value: `${req.commitment_months} חודשים` },
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

        {/* Trust signals */}
        {isOpen && isCorporation && !myOffer && (
          <div className="flex flex-wrap gap-2 animate-fade-up delay-100">
            {[
              { icon: Lock, label: "אנונימיות מלאה" },
              { icon: Award, label: "זכייה לפי הצעה הטובה ביותר" },
              { icon: Eye, label: "פרטים נחשפים רק אחרי בחירה" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
                <Icon className="h-3.5 w-3.5" /> {label}
              </div>
            ))}
          </div>
        )}

        {/* Workforce requirements */}
        <div className="enterprise-card p-5 md:p-6 animate-fade-up delay-100">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-bold">דרישות כוח אדם</h3>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold">
              {totalWorkers} עובדים
            </span>
          </div>
          <div className="space-y-2">
            {items.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/30 px-4 py-3 text-sm"
              >
                <span className="font-semibold">{it.role}</span>
                <span className="text-xs text-muted-foreground">
                  {it.nationality} · {it.count} עובדים
                </span>
              </div>
            ))}
          </div>
          {req.description && (
            <p className="mt-4 whitespace-pre-line rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
              {req.description}
            </p>
          )}
          {(req as { deadline_at?: string }).deadline_at && !deadlineUrgent && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-700">
              <Clock className="h-3 w-3" /> סגירת המכרז:{" "}
              {new Date((req as { deadline_at: string }).deadline_at).toLocaleString("he-IL")}
            </div>
          )}
        </div>

        {/* Offer status */}
        <div className="enterprise-card p-5 animate-fade-up delay-200">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted/50">
              <Coins className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="font-bold">סטטוס הצעות</h3>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold">
              {offersCount}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {offersCount === 0
              ? "עדיין לא הוגשו הצעות."
              : "פרטי ההצעות חסויים — רק מזמין המכרז יכול לראותם."}
          </p>
        </div>

        {/* Submit offer */}
        {isCorporation && isOpen && !myOffer && <SubmitOfferCard requestId={req.id} totalWorkers={totalWorkers} />}

        {/* My offer panel */}
        {myOffer && (
          <div className="enterprise-card border-primary/40 bg-gradient-to-l from-primary/5 to-transparent p-5 animate-fade-up delay-300">
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck className="h-5 w-5 text-primary" /> כבר הגשת הצעה למכרז זה
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-secondary/30 px-3 py-2">
                <Coins className="h-4 w-4 text-primary" />
                <span className="font-bold">
                  ₪{Number(myOffer.price_per_hour).toLocaleString()}/שעה
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-secondary/30 px-3 py-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{myOffer.available_workers} עובדים</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-secondary/30 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span>סטטוס: {myOffer.status}</span>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/corporation-dashboard">לניהול ההצעה</Link>
            </Button>
          </div>
        )}

        {/* Not a corporation */}
        {!isCorporation && (
          <div className="enterprise-card border-dashed p-6 text-center text-sm text-muted-foreground animate-fade-up delay-300">
            רק תאגידי כוח אדם מאושרים יכולים להגיש הצעות במכרז זה.
          </div>
        )}
      </div>
    </AppShell>
  );
}

function SubmitOfferCard({ requestId, totalWorkers }: { requestId: string; totalWorkers: number }) {
  const qc = useQueryClient();
  const submitFn = useServerFn(submitOffer);
  const [submitting, setSubmitting] = useState(false);
  const [pricePerHour, setPricePerHour] = useState("");
  const [availableWorkers, setAvailableWorkers] = useState(String(totalWorkers > 0 ? totalWorkers : ""));
  const [startDate, setStartDate] = useState("");
  const [responseTimeHours, setResponseTimeHours] = useState("24");
  const [warrantyDays, setWarrantyDays] = useState("30");
  const [insurance, setInsurance] = useState(true);
  const [note, setNote] = useState("");

  const price = Number(pricePerHour);
  const workers = Number(availableWorkers);
  const dailyCostEstimate = price > 0 && workers > 0 ? Math.round(price * workers * 8) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price || price <= 0) return toast.error("יש להזין מחיר תקין");
    if (!workers || workers <= 0) return toast.error("יש להזין מספר עובדים");
    if (!startDate.trim()) return toast.error("יש להזין תאריך התחלה");
    setSubmitting(true);
    try {
      await submitFn({
        data: {
          requestId,
          pricePerHour: price,
          availableWorkers: workers,
          startDate: startDate.trim(),
          responseTimeHours: Number(responseTimeHours) || 24,
          warrantyDays: Number(warrantyDays) || 30,
          insurance,
          note: note.trim() || undefined,
        },
      });
      toast.success("ההצעה נשלחה בהצלחה");
      qc.invalidateQueries({ queryKey: ["public-request", requestId] });
      qc.invalidateQueries({ queryKey: ["my-job-offers"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בשליחה");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="enterprise-card border-primary/30 p-5 md:p-6 space-y-5 animate-fade-up delay-300"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary shadow-elegant text-primary-foreground">
          <Send className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold">הגשת הצעה למכרז</h3>
          <p className="text-xs text-muted-foreground">כל הפרטים חסויים עד להכרזת זוכה</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="price">
            מחיר לשעה (₪) *
            <span className="block text-[11px] text-muted-foreground font-normal mt-0.5">
              מחיר שוק: ~₪175/שעה
            </span>
          </Label>
          <Input
            id="price"
            type="number"
            min="1"
            step="0.5"
            value={pricePerHour}
            onChange={(e) => setPricePerHour(e.target.value)}
            required
            className="h-11"
            placeholder="₪ לשעה"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="workers">עובדים זמינים *</Label>
          <Input
            id="workers"
            type="number"
            min="1"
            value={availableWorkers}
            onChange={(e) => setAvailableWorkers(e.target.value)}
            required
            className="h-11"
            placeholder="כמה עובדים"
          />
        </div>
      </div>

      {/* Real-time cost estimate */}
      {dailyCostEstimate > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <TrendingUp className="h-4 w-4" />
            עלות יומית משוערת: ₪{dailyCostEstimate.toLocaleString()}
            <span className="text-muted-foreground font-normal mr-1">
              ({price} ₪ × {workers} עובדים × 8 שעות)
            </span>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="sd">תאריך התחלה אפשרי *</Label>
        <Input
          id="sd"
          placeholder="למשל: 01/06/2026"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
          className="h-11"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="rt">זמן תגובה (שעות)</Label>
          <Input
            id="rt"
            type="number"
            min="1"
            max="168"
            value={responseTimeHours}
            onChange={(e) => setResponseTimeHours(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wd">אחריות (ימים)</Label>
          <Input
            id="wd"
            type="number"
            min="0"
            max="365"
            value={warrantyDays}
            onChange={(e) => setWarrantyDays(e.target.value)}
            className="h-11"
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-secondary/30 px-4 py-3">
        <Checkbox
          id="ins"
          checked={insurance}
          onCheckedChange={(v) => setInsurance(v === true)}
        />
        <span className="text-sm">
          <span className="font-semibold">כלול ביטוח מלא</span>
          <span className="text-muted-foreground"> — מגביר אמינות ההצעה</span>
        </span>
      </label>

      <div className="space-y-1.5">
        <Label htmlFor="note">הערות להצעה</Label>
        <Textarea
          id="note"
          rows={3}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="ניסיון, יכולות מיוחדות, גמישות בתנאים…"
        />
      </div>

      <Button
        type="submit"
        disabled={submitting}
        size="lg"
        className="w-full bg-gradient-primary text-primary-foreground shadow-elegant"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> שולח…
          </>
        ) : (
          <>
            <Send className="ml-1 h-4 w-4" /> שלח הצעה
          </>
        )}
      </Button>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        ההצעה חסויה לחלוטין — הקבלן לא יראה את שמך עד שתיבחר
      </div>
    </form>
  );
}

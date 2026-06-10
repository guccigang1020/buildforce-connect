import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { maskedRequestId } from "@/lib/anonymize";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Clock,
  Users,
  Send,
  Loader2,
  ShieldCheck,
  Coins,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Eye,
  TrendingUp,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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

const OFFER_STATUS_LABELS: Record<string, string> = {
  submitted: "ממתינה לבחירה",
  awarded: "זכתה",
  rejected: "לא נבחרה",
  withdrawn: "בוטלה",
};

function competitionLevel(count: number): { label: string; color: string } {
  if (count === 0)
    return { label: "שקטה", color: "bg-emerald-500/10 text-status-approved border-emerald-500/20" };
  if (count < 3)
    return { label: "מתחילה", color: "bg-amber-500/10 text-status-pending border-amber-500/20" };
  if (count < 6)
    return { label: "פעילה", color: "bg-amber-500/15 text-status-pending border-amber-500/30" };
  return {
    label: "חמה מאוד 🔥",
    color: "bg-destructive/10 text-destructive border-destructive/20",
  };
}

function RequestPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, hasRole, loading } = useAuth();
  const fetchData = useServerFn(getJobRequestWithOffers);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login", replace: true });
  }, [loading, user, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-request", id],
    queryFn: () => fetchData({ data: { id } }),
    enabled: !!user,
  });

  useEffect(() => {
    if (data?.isOwner) {
      navigate({ to: "/my-requests/$id", params: { id }, replace: true });
    }
  }, [data?.isOwner, id, navigate]);

  if (loading || !user) {
    return (
      <AppShell title="מכרז">
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (isLoading) {
    return (
      <AppShell title="מכרז">
        <div className="space-y-4 animate-pulse">
          <div className="h-20 rounded-lg bg-muted/40" />
          <div className="h-48 rounded-lg bg-muted/40" />
          <div className="h-64 rounded-lg bg-muted/40" />
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="מכרז">
        <div className="enterprise-card p-10 text-center animate-fade-up">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-lg bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">המכרז לא נמצא</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ייתכן שהמכרז הוסר, הקישור שגוי, או שאין לך הרשאה לצפות בו.
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

  const deadlineHours = (req as { deadline_at?: string }).deadline_at
    ? Math.round(
        (new Date((req as { deadline_at: string }).deadline_at).getTime() - Date.now()) / 3600000,
      )
    : null;
  const deadlineUrgent = deadlineHours !== null && deadlineHours < 24;

  const statusChipClass = isOpen
    ? "status-chip-live"
    : req.status === "awarded"
      ? "status-chip-approved"
      : "status-chip-muted";

  const statusLabel = isOpen
    ? "פתוח להצעות"
    : req.status === "awarded"
      ? "נבחר זוכה"
      : req.status === "closed"
        ? "סגור"
        : "בוטל";

  return (
    <AppShell title={`מכרז ${maskedRequestId(req.id)}`}>
      <div className="space-y-6">
        {/* ── Pattern 1 page header ── */}
        <div className="border-b border-border pb-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground" dir="ltr">
                  {maskedRequestId(req.id)}
                </h2>
                <span className={statusChipClass}>{statusLabel}</span>
                {isOpen && offersCount > 0 && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-semibold ${compLevel.color}`}
                  >
                    <Flame className="h-3 w-3" />
                    {offersCount} הצעות · {compLevel.label}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                מכרז כוח אדם · {req.location}
                {deadlineHours !== null && deadlineHours > 0 && (
                  <>
                    {" · "}
                    <span
                      className={`font-semibold ${deadlineUrgent ? "text-destructive" : "text-status-pending"}`}
                    >
                      <Clock className="inline h-3 w-3 me-0.5 align-[-1px]" />
                      {deadlineUrgent
                        ? `נסגר בעוד ${deadlineHours} שעות`
                        : `נסגר בעוד ${Math.round(deadlineHours / 24)} ימים`}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── Details + requirements in one card ── */}
        <div className="enterprise-card p-5 animate-fade-up">
          <h3 className="text-sm font-semibold border-b border-border pb-3 mb-4">פרטי המכרז</h3>

          {/* Two-column definition list */}
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                מיקום
              </dt>
              <dd className="mt-0.5 font-medium">{req.location}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                תאריך התחלה
              </dt>
              <dd className="mt-0.5 font-medium tabular-nums" dir="ltr">
                {req.start_date}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                משך
              </dt>
              <dd className="mt-0.5 font-medium">{req.duration}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                התחייבות
              </dt>
              <dd className="mt-0.5 font-medium">
                {req.commitment_months} חודשים
              </dd>
            </div>
          </dl>

          {/* Workforce items */}
          {items.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  דרישות כוח אדם
                </h4>
                <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-xs font-medium tabular-nums">
                  <Users className="inline h-3 w-3 me-0.5 align-[-1px]" />
                  {totalWorkers}
                </span>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="premium-table-header">
                      <th className="px-3 py-2 text-start">תפקיד</th>
                      <th className="px-3 py-2 text-start">לאום</th>
                      <th className="px-3 py-2 text-end">עובדים</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id} className="premium-table-row">
                        <td className="px-3 py-2.5 font-medium">{it.role}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{it.nationality}</td>
                        <td className="px-3 py-2.5 text-end tabular-nums" dir="ltr">
                          {it.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {req.description && (
            <p className="mt-4 text-sm text-muted-foreground whitespace-pre-line border-t border-border pt-4">
              {req.description}
            </p>
          )}

          {(req as { deadline_at?: string }).deadline_at && !deadlineUrgent && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              <Clock className="inline h-3 w-3 me-0.5 align-[-1px]" /> סגירת המכרז:{" "}
              {new Date((req as { deadline_at: string }).deadline_at).toLocaleString("he-IL")}
            </p>
          )}
        </div>

        {/* ── Sealed-bid notice ── */}
        <div className="enterprise-card p-5 animate-fade-up delay-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">סטטוס הצעות</h3>
              <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-xs font-medium tabular-nums">
                {offersCount}
              </span>
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {offersCount === 0
              ? "עדיין לא הוגשו הצעות."
              : "פרטי ההצעות חסויים — רק מזמין המכרז יכול לראותם."}
          </p>
          {offersCount > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { icon: Lock, label: "אנונימיות מלאה" },
                { icon: Eye, label: "פרטים נחשפים רק אחרי בחירה" },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded border border-border bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                >
                  <Icon className="h-3 w-3" /> {label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Trust signals (for corporations that haven't bid) ── */}
        {isOpen && isCorporation && !myOffer && (
          <div className="flex flex-wrap gap-2 animate-fade-up delay-100">
            {[
              { icon: Lock, label: "אנונימיות מלאה" },
              { icon: CheckCircle2, label: "זכייה לפי הצעה הטובה ביותר" },
              { icon: Eye, label: "פרטים נחשפים רק אחרי בחירה" },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary"
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </span>
            ))}
          </div>
        )}

        {/* ── Submit offer form ── */}
        {isCorporation && isOpen && !myOffer && (
          <SubmitOfferCard requestId={req.id} totalWorkers={totalWorkers} />
        )}

        {/* ── My offer panel ── */}
        {myOffer && (
          <div className="enterprise-card border-primary/30 p-5 animate-fade-up delay-200">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">כבר הגשת הצעה למכרז זה</span>
            </div>
            <dl className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">מחיר</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">
                  <span dir="ltr">₪{Number(myOffer.price_per_hour).toLocaleString()}</span> לשעה
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">עובדים</dt>
                <dd className="mt-0.5 font-semibold tabular-nums" dir="ltr">
                  {myOffer.available_workers}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">סטטוס</dt>
                <dd className="mt-0.5">
                  <span
                    className={
                      myOffer.status === "awarded"
                        ? "status-chip-approved"
                        : myOffer.status === "rejected"
                          ? "status-chip-rejected"
                          : "status-chip-pending"
                    }
                  >
                    {OFFER_STATUS_LABELS[myOffer.status] ?? myOffer.status}
                  </span>
                </dd>
              </div>
            </dl>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/corporation-dashboard">לניהול ההצעה</Link>
            </Button>
          </div>
        )}

        {/* ── Not a corporation ── */}
        {!isCorporation && (
          <div className="enterprise-card border-dashed p-6 text-center text-sm text-muted-foreground animate-fade-up delay-200">
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
  const [availableWorkers, setAvailableWorkers] = useState(
    String(totalWorkers > 0 ? totalWorkers : ""),
  );
  const [startDate, setStartDate] = useState("");
  const [responseTimeHours, setResponseTimeHours] = useState("24");
  const [warrantyDays, setWarrantyDays] = useState("30");
  const [insurance, setInsurance] = useState(true);
  const [note, setNote] = useState("");

  const [priceError, setPriceError] = useState<string | null>(null);
  const [workersError, setWorkersError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const price = Number(pricePerHour);
  const workers = Number(availableWorkers);
  const dailyCostEstimate = price > 0 && workers > 0 ? Math.round(price * workers * 8) : 0;
  const todayISO = new Date().toISOString().slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPriceError(null);
    setWorkersError(null);
    setDateError(null);

    let hasErrors = false;

    if (!price || price < 50) {
      setPriceError("מחיר לשעה חייב להיות לפחות ₪50");
      hasErrors = true;
    } else if (price > 500) {
      setPriceError("מחיר לשעה לא יכול לעלות על ₪500");
      hasErrors = true;
    }

    if (!workers || workers < 1) {
      setWorkersError("יש להזין לפחות עובד אחד");
      hasErrors = true;
    }

    if (!startDate.trim()) {
      setDateError("יש להזין תאריך התחלה");
      hasErrors = true;
    } else {
      const parsed = new Date(startDate + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isNaN(parsed.getTime())) {
        setDateError("תאריך לא תקין");
        hasErrors = true;
      } else if (parsed < today) {
        setDateError("תאריך ההתחלה לא יכול להיות בעבר");
        hasErrors = true;
      }
    }

    if (hasErrors) return;

    setSubmitting(true);
    try {
      const result = await submitFn({
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
      if (result && typeof result === "object" && "error" in result) {
        toast.error((result as { error: string }).error);
        return;
      }
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
      className="enterprise-card border-primary/30 p-5 space-y-5 animate-fade-up delay-200"
    >
      <div className="border-b border-border pb-3">
        <h3 className="text-sm font-semibold">הגשת הצעה למכרז</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">כל הפרטים חסויים עד להכרזת זוכה</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="price">
            מחיר לשעה (₪) *
            <span className="block text-[11px] text-muted-foreground font-normal mt-0.5">
              טווח: ₪50–₪500
            </span>
          </Label>
          <Input
            id="price"
            type="number"
            min="50"
            max="500"
            step="0.5"
            dir="ltr"
            value={pricePerHour}
            onChange={(e) => {
              setPricePerHour(e.target.value);
              setPriceError(null);
            }}
            required
            className={`h-11 ${priceError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            placeholder="₪ לשעה"
          />
          {priceError && <p className="text-xs text-destructive">{priceError}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="workers">עובדים זמינים *</Label>
          <Input
            id="workers"
            type="number"
            min="1"
            dir="ltr"
            value={availableWorkers}
            onChange={(e) => {
              setAvailableWorkers(e.target.value);
              setWorkersError(null);
            }}
            required
            className={`h-11 ${workersError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            placeholder="כמה עובדים"
          />
          {workersError && <p className="text-xs text-destructive">{workersError}</p>}
        </div>
      </div>

      {dailyCostEstimate > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
            עלות יומית משוערת:{" "}
            <span className="text-foreground font-semibold" dir="ltr">
              ₪{dailyCostEstimate.toLocaleString()}
            </span>
            <span className="text-muted-foreground">
              ({price} ₪ × {workers} עובדים × 8 שעות)
            </span>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="sd">תאריך התחלה אפשרי *</Label>
        <Input
          id="sd"
          type="date"
          min={todayISO}
          dir="ltr"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setDateError(null);
          }}
          required
          className={`h-11 ${dateError ? "border-destructive focus-visible:ring-destructive" : ""}`}
        />
        {dateError && <p className="text-xs text-destructive">{dateError}</p>}
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

      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
        <Checkbox id="ins" checked={insurance} onCheckedChange={(v) => setInsurance(v === true)} />
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

      <Button type="submit" disabled={submitting} size="lg" className="w-full">
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

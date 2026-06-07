import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Users,
  Briefcase,
  Send,
  Loader2,
  ShieldCheck,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getJobRequestWithOffers } from "@/lib/job-requests.functions";
import { submitOffer } from "@/lib/job-offers.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/requests/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `מכרז #${params.id.slice(0, 8)} — BuildForce` },
      { name: "description", content: "פרטי מכרז כוח אדם והגשת הצעה" },
    ],
  }),
  component: RequestPage,
});

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

  // Redirect owners to their management view
  useEffect(() => {
    if (data?.isOwner) {
      navigate({ to: "/my-requests/$id", params: { id }, replace: true });
    }
  }, [data?.isOwner, id, navigate]);

  if (!user) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
          <h1 className="text-xl font-bold">נדרשת התחברות</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            יש להתחבר כדי לצפות במכרז ולהגיש הצעה.
          </p>
          <Button asChild className="mt-4 bg-gradient-primary">
            <Link to="/login">התחברות</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  if (isLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">טוען מכרז…</p>
        </div>
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell>
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-8 text-center">
          <h1 className="text-xl font-bold">המכרז לא נמצא</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "ייתכן שהוסר או שאין לך הרשאה."}
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/dashboard">חזרה</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const { request: req, items, offers, isOwner } = data;
  const offersCount = (data as { offers_count?: number }).offers_count ?? offers.length;
  if (isOwner)
    return (
      <Shell>
        <div className="py-16 text-center text-sm text-muted-foreground">מעביר ל…</div>
      </Shell>
    );

  const isCorporation = hasRole("corporation");
  const totalWorkers = items.reduce((s, it) => s + (it.count ?? 0), 0);
  const myOffer = offers.find((o) => o.corporation_id === user.id);
  const isOpen = req.status === "open";

  return (
    <Shell>
      <Link
        to="/corporation-dashboard"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3 rotate-180" /> חזרה ללוח התאגיד
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-muted-foreground">
            מכרז #{req.id.slice(0, 8)}
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
            {req.location}
          </h1>
        </div>
        <Badge
          variant={isOpen ? "default" : "secondary"}
          className={
            isOpen ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30" : ""
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
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <Info icon={MapPin} label="מיקום" value={req.location} />
        <Info icon={Calendar} label="התחלה" value={req.start_date} />
        <Info icon={Clock} label="משך" value={req.duration} />
        <Info icon={Briefcase} label="התחייבות" value={`${req.commitment_months} חודשים`} />
      </div>

      <section className="mt-8 rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> דרישות כוח אדם ({totalWorkers} עובדים)
        </h2>
        <div className="mt-3 space-y-2">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm"
            >
              <span className="font-semibold">{it.role}</span>
              <span className="text-xs text-muted-foreground">
                {it.nationality} · {it.count} עובדים
              </span>
            </div>
          ))}
        </div>
        {req.description && (
          <p className="mt-4 whitespace-pre-line border-t border-border/60 pt-4 text-sm text-muted-foreground">
            {req.description}
          </p>
        )}
        {req.deadline_at && (
          <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-700">
            <Clock className="h-3 w-3" /> סגירת המכרז:{" "}
            {new Date(req.deadline_at).toLocaleString("he-IL")}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="text-sm font-bold">סטטוס הצעות ({offersCount})</h2>
        {offersCount === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">עדיין לא הוגשו הצעות.</p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            פרטי ההצעות חסויים — רק מזמין המכרז יכול לראותם.
          </p>
        )}
      </section>

      {isCorporation && isOpen && !myOffer && <SubmitOfferCard requestId={req.id} />}

      {myOffer && (
        <div className="mt-6 rounded-2xl border border-primary/40 bg-primary/5 p-5">
          <div className="flex items-center gap-2 text-sm font-bold">
            <ShieldCheck className="h-4 w-4 text-primary" /> כבר הגשת הצעה למכרז זה
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>
              <Coins className="inline h-3 w-3" /> ₪
              {Number(myOffer.price_per_hour).toLocaleString()}/שעה
            </span>
            <span>{myOffer.available_workers} עובדים</span>
            <span>סטטוס: {myOffer.status}</span>
          </div>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/corporation-dashboard">לניהול ההצעה</Link>
          </Button>
        </div>
      )}

      {!isCorporation && (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/40 p-5 text-sm text-muted-foreground">
          רק תאגידי כוח אדם מאושרים יכולים להגיש הצעות במכרז זה.
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-4 py-10 md:px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 text-sm font-bold">{value}</div>
    </div>
  );
}

function SubmitOfferCard({ requestId }: { requestId: string }) {
  const qc = useQueryClient();
  const submitFn = useServerFn(submitOffer);
  const [submitting, setSubmitting] = useState(false);
  const [pricePerHour, setPricePerHour] = useState("");
  const [availableWorkers, setAvailableWorkers] = useState("");
  const [startDate, setStartDate] = useState("");
  const [responseTimeHours, setResponseTimeHours] = useState("24");
  const [warrantyDays, setWarrantyDays] = useState("30");
  const [insurance, setInsurance] = useState(true);
  const [note, setNote] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(pricePerHour);
    const workers = Number(availableWorkers);
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
      className="mt-6 space-y-4 rounded-2xl border border-primary/30 bg-card p-5 md:p-6"
    >
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
          <Send className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-bold">הגשת הצעה למכרז</h2>
          <p className="text-xs text-muted-foreground">כל הפרטים חסויים עד להכרזת זוכה</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="price">מחיר לשעה (₪) *</Label>
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

      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 bg-secondary/30 px-3 py-2.5">
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

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        ההצעה חסויה לחלוטין — הקבלן לא יראה את שמך עד שתיבחר
      </div>
    </form>
  );
}

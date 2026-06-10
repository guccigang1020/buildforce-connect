import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { MapPin, Calendar, Clock, Send, Loader2, ListChecks, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { listOpenJobRequests } from "@/lib/job-requests.functions";
import { submitOffer } from "@/lib/job-offers.functions";

type OpenRequest = {
  id: string;
  location: string;
  start_date: string;
  duration: string;
  commitment_months: string;
  budget: string | null;
  created_at: string;
  deadline_at: string | null;
};

export function OpenTendersSection({ isApproved }: { isApproved: boolean }) {
  const fetchOpen = useServerFn(listOpenJobRequests);
  const { data, isLoading } = useQuery({
    queryKey: ["open-job-requests"],
    queryFn: () => fetchOpen({ data: {} as never }),
  });

  const requests = (data?.requests ?? []) as OpenRequest[];

  return (
    <div className="mt-10">
      {/* Section header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="section-header-icon">
            <ListChecks className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <h2 className="text-base font-bold md:text-lg">מכרזים פתוחים להגשת הצעה</h2>
        </div>
        <a
          href="#my-offers"
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
        >
          <ListChecks className="h-3.5 w-3.5" /> לניהול ההצעות שלי
        </a>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton-kpi animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <ListChecks className="h-7 w-7 text-primary" />
          </div>
          <p className="text-sm font-bold text-foreground">אין כרגע מכרזים פתוחים</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            מכרזים חדשים יופיעו כאן ברגע שיפורסמו — תוכל להגיש הצעת מחיר סגורה מיד.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r, idx) => (
            <TenderRow key={r.id} req={r} rank={idx + 1} isApproved={isApproved} />
          ))}
        </div>
      )}
    </div>
  );
}

function TenderRow({
  req,
  rank,
  isApproved,
}: {
  req: OpenRequest;
  rank: number;
  isApproved: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 transition-all hover:border-primary/40 hover:shadow-card status-bar-live md:p-5">
      <div className="flex min-w-0 items-start gap-3">
        {/* Rank badge */}
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted/50 text-sm font-extrabold text-muted-foreground">
          {rank}
        </div>
        <div className="min-w-0">
          {/* Location + date chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="info-chip font-semibold">
              <MapPin className="h-3 w-3 text-primary" /> {req.location}
            </span>
            <span className="info-chip">
              <Calendar className="h-3 w-3" /> {req.start_date} · {req.duration}
            </span>
            {req.deadline_at && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600">
                <Clock className="h-3 w-3" /> סגירה{" "}
                {new Date(req.deadline_at).toLocaleDateString("he-IL")}
              </span>
            )}
          </div>
          {/* Commitment + budget */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>התחייבות {req.commitment_months} חודשים</span>
            {req.budget && (
              <span className="font-semibold text-foreground" dir="ltr">
                תקציב {req.budget}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to="/requests/$id"
          params={{ id: req.id }}
          className="flex h-10 items-center px-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          פרטים
        </Link>
        <SubmitOfferDialog requestId={req.id} isApproved={isApproved} />
      </div>
    </div>
  );
}

function SubmitOfferDialog({
  requestId,
  isApproved,
}: {
  requestId: string;
  isApproved: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pricePerHour, setPricePerHour] = useState("");
  const [availableWorkers, setAvailableWorkers] = useState("");
  const [startDate, setStartDate] = useState("");
  const [responseTimeHours, setResponseTimeHours] = useState("24");
  const [warrantyDays, setWarrantyDays] = useState("30");
  const [insurance, setInsurance] = useState(true);
  const [note, setNote] = useState("");
  const [requiresPersonalGuarantee, setRequiresPersonalGuarantee] = useState(false);
  const [requiresSecurityCheck, setRequiresSecurityCheck] = useState(false);

  const qc = useQueryClient();
  const submitFn = useServerFn(submitOffer);

  const reset = () => {
    setPricePerHour("");
    setAvailableWorkers("");
    setStartDate("");
    setResponseTimeHours("24");
    setWarrantyDays("30");
    setInsurance(true);
    setNote("");
    setRequiresPersonalGuarantee(false);
    setRequiresSecurityCheck(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(pricePerHour);
    const workers = Number(availableWorkers);
    const respTime = Number(responseTimeHours);
    const warranty = Number(warrantyDays);
    if (!price || price <= 0) return toast.error("יש להזין מחיר תקין לשעה");
    if (!workers || workers <= 0) return toast.error("יש להזין מספר עובדים זמינים");
    if (!startDate.trim()) return toast.error("יש להזין תאריך התחלה אפשרי");

    setSubmitting(true);
    try {
      await submitFn({
        data: {
          requestId,
          pricePerHour: price,
          availableWorkers: workers,
          startDate: startDate.trim(),
          responseTimeHours: respTime || 24,
          warrantyDays: warranty || 30,
          insurance,
          note: note.trim() || undefined,
          requiresPersonalGuarantee,
          requiresSecurityCheck,
        },
      });
      toast.success("ההצעה נשלחה בהצלחה ללקוח.");
      qc.invalidateQueries({ queryKey: ["open-job-requests"] });
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בשליחת ההצעה");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isApproved) {
    return (
      <Button
        type="button"
        disabled
        title="החשבון ממתין לאימות אדמין — לא ניתן להגיש הצעות עדיין"
        className="h-10 gap-1.5"
        variant="outline"
      >
        <Lock className="h-3.5 w-3.5" /> ממתין לאישור
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-10 gap-1.5 bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-95">
          <Send className="h-3.5 w-3.5" /> הגש הצעה
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>הגשת הצעה סגורה למכרז</DialogTitle>
          <DialogDescription>
            ההצעה שלך חסויה — הלקוח לא יראה את שם החברה או הצעות מתחרות עד לרגע הזכייה.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Primary bid input */}
          <div className="space-y-1.5 rounded-xl border border-primary/25 bg-primary/5 p-3">
            <Label htmlFor="price" className="text-sm font-bold text-foreground">
              מחיר לשעה (₪) *
            </Label>
            <Input
              id="price"
              type="number"
              min="1"
              step="0.5"
              dir="ltr"
              value={pricePerHour}
              onChange={(e) => setPricePerHour(e.target.value)}
              required
              className="h-12 text-lg font-bold"
              placeholder="₪ לשעה"
            />
            <p className="text-xs text-muted-foreground">
              זוהי הצעת המחיר הסגורה שלך לפרויקט — ללא תקציב מוצהר מראש מהלקוח.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="workers">עובדים זמינים *</Label>
              <Input
                id="workers"
                type="number"
                min="1"
                dir="ltr"
                value={availableWorkers}
                onChange={(e) => setAvailableWorkers(e.target.value)}
                required
                className="h-11"
              />
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rt">זמן תגובה (שעות)</Label>
              <Input
                id="rt"
                type="number"
                min="1"
                max="168"
                dir="ltr"
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
                dir="ltr"
                value={warrantyDays}
                onChange={(e) => setWarrantyDays(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="ins"
              checked={insurance}
              onCheckedChange={(v) => setInsurance(v === true)}
            />
            <Label htmlFor="ins" className="cursor-pointer">
              כלול ביטוח מלא
            </Label>
          </div>

          <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="text-xs font-bold text-amber-600">
              דרישות לערבות העסקה (במידה והקבלן יבחר בהצעתך)
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="pg"
                checked={requiresPersonalGuarantee}
                onCheckedChange={(v) => setRequiresPersonalGuarantee(v === true)}
              />
              <Label htmlFor="pg" className="cursor-pointer text-sm">
                דורש ערבות אישית מהקבלן
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="sc"
                checked={requiresSecurityCheck}
                onCheckedChange={(v) => setRequiresSecurityCheck(v === true)}
              />
              <Label htmlFor="sc" className="cursor-pointer text-sm">
                דורש צ׳ק לבטחון מהקבלן
              </Label>
            </div>
            <div className="text-xs text-muted-foreground">
              ניתן לסמן אחד מהם, את שניהם, או אף אחד. הדרישות יוצגו לקבלן יחד עם ההצעה.
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">הערות</Label>
            <Textarea
              id="note"
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="פרטים נוספים על ההצעה..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              ביטול
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-95"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> שולח...
                </>
              ) : (
                "שלח הצעה סגורה"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

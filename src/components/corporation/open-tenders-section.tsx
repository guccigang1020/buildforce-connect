import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import ScheduleIcon from "@mui/icons-material/Schedule";
import SendIcon from "@mui/icons-material/Send";
import LockIcon from "@mui/icons-material/Lock";
import CircularProgress from "@mui/material/CircularProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { submitOffer, listMyOffers } from "@/lib/job-offers.functions";
import { maskedRequestId } from "@/lib/anonymize";

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

function deadlineLabel(deadline_at: string | null): { text: string; urgent: boolean } | null {
  if (!deadline_at) return null;
  const hoursLeft = Math.round((new Date(deadline_at).getTime() - Date.now()) / 3_600_000);
  if (hoursLeft <= 0) return { text: "נסגר", urgent: true };
  if (hoursLeft < 24) return { text: `${hoursLeft}ש׳`, urgent: true };
  const daysLeft = Math.round(hoursLeft / 24);
  return { text: `${daysLeft} ימים`, urgent: daysLeft <= 2 };
}

export function OpenTendersSection({ isApproved }: { isApproved: boolean }) {
  const fetchOpen = useServerFn(listOpenJobRequests);
  const fetchMyOffers = useServerFn(listMyOffers);
  const { data, isLoading } = useQuery({
    queryKey: ["open-job-requests"],
    queryFn: () => fetchOpen({ data: {} as never }),
  });
  // Tenders the corporation already has an active offer on are removed from
  // this list entirely — once a bid exists it lives only under "ההצעות שלי".
  // (Shared query key with MyOffersSection so a withdrawal re-lists the tender
  // here immediately.)
  const { data: myOffersData } = useQuery({
    queryKey: ["my-offers"],
    queryFn: () => fetchMyOffers(),
  });
  const alreadyBidRequestIds = new Set(
    ((myOffersData?.offers ?? []) as { request_id: string; status: string }[])
      .filter((o) => o.status !== "withdrawn")
      .map((o) => o.request_id),
  );

  const requests = ((data?.requests ?? []) as OpenRequest[]).filter(
    (r) => !alreadyBidRequestIds.has(r.id),
  );

  return (
    <div className="mt-8 space-y-3">
      {/* Section title */}
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <h3 className="text-sm font-semibold">
          מכרזים פתוחים
          {requests.length > 0 && (
            <span className="ms-2 rounded border border-border bg-muted/50 px-1.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
              {requests.length}
            </span>
          )}
        </h3>
        <a
          href="#my-offers"
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          ההצעות שלי ↓
        </a>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted/40" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <p className="text-sm font-semibold text-foreground">אין כרגע מכרזים פתוחים</p>
          <p className="mt-1 text-sm text-muted-foreground">
            מכרזים חדשים יופיעו כאן ברגע שיפורסמו — תוכל להגיש הצעת מחיר סגורה מיד.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="premium-table-header">
                  <th className="px-4 py-2.5 text-start">מזהה</th>
                  <th className="px-4 py-2.5 text-start">מיקום</th>
                  <th className="px-4 py-2.5 text-start">התחלה</th>
                  <th className="px-4 py-2.5 text-start">משך</th>
                  <th className="px-4 py-2.5 text-start">סגירה</th>
                  <th className="px-4 py-2.5 text-end">פעולה</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const dl = deadlineLabel(r.deadline_at);
                  return (
                    <tr key={r.id} className="premium-table-row">
                      <td className="px-4 py-3">
                        <Link
                          to="/requests/$id"
                          params={{ id: r.id }}
                          className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                          dir="ltr"
                        >
                          {maskedRequestId(r.id)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium">{r.location}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        <span dir="ltr">{r.start_date}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.duration}</td>
                      <td className="px-4 py-3">
                        {dl ? (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold ${
                              dl.urgent ? "text-destructive" : "text-status-pending"
                            }`}
                            dir="ltr"
                          >
                            <ScheduleIcon sx={{ fontSize: 12 }} className="shrink-0" /> {dl.text}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <SubmitOfferDialog requestId={r.id} isApproved={isApproved} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile compact rows */}
          <div className="md:hidden space-y-2">
            {requests.map((r) => {
              const dl = deadlineLabel(r.deadline_at);
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{r.location}</span>
                      {dl?.urgent && (
                        <span className="text-[11px] font-semibold text-destructive shrink-0">
                          {dl.text}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {r.start_date} · {r.duration}
                    </div>
                  </div>
                  <SubmitOfferDialog requestId={r.id} isApproved={isApproved} compact />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SubmitOfferDialog({
  requestId,
  isApproved,
  compact = false,
}: {
  requestId: string;
  isApproved: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pricePerHour, setPricePerHour] = useState("");
  const [availableWorkers, setAvailableWorkers] = useState("");
  const [startDate, setStartDate] = useState("");
  const [note, setNote] = useState("");
  const [priceError, setPriceError] = useState<string | null>(null);
  const [workersError, setWorkersError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const qc = useQueryClient();
  const submitFn = useServerFn(submitOffer);
  const todayISO = new Date().toISOString().slice(0, 10);

  const reset = () => {
    setPricePerHour("");
    setAvailableWorkers("");
    setStartDate("");
    setNote("");
    setPriceError(null);
    setWorkersError(null);
    setDateError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPriceError(null);
    setWorkersError(null);
    setDateError(null);

    const price = Number(pricePerHour);
    const workers = Number(availableWorkers);
    let hasErrors = false;
    if (!price || price < 50) {
      setPriceError("מחיר לשעה חייב להיות לפחות ₪50");
      hasErrors = true;
    } else if (price > 500) {
      setPriceError("מחיר לשעה לא יכול לעלות על ₪500");
      hasErrors = true;
    }
    if (!workers || workers <= 0) {
      setWorkersError("יש להזין מספר עובדים זמינים");
      hasErrors = true;
    }
    if (!startDate) {
      setDateError("יש להזין תאריך התחלה אפשרי");
      hasErrors = true;
    } else if (startDate < todayISO) {
      setDateError("תאריך ההתחלה לא יכול להיות בעבר");
      hasErrors = true;
    }
    if (hasErrors) return;

    setSubmitting(true);
    try {
      const result = await submitFn({
        data: {
          requestId,
          pricePerHour: price,
          availableWorkers: workers,
          startDate,
          note: note.trim() || undefined,
        },
      });
      if (result && typeof result === "object" && "error" in result) {
        toast.error((result as { error: string }).error);
        return;
      }
      toast.success("ההצעה נשלחה בהצלחה ללקוח.");
      qc.invalidateQueries({ queryKey: ["open-job-requests"] });
      qc.invalidateQueries({ queryKey: ["my-offers"] });
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
        size={compact ? "sm" : "default"}
        title="החשבון ממתין לאימות אדמין — לא ניתן להגיש הצעות עדיין"
        variant="outline"
      >
        <LockIcon sx={{ fontSize: 14 }} />
        {!compact && " ממתין לאישור"}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={compact ? "sm" : "default"} className="gap-1.5 shrink-0">
          <SendIcon sx={{ fontSize: 14 }} />
          {compact ? "הגש" : "הגש הצעה"}
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
          <div className="space-y-1.5">
            <Label htmlFor="price" className="text-sm font-semibold">
              מחיר לשעה (₪) *
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
              className={`h-11 text-base font-semibold ${priceError ? "border-destructive focus-visible:ring-destructive" : ""}`}
              placeholder="₪ לשעה"
            />
            {priceError ? (
              <p className="text-xs text-destructive">{priceError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">טווח: ₪50–₪500. הצעה חסויה לחלוטין.</p>
            )}
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
                onChange={(e) => {
                  setAvailableWorkers(e.target.value);
                  setWorkersError(null);
                }}
                required
                className={`h-11 ${workersError ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {workersError && <p className="text-xs text-destructive">{workersError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sd">תאריך התחלה *</Label>
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
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <CircularProgress size={16} color="inherit" /> שולח...
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

import { Fragment, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import CircularProgress from "@mui/material/CircularProgress";
import WorkIcon from "@mui/icons-material/Work";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import PaidIcon from "@mui/icons-material/Paid";
import CloseIcon from "@mui/icons-material/Close";
import LockIcon from "@mui/icons-material/Lock";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import PhoneIcon from "@mui/icons-material/Phone";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import { Button } from "@/components/ui/button";
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

const STATUS_META: Record<string, { label: string; chipClass: string }> = {
  open: { label: "פתוחה למכרז", chipClass: "status-chip-live" },
  awarded: { label: "נבחר זוכה", chipClass: "status-chip-approved" },
  closed: { label: "סגורה", chipClass: "status-chip-muted" },
  cancelled: { label: "בוטלה", chipClass: "status-chip-rejected" },
};

const HOURS_PER_WORKER_MONTH = 176; // ~22 work days × 8h

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
      // Keep actingId set on success: the award buttons stay locked until the
      // refetched "awarded" state replaces them — prevents double-award clicks
      // during the ~2-4s refetch window.
      await qc.invalidateQueries({ queryKey: ["job-request", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה בבחירת זוכה");
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
          <div className="h-20 rounded-lg bg-muted" />
          <div className="h-32 rounded-lg bg-muted" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-muted" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (error || !data?.request) {
    return (
      <AppShell title="בקשה">
        <div className="enterprise-card p-10 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-lg bg-destructive/10">
            <WarningAmberIcon sx={{ fontSize: 28 }} className="text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">הבקשה לא נמצאה</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ייתכן שהבקשה נמחקה, הקישור שגוי, או שאין לך הרשאה לצפות בה.
          </p>
          <Button asChild className="mt-6" variant="outline">
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

  const prices = sortedOffers.map((o) => Number(o.price_per_hour));
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const avgPrice =
    prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;

  // Savings Engine — core differentiator: translate auction into one ₪ number
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
          <CloseIcon sx={{ fontSize: 16 }} /> סגור בקשה
        </Button>
      )
    ) : undefined;

  return (
    <AppShell title={`בקשה ${maskedRequestId(request.id)}`}>
      <div className="space-y-6">
        {/* ── Page header (pattern 1) ── */}
        <div className="border-b border-border pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground" dir="ltr">
                  {maskedRequestId(request.id)}
                </h2>
                <span className={statusMeta.chipClass}>{statusMeta.label}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {request.location} · התחלה{" "}
                <span dir="ltr">{request.start_date}</span> · {request.duration} · {totalWorkers}{" "}
                עובדים
                {deadlineHours !== null &&
                  deadlineHours > 0 &&
                  request.status === "open" && (
                    <span
                      className={`mr-2 font-medium ${
                        deadlineHours < 24 ? "text-destructive" : "text-status-pending"
                      }`}
                    >
                      ·{" "}
                      {deadlineHours < 24
                        ? `נסגר בעוד ${deadlineHours}ש׳`
                        : `${Math.round(deadlineHours / 24)} ימים לסגירה`}
                    </span>
                  )}
              </p>
            </div>
            {closeAction}
          </div>
        </div>

        {/* ── Items ── */}
        {items.length > 0 && (
          <div className="enterprise-card p-5">
            <h3 className="mb-3 border-b border-border pb-3 text-sm font-semibold">
              <WorkIcon sx={{ fontSize: 14 }} className="mr-1.5 inline text-muted-foreground" />
              פרטי הבקשה
            </h3>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-secondary/30 p-3"
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-semibold text-primary tabular-nums">
                    {it.count}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{it.role}</div>
                    <div className="text-xs text-muted-foreground">{it.nationality}</div>
                  </div>
                </div>
              ))}
            </div>
            {request.description && (
              <p className="mt-4 whitespace-pre-line rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
                {request.description}
              </p>
            )}
          </div>
        )}

        {/* ── Savings Engine ── */}
        {sortedOffers.length > 0 && (
          <div className="enterprise-card overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold">
                מנוע החיסכון
                <span className="mr-2 font-normal text-xs text-muted-foreground">
                  {offers.length} הצעות · ממוצע{" "}
                  <span dir="ltr">{avgPrice} ₪/שעה</span>
                </span>
              </h3>
            </div>

            {/* Hero savings number — intentionally orange and large (business plan) */}
            {monthlySavings > 0 && (
              <div className="border-b border-border bg-savings-soft px-5 py-6 md:px-8">
                <span className="savings-badge uppercase tracking-wider">
                  <TrendingDownIcon sx={{ fontSize: 14 }} />
                  {winningOffer ? "החיסכון שהשגת" : "חיסכון חודשי מוערך"}
                </span>
                <div className="mt-3 text-5xl font-black leading-none tracking-tight text-savings md:text-6xl">
                  <span dir="ltr">₪{monthlySavings.toLocaleString()}</span>
                  <span className="mr-2 align-middle text-lg font-bold text-savings/80">
                    / חודש
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  <span dir="ltr">₪{savingsPerHour}</span> לשעה ×{" "}
                  <span dir="ltr">{totalWorkers}</span> עובדים ×{" "}
                  <span dir="ltr">{HOURS_PER_WORKER_MONTH}</span> שעות בחודש
                </p>
              </div>
            )}

            {/* Price range stats */}
            <div className="p-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border p-3 text-center">
                  <div className="text-xs text-muted-foreground">מינימום</div>
                  <div
                    className="mt-1 text-base font-semibold tabular-nums text-savings"
                    dir="ltr"
                  >
                    ₪{minPrice}
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <div className="text-xs text-muted-foreground">ממוצע</div>
                  <div className="mt-1 text-base font-semibold tabular-nums" dir="ltr">
                    ₪{avgPrice}
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <div className="text-xs text-muted-foreground">מקסימום</div>
                  <div className="mt-1 text-base font-semibold tabular-nums" dir="ltr">
                    ₪{maxPrice}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Offers section ── */}
        <div>
          <h3 className="mb-3 border-b border-border pb-3 text-sm font-semibold">
            הצעות שהתקבלו
            <span className="mr-1.5 font-normal text-muted-foreground">({offers.length})</span>
            {minPrice > 0 && (
              <span className="mr-2">
                <span className="savings-badge">
                  <TrendingDownIcon sx={{ fontSize: 12 }} /> מינ׳ <span dir="ltr">₪{minPrice}</span> לשעה
                </span>
              </span>
            )}
          </h3>

          {offers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon mx-auto">
                <PaidIcon sx={{ fontSize: 32 }} className="text-primary" />
              </div>
              <h4 className="text-base font-semibold">ממתינים להצעות</h4>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                {request.status === "open"
                  ? "תאגידים מאומתים יקבלו את הבקשה במייל ויגישו הצעות בקרוב."
                  : "לא התקבלו הצעות לפני סגירת הבקשה."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              {/* Desktop table (≥768px) */}
              <table className="hidden w-full md:table">
                <thead>
                  <tr className="premium-table-header">
                    <th className="px-4 py-3 text-right">#</th>
                    <th className="px-4 py-3 text-right">ספק</th>
                    <th className="px-4 py-3 text-right">מחיר לשעה</th>
                    <th className="px-4 py-3 text-right">עובדים</th>
                    <th className="px-4 py-3 text-right">התחלה</th>
                    <th className="px-4 py-3 text-right">חיסכון</th>
                    <th className="px-4 py-3 text-right">סטטוס</th>
                    <th className="px-4 py-3 text-right">פעולה</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOffers.map((o, idx) => {
                    const isWinner = o.status === "awarded";
                    const isRejected =
                      o.status === "rejected" || o.status === "withdrawn";
                    const priceNum = Number(o.price_per_hour);
                    const savedVsMax = maxPrice > priceNum ? maxPrice - priceNum : 0;
                    const reveal = o as {
                      corp_name?: string;
                      corp_phone?: string;
                      corp_email?: string;
                    };
                    const isConfirming = confirmingAwardId === o.id;

                    return (
                      <Fragment key={o.id}>
                        <tr
                          className={`premium-table-row ${
                            isWinner
                              ? "bg-emerald-500/10"
                              : ""
                          } ${isRejected ? "opacity-50" : ""}`}
                        >
                          {/* Rank */}
                          <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground" dir="ltr">
                            #{idx + 1}
                          </td>

                          {/* Supplier */}
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium">
                              {isWinner && reveal.corp_name
                                ? reveal.corp_name
                                : "תאגיד אנונימי"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {isOwner && request.status === "open" ? (
                                <span className="inline-flex items-center gap-1">
                                  <LockIcon sx={{ fontSize: 12 }} /> נחשף אחרי בחירה
                                </span>
                              ) : (
                                new Date(o.created_at).toLocaleDateString("he-IL")
                              )}
                            </div>
                          </td>

                          {/* Price */}
                          <td className="px-4 py-3">
                            <span
                              className={`text-base font-semibold tabular-nums ${
                                isWinner
                                  ? "text-primary"
                                  : idx === 0
                                    ? "text-savings"
                                    : "text-foreground"
                              }`}
                              dir="ltr"
                            >
                              {o.price_per_hour} ₪
                            </span>
                          </td>

                          {/* Workers */}
                          <td className="px-4 py-3 text-sm tabular-nums" dir="ltr">
                            {o.available_workers}
                          </td>

                          {/* Start date */}
                          <td className="px-4 py-3 text-sm tabular-nums" dir="ltr">
                            {o.start_date}
                          </td>

                          {/* Savings */}
                          <td className="px-4 py-3">
                            {savedVsMax > 0 && !isRejected ? (
                              <span className="savings-badge">
                                <TrendingDownIcon sx={{ fontSize: 12 }} /> זול ב-
                                <span dir="ltr">{savedVsMax} ₪</span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            {isWinner ? (
                              <span className="status-chip-approved">
                                <EmojiEventsIcon sx={{ fontSize: 12 }} /> זוכה
                              </span>
                            ) : o.status === "withdrawn" ? (
                              <span className="status-chip-muted">בוטלה</span>
                            ) : o.status === "rejected" ? (
                              <span className="status-chip-rejected">לא נבחרה</span>
                            ) : (
                              <span className="status-chip-live">פעילה</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="px-4 py-3">
                            {isOwner &&
                              request.status === "open" &&
                              o.status === "submitted" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={actingId !== null}
                                  onClick={() =>
                                    setConfirmingAwardId(isConfirming ? null : o.id)
                                  }
                                  className="h-7 gap-1 px-3 text-xs"
                                >
                                  {actingId === o.id ? (
                                    <CircularProgress size={12} color="inherit" />
                                  ) : (
                                    <>
                                      <EmojiEventsIcon sx={{ fontSize: 12 }} /> בחר כזוכה
                                    </>
                                  )}
                                </Button>
                              )}
                          </td>
                        </tr>

                        {/* Award confirm — expanded row */}
                        {isConfirming && (
                          <tr>
                            <td colSpan={8} className="px-4 pb-4 pt-0">
                              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                                <div className="mb-3 flex items-center gap-2">
                                  <WorkspacePremiumIcon sx={{ fontSize: 20 }} className="text-primary" />
                                  <span className="text-sm font-semibold">
                                    אישור סופי — בחירת זוכה
                                  </span>
                                </div>
                                <div className="mb-4 space-y-1.5 text-xs text-muted-foreground">
                                  <div className="flex flex-wrap items-center gap-1">
                                    <span className="font-semibold text-foreground">
                                      ההצעה הנבחרת:
                                    </span>
                                    <span dir="ltr" className="font-extrabold text-primary">
                                      ₪{priceNum}
                                    </span>
                                    <span>
                                      לשעה · <span dir="ltr">{totalWorkers}</span> עובדים
                                    </span>
                                  </div>
                                  <div>
                                    זהות התאגיד ופרטי הקשר שלו יחשפו בפניך מיד לאחר
                                    האישור.
                                  </div>
                                  <div>
                                    כל שאר ההצעות יסומנו כ״לא נבחרו״ ותישלח להן הודעה.
                                  </div>
                                  <div className="font-semibold text-foreground">
                                    הפעולה סופית — אין אפשרות לביטול.
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setConfirmingAwardId(null)}
                                    className="gap-1.5"
                                  >
                                    <CloseIcon sx={{ fontSize: 16 }} /> ביטול
                                  </Button>
                                  <Button
                                    size="sm"
                                    disabled={actingId === o.id}
                                    onClick={() => handleAward(o.id)}
                                    className="gap-1.5"
                                  >
                                    {actingId === o.id ? (
                                      <>
                                        <CircularProgress size={16} color="inherit" />{" "}
                                        בוחר…
                                      </>
                                    ) : (
                                      <>
                                        <EmojiEventsIcon sx={{ fontSize: 16 }} /> אישור סופי
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Requirements warning */}
                        {(o.requires_personal_guarantee || o.requires_security_check) &&
                          !isRejected && (
                            <tr>
                              <td colSpan={8} className="px-4 pb-3 pt-0">
                                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-status-pending">
                                    <WarningAmberIcon sx={{ fontSize: 14 }} /> תנאי התאגיד
                                    לזכייה
                                  </div>
                                  <ul className="mt-1.5 space-y-0.5 text-xs text-status-pending">
                                    {o.requires_personal_guarantee && (
                                      <li>• ערבות אישית מהקבלן</li>
                                    )}
                                    {o.requires_security_check && (
                                      <li>• צ׳ק לביטחון מהקבלן</li>
                                    )}
                                  </ul>
                                </div>
                              </td>
                            </tr>
                          )}

                        {/* Note */}
                        {o.note && (
                          <tr>
                            <td colSpan={8} className="px-4 pb-3 pt-0">
                              <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                                {o.note}
                              </p>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile compact rows (<768px) */}
              <div className="divide-y divide-border md:hidden">
                {sortedOffers.map((o, idx) => {
                  const isWinner = o.status === "awarded";
                  const isRejected =
                    o.status === "rejected" || o.status === "withdrawn";
                  const priceNum = Number(o.price_per_hour);
                  const reveal = o as { corp_name?: string };
                  const isConfirming = confirmingAwardId === o.id;

                  return (
                    <div
                      key={o.id}
                      className={`px-4 py-3 ${
                        isWinner ? "bg-emerald-500/10" : ""
                      } ${isRejected ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium tabular-nums text-muted-foreground" dir="ltr">
                              #{idx + 1}
                            </span>
                            <span className="text-sm font-medium">
                              {isWinner && reveal.corp_name
                                ? reveal.corp_name
                                : "תאגיד אנונימי"}
                            </span>
                            {isWinner && (
                              <span className="status-chip-approved">
                                <EmojiEventsIcon sx={{ fontSize: 12 }} /> זוכה
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {o.available_workers} עובדים · התחלה{" "}
                            <span dir="ltr">{o.start_date}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            className={`text-base font-semibold tabular-nums ${
                              idx === 0 && !isRejected ? "text-savings" : ""
                            }`}
                            dir="ltr"
                          >
                            {o.price_per_hour} ₪
                          </span>
                          <div className="text-[11px] text-muted-foreground">לשעה</div>
                        </div>
                      </div>
                      {/* Mobile award button */}
                      {isOwner && request.status === "open" && o.status === "submitted" && (
                        <div className="mt-2">
                          {isConfirming ? (
                            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                              <p className="mb-2 text-xs font-semibold text-foreground">
                                בחירת זוכה — פעולה סופית ובלתי הפיכה
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setConfirmingAwardId(null)}
                                  className="h-7 px-2 text-xs"
                                >
                                  ביטול
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={actingId === o.id}
                                  onClick={() => handleAward(o.id)}
                                  className="h-7 gap-1 px-3 text-xs"
                                >
                                  {actingId === o.id ? (
                                    <CircularProgress size={12} color="inherit" />
                                  ) : (
                                    <>
                                      <EmojiEventsIcon sx={{ fontSize: 12 }} /> אישור
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actingId !== null}
                              onClick={() => setConfirmingAwardId(o.id)}
                              className="h-7 gap-1 px-3 text-xs"
                            >
                              <EmojiEventsIcon sx={{ fontSize: 12 }} /> בחר כזוכה
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Win panel ── */}
        {winningOffer && isOwner && (
          <div className="enterprise-card border-emerald-500/30 bg-emerald-500/10 p-5">
            <h4 className="mb-3 flex items-center gap-2 border-b border-border pb-3 text-sm font-semibold">
              <CheckCircleIcon sx={{ fontSize: 16 }} className="text-status-approved" /> הזכייה הושלמה
            </h4>
            <p className="text-sm text-muted-foreground">
              פרטי הקשר נחשפו לשני הצדדים. אנא צרו קשר תוך 48 שעות.
            </p>
            {(() => {
              const w = winningOffer as {
                corp_name?: string;
                corp_phone?: string;
                corp_email?: string;
              };
              return w.corp_name ? (
                <div className="mt-3 rounded-lg border border-border bg-card p-4">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    התאגיד הזוכה
                  </div>
                  <div className="mt-1 text-base font-semibold">{w.corp_name}</div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {w.corp_phone && (
                      <a
                        href={`tel:${w.corp_phone}`}
                        className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                        dir="ltr"
                      >
                        <PhoneIcon sx={{ fontSize: 14 }} /> {w.corp_phone}
                      </a>
                    )}
                    {w.corp_email && (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <MailOutlineIcon sx={{ fontSize: 14 }} /> {w.corp_email}
                      </span>
                    )}
                  </div>
                </div>
              ) : null;
            })()}
            <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-status-pending">
              כל תקשורת מסחרית חייבת לעבור דרך הפלטפורמה.
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

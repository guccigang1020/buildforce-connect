import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import CancelIcon from "@mui/icons-material/Cancel";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Button } from "@/components/ui/button";
import { listMyOffers } from "@/lib/job-offers.functions";
import { maskedRequestId } from "@/lib/anonymize";

type MyOffer = {
  id: string;
  request_id: string;
  price_per_hour: number | string;
  available_workers: number;
  start_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  request: { location: string; start_date: string; duration: string } | null;
};

const STATUS_META: Record<
  string,
  { label: string; chipClass: string }
> = {
  submitted: { label: "נשלחה", chipClass: "status-chip-pending" },
  withdrawn: { label: "נסוגה", chipClass: "status-chip-muted" },
  awarded:   { label: "נבחרה", chipClass: "status-chip-info" },
  rejected:  { label: "נדחתה", chipClass: "status-chip-rejected" },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function MyOffersSection() {
  const fetchMine = useServerFn(listMyOffers);
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-offers"],
    queryFn: () => fetchMine(),
  });

  const offers = (data?.offers ?? []) as MyOffer[];

  return (
    <div className="mt-8 scroll-mt-24 space-y-3" id="my-offers">
      {/* Section title */}
      <div className="border-b border-border pb-2.5">
        <h3 className="text-sm font-semibold">
          ההצעות שלי
          {offers.length > 0 && (
            <span className="ms-2 rounded border border-border bg-muted/50 px-1.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
              {offers.length}
            </span>
          )}
        </h3>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted/40" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-sm">
          <CancelIcon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">לא הצלחנו לטעון את ההצעות שלך</p>
            <p className="mt-1 text-muted-foreground">נסה לרענן את הדף, או לחזור אליו מאוחר יותר.</p>
          </div>
        </div>
      ) : offers.length === 0 ? (
        <div className="empty-state">
          <p className="text-sm font-semibold text-foreground">טרם הגשת הצעות</p>
          <p className="mt-1 text-sm text-muted-foreground">
            הצעות מחיר שתגיש למכרזים פתוחים יופיעו כאן ויתעדכנו עד לזכייה.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="premium-table-header">
                  <th className="px-4 py-2.5 text-start">מכרז</th>
                  <th className="px-4 py-2.5 text-start">מיקום</th>
                  <th className="px-4 py-2.5 text-start">מחיר/שעה</th>
                  <th className="px-4 py-2.5 text-start">עובדים</th>
                  <th className="px-4 py-2.5 text-start">סטטוס</th>
                  <th className="px-4 py-2.5 text-start">הוגש</th>
                  <th className="px-4 py-2.5 text-end">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => {
                  const meta = STATUS_META[o.status] ?? STATUS_META.submitted;
                  const isAwarded = o.status === "awarded";
                  return (
                    <tr key={o.id} className="premium-table-row">
                      <td className="px-4 py-3">
                        <Link
                          to="/requests/$id"
                          params={{ id: o.request_id }}
                          className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                          dir="ltr"
                        >
                          {maskedRequestId(o.request_id)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {o.request?.location ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`tabular-nums font-semibold ${isAwarded ? "text-primary" : ""}`}
                          dir="ltr"
                        >
                          ₪{Number(o.price_per_hour).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        <span dir="ltr">{o.available_workers}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={meta.chipClass}>{meta.label}</span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-xs text-muted-foreground">
                        <span dir="ltr">{formatDate(o.created_at)}</span>
                      </td>
                      <td className="px-4 py-3 text-end">
                        <Button asChild variant="ghost" size="sm" title="צפייה במכרז">
                          <Link to="/requests/$id" params={{ id: o.request_id }}>
                            <VisibilityIcon sx={{ fontSize: 14 }} />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile compact rows */}
          <div className="md:hidden space-y-2">
            {offers.map((o) => {
              const meta = STATUS_META[o.status] ?? STATUS_META.submitted;
              const isAwarded = o.status === "awarded";
              return (
                <div
                  key={o.id}
                  className={`rounded-lg border p-3 ${
                    isAwarded ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="font-mono text-[11px] text-muted-foreground shrink-0"
                        dir="ltr"
                      >
                        {maskedRequestId(o.request_id)}
                      </span>
                      {o.request?.location && (
                        <span className="text-sm font-medium truncate">{o.request.location}</span>
                      )}
                    </div>
                    <span className={meta.chipClass}>{meta.label}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span
                        className={`font-semibold ${isAwarded ? "text-primary" : "text-foreground"}`}
                      >
                        <span dir="ltr">₪{Number(o.price_per_hour).toLocaleString()}</span> לשעה
                      </span>
                      <span>
                        <span dir="ltr">{o.available_workers}</span> עובדים
                      </span>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="h-8" title="צפייה במכרז">
                      <Link to="/requests/$id" params={{ id: o.request_id }}>
                        <VisibilityIcon sx={{ fontSize: 14 }} />
                      </Link>
                    </Button>
                  </div>
                  {isAwarded && (
                    <p className="mt-2 text-[11px] font-semibold text-primary">
                      זכית במכרז זה — בקרוב תקבל פרטי קשר של הקבלן
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

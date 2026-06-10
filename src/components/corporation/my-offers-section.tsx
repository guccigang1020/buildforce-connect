import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Send, Trophy, XCircle, Ban, MapPin, Calendar, Loader2, Eye, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listMyOffers, withdrawOffer } from "@/lib/job-offers.functions";
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
  { label: string; icon: typeof Send; chipClass: string; barClass: string }
> = {
  submitted: {
    label: "נשלחה",
    icon: Send,
    chipClass: "status-chip-pending",
    barClass: "status-bar-pending",
  },
  withdrawn: {
    label: "נסוגה",
    icon: Ban,
    chipClass:
      "inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground",
    barClass: "status-bar-none",
  },
  awarded: {
    label: "נבחרה",
    icon: Trophy,
    chipClass: "status-chip-approved",
    barClass: "status-bar-primary",
  },
  rejected: {
    label: "נדחתה",
    icon: XCircle,
    chipClass: "status-chip-rejected",
    barClass: "status-bar-rejected",
  },
};

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function MyOffersSection() {
  const fetchMine = useServerFn(listMyOffers);
  const withdrawFn = useServerFn(withdrawOffer);
  const qc = useQueryClient();
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-offers"],
    queryFn: () => fetchMine(),
  });

  const offers = (data?.offers ?? []) as MyOffer[];

  const handleWithdraw = async (offerId: string) => {
    if (!confirm("למשוך את ההצעה? לא ניתן לבטל פעולה זו.")) return;
    setWithdrawingId(offerId);
    try {
      await withdrawFn({ data: { offerId } });
      toast.success("ההצעה נמשכה");
      qc.invalidateQueries({ queryKey: ["my-offers"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה במשיכת ההצעה");
    } finally {
      setWithdrawingId(null);
    }
  };

  return (
    <div className="mt-10 scroll-mt-24" id="my-offers">
      {/* Section header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="section-header-icon">
          <Send className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <h2 className="text-base font-bold md:text-lg">
          ההצעות שלי
          {offers.length > 0 && (
            <span className="ms-2 rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {offers.length}
            </span>
          )}
        </h2>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-kpi animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">לא הצלחנו לטעון את ההצעות שלך</p>
            <p className="mt-1 text-muted-foreground">
              נסה לרענן את הדף, או לחזור אליו מאוחר יותר.
            </p>
          </div>
        </div>
      ) : offers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Send className="h-7 w-7 text-primary" />
          </div>
          <p className="text-sm font-bold text-foreground">טרם הגשת הצעות</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            הצעות מחיר שתגיש למכרזים פתוחים יופיעו כאן ויתעדכנו עד לזכייה.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((o) => {
            const meta = STATUS_META[o.status] ?? STATUS_META.submitted;
            const Icon = meta.icon;
            const isAwarded = o.status === "awarded";
            return (
              <div
                key={o.id}
                className={`rounded-2xl border p-4 transition-all md:p-5 ${
                  isAwarded ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card"
                } ${meta.barClass}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* Status chip + request ID */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={meta.chipClass}>
                        <Icon className="h-3 w-3" /> {meta.label}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">
                        מכרז {maskedRequestId(o.request_id)}
                      </span>
                    </div>

                    {/* Location + date as info chips */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {o.request?.location && (
                        <span className="info-chip">
                          <MapPin className="h-3 w-3" />
                          {o.request.location}
                        </span>
                      )}
                      {o.request?.start_date && (
                        <span className="info-chip">
                          <Calendar className="h-3 w-3" />
                          {o.request.start_date}
                        </span>
                      )}
                      {o.request?.duration && (
                        <span className="info-chip">{o.request.duration}</span>
                      )}
                    </div>
                    <div className="mt-1.5 text-[11px] text-muted-foreground">
                      עודכן: {formatDateTime(o.updated_at)}
                    </div>
                  </div>

                  {/* Price + workers */}
                  <div className="text-left">
                    <div
                      className={`text-xl font-extrabold ${isAwarded ? "text-primary" : "text-foreground"}`}
                      dir="ltr"
                    >
                      ₪{Number(o.price_per_hour)}/שעה
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {o.available_workers} עובדים
                    </div>
                  </div>
                </div>

                {/* Footer actions */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
                  {isAwarded && (
                    <div className="text-xs font-semibold text-primary">
                      זכית במכרז זה — בקרוב תקבל פרטי קשר של הקבלן
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 ms-auto">
                    <Button asChild variant="ghost" size="sm" className="h-10">
                      <Link to="/requests/$id" params={{ id: o.request_id }}>
                        <Eye className="ml-1 h-4 w-4" /> צפייה במכרז
                      </Link>
                    </Button>
                    {o.status === "submitted" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10"
                        onClick={() => handleWithdraw(o.id)}
                        disabled={withdrawingId === o.id}
                      >
                        <Undo2 className="ml-1 h-4 w-4" />
                        {withdrawingId === o.id ? "מושך…" : "משוך הצעה"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

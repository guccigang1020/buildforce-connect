import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Send, Trophy, XCircle, Ban, MapPin, Calendar, Loader2, Eye, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listMyOffers, withdrawOffer } from "@/lib/job-offers.functions";

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

const STATUS_META: Record<string, { label: string; icon: typeof Send; className: string }> = {
  submitted: {
    label: "נשלחה",
    icon: Send,
    className: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  },
  withdrawn: {
    label: "נסוגה",
    icon: Ban,
    className: "bg-muted text-muted-foreground border-border",
  },
  awarded: {
    label: "נבחרה",
    icon: Trophy,
    className: "bg-primary/15 text-primary border-primary/30",
  },
  rejected: {
    label: "נדחתה",
    icon: XCircle,
    className: "bg-destructive/15 text-destructive border-destructive/30",
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
      <h2 className="mb-3 text-base font-bold md:text-lg">ההצעות שלי ({offers.length})</h2>
      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-card p-8 text-sm text-muted-foreground">
          <Loader2 className="ml-2 h-4 w-4 animate-spin" /> טוען הצעות…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">
          שגיאה בטעינת הצעות: {error instanceof Error ? error.message : "שגיאה לא ידועה"}
        </div>
      ) : offers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          טרם הגשת הצעות
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((o) => {
            const meta = STATUS_META[o.status] ?? STATUS_META.submitted;
            const Icon = meta.icon;
            return (
              <div key={o.id} className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`gap-1 ${meta.className}`}>
                        <Icon className="h-3 w-3" /> {meta.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        #{o.request_id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {o.request?.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {o.request.location}
                        </span>
                      )}
                      {o.request?.start_date && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {o.request.start_date}
                        </span>
                      )}
                      {o.request?.duration && <span>{o.request.duration}</span>}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      עודכן: {formatDateTime(o.updated_at)}
                    </div>
                  </div>
                  <div className="text-left text-xs">
                    <div className="text-base font-extrabold">₪{Number(o.price_per_hour)}/שעה</div>
                    <div className="text-[10px] text-muted-foreground">
                      {o.available_workers} עובדים
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-border/50 pt-3">
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/requests/$id" params={{ id: o.request_id }}>
                      <Eye className="ml-1 h-4 w-4" /> צפייה במכרז
                    </Link>
                  </Button>
                  {o.status === "submitted" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleWithdraw(o.id)}
                      disabled={withdrawingId === o.id}
                    >
                      <Undo2 className="ml-1 h-4 w-4" />
                      {withdrawingId === o.id ? "מושך…" : "משוך הצעה"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

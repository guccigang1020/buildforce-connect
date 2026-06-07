import { useEffect, useMemo, useState } from "react";
import { Timer, Eye, TrendingDown, Activity, Flame, Sparkles } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type PriceLogRow = {
  id: string;
  request_id: string;
  offer_id: string;
  corporation_id: string;
  price_per_hour: number;
  previous_price: number | null;
  event_type: "joined" | "drop" | "raise" | "update";
  created_at: string;
};

function maskedId(corpId: string): string {
  let h = 0;
  for (let i = 0; i < corpId.length; i++) h = (h * 31 + corpId.charCodeAt(i)) | 0;
  return `BF-${(Math.abs(h) % 9000) + 1000}`;
}

function relTime(ts: number): string {
  const sec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return `לפני ${sec} שניות`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.floor(m / 60);
  return `לפני ${h} שעות`;
}

function timeRemaining(endMs: number) {
  const ms = Math.max(0, endMs - Date.now());
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { h, m, s, ended: ms === 0 };
}

export function AuctionPanel({
  requestId,
  workersCount = 1,
}: {
  requestId: string;
  workersCount?: number;
}) {
  const queryClient = useQueryClient();
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(i);
  }, []);

  // Request (for deadline)
  const { data: request } = useQuery({
    queryKey: ["auction-request", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_requests")
        .select("id, deadline_at")
        .eq("id", requestId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Live offers
  const { data: offers = [] } = useQuery({
    queryKey: ["auction-offers", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_offers")
        .select("id, corporation_id, price_per_hour, status, created_at")
        .eq("request_id", requestId)
        .in("status", ["submitted", "awarded"]);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Price log (sparkline + activity feed)
  const { data: priceLog = [] } = useQuery<PriceLogRow[]>({
    queryKey: ["auction-price-log", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_offer_price_log")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PriceLogRow[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`auction-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "job_offer_price_log",
          filter: `request_id=eq.${requestId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["auction-price-log", requestId] });
          queryClient.invalidateQueries({ queryKey: ["auction-offers", requestId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, queryClient]);

  const endMs = request?.deadline_at ? new Date(request.deadline_at).getTime() : Date.now();
  const t = timeRemaining(endMs);

  // Running lowest series for sparkline
  const series = useMemo(() => {
    let lowest = Infinity;
    const out: { t: number; price: number }[] = [];
    for (const e of priceLog) {
      lowest = Math.min(lowest, Number(e.price_per_hour));
      out.push({ t: new Date(e.created_at).getTime(), price: lowest });
    }
    return out;
  }, [priceLog]);

  // Activity feed (newest first)
  const feed = useMemo(() => {
    return [...priceLog]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6);
  }, [priceLog]);

  const lowest = offers.length ? Math.min(...offers.map((o) => Number(o.price_per_hour))) : 0;
  const opening = priceLog.length
    ? Math.max(...priceLog.map((p) => Number(p.price_per_hour)))
    : lowest;
  const drop = opening > 0 && lowest > 0 ? Math.round(((opening - lowest) / opening) * 100) : 0;
  const savings = lowest > 0 ? Math.max(0, Math.round((opening - lowest) * workersCount * 176)) : 0;
  const viewers = offers.length;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/10 via-background to-background p-5 shadow-elegant md:p-7">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at top right, color-mix(in oklab, var(--primary) 22%, transparent), transparent 55%)",
        }}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-primary">
            <Flame className="h-3 w-3" /> מכרז הפוך פעיל · LIVE
          </div>
          <h2 className="mt-3 text-xl font-extrabold md:text-2xl">
            {t.ended ? "המכרז נסגר" : "תאגידים מתחרים על הבקשה שלך עכשיו"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            ככל שעובר הזמן — המחיר רק יורד. אתה בעמדת הכוח.
          </p>
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-1 rounded-2xl border border-primary/40 bg-card/80 px-3 py-2 backdrop-blur">
          <Timer className="h-4 w-4 text-primary" />
          {t.ended ? (
            <span className="text-sm font-extrabold">סגור</span>
          ) : (
            <div className="flex items-center gap-1 font-mono text-base font-extrabold tabular-nums">
              <TimeBox v={t.h} label="ש" />
              <span className="text-muted-foreground">:</span>
              <TimeBox v={t.m} label="ד" />
              <span className="text-muted-foreground">:</span>
              <TimeBox v={t.s} label="ש" pulse />
            </div>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="mt-5 grid grid-cols-3 gap-2 md:gap-3">
        <KpiTile
          icon={Eye}
          label="הצעות פעילות"
          value={`${viewers}`}
          sub="תאגידים שהגישו"
          tone="primary"
        />
        <KpiTile
          icon={TrendingDown}
          label="ירידת מחיר"
          value={`${drop}%`}
          sub={`₪${opening} → ₪${lowest}`}
          tone="success"
        />
        <KpiTile
          icon={Sparkles}
          label="חיסכון חודשי"
          value={`₪${savings.toLocaleString()}`}
          sub="לעומת הצעת פתיחה"
          tone="gold"
        />
      </div>

      {/* Sparkline */}
      <div className="mt-5 rounded-2xl border border-border/60 bg-card/60 p-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            מחיר זול ביותר לאורך זמן
          </div>
          <div className="text-[11px] text-muted-foreground">
            ₪{opening} <span className="mx-1">→</span>{" "}
            <span className="font-extrabold text-emerald-400">₪{lowest}</span>
          </div>
        </div>
        <Sparkline points={series.map((p) => p.price)} />
      </div>

      {/* Activity feed */}
      <div className="mt-5">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <Activity className="h-3.5 w-3.5 text-primary" /> פיד פעילות
          <span className="relative grid h-2 w-2 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        </div>
        <ul className="mt-3 space-y-1.5">
          {feed.length === 0 && (
            <li className="rounded-xl border border-dashed border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
              ממתין להצעות ראשונות… תאגידים קיבלו מייל
            </li>
          )}
          {feed.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-2 rounded-xl bg-secondary/40 px-3 py-2 text-xs animate-fade-in"
            >
              {e.event_type === "drop" ? (
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-emerald-500/15 text-emerald-400">
                  <TrendingDown className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
                  <Flame className="h-3.5 w-3.5" />
                </span>
              )}
              <span className="font-mono text-[10px] text-muted-foreground">
                {maskedId(e.corporation_id)}
              </span>
              <span className="flex-1 truncate">
                {e.event_type === "joined" ? (
                  <>
                    הצטרף למכרז עם{" "}
                    <b className="text-foreground">₪{Number(e.price_per_hour)}/שעה</b>
                  </>
                ) : e.event_type === "drop" ? (
                  <>
                    הוריד ל-<b className="text-emerald-400">₪{Number(e.price_per_hour)}/שעה</b>{" "}
                    {e.previous_price != null && (
                      <span className="text-muted-foreground">
                        ({Math.round(Number(e.price_per_hour) - Number(e.previous_price))}₪)
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    עדכן ל-<b className="text-foreground">₪{Number(e.price_per_hour)}/שעה</b>
                  </>
                )}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {relTime(new Date(e.created_at).getTime())}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TimeBox({ v, label, pulse }: { v: number; label: string; pulse?: boolean }) {
  return (
    <span
      className={`grid place-items-center rounded-md bg-gradient-primary px-2 py-1 text-primary-foreground shadow-elegant ${pulse ? "animate-pulse" : ""}`}
    >
      <span className="text-base font-extrabold leading-none">{String(v).padStart(2, "0")}</span>
      <span className="text-[8px] font-bold opacity-80">{label}</span>
    </span>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  tone: "primary" | "success" | "gold";
}) {
  const palette =
    tone === "success"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
      : tone === "gold"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
        : "border-primary/40 bg-primary/10 text-primary";
  return (
    <div className={`rounded-2xl border p-3 md:p-4 ${palette}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-80">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 text-lg font-extrabold text-foreground md:text-2xl">{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const w = 600,
    h = 80,
    pad = 6;
  if (points.length < 2) {
    return <div className="mt-3 h-20 rounded-md bg-secondary/40" />;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1, max - min);
  const stepX = (w - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = pad + (h - pad * 2) * (1 - (p - min) / range);
    return [x, y] as const;
  });
  const path = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`)
    .join(" ");
  const area = `${path} L ${coords[coords.length - 1][0].toFixed(1)} ${h - pad} L ${coords[0][0].toFixed(1)} ${h - pad} Z`;
  const last = coords[coords.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-20 w-full">
      <defs>
        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkFill)" />
      <path
        d={path}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="5" fill="var(--primary)" />
      <circle cx={last[0]} cy={last[1]} r="9" fill="var(--primary)" opacity="0.25">
        <animate attributeName="r" values="6;12;6" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur="1.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

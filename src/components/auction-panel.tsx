import { useEffect, useState } from "react";
import { Timer, Eye, TrendingDown, Activity, Flame, Sparkles } from "lucide-react";
import type { WorkforceRequest } from "@/lib/mock-data";
import {
  auctionEndMs, timeRemaining, buildActivityFeed, lowestPriceSeries,
  viewersNow, savingsSoFar, relTime,
} from "@/lib/auction-state";

export function AuctionPanel({ req }: { req: WorkforceRequest }) {
  const endMs = auctionEndMs(req.id);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(i);
  }, []);

  const t = timeRemaining(endMs);
  const feed = buildActivityFeed(req).slice(0, 6);
  const series = lowestPriceSeries(req);
  const viewers = viewersNow(req.id);
  const savings = savingsSoFar(req);
  const lowest = series.length ? series[series.length - 1].price : 0;
  const opening = series.length ? Math.max(...series.map((p) => p.price)) : lowest;
  const drop = opening > 0 ? Math.round(((opening - lowest) / opening) * 100) : 0;
  void now;

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
          label="צופים עכשיו"
          value={`${viewers}`}
          sub="תאגידים פעילים"
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
            ₪{opening} <span className="mx-1">→</span> <span className="font-extrabold text-emerald-400">₪{lowest}</span>
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
              ממתין להצעות ראשונות…
            </li>
          )}
          {feed.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-2 rounded-xl bg-secondary/40 px-3 py-2 text-xs animate-fade-in"
            >
              {e.type === "drop" ? (
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-emerald-500/15 text-emerald-400">
                  <TrendingDown className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
                  <Flame className="h-3.5 w-3.5" />
                </span>
              )}
              <span className="font-mono text-[10px] text-muted-foreground">BF-{e.corpMaskedId.slice(-4)}</span>
              <span className="flex-1 truncate">
                {e.type === "joined"
                  ? <>הצטרף למכרז עם <b className="text-foreground">₪{e.pricePerHour}/שעה</b></>
                  : <>הוריד ל-<b className="text-emerald-400">₪{e.pricePerHour}/שעה</b> <span className="text-muted-foreground">({e.delta}₪)</span></>}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">{relTime(e.ts)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TimeBox({ v, label, pulse }: { v: number; label: string; pulse?: boolean }) {
  return (
    <span className={`grid place-items-center rounded-md bg-gradient-primary px-2 py-1 text-primary-foreground shadow-elegant ${pulse ? "animate-pulse" : ""}`}>
      <span className="text-base font-extrabold leading-none">{String(v).padStart(2, "0")}</span>
      <span className="text-[8px] font-bold opacity-80">{label}</span>
    </span>
  );
}

function KpiTile({
  icon: Icon, label, value, sub, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; sub: string;
  tone: "primary" | "success" | "gold";
}) {
  const palette =
    tone === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
    : tone === "gold" ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
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
  const w = 600, h = 80, pad = 6;
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
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`).join(" ");
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
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="5" fill="var(--primary)" />
      <circle cx={last[0]} cy={last[1]} r="9" fill="var(--primary)" opacity="0.25">
        <animate attributeName="r" values="6;12;6" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur="1.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

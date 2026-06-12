import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { cn } from "@/lib/utils";

/**
 * OffersInsight — the headline "bids & savings" panel for a request. Spotlights
 * the cheapest bid + projected monthly saving, then a clean line chart showing
 * the price trend from the priciest bid down to the cheapest (the value of
 * competition). Cohesive with the app: indigo brand + a single emerald accent
 * for "money saved" (no orange). RTL, reduced-motion-safe.
 */

const HOURS_PER_MONTH = 180;
const CURRENCY = "₪";

type DotProps = {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: { cheapest?: boolean };
};

function OfferDot({ cx, cy, payload }: DotProps) {
  if (cx == null || cy == null) return null;
  if (payload?.cheapest) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={8} fill="var(--color-primary)" fillOpacity={0.18} />
        <circle
          cx={cx}
          cy={cy}
          r={4.5}
          fill="var(--color-primary)"
          stroke="var(--color-card)"
          strokeWidth={2}
        />
      </g>
    );
  }
  return (
    <circle
      cx={cx}
      cy={cy}
      r={3.5}
      fill="var(--color-card)"
      stroke="var(--color-primary)"
      strokeWidth={1.75}
    />
  );
}

function PriceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; payload: { cheapest?: boolean } }[];
}) {
  if (!active || !payload?.length) return null;
  const { value, payload: row } = payload[0];
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md">
      <span className="font-bold tabular-nums" dir="ltr">
        {CURRENCY}
        {value}
      </span>{" "}
      לשעה
      {row.cheapest && <span className="ms-1.5 font-semibold text-primary">· הזולה ביותר</span>}
    </div>
  );
}

export function OffersInsight({
  prices,
  totalWorkers,
  className,
}: {
  prices: number[];
  totalWorkers: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (prices.length === 0) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const savingPerHour = Math.max(0, max - min);
  const workers = Math.max(1, totalWorkers);
  const monthlySaving = savingPerHour * workers * HOURS_PER_MONTH;
  const pctBelowAvg = avg > 0 ? Math.round(((avg - min) / avg) * 100) : 0;
  const hasSpread = savingPerHour > 0 && prices.length > 1;
  const range = max - min || 1;

  // Priciest → cheapest, so the line slopes down to the winning price.
  const data = [...prices]
    .sort((a, b) => b - a)
    .map((price, i, arr) => ({ name: `#${i + 1}`, price, cheapest: i === arr.length - 1 }));

  return (
    <div className={cn("enterprise-card overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold">השוואת הצעות וחיסכון</h3>
        <span className="text-xs text-muted-foreground">{prices.length} הצעות</span>
      </div>

      {/* Hero — cheapest (indigo) + monthly saving (emerald) */}
      <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-x-reverse sm:divide-y-0">
        <motion.div
          className="p-5 md:p-6"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <EmojiEventsIcon sx={{ fontSize: 14 }} className="text-primary" />
            ההצעה הזולה ביותר
          </div>
          <div className="mt-2 flex items-end gap-2" dir="ltr">
            <span className="text-5xl font-black leading-none tracking-tight tabular-nums text-primary">
              {CURRENCY}
              {min}
            </span>
            <span className="pb-1 text-sm font-medium text-muted-foreground">/ שעה</span>
          </div>
          {pctBelowAvg > 0 && (
            <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <TrendingDownIcon sx={{ fontSize: 14 }} />
              {pctBelowAvg}% מתחת לממוצע
              <span className="font-medium text-primary/70" dir="ltr">
                ({CURRENCY}
                {avg})
              </span>
            </div>
          )}
        </motion.div>

        {hasSpread ? (
          <motion.div
            className="p-5 md:p-6"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.06 }}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              חיסכון חודשי משוער
            </div>
            <div className="mt-2 flex items-end gap-2" dir="ltr">
              <span className="text-4xl font-black leading-none tracking-tight tabular-nums text-success md:text-5xl">
                {CURRENCY}
                {monthlySaving.toLocaleString()}
              </span>
              <span className="pb-1 text-sm font-medium text-muted-foreground">/ חודש</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              <span dir="ltr">
                {CURRENCY}
                {savingPerHour}
              </span>
              /שעה · <span dir="ltr">{workers}</span> עובדים ·{" "}
              <span dir="ltr">{HOURS_PER_MONTH}</span> שע׳/חודש
            </p>
          </motion.div>
        ) : (
          <div className="flex items-center p-5 text-sm text-muted-foreground md:p-6">
            התקבלה הצעה אחת. ככל שיגיעו הצעות נוספות — המחיר ירד והחיסכון יוצג כאן.
          </div>
        )}
      </div>

      {/* Price-trend line chart */}
      {prices.length > 1 && (
        <div className="border-t border-border px-3 pb-3 pt-4 md:px-4">
          <div className="mb-1 flex items-center justify-between px-2 text-[11px] text-muted-foreground">
            <span>מגמת המחירים · מהיקרה לזולה ביותר</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-primary" /> הזולה ביותר
            </span>
          </div>
          <div className="h-40 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 18, right: 14, bottom: 4, left: 14 }}>
                <defs>
                  <linearGradient id="offer-line" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" hide />
                <YAxis hide domain={[min - range * 0.25, max + range * 0.18]} />
                <ReferenceLine
                  y={avg}
                  stroke="var(--border-strong)"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{
                    value: `ממוצע ${CURRENCY}${avg}`,
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: "var(--color-muted-foreground)",
                  }}
                />
                <Tooltip
                  content={<PriceTooltip />}
                  cursor={{
                    stroke: "var(--border-strong)",
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  fill="url(#offer-line)"
                  isAnimationActive={!reduce}
                  dot={<OfferDot />}
                  activeDot={{ r: 5, fill: "var(--color-primary)", stroke: "var(--color-card)" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex items-center justify-between px-2 text-[11px] font-semibold tabular-nums">
            <span className="text-muted-foreground" dir="ltr">
              {CURRENCY}
              {max} <span className="font-normal">היקרה</span>
            </span>
            <span className="text-primary" dir="ltr">
              {CURRENCY}
              {min} <span className="font-normal text-muted-foreground">הזולה</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

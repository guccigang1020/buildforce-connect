import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * KpiCard — a metric tile that renders entirely in the BuildForce design
 * language. It is a typed wrapper over the `.kpi-card` / `.kpi-icon` /
 * `.trend-*` utility system defined in `styles.css`, so it inherits the warm
 * cream→teal palette, capped radii and soft shadows automatically.
 *
 * RTL-first: numeric values are forced to `dir="ltr"` with tabular figures so
 * digits stay aligned and never reflow inside the Hebrew layout.
 */

type Tone = "default" | "primary" | "info" | "success" | "warning" | "filled";
type Trend = "up" | "down" | "flat";

const cardToneClass: Record<Tone, string> = {
  default: "",
  primary: "kpi-card-primary",
  info: "kpi-card-info",
  success: "kpi-card-success",
  warning: "kpi-card-warning",
  filled: "kpi-card-filled",
};

const iconToneClass: Record<Tone, string> = {
  default: "kpi-icon-muted",
  primary: "kpi-icon-primary",
  info: "kpi-icon-info",
  success: "kpi-icon-success",
  warning: "kpi-icon-warning",
  filled: "kpi-icon-filled",
};

export type KpiCardProps = {
  /** Small label above the value (Hebrew). */
  label: string;
  /** The headline metric. Numbers are localized + tabular automatically. */
  value: React.ReactNode;
  /** Percentage / delta. Numbers are prefixed with the sign automatically. */
  delta?: number | string;
  /** Drives the trend badge icon + colour. */
  trend?: Trend;
  /** Secondary line under the value (e.g. "לעומת 30 הימים הקודמים"). */
  caption?: string;
  /** Optional leading icon (lucide or MUI). Rendered inside a tinted tile. */
  icon?: React.ReactNode;
  tone?: Tone;
  /** Forces LTR tabular rendering of the value. Default: true. */
  numeric?: boolean;
  className?: string;
};

export function KpiCard({
  label,
  value,
  delta,
  trend = "flat",
  caption,
  icon,
  tone = "default",
  numeric = true,
  className,
}: KpiCardProps) {
  const filled = tone === "filled";

  const deltaText = typeof delta === "number" ? `${delta > 0 ? "+" : ""}${delta}%` : delta;

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendClass =
    trend === "up" ? "trend-up" : trend === "down" ? "trend-down" : "trend-neutral";

  const renderedValue = typeof value === "number" ? value.toLocaleString("he-IL") : value;

  return (
    <div className={cn("kpi-card p-4 sm:p-5", cardToneClass[tone], className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div
            className={cn(
              "text-[11px] font-medium uppercase tracking-wide",
              filled ? "text-primary-foreground/75" : "text-muted-foreground",
            )}
          >
            {label}
          </div>
          <div
            className={cn(
              "text-2xl font-semibold leading-none tracking-tight sm:text-[1.75rem]",
              numeric && "tabular-nums",
              filled ? "text-primary-foreground" : "text-foreground",
            )}
            dir={numeric ? "ltr" : undefined}
            style={numeric ? { textAlign: "start" } : undefined}
          >
            {renderedValue}
          </div>
          {caption && (
            <div
              className={cn(
                "text-xs",
                filled ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              {caption}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {icon != null && (
            <div
              className={cn(
                "kpi-icon",
                filled ? "bg-white/15 text-primary-foreground" : iconToneClass[tone],
              )}
            >
              {icon}
            </div>
          )}
          {deltaText != null && (
            <span className={trendClass} dir="ltr">
              <TrendIcon className="h-3 w-3" aria-hidden />
              {deltaText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

import * as React from "react";
import { Check, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Timeline — a vertical lifecycle/status feed rendered in the BuildForce
 * language. RTL-first: the rail and dots sit on the inline-start (right) edge
 * and content flows toward the inline-end, using logical `start-*` insets so
 * it mirrors correctly. Status colours are drawn from the shared design tokens
 * (teal `primary`, green `success`, amber `pending`, `destructive`).
 */

export type TimelineStatus = "completed" | "active" | "pending" | "error" | "default";

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp?: string | Date;
  status?: TimelineStatus;
  /** Override the default status glyph. */
  icon?: React.ReactNode;
  /** Rich content rendered below the description (e.g. a price summary). */
  content?: React.ReactNode;
}

export interface TimelineProps {
  items: TimelineItem[];
  className?: string;
  /** Density. */
  variant?: "default" | "compact";
  showTimestamps?: boolean;
}

const dotClass: Record<TimelineStatus, string> = {
  completed: "border-primary bg-primary text-primary-foreground",
  active: "border-primary bg-card text-primary",
  pending: "border-border bg-card text-muted-foreground",
  error: "border-destructive bg-destructive text-destructive-foreground",
  default: "border-border bg-card text-muted-foreground",
};

const railClass: Record<TimelineStatus, string> = {
  completed: "bg-primary/70",
  active: "bg-primary/70",
  pending: "bg-border",
  error: "bg-destructive/60",
  default: "bg-border",
};

function statusGlyph(status: TimelineStatus) {
  switch (status) {
    case "completed":
      return <Check className="h-3 w-3" strokeWidth={3} />;
    case "active":
      return <Clock className="h-3 w-3" />;
    case "error":
      return <X className="h-3 w-3" strokeWidth={3} />;
    default:
      return <span className="h-1.5 w-1.5 rounded-full bg-current" />;
  }
}

function formatTimestamp(ts: string | Date) {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  if (Number.isNaN(d.getTime())) return typeof ts === "string" ? ts : "";
  return d.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Timeline({
  items,
  className,
  variant = "default",
  showTimestamps = true,
}: TimelineProps) {
  const gap = variant === "compact" ? "gap-3" : "gap-5";

  return (
    <ol className={cn("relative flex flex-col", gap, className)}>
      {items.map((item, index) => {
        const status: TimelineStatus = item.status ?? "default";
        const isLast = index === items.length - 1;
        return (
          <li key={item.id} className="relative flex gap-3">
            {/* Dot + connecting rail (inline-start / right in RTL) */}
            <div className="relative flex shrink-0 flex-col items-center">
              <div
                className={cn(
                  "z-10 grid h-6 w-6 place-items-center rounded-full border-2 text-xs",
                  dotClass[status],
                  status === "active" && "shadow-glow-sm",
                )}
              >
                {item.icon ?? statusGlyph(status)}
              </div>
              {!isLast && (
                <div className={cn("absolute top-6 bottom-[-1.25rem] w-px", railClass[status])} />
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 pb-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <h4 className="text-sm font-semibold leading-tight text-foreground">
                  {item.title}
                </h4>
                {showTimestamps && item.timestamp && (
                  <time
                    className="shrink-0 text-[11px] tabular-nums text-muted-foreground"
                    dir="ltr"
                  >
                    {formatTimestamp(item.timestamp)}
                  </time>
                )}
              </div>
              {item.description && (
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              )}
              {item.content && <div className="mt-2">{item.content}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * BookingCalendar — the 21st.dev bento "book a call" calendar, adapted to
 * BuildForce: RTL Hebrew, token-driven (indigo highlighted slots instead of the
 * demo's random indigo), a real month grid, and SSR-safe (no Math.random and no
 * next/link). Rendered as a landing "book a demo" section.
 */

const HE_DAY_INITIALS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const HE_MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

export function BookingCalendar({
  contactHref = "mailto:support@buildforceprime.com?subject=בקשה לשיחת היכרות",
  className,
}: {
  contactHref?: string;
  className?: string;
}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Deterministic "available slots" — weekday-ish spread, no randomness.
  const available = new Set(
    Array.from({ length: daysInMonth }, (_, i) => i + 1).filter(
      (d) => d >= today && (d % 7 === today % 7 || d % 7 === (today + 3) % 7),
    ),
  );

  return (
    <section className={cn("px-4 py-16 md:px-6", className)} dir="rtl">
      <div className="mx-auto max-w-5xl">
        <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40 md:p-10">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tl from-primary/[0.06] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                רוצים לראות את BuildForce בפעולה?
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
                קבעו שיחת היכרות קצרה — נראה לכם איך לפרסם בקשה, לקבל הצעות תחרותיות ולחסוך בעלויות
                כוח האדם.
              </p>
              <Button asChild className="mt-5">
                <a href={contactHref}>קבעו שיחה</a>
              </Button>
            </div>

            <div className="flex justify-center md:justify-end">
              <div className="w-full max-w-xs rounded-2xl border border-border bg-surface-0 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {HE_MONTHS[month]} {year}
                  </span>
                  <span className="text-xs text-muted-foreground">שיחה · 30 דק׳</span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {HE_DAY_INITIALS.map((d) => (
                    <div key={d} className="py-1 text-[10px] font-semibold text-muted-foreground">
                      {d}
                    </div>
                  ))}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-8" />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const isAvailable = available.has(day);
                    const isToday = day === today;
                    return (
                      <div
                        key={day}
                        className={cn(
                          "grid h-8 place-items-center rounded-lg text-sm tabular-nums transition-colors",
                          isAvailable
                            ? "bg-primary font-semibold text-primary-foreground"
                            : "text-muted-foreground",
                          isToday && !isAvailable && "ring-1 ring-primary/50",
                        )}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

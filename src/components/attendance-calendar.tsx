import { useState } from "react";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import GroupIcon from "@mui/icons-material/Group";
import { israelToday } from "@/lib/dates";

// A clean month calendar for attendance. Cells stay neutral; a small status dot
// + compact KPIs (workers + cost) convey the day at a glance. Click a day → the
// parent opens that day's actions in a modal.

export type CalDay = {
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  entry_approved_at: string | null;
  exit_approved_at: string | null;
  entry_rejection_reason: string | null;
  exit_rejection_reason: string | null;
  workers_actual?: number | null;
  total_cost?: number | null;
  total_hours?: number | null;
};

type Status = "none" | "pending" | "approved" | "rejected";

function dayStatus(d: CalDay): Status {
  if (d.entry_rejection_reason || d.exit_rejection_reason) return "rejected";
  const reported = !!d.start_time || !!d.end_time;
  if (!reported) return "none";
  const entryDone = !!d.entry_approved_at || !d.start_time;
  const exitDone = !!d.exit_approved_at || !d.end_time;
  return entryDone && exitDone && (d.entry_approved_at || d.exit_approved_at)
    ? "approved"
    : "pending";
}

const DOT: Record<Status, string> = {
  none: "bg-transparent",
  pending: "bg-amber-500",
  approved: "bg-emerald-500",
  rejected: "bg-red-500",
};

const WEEKDAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = israelToday();

export function AttendanceCalendar({
  days,
  selected,
  onSelect,
}: {
  days: CalDay[];
  selected: string;
  onSelect: (iso: string) => void;
}) {
  const byDate = new Map(days.map((d) => [d.work_date, d]));
  const sel = new Date(selected + "T00:00:00");
  const [cursor, setCursor] = useState(new Date(sel.getFullYear(), sel.getMonth(), 1));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  const monthLabel = cursor.toLocaleDateString("he-IL", { month: "long", year: "numeric" });

  return (
    <div className="enterprise-card p-4" dir="rtl">
      <div className="mb-3 flex items-center justify-between">
        <button
          aria-label="חודש קודם"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <ChevronRightIcon sx={{ fontSize: 18 }} />
        </button>
        <div className="text-sm font-semibold text-foreground">{monthLabel}</div>
        <button
          aria-label="חודש הבא"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <ChevronLeftIcon sx={{ fontSize: 18 }} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-[11px] font-semibold text-muted-foreground">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const iso = toISO(d);
          const rec = byDate.get(iso);
          const isToday = iso === todayISO;
          const isSelected = iso === selected;
          const isFuture = iso > todayISO;
          const status = rec ? dayStatus(rec) : "none";
          const workers = rec?.workers_actual ?? null;
          const cost = rec?.total_cost ?? null;
          return (
            <button
              key={iso}
              disabled={isFuture}
              onClick={() => onSelect(iso)}
              className={`flex min-h-[3.5rem] flex-col rounded-lg border p-1.5 text-right transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border/60 bg-card hover:bg-muted/50"
              } ${isFuture ? "cursor-not-allowed opacity-40" : ""}`}
            >
              <div className="flex items-center justify-between">
                {/* day number — today gets a filled chip for a clean highlight */}
                <span
                  className={
                    isToday
                      ? "grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                      : "text-sm font-semibold text-foreground"
                  }
                >
                  {d.getDate()}
                </span>
                {status !== "none" && <span className={`h-2 w-2 rounded-full ${DOT[status]}`} />}
              </div>
              {rec && (workers != null || (cost != null && cost > 0)) ? (
                <div className="mt-auto space-y-0.5 pt-1 text-right leading-tight">
                  {workers != null && (
                    <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <GroupIcon sx={{ fontSize: 11 }} />
                      {workers}
                    </div>
                  )}
                  {cost != null && cost > 0 && (
                    // Hidden on the narrowest phones (cells are too small for the
                    // full ₪ figure); shown from sm up. Full cost is in the day
                    // modal + the Hours tab.
                    <div className="hidden text-[10px] font-semibold tabular-nums text-foreground sm:block">
                      ₪{Math.round(cost).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <Legend dot="bg-emerald-500" label="אושר" />
        <Legend dot="bg-amber-500" label="ממתין" />
        <Legend dot="bg-red-500" label="נדחה" />
      </div>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${dot}`} /> {label}
    </span>
  );
}

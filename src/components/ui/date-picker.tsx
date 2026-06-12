"use client";

import * as React from "react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * DatePicker — a themed popover date field (the shadcn `Calendar` /
 * react-day-picker in a `Popover`), replacing native `<input type="date">` in
 * the request + bid forms. RTL Hebrew, indigo-themed via tokens, and it speaks
 * the same `YYYY-MM-DD` string the forms already use so call sites barely change.
 */

function parseISO(value?: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DatePicker({
  value,
  onChange,
  min,
  id,
  placeholder = "בחר תאריך",
  invalid,
  className,
}: {
  value?: string;
  onChange: (value: string) => void;
  /** Earliest selectable date as YYYY-MM-DD (days before are disabled). */
  min?: string;
  id?: string;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = parseISO(value);
  const minDate = parseISO(min);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start gap-2 font-normal",
            !value && "!text-muted-foreground",
            invalid && "!border-destructive",
            className,
          )}
        >
          <CalendarMonthIcon sx={{ fontSize: 16 }} className="text-muted-foreground" />
          <span dir="ltr" className="tabular-nums">
            {selected ? format(selected, "dd/MM/yyyy") : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          dir="rtl"
          locale={he}
          selected={selected}
          defaultMonth={selected ?? minDate}
          disabled={minDate ? { before: minDate } : undefined}
          onSelect={(d) => {
            if (d) {
              onChange(toISO(d));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

// The app operates in Israel. Compute "today" / the work-day date in
// Asia/Jerusalem on BOTH the server and the client so they always agree —
// avoids the bug where a report made after midnight Israel time (when UTC is
// still the previous day) was stored under the previous date and shown on the
// wrong calendar day.
export function israelToday(): string {
  // en-CA formats as YYYY-MM-DD; timeZone pins it to Israel local date.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}
